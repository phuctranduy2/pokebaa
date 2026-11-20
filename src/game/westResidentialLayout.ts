import type { CityAreaRect, CityBuildingFootprint, CityPoi, CityRoadSegment } from './cityMapData';
import type { IntersectionColliderBox } from './WestIntersectionSystem';

export const WEST_RES_MIN_X = -425.0;
export const WEST_RES_EXPANSION_MIN_X = -960.0;
export const WEST_RES_MAX_X = -362.0;
export const WEST_RES_EAST_REAR_MAX_X = -242.0;
export const WEST_RES_MIN_Z = -18.0;
export const WEST_RES_MAX_Z = 15.6;
export const WEST_RES_REAR_MIN_Z = -134.0;
export const WEST_RES_SOUTH_MIN_X = -960.0;
export const WEST_RES_SOUTH_MAX_X = -426.0;
export const WEST_RES_SOUTH_S3_MAX_X = -305.0;
export const WEST_RES_SOUTH_MIN_Z = 42.5;
export const WEST_RES_SOUTH_MAX_Z = 362.0;

// 8m North-South Connector Road linking Đại Lộ Trung Tâm (Z=37.2) <-> Ngã 3 Nội Khu Nam 1 (Z=98) <-> Ngã 3 Nội Khu Nam 2 (Z=152)
export const WEST_SOUTH_CONNECTOR_MIN_X = -434.0;
export const WEST_SOUTH_CONNECTOR_MAX_X = -426.0;
export const WEST_SOUTH_CONNECTOR_CX = -430.0;
export const WEST_SOUTH_CONNECTOR_MIN_Z = 37.2;
export const WEST_SOUTH_CONNECTOR_MAX_Z = 156.0;

// Expanded Southern & South-Central Residential Mega-District ("Khu Dân Cư Nam Bệnh Viện – Nam Trung Tâm – Tây Nam")
export const SOUTH_HOSP_WEST_MIN_X = -305.0;
export const SOUTH_HOSP_WEST_MAX_X = -241.0;
export const SOUTH_HOSP_EAST_MIN_X = -214.0;
export const SOUTH_HOSP_EAST_MAX_X = -100.0;
export const SOUTH_EXPANSION_EAST_MAX_X = 105.0;
export const SOUTH_HOSP_MIN_Z = 88.0;
export const SOUTH_CENTER_MIN_Z = 104.0;
export const SOUTH_HOSP_ROAD_MAX_Z = 352.0;
export const SOUTH_HOSP_MAX_Z = 362.0;
// 7 North-South Ring Connectors tying every Southern E-W road (Nam 2..Nam 6) into a zero-dead-end grid!
export const SOUTH_FAR_WEST_CONN_MIN_X = -960.0;
export const SOUTH_FAR_WEST_CONN_MAX_X = -952.0;
export const SOUTH_FAR_WEST_CONN_CX = -956.0;
export const SOUTH_SW_MID_CONN_MIN_X = -619.0;
export const SOUTH_SW_MID_CONN_MAX_X = -611.0;
export const SOUTH_SW_MID_CONN_CX = -615.0;
export const SOUTH_HOSP_WEST_CONN_MIN_X = -305.0;
export const SOUTH_HOSP_WEST_CONN_MAX_X = -297.0;
export const SOUTH_HOSP_WEST_CONN_CX = -301.0;
export const SOUTH_HOSP_EAST_CONN_MIN_X = -108.0;
export const SOUTH_HOSP_EAST_CONN_MAX_X = -100.0;
export const SOUTH_HOSP_EAST_CONN_CX = -104.0;
export const SOUTH_CENTER_MID_CONN_MIN_X = -6.0;
export const SOUTH_CENTER_MID_CONN_MAX_X = 2.0;
export const SOUTH_CENTER_MID_CONN_CX = -2.0;
export const SOUTH_OCEAN_RING_CONN_MIN_X = 92.0;
export const SOUTH_OCEAN_RING_CONN_MAX_X = 100.0;
export const SOUTH_OCEAN_RING_CONN_CX = 96.0;

// Primary North Alley X bounds (5.6m..6.0m wide -> spacious for walking & 2-way motorbikes)
export const WEST_RES_ALLEY_MIN_X = -396.4;
export const WEST_RES_ALLEY_MAX_X = -390.8;
export const WEST_RES_HEM485_MIN_X = -488.6;
export const WEST_RES_HEM485_MAX_X = -482.6;
export const WEST_RES_HEM545_MIN_X = -550.4;
export const WEST_RES_HEM545_MAX_X = -544.4;
export const WEST_RES_HEM605_MIN_X = -612.6;
export const WEST_RES_HEM605_MAX_X = -606.6;
export const WEST_RES_HEM665_MIN_X = -674.6;
export const WEST_RES_HEM665_MAX_X = -668.6;

// Primary South Alley X bounds (6.0m wide)
export const WEST_RES_HEM426_MIN_X = -488.6;
export const WEST_RES_HEM426_MAX_X = -482.6;
export const WEST_RES_HEM490_MIN_X = -550.4;
export const WEST_RES_HEM490_MAX_X = -544.4;
export const WEST_RES_HEM550_MIN_X = -612.6;
export const WEST_RES_HEM550_MAX_X = -606.6;
export const WEST_RES_HEM610_MIN_X = -674.6;
export const WEST_RES_HEM610_MAX_X = -668.6;

export type WestResRowKey =
  | 'N1'
  | 'N2'
  | 'N3'
  | 'N4'
  | 'S1'
  | 'S2'
  | 'S3'
  | 'S4'
  | 'S5'
  | 'S6'
  | 'SH1'
  | 'SH2'
  | 'SH3'
  | 'SH4'
  | 'SH5'
  | 'SH6'
  | 'SC2'
  | 'SC3'
  | 'SC4'
  | 'SC5'
  | 'SC6';

export interface WestAlleyDef {
  id: string;
  label: string;
  shortLabel: string;
  row: WestResRowKey;
  cx: number;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  hasArch?: boolean;
}

export interface WestInnerRoadDef {
  id: string;
  name: string;
  x1: number;
  x2: number;
  cz: number;
  minZ: number;
  maxZ: number;
  width: number;
}

export interface WestRowSegmentDef {
  id: string;
  label: string;
  shortLabel: string;
  row: WestResRowKey;
  minX: number;
  maxX: number;
  count: number;
  bodyMinZ: number;
  bodyMaxZ: number;
  yardMinZ: number;
  yardMaxZ: number;
  facingNorth?: boolean;
}

export type WalkableShopTheme =
  | 'pho'
  | 'cafe'
  | 'boba'
  | 'banhmi'
  | 'oc_lau'
  | 'mini_mart'
  | 'billiard_net';

export interface WestWalkableShopDef {
  id: string;
  name: string;
  shortName: string;
  subtitle: string;
  row: WestResRowKey;
  cx: number;
  cz: number;
  w: number;
  bodyD: number;
  doorW: number;
  facingNorth: boolean;
  theme: WalkableShopTheme;
  isLegacyCustom?: boolean;
  floors?: 1 | 2 | 3;
  signBg: string;
  badge: string;
  poiCategory: 'food' | 'commerce' | 'tech';
  poiFilterGroup: 'food_nightlife' | 'home_civic' | 'tech_auto';
  openHours: string;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  doorX: number;
  doorZ: number;
}

export const WEST_INNER_ROADS: WestInnerRoadDef[] = [
  {
    id: 'west_res_inner_road',
    name: 'Đường Nội Khu Dân Cư Bắc 1',
    x1: -960.0,
    x2: -227.5,
    cz: -22.0,
    minZ: -26.0,
    maxZ: -18.0,
    width: 8.0,
  },
  {
    id: 'west_res_inner_road_2',
    name: 'Đường Nội Khu Dân Cư Bắc 2',
    x1: -960.0,
    x2: -227.5,
    cz: -60.0,
    minZ: -64.0,
    maxZ: -56.0,
    width: 8.0,
  },
  {
    id: 'west_res_inner_road_3',
    name: 'Đường Nội Khu Dân Cư Bắc 3',
    x1: -960.0,
    x2: -227.5,
    cz: -98.0,
    minZ: -102.0,
    maxZ: -94.0,
    width: 8.0,
  },
  {
    id: 'west_res_south_inner_road',
    name: 'Đường Nội Khu Dân Cư Nam 1',
    x1: -960.0,
    x2: -426.0,
    cz: 98.0,
    minZ: 94.0,
    maxZ: 102.0,
    width: 8.0,
  },
  {
    id: 'west_res_south_inner_road_2',
    name: 'Đường Nội Khu Nam 2 – Kết Nối Ocean Park Bắc',
    x1: -960.0,
    x2: SOUTH_EXPANSION_EAST_MAX_X,
    cz: 152.0,
    minZ: 148.0,
    maxZ: 156.0,
    width: 8.0,
  },
  {
    id: 'south_hosp_east_road_1',
    name: 'Đường Đông Bệnh Viện 1 – Nam Trung Tâm',
    x1: -227.5,
    x2: SOUTH_OCEAN_RING_CONN_MAX_X,
    cz: 108.0,
    minZ: 104.0,
    maxZ: 112.0,
    width: 8.0,
  },
  {
    id: 'south_hosp_inner_road_3',
    name: 'Đường Nội Khu Nam 3 Liên Khu',
    x1: -960.0,
    x2: SOUTH_OCEAN_RING_CONN_MAX_X,
    cz: 198.0,
    minZ: 194.0,
    maxZ: 202.0,
    width: 8.0,
  },
  {
    id: 'south_hosp_inner_road_4',
    name: 'Đường Nội Khu Nam 4 Liên Khu',
    x1: -960.0,
    x2: SOUTH_OCEAN_RING_CONN_MAX_X,
    cz: 244.0,
    minZ: 240.0,
    maxZ: 248.0,
    width: 8.0,
  },
  {
    id: 'south_exp_inner_road_5',
    name: 'Đường Nội Khu Nam 5 Liên Khu',
    x1: -960.0,
    x2: SOUTH_OCEAN_RING_CONN_MAX_X,
    cz: 294.0,
    minZ: 290.0,
    maxZ: 298.0,
    width: 8.0,
  },
  {
    id: 'south_exp_inner_road_6',
    name: 'Đại Lộ Kết Nối Nam Ocean Park (Nam 6)',
    x1: -960.0,
    x2: SOUTH_EXPANSION_EAST_MAX_X,
    cz: 344.0,
    minZ: 336.0,
    maxZ: 352.0,
    width: 16.0,
  },
];

/**
 * Every East-West residential inner road mouth connecting across X = -965..-960 into Đường Ven Biển Võ Nguyên Giáp!
 * Includes Bắc 3/2/1, Nam 1/2/3/4/5, and Đại Lộ Nam 6.
 */
export const WEST_COASTAL_RESIDENTIAL_OPENINGS: ReadonlyArray<{ id: string; minZ: number; maxZ: number; cz: number }> =
  WEST_INNER_ROADS.filter((r) => r.x1 <= -960.0).map((r) => ({
    id: r.id,
    minZ: r.minZ,
    maxZ: r.maxZ,
    cz: r.cz,
  }));

export function isInWestCoastalResidentialOpening(z: number, pad = 0): boolean {
  return WEST_COASTAL_RESIDENTIAL_OPENINGS.some((o) => z >= o.minZ - pad && z <= o.maxZ + pad);
}

/**
 * Every North-South residential Row N4 alley & Công Viên Tổ 7 riverfront promenade gate
 * connecting across Z = -137..-134 directly into Đường Ven Sông Bạch Đằng Tây & Sông Hàn!
 */
export const WEST_RIVER_RESIDENTIAL_OPENINGS: ReadonlyArray<{ id: string; minX: number; maxX: number; cx: number }> = [
  { id: 'hem_905_28', minX: -886.8, maxX: -881.2, cx: -884.0 },
  { id: 'hem_785_24', minX: -794.8, maxX: -789.2, cx: -792.0 },
  { id: 'hem_725_20', minX: -710.8, maxX: -705.2, cx: -708.0 },
  { id: 'hem_605_19', minX: -618.8, maxX: -613.2, cx: -616.0 },
  { id: 'hem_545_22', minX: -536.8, maxX: -531.2, cx: -534.0 },
  { id: 'hem_425_24', minX: -450.8, maxX: -445.2, cx: -448.0 },
  { id: 'park_to7_river_gate', minX: -384.0, maxX: -374.0, cx: -379.0 },
];

export function isInWestRiverResidentialOpening(x: number, pad = 0): boolean {
  return WEST_RIVER_RESIDENTIAL_OPENINGS.some((o) => x >= o.minX - pad && x <= o.maxX + pad);
}

function makeAlley(
  id: string,
  label: string,
  shortLabel: string,
  row: WestResRowKey,
  minX: number,
  maxX: number,
  minZ: number,
  maxZ: number,
  hasArch = false
): WestAlleyDef {
  return {
    id,
    label,
    shortLabel,
    row,
    cx: (minX + maxX) * 0.5,
    minX,
    maxX,
    minZ,
    maxZ,
    hasArch,
  };
}

