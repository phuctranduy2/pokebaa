import type { CityAreaRect, CityBuildingFootprint, CityPoi, CityRoadSegment } from './cityMapData';

// ============================================================================
// WEST COASTAL T-JUNCTION & MY KHE WEST BEACHFRONT COORDINATE CONSTANTS & MAP DATA
// Pure layout/map data module (zero Three.js / GLB runtime imports) so cityMapData.ts
// can import coastal roads, areas, buildings, and POIs without circular dependencies.
// ============================================================================
export const WEST_COAST_EAST_EDGE_X = -960.0;
export const WEST_COAST_ROAD_MAX_X = -965.0;
export const WEST_COAST_ROAD_MIN_X = -981.4;
export const WEST_COAST_ROAD_CX = -973.2;
export const WEST_COAST_PROMENADE_MIN_X = -996.0;
export const WEST_COAST_SAND_MIN_X = -1066.0;
export const WEST_COAST_SHORELINE_X = -1034.0;
export const WEST_COAST_WATER_Y = -0.82;
export const WEST_COAST_PLAYER_MIN_X = -1046.0; // Waist-deep wading limit inside safety buoys
export const WEST_COAST_BIKE_MIN_X = -995.2; // Bikes can ride full boulevard & park on promenade bays, not on sand
export const WEST_COAST_ROAD_MIN_Z = -165.0;
export const WEST_COAST_ROAD_MAX_Z = 365.0;
export const WEST_COAST_T_JUNCTION_Z = 29.0;

export function buildWestCoastalRoadSegments(): CityRoadSegment[] {
  return [
    {
      id: 'west_coastal_boulevard',
      name: 'Đường Ven Biển Võ Nguyên Giáp',
      x1: WEST_COAST_ROAD_CX,
      z1: WEST_COAST_ROAD_MIN_Z,
      x2: WEST_COAST_ROAD_CX,
      z2: WEST_COAST_ROAD_MAX_Z,
      width: 16.4,
      kind: 'boulevard',
    },
    {
      id: 'west_coastal_south_tie',
      name: 'Nhánh Nối Đại Lộ Nam 6 – Biển Tây',
      x1: WEST_COAST_ROAD_CX,
      z1: 344.0,
      x2: -956.0,
      z2: 344.0,
      width: 16.0,
      kind: 'boulevard',
    },
    {
      id: 'bach_dang_west_coastal_link',
      name: 'Đường Ven Sông Bạch Đằng Tây',
      x1: WEST_COAST_ROAD_CX,
      z1: -145.2,
      x2: -227.5,
      z2: -145.2,
      width: 16.4,
      kind: 'boulevard',
    },
    {
      id: 'bach_dang_west_north_tie',
      name: 'Nhánh Nối Bạch Đằng – Ven Biển Tây',
      x1: -227.5,
      z1: -145.2,
      x2: -227.5,
      z2: -117.5,
      width: 16.8,
      kind: 'boulevard',
    },
  ];
}

export const WEST_COASTAL_MAP_AREAS: CityAreaRect[] = [
  {
    id: 'west_ocean_sea',
    name: 'Biển Mỹ Khê Tây',
    minX: -1160.0,
    maxX: -1032.0,
    minZ: -380.0,
    maxZ: 420.0,
    kind: 'water',
  },
  {
    id: 'west_golden_beach_sand',
    name: 'Bãi Cát Vàng Mỹ Khê Tây',
    minX: -1034.0,
    maxX: -996.0,
    minZ: -165.0,
    maxZ: 375.0,
    kind: 'plaza',
  },
  {
    id: 'west_coastal_promenade',
    name: 'Phố Đi Bộ Ven Biển & Công Viên Dừa',
    minX: -996.0,
    maxX: -981.4,
    minZ: -165.0,
    maxZ: 365.0,
    kind: 'park',
  },
  {
    id: 'bach_dang_west_promenade',
    name: 'Bờ Kè Ven Sông Bạch Đằng Tây',
    minX: -960.0,
    maxX: -214.0,
    minZ: -165.0,
    maxZ: -153.4,
    kind: 'park',
  },
];

export const WEST_COASTAL_BUILDINGS: CityBuildingFootprint[] = [
  {
    id: 'west_beach_shower_hub',
    label: 'Trạm Tắm Nước Ngọt & Thay Đồ Ven Biển',
    shortLabel: 'TẮM NƯỚC',
    minX: -994.8,
    maxX: -987.2,
    minZ: -7.8,
    maxZ: 7.8,
    category: 'civic',
    floors: 1,
  },
  {
    id: 'west_coconut_beach_bar',
    label: 'THE DAWN Beach Bar • Cocktail & Dừa Tươi',
    shortLabel: 'THE DAWN',
    minX: -994.2,
    maxX: -987.0,
    minZ: 54.0,
    maxZ: 72.0,
    category: 'food',
    floors: 1,
  },
  {
    id: 'west_jetski_rental',
    label: 'Trạm Thuê Mô Tô Nước & Chèo Kayak',
    shortLabel: 'CANO',
    minX: -994.5,
    maxX: -987.5,
    minZ: 93.0,
    maxZ: 108.0,
    category: 'landmark',
    floors: 1,
  },
];

export const WEST_COASTAL_POIS: CityPoi[] = [
  {
    id: 'poi_west_coastal_tjunction',
    name: 'Ngã 3 Ven Biển • Mỹ Khê Tây',
    subtitle: 'Ngã 3 Đại Lộ Trung Tâm × Đường Ven Biển Võ Nguyên Giáp — Cổng Chào Bãi Biển',
    x: -986.0,
    z: 29.0,
    category: 'landmark',
    filterGroup: 'landmark_park',
    badge: '🏖️',
    openHours: '24/7',
  },
  {
    id: 'poi_west_coconut_bar',
    name: 'THE DAWN Beach Bar',
    subtitle: 'Quầy Bar Mái Ngói Ven Biển • Bàn LED Phát Sáng • Cocktail & Dừa Tươi',
    x: -984.0,
    z: 63.0,
    category: 'food',
    filterGroup: 'food_nightlife',
    badge: '🍹',
    openHours: '06:00 – 23:00',
  },
  {
    id: 'poi_west_beach_volleyball',
    name: 'Sân Bóng Chuyền Bãi Biển & Bãi Tắm',
    subtitle: 'Bãi Tắm An Toàn Có Chòi Cứu Hộ, Phao Bơi, Tắm Nước Ngọt & Bóng Chuyền',
    x: -1016.0,
    z: -42.0,
    category: 'landmark',
    filterGroup: 'landmark_park',
    badge: '🏐',
    openHours: '05:00 – 22:00',
  },
  {
    id: 'poi_west_jetski_rental',
    name: 'Trạm Mô Tô Nước, Kayak & Xích Đu Biển',
    subtitle: 'Thuê Ván Lướt Sóng, Kayak, Mô Tô Nước & Góc Check-in Hoàng Hôn',
    x: -986.0,
    z: 100.0,
    category: 'landmark',
    filterGroup: 'landmark_park',
    badge: '🏄',
    openHours: '07:00 – 19:00',
  },
  {
    id: 'poi_han_river_estuary',
    name: 'Cửa Sông Hàn • Đường Ven Sông Tây',
    subtitle: 'Tuyến Ven Sông Nối Đường Ven Biển Võ Nguyên Giáp ↔ Đường Bạch Đằng & Cửa Biển Sông Hàn',
    x: -973.2,
    z: -154.0,
    category: 'landmark',
    filterGroup: 'landmark_park',
    badge: '🌊',
    openHours: '24/7',
  },
];