export const WEST_ALLEYS: WestAlleyDef[] = [
  // Primary North Alleys (Row N1: Z = -18 .. +20.8 connects Boulevard <-> Bắc 1)
  makeAlley('hem_425', 'Hẻm 425 · Khu Phố Văn Hóa', 'Hẻm 425', 'N1', WEST_RES_ALLEY_MIN_X, WEST_RES_ALLEY_MAX_X, -18.0, 20.8, true),
  makeAlley('hem_485', 'Hẻm 485 · Khu Phố Văn Hóa', 'Hẻm 485', 'N1', WEST_RES_HEM485_MIN_X, WEST_RES_HEM485_MAX_X, -18.0, 20.8, true),
  makeAlley('hem_545', 'Hẻm 545 · Khu Phố Văn Hóa', 'Hẻm 545', 'N1', WEST_RES_HEM545_MIN_X, WEST_RES_HEM545_MAX_X, -18.0, 20.8, true),
  makeAlley('hem_605', 'Hẻm 605 · Khu Phố Văn Hóa', 'Hẻm 605', 'N1', WEST_RES_HEM605_MIN_X, WEST_RES_HEM605_MAX_X, -18.0, 20.8, true),
  makeAlley('hem_665', 'Hẻm 665 · Khu Phố Văn Hóa', 'Hẻm 665', 'N1', WEST_RES_HEM665_MIN_X, WEST_RES_HEM665_MAX_X, -18.0, 20.8, true),
  makeAlley('hem_725', 'Hẻm 725 · Phố Cư Dân Tây', 'Hẻm 725', 'N1', -736.0, -730.0, -18.0, 20.8, true),
  makeAlley('hem_785', 'Hẻm 785 · Phố Cư Dân Tây', 'Hẻm 785', 'N1', -798.0, -792.0, -18.0, 20.8, true),
  makeAlley('hem_845', 'Hẻm 845 · Phố Cư Dân Tây', 'Hẻm 845', 'N1', -860.0, -854.0, -18.0, 20.8, true),
  makeAlley('hem_905', 'Hẻm 905 · Phố Cư Dân Tây', 'Hẻm 905', 'N1', -922.0, -916.0, -18.0, 20.8, true),

  // Row N2 Inner Alleys (Z = -56 .. -26, connects Bắc 1 <-> Bắc 2, incl. Behind Cyber Stadium & Hospital Hub)
  makeAlley('hem_285', 'Hẻm 285 · Sau Phố Ẩm Thực Đêm', 'Hẻm 285', 'N2', -284.8, -279.2, -56.0, -26.0, true),
  makeAlley('hem_325', 'Hẻm 325 · Sau Cyber Stadium', 'Hẻm 325', 'N2', -327.8, -322.2, -56.0, -26.0, true),
  makeAlley('hem_425_6', 'Hẻm 425/6 · Tổ Dân Phố 4', 'Hẻm 425/6', 'N2', -442.4, -436.8, -56.0, -26.0, false),
  makeAlley('hem_485_12', 'Hẻm 485/12 · Tổ Dân Phố 4', 'Hẻm 485/12', 'N2', -511.2, -505.6, -56.0, -26.0, false),
  makeAlley('hem_545_8', 'Hẻm 545/8 · Tổ Dân Phố 4', 'Hẻm 545/8', 'N2', -584.4, -578.8, -56.0, -26.0, false),
  makeAlley('hem_605_3', 'Hẻm 605/3 · Tổ Dân Phố 4', 'Hẻm 605/3', 'N2', -652.4, -646.8, -56.0, -26.0, false),
  makeAlley('hem_725_4', 'Hẻm 725/4 · Tổ Dân Phố 4', 'Hẻm 725/4', 'N2', -722.8, -717.2, -56.0, -26.0, false),
  makeAlley('hem_785_10', 'Hẻm 785/10 · Tổ Dân Phố 4', 'Hẻm 785/10', 'N2', -784.8, -779.2, -56.0, -26.0, false),
  makeAlley('hem_845_6', 'Hẻm 845/6 · Tổ Dân Phố 4', 'Hẻm 845/6', 'N2', -846.8, -841.2, -56.0, -26.0, false),
  makeAlley('hem_905_8', 'Hẻm 905/8 · Tổ Dân Phố 4', 'Hẻm 905/8', 'N2', -908.8, -903.2, -56.0, -26.0, false),

  // Row N3 Inner Alleys (Z = -94 .. -64, connects Bắc 2 <-> Bắc 3)
  makeAlley('hem_285_12', 'Hẻm 285/12 · Sau Bệnh Viện Bắc', 'Hẻm 285/12', 'N3', -272.8, -267.2, -94.0, -64.0, false),
  makeAlley('hem_325_9', 'Hẻm 325/9 · Tổ Dân Phố 5 Đông', 'Hẻm 325/9', 'N3', -338.8, -333.2, -94.0, -64.0, false),
  makeAlley('hem_425_18', 'Hẻm 425/18 · Tổ Dân Phố 5', 'Hẻm 425/18', 'N3', -408.4, -402.8, -94.0, -64.0, false),
  makeAlley('hem_545_15', 'Hẻm 545/15 · Tổ Dân Phố 5', 'Hẻm 545/15', 'N3', -554.4, -548.8, -94.0, -64.0, false),
  makeAlley('hem_665_9', 'Hẻm 665/9 · Tổ Dân Phố 5', 'Hẻm 665/9', 'N3', -666.4, -660.8, -94.0, -64.0, false),
  makeAlley('hem_725_14', 'Hẻm 725/14 · Tổ Dân Phố 5', 'Hẻm 725/14', 'N3', -750.8, -745.2, -94.0, -64.0, false),
  makeAlley('hem_845_15', 'Hẻm 845/15 · Tổ Dân Phố 5', 'Hẻm 845/15', 'N3', -830.8, -825.2, -94.0, -64.0, false),
  makeAlley('hem_905_19', 'Hẻm 905/19 · Tổ Dân Phố 5', 'Hẻm 905/19', 'N3', -900.8, -895.2, -94.0, -64.0, false),

  // Row N4 Deep North Alleys (Z = -134 .. -102, opens off Bắc 3 -> Công Viên Bắc Tổ 7)
  makeAlley('hem_425_24', 'Hẻm 425/24 · Tổ Dân Phố 7', 'Hẻm 425/24', 'N4', -450.8, -445.2, -134.0, -102.0, false),
  makeAlley('hem_545_22', 'Hẻm 545/22 · Tổ Dân Phố 7', 'Hẻm 545/22', 'N4', -536.8, -531.2, -134.0, -102.0, false),
  makeAlley('hem_605_19', 'Hẻm 605/19 · Tổ Dân Phố 7', 'Hẻm 605/19', 'N4', -618.8, -613.2, -134.0, -102.0, false),
  makeAlley('hem_725_20', 'Hẻm 725/20 · Tổ Dân Phố 7', 'Hẻm 725/20', 'N4', -710.8, -705.2, -134.0, -102.0, false),
  makeAlley('hem_785_24', 'Hẻm 785/24 · Tổ Dân Phố 7', 'Hẻm 785/24', 'N4', -794.8, -789.2, -134.0, -102.0, false),
  makeAlley('hem_905_28', 'Hẻm 905/28 · Tổ Dân Phố 7', 'Hẻm 905/28', 'N4', -886.8, -881.2, -134.0, -102.0, false),

  // Primary South Alleys (Row S1: Z = 37.2 .. 94.0 connects Boulevard <-> Nam 1)
  makeAlley('hem_426', 'Hẻm 426 · Khu Dân Cư Nam Tây', 'Hẻm 426', 'S1', WEST_RES_HEM426_MIN_X, WEST_RES_HEM426_MAX_X, 37.2, 94.0, true),
  makeAlley('hem_490', 'Hẻm 490 · Khu Dân Cư Nam Tây', 'Hẻm 490', 'S1', WEST_RES_HEM490_MIN_X, WEST_RES_HEM490_MAX_X, 37.2, 94.0, true),
  makeAlley('hem_550', 'Hẻm 550 · Khu Dân Cư Nam Tây', 'Hẻm 550', 'S1', WEST_RES_HEM550_MIN_X, WEST_RES_HEM550_MAX_X, 37.2, 94.0, true),
  makeAlley('hem_610', 'Hẻm 610 · Khu Dân Cư Nam Tây', 'Hẻm 610', 'S1', WEST_RES_HEM610_MIN_X, WEST_RES_HEM610_MAX_X, 37.2, 94.0, true),
  makeAlley('hem_670', 'Hẻm 670 · Khu Dân Cư Nam Tây', 'Hẻm 670', 'S1', -736.0, -730.0, 37.2, 94.0, true),
  makeAlley('hem_730', 'Hẻm 730 · Khu Dân Cư Nam Tây', 'Hẻm 730', 'S1', -798.0, -792.0, 37.2, 94.0, true),
  makeAlley('hem_790', 'Hẻm 790 · Khu Dân Cư Nam Tây', 'Hẻm 790', 'S1', -860.0, -854.0, 37.2, 94.0, true),
  makeAlley('hem_850', 'Hẻm 850 · Khu Dân Cư Nam Tây', 'Hẻm 850', 'S1', -922.0, -916.0, 37.2, 94.0, true),

  // Row S2 Inner Alleys (Z = 102 .. 148, connects Nam 1 <-> Nam 2)
  makeAlley('hem_426_9', 'Hẻm 426/9 · Tổ Dân Phố 6', 'Hẻm 426/9', 'S2', -462.4, -456.8, 102.0, 148.0, false),
  makeAlley('hem_490_5', 'Hẻm 490/5 · Tổ Dân Phố 6', 'Hẻm 490/5', 'S2', -526.4, -520.8, 102.0, 148.0, false),
  makeAlley('hem_550_7', 'Hẻm 550/7 · Tổ Dân Phố 6', 'Hẻm 550/7', 'S2', -592.4, -586.8, 102.0, 148.0, false),
  makeAlley('hem_610_4', 'Hẻm 610/4 · Tổ Dân Phố 6', 'Hẻm 610/4', 'S2', -656.4, -650.8, 102.0, 148.0, false),
  makeAlley('hem_670_6', 'Hẻm 670/6 · Tổ Dân Phố 6', 'Hẻm 670/6', 'S2', -722.8, -717.2, 102.0, 148.0, false),
  makeAlley('hem_730_9', 'Hẻm 730/9 · Tổ Dân Phố 6', 'Hẻm 730/9', 'S2', -784.8, -779.2, 102.0, 148.0, false),
  makeAlley('hem_790_5', 'Hẻm 790/5 · Tổ Dân Phố 6', 'Hẻm 790/5', 'S2', -846.8, -841.2, 102.0, 148.0, false),
  makeAlley('hem_850_7', 'Hẻm 850/7 · Tổ Dân Phố 6', 'Hẻm 850/7', 'S2', -908.8, -903.2, 102.0, 148.0, false),

  // Row S3 Deep South Alleys (Z = 156 .. 194, opens cleanly between Nam 2 [152] <-> Nam 3 [198]!)
  makeAlley('hem_350_2', 'Hẻm 350/2 · Sau Trường THPT PCT', 'Hẻm 350/2', 'S3', -357.8, -352.2, 156.0, 194.0, false),
  makeAlley('hem_426_18', 'Hẻm 426/18 · Tổ Dân Phố 8', 'Hẻm 426/18', 'S3', -450.8, -445.2, 156.0, 194.0, false),
  makeAlley('hem_490_14', 'Hẻm 490/14 · Tổ Dân Phố 8', 'Hẻm 490/14', 'S3', -536.8, -531.2, 156.0, 194.0, false),
  makeAlley('hem_550_19', 'Hẻm 550/19 · Tổ Dân Phố 8', 'Hẻm 550/19', 'S3', -618.8, -613.2, 156.0, 194.0, false),
  makeAlley('hem_670_12', 'Hẻm 670/12 · Tổ Dân Phố 8', 'Hẻm 670/12', 'S3', -710.8, -705.2, 156.0, 194.0, false),
  makeAlley('hem_730_16', 'Hẻm 730/16 · Tổ Dân Phố 8', 'Hẻm 730/16', 'S3', -794.8, -789.2, 156.0, 194.0, false),
  makeAlley('hem_850_12', 'Hẻm 850/12 · Tổ Dân Phố 8', 'Hẻm 850/12', 'S3', -886.8, -881.2, 156.0, 194.0, false),

  // Row S4 Alleys (Z = 202 .. 240, links Nam 3 <-> Nam 4 across Southwest Expansion!)
  makeAlley('hem_350_16', 'Hẻm 350/16 · Khu Dân Cư Tây Nam 4', 'Hẻm 350/16', 'S4', -357.8, -352.2, 202.0, 240.0, false),
  makeAlley('hem_426_32', 'Hẻm 426/32 · Khu Dân Cư Tây Nam 4', 'Hẻm 426/32', 'S4', -450.8, -445.2, 202.0, 240.0, false),
  makeAlley('hem_490_28', 'Hẻm 490/28 · Khu Dân Cư Tây Nam 4', 'Hẻm 490/28', 'S4', -536.8, -531.2, 202.0, 240.0, false),
  makeAlley('hem_670_26', 'Hẻm 670/26 · Khu Dân Cư Tây Nam 4', 'Hẻm 670/26', 'S4', -710.8, -705.2, 202.0, 240.0, false),
  makeAlley('hem_730_30', 'Hẻm 730/30 · Khu Dân Cư Tây Nam 4', 'Hẻm 730/30', 'S4', -794.8, -789.2, 202.0, 240.0, false),
  makeAlley('hem_850_26', 'Hẻm 850/26 · Khu Dân Cư Tây Nam 4', 'Hẻm 850/26', 'S4', -886.8, -881.2, 202.0, 240.0, false),

  // Row S5 Alleys (Z = 248 .. 290, links Nam 4 <-> Nam 5 across Southwest Expansion!)
  makeAlley('hem_350_30', 'Hẻm 350/30 · Khu Dân Cư Tây Nam 5', 'Hẻm 350/30', 'S5', -357.8, -352.2, 248.0, 290.0, false),
  makeAlley('hem_426_46', 'Hẻm 426/46 · Khu Dân Cư Tây Nam 5', 'Hẻm 426/46', 'S5', -450.8, -445.2, 248.0, 290.0, false),
  makeAlley('hem_490_42', 'Hẻm 490/42 · Khu Dân Cư Tây Nam 5', 'Hẻm 490/42', 'S5', -536.8, -531.2, 248.0, 290.0, false),
  makeAlley('hem_670_40', 'Hẻm 670/40 · Khu Dân Cư Tây Nam 5', 'Hẻm 670/40', 'S5', -710.8, -705.2, 248.0, 290.0, false),
  makeAlley('hem_730_44', 'Hẻm 730/44 · Khu Dân Cư Tây Nam 5', 'Hẻm 730/44', 'S5', -794.8, -789.2, 248.0, 290.0, false),
  makeAlley('hem_850_40', 'Hẻm 850/40 · Khu Dân Cư Tây Nam 5', 'Hẻm 850/40', 'S5', -886.8, -881.2, 248.0, 290.0, false),

  // Row S6 Alleys (Z = 298 .. 336, links Nam 5 <-> Đại Lộ Kết Nối Nam Ocean Park [344]!)
  makeAlley('hem_350_44', 'Hẻm 350/44 · Phố Đại Lộ Nam 6', 'Hẻm 350/44', 'S6', -357.8, -352.2, 298.0, 336.0, false),
  makeAlley('hem_426_60', 'Hẻm 426/60 · Phố Đại Lộ Nam 6', 'Hẻm 426/60', 'S6', -450.8, -445.2, 298.0, 336.0, false),
  makeAlley('hem_490_56', 'Hẻm 490/56 · Phố Đại Lộ Nam 6', 'Hẻm 490/56', 'S6', -536.8, -531.2, 298.0, 336.0, false),
  makeAlley('hem_670_54', 'Hẻm 670/54 · Phố Đại Lộ Nam 6', 'Hẻm 670/54', 'S6', -710.8, -705.2, 298.0, 336.0, false),
  makeAlley('hem_730_58', 'Hẻm 730/58 · Phố Đại Lộ Nam 6', 'Hẻm 730/58', 'S6', -794.8, -789.2, 298.0, 336.0, false),
  makeAlley('hem_850_54', 'Hẻm 850/54 · Phố Đại Lộ Nam 6', 'Hẻm 850/54', 'S6', -886.8, -881.2, 298.0, 336.0, false),

  // === SOUTH HOSPITAL RESIDENTIAL QUARTER ALLEYS (17 full 6m alleys framing Đại Lộ Bệnh Viện Nam down to Nam 6!) ===
  // West of Đại Lộ Bệnh Viện (-297..-241)
  makeAlley('hem_272_s2', 'Hẻm 272 · Sau Bãi Xe Bệnh Viện', 'Hẻm 272', 'SH2', -272.0, -266.0, 135.2, 148.0, false),
  makeAlley('hem_272_s3', 'Hẻm 272/2 · Khu Dân Cư Nam Bệnh Viện', 'Hẻm 272/2', 'SH3', -272.0, -266.0, 156.0, 194.0, true),
  makeAlley('hem_272_s4', 'Hẻm 272/14 · Tổ Dân Phố 9', 'Hẻm 272/14', 'SH4', -272.0, -266.0, 202.0, 240.0, false),
  makeAlley('hem_272_s5', 'Hẻm 272/28 · Tổ Dân Phố 12', 'Hẻm 272/28', 'SH5', -272.0, -266.0, 248.0, 290.0, false),
  makeAlley('hem_272_s6', 'Hẻm 272/42 · Phố Cuối Đại Lộ BV', 'Hẻm 272/42', 'SH6', -272.0, -266.0, 298.0, 336.0, false),
  // East of Đại Lộ Bệnh Viện (-214..-108)
  makeAlley('hem_210_n', 'Hẻm 210A · Sau Sân Bóng RON', 'Hẻm 210A', 'SH1', -182.0, -176.0, 88.0, 104.0, false),
  makeAlley('hem_170_n', 'Hẻm 170A · Phố Đông Bệnh Viện', 'Hẻm 170A', 'SH1', -144.0, -138.0, 88.0, 104.0, false),
  makeAlley('hem_210', 'Hẻm 210 · Phố Cư Dân Nam Bệnh Viện', 'Hẻm 210', 'SH2', -182.0, -176.0, 112.0, 148.0, true),
  makeAlley('hem_170', 'Hẻm 170 · Phố Cư Dân Nam Đông', 'Hẻm 170', 'SH2', -144.0, -138.0, 112.0, 148.0, true),
  makeAlley('hem_210_8', 'Hẻm 210/8 · Tổ Dân Phố 10', 'Hẻm 210/8', 'SH3', -182.0, -176.0, 156.0, 194.0, false),
  makeAlley('hem_170_12', 'Hẻm 170/12 · Tổ Dân Phố 10', 'Hẻm 170/12', 'SH3', -144.0, -138.0, 156.0, 194.0, false),
  makeAlley('hem_210_22', 'Hẻm 210/22 · Tổ Dân Phố 11', 'Hẻm 210/22', 'SH4', -182.0, -176.0, 202.0, 240.0, false),
  makeAlley('hem_170_26', 'Hẻm 170/26 · Tổ Dân Phố 11', 'Hẻm 170/26', 'SH4', -144.0, -138.0, 202.0, 240.0, false),
  makeAlley('hem_210_36', 'Hẻm 210/36 · Tổ Dân Phố 12', 'Hẻm 210/36', 'SH5', -182.0, -176.0, 248.0, 290.0, false),
  makeAlley('hem_170_40', 'Hẻm 170/40 · Tổ Dân Phố 12', 'Hẻm 170/40', 'SH5', -144.0, -138.0, 248.0, 290.0, false),
  makeAlley('hem_210_50', 'Hẻm 210/50 · Tổ Dân Phố 13', 'Hẻm 210/50', 'SH6', -182.0, -176.0, 298.0, 336.0, false),
  makeAlley('hem_170_54', 'Hẻm 170/54 · Tổ Dân Phố 13', 'Hẻm 170/54', 'SH6', -144.0, -138.0, 298.0, 336.0, false),

  // === SOUTH-CENTRAL RESIDENTIAL DISTRICT ALLEYS (10 full 6m alleys bridging Nam Bệnh Viện -> Vinhomes Ocean Park!) ===
  makeAlley('hem_54_sc2', 'Hẻm 54 · Nam Trung Tâm Bắc', 'Hẻm 54', 'SC2', -56.0, -50.0, 112.0, 148.0, true),
  makeAlley('hem_48_sc2', 'Hẻm 48 · Cửa Ngõ Ocean Park Bắc', 'Hẻm 48', 'SC2', 44.0, 50.0, 112.0, 148.0, true),
  makeAlley('hem_54_sc3', 'Hẻm 54/10 · Phố Nam Trung Tâm 3', 'Hẻm 54/10', 'SC3', -56.0, -50.0, 156.0, 194.0, false),
  makeAlley('hem_48_sc3', 'Hẻm 48/10 · Phố Ocean Park Tây 3', 'Hẻm 48/10', 'SC3', 44.0, 50.0, 156.0, 194.0, false),
  makeAlley('hem_54_sc4', 'Hẻm 54/24 · Phố Nam Trung Tâm 4', 'Hẻm 54/24', 'SC4', -56.0, -50.0, 202.0, 240.0, false),
  makeAlley('hem_48_sc4', 'Hẻm 48/24 · Phố Ocean Park Tây 4', 'Hẻm 48/24', 'SC4', 44.0, 50.0, 202.0, 240.0, false),
  makeAlley('hem_54_sc5', 'Hẻm 54/38 · Phố Nam Trung Tâm 5', 'Hẻm 54/38', 'SC5', -56.0, -50.0, 248.0, 290.0, false),
  makeAlley('hem_48_sc5', 'Hẻm 48/38 · Phố Ocean Park Tây 5', 'Hẻm 48/38', 'SC5', 44.0, 50.0, 248.0, 290.0, false),
  makeAlley('hem_54_sc6', 'Hẻm 54/52 · Đại Lộ Nam Ocean Park', 'Hẻm 54/52', 'SC6', -56.0, -50.0, 298.0, 336.0, false),
  makeAlley('hem_48_sc6', 'Hẻm 48/52 · Cửa Ngõ Ocean Park Nam', 'Hẻm 48/52', 'SC6', 44.0, 50.0, 298.0, 336.0, false),
];

// Segmented Residential Building Blocks (Every block splits cleanly around the 56 alleys!)
export const WEST_RES_N1_SEGMENTS: WestRowSegmentDef[] = [
  { id: 'wr_n1_b1', label: 'Dãy Phố Cư Dân 425 Đông', shortLabel: '425 ĐÔNG', row: 'N1', minX: -390.8, maxX: -362.0, count: 3, bodyMinZ: -15.8, bodyMaxZ: 5.4, yardMinZ: 5.4, yardMaxZ: 15.6 },
  { id: 'wr_n1_b2', label: 'Dãy Phố Cư Dân 425–485', shortLabel: '425–485', row: 'N1', minX: -482.6, maxX: -396.4, count: 9, bodyMinZ: -15.8, bodyMaxZ: 5.4, yardMinZ: 5.4, yardMaxZ: 15.6 },
  { id: 'wr_n1_b3', label: 'Dãy Phố Cư Dân 485–545', shortLabel: '485–545', row: 'N1', minX: -544.4, maxX: -488.6, count: 5, bodyMinZ: -15.8, bodyMaxZ: 5.4, yardMinZ: 5.4, yardMaxZ: 15.6 },
  { id: 'wr_n1_b4', label: 'Dãy Phố Cư Dân 545–605', shortLabel: '545–605', row: 'N1', minX: -606.6, maxX: -550.4, count: 5, bodyMinZ: -15.8, bodyMaxZ: 5.4, yardMinZ: 5.4, yardMaxZ: 15.6 },
  { id: 'wr_n1_b5', label: 'Dãy Phố Cư Dân 605–665', shortLabel: '605–665', row: 'N1', minX: -668.6, maxX: -612.6, count: 5, bodyMinZ: -15.8, bodyMaxZ: 5.4, yardMinZ: 5.4, yardMaxZ: 15.6 },
  { id: 'wr_n1_b6', label: 'Dãy Phố Cư Dân 665–725', shortLabel: '665–725', row: 'N1', minX: -730.0, maxX: -674.6, count: 5, bodyMinZ: -15.8, bodyMaxZ: 5.4, yardMinZ: 5.4, yardMaxZ: 15.6 },
  { id: 'wr_n1_b7', label: 'Dãy Phố Cư Dân 725–785', shortLabel: '725–785', row: 'N1', minX: -792.0, maxX: -736.0, count: 5, bodyMinZ: -15.8, bodyMaxZ: 5.4, yardMinZ: 5.4, yardMaxZ: 15.6 },
  { id: 'wr_n1_b8', label: 'Dãy Phố Cư Dân 785–845', shortLabel: '785–845', row: 'N1', minX: -854.0, maxX: -798.0, count: 5, bodyMinZ: -15.8, bodyMaxZ: 5.4, yardMinZ: 5.4, yardMaxZ: 15.6 },
  { id: 'wr_n1_b9', label: 'Dãy Phố Cư Dân 845–905', shortLabel: '845–905', row: 'N1', minX: -916.0, maxX: -860.0, count: 5, bodyMinZ: -15.8, bodyMaxZ: 5.4, yardMinZ: 5.4, yardMaxZ: 15.6 },
  { id: 'wr_n1_b10', label: 'Dãy Phố Cư Dân Tây Cực', shortLabel: '905 TÂY', row: 'N1', minX: -960.0, maxX: -922.0, count: 4, bodyMinZ: -15.8, bodyMaxZ: 5.4, yardMinZ: 5.4, yardMaxZ: 15.6 },
];

export const WEST_RES_N2_SEGMENTS: WestRowSegmentDef[] = [
  { id: 'wr_n2_e1', label: 'Khu Phố Sau Phố Ẩm Thực', shortLabel: 'SAU FOOD HUB', row: 'N2', minX: -279.2, maxX: -242.0, count: 3, bodyMinZ: -54.0, bodyMaxZ: -32.0, yardMinZ: -32.0, yardMaxZ: -26.0 },
  { id: 'wr_n2_e2', label: 'Khu Phố Sau Cyber Stadium', shortLabel: 'SAU CYBER', row: 'N2', minX: -322.2, maxX: -284.8, count: 3, bodyMinZ: -54.0, bodyMaxZ: -32.0, yardMinZ: -32.0, yardMaxZ: -26.0 },
  { id: 'wr_n2_e3', label: 'Dãy Phố Bắc Cyber · Tổ 4', shortLabel: '325 TÂY', row: 'N2', minX: -362.0, maxX: -327.8, count: 3, bodyMinZ: -54.0, bodyMaxZ: -32.0, yardMinZ: -32.0, yardMaxZ: -26.0 },
  { id: 'wr_n2_b1', label: 'Dãy Nhà Tổ 4 Đông (R2–R6)', shortLabel: 'TỔ 4 ĐÔNG', row: 'N2', minX: -436.8, maxX: -380.0, count: 5, bodyMinZ: -54.0, bodyMaxZ: -32.0, yardMinZ: -32.0, yardMaxZ: -26.0 },
  { id: 'wr_n2_b2', label: 'Khu Phố 425/6–485/12', shortLabel: '425/6', row: 'N2', minX: -505.6, maxX: -442.4, count: 5, bodyMinZ: -54.0, bodyMaxZ: -32.0, yardMinZ: -32.0, yardMaxZ: -26.0 },
  { id: 'wr_n2_b3', label: 'Chợ Bắc Tây • Chợ Dân Sinh Khu Bắc', shortLabel: 'CHỢ BẮC TÂY', row: 'N2', minX: -578.8, maxX: -511.2, count: 6, bodyMinZ: -54.0, bodyMaxZ: -32.0, yardMinZ: -32.0, yardMaxZ: -26.0 },
  { id: 'wr_n2_b4', label: 'Khu Phố 545/8–605/3', shortLabel: '545/8', row: 'N2', minX: -646.8, maxX: -584.4, count: 5, bodyMinZ: -54.0, bodyMaxZ: -32.0, yardMinZ: -32.0, yardMaxZ: -26.0 },
  { id: 'wr_n2_b5', label: 'Khu Phố 605/3–725/4', shortLabel: '605/3', row: 'N2', minX: -717.2, maxX: -652.4, count: 6, bodyMinZ: -54.0, bodyMaxZ: -32.0, yardMinZ: -32.0, yardMaxZ: -26.0 },
  { id: 'wr_n2_b6', label: 'Khu Phố 725/4–785/10', shortLabel: '725/4', row: 'N2', minX: -779.2, maxX: -722.8, count: 5, bodyMinZ: -54.0, bodyMaxZ: -32.0, yardMinZ: -32.0, yardMaxZ: -26.0 },
  { id: 'wr_n2_b7', label: 'Khu Phố 785/10–845/6', shortLabel: '785/10', row: 'N2', minX: -841.2, maxX: -784.8, count: 5, bodyMinZ: -54.0, bodyMaxZ: -32.0, yardMinZ: -32.0, yardMaxZ: -26.0 },
  { id: 'wr_n2_b8', label: 'Khu Phố 845/6–905/8', shortLabel: '845/6', row: 'N2', minX: -903.2, maxX: -846.8, count: 5, bodyMinZ: -54.0, bodyMaxZ: -32.0, yardMinZ: -32.0, yardMaxZ: -26.0 },
  { id: 'wr_n2_b9', label: 'Khu Phố 905/8 Tây', shortLabel: '905/8', row: 'N2', minX: -960.0, maxX: -908.8, count: 5, bodyMinZ: -54.0, bodyMaxZ: -32.0, yardMinZ: -32.0, yardMaxZ: -26.0 },
];

export const WEST_RES_N3_SEGMENTS: WestRowSegmentDef[] = [
  { id: 'wr_n3_e1', label: 'Khu Phố Sau Bệnh Viện Bắc', shortLabel: 'BỆNH VIỆN N', row: 'N3', minX: -267.2, maxX: -242.0, count: 2, bodyMinZ: -92.0, bodyMaxZ: -70.0, yardMinZ: -70.0, yardMaxZ: -64.0 },
  { id: 'wr_n3_e2', label: 'Khu Phố Tổ 5 Đông', shortLabel: 'TỔ 5 ĐÔNG', row: 'N3', minX: -333.2, maxX: -272.8, count: 5, bodyMinZ: -92.0, bodyMaxZ: -70.0, yardMinZ: -70.0, yardMaxZ: -64.0 },
  { id: 'wr_n3_e3', label: 'Dãy Nhà Sân Cầu Lông', shortLabel: '325/9', row: 'N3', minX: -362.0, maxX: -338.8, count: 2, bodyMinZ: -92.0, bodyMaxZ: -70.0, yardMinZ: -70.0, yardMaxZ: -64.0 },
  { id: 'wr_n3_b1', label: 'Khu Phố Tổ 5 (T1)', shortLabel: 'T1 TỔ 5', row: 'N3', minX: -402.8, maxX: -390.0, count: 1, bodyMinZ: -92.0, bodyMaxZ: -70.0, yardMinZ: -70.0, yardMaxZ: -64.0 },
  { id: 'wr_n3_b2', label: 'Khu Phố 425/18–545/15', shortLabel: '425/18', row: 'N3', minX: -548.8, maxX: -408.4, count: 11, bodyMinZ: -92.0, bodyMaxZ: -70.0, yardMinZ: -70.0, yardMaxZ: -64.0 },
  { id: 'wr_n3_b3', label: 'Khu Phố 545/15–665/9', shortLabel: '545/15', row: 'N3', minX: -660.8, maxX: -554.4, count: 8, bodyMinZ: -92.0, bodyMaxZ: -70.0, yardMinZ: -70.0, yardMaxZ: -64.0 },
  { id: 'wr_n3_b4', label: 'Khu Phố 665/9–725/14', shortLabel: '665/9', row: 'N3', minX: -745.2, maxX: -666.4, count: 7, bodyMinZ: -92.0, bodyMaxZ: -70.0, yardMinZ: -70.0, yardMaxZ: -64.0 },
  { id: 'wr_n3_b5', label: 'Khu Phố 725/14–845/15', shortLabel: '725/14', row: 'N3', minX: -825.2, maxX: -750.8, count: 6, bodyMinZ: -92.0, bodyMaxZ: -70.0, yardMinZ: -70.0, yardMaxZ: -64.0 },
  { id: 'wr_n3_b6', label: 'Khu Phố 845/15–905/19', shortLabel: '845/15', row: 'N3', minX: -895.2, maxX: -830.8, count: 6, bodyMinZ: -92.0, bodyMaxZ: -70.0, yardMinZ: -70.0, yardMaxZ: -64.0 },
  { id: 'wr_n3_b7', label: 'Khu Phố 905/19 Tây', shortLabel: '905/19', row: 'N3', minX: -960.0, maxX: -900.8, count: 5, bodyMinZ: -92.0, bodyMaxZ: -70.0, yardMinZ: -70.0, yardMaxZ: -64.0 },
];

export const WEST_RES_N4_SEGMENTS: WestRowSegmentDef[] = [
  { id: 'wr_n4_e1', label: 'Khu Phố Bờ Bắc Tổ 7 Đông', shortLabel: 'TỔ 7 ĐÔNG', row: 'N4', minX: -362.0, maxX: -242.0, count: 10, bodyMinZ: -130.0, bodyMaxZ: -108.0, yardMinZ: -108.0, yardMaxZ: -102.0 },
  { id: 'wr_n4_b1', label: 'Khu Phố Tổ 7 (425/24 Đông)', shortLabel: 'TỔ 7 BẮC', row: 'N4', minX: -445.2, maxX: -396.0, count: 4, bodyMinZ: -130.0, bodyMaxZ: -108.0, yardMinZ: -108.0, yardMaxZ: -102.0 },
  { id: 'wr_n4_b2', label: 'Khu Phố 425/24–545/22', shortLabel: '425/24', row: 'N4', minX: -531.2, maxX: -450.8, count: 7, bodyMinZ: -130.0, bodyMaxZ: -108.0, yardMinZ: -108.0, yardMaxZ: -102.0 },
  { id: 'wr_n4_b3', label: 'Khu Phố 545/22–605/19', shortLabel: '545/22', row: 'N4', minX: -613.2, maxX: -536.8, count: 6, bodyMinZ: -130.0, bodyMaxZ: -108.0, yardMinZ: -108.0, yardMaxZ: -102.0 },
  { id: 'wr_n4_b4', label: 'Khu Phố 605/19–725/20', shortLabel: '605/19', row: 'N4', minX: -705.2, maxX: -618.8, count: 7, bodyMinZ: -130.0, bodyMaxZ: -108.0, yardMinZ: -108.0, yardMaxZ: -102.0 },
  { id: 'wr_n4_b5', label: 'Khu Phố 725/20–785/24', shortLabel: '725/20', row: 'N4', minX: -789.2, maxX: -710.8, count: 7, bodyMinZ: -130.0, bodyMaxZ: -108.0, yardMinZ: -108.0, yardMaxZ: -102.0 },
  { id: 'wr_n4_b6', label: 'Khu Phố 785/24–905/28', shortLabel: '785/24', row: 'N4', minX: -881.2, maxX: -794.8, count: 7, bodyMinZ: -130.0, bodyMaxZ: -108.0, yardMinZ: -108.0, yardMaxZ: -102.0 },
  { id: 'wr_n4_b7', label: 'Khu Phố 905/28 Tây Bắc', shortLabel: '905/28', row: 'N4', minX: -960.0, maxX: -886.8, count: 6, bodyMinZ: -130.0, bodyMaxZ: -108.0, yardMinZ: -108.0, yardMaxZ: -102.0 },
];

export const WEST_RES_S1_SEGMENTS: WestRowSegmentDef[] = [
  { id: 'wr_s1_b1', label: 'Dãy Nam Tây 426 Đông', shortLabel: '426 ĐÔNG', row: 'S1', minX: -482.6, maxX: -434.0, count: 5, bodyMinZ: 52.0, bodyMaxZ: 76.0, yardMinZ: 42.5, yardMaxZ: 52.0 },
  { id: 'wr_s1_b2', label: 'Dãy Nam Tây 426–490', shortLabel: '426–490', row: 'S1', minX: -544.4, maxX: -488.6, count: 5, bodyMinZ: 52.0, bodyMaxZ: 76.0, yardMinZ: 42.5, yardMaxZ: 52.0 },
  { id: 'wr_s1_b3', label: 'Dãy Nam Tây 490–550', shortLabel: '490–550', row: 'S1', minX: -606.6, maxX: -550.4, count: 5, bodyMinZ: 52.0, bodyMaxZ: 76.0, yardMinZ: 42.5, yardMaxZ: 52.0 },
  { id: 'wr_s1_b4', label: 'Dãy Nam Tây 550–610', shortLabel: '550–610', row: 'S1', minX: -668.6, maxX: -612.6, count: 5, bodyMinZ: 52.0, bodyMaxZ: 76.0, yardMinZ: 42.5, yardMaxZ: 52.0 },
  { id: 'wr_s1_b5', label: 'Dãy Nam Tây 610–670', shortLabel: '610–670', row: 'S1', minX: -730.0, maxX: -674.6, count: 5, bodyMinZ: 52.0, bodyMaxZ: 76.0, yardMinZ: 42.5, yardMaxZ: 52.0 },
  { id: 'wr_s1_b6', label: 'Dãy Nam Tây 670–730', shortLabel: '670–730', row: 'S1', minX: -792.0, maxX: -736.0, count: 5, bodyMinZ: 52.0, bodyMaxZ: 76.0, yardMinZ: 42.5, yardMaxZ: 52.0 },
  { id: 'wr_s1_b7', label: 'Dãy Nam Tây 730–790', shortLabel: '730–790', row: 'S1', minX: -854.0, maxX: -798.0, count: 5, bodyMinZ: 52.0, bodyMaxZ: 76.0, yardMinZ: 42.5, yardMaxZ: 52.0 },
  { id: 'wr_s1_b8', label: 'Dãy Nam Tây 790–850', shortLabel: '790–850', row: 'S1', minX: -916.0, maxX: -860.0, count: 5, bodyMinZ: 52.0, bodyMaxZ: 76.0, yardMinZ: 42.5, yardMaxZ: 52.0 },
  { id: 'wr_s1_b9', label: 'Dãy Nam Tây Cực Tây', shortLabel: '850 TÂY', row: 'S1', minX: -960.0, maxX: -922.0, count: 4, bodyMinZ: 52.0, bodyMaxZ: 76.0, yardMinZ: 42.5, yardMaxZ: 52.0 },
];

export const WEST_RES_S2_SEGMENTS: WestRowSegmentDef[] = [
  { id: 'wr_s2_b1', label: 'Khu Phố Tổ 6 (426/9 Đông)', shortLabel: 'TỔ 6 ĐÔNG', row: 'S2', minX: -456.8, maxX: -434.0, count: 2, bodyMinZ: 108.0, bodyMaxZ: 134.0, yardMinZ: 102.0, yardMaxZ: 108.0 },
  { id: 'wr_s2_b2', label: 'Khu Phố 426/9–490/5', shortLabel: '426/9', row: 'S2', minX: -520.8, maxX: -462.4, count: 5, bodyMinZ: 108.0, bodyMaxZ: 134.0, yardMinZ: 102.0, yardMaxZ: 108.0 },
  { id: 'wr_s2_b3', label: 'Chợ Nam Tây • Chợ Dân Sinh Khu Nam', shortLabel: 'CHỢ NAM TÂY', row: 'S2', minX: -586.8, maxX: -526.4, count: 5, bodyMinZ: 108.0, bodyMaxZ: 134.0, yardMinZ: 102.0, yardMaxZ: 108.0 },
  { id: 'wr_s2_b4', label: 'Khu Phố 550/7–610/4', shortLabel: '550/7', row: 'S2', minX: -650.8, maxX: -592.4, count: 5, bodyMinZ: 108.0, bodyMaxZ: 134.0, yardMinZ: 102.0, yardMaxZ: 108.0 },
  { id: 'wr_s2_b5', label: 'Khu Phố 610/4–670/6', shortLabel: '610/4', row: 'S2', minX: -717.2, maxX: -656.4, count: 5, bodyMinZ: 108.0, bodyMaxZ: 134.0, yardMinZ: 102.0, yardMaxZ: 108.0 },
  { id: 'wr_s2_b6', label: 'Khu Phố 670/6–730/9', shortLabel: '670/6', row: 'S2', minX: -779.2, maxX: -722.8, count: 5, bodyMinZ: 108.0, bodyMaxZ: 134.0, yardMinZ: 102.0, yardMaxZ: 108.0 },
  { id: 'wr_s2_b7', label: 'Khu Phố 730/9–790/5', shortLabel: '730/9', row: 'S2', minX: -841.2, maxX: -784.8, count: 5, bodyMinZ: 108.0, bodyMaxZ: 134.0, yardMinZ: 102.0, yardMaxZ: 108.0 },
  { id: 'wr_s2_b8', label: 'Khu Phố 790/5–850/7', shortLabel: '790/5', row: 'S2', minX: -903.2, maxX: -846.8, count: 5, bodyMinZ: 108.0, bodyMaxZ: 134.0, yardMinZ: 102.0, yardMaxZ: 108.0 },
  { id: 'wr_s2_b9', label: 'Khu Phố 850/7 Tây', shortLabel: '850/7', row: 'S2', minX: -960.0, maxX: -908.8, count: 5, bodyMinZ: 108.0, bodyMaxZ: 134.0, yardMinZ: 102.0, yardMaxZ: 108.0 },
];

export const WEST_RES_S3_SEGMENTS: WestRowSegmentDef[] = [
  { id: 'wr_s3_e1', label: 'Khu Phố Sau Trường PCT', shortLabel: 'SAU PCT', row: 'S3', minX: -352.2, maxX: -305.0, count: 4, bodyMinZ: 162.0, bodyMaxZ: 188.0, yardMinZ: 156.0, yardMaxZ: 162.0 },
  { id: 'wr_s3_e2', label: 'Khu Phố Sau Sân Bóng Rổ', shortLabel: 'SAU BÓNG RỔ', row: 'S3', minX: -445.2, maxX: -357.8, count: 7, bodyMinZ: 162.0, bodyMaxZ: 188.0, yardMinZ: 156.0, yardMaxZ: 162.0 },
  { id: 'wr_s3_b1', label: 'Khu Phố 426/18–490/14', shortLabel: '426/18', row: 'S3', minX: -531.2, maxX: -450.8, count: 7, bodyMinZ: 162.0, bodyMaxZ: 188.0, yardMinZ: 156.0, yardMaxZ: 162.0 },
  { id: 'wr_s3_b2', label: 'Khu Phố 490/14–550/19', shortLabel: '490/14', row: 'S3', minX: -613.2, maxX: -536.8, count: 6, bodyMinZ: 162.0, bodyMaxZ: 188.0, yardMinZ: 156.0, yardMaxZ: 162.0 },
  { id: 'wr_s3_b3', label: 'Khu Phố 550/19–670/12', shortLabel: '550/19', row: 'S3', minX: -705.2, maxX: -618.8, count: 7, bodyMinZ: 162.0, bodyMaxZ: 188.0, yardMinZ: 156.0, yardMaxZ: 162.0 },
  { id: 'wr_s3_b4', label: 'Khu Phố 670/12–730/16', shortLabel: '670/12', row: 'S3', minX: -789.2, maxX: -710.8, count: 7, bodyMinZ: 162.0, bodyMaxZ: 188.0, yardMinZ: 156.0, yardMaxZ: 162.0 },
  { id: 'wr_s3_b5', label: 'Khu Phố 730/16–850/12', shortLabel: '730/16', row: 'S3', minX: -881.2, maxX: -794.8, count: 7, bodyMinZ: 162.0, bodyMaxZ: 188.0, yardMinZ: 156.0, yardMaxZ: 162.0 },
  { id: 'wr_s3_b6', label: 'Khu Phố 850/12 Tây Nam', shortLabel: '850/12', row: 'S3', minX: -960.0, maxX: -886.8, count: 6, bodyMinZ: 162.0, bodyMaxZ: 188.0, yardMinZ: 156.0, yardMaxZ: 162.0 },
];

// South Hospital Residential Quarter Townhouse Segments (cloning Phố Cư Dân Tây architecture around Đại Lộ Bệnh Viện Nam!)
export const WEST_RES_SH_SEGMENTS: WestRowSegmentDef[] = [
  // Row SH1: North of Đường Đông BV 1 (behind RON Football, facing South onto Z=108)
  { id: 'sh1_e1', label: 'Phố Cư Dân Đông BV 1 · Lô A', shortLabel: 'ĐÔNG BV 1A', row: 'SH1', minX: -214.0, maxX: -182.0, count: 3, bodyMinZ: 88.5, bodyMaxZ: 100.5, yardMinZ: 100.5, yardMaxZ: 104.0, facingNorth: false },
  { id: 'sh1_e2', label: 'Phố Cư Dân Đông BV 1 · Lô B', shortLabel: 'ĐÔNG BV 1B', row: 'SH1', minX: -176.0, maxX: -144.0, count: 3, bodyMinZ: 88.5, bodyMaxZ: 100.5, yardMinZ: 100.5, yardMaxZ: 104.0, facingNorth: false },
  { id: 'sh1_e3', label: 'Phố Cư Dân Đông BV 1 · Lô C', shortLabel: 'ĐÔNG BV 1C', row: 'SH1', minX: -138.0, maxX: -108.0, count: 3, bodyMinZ: 88.5, bodyMaxZ: 100.5, yardMinZ: 100.5, yardMaxZ: 104.0, facingNorth: false },
  // Row SH2: West behind Hospital Parking (facing South onto Nam 2 Z=152) + East between Đông BV 1 & Nam 2 (facing North onto Z=108)
  { id: 'sh2_w1', label: 'Dãy Nhà Sau Bãi Xe BV · Tây', shortLabel: 'SAU BV TÂY', row: 'SH2', minX: -304.0, maxX: -272.0, count: 3, bodyMinZ: 135.4, bodyMaxZ: 144.6, yardMinZ: 144.6, yardMaxZ: 148.0, facingNorth: false },
  { id: 'sh2_w2', label: 'Dãy Nhà Sau Bãi Xe BV · Đông', shortLabel: 'SAU BV ĐÔNG', row: 'SH2', minX: -266.0, maxX: -241.0, count: 2, bodyMinZ: 135.4, bodyMaxZ: 144.6, yardMinZ: 144.6, yardMaxZ: 148.0, facingNorth: false },
  { id: 'sh2_e1', label: 'Phố Cư Dân Hẻm 210 Tây', shortLabel: 'HẺM 210 T', row: 'SH2', minX: -214.0, maxX: -182.0, count: 3, bodyMinZ: 117.5, bodyMaxZ: 142.5, yardMinZ: 112.0, yardMaxZ: 117.5, facingNorth: true },
  { id: 'sh2_e2', label: 'Phố Cư Dân 210–170', shortLabel: '210–170', row: 'SH2', minX: -176.0, maxX: -144.0, count: 3, bodyMinZ: 117.5, bodyMaxZ: 142.5, yardMinZ: 112.0, yardMaxZ: 117.5, facingNorth: true },
  { id: 'sh2_e3', label: 'Phố Cư Dân Hẻm 170 Đông', shortLabel: 'HẺM 170 Đ', row: 'SH2', minX: -138.0, maxX: -108.0, count: 3, bodyMinZ: 117.5, bodyMaxZ: 142.5, yardMinZ: 112.0, yardMaxZ: 117.5, facingNorth: true },
  // Row SH3: Between Nam 2 (Z=152) & Nam 3 (Z=198) on both West & East of Đại Lộ Bệnh Viện
  { id: 'sh3_w1', label: 'Khu Dân Cư Nam BV · Tây 272', shortLabel: 'NAM BV T1', row: 'SH3', minX: -297.0, maxX: -272.0, count: 2, bodyMinZ: 162.0, bodyMaxZ: 188.0, yardMinZ: 156.0, yardMaxZ: 162.0, facingNorth: true },
  { id: 'sh3_w2', label: 'Khu Dân Cư Nam BV · Góc 272', shortLabel: 'NAM BV T2', row: 'SH3', minX: -266.0, maxX: -241.0, count: 2, bodyMinZ: 162.0, bodyMaxZ: 188.0, yardMinZ: 156.0, yardMaxZ: 162.0, facingNorth: true },
  { id: 'sh3_e1', label: 'Khu Phố Tổ 10 · 210/8 Tây', shortLabel: 'TỔ 10 TÂY', row: 'SH3', minX: -214.0, maxX: -182.0, count: 3, bodyMinZ: 162.0, bodyMaxZ: 188.0, yardMinZ: 156.0, yardMaxZ: 162.0, facingNorth: true },
  { id: 'sh3_e2', label: 'Khu Phố Tổ 10 · 210/8–170/12', shortLabel: 'TỔ 10 GIỮA', row: 'SH3', minX: -176.0, maxX: -144.0, count: 3, bodyMinZ: 162.0, bodyMaxZ: 188.0, yardMinZ: 156.0, yardMaxZ: 162.0, facingNorth: true },
  { id: 'sh3_e3', label: 'Khu Phố Tổ 10 · 170/12 Đông', shortLabel: 'TỔ 10 ĐÔNG', row: 'SH3', minX: -138.0, maxX: -108.0, count: 3, bodyMinZ: 162.0, bodyMaxZ: 188.0, yardMinZ: 156.0, yardMaxZ: 162.0, facingNorth: true },
  // Row SH4: Between Nam 3 (Z=198) & Nam 4 (Z=244) on both West & East of Đại Lộ Bệnh Viện
  { id: 'sh4_w1', label: 'Khu Phố Tổ 9 · 272/14 Tây', shortLabel: 'TỔ 9 TÂY', row: 'SH4', minX: -297.0, maxX: -272.0, count: 2, bodyMinZ: 208.0, bodyMaxZ: 234.0, yardMinZ: 202.0, yardMaxZ: 208.0, facingNorth: true },
  { id: 'sh4_w2', label: 'Khu Phố Tổ 9 · 272/14 Đông', shortLabel: 'TỔ 9 ĐÔNG', row: 'SH4', minX: -266.0, maxX: -241.0, count: 2, bodyMinZ: 208.0, bodyMaxZ: 234.0, yardMinZ: 202.0, yardMaxZ: 208.0, facingNorth: true },
  { id: 'sh4_e1', label: 'Khu Phố Tổ 11 · 210/22 Tây', shortLabel: 'TỔ 11 TÂY', row: 'SH4', minX: -214.0, maxX: -182.0, count: 3, bodyMinZ: 208.0, bodyMaxZ: 234.0, yardMinZ: 202.0, yardMaxZ: 208.0, facingNorth: true },
  { id: 'sh4_e2', label: 'Khu Phố Tổ 11 · 210/22–170/26', shortLabel: 'TỔ 11 GIỮA', row: 'SH4', minX: -176.0, maxX: -144.0, count: 3, bodyMinZ: 208.0, bodyMaxZ: 234.0, yardMinZ: 202.0, yardMaxZ: 208.0, facingNorth: true },
  { id: 'sh4_e3', label: 'Khu Phố Tổ 11 · 170/26 Đông', shortLabel: 'TỔ 11 ĐÔNG', row: 'SH4', minX: -138.0, maxX: -108.0, count: 3, bodyMinZ: 208.0, bodyMaxZ: 234.0, yardMinZ: 202.0, yardMaxZ: 208.0, facingNorth: true },
  // Row SH5: Between Nam 4 (Z=244) & Nam 5 (Z=294)
  { id: 'sh5_w1', label: 'Khu Phố Tổ 12 · 272/28 Tây', shortLabel: 'TỔ 12 TÂY', row: 'SH5', minX: -297.0, maxX: -272.0, count: 2, bodyMinZ: 254.0, bodyMaxZ: 282.0, yardMinZ: 248.0, yardMaxZ: 254.0, facingNorth: true },
  { id: 'sh5_w2', label: 'Khu Phố Tổ 12 · 272/28 Đông', shortLabel: 'TỔ 12 ĐÔNG', row: 'SH5', minX: -266.0, maxX: -241.0, count: 2, bodyMinZ: 254.0, bodyMaxZ: 282.0, yardMinZ: 248.0, yardMaxZ: 254.0, facingNorth: true },
  { id: 'sh5_e1', label: 'Khu Phố Tổ 12 · 210/36 Tây', shortLabel: '210/36 T', row: 'SH5', minX: -214.0, maxX: -182.0, count: 3, bodyMinZ: 254.0, bodyMaxZ: 282.0, yardMinZ: 248.0, yardMaxZ: 254.0, facingNorth: true },
  { id: 'sh5_e2', label: 'Khu Phố Tổ 12 · 210/36–170/40', shortLabel: 'TỔ 12 GIỮA', row: 'SH5', minX: -176.0, maxX: -144.0, count: 3, bodyMinZ: 254.0, bodyMaxZ: 282.0, yardMinZ: 248.0, yardMaxZ: 254.0, facingNorth: true },
  { id: 'sh5_e3', label: 'Khu Phố Tổ 12 · 170/40 Đông', shortLabel: '170/40 Đ', row: 'SH5', minX: -138.0, maxX: -108.0, count: 3, bodyMinZ: 254.0, bodyMaxZ: 282.0, yardMinZ: 248.0, yardMaxZ: 254.0, facingNorth: true },
  // Row SH6: Between Nam 5 (Z=294) & Đại Lộ Kết Nối Nam Ocean Park (Z=344)
  { id: 'sh6_w1', label: 'Phố Cuối Đại Lộ BV · 272/42 Tây', shortLabel: 'NAM 6 BV T', row: 'SH6', minX: -297.0, maxX: -272.0, count: 2, bodyMinZ: 304.0, bodyMaxZ: 330.0, yardMinZ: 298.0, yardMaxZ: 304.0, facingNorth: true },
  { id: 'sh6_w2', label: 'Phố Cuối Đại Lộ BV · 272/42 Đông', shortLabel: 'NAM 6 BV Đ', row: 'SH6', minX: -266.0, maxX: -241.0, count: 2, bodyMinZ: 304.0, bodyMaxZ: 330.0, yardMinZ: 298.0, yardMaxZ: 304.0, facingNorth: true },
  { id: 'sh6_e1', label: 'Khu Phố Tổ 13 · 210/50 Tây', shortLabel: 'TỔ 13 TÂY', row: 'SH6', minX: -214.0, maxX: -182.0, count: 3, bodyMinZ: 304.0, bodyMaxZ: 330.0, yardMinZ: 298.0, yardMaxZ: 304.0, facingNorth: true },
  { id: 'sh6_e2', label: 'Khu Phố Tổ 13 · 210/50–170/54', shortLabel: 'TỔ 13 GIỮA', row: 'SH6', minX: -176.0, maxX: -144.0, count: 3, bodyMinZ: 304.0, bodyMaxZ: 330.0, yardMinZ: 298.0, yardMaxZ: 304.0, facingNorth: true },
  { id: 'sh6_e3', label: 'Khu Phố Tổ 13 · 170/54 Đông', shortLabel: 'TỔ 13 ĐÔNG', row: 'SH6', minX: -138.0, maxX: -108.0, count: 3, bodyMinZ: 304.0, bodyMaxZ: 330.0, yardMinZ: 298.0, yardMaxZ: 304.0, facingNorth: true },
];

// Southwest Expansion Rows S4, S5, S6 (X = -952..-305, Z = 202..336 — fills the entire empty Southwest expanse in Image 2!)
const buildSwExpansionRow = (
  row: 'S4' | 'S5' | 'S6',
  prefix: string,
  tag: string,
  bodyMinZ: number,
  bodyMaxZ: number,
  yardMinZ: number,
  yardMaxZ: number
): WestRowSegmentDef[] => [
  { id: `${prefix}_e1`, label: `Khu Dân Cư Tây Nam ${tag} · 350 Đông`, shortLabel: `${tag} 350`, row, minX: -352.2, maxX: -305.0, count: 4, bodyMinZ, bodyMaxZ, yardMinZ, yardMaxZ, facingNorth: true },
  { id: `${prefix}_e2`, label: `Khu Dân Cư Tây Nam ${tag} · 350–426`, shortLabel: `${tag} 426`, row, minX: -445.2, maxX: -357.8, count: 7, bodyMinZ, bodyMaxZ, yardMinZ, yardMaxZ, facingNorth: true },
  { id: `${prefix}_b1`, label: `Khu Dân Cư Tây Nam ${tag} · 426–490`, shortLabel: `${tag} 490`, row, minX: -531.2, maxX: -450.8, count: 6, bodyMinZ, bodyMaxZ, yardMinZ, yardMaxZ, facingNorth: true },
  { id: `${prefix}_b2`, label: `Khu Dân Cư Tây Nam ${tag} · 490–615`, shortLabel: `${tag} 550`, row, minX: -611.0, maxX: -536.8, count: 6, bodyMinZ, bodyMaxZ, yardMinZ, yardMaxZ, facingNorth: true },
  { id: `${prefix}_b3`, label: `Khu Dân Cư Tây Nam ${tag} · 615–670`, shortLabel: `${tag} 670`, row, minX: -705.2, maxX: -619.0, count: 7, bodyMinZ, bodyMaxZ, yardMinZ, yardMaxZ, facingNorth: true },
  { id: `${prefix}_b4`, label: `Khu Dân Cư Tây Nam ${tag} · 670–730`, shortLabel: `${tag} 730`, row, minX: -789.2, maxX: -710.8, count: 6, bodyMinZ, bodyMaxZ, yardMinZ, yardMaxZ, facingNorth: true },
  { id: `${prefix}_b5`, label: `Khu Dân Cư Tây Nam ${tag} · 730–850`, shortLabel: `${tag} 790`, row, minX: -881.2, maxX: -794.8, count: 7, bodyMinZ, bodyMaxZ, yardMinZ, yardMaxZ, facingNorth: true },
  { id: `${prefix}_b6`, label: `Khu Dân Cư Tây Nam ${tag} · 850 Tây`, shortLabel: `${tag} 850`, row, minX: -952.0, maxX: -886.8, count: 5, bodyMinZ, bodyMaxZ, yardMinZ, yardMaxZ, facingNorth: true },
];

export const WEST_RES_S4_SEGMENTS: WestRowSegmentDef[] = buildSwExpansionRow('S4', 'wr_s4', 'S4', 208.0, 234.0, 202.0, 208.0);
export const WEST_RES_S5_SEGMENTS: WestRowSegmentDef[] = buildSwExpansionRow('S5', 'wr_s5', 'S5', 254.0, 282.0, 248.0, 254.0);
export const WEST_RES_S6_SEGMENTS: WestRowSegmentDef[] = buildSwExpansionRow('S6', 'wr_s6', 'S6', 304.0, 330.0, 298.0, 304.0);

// South-Central Residential District Rows SC2..SC6 (X = -100..+92, Z = 112..336 — fills the entire gap to Vinhomes Ocean Park in Image 1!)
const buildSouthCenterRow = (
  row: 'SC2' | 'SC3' | 'SC4' | 'SC5' | 'SC6',
  prefix: string,
  tag: string,
  bodyMinZ: number,
  bodyMaxZ: number,
  yardMinZ: number,
  yardMaxZ: number
): WestRowSegmentDef[] => [
  { id: `${prefix}_w1`, label: `Phố Nam Trung Tâm ${tag} · Hẻm 54 Tây`, shortLabel: `${tag} 54T`, row, minX: -100.0, maxX: -56.0, count: 4, bodyMinZ, bodyMaxZ, yardMinZ, yardMaxZ, facingNorth: true },
  { id: `${prefix}_w2`, label: `Phố Nam Trung Tâm ${tag} · Hẻm 54 Đông`, shortLabel: `${tag} 54Đ`, row, minX: -50.0, maxX: -6.0, count: 4, bodyMinZ, bodyMaxZ, yardMinZ, yardMaxZ, facingNorth: true },
  { id: `${prefix}_e1`, label: `Phố Cửa Ngõ Ocean Park ${tag} · Hẻm 48 Tây`, shortLabel: `${tag} 48T`, row, minX: 2.0, maxX: 44.0, count: 4, bodyMinZ, bodyMaxZ, yardMinZ, yardMaxZ, facingNorth: true },
  { id: `${prefix}_e2`, label: `Phố Cửa Ngõ Ocean Park ${tag} · Hẻm 48 Đông`, shortLabel: `${tag} 48Đ`, row, minX: 50.0, maxX: 92.0, count: 4, bodyMinZ, bodyMaxZ, yardMinZ, yardMaxZ, facingNorth: true },
];

export const WEST_RES_SC_SEGMENTS: WestRowSegmentDef[] = [
  ...buildSouthCenterRow('SC2', 'sc2', 'TT2', 116.5, 139.0, 112.0, 116.5),
  ...buildSouthCenterRow('SC3', 'sc3', 'TT3', 162.0, 188.0, 156.0, 162.0),
  ...buildSouthCenterRow('SC4', 'sc4', 'TT4', 208.0, 234.0, 202.0, 208.0),
  ...buildSouthCenterRow('SC5', 'sc5', 'TT5', 254.0, 282.0, 248.0, 254.0),
  ...buildSouthCenterRow('SC6', 'sc6', 'TT6', 304.0, 330.0, 298.0, 304.0),
];

export const ALL_WEST_ROW_SEGMENTS: WestRowSegmentDef[] = [
  ...WEST_RES_N1_SEGMENTS,
  ...WEST_RES_N2_SEGMENTS,
  ...WEST_RES_N3_SEGMENTS,
  ...WEST_RES_N4_SEGMENTS,
  ...WEST_RES_S1_SEGMENTS,
  ...WEST_RES_S2_SEGMENTS,
  ...WEST_RES_S3_SEGMENTS,
  ...WEST_RES_S4_SEGMENTS,
  ...WEST_RES_S5_SEGMENTS,
  ...WEST_RES_S6_SEGMENTS,
  ...WEST_RES_SH_SEGMENTS,
  ...WEST_RES_SC_SEGMENTS,
];

function makeWalkableShopDef(cfg: {
  id: string;
  name: string;
  shortName: string;
  subtitle: string;
  row: WestResRowKey;
  cx: number;
  cz: number;
  w: number;
  bodyD: number;
  doorW: number;
  facingNorth: boolean;
  theme: WalkableShopTheme;
  isLegacyCustom?: boolean;
  floors?: 1 | 2 | 3;
  signBg: string;
  badge: string;
  poiCategory: 'food' | 'commerce' | 'tech';
  poiFilterGroup: 'food_nightlife' | 'home_civic' | 'tech_auto';
  openHours: string;
}): WestWalkableShopDef {
  const halfW = cfg.w * 0.5;
  const halfD = cfg.bodyD * 0.5;
  const frontZ = cfg.facingNorth ? cfg.cz - halfD : cfg.cz + halfD;
  return {
    ...cfg,
    minX: cfg.cx - halfW,
    maxX: cfg.cx + halfW,
    minZ: cfg.cz - halfD,
    maxZ: cfg.cz + halfD,
    doorX: cfg.cx,
    doorZ: frontZ,
  };
}

export const WEST_WALKABLE_SHOPS: WestWalkableShopDef[] = [
  // === 8 CORE LEGACY CUSTOM SHOPS (upgraded & preserved at exact positions) ===
  makeWalkableShopDef({
    id: 'shop_n1_taphoa_coba',
    name: 'Tạp Hóa Cô Ba & Trà Đá',
    shortName: 'Tạp Hóa Cô Ba',
    subtitle: 'Tạp hóa đầu Hẻm 425 • Nước giải khát & Bánh mì',
    row: 'N1',
    cx: -366.8,
    cz: -5.2,
    w: 9.6,
    bodyD: 21.2,
    doorW: 4.0,
    facingNorth: false,
    theme: 'mini_mart',
    isLegacyCustom: true,
    signBg: '#991b1b',
    badge: '🛒',
    poiCategory: 'commerce',
    poiFilterGroup: 'home_civic',
    openHours: '05:30 - 23:00',
  }),
  makeWalkableShopDef({
    id: 'shop_n1_com_giadinh',
    name: 'Quán Cơm Gia Đình · Hẻm 425',
    shortName: 'Cơm Gia Đình',
    subtitle: 'Cơm trưa văn phòng & Bún bò Huế góc Hẻm 425',
    row: 'N1',
    cx: -401.0,
    cz: -5.2,
    w: 9.2,
    bodyD: 21.2,
    doorW: 4.2,
    facingNorth: false,
    theme: 'pho',
    isLegacyCustom: true,
    signBg: '#b45309',
    badge: '🍚',
    poiCategory: 'food',
    poiFilterGroup: 'food_nightlife',
    openHours: '06:00 - 21:30',
  }),
  makeWalkableShopDef({
    id: 'shop_n1_suaxe_chubay',
    name: 'Tiệm Sửa Xe Chú Bảy',
    shortName: 'Sửa Xe Chú Bảy',
    subtitle: 'Vá xe máy • Thay nhớt • Cứu hộ 24/7 đầu Hẻm 485',
    row: 'N1',
    cx: -430.2,
    cz: -5.2,
    w: 9.6,
    bodyD: 21.2,
    doorW: 5.6,
    facingNorth: false,
    theme: 'billiard_net',
    isLegacyCustom: true,
    signBg: '#1e3a8a',
    badge: '🔧',
    poiCategory: 'tech',
    poiFilterGroup: 'tech_auto',
    openHours: '06:30 - 22:00',
  }),
  makeWalkableShopDef({
    id: 'shop_n1_pho_hanoi',
    name: 'Phở Bò & Bún Chả Hà Nội',
    shortName: 'Phở Hà Nội',
    subtitle: 'Nước dùng xương hầm truyền thống • Mở từ 05:30',
    row: 'N1',
    cx: -469.0,
    cz: -5.2,
    w: 9.6,
    bodyD: 21.2,
    doorW: 4.4,
    facingNorth: false,
    theme: 'pho',
    isLegacyCustom: true,
    signBg: '#991b1b',
    badge: '🍜',
    poiCategory: 'food',
    poiFilterGroup: 'food_nightlife',
    openHours: '05:30 - 22:30',
  }),
  makeWalkableShopDef({
    id: 'shop_n1_hutieu_545',
    name: 'Quán Hủ Tiếu Nam Vang 545',
    shortName: 'Hủ Tiếu 545',
    subtitle: 'Hủ tiếu khô • Xí quách • Quán ăn đi bộ vào trong',
    row: 'N1',
    cx: -578.4,
    cz: -5.2,
    w: 11.6,
    bodyD: 21.2,
    doorW: 4.4,
    facingNorth: false,
    theme: 'pho',
    isLegacyCustom: true,
    signBg: '#92400e',
    badge: '🍲',
    poiCategory: 'food',
    poiFilterGroup: 'food_nightlife',
    openHours: '06:00 - 23:30',
  }),
  makeWalkableShopDef({
    id: 'shop_s1_comtam',
    name: 'Quán Cơm Tấm Sài Gòn Nam Tây',
    shortName: 'Cơm Tấm SG',
    subtitle: 'Sườn bì chả nướng than • Góc đường đối diện Phố Cư Dân',
    row: 'S1',
    cx: -439.0,
    cz: 64.0,
    w: 10.0,
    bodyD: 24.0,
    doorW: 4.4,
    facingNorth: true,
    theme: 'pho',
    isLegacyCustom: true,
    signBg: '#b45309',
    badge: '🍛',
    poiCategory: 'food',
    poiFilterGroup: 'food_nightlife',
    openHours: '06:00 - 22:00',
  }),
  makeWalkableShopDef({
    id: 'shop_s1_bundau_426',
    name: 'Quán Bún Đậu Mẹt & Trà Chanh 426',
    shortName: 'Bún Đậu 426',
    subtitle: 'Bún đậu mắm tôm • Nem chua rán góc Hẻm 426',
    row: 'S1',
    cx: -478.3,
    cz: 64.0,
    w: 8.6,
    bodyD: 24.0,
    doorW: 4.4,
    facingNorth: true,
    theme: 'pho',
    isLegacyCustom: true,
    signBg: '#065f46',
    badge: '🥢',
    poiCategory: 'food',
    poiFilterGroup: 'food_nightlife',
    openHours: '10:00 - 23:00',
  }),
  makeWalkableShopDef({
    id: 'shop_s1_bunbo_onga',
    name: 'Quán Bún Bò Huế O Nga 490',
    shortName: 'Bún Bò O Nga',
    subtitle: 'Giò heo chả cua • Quán ăn đi bộ bên kia đường',
    row: 'S1',
    cx: -578.4,
    cz: 64.0,
    w: 11.6,
    bodyD: 24.0,
    doorW: 4.4,
    facingNorth: true,
    theme: 'pho',
    isLegacyCustom: true,
    signBg: '#9d174d',
    badge: '🍲',
    poiCategory: 'food',
    poiFilterGroup: 'food_nightlife',
    openHours: '06:00 - 22:30',
  }),

  // === 14 NEW WALKABLE HANG QUAN ACROSS ALLEYS, INNER STREETS & WEST EXTENSION ===
  // Row N1 West (Boulevard North)
  makeWalkableShopDef({
    id: 'shop_n1_cafe_sinhto_605',
    name: 'Cà Phê Vỉa Hè & Sinh Tố 605',
    shortName: 'Cafe 605',
    subtitle: 'Cà phê sữa đá • Sinh tố bơ • Ngồi vỉa hè & trong quán',
    row: 'N1',
    cx: -640.6,
    cz: -5.2,
    w: 11.2,
    bodyD: 21.2,
    doorW: 4.4,
    facingNorth: false,
    theme: 'cafe',
    floors: 2,
    signBg: '#78350f',
    badge: '☕',
    poiCategory: 'food',
    poiFilterGroup: 'food_nightlife',
    openHours: '06:00 - 23:30',
  }),
  makeWalkableShopDef({
    id: 'shop_n1_banhmi_chao_725',
    name: 'Tiệm Bánh Mì Chảo & Xôi Mặn 725',
    shortName: 'Bánh Mì 725',
    subtitle: 'Bánh mì chảo pate • Xôi xéo • Sữa đậu nành nóng',
    row: 'N1',
    cx: -764.0,
    cz: -5.2,
    w: 11.2,
    bodyD: 21.2,
    doorW: 4.4,
    facingNorth: false,
    theme: 'banhmi',
    floors: 2,
    signBg: '#c2410c',
    badge: '🥖',
    poiCategory: 'food',
    poiFilterGroup: 'food_nightlife',
    openHours: '05:30 - 22:00',
  }),
  makeWalkableShopDef({
    id: 'shop_n1_miquang_845',
    name: 'Quán Mì Quảng Bà Bảy 845',
    shortName: 'Mì Quảng 845',
    subtitle: 'Mì Quảng gà tôm thịt • Bánh tráng mè giòn rụm',
    row: 'N1',
    cx: -888.0,
    cz: -5.2,
    w: 11.2,
    bodyD: 21.2,
    doorW: 4.4,
    facingNorth: false,
    theme: 'pho',
    floors: 2,
    signBg: '#b45309',
    badge: '🍜',
    poiCategory: 'food',
    poiFilterGroup: 'food_nightlife',
    openHours: '06:00 - 22:00',
  }),

  // Row N2 (Facing Đường Nội Khu Bắc 1 — including RIGHT BEHIND Cyber Stadium & Food Hub!)
  makeWalkableShopDef({
    id: 'shop_n2_oc_sau_cyber',
    name: 'Quán Ốc Đêm & Nướng Sau Cyber',
    shortName: 'Ốc Đêm Cyber',
    subtitle: 'Ốc hương xào bơ tỏi • Chân gà nướng ngay sau Cyber Stadium',
    row: 'N2',
    cx: -303.5,
    cz: -43.0,
    w: 12.4,
    bodyD: 22.0,
    doorW: 4.6,
    facingNorth: false,
    theme: 'oc_lau',
    floors: 2,
    signBg: '#991b1b',
    badge: '🐚',
    poiCategory: 'food',
    poiFilterGroup: 'food_nightlife',
    openHours: '16:00 - 02:00',
  }),
  makeWalkableShopDef({
    id: 'shop_n2_trasua_cyber',
    name: 'Cà Phê & Bi-a Sau Bệnh Viện',
    shortName: 'Cafe Bi-a 285',
    subtitle: 'Trà đào cam sả • Bàn Bi-a lỗ • Mặt tiền Đường Nội Khu Bắc 1',
    row: 'N2',
    cx: -260.6,
    cz: -43.0,
    w: 12.4,
    bodyD: 22.0,
    doorW: 4.6,
    facingNorth: false,
    theme: 'billiard_net',
    floors: 3,
    signBg: '#0f766e',
    badge: '🎱',
    poiCategory: 'tech',
    poiFilterGroup: 'food_nightlife',
    openHours: '08:00 - 00:00',
  }),
  makeWalkableShopDef({
    id: 'shop_n2_bunrieu_425',
    name: 'Bún Riêu Cua Cô Lan 425/6',
    shortName: 'Bún Riêu 425/6',
    subtitle: 'Quán ăn sáng trong hẻm • Đường Nội Khu Bắc 1',
    row: 'N2',
    cx: -461.36,
    cz: -43.0,
    w: 12.6,
    bodyD: 22.0,
    doorW: 4.4,
    facingNorth: false,
    theme: 'pho',
    floors: 2,
    signBg: '#be185d',
    badge: '🍲',
    poiCategory: 'food',
    poiFilterGroup: 'food_nightlife',
    openHours: '06:00 - 21:00',
  }),
  makeWalkableShopDef({
    id: 'shop_n2_trasua_545_8',
    name: 'Trà Sữa & Ăn Vặt Góc Hẻm 545/8',
    shortName: 'Trà Sữa 545/8',
    subtitle: 'Trà sữa trân châu • Cá viên chiên • Khu Phố Trong',
    row: 'N2',
    cx: -615.6,
    cz: -43.0,
    w: 12.4,
    bodyD: 22.0,
    doorW: 4.4,
    facingNorth: false,
    theme: 'boba',
    floors: 2,
    signBg: '#db2777',
    badge: '🧋',
    poiCategory: 'food',
    poiFilterGroup: 'food_nightlife',
    openHours: '09:00 - 23:00',
  }),
  makeWalkableShopDef({
    id: 'shop_n2_minimart_725_4',
    name: 'Siêu Thị Mini 24H Tổ 4 · 725/4',
    shortName: 'MiniMart 725/4',
    subtitle: 'Đồ ăn nhanh • Nước uống • Nhu yếu phẩm 24/7',
    row: 'N2',
    cx: -751.0,
    cz: -43.0,
    w: 11.2,
    bodyD: 22.0,
    doorW: 4.4,
    facingNorth: false,
    theme: 'mini_mart',
    floors: 2,
    signBg: '#0369a1',
    badge: '🏪',
    poiCategory: 'commerce',
    poiFilterGroup: 'home_civic',
    openHours: '24/7',
  }),

  // Row N3 & Row N4 (Inner Streets Bắc 2 & Bắc 3)
  makeWalkableShopDef({
    id: 'shop_n3_cafe_cotuong_t5',
    name: 'Cà Phê Cờ Tướng Tổ 5',
    shortName: 'Cafe Cờ Tướng',
    subtitle: 'Cà phê phin • Trà gừng • Giao lưu hàng xóm Bắc 2',
    row: 'N3',
    cx: -453.0,
    cz: -81.0,
    w: 12.6,
    bodyD: 22.0,
    doorW: 4.4,
    facingNorth: false,
    theme: 'cafe',
    floors: 2,
    signBg: '#78350f',
    badge: '♟️',
    poiCategory: 'food',
    poiFilterGroup: 'food_nightlife',
    openHours: '06:00 - 22:30',
  }),
  makeWalkableShopDef({
    id: 'shop_n3_lau_bo_to5',
    name: 'Quán Lẩu Bò & Nướng Tổ 5',
    shortName: 'Lẩu Bò Tổ 5',
    subtitle: 'Lẩu đuôi bò • Bò né • Đường Nội Khu Bắc 2',
    row: 'N3',
    cx: -614.25,
    cz: -81.0,
    w: 13.2,
    bodyD: 22.0,
    doorW: 4.4,
    facingNorth: false,
    theme: 'oc_lau',
    floors: 2,
    signBg: '#991b1b',
    badge: '🥘',
    poiCategory: 'food',
    poiFilterGroup: 'food_nightlife',
    openHours: '15:00 - 01:00',
  }),
  makeWalkableShopDef({
    id: 'shop_n4_chaovit_bac3',
    name: 'Quán Cháo Vịt & Gỏi Gà Bắc 3',
    shortName: 'Cháo Vịt Bắc 3',
    subtitle: 'Vịt luộc mắm gừng • Cháo nóng • Đường Nội Khu Bắc 3',
    row: 'N4',
    cx: -491.0,
    cz: -119.0,
    w: 11.4,
    bodyD: 22.0,
    doorW: 4.4,
    facingNorth: false,
    theme: 'pho',
    floors: 2,
    signBg: '#065f46',
    badge: '🦆',
    poiCategory: 'food',
    poiFilterGroup: 'food_nightlife',
    openHours: '10:00 - 23:00',
  }),
  makeWalkableShopDef({
    id: 'shop_n4_cafe_sach_785',
    name: 'Cà Phê Sách & Bánh Ngọt 785/24',
    shortName: 'Cafe Sách Bắc 3',
    subtitle: 'Không gian yên tĩnh • Trà hoa quả • Góc Tây Bắc',
    row: 'N4',
    cx: -750.0,
    cz: -119.0,
    w: 11.2,
    bodyD: 22.0,
    doorW: 4.4,
    facingNorth: false,
    theme: 'cafe',
    floors: 2,
    signBg: '#0f766e',
    badge: '📚',
    poiCategory: 'food',
    poiFilterGroup: 'food_nightlife',
    openHours: '07:00 - 22:30',
  }),

  // Row S1 West + Row S2 + Row S3 ("Bên Kia Đường")
  makeWalkableShopDef({
    id: 'shop_s1_ocdem_550',
    name: 'Quán Lẩu Nướng & Ốc Đêm 550',
    shortName: 'Ốc Đêm 550',
    subtitle: 'Hải sản nướng mỡ hành • Lẩu thái chua cay góc Hẻm 550',
    row: 'S1',
    cx: -640.6,
    cz: 64.0,
    w: 11.2,
    bodyD: 24.0,
    doorW: 4.4,
    facingNorth: true,
    theme: 'oc_lau',
    floors: 2,
    signBg: '#991b1b',
    badge: '🔥',
    poiCategory: 'food',
    poiFilterGroup: 'food_nightlife',
    openHours: '16:00 - 02:00',
  }),
  makeWalkableShopDef({
    id: 'shop_s1_banhxeo_730',
    name: 'Bánh Xèo & Nem Lụi Miền Trung 730',
    shortName: 'Bánh Xèo 730',
    subtitle: 'Bánh xèo giòn rụm • Rau sống • Nước lèo đậu phộng',
    row: 'S1',
    cx: -764.0,
    cz: 64.0,
    w: 11.2,
    bodyD: 24.0,
    doorW: 4.4,
    facingNorth: true,
    theme: 'banhmi',
    floors: 2,
    signBg: '#b45309',
    badge: '🥞',
    poiCategory: 'food',
    poiFilterGroup: 'food_nightlife',
    openHours: '11:00 - 22:30',
  }),
  makeWalkableShopDef({
    id: 'shop_s1_trasua_garan_850',
    name: 'Trà Sữa & Gà Rán Hẻm 850',
    shortName: 'Trà Sữa 850',
    subtitle: 'Gà rán giòn cay • Trà sữa khoai môn • Khoai tây lắc',
    row: 'S1',
    cx: -888.0,
    cz: 64.0,
    w: 11.2,
    bodyD: 24.0,
    doorW: 4.4,
    facingNorth: true,
    theme: 'boba',
    floors: 2,
    signBg: '#db2777',
    badge: '🍗',
    poiCategory: 'food',
    poiFilterGroup: 'food_nightlife',
    openHours: '09:00 - 23:00',
  }),
  makeWalkableShopDef({
    id: 'shop_s2_chethai_426_9',
    name: 'Chè Thái & Tàu Hũ Nóng 426/9',
    shortName: 'Chè Thái 426/9',
    subtitle: 'Chè sầu riêng • Tàu hũ trân châu • Đường Nội Khu Nam 1',
    row: 'S2',
    cx: -491.6,
    cz: 121.0,
    w: 11.6,
    bodyD: 26.0,
    doorW: 4.4,
    facingNorth: true,
    theme: 'boba',
    floors: 2,
    signBg: '#9d174d',
    badge: '🍧',
    poiCategory: 'food',
    poiFilterGroup: 'food_nightlife',
    openHours: '11:00 - 23:30',
  }),
  makeWalkableShopDef({
    id: 'shop_s2_bunthitnuong_550_7',
    name: 'Quán Bún Thịt Nướng & Nem Lụi 550/7',
    shortName: 'Bún Thịt Nướng',
    subtitle: 'Thịt xiên nướng thơm lừng • Đường Nội Khu Nam 1',
    row: 'S2',
    cx: -621.6,
    cz: 121.0,
    w: 11.6,
    bodyD: 26.0,
    doorW: 4.4,
    facingNorth: true,
    theme: 'pho',
    floors: 2,
    signBg: '#b45309',
    badge: '🍢',
    poiCategory: 'food',
    poiFilterGroup: 'food_nightlife',
    openHours: '09:00 - 22:00',
  }),
  makeWalkableShopDef({
    id: 'shop_s3_nhau_chodem_nam2',
    name: 'Quán Nhậu Bình Dân & Lẩu Cua Nam 2',
    shortName: 'Lẩu Cua Nam 2',
    subtitle: 'Không gian rộng • Lẩu cua đồng • Đối diện Vườn Hoa Tổ 6',
    row: 'S3',
    cx: -491.0,
    cz: 175.0,
    w: 11.4,
    bodyD: 26.0,
    doorW: 4.6,
    facingNorth: true,
    theme: 'oc_lau',
    floors: 2,
    signBg: '#991b1b',
    badge: '🦀',
    poiCategory: 'food',
    poiFilterGroup: 'food_nightlife',
    openHours: '15:00 - 01:00',
  }),
  makeWalkableShopDef({
    id: 'shop_s3_taphoa_sau_truong',
    name: 'Trà Chanh & Tạp Hóa Sau Trường PCT',
    shortName: 'Trà Chanh PCT',
    subtitle: 'Đồ ăn vặt học sinh • Bánh tráng trộn • Đường Nội Khu Nam 2',
    row: 'S3',
    cx: -389.01,
    cz: 175.0,
    w: 12.48,
    bodyD: 26.0,
    doorW: 4.4,
    facingNorth: true,
    theme: 'boba',
    floors: 2,
    signBg: '#0284c7',
    badge: '🍋',
    poiCategory: 'food',
    poiFilterGroup: 'food_nightlife',
    openHours: '07:00 - 22:30',
  }),

  // === 8 NEW WALKABLE HANG QUAN IN SOUTH HOSPITAL RESIDENTIAL QUARTER (SH2, SH3, SH4) ===
  makeWalkableShopDef({
    id: 'shop_sh2_pho_nambv',
    name: 'Phở Bò Hà Nội Nam Bệnh Viện',
    shortName: 'Phở Nam BV',
    subtitle: 'Phở tái nạm gầu • Phục vụ cư dân & người nhà bệnh nhân 24/7',
    row: 'SH2',
    cx: -198.0,
    cz: 130.0,
    w: 10.67,
    bodyD: 25.0,
    doorW: 4.4,
    facingNorth: true,
    theme: 'pho',
    floors: 2,
    signBg: '#991b1b',
    badge: '🍜',
    poiCategory: 'food',
    poiFilterGroup: 'food_nightlife',
    openHours: '05:30 - 23:30',
  }),
  makeWalkableShopDef({
    id: 'shop_sh2_cafe_210',
    name: 'Cà Phê Sáng 210 · Phố Nam BV',
    shortName: 'Cafe 210',
    subtitle: 'Cà phê phin • Trà đào cam sả góc Hẻm 210',
    row: 'SH2',
    cx: -160.0,
    cz: 130.0,
    w: 10.67,
    bodyD: 25.0,
    doorW: 4.4,
    facingNorth: true,
    theme: 'cafe',
    floors: 2,
    signBg: '#78350f',
    badge: '☕',
    poiCategory: 'food',
    poiFilterGroup: 'food_nightlife',
    openHours: '06:00 - 23:00',
  }),
  makeWalkableShopDef({
    id: 'shop_sh2_banhmi_170',
    name: 'Bánh Mì Chảo & Xôi Mặn 170',
    shortName: 'Bánh Mì 170',
    subtitle: 'Bánh mì pate trứng • Xôi thịt kho góc Hẻm 170',
    row: 'SH2',
    cx: -123.0,
    cz: 130.0,
    w: 10.0,
    bodyD: 25.0,
    doorW: 4.4,
    facingNorth: true,
    theme: 'banhmi',
    floors: 2,
    signBg: '#c2410c',
    badge: '🥖',
    poiCategory: 'food',
    poiFilterGroup: 'food_nightlife',
    openHours: '05:30 - 22:00',
  }),
  makeWalkableShopDef({
    id: 'shop_sh3_comtam_272',
    name: 'Cơm Tấm Sườn Bì 272 · Góc Đại Lộ',
    shortName: 'Cơm Tấm 272',
    subtitle: 'Sườn nướng than • Canh chua • Ngay Ngã Tư Nam Bệnh Viện',
    row: 'SH3',
    cx: -247.25,
    cz: 175.0,
    w: 12.5,
    bodyD: 26.0,
    doorW: 4.4,
    facingNorth: true,
    theme: 'pho',
    floors: 2,
    signBg: '#b45309',
    badge: '🍛',
    poiCategory: 'food',
    poiFilterGroup: 'food_nightlife',
    openHours: '06:00 - 22:30',
  }),
  makeWalkableShopDef({
    id: 'shop_sh3_trasua_to10',
    name: 'Trà Sữa & Ăn Vặt Tổ 10 · 210/8',
    shortName: 'Trà Sữa Tổ 10',
    subtitle: 'Trà sữa nướng • Nem chua rán • Mặt tiền Đường Nam 2',
    row: 'SH3',
    cx: -198.0,
    cz: 175.0,
    w: 10.67,
    bodyD: 26.0,
    doorW: 4.4,
    facingNorth: true,
    theme: 'boba',
    floors: 2,
    signBg: '#db2777',
    badge: '🧋',
    poiCategory: 'food',
    poiFilterGroup: 'food_nightlife',
    openHours: '09:00 - 23:00',
  }),
  makeWalkableShopDef({
    id: 'shop_sh3_oclau_nambv',
    name: 'Quán Ốc & Lẩu Đêm Nam Bệnh Viện',
    shortName: 'Ốc Đêm Nam BV',
    subtitle: 'Ốc len xào dừa • Lẩu hải sản • Đường Nội Khu Nam 2 Đông',
    row: 'SH3',
    cx: -160.0,
    cz: 175.0,
    w: 10.67,
    bodyD: 26.0,
    doorW: 4.6,
    facingNorth: true,
    theme: 'oc_lau',
    floors: 2,
    signBg: '#991b1b',
    badge: '🐚',
    poiCategory: 'food',
    poiFilterGroup: 'food_nightlife',
    openHours: '15:30 - 02:00',
  }),
  makeWalkableShopDef({
    id: 'shop_sh4_taphoa_cotu',
    name: 'Tạp Hóa 24H Cô Tư · Tổ 9',
    shortName: 'Tạp Hóa Tổ 9',
    subtitle: 'Nước giải khát • Nhu yếu phẩm • Góc Đường Nam 3 Tây',
    row: 'SH4',
    cx: -278.25,
    cz: 221.0,
    w: 12.5,
    bodyD: 26.0,
    doorW: 4.4,
    facingNorth: true,
    theme: 'mini_mart',
    floors: 2,
    signBg: '#0369a1',
    badge: '🛒',
    poiCategory: 'commerce',
    poiFilterGroup: 'home_civic',
    openHours: '24/7',
  }),
  makeWalkableShopDef({
    id: 'shop_sh4_bida_nambv',
    name: 'Bida & Net Gaming Nam Bệnh Viện',
    shortName: 'Bida Nam BV',
    subtitle: 'Bàn Bi-a lỗ • Nước uống • Đường Nội Khu Nam 3 Đông',
    row: 'SH4',
    cx: -198.0,
    cz: 221.0,
    w: 10.67,
    bodyD: 26.0,
    doorW: 4.6,
    facingNorth: true,
    theme: 'billiard_net',
    floors: 3,
    signBg: '#0f766e',
    badge: '🎱',
    poiCategory: 'tech',
    poiFilterGroup: 'food_nightlife',
    openHours: '08:00 - 00:00',
  }),
  // === 11 NEW WALKABLE SHOPS ACROSS SOUTH-CENTRAL (OCEAN PARK LINK) & SOUTHWEST EXPANSION (S4..S6, SH5..SH6, SC2..SC6) ===
  makeWalkableShopDef({
    id: 'shop_sc2_pho_namtt',
    name: 'Phở Cuốn & Bún Chả Nam Trung Tâm',
    shortName: 'Phở Nam TT',
    subtitle: 'Phở cuốn tươi • Bún chả than hoa • Đường Đông BV 1',
    row: 'SC2',
    cx: -72.5,
    cz: 127.75,
    w: 11.0,
    bodyD: 22.5,
    doorW: 4.4,
    facingNorth: true,
    theme: 'pho',
    floors: 2,
    signBg: '#991b1b',
    badge: '🍜',
    poiCategory: 'food',
    poiFilterGroup: 'food_nightlife',
    openHours: '06:00 - 22:30',
  }),
  makeWalkableShopDef({
    id: 'shop_sc2_cafe_oceangate',
    name: 'Cà Phê Sân Vườn Ocean Gate',
    shortName: 'Cafe Ocean Gate',
    subtitle: 'Cà phê đặc sản • Trà trái cây • Cửa ngõ Vinhomes Bắc',
    row: 'SC2',
    cx: 28.25,
    cz: 127.75,
    w: 10.5,
    bodyD: 22.5,
    doorW: 4.4,
    facingNorth: true,
    theme: 'cafe',
    floors: 2,
    signBg: '#78350f',
    badge: '☕',
    poiCategory: 'food',
    poiFilterGroup: 'food_nightlife',
    openHours: '06:30 - 23:00',
  }),
  makeWalkableShopDef({
    id: 'shop_sc3_banhmi_54',
    name: 'Bánh Mì Chảo & Xôi Đêm Hẻm 54',
    shortName: 'Bánh Mì 54',
    subtitle: 'Bánh mì pate • Xôi gà xé • Trục Đường Nam 2',
    row: 'SC3',
    cx: -22.5,
    cz: 175.0,
    w: 11.0,
    bodyD: 26.0,
    doorW: 4.4,
    facingNorth: true,
    theme: 'banhmi',
    floors: 2,
    signBg: '#c2410c',
    badge: '🥖',
    poiCategory: 'food',
    poiFilterGroup: 'food_nightlife',
    openHours: '05:30 - 23:30',
  }),
  makeWalkableShopDef({
    id: 'shop_sc3_minimart_ocean',
    name: 'Siêu Thị Mini 24H Cửa Ngõ Ocean Park',
    shortName: 'MiniMart Ocean',
    subtitle: 'Thực phẩm sạch • Nước giải khát • Sát Đường Vành Đai Ocean Park',
    row: 'SC3',
    cx: 76.25,
    cz: 175.0,
    w: 10.5,
    bodyD: 26.0,
    doorW: 4.4,
    facingNorth: true,
    theme: 'mini_mart',
    floors: 2,
    signBg: '#0369a1',
    badge: '🏪',
    poiCategory: 'commerce',
    poiFilterGroup: 'home_civic',
    openHours: '24/7',
  }),
  makeWalkableShopDef({
    id: 'shop_sc5_lau_namtt',
    name: 'Quán Lẩu Nướng & Hải Sản Nam Trung Tâm',
    shortName: 'Lẩu Nướng TT',
    subtitle: 'Lẩu Thái hải sản • Sườn nướng tảng • Đường Nội Khu Nam 4',
    row: 'SC5',
    cx: 17.75,
    cz: 268.0,
    w: 10.5,
    bodyD: 28.0,
    doorW: 4.6,
    facingNorth: true,
    theme: 'oc_lau',
    floors: 2,
    signBg: '#991b1b',
    badge: '🍲',
    poiCategory: 'food',
    poiFilterGroup: 'food_nightlife',
    openHours: '15:00 - 01:30',
  }),
  makeWalkableShopDef({
    id: 'shop_sc6_trasua_nam6',
    name: 'Trà Sữa & Cafe Đại Lộ Nam Ocean Park',
    shortName: 'Trà Sữa Nam 6',
    subtitle: 'Trà sữa kem cheese • Bánh ngọt • Ngay cửa ngõ Ocean Park Nam',
    row: 'SC6',
    cx: 76.25,
    cz: 317.0,
    w: 10.5,
    bodyD: 26.0,
    doorW: 4.4,
    facingNorth: true,
    theme: 'boba',
    floors: 2,
    signBg: '#db2777',
    badge: '🧋',
    poiCategory: 'food',
    poiFilterGroup: 'food_nightlife',
    openHours: '08:00 - 23:30',
  }),
  makeWalkableShopDef({
    id: 'shop_sh5_comnieu_to12',
    name: 'Cơm Niêu & Bún Đậu Tổ 12',
    shortName: 'Cơm Niêu Tổ 12',
    subtitle: 'Cơm niêu cá kho tộ • Bún đậu mẹt • Đường Nam 4 Nam Bệnh Viện',
    row: 'SH5',
    cx: -160.0,
    cz: 268.0,
    w: 10.67,
    bodyD: 28.0,
    doorW: 4.4,
    facingNorth: true,
    theme: 'pho',
    floors: 2,
    signBg: '#b45309',
    badge: '🍚',
    poiCategory: 'food',
    poiFilterGroup: 'food_nightlife',
    openHours: '06:30 - 22:00',
  }),
  makeWalkableShopDef({
    id: 'shop_sh6_bida_nam6',
    name: 'Bida Club & Cafe Cuối Đại Lộ Bệnh Viện',
    shortName: 'Bida Đại Lộ Nam',
    subtitle: 'Bida lỗ • Cà phê đêm • Ngã Tư Đại Lộ Bệnh Viện – Nam 6',
    row: 'SH6',
    cx: -247.25,
    cz: 317.0,
    w: 12.5,
    bodyD: 26.0,
    doorW: 4.6,
    facingNorth: true,
    theme: 'billiard_net',
    floors: 3,
    signBg: '#0f766e',
    badge: '🎱',
    poiCategory: 'tech',
    poiFilterGroup: 'food_nightlife',
    openHours: '08:00 - 01:00',
  }),
  makeWalkableShopDef({
    id: 'shop_s4_phodem_426',
    name: 'Quán Phở Đêm Tây Nam 426',
    shortName: 'Phở Đêm 426',
    subtitle: 'Phở bò tái lăn • Quẩy nóng • Đường Nội Khu Nam 3 Tây Nam',
    row: 'S4',
    cx: -401.5,
    cz: 221.0,
    w: 12.49,
    bodyD: 26.0,
    doorW: 4.4,
    facingNorth: true,
    theme: 'pho',
    floors: 2,
    signBg: '#991b1b',
    badge: '🍜',
    poiCategory: 'food',
    poiFilterGroup: 'food_nightlife',
    openHours: '05:30 - 01:00',
  }),
  makeWalkableShopDef({
    id: 'shop_s5_taphoa_taynam',
    name: 'Tạp Hóa & Cafe Vườn Cây Tây Nam',
    shortName: 'Cafe Tây Nam',
    subtitle: 'Cà phê đá • Tạp hóa gia đình • Đường Nội Khu Nam 4 Tây',
    row: 'S5',
    cx: -662.1,
    cz: 268.0,
    w: 12.31,
    bodyD: 28.0,
    doorW: 4.4,
    facingNorth: true,
    theme: 'cafe',
    floors: 2,
    signBg: '#065f46',
    badge: '☕',
    poiCategory: 'commerce',
    poiFilterGroup: 'home_civic',
    openHours: '06:00 - 23:00',
  }),
  makeWalkableShopDef({
    id: 'shop_s6_ocnuong_nam6',
    name: 'Quán Ốc & Nướng Đại Lộ Nam 6',
    shortName: 'Ốc Nướng Nam 6',
    subtitle: 'Ốc hương rang muối • Hải sản tươi • Đường Nội Khu Nam 5',
    row: 'S6',
    cx: -484.3,
    cz: 317.0,
    w: 13.4,
    bodyD: 26.0,
    doorW: 4.6,
    facingNorth: true,
    theme: 'oc_lau',
    floors: 2,
    signBg: '#9a3412',
    badge: '🐚',
    poiCategory: 'food',
    poiFilterGroup: 'food_nightlife',
    openHours: '15:30 - 02:00',
  }),
];

/**
 * Computes colliders for a parametric walkable shop:
 * - Side walls, rear wall, front walls with open central doorway of `doorW`
 * - Counter, kitchen pass, dining tables cleanly inside leaving clear entry aisles!
 */
export function buildWalkableShopColliders(shop: WestWalkableShopDef): IntersectionColliderBox[] {
  const halfW = shop.w * 0.5;
  const halfD = shop.bodyD * 0.5;
  const minX = shop.cx - halfW;
  const maxX = shop.cx + halfW;
  const minZ = shop.cz - halfD;
  const maxZ = shop.cz + halfD;
  const doorHalf = shop.doorW * 0.5;
  const frontZ = shop.facingNorth ? minZ : maxZ;
  const backZ = shop.facingNorth ? maxZ : minZ;
  const dirIn = shop.facingNorth ? 1 : -1; // pointing into shop from frontZ
  const spanZ = (a: number, b: number) => ({
    minZ: Math.min(frontZ + dirIn * a, frontZ + dirIn * b),
    maxZ: Math.max(frontZ + dirIn * a, frontZ + dirIn * b),
  });

  const cols: IntersectionColliderBox[] = [
    // West & East perimeter walls
    { minX: minX - 0.05, maxX: minX + 0.45, minZ, maxZ, floor: 1 },
    { minX: maxX - 0.45, maxX: maxX + 0.05, minZ, maxZ, floor: 1 },
    // Back wall
    { minX: minX - 0.05, maxX: maxX + 0.05, minZ: backZ - 0.3, maxZ: backZ + 0.3, floor: 1 },
    // Front wall left & right leaving open doorway [cx - doorHalf .. cx + doorHalf]
    { minX: minX - 0.05, maxX: shop.cx - doorHalf, minZ: frontZ - 0.3, maxZ: frontZ + 0.3, floor: 1 },
    { minX: shop.cx + doorHalf, maxX: maxX + 0.05, minZ: frontZ - 0.3, maxZ: frontZ + 0.3, floor: 1 },
    // West service counter / showcase
    { minX: minX + 0.7, maxX: minX + 2.3, ...spanZ(4.0, 10.5), floor: 1 },
    // Rear kitchen / checkout counter
    {
      minX: minX + 1.4,
      maxX: maxX - 1.4,
      minZ: Math.min(backZ - dirIn * 4.7, backZ - dirIn * 3.1),
      maxZ: Math.max(backZ - dirIn * 4.7, backZ - dirIn * 3.1),
      floor: 1,
    },
  ];

  if (shop.theme === 'mini_mart') {
    // East wall grocery shelving + beverage cooler
    cols.push({ minX: maxX - 1.5, maxX: maxX - 0.45, ...spanZ(4.0, 14.5), floor: 1 });
    // Center-East double-sided supermarket gondola (keeps main shop.cx walkway open!)
    cols.push({ minX: shop.cx + 0.85, maxX: shop.cx + 1.75, ...spanZ(5.2, 11.4), floor: 1 });
    // Horizontal ice-cream freezer chest behind gondola
    cols.push({ minX: shop.cx + 0.8, maxX: shop.cx + 1.85, ...spanZ(12.6, 14.8), floor: 1 });
  } else if (shop.theme === 'billiard_net') {
    // Pool tables on East zone matching builder depth
    const poolOffsets = shop.bodyD >= 21.0 ? [5.0, 9.8, 14.4] : [5.0, 9.8];
    poolOffsets.forEach((d) => {
      cols.push({ minX: maxX - 3.25, maxX: maxX - 1.15, ...spanZ(d - 0.8, d + 0.8), floor: 1 });
    });
    // West-side beverage chiller & snack rack
    cols.push({ minX: minX + 0.7, maxX: minX + 2.1, ...spanZ(11.8, 14.8), floor: 1 });
  } else {
    // Eatery / Café / Boba: all East dining tables + West-side chiller/herb station + center condiment island on wide shops
    const tableOffsets =
      shop.bodyD >= 21.0
        ? [4.4, 7.8, 11.2, 14.4]
        : shop.bodyD >= 17.5
          ? [4.8, 8.4, 11.8]
          : [5.4, 9.4];
    tableOffsets.forEach((d) => {
      cols.push({ minX: maxX - 2.9, maxX: maxX - 0.9, ...spanZ(d - 0.68, d + 0.68), floor: 1 });
    });
    cols.push({ minX: minX + 0.7, maxX: minX + 2.1, ...spanZ(12.0, 14.6), floor: 1 });
    if (shop.w >= 11.4 && shop.bodyD >= 21.0) {
      // Compact center-right condiment / herb / trà đá island (keeps cx aisle & cx+front4m clear)
      cols.push({ minX: shop.cx + 0.3, maxX: shop.cx + 1.1, ...spanZ(7.0, 8.8), floor: 1 });
    }
  }

  return cols;
}

export function subdivideLotSegment(
  minX: number,
  maxX: number,
  count: number
): Array<{ minX: number; maxX: number; w: number; cx: number }> {
  const step = (maxX - minX) / count;
  const lots: Array<{ minX: number; maxX: number; w: number; cx: number }> = [];
  for (let i = 0; i < count; i++) {
    const lx2 = maxX - i * step;
    const lx1 = i === count - 1 ? minX : maxX - (i + 1) * step;
    lots.push({ minX: lx1, maxX: lx2, w: lx2 - lx1, cx: (lx1 + lx2) * 0.5 });
  }
  return lots;
}

export function findWestAlleyAt(x: number, z: number, padX = 0): WestAlleyDef | null {
  for (let i = 0; i < WEST_ALLEYS.length; i++) {
    const a = WEST_ALLEYS[i];
    if (x >= a.minX - padX && x <= a.maxX + padX && z >= a.minZ && z <= a.maxZ) {
      return a;
    }
  }
  return null;
}

export function isInsideWestBikeForbiddenShop(x: number, z: number): boolean {
  for (let i = 0; i < WEST_WALKABLE_SHOPS.length; i++) {
    const s = WEST_WALKABLE_SHOPS[i];
    if (x >= s.minX && x <= s.maxX && z >= s.minZ && z <= s.maxZ) {
      return true;
    }
  }
  return false;
}

export function isInsideWestResidentialBounds(x: number, z: number): boolean {
  if (x >= WEST_RES_EXPANSION_MIN_X && x <= WEST_RES_EAST_REAR_MAX_X && z >= WEST_RES_REAR_MIN_Z && z < -17.5) {
    return true;
  }
  if (x >= WEST_RES_EXPANSION_MIN_X && x <= WEST_RES_MAX_X && z >= -18.0 && z <= 15.6) {
    return true;
  }
  if (x >= WEST_RES_SOUTH_MIN_X && x <= WEST_RES_SOUTH_MAX_X && z >= 42.5 && z <= 148.0) {
    return true;
  }
  if (x >= WEST_RES_SOUTH_MIN_X && x <= WEST_RES_SOUTH_S3_MAX_X && z >= 148.0 && z <= WEST_RES_SOUTH_MAX_Z) {
    return true;
  }
  if (x >= SOUTH_HOSP_WEST_MIN_X && x <= SOUTH_HOSP_WEST_MAX_X && z >= 135.0 && z <= SOUTH_HOSP_MAX_Z) {
    return true;
  }
  if (x >= SOUTH_HOSP_EAST_MIN_X && x <= SOUTH_HOSP_EAST_MAX_X && z >= SOUTH_HOSP_MIN_Z && z <= SOUTH_HOSP_MAX_Z) {
    return true;
  }
  if (x >= SOUTH_HOSP_EAST_MAX_X && x <= SOUTH_EXPANSION_EAST_MAX_X && z >= SOUTH_CENTER_MIN_Z && z <= SOUTH_HOSP_MAX_Z) {
    return true;
  }
  return false;
}

/**
 * Motorbike boundary clamp inside Phố Cư Dân Tây:
 * Uses exact single-source-of-truth alley + inner-road footprints with 0.35m inner safety margin
 * so riding along any boulevard/inner road and turning straight into any 5.6m–6.0m alley is silky smooth.
 */
export function clampMotorbikeWestResidentialBounds(
  cx: number,
  cz: number
): { x: number; z: number; handled: boolean } {
  // 1. North Zone (Z <= 15.5)
  if (cz <= 15.5 && cx <= -241.0) {
    const canExitWestToCoast = isInWestCoastalResidentialOpening(cz, 0.25);
    const minNorthX = canExitWestToCoast ? -974.0 : WEST_RES_EXPANSION_MIN_X;
    let x = Math.max(minNorthX, cx);
    let z = cz;

    // Between X = -362 .. -241: Cyber Stadium (-361.6..-342.4) & Night Food Hub (-342..-241) occupy Z = -18..+5.8
    // Behind them (-134..-18) is full residential Zone N2/N3/N4 + Bắc 1/2/3!
    if (x > -362.0 && z > -18.0) {
      z = Math.max(x < -342.0 ? 5.8 : -17.0, z);
      return { x, z, handled: true };
    }

    // East-West Inner Roads (Bắc 1: -26..-18, Bắc 2: -64..-56, Bắc 3: -102..-94) — all open West into Đường Ven Biển!
    if (z >= -26.2 && z <= -17.8) {
      return { x, z, handled: true };
    }
    if (z >= -64.2 && z <= -55.8) {
      return { x, z, handled: true };
    }
    if (z >= -102.2 && z <= -93.8) {
      return { x, z, handled: true };
    }

    // Community open zones:
    // Nhà Văn Hóa Tổ 4 yard (X=-380..-362, Z=-38..-26), Sân Cầu Lông Tổ 5 (X=-390..-362, Z=-94..-64), Công Viên Tổ 7 (X=-396..-362, Z=-134..-102)
    if (x >= -380.0 && x <= -362.0 && z >= -38.0 && z < -26.0) {
      return { x, z, handled: true };
    }
    if (x >= -390.0 && x <= -362.0 && z >= -94.0 && z < -64.0) {
      return { x, z, handled: true };
    }
    if (x >= -396.0 && x <= -362.0 && z >= -134.5 && z < -102.0) {
      const canExitNorthRiver = isInWestRiverResidentialOpening(x, -0.2);
      return { x, z: canExitNorthRiver ? z : Math.max(-133.5, z), handled: true };
    }
    // Chợ Bắc Tây (Chợ Dân Sinh Khu Bắc, X=-578.8..-511.2, Z=-54..-26): open front plaza + wide 6.8m/4.6m market aisles!
    if (x >= -578.8 && x <= -511.2 && z >= -54.2 && z <= -25.8) {
      return { x, z, handled: true };
    }

    // Inside any North alley corridor (N1, N2, N3, N4): NEVER clamp Z across alley mouths!
    // Row N4 alleys open straight North across Z = -134 into Đường Ven Sông Bạch Đằng Tây!
    const alley = findWestAlleyAt(x, z, 0.0);
    if (alley && (alley.row === 'N1' || alley.row === 'N2' || alley.row === 'N3' || alley.row === 'N4')) {
      const inHouseBodyZ =
        (alley.row === 'N1' && z >= -18.0 && z <= 5.8) ||
        (alley.row === 'N2' && z >= -54.2 && z <= -31.8) ||
        (alley.row === 'N3' && z >= -92.2 && z <= -69.8) ||
        (alley.row === 'N4' && z >= -130.2 && z <= -107.8);
      if (inHouseBodyZ) {
        x = Math.max(alley.minX + 0.3, Math.min(alley.maxX - 0.3, x));
      }
      return { x, z: alley.row === 'N4' ? z : Math.max(-133.5, z), handled: true };
    }

    // Front & rear yards / aprons along boulevard & inner streets (outside alleys)
    if (z > 5.4 && z <= 15.5) {
      return { x, z: Math.max(5.8, z), handled: true };
    }
    if (z >= -32.2 && z < -25.8) {
      return { x, z: Math.max(-31.8, z), handled: true };
    }
    if (z >= -56.2 && z < -53.8) {
      return { x, z: Math.min(-54.2, z), handled: true };
    }
    if (z >= -70.2 && z < -63.8) {
      return { x, z: Math.max(-69.8, z), handled: true };
    }
    if (z >= -94.2 && z < -91.8) {
      return { x, z: Math.min(-92.2, z), handled: true };
    }
    if (z >= -108.2 && z < -101.8) {
      return { x, z: Math.max(-107.8, z), handled: true };
    }
    if (z >= -134.0 && z <= -129.8) {
      return { x, z: Math.max(-133.5, Math.min(-130.2, z)), handled: true };
    }

    // Otherwise clamp back to nearest open street/yard outside the solid house shell
    if (z >= -18.0 && z <= 5.4) {
      z = z > -6.3 ? 5.8 : -17.8;
    } else if (z >= -54.0 && z < -32.0) {
      z = z > -43.0 ? -31.8 : -54.2;
    } else if (z >= -92.0 && z < -70.0) {
      z = z > -81.0 ? -69.8 : -92.2;
    } else if (z >= -130.0 && z < -108.0) {
      z = z > -119.0 ? -107.8 : -130.2;
    } else {
      z = Math.max(-133.5, z);
    }
    return { x, z, handled: true };
  }

  // 2. South Mega-District (Z >= 42.0 West of -425.8, Z >= 148.0 in -425.8..-305, Z >= 135.0 in -305..-241, Z >= 88.0 in -214..-100, Z >= 104.0 in -100..+105!)
  const inSwTop = cz >= 42.0 && cx <= -425.8;
  const inBehindSchoolSouth = cz >= 148.0 && cx > -425.8 && cx <= -305.0;
  const inSouthHospWest = cx > -305.0 && cx <= -241.0 && cz >= 135.0;
  const inSouthHospEast = cx >= -214.0 && cx <= SOUTH_HOSP_EAST_MAX_X && cz >= 88.0;
  const inSouthCenter = cx > SOUTH_HOSP_EAST_MAX_X && cx <= SOUTH_EXPANSION_EAST_MAX_X + 0.3 && cz >= SOUTH_CENTER_MIN_Z;

  if (inSwTop || inBehindSchoolSouth || inSouthHospWest || inSouthHospEast || inSouthCenter) {
    const canExitSouthWestToCoast = isInWestCoastalResidentialOpening(cz, 0.25);
    let x = Math.max(canExitSouthWestToCoast ? -974.0 : WEST_RES_SOUTH_MIN_X, cx);
    if (inSouthCenter) {
      // Allow seamless crossing past X = 105.0 at BOTH Vinhomes Ocean Park crossroads (North 134.3..161.7 & South 330.3..357.7)!
      const onOceanNorthMouth = cz >= 134.3 && cz <= 161.7;
      const onOceanSouthMouth = cz >= 330.3 && cz <= 357.7;
      if (!onOceanNorthMouth && !onOceanSouthMouth) {
        x = Math.min(SOUTH_OCEAN_RING_CONN_MAX_X - 0.25, x);
      }
    }
    let z = Math.min(SOUTH_HOSP_MAX_Z - 0.6, cz);

    // 7 North-South Connector Roads (zero dead ends across the entire Southern Mega-District!)
    // (a) West-South Connector (-434..-425.8, Z=37.2..156.2) — open East straight into West School District Plaza & Skatepark!
    if (x >= WEST_SOUTH_CONNECTOR_MIN_X && x <= -425.8 && z <= WEST_SOUTH_CONNECTOR_MAX_Z + 0.2) {
      const inJunction = z <= 52.0 || (z >= 93.8 && z <= 102.2) || (z >= 147.8 && z <= 156.2);
      if (!inJunction) {
        x = Math.max(WEST_SOUTH_CONNECTOR_MIN_X + 0.25, x);
      }
      return { x, z, handled: true };
    }
    // (b) Far-West Ring Connector (-960..-952, Z=193.8..352.4) — open West at Nam 3/4/5/6 straight onto Đường Ven Biển!
    if (x >= SOUTH_FAR_WEST_CONN_MIN_X && x <= SOUTH_FAR_WEST_CONN_MAX_X && z >= 193.8 && z <= SOUTH_HOSP_ROAD_MAX_Z + 0.4) {
      return { x: canExitSouthWestToCoast ? x : Math.max(SOUTH_FAR_WEST_CONN_MIN_X + 0.25, x), z, handled: true };
    }
    // (c) Southwest Mid Connector (-619..-611, Z=193.8..352.4)
    if (x >= SOUTH_SW_MID_CONN_MIN_X && x <= SOUTH_SW_MID_CONN_MAX_X && z >= 193.8 && z <= SOUTH_HOSP_ROAD_MAX_Z + 0.4) {
      return { x, z, handled: true };
    }
    // (d) South Hospital West Ring Connector (-305..-297, Z=147.8..352.4)
    if (x >= SOUTH_HOSP_WEST_CONN_MIN_X && x <= SOUTH_HOSP_WEST_CONN_MAX_X && z >= 147.8 && z <= SOUTH_HOSP_ROAD_MAX_Z + 0.4) {
      return { x, z, handled: true };
    }
    // (e) South Hospital East Ring Connector (-108..-100, Z=103.8..352.4)
    if (x >= SOUTH_HOSP_EAST_CONN_MIN_X && x <= SOUTH_HOSP_EAST_CONN_MAX_X && z >= 103.8 && z <= SOUTH_HOSP_ROAD_MAX_Z + 0.4) {
      return { x, z, handled: true };
    }
    // (f) South-Central Mid Connector (-6..+2, Z=103.8..352.4)
    if (x >= SOUTH_CENTER_MID_CONN_MIN_X && x <= SOUTH_CENTER_MID_CONN_MAX_X && z >= 103.8 && z <= SOUTH_HOSP_ROAD_MAX_Z + 0.4) {
      return { x, z, handled: true };
    }
    // (g) Ocean Park West Ring Boulevard (+92..+100, Z=103.8..352.4) + Vinhomes Crossroads Aprons (+92..+105.3)
    if (x >= SOUTH_OCEAN_RING_CONN_MIN_X && z >= 103.8 && z <= SOUTH_HOSP_ROAD_MAX_Z + 5.7) {
      return { x, z, handled: true };
    }

    // Inside ANY Southern 6m Alley corridor (S1..S6, SH1..SH6, SC2..SC6): NEVER clamp Z across mouths!
    const alley = findWestAlleyAt(x, z, 0.0);
    if (alley && alley.row.startsWith('S')) {
      const inHouseBodyZ =
        (alley.row === 'S1' && z >= 51.8 && z <= 76.2) ||
        (alley.row === 'S2' && z >= 108.2 && z <= 134.0) ||
        (alley.row === 'SH1' && z >= 88.4 && z <= 100.7) ||
        (alley.row === 'SH2' && ((inSouthHospWest && z >= 135.3 && z <= 144.8) || (inSouthHospEast && z >= 117.3 && z <= 142.7))) ||
        (alley.row === 'SC2' && z >= 116.3 && z <= 139.2) ||
        ((alley.row === 'S3' || alley.row === 'SH3' || alley.row === 'SC3') && z >= 161.8 && z <= 188.2) ||
        ((alley.row === 'S4' || alley.row === 'SH4' || alley.row === 'SC4') && z >= 207.8 && z <= 234.2) ||
        ((alley.row === 'S5' || alley.row === 'SH5' || alley.row === 'SC5') && z >= 253.8 && z <= 282.2) ||
        ((alley.row === 'S6' || alley.row === 'SH6' || alley.row === 'SC6') && z >= 303.8 && z <= 330.2);
      if (inHouseBodyZ) {
        x = Math.max(alley.minX + 0.3, Math.min(alley.maxX - 0.3, x));
      }
      return { x, z, handled: true };
    }

    // Open East-West Inner Roads, Front/Rear Yards & Far-South Park
    if (inSwTop && z <= 52.0) {
      return { x, z: Math.min(51.8, z), handled: true };
    }
    if (inSwTop && z >= 76.2 && z <= 108.2) {
      return { x, z, handled: true };
    }
    // Chợ Nam Tây (Chợ Dân Sinh Khu Nam, X=-586.8..-526.4, Z=102..134): open front plaza + wide 6.8m/4.6m market aisles!
    if (inSwTop && x >= -586.8 && x <= -526.4 && z >= 102.0 && z <= 134.2) {
      return { x, z, handled: true };
    }
    if ((inSouthHospEast || inSouthCenter) && z >= 100.5 && z <= (inSouthCenter ? 116.5 : 117.5)) {
      return { x, z, handled: true };
    }
    if (z >= (inSouthCenter ? 139.0 : inSouthHospWest ? 144.6 : inSouthHospEast ? 142.5 : 134.0) && z <= 162.2) {
      return { x, z, handled: true };
    }
    if (z >= 188.0 && z <= 208.2) {
      return { x, z, handled: true };
    }
    if (z >= 234.0 && z <= 254.2) {
      return { x, z, handled: true };
    }
    if (z >= 282.0 && z <= 304.2) {
      return { x, z, handled: true };
    }
    if (z >= 330.0) {
      return { x, z: Math.min(SOUTH_HOSP_MAX_Z - 0.6, z), handled: true };
    }

    // Clamp cleanly outside solid house bodies
    if (inSwTop && z > 52.0 && z < 76.2) {
      z = z < 64.0 ? 51.8 : 76.4;
    } else if (inSwTop && z > 108.2 && z < 134.0) {
      z = z < 121.0 ? 108.0 : 134.2;
    } else if (inSouthHospEast && z < 100.5) {
      z = 100.7;
    } else if (inSouthHospWest && z < 144.6) {
      z = 144.8;
    } else if (inSouthHospEast && z > 117.5 && z < 142.5) {
      z = z < 130.0 ? 117.3 : 142.7;
    } else if (inSouthCenter && z > 116.5 && z < 139.0) {
      z = z < 127.75 ? 116.3 : 139.2;
    } else if (z > 162.2 && z < 188.0) {
      z = z < 175.0 ? 162.0 : 188.2;
    } else if (z > 208.2 && z < 234.0) {
      z = z < 221.0 ? 208.0 : 234.2;
    } else if (z > 254.2 && z < 282.0) {
      z = z < 268.0 ? 254.0 : 282.2;
    } else if (z > 304.2 && z < 330.0) {
      z = z < 317.0 ? 304.0 : 330.2;
    }
    return { x, z, handled: true };
  }

  return { x: cx, z: cz, handled: false };
}

/**
 * Generates clean CityRoadSegment[] entries for all inner streets + N-S connectors + all Vietnamese alleys
 * so the Minimap & Full Map divide every alley lane clearly!
 */
export function buildWestResidentialRoadSegments(): CityRoadSegment[] {
  const innerRoads: CityRoadSegment[] = WEST_INNER_ROADS.map((r) => ({
    id: r.id,
    name: r.name,
    x1: r.x1 <= -960.0 ? -973.2 : r.x1,
    z1: r.cz,
    x2: r.x2,
    z2: r.cz,
    width: r.width,
    kind: 'crossroad',
  }));
  const connectorRoads: CityRoadSegment[] = [
    {
      id: 'west_res_south_connector',
      name: 'Đường Kết Nối Nam Tây · Cổng Trường',
      x1: WEST_SOUTH_CONNECTOR_CX,
      z1: 29.0,
      x2: WEST_SOUTH_CONNECTOR_CX,
      z2: 152.0,
      width: 8.0,
      kind: 'crossroad',
    },
    {
      id: 'south_far_west_connector',
      name: 'Đường Vành Đai Cực Tây Nam',
      x1: SOUTH_FAR_WEST_CONN_CX,
      z1: 198.0,
      x2: SOUTH_FAR_WEST_CONN_CX,
      z2: 344.0,
      width: 8.0,
      kind: 'crossroad',
    },
    {
      id: 'south_sw_mid_connector',
      name: 'Đường Trục Giữa Tây Nam',
      x1: SOUTH_SW_MID_CONN_CX,
      z1: 198.0,
      x2: SOUTH_SW_MID_CONN_CX,
      z2: 344.0,
      width: 8.0,
      kind: 'crossroad',
    },
    {
      id: 'south_hosp_west_connector',
      name: 'Đường Kết Nối Tây Nam Bệnh Viện',
      x1: SOUTH_HOSP_WEST_CONN_CX,
      z1: 152.0,
      x2: SOUTH_HOSP_WEST_CONN_CX,
      z2: 344.0,
      width: 8.0,
      kind: 'crossroad',
    },
    {
      id: 'south_hosp_east_connector',
      name: 'Đường Kết Nối Đông Nam Bệnh Viện',
      x1: SOUTH_HOSP_EAST_CONN_CX,
      z1: 108.0,
      x2: SOUTH_HOSP_EAST_CONN_CX,
      z2: 344.0,
      width: 8.0,
      kind: 'crossroad',
    },
    {
      id: 'south_center_mid_connector',
      name: 'Đường Trục Nam Trung Tâm',
      x1: SOUTH_CENTER_MID_CONN_CX,
      z1: 108.0,
      x2: SOUTH_CENTER_MID_CONN_CX,
      z2: 344.0,
      width: 8.0,
      kind: 'crossroad',
    },
    {
      id: 'south_ocean_ring_connector',
      name: 'Đường Vành Đai Tây Ocean Park',
      x1: SOUTH_OCEAN_RING_CONN_CX,
      z1: 108.0,
      x2: SOUTH_OCEAN_RING_CONN_CX,
      z2: 344.0,
      width: 8.0,
      kind: 'crossroad',
    },
  ];
  const alleyRoads: CityRoadSegment[] = WEST_ALLEYS.map((a) => ({
    id: `road_${a.id}`,
    name: a.label,
    x1: a.cx,
    z1: a.row === 'N4' ? -145.2 : a.minZ,
    x2: a.cx,
    z2: a.maxZ,
    width: Number((a.maxX - a.minX).toFixed(2)),
    kind: 'alley',
  }));
  return [...innerRoads, ...connectorRoads, ...alleyRoads];
}

export type WestSouthInfillKind =
  | 's1_townhouses'
  | 's1_sports_park'
  | 's1_night_market'
  | 's2_kiosk_row'
  | 's2_linear_park'
  | 's3_border_park';

export interface WestSouthInfillZoneDef {
  id: string;
  label: string;
  shortLabel: string;
  band: 'S1_REAR' | 'S2_REAR' | 'S3_REAR';
  kind: WestSouthInfillKind;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  count: number;
}

const S1_INFILL_KINDS: WestSouthInfillKind[] = [
  's1_townhouses',   // Bay 0 (-482.6..-426.0)
  's1_sports_park',  // Bay 1 (-544.4..-488.6)
  's1_night_market', // Bay 2 (-606.6..-550.4)
  's1_townhouses',   // Bay 3 (-668.6..-612.6)
  's1_sports_park',  // Bay 4 (-730.0..-674.6)
  's1_townhouses',   // Bay 5 (-792.0..-736.0)
  's1_night_market', // Bay 6 (-854.0..-798.0)
  's1_townhouses',   // Bay 7 (-916.0..-860.0)
  's1_sports_park',  // Bay 8 (-960.0..-922.0)
];

const S2_INFILL_KINDS: WestSouthInfillKind[] = [
  's2_kiosk_row',   // Bay 0
  's2_linear_park', // Bay 1
  's2_kiosk_row',   // Bay 2
  's2_linear_park', // Bay 3
  's2_kiosk_row',   // Bay 4
  's2_linear_park', // Bay 5
  's2_kiosk_row',   // Bay 6
  's2_linear_park', // Bay 7
  's2_kiosk_row',   // Bay 8
];

export const WEST_SOUTH_INFILL_ZONES: WestSouthInfillZoneDef[] = [
  ...WEST_RES_S1_SEGMENTS.map((seg, idx): WestSouthInfillZoneDef => {
    const kind = S1_INFILL_KINDS[idx % S1_INFILL_KINDS.length];
    return {
      id: `wrs_s1_infill_${idx + 1}`,
      label:
        kind === 's1_townhouses'
          ? `Dãy Phố Mặt Tiền Nam 1 (${seg.shortLabel})`
          : kind === 's1_night_market'
            ? `Chợ Đêm & Ẩm Thực Nam Tây (${seg.shortLabel})`
            : `Công Viên & Sân Thể Thao Tổ 6 (${seg.shortLabel})`,
      shortLabel:
        kind === 's1_townhouses' ? 'PHỐ NAM 1' : kind === 's1_night_market' ? 'CHỢ ĐÊM' : 'CV TỔ 6',
      band: 'S1_REAR',
      kind,
      minX: seg.minX,
      maxX: seg.maxX,
      minZ: kind === 's1_townhouses' ? 77.5 : 76.8,
      maxZ: kind === 's1_townhouses' ? 88.9 : 93.0,
      count: Math.max(3, Math.round((seg.maxX - seg.minX) / 11.2)),
    };
  }),
  ...WEST_RES_S2_SEGMENTS.map((seg, idx): WestSouthInfillZoneDef => {
    const kind = S2_INFILL_KINDS[idx % S2_INFILL_KINDS.length];
    return {
      id: `wrs_s2_infill_${idx + 1}`,
      label:
        kind === 's2_kiosk_row'
          ? `Dãy Nhà Phố & Ki-ốt Nam 2 (${seg.shortLabel})`
          : `Vườn Hoa & Khu Tập Thể Dục Tổ 6 (${seg.shortLabel})`,
      shortLabel: kind === 's2_kiosk_row' ? 'KI-ỐT NAM 2' : 'VƯỜN HOA',
      band: 'S2_REAR',
      kind,
      minX: seg.minX,
      maxX: seg.maxX,
      minZ: kind === 's2_kiosk_row' ? 135.2 : 134.8,
      maxZ: kind === 's2_kiosk_row' ? 144.4 : 146.8,
      count: Math.max(3, Math.round((seg.maxX - seg.minX) / 11.0)),
    };
  }),
  // Note: S3 rear park band (Z=194..202) was converted into continuous Đường Nội Khu Nam 3 Liên Khu;
  // the continuous Far-South Green Park now spans Z=352.4..362.0 from X=-960 to X=+105!
];

export function buildWestSouthInfillAreas(): CityAreaRect[] {
  return WEST_SOUTH_INFILL_ZONES.filter(
    (z) => z.kind === 's1_sports_park' || z.kind === 's1_night_market' || z.kind === 's2_linear_park' || z.kind === 's3_border_park'
  ).map((z) => ({
    id: `area_${z.id}`,
    name: z.label,
    minX: z.minX,
    maxX: z.maxX,
    minZ: z.minZ,
    maxZ: z.maxZ,
    kind: z.kind === 's1_night_market' ? 'plaza' : 'park',
  }));
}

/**
 * Generates split CityBuildingFootprint[] blocks (never covering over alleys or inner roads!),
 * so the Map & WeatherSystem see every single 5.6m–6.0m alley gap and courtyard open-air.
 */
export function buildWestResidentialBuildingFootprints(): CityBuildingFootprint[] {
  const baseBlocks: CityBuildingFootprint[] = ALL_WEST_ROW_SEGMENTS.map((seg) => {
    const isMarket = seg.id === 'wr_n2_b3' || seg.id === 'wr_s2_b3';
    return {
      id: seg.id,
      label: seg.label,
      shortLabel: seg.shortLabel,
      minX: seg.minX,
      maxX: seg.maxX,
      minZ: seg.bodyMinZ,
      maxZ: seg.bodyMaxZ,
      category: isMarket ? 'commerce' : 'residence',
      floors: isMarket ? 1 : 4,
    };
  });

  const southInfillBlocks: CityBuildingFootprint[] = WEST_SOUTH_INFILL_ZONES.filter(
    (z) => z.kind === 's1_townhouses' || z.kind === 's2_kiosk_row' || z.kind === 's1_night_market'
  ).map((z) => ({
    id: z.id,
    label: z.label,
    shortLabel: z.shortLabel,
    minX: z.minX,
    maxX: z.maxX,
    minZ: z.minZ,
    maxZ: z.kind === 's1_night_market' ? 82.8 : z.maxZ,
    category: z.kind === 's1_night_market' ? 'food' : 'residence',
    floors: z.kind === 's1_night_market' ? 1 : 3,
  }));

  return [...baseBlocks, ...southInfillBlocks];
}

/**
 * Generates POIs for all 22 walkable hàng quán + key alleys + community parks.
 */
export function buildWestResidentialPois(): CityPoi[] {
  const shopPois: CityPoi[] = WEST_WALKABLE_SHOPS.map((s) => ({
    id: `poi_${s.id}`,
    name: s.name,
    subtitle: s.subtitle,
    x: s.doorX,
    z: s.doorZ,
    category: s.poiCategory,
    filterGroup: s.poiFilterGroup,
    badge: s.badge,
    openHours: s.openHours,
  }));

  const areaPois: CityPoi[] = [
    {
      id: 'poi_market_north',
      name: 'Chợ Bắc Tây • Chợ Dân Sinh Khu Bắc',
      subtitle: 'Chợ truyền thống khu Bắc (Đ. Nội Khu Bắc 1 • Hẻm 485–545 • 16 quầy rau củ, hải sản, hoa tươi)',
      x: -545.0,
      z: -28.0,
      category: 'commerce',
      filterGroup: 'food_nightlife',
      badge: 'CHỢ',
      openHours: '07:00 - 18:00',
    },
    {
      id: 'poi_market_south',
      name: 'Chợ Nam Tây • Chợ Dân Sinh Khu Nam',
      subtitle: 'Chợ truyền thống khu Nam (Đ. Nội Khu Nam 1 • Hẻm 490–550 • 16 quầy trái cây, hải sản, bún mắm)',
      x: -556.6,
      z: 104.0,
      category: 'commerce',
      filterGroup: 'food_nightlife',
      badge: 'CHỢ',
      openHours: '07:00 - 18:00',
    },
    {
      id: 'poi_west_residential',
      name: 'Phố Cư Dân Tây • Hẻm 425–905',
      subtitle: 'Hơn 260 nhà phố & 56 con hẻm dân sinh Bắc – Nam Đại Lộ',
      x: -393.6,
      z: 14.0,
      category: 'residence',
      filterGroup: 'home_civic',
      badge: '🏘️',
    },
    {
      id: 'poi_west_residential_rear',
      name: 'Nhà Văn Hóa Tổ 4 & Khu Phố Sau Cyber',
      subtitle: 'Khu dân cư sau lưng Cyber Stadium thông ra Đại Lộ Bệnh Viện',
      x: -371.0,
      z: -28.0,
      category: 'civic',
      filterGroup: 'home_civic',
      badge: '🏛️',
    },
    {
      id: 'poi_west_badminton_t5',
      name: 'Sân Cầu Lông & Công Viên Tổ 5',
      subtitle: 'Sân thể thao cộng đồng Tổ Dân Phố 5 (Đường Nội Khu Bắc 2)',
      x: -376.0,
      z: -78.0,
      category: 'landmark',
      filterGroup: 'landmark_park',
      badge: '🏸',
    },
    {
      id: 'poi_west_north3_park',
      name: 'Công Viên Bắc Tổ 7 · Đường Bắc 3',
      subtitle: 'Khu dân cư Bắc 3 mở rộng về Tây Bắc (-960..-242)',
      x: -378.0,
      z: -114.0,
      category: 'landmark',
      filterGroup: 'landmark_park',
      badge: '🌳',
    },
    {
      id: 'poi_west_residential_south',
      name: 'Khu Dân Cư Nam Tây • Hẻm 426–850',
      subtitle: 'Khu nhà phố & hàng quán bên kia đường đối diện Phố Cư Dân',
      x: -485.6,
      z: 44.0,
      category: 'residence',
      filterGroup: 'home_civic',
      badge: '🏡',
    },
    {
      id: 'poi_west_south_inner',
      name: 'Đường Nội Khu Nam & Vườn Hoa Tổ 6–8',
      subtitle: '2 tuyến nội khu Nam kết nối 23 hẻm phía Nam & sau Trường PCT',
      x: -609.6,
      z: 98.0,
      category: 'landmark',
      filterGroup: 'landmark_park',
      badge: '🌺',
    },
    {
      id: 'poi_south_hospital_residential',
      name: 'Khu Dân Cư Nam Bệnh Viện • Hẻm 210–272',
      subtitle: 'Khu nhà phố, 17 con hẻm & 6 tuyến nội khu thông ra Đại Lộ Bệnh Viện Nam',
      x: -227.5,
      z: 198.0,
      category: 'residence',
      filterGroup: 'home_civic',
      badge: '🏘️',
    },
    {
      id: 'poi_south_central_ocean_link',
      name: 'Khu Dân Cư Nam Trung Tâm • Cửa Ngõ Ocean Park',
      subtitle: '80 nhà phố, 10 hẻm & 2 đại lộ kết nối trực tiếp sang Vinhomes Ocean Park',
      x: -2.0,
      z: 198.0,
      category: 'residence',
      filterGroup: 'home_civic',
      badge: '🏙️',
    },
    {
      id: 'poi_southwest_mega_quarter',
      name: 'Khu Đô Thị Dân Cư Tây Nam Mở Rộng',
      subtitle: 'Hơn 140 nhà phố mới dọc Nam 3 – Nam 4 – Nam 5 – Đại Lộ Nam 6',
      x: -615.0,
      z: 244.0,
      category: 'residence',
      filterGroup: 'home_civic',
      badge: '🏡',
    },
    {
      id: 'poi_south_hospital_park',
      name: 'Công Viên Đại Lộ Nam Liên Khu',
      subtitle: 'Công viên cây xanh hơn 1km dọc Đại Lộ Kết Nối Nam Ocean Park (Nam 6)',
      x: -227.5,
      z: 356.0,
      category: 'landmark',
      filterGroup: 'landmark_park',
      badge: '🌳',
    },
  ];

  return [...areaPois, ...shopPois];
}
