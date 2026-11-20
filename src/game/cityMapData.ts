import {
  WEST_INNER_ROADS,
  WEST_WALKABLE_SHOPS,
  buildWestResidentialBuildingFootprints,
  buildWestResidentialPois,
  buildWestResidentialRoadSegments,
  buildWestSouthInfillAreas,
  findWestAlleyAt,
} from './westResidentialLayout';
import { findResidentialMarketAt } from './ResidentialMarketSystem';
import {
  WEST_COASTAL_BUILDINGS,
  WEST_COASTAL_MAP_AREAS,
  WEST_COASTAL_POIS,
  buildWestCoastalRoadSegments,
} from './westCoastalLayout';

export type BuildingCategory =
  | 'home'
  | 'commerce'
  | 'tech'
  | 'luxury'
  | 'nightlife'
  | 'food'
  | 'civic'
  | 'residence'
  | 'landmark';

export type PoiFilterGroup =
  | 'all'
  | 'home_civic'
  | 'food_nightlife'
  | 'luxury_fashion'
  | 'tech_auto'
  | 'landmark_park';

export interface CityRoadSegment {
  id: string;
  name: string;
  x1: number;
  z1: number;
  x2: number;
  z2: number;
  width: number;
  kind: 'boulevard' | 'avenue' | 'bridge' | 'promenade' | 'crossroad' | 'alley';
}

export interface CityAreaRect {
  id: string;
  name: string;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  kind: 'water' | 'park' | 'plaza' | 'parking';
}

export interface CityBuildingFootprint {
  id: string;
  label: string;
  shortLabel?: string;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  category: BuildingCategory;
  floors?: number;
}

export interface CityPoi {
  id: string;
  name: string;
  subtitle: string;
  x: number;
  z: number;
  category: BuildingCategory;
  filterGroup: PoiFilterGroup;
  badge: string;
  openHours?: string;
}

export interface MinimapSnapshot {
  x: number;
  y: number;
  z: number;
  yaw: number;
  isRidingMotorbike: boolean;
  speedKmh: number;
  currentFloor: number;
  inGameHour: number;
  hasParkedBike: boolean;
  parkedBikeX: number;
  parkedBikeZ: number;
  busX: number | null;
  busZ: number | null;
  buses?: Array<{ id: string; unitLabel: string; x: number; z: number; yaw: number }>;
}

export const CITY_WORLD_BOUNDS = {
  minX: -1140,
  maxX: 575,
  minZ: -475,
  maxZ: 445,
} as const;

/**
 * Exact roadway centerlines & widths matching 3D geometry in ShopScene, West/East/FarEast Intersections,
 * HanRiverSystem, and VinhomesOceanParkSystem.
 */
export const CITY_ROADS: CityRoadSegment[] = [
  // Main East-West Boulevard (Đại Lộ Trung Tâm — connects straight into Ngã 3 Ven Biển at X = -973.2!)
  {
    id: 'main_boulevard',
    name: 'Đại Lộ Trung Tâm',
    x1: -973.2,
    z1: 29.0,
    x2: 562,
    z2: 29.0,
    width: 16.4,
    kind: 'boulevard',
  },
  // Far-West Coastal T-Junction, Đường Ven Biển Võ Nguyên Giáp & Oceanfront Promenade
  ...buildWestCoastalRoadSegments(),
  // All 5 West Residential Inner Streets + 56 Divided Vietnamese Alleys
  ...buildWestResidentialRoadSegments(),
  // West Intersection N-S Avenue (Đường Bệnh Viện - Công An -> Khu Dân Cư Nam Bệnh Viện)
  {
    id: 'west_avenue',
    name: 'Đại Lộ Bệnh Viện',
    x1: -227.5,
    z1: -117.5,
    x2: -227.5,
    z2: 352.4,
    width: 16.4,
    kind: 'avenue',
  },
  // East Intersection N-S Corridor: North Bank -> Cầu Sông Hàn -> Phố Đi Bộ -> Ngã Tư Phố Đi Bộ -> Vinhomes Ocean Park
  {
    id: 'east_north_bank_stem',
    name: 'Đường Cầu Sông Hàn (Bờ Bắc)',
    x1: 193.5,
    z1: -458.0,
    x2: 193.5,
    z2: -351.0,
    width: 16.4,
    kind: 'avenue',
  },
  {
    id: 'han_river_bridge',
    name: 'Cầu Sông Hàn',
    x1: 193.5,
    z1: -351.0,
    x2: 193.5,
    z2: -126.0,
    width: 16.2,
    kind: 'bridge',
  },
  {
    id: 'pho_di_bo_avenue',
    name: 'Phố Đi Bộ Sông Hàn',
    x1: 193.5,
    z1: -126.0,
    x2: 193.5,
    z2: 29.0,
    width: 16.4,
    kind: 'promenade',
  },
  {
    id: 'vinhomes_avenue',
    name: 'Đại Lộ Vinhomes Ocean Park',
    x1: 193.5,
    z1: 29.0,
    x2: 193.5,
    z2: 428.0,
    width: 16.4,
    kind: 'avenue',
  },
  // Vinhomes 1, 2 & 3 Connected E-W Crossroads (Z = 148 & Z = 344)
  {
    id: 'vinhomes_crossroad_north',
    name: 'Đường Ngang Ocean Park Bắc',
    x1: 105.0,
    z1: 148.0,
    x2: 564.0,
    z2: 148.0,
    width: 16.4,
    kind: 'crossroad',
  },
  {
    id: 'vinhomes_crossroad_south',
    name: 'Đường Ngang Ocean Park Nam',
    x1: 105.0,
    z1: 344.0,
    x2: 564.0,
    z2: 344.0,
    width: 16.4,
    kind: 'crossroad',
  },
  // Far-East N-S Corridor: North Bank -> Cầu Rồng -> Ngã Tư Sơn Tây -> Vinhomes Ocean Park 2
  {
    id: 'dragon_north_stem',
    name: 'Đường Cầu Rồng (Bờ Bắc)',
    x1: 370.0,
    z1: -458.0,
    x2: 370.0,
    z2: -351.0,
    width: 16.4,
    kind: 'avenue',
  },
  {
    id: 'dragon_bridge',
    name: 'Cầu Rồng Đà Nẵng',
    x1: 370.0,
    z1: -351.0,
    x2: 370.0,
    z2: -126.0,
    width: 16.2,
    kind: 'bridge',
  },
  {
    id: 'son_tay_avenue',
    name: 'Đường Sơn Tây',
    x1: 370.0,
    z1: -126.0,
    x2: 370.0,
    z2: 148.0,
    width: 16.4,
    kind: 'avenue',
  },
  {
    id: 'vinhomes_mid_avenue',
    name: 'Đại Lộ Vinhomes Ocean Park Trung Tâm',
    x1: 282.0,
    z1: 148.0,
    x2: 282.0,
    z2: 428.0,
    width: 16.4,
    kind: 'avenue',
  },
  {
    id: 'vinhomes2_avenue',
    name: 'Đại Lộ Vinhomes Ocean Park 2',
    x1: 370.0,
    z1: 148.0,
    x2: 370.0,
    z2: 428.0,
    width: 16.4,
    kind: 'avenue',
  },
  {
    id: 'vinhomes2b_avenue',
    name: 'Đại Lộ Vinhomes Ocean Park 2 Đông',
    x1: 436.5,
    z1: 148.0,
    x2: 436.5,
    z2: 428.0,
    width: 16.4,
    kind: 'avenue',
  },
  // DIOR Intersection N-S Avenue (Đại Lộ Paris) -> Ngã Tư DIOR Nam -> Vinhomes Ocean Park 3
  {
    id: 'paris_dior_avenue',
    name: 'Đại Lộ Paris (Ngã Tư DIOR)',
    x1: 503.0,
    z1: -126.0,
    x2: 503.0,
    z2: 148.0,
    width: 16.4,
    kind: 'avenue',
  },
  {
    id: 'vinhomes3_avenue',
    name: 'Đại Lộ Vinhomes Ocean Park 3',
    x1: 503.0,
    z1: 148.0,
    x2: 503.0,
    z2: 428.0,
    width: 16.4,
    kind: 'avenue',
  },
  // Trần Thị Lý N-S Corridor: North Bank -> Cầu Trần Thị Lý (adjacent east of Cầu Rồng at X = 503.0)
  {
    id: 'tran_thi_ly_north_stem',
    name: 'Đường Cầu Trần Thị Lý (Bờ Bắc)',
    x1: 503.0,
    z1: -458.0,
    x2: 503.0,
    z2: -351.0,
    width: 16.4,
    kind: 'avenue',
  },
  {
    id: 'tran_thi_ly_bridge',
    name: 'Cầu Trần Thị Lý',
    x1: 503.0,
    z1: -351.0,
    x2: 503.0,
    z2: -126.0,
    width: 21.0,
    kind: 'bridge',
  },
  // Riverfront Boulevard (Đường Bạch Đằng)
  {
    id: 'bach_dang_boulevard',
    name: 'Đường Bạch Đằng',
    x1: -227.5,
    z1: -117.5,
    x2: 538.0,
    z2: -117.5,
    width: 16.8,
    kind: 'boulevard',
  },
  // North Bank Boulevard (Đường Trần Hưng Đạo)
  {
    id: 'tran_hung_dao_boulevard',
    name: 'Đường Trần Hưng Đạo (Bờ Bắc)',
    x1: 76.0,
    z1: -362.0,
    x2: 570.0,
    z2: -362.0,
    width: 16.8,
    kind: 'boulevard',
  },
];

export const CITY_AREAS: CityAreaRect[] = [
  // Biển Mỹ Khê Tây, Bãi Cát Vàng & Phố Đi Bộ Ven Biển (Ngã 3 Ven Biển)
  ...WEST_COASTAL_MAP_AREAS,
  // Sông Hàn (East Main River + West Estuary flowing continuously into Biển Mỹ Khê Tây)
  {
    id: 'han_river_water',
    name: 'Sông Hàn',
    minX: -214,
    maxX: 575,
    minZ: -349,
    maxZ: -134.5,
    kind: 'water',
  },
  {
    id: 'han_river_estuary_water',
    name: 'Cửa Biển Sông Hàn',
    minX: -1036,
    maxX: -214,
    minZ: -349,
    maxZ: -165.0,
    kind: 'water',
  },
  {
    id: 'west_north3_park_area',
    name: 'Công Viên Bắc Tổ 7',
    minX: -396.0,
    maxX: -362.0,
    minZ: -134.0,
    maxZ: -102.0,
    kind: 'park',
  },
  ...buildWestSouthInfillAreas(),
  {
    id: 'south_hosp_green_park',
    name: 'Công Viên Đại Lộ Nam Liên Khu',
    minX: -960.0,
    maxX: 100.0,
    minZ: 352.4,
    maxZ: 362.0,
    kind: 'park',
  },
  {
    id: 'youth_basketball_park',
    name: 'Sân Bóng Rổ 3x3 & Công Viên Thanh Niên',
    minX: -425.0,
    maxX: -363.0,
    minZ: 94.0,
    maxZ: 148.0,
    kind: 'park',
  },
  // Cầu Tàu Cá Chép Hóa Rồng
  {
    id: 'viewing_pier',
    name: 'Cầu Tàu Bạch Đằng',
    minX: 140,
    maxX: 152,
    minZ: -142.2,
    maxZ: -134.4,
    kind: 'plaza',
  },
  // Waterfront Promenade
  {
    id: 'bach_dang_promenade',
    name: 'Bờ Kè Bạch Đằng',
    minX: -214,
    maxX: 538,
    minZ: -134.5,
    maxZ: -125.9,
    kind: 'plaza',
  },
  {
    id: 'tran_hung_dao_promenade',
    name: 'Bờ Kè Trần Hưng Đạo',
    minX: 74,
    maxX: 571,
    minZ: -353.6,
    maxZ: -345.0,
    kind: 'plaza',
  },
  // 4 Green Parks
  {
    id: 'east_green_park',
    name: 'Công Viên Trung Tâm',
    minX: 17.5,
    maxX: 55.5,
    minZ: 42.5,
    maxZ: 84.5,
    kind: 'park',
  },
  {
    id: 'west_green_park',
    name: 'Công Viên Tây',
    minX: -171.5,
    maxX: -133.5,
    minZ: -26.4,
    maxZ: 15.6,
    kind: 'park',
  },
  {
    id: 'park_connector_walkway',
    name: 'Lối Đi Bộ Liên Công Viên',
    minX: -156.2,
    maxX: -148.8,
    minZ: -30.0,
    maxZ: -26.4,
    kind: 'plaza',
  },
  {
    id: 'phodibo_north_park',
    name: 'Công Viên Sông Hàn Bắc',
    minX: 207.0,
    maxX: 235.5,
    minZ: -104.5,
    maxZ: -71.5,
    kind: 'park',
  },
  {
    id: 'vinhomes_park_corner',
    name: 'Công Viên Hotel Xanh',
    minX: 207.0,
    maxX: 235.5,
    minZ: 96.5,
    maxZ: 132.5,
    kind: 'park',
  },
  {
    id: 'son_tay_green_park',
    name: 'Công Viên Sơn Tây Nam',
    minX: 314.5,
    maxX: 356.5,
    minZ: 96.8,
    maxZ: 133.2,
    kind: 'park',
  },
  {
    id: 'bach_dang_grand_park',
    name: 'Công Viên Trung Tâm Bạch Đằng',
    minX: -212.0,
    maxX: -88.0,
    minZ: -104.0,
    maxZ: -30.0,
    kind: 'park',
  },
  // AEON Smart Parking Lot
  {
    id: 'aeon_parking',
    name: 'Bãi Đỗ Xe AEON Mall',
    minX: 144.3,
    maxX: 180.0,
    minZ: 91.7,
    maxZ: 126.0,
    kind: 'parking',
  },
  // Peri Pool Outdoor Water
  {
    id: 'peri_pool_plaza',
    name: 'Hồ Bơi Peri Pool',
    minX: 243.5,
    maxX: 263.5,
    minZ: 45.0,
    maxZ: 68.5,
    kind: 'plaza',
  },
];

export const CITY_BUILDINGS: CityBuildingFootprint[] = [
  // === HOME SHOP & CENTER STRIP (NORTH SIDE, Z <= 16) ===
  {
    id: 'card_shop',
    label: 'Pokémon Card Shop',
    shortLabel: 'CARD SHOP',
    minX: -12.5,
    maxX: 12.5,
    minZ: -11.8,
    maxZ: 15.6,
    category: 'home',
    floors: 2,
  },
  {
    id: 'grading_lab',
    label: 'PSA · CGC · BGS Lab & Auction',
    shortLabel: 'GRADING & VIP',
    minX: 13.0,
    maxX: 29.0,
    minZ: -28.0,
    maxZ: 15.6,
    category: 'commerce',
  },
  {
    id: 'steakhouse',
    label: 'New York Steakhouse',
    shortLabel: 'STEAKHOUSE',
    minX: 31.0,
    maxX: 50.0,
    minZ: -18.0,
    maxZ: 15.6,
    category: 'food',
  },
  {
    id: 'porsche',
    label: 'Porsche Center',
    shortLabel: 'PORSCHE',
    minX: 52.0,
    maxX: 84.0,
    minZ: -30.0,
    maxZ: 15.6,
    category: 'luxury',
  },
  {
    id: 'ron_pickleball',
    label: 'Ron Pickleball Arena',
    shortLabel: 'PICKLEBALL',
    minX: 85.5,
    maxX: 143.5,
    minZ: -26.0,
    maxZ: 15.6,
    category: 'landmark',
  },
  {
    id: 'starbucks',
    label: 'Starbucks Coffee',
    shortLabel: 'STARBUCKS',
    minX: -29.0,
    maxX: -13.0,
    minZ: 2.0,
    maxZ: 15.6,
    category: 'food',
  },
  {
    id: 'seven_eleven',
    label: '7-Eleven 24H',
    shortLabel: '7-ELEVEN',
    minX: -50.0,
    maxX: -31.0,
    minZ: 2.0,
    maxZ: 15.6,
    category: 'commerce',
  },
  {
    id: 'grand_res_east',
    label: 'Grand Residences East',
    shortLabel: 'RESIDENCES E',
    minX: -84.0,
    maxX: -52.0,
    minZ: -6.0,
    maxZ: 15.6,
    category: 'residence',
    floors: 12,
  },
  {
    id: 'grand_res_west',
    label: 'Grand Residences West',
    shortLabel: 'RESIDENCES W',
    minX: -131.5,
    maxX: -99.5,
    minZ: -6.0,
    maxZ: 15.6,
    category: 'residence',
    floors: 12,
  },
  {
    id: 'police_station',
    label: 'Đồn Công An Thành Phố',
    shortLabel: 'CÔNG AN',
    minX: -211.5,
    maxX: -173.5,
    minZ: -26.4,
    maxZ: 15.6,
    category: 'civic',
  },
  {
    id: 'hospital_night_hub',
    label: 'Khu Ẩm Thực Đêm & Sạc EV',
    shortLabel: 'FOOD HUB 24H',
    minX: -342.0,
    maxX: -241.0,
    minZ: -18.0,
    maxZ: 15.6,
    category: 'food',
  },
  {
    id: 'cyber_stadium',
    label: 'Cyber Stadium • E-Sport ★★★★★',
    shortLabel: 'CYBER GAME',
    minX: -361.6,
    maxX: -342.4,
    minZ: -18.0,
    maxZ: 15.6,
    category: 'tech',
    floors: 2,
  },
  ...buildWestResidentialBuildingFootprints(),

  // === CENTER STRIP SOUTH SIDE (Z >= 42.5) ===
  {
    id: 'landmark81',
    label: 'Landmark 81 • Vincom',
    shortLabel: 'LANDMARK 81',
    minX: -15.2,
    maxX: 15.2,
    minZ: 43.5,
    maxZ: 65.5,
    category: 'landmark',
  },
  {
    id: 'vinfast_showroom',
    label: 'VinFast Showroom',
    shortLabel: 'VINFAST',
    minX: -50.0,
    maxX: -20.0,
    minZ: 42.5,
    maxZ: 90.0,
    category: 'tech',
  },
  {
    id: 'vgreen_garage',
    label: 'Trạm Sạc V-GREEN',
    shortLabel: 'V-GREEN',
    minX: -74.0,
    maxX: -50.0,
    minZ: 42.5,
    maxZ: 94.0,
    category: 'tech',
  },
  {
    id: 'ron_express',
    label: 'Ron Express Logistics',
    shortLabel: 'RON EXPRESS',
    minX: -108.0,
    maxX: -74.0,
    minZ: 42.5,
    maxZ: 63.0,
    category: 'commerce',
  },
  {
    id: 'ron_barber',
    label: 'Ron Barber Shop',
    shortLabel: 'BARBER',
    minX: -147.0,
    maxX: -133.0,
    minZ: 42.5,
    maxZ: 57.0,
    category: 'commerce',
    floors: 2,
  },
  {
    id: 'ron_football',
    label: 'Ron Football Arena',
    shortLabel: 'SÂN BÓNG',
    minX: -207.0,
    maxX: -148.0,
    minZ: 42.5,
    maxZ: 82.5,
    category: 'landmark',
  },
  {
    id: 'hospital',
    label: 'Bệnh Viện Đa Khoa Quốc Tế',
    shortLabel: 'BỆNH VIỆN',
    minX: -300.0,
    maxX: -241.0,
    minZ: 42.5,
    maxZ: 94.5,
    category: 'civic',
    floors: 5,
  },
  {
    id: 'phan_chau_trinh',
    label: 'Trường THPT Phan Châu Trinh',
    shortLabel: 'THPT PCT',
    minX: -361.0,
    maxX: -305.0,
    minZ: 42.5,
    maxZ: 148.0,
    category: 'civic',
    floors: 3,
  },
  {
    id: 'fahasa_bookstore',
    label: 'Nhà Sách FAHASA & Hobby Manga',
    shortLabel: 'FAHASA',
    minX: -393.0,
    maxX: -363.0,
    minZ: 42.5,
    maxZ: 92.0,
    category: 'commerce',
    floors: 2,
  },
  {
    id: 'school_snack_alley',
    label: 'Phố Ăn Vặt Cổng Trường & Trà Sữa',
    shortLabel: 'ĂN VẶT',
    minX: -425.0,
    maxX: -395.0,
    minZ: 42.5,
    maxZ: 92.0,
    category: 'food',
  },
  {
    id: 'youth_basketball_park',
    label: 'Sân Bóng Rổ 3x3 & Skatepark Thanh Niên',
    shortLabel: 'BÓNG RỔ 3x3',
    minX: -425.0,
    maxX: -363.0,
    minZ: 94.0,
    maxZ: 148.0,
    category: 'landmark',
  },
  {
    id: 'royal_residences',
    label: 'The Royal Residences',
    shortLabel: 'ROYAL RES.',
    minX: 57.6,
    maxX: 97.0,
    minZ: 42.5,
    maxZ: 74.0,
    category: 'residence',
    floors: 19,
  },
  {
    id: 'aeon_mall',
    label: 'AEON Mall Megamall',
    shortLabel: 'AEON MALL',
    minX: 99.0,
    maxX: 157.0,
    minZ: 44.6,
    maxZ: 91.6,
    category: 'commerce',
    floors: 3,
  },

  // === PHỐ ĐI BỘ NIGHTLIFE STRIP (X = 147..180 & 207..236) ===
  {
    id: 'toxic_pub',
    label: 'TOXIC Beer Club',
    shortLabel: 'TOXIC',
    minX: 147.0,
    maxX: 180.0,
    minZ: -14.0,
    maxZ: 15.6,
    category: 'nightlife',
    floors: 2,
  },
  {
    id: 'lan_que_phuong',
    label: 'Lan Quế Phường',
    shortLabel: 'LAN QUẾ PHƯỜNG',
    minX: 147.0,
    maxX: 180.0,
    minZ: -44.0,
    maxZ: -14.2,
    category: 'nightlife',
  },
  {
    id: 'new_dtv',
    label: 'NEW DTV Nightclub & KTV',
    shortLabel: 'NEW DTV',
    minX: 147.0,
    maxX: 180.0,
    minZ: -74.0,
    maxZ: -44.2,
    category: 'nightlife',
  },
  {
    id: 'the_gang',
    label: 'THE GANG Food & Music',
    shortLabel: 'THE GANG',
    minX: 147.0,
    maxX: 180.0,
    minZ: -104.0,
    maxZ: -74.2,
    category: 'nightlife',
  },
  {
    id: 'katinat_bach_dang',
    label: 'KATINAT Bạch Đằng',
    shortLabel: 'KATINAT',
    minX: 119.8,
    maxX: 145.8,
    minZ: -104.0,
    maxZ: -75.9,
    category: 'food',
  },
  {
    id: 'ysl_bach_dang',
    label: 'Saint Laurent (YSL) Bạch Đằng',
    shortLabel: 'YSL',
    minX: 94.6,
    maxX: 118.4,
    minZ: -104.0,
    maxZ: -76.8,
    category: 'luxury',
    floors: 2,
  },
  {
    id: 'chanel_bach_dang',
    label: 'CHANEL Bạch Đằng',
    shortLabel: 'CHANEL',
    minX: 69.4,
    maxX: 93.2,
    minZ: -104.0,
    maxZ: -76.5,
    category: 'luxury',
    floors: 2,
  },
  {
    id: 'phe_la_bach_dang',
    label: 'Phê La Bạch Đằng',
    shortLabel: 'PHÊ LA',
    minX: 45.0,
    maxX: 68.0,
    minZ: -104.0,
    maxZ: -81.3,
    category: 'food',
  },
  {
    id: 'royal_residences_bach_dang',
    label: 'The Royal Residences Bạch Đằng',
    shortLabel: 'ROYAL RES',
    minX: 3.6,
    maxX: 43.0,
    minZ: -104.0,
    maxZ: -70.3,
    category: 'residence',
    floors: 19,
  },
  {
    id: 'skechers_bach_dang',
    label: 'SKECHERS Bạch Đằng',
    shortLabel: 'SKECHERS',
    minX: -23.0,
    maxX: 2.0,
    minZ: -104.0,
    maxZ: -80.0,
    category: 'commerce',
  },
  {
    id: 'adidas_bach_dang',
    label: 'ADIDAS Bạch Đằng',
    shortLabel: 'ADIDAS',
    minX: -50.4,
    maxX: -24.4,
    minZ: -104.0,
    maxZ: -78.0,
    category: 'commerce',
  },
  {
    id: 'starbucks_bach_dang',
    label: 'Starbucks Reserve Bạch Đằng',
    shortLabel: 'STARBUCKS ★R',
    minX: -86.0,
    maxX: -52.0,
    minZ: -100.0,
    maxZ: -74.0,
    category: 'food',
    floors: 2,
  },
  {
    id: 'ron_beo',
    label: 'Quán Nhậu Ron Béo',
    shortLabel: 'RON BÉO',
    minX: 207.0,
    maxX: 235.8,
    minZ: -12.0,
    maxZ: 15.6,
    category: 'food',
    floors: 2,
  },
  {
    id: 'khoi_garden',
    label: 'Khói Food Garden',
    shortLabel: 'KHÓI GARDEN',
    minX: 207.0,
    maxX: 235.8,
    minZ: -40.0,
    maxZ: -12.2,
    category: 'nightlife',
    floors: 2,
  },
  {
    id: 'four_u_club',
    label: '4U Superclub',
    shortLabel: '4U CLUB',
    minX: 207.0,
    maxX: 235.8,
    minZ: -70.0,
    maxZ: -40.2,
    category: 'nightlife',
  },

  // === EAST BOULEVARD & PHỐ ĐI BỘ SOUTH ===
  {
    id: 'hanoi_pho',
    label: 'Nhà Hàng Hà Nội Phố',
    shortLabel: 'HÀ NỘI PHỐ',
    minX: 207.0,
    maxX: 236.0,
    minZ: 44.0,
    maxZ: 68.0,
    category: 'food',
    floors: 4,
  },
  {
    id: 'boutique_hotel',
    label: 'Boutique Hotel',
    shortLabel: 'BOUTIQUE HOTEL',
    minX: 207.0,
    maxX: 236.0,
    minZ: 70.0,
    maxZ: 95.0,
    category: 'residence',
    floors: 5,
  },
  {
    id: 'peri_pool',
    label: 'Peri Pool Arena',
    shortLabel: 'PERI POOL',
    minX: 238.0,
    maxX: 270.0,
    minZ: 43.0,
    maxZ: 70.0,
    category: 'landmark',
    floors: 2,
  },
  {
    id: 'vietcombank',
    label: 'Vietcombank',
    shortLabel: 'VCB',
    minX: 238.0,
    maxX: 264.0,
    minZ: -10.0,
    maxZ: 15.6,
    category: 'civic',
    floors: 2,
  },
  {
    id: 'phe_la',
    label: 'Phê La Coffee',
    shortLabel: 'PHÊ LA',
    minX: 274.0,
    maxX: 296.0,
    minZ: 42.5,
    maxZ: 65.2,
    category: 'food',
  },
  {
    id: 'phuc_long',
    label: 'Phúc Long Coffee & Tea',
    shortLabel: 'PHÚC LONG',
    minX: 277.8,
    maxX: 298.8,
    minZ: -9.0,
    maxZ: 15.6,
    category: 'food',
  },
  {
    id: 'adidas',
    label: 'Adidas Flagship',
    shortLabel: 'ADIDAS',
    minX: 299.2,
    maxX: 325.2,
    minZ: 42.5,
    maxZ: 68.5,
    category: 'commerce',
  },
  {
    id: 'skechers',
    label: 'Skechers Store',
    shortLabel: 'SKECHERS',
    minX: 301.8,
    maxX: 326.8,
    minZ: -8.4,
    maxZ: 15.6,
    category: 'commerce',
  },
  {
    id: 'john_henry',
    label: 'John Henry & Freelancer',
    shortLabel: 'JOHN HENRY',
    minX: 329.8,
    maxX: 354.8,
    minZ: -8.4,
    maxZ: 15.6,
    category: 'commerce',
  },
  {
    id: 'desert',
    label: 'DESERT Made in VN',
    shortLabel: 'DESERT',
    minX: 328.4,
    maxX: 353.4,
    minZ: 42.5,
    maxZ: 67.5,
    category: 'commerce',
  },
  {
    id: 'katinat',
    label: 'KATINAT Coffee & Tea House',
    shortLabel: 'KATINAT',
    minX: 328.4,
    maxX: 356.5,
    minZ: 69.0,
    maxZ: 95.0,
    category: 'food',
  },

  // === CASA RIVA & TECH CORNER (X = 254..413, Z = -104..-10) ===
  {
    id: 'casa_riva',
    label: 'CASA RIVA • ThaiGrand Hotel',
    shortLabel: 'CASA RIVA',
    minX: 254.0,
    maxX: 314.0,
    minZ: -104.0,
    maxZ: -52.0,
    category: 'residence',
    floors: 2,
  },
  {
    id: 'huawei',
    label: 'HUAWEI Flagship Store',
    shortLabel: 'HUAWEI',
    minX: 316.0,
    maxX: 356.5,
    minZ: -104.0,
    maxZ: -64.0,
    category: 'tech',
    floors: 2,
  },
  {
    id: 'xiaomi',
    label: 'XIAOMI Home Flagship',
    shortLabel: 'XIAOMI',
    minX: 329.8,
    maxX: 356.5,
    minZ: -62.4,
    maxZ: -37.6,
    category: 'tech',
    floors: 2,
  },
  {
    id: 'samsung',
    label: 'SAMSUNG Showcase',
    shortLabel: 'SAMSUNG',
    minX: 329.8,
    maxX: 356.5,
    minZ: -35.8,
    maxZ: -10.2,
    category: 'tech',
  },
  {
    id: 'sony',
    label: 'SONY Flagship Store',
    shortLabel: 'SONY',
    minX: 383.8,
    maxX: 412.5,
    minZ: -104.0,
    maxZ: -76.2,
    category: 'tech',
    floors: 3,
  },
  {
    id: 'lg',
    label: 'LG Flagship Brandshop',
    shortLabel: 'LG',
    minX: 383.8,
    maxX: 412.5,
    minZ: -75.0,
    maxZ: -47.0,
    category: 'tech',
    floors: 2,
  },
  {
    id: 'apple',
    label: 'APPLE Flagship Store',
    shortLabel: 'APPLE',
    minX: 383.8,
    maxX: 412.5,
    minZ: -45.2,
    maxZ: -16.8,
    category: 'tech',
    floors: 2,
  },

  // === FAR-EAST LUXURY ROW (X = 383.8..487.6) ===
  {
    id: 'louis_vuitton',
    label: 'Louis Vuitton Flagship',
    shortLabel: 'LV',
    minX: 383.8,
    maxX: 411.5,
    minZ: -12.4,
    maxZ: 15.6,
    category: 'luxury',
    floors: 3,
  },
  {
    id: 'gucci',
    label: 'Gucci Palazzo',
    shortLabel: 'GUCCI',
    minX: 413.0,
    maxX: 434.8,
    minZ: -11.6,
    maxZ: 15.6,
    category: 'luxury',
    floors: 3,
  },
  {
    id: 'ysl',
    label: 'Saint Laurent (YSL)',
    shortLabel: 'YSL',
    minX: 436.2,
    maxX: 460.0,
    minZ: -11.6,
    maxZ: 15.6,
    category: 'luxury',
  },
  {
    id: 'dior',
    label: 'DIOR Flagship Boutique',
    shortLabel: 'DIOR',
    minX: 461.6,
    maxX: 487.6,
    minZ: -11.6,
    maxZ: 15.6,
    category: 'luxury',
  },
  {
    id: 'highlands',
    label: 'Highlands Coffee',
    shortLabel: 'HIGHLANDS',
    minX: 383.8,
    maxX: 411.8,
    minZ: 42.5,
    maxZ: 70.5,
    category: 'food',
  },
  {
    id: 'vpbank',
    label: 'Ngân Hàng VPBank',
    shortLabel: 'VPBANK',
    minX: 388.0,
    maxX: 409.4,
    minZ: 73.0,
    maxZ: 99.0,
    category: 'civic',
    floors: 2,
  },
  {
    id: 'vpbank_atm',
    label: 'VPBank 24h ATM',
    shortLabel: 'ATM VPB',
    minX: 386.6,
    maxX: 392.6,
    minZ: 100.2,
    maxZ: 109.4,
    category: 'civic',
  },
  {
    id: 'hermes',
    label: 'Hermès Paris Salon',
    shortLabel: 'HERMÈS',
    minX: 413.0,
    maxX: 434.8,
    minZ: 43.9,
    maxZ: 70.0,
    category: 'luxury',
    floors: 2,
  },
  {
    id: 'chanel',
    label: 'CHANEL Boutique',
    shortLabel: 'CHANEL',
    minX: 436.2,
    maxX: 460.0,
    minZ: 43.9,
    maxZ: 70.0,
    category: 'luxury',
  },
  {
    id: 'prada',
    label: 'PRADA Milano',
    shortLabel: 'PRADA',
    minX: 461.6,
    maxX: 487.6,
    minZ: 45.8,
    maxZ: 70.0,
    category: 'luxury',
  },

  // === VINHOMES OCEAN PARK SHOPHOUSE ROWS (Z = 166..326) ===
  {
    id: 'vinhomes_west_row',
    label: 'Dãy Shophouse Ocean Park Tây',
    shortLabel: 'VINHOMES W',
    minX: 162.2,
    maxX: 175.0,
    minZ: 166.0,
    maxZ: 326.0,
    category: 'residence',
    floors: 4,
  },
  {
    id: 'vinhomes_east_row',
    label: 'Dãy Shophouse Ocean Park Đông',
    shortLabel: 'VINHOMES E',
    minX: 212.0,
    maxX: 224.8,
    minZ: 166.0,
    maxZ: 326.0,
    category: 'residence',
    floors: 4,
  },

  // === VINHOMES OCEAN PARK TRUNG TÂM SHOPHOUSE ROWS (X = 282.0, Z = 166..326) ===
  {
    id: 'vinhomes_mid_west_row',
    label: 'Dãy Shophouse Ocean Park Trung Tâm Tây',
    shortLabel: 'VHM W',
    minX: 250.7,
    maxX: 263.5,
    minZ: 166.0,
    maxZ: 326.0,
    category: 'residence',
    floors: 4,
  },
  {
    id: 'vinhomes_mid_east_row',
    label: 'Dãy Shophouse Ocean Park Trung Tâm Đông',
    shortLabel: 'VHM E',
    minX: 300.5,
    maxX: 313.3,
    minZ: 166.0,
    maxZ: 326.0,
    category: 'residence',
    floors: 4,
  },

  // === VINHOMES OCEAN PARK 2 SHOPHOUSE ROWS (Z = 166..326) ===
  {
    id: 'vinhomes2_west_row',
    label: 'Dãy Shophouse Ocean Park 2 Tây',
    shortLabel: 'VH2 W',
    minX: 338.7,
    maxX: 351.5,
    minZ: 166.0,
    maxZ: 326.0,
    category: 'residence',
    floors: 4,
  },
  {
    id: 'vinhomes2_east_row',
    label: 'Dãy Shophouse Ocean Park 2 Đông',
    shortLabel: 'VH2 E',
    minX: 388.5,
    maxX: 401.3,
    minZ: 166.0,
    maxZ: 326.0,
    category: 'residence',
    floors: 4,
  },

  // === VINHOMES OCEAN PARK 2 ĐÔNG SHOPHOUSE ROWS (X = 436.5, Z = 166..326) ===
  {
    id: 'vinhomes2b_west_row',
    label: 'Dãy Shophouse Ocean Park 2 Đông Tây',
    shortLabel: 'VH2B W',
    minX: 405.2,
    maxX: 418.0,
    minZ: 166.0,
    maxZ: 326.0,
    category: 'residence',
    floors: 4,
  },
  {
    id: 'vinhomes2b_east_row',
    label: 'Dãy Shophouse Ocean Park 2 Đông Đông',
    shortLabel: 'VH2B E',
    minX: 455.0,
    maxX: 467.8,
    minZ: 166.0,
    maxZ: 326.0,
    category: 'residence',
    floors: 4,
  },

  // === VINHOMES OCEAN PARK 3 SHOPHOUSE ROWS (Z = 166..326) ===
  {
    id: 'vinhomes3_west_row',
    label: 'Dãy Shophouse Ocean Park 3 Tây',
    shortLabel: 'VH3 W',
    minX: 471.7,
    maxX: 484.5,
    minZ: 166.0,
    maxZ: 326.0,
    category: 'residence',
    floors: 4,
  },
  {
    id: 'vinhomes3_east_row',
    label: 'Dãy Shophouse Ocean Park 3 Đông',
    shortLabel: 'VH3 E',
    minX: 521.5,
    maxX: 534.3,
    minZ: 166.0,
    maxZ: 326.0,
    category: 'residence',
    floors: 4,
  },

  // === SEAMLESS CONNECTING VINHOMES SHOPHOUSE FRONTS (NORTH Z=166..178.4 & SOUTH Z=313.6..326.0) ===
  {
    id: 'vinhomes_bridge_1_north',
    label: 'Shophouse Liên Khu Ocean Park Bắc',
    shortLabel: 'VH LINK',
    minX: 224.8,
    maxX: 250.7,
    minZ: 166.0,
    maxZ: 178.4,
    category: 'residence',
    floors: 4,
  },
  {
    id: 'vinhomes_bridge_1_south',
    label: 'Shophouse Liên Khu Ocean Park Nam',
    shortLabel: 'VH LINK',
    minX: 224.8,
    maxX: 250.7,
    minZ: 313.6,
    maxZ: 326.0,
    category: 'residence',
    floors: 4,
  },
  {
    id: 'vinhomes_bridge_2_north',
    label: 'Shophouse Liên Khu Ocean Park 2 Bắc',
    shortLabel: 'VH2 LINK',
    minX: 313.3,
    maxX: 338.7,
    minZ: 166.0,
    maxZ: 178.4,
    category: 'residence',
    floors: 4,
  },
  {
    id: 'vinhomes_bridge_2_south',
    label: 'Shophouse Liên Khu Ocean Park 2 Nam',
    shortLabel: 'VH2 LINK',
    minX: 313.3,
    maxX: 338.7,
    minZ: 313.6,
    maxZ: 326.0,
    category: 'residence',
    floors: 4,
  },
  {
    id: 'vinhomes_bridge_3_north',
    label: 'Shophouse Liên Khu Ocean Park 2 Đông Bắc',
    shortLabel: 'VH2B',
    minX: 401.3,
    maxX: 405.2,
    minZ: 166.0,
    maxZ: 178.4,
    category: 'residence',
    floors: 4,
  },
  {
    id: 'vinhomes_bridge_3_south',
    label: 'Shophouse Liên Khu Ocean Park 2 Đông Nam',
    shortLabel: 'VH2B',
    minX: 401.3,
    maxX: 405.2,
    minZ: 313.6,
    maxZ: 326.0,
    category: 'residence',
    floors: 4,
  },
  {
    id: 'vinhomes_bridge_4_north',
    label: 'Shophouse Liên Khu Ocean Park 3 Bắc',
    shortLabel: 'VH3 LINK',
    minX: 467.8,
    maxX: 471.7,
    minZ: 166.0,
    maxZ: 178.4,
    category: 'residence',
    floors: 4,
  },
  {
    id: 'vinhomes_bridge_4_south',
    label: 'Shophouse Liên Khu Ocean Park 3 Nam',
    shortLabel: 'VH3 LINK',
    minX: 467.8,
    maxX: 471.7,
    minZ: 313.6,
    maxZ: 326.0,
    category: 'residence',
    floors: 4,
  },

  // === FAR-WEST COASTAL BEACH AMENITIES (BIỂN MỸ KHÊ TÂY) ===
  ...WEST_COASTAL_BUILDINGS,
  // === NORTH BANK LANDMARKS ===
  {
    id: 'north_bank_love_bridge',
    label: 'Cầu Tình Yêu • Bến Du Thuyền',
    shortLabel: 'CẦU TÌNH YÊU',
    minX: 272.0,
    maxX: 346.0,
    minZ: -333.0,
    maxZ: -324.5,
    category: 'landmark',
  },
];

export const CITY_POIS: CityPoi[] = [
  {
    id: 'poi_card_shop',
    name: 'Pokémon Card Shop (Cửa Tiệm)',
    subtitle: 'Trụ sở chính · 2 tầng bán thẻ bài & bàn đấu',
    x: 0,
    z: 16.5,
    category: 'home',
    filterGroup: 'home_civic',
    badge: 'HOME',
    openHours: '07:00 – 04:00',
  },
  {
    id: 'poi_grading_lab',
    name: 'PSA · CGC · BGS Lab & Sàn Đấu Giá VIP',
    subtitle: 'Sàn đấu giá Showroom VIP phía trước & Phòng chấm điểm riêng cuối phòng',
    x: 21,
    z: 16.5,
    category: 'commerce',
    filterGroup: 'home_civic',
    badge: 'BGS',
  },
  {
    id: 'poi_landmark81',
    name: 'Landmark 81 • Vincom Center',
    subtitle: 'Tháp chọc trời đối diện Card Shop',
    x: 0,
    z: 42.5,
    category: 'landmark',
    filterGroup: 'landmark_park',
    badge: '81',
  },
  {
    id: 'poi_aeon_mall',
    name: 'AEON Mall Megamall',
    subtitle: 'Trung tâm thương mại 3 tầng thang cuốn',
    x: 128,
    z: 44.0,
    category: 'commerce',
    filterGroup: 'luxury_fashion',
    badge: 'AEON',
    openHours: '08:00 – 22:00',
  },
  {
    id: 'poi_hospital',
    name: 'Bệnh Viện Đa Khoa Quốc Tế',
    subtitle: '5 tầng cấp cứu 115 · 2 thang máy hoạt động',
    x: -271,
    z: 42.0,
    category: 'civic',
    filterGroup: 'home_civic',
    badge: 'H',
    openHours: '24/7',
  },
  {
    id: 'poi_phan_chau_trinh',
    name: 'Trường THPT Phan Châu Trinh',
    subtitle: 'Trường cấp 3 bên cạnh Bệnh Viện · 3 tầng & sân cờ',
    x: -333,
    z: 42.0,
    category: 'civic',
    filterGroup: 'home_civic',
    badge: 'PCT',
    openHours: '06:00 – 20:30',
  },
  {
    id: 'poi_fahasa_bookstore',
    name: 'Nhà Sách FAHASA & Hobby Manga',
    subtitle: '2 tầng sách giáo khoa, Manga, Figure, Photocopy & bàn đấu thẻ bài',
    x: -378.0,
    z: 42.0,
    category: 'commerce',
    filterGroup: 'home_civic',
    badge: 'FHS',
    openHours: '07:30 – 22:00',
  },
  {
    id: 'poi_school_snack_alley',
    name: 'Phố Ăn Vặt Cổng Trường',
    subtitle: 'Trà sữa, trà chanh, bánh tráng trộn, xiên que & gà rán học đường',
    x: -410.0,
    z: 42.0,
    category: 'food',
    filterGroup: 'food_nightlife',
    badge: '🧋',
    openHours: '07:00 – 23:00',
  },
  {
    id: 'poi_youth_basketball_park',
    name: 'Sân Bóng Rổ 3x3 & Skatepark',
    subtitle: 'Sân Streetball 3x3, khán đài, công viên đài phun nước & ván trượt',
    x: -394.0,
    z: 96.0,
    category: 'landmark',
    filterGroup: 'landmark_park',
    badge: '🏀',
    openHours: '06:00 – 23:30',
  },
  {
    id: 'poi_cyber_stadium',
    name: 'Cyber Stadium • E-Sport ★★★★★',
    subtitle: 'Quán Net 2 tầng bên cạnh Tổ Hợp Thăm Bệnh · Đối diện THPT Phan Châu Trinh',
    x: -352,
    z: 16.0,
    category: 'tech',
    filterGroup: 'tech_auto',
    badge: 'CS',
    openHours: '24/7',
  },
  ...buildWestResidentialPois(),
  {
    id: 'poi_police',
    name: 'Đồn Công An Thành Phố',
    subtitle: 'Trụ sở cảnh sát & đội xe tuần tra phía Tây',
    x: -192.5,
    z: 16.0,
    category: 'civic',
    filterGroup: 'home_civic',
    badge: 'CA',
    openHours: '24/7',
  },
  {
    id: 'poi_casa_riva',
    name: 'CASA RIVA • ThaiGrand Hotel',
    subtitle: 'Khách sạn 2 tầng hạng sang · 2 thang máy & xe đưa đón',
    x: 284,
    z: -51.5,
    category: 'residence',
    filterGroup: 'luxury_fashion',
    badge: 'CR',
    openHours: '24/7',
  },
  {
    id: 'poi_han_bridge',
    name: 'Cầu Sông Hàn',
    subtitle: 'Cầu quay nối Phố Đi Bộ sang Bờ Bắc',
    x: 193.5,
    z: -240,
    category: 'landmark',
    filterGroup: 'landmark_park',
    badge: '🌉',
  },
  {
    id: 'poi_dragon_bridge',
    name: 'Cầu Rồng Đà Nẵng',
    subtitle: 'Cầu vòm thép vàng 6 nhịp nối Sơn Tây sang Bờ Bắc',
    x: 370.0,
    z: -240,
    category: 'landmark',
    filterGroup: 'landmark_park',
    badge: '🐉',
  },
  {
    id: 'poi_tran_thi_ly_bridge',
    name: 'Cầu Trần Thị Lý',
    subtitle: 'Cầu dây văng tháp buồm trắng 6 làn nối Đại Lộ Paris sang Bờ Bắc',
    x: 503.0,
    z: -240,
    category: 'landmark',
    filterGroup: 'landmark_park',
    badge: '⛵',
  },
  {
    id: 'poi_sun_wheel',
    name: 'Cầu Tình Yêu • Bến Du Thuyền',
    subtitle: 'Cây đèn lồng trái tim đỏ & bến du thuyền Bờ Bắc Sông Hàn',
    x: 279.0,
    z: -350.0,
    category: 'landmark',
    filterGroup: 'landmark_park',
    badge: '❤️',
  },
  {
    id: 'poi_viewing_pier',
    name: 'Cầu Tàu Cá Chép Hóa Rồng',
    subtitle: 'Điểm ngắm cảnh Bạch Đằng ven Sông Hàn',
    x: 146.0,
    z: -134.0,
    category: 'landmark',
    filterGroup: 'landmark_park',
    badge: '🌊',
  },
  {
    id: 'poi_porsche',
    name: 'Porsche Center Showroom',
    subtitle: 'Showroom siêu xe thể thao bàn xoay',
    x: 68,
    z: 16.0,
    category: 'luxury',
    filterGroup: 'tech_auto',
    badge: 'P',
  },
  {
    id: 'poi_vinfast',
    name: 'VinFast Showroom & V-GREEN',
    subtitle: 'Trung tâm xe điện & trạm sạc nhanh',
    x: -35,
    z: 42.0,
    category: 'tech',
    filterGroup: 'tech_auto',
    badge: 'VF',
  },
  {
    id: 'poi_apple',
    name: 'Apple Flagship Store',
    subtitle: 'Góc công nghệ Sơn Tây Bắc · 2 tầng kính',
    x: 383.0,
    z: -31.0,
    category: 'tech',
    filterGroup: 'tech_auto',
    badge: '',
  },
  {
    id: 'poi_huawei',
    name: 'HUAWEI Flagship Store',
    subtitle: 'Cửa hàng 2 mặt tiền Bạch Đằng & Sơn Tây',
    x: 356.5,
    z: -81.0,
    category: 'tech',
    filterGroup: 'tech_auto',
    badge: 'HW',
  },
  {
    id: 'poi_sony',
    name: 'SONY Flagship Ginza Place',
    subtitle: 'Cửa hàng 3 tầng · Góc Bạch Đằng & Sơn Tây',
    x: 383.5,
    z: -88.2,
    category: 'tech',
    filterGroup: 'tech_auto',
    badge: 'SN',
  },
  {
    id: 'poi_samsung',
    name: 'SAMSUNG Showcase',
    subtitle: 'Showroom trải nghiệm Galaxy · Sơn Tây Bắc',
    x: 356.5,
    z: -28.6,
    category: 'tech',
    filterGroup: 'tech_auto',
    badge: 'SS',
  },
  {
    id: 'poi_xiaomi',
    name: 'XIAOMI Home',
    subtitle: 'Hệ sinh thái Smart Home 2 tầng',
    x: 356.5,
    z: -50.0,
    category: 'tech',
    filterGroup: 'tech_auto',
    badge: 'MI',
  },
  {
    id: 'poi_lg',
    name: 'LG Brandshop',
    subtitle: 'OLED TV & Thiết bị gia dụng cao cấp',
    x: 383.5,
    z: -61.0,
    category: 'tech',
    filterGroup: 'tech_auto',
    badge: 'LG',
  },
  {
    id: 'poi_dior',
    name: 'DIOR Flagship Boutique',
    subtitle: 'Ngã Tư DIOR · Khu phố hàng hiệu Paris',
    x: 474.6,
    z: 16.0,
    category: 'luxury',
    filterGroup: 'luxury_fashion',
    badge: 'DR',
  },
  {
    id: 'poi_louis_vuitton',
    name: 'Louis Vuitton Flagship',
    subtitle: '3 tầng kiến trúc sang trọng góc Sơn Tây',
    x: 397.0,
    z: 16.0,
    category: 'luxury',
    filterGroup: 'luxury_fashion',
    badge: 'LV',
  },
  {
    id: 'poi_gucci',
    name: 'Gucci Palazzo',
    subtitle: '3 tầng thời trang Ý cao cấp',
    x: 423.9,
    z: 16.0,
    category: 'luxury',
    filterGroup: 'luxury_fashion',
    badge: 'GC',
  },
  {
    id: 'poi_ysl',
    name: 'Saint Laurent (YSL)',
    subtitle: 'Boutique thời trang Paris',
    x: 448.4,
    z: 16.0,
    category: 'luxury',
    filterGroup: 'luxury_fashion',
    badge: 'YSL',
  },
  {
    id: 'poi_chanel',
    name: 'CHANEL Boutique',
    subtitle: 'Đại lộ Luxury phía Nam',
    x: 448.1,
    z: 42.5,
    category: 'luxury',
    filterGroup: 'luxury_fashion',
    badge: 'CH',
  },
  {
    id: 'poi_hermes',
    name: 'Hermès Paris Salon',
    subtitle: '2 tầng đồ da & trang sức Pháp',
    x: 423.9,
    z: 42.5,
    category: 'luxury',
    filterGroup: 'luxury_fashion',
    badge: 'HM',
  },
  {
    id: 'poi_prada',
    name: 'PRADA Milano',
    subtitle: 'Đối diện DIOR tại Ngã Tư DIOR',
    x: 474.6,
    z: 42.5,
    category: 'luxury',
    filterGroup: 'luxury_fashion',
    badge: 'PR',
  },
  {
    id: 'poi_toxic',
    name: 'TOXIC Beer Club',
    subtitle: 'Phố Đi Bộ · Nhạc DJ sôi động về đêm',
    x: 181.0,
    z: 2.0,
    category: 'nightlife',
    filterGroup: 'food_nightlife',
    badge: 'DJ',
    openHours: '18:00 – 04:00',
  },
  {
    id: 'poi_khoi',
    name: 'Khói Food Garden',
    subtitle: 'Phố Đi Bộ · Sân vườn nướng & bia 2 tầng',
    x: 206.0,
    z: -26.0,
    category: 'nightlife',
    filterGroup: 'food_nightlife',
    badge: '🔥',
  },
  {
    id: 'poi_4u',
    name: '4U Superclub',
    subtitle: 'Phố Đi Bộ · Superclub ánh sáng laser',
    x: 206.0,
    z: -55.0,
    category: 'nightlife',
    filterGroup: 'food_nightlife',
    badge: '4U',
  },
  {
    id: 'poi_lan_que',
    name: 'Lan Quế Phường',
    subtitle: 'Phố Đi Bộ · Pub phong cách Hong Kong',
    x: 181.0,
    z: -29.0,
    category: 'nightlife',
    filterGroup: 'food_nightlife',
    badge: 'LQP',
  },
  {
    id: 'poi_new_dtv',
    name: 'NEW DTV Nightclub & KTV',
    subtitle: 'Phố Đi Bộ · Vinahouse & phòng hát',
    x: 181.0,
    z: -59.0,
    category: 'nightlife',
    filterGroup: 'food_nightlife',
    badge: 'DTV',
  },
  {
    id: 'poi_the_gang',
    name: 'THE GANG Food & Music',
    subtitle: 'Góc Bạch Đằng · Phố Đi Bộ Bắc',
    x: 181.0,
    z: -89.0,
    category: 'nightlife',
    filterGroup: 'food_nightlife',
    badge: 'TG',
  },
  {
    id: 'poi_katinat_bach_dang',
    name: 'KATINAT Bạch Đằng',
    subtitle: 'Cạnh THE GANG · Cafe view Sông Hàn',
    x: 132.8,
    z: -105.0,
    category: 'food',
    filterGroup: 'food_nightlife',
    badge: 'KT',
  },
  {
    id: 'poi_ysl_bach_dang',
    name: 'YSL Bạch Đằng',
    subtitle: 'Cạnh KATINAT · Boutique 2 tầng view Sông Hàn',
    x: 106.2,
    z: -105.0,
    category: 'luxury',
    filterGroup: 'luxury_fashion',
    badge: 'YSL',
  },
  {
    id: 'poi_chanel_bach_dang',
    name: 'CHANEL Bạch Đằng',
    subtitle: 'Cạnh YSL · Boutique 2 tầng view Sông Hàn',
    x: 88.4,
    z: -105.0,
    category: 'luxury',
    filterGroup: 'luxury_fashion',
    badge: 'CN',
  },
  {
    id: 'poi_phe_la_bach_dang',
    name: 'Phê La Bạch Đằng',
    subtitle: 'Cạnh CHANEL · Trà Ô Long & Camping ven Sông Hàn',
    x: 56.5,
    z: -105.0,
    category: 'food',
    filterGroup: 'food_nightlife',
    badge: 'PL',
  },
  {
    id: 'poi_royal_residences_bach_dang',
    name: 'The Royal Residences Bạch Đằng',
    subtitle: 'Cạnh Phê La · Tòa tháp 19 tầng & Hồ bơi vô cực view Sông Hàn',
    x: 29.5,
    z: -105.0,
    category: 'residence',
    filterGroup: 'home_civic',
    badge: 'ROYAL',
  },
  {
    id: 'poi_skechers_bach_dang',
    name: 'SKECHERS Bạch Đằng',
    subtitle: 'Cạnh Royal Residences · Giày thể thao & thời trang ven Sông Hàn',
    x: -9.4,
    z: -105.0,
    category: 'commerce',
    filterGroup: 'luxury_fashion',
    badge: 'SKX',
  },
  {
    id: 'poi_adidas_bach_dang',
    name: 'ADIDAS Flagship Bạch Đằng',
    subtitle: 'Cạnh SKECHERS · Originals Studio & Sneaker Wall view Sông Hàn',
    x: -36.4,
    z: -105.0,
    category: 'commerce',
    filterGroup: 'luxury_fashion',
    badge: 'ADI',
  },
  {
    id: 'poi_starbucks_bach_dang',
    name: 'Starbucks Reserve® Bạch Đằng',
    subtitle: 'Cạnh ADIDAS · Roastery 2 tầng mở 24/7, lò rang đồng & view Sông Hàn',
    x: -69.0,
    z: -105.0,
    category: 'food',
    filterGroup: 'food_nightlife',
    badge: 'SB★',
  },
  {
    id: 'poi_bach_dang_grand_park',
    name: 'Công Viên Trung Tâm Bạch Đằng',
    subtitle: 'Cạnh Starbucks · Hồ cá Koi cầu vòm đỏ, đài phun nhạc nước, vườn anh đào & khu vui chơi',
    x: -150.0,
    z: -105.0,
    category: 'landmark',
    filterGroup: 'landmark_park',
    badge: '🌳',
  },
  {
    id: 'poi_ron_beo',
    name: 'Quán Nhậu Ron Béo',
    subtitle: 'Đầu Phố Đi Bộ · Lẩu nướng bình dân 2 tầng',
    x: 207.0,
    z: 4.0,
    category: 'food',
    filterGroup: 'food_nightlife',
    badge: 'RB',
  },
  {
    id: 'poi_steakhouse',
    name: 'Manhattan Prime Steakhouse',
    subtitle: 'Nhà hàng bít tết cao cấp cạnh Grading Lab',
    x: 40.5,
    z: 16.0,
    category: 'food',
    filterGroup: 'food_nightlife',
    badge: '🥩',
  },
  {
    id: 'poi_starbucks',
    name: 'Starbucks Coffee',
    subtitle: 'Cà phê cạnh Card Shop (bên trái)',
    x: -21.0,
    z: 16.0,
    category: 'food',
    filterGroup: 'food_nightlife',
    badge: '☕',
  },
  {
    id: 'poi_katinat',
    name: 'KATINAT Coffee & Tea House',
    subtitle: 'Đường Sơn Tây Nam · Ngay cạnh DESERT',
    x: 356.5,
    z: 82.0,
    category: 'food',
    filterGroup: 'food_nightlife',
    badge: '☕',
    openHours: '07:00 – 23:00',
  },
  {
    id: 'poi_son_tay_park',
    name: 'Công Viên Sơn Tây Nam',
    subtitle: 'Đường Sơn Tây Nam · Cạnh KATINAT (Đài phun nước & chòi nghỉ)',
    x: 356.5,
    z: 115.0,
    category: 'landmark',
    filterGroup: 'landmark_park',
    badge: '🌳',
    openHours: '05:30 – 22:00',
  },
  {
    id: 'poi_vietcombank',
    name: 'Ngân Hàng Vietcombank',
    subtitle: 'Trụ sở 2 tầng & Cây ATM 24/7',
    x: 251.0,
    z: 16.0,
    category: 'civic',
    filterGroup: 'home_civic',
    badge: 'VCB',
  },
  {
    id: 'poi_vpbank',
    name: 'Ngân Hàng VPBank',
    subtitle: 'Đường Sơn Tây Nam · Cạnh Highlands Coffee (2 tầng + ATM 24h)',
    x: 383.8,
    z: 86.0,
    category: 'civic',
    filterGroup: 'home_civic',
    badge: 'VPB',
    openHours: '08:00 – 18:00 (ATM 24/7)',
  },
  {
    id: 'poi_peri_pool',
    name: 'Peri Pool Arena',
    subtitle: 'Billiards & Hồ bơi ngoài trời 2 tầng',
    x: 254.0,
    z: 43.0,
    category: 'landmark',
    filterGroup: 'landmark_park',
    badge: '🎱',
  },
  {
    id: 'poi_vinhomes',
    name: 'Vinhomes Ocean Park',
    subtitle: 'Đại lộ Shophouse 40 căn phía Nam',
    x: 193.5,
    z: 185.0,
    category: 'residence',
    filterGroup: 'landmark_park',
    badge: 'VH',
  },
  {
    id: 'poi_vinhomes_mid',
    name: 'Vinhomes Ocean Park Trung Tâm',
    subtitle: 'Đại lộ mới giữa VH & VH2 · Shophouse 40 căn',
    x: 282.0,
    z: 185.0,
    category: 'residence',
    filterGroup: 'landmark_park',
    badge: 'VHM',
  },
  {
    id: 'poi_vinhomes_2',
    name: 'Vinhomes Ocean Park 2',
    subtitle: 'Ngã Tư Sơn Tây Nam · Shophouse 40 căn Đông Nam',
    x: 370.0,
    z: 185.0,
    category: 'residence',
    filterGroup: 'landmark_park',
    badge: 'VH2',
  },
  {
    id: 'poi_vinhomes_2b',
    name: 'Vinhomes Ocean Park 2 Đông',
    subtitle: 'Đại lộ mới giữa VH2 & VH3 · Shophouse liền khu 40 căn',
    x: 436.5,
    z: 185.0,
    category: 'residence',
    filterGroup: 'landmark_park',
    badge: 'VH2B',
  },
  {
    id: 'poi_vinhomes_3',
    name: 'Vinhomes Ocean Park 3',
    subtitle: 'Ngã Tư DIOR Nam · Shophouse 40 căn Đại Lộ Paris',
    x: 503.0,
    z: 185.0,
    category: 'residence',
    filterGroup: 'landmark_park',
    badge: 'VH3',
  },
  {
    id: 'poi_ron_football',
    name: 'Ron Football & Pickleball',
    subtitle: 'Cụm sân bóng đá Tây & sân Pickleball Đông',
    x: -177.5,
    z: 42.5,
    category: 'landmark',
    filterGroup: 'landmark_park',
    badge: '⚽',
  },
  {
    id: 'poi_hospital_food',
    name: 'Phố Ẩm Thực Đêm Bệnh Viện',
    subtitle: 'Tổ hợp ăn đêm 24/7 & trạm sạc phía Tây',
    x: -291.0,
    z: 16.0,
    category: 'food',
    filterGroup: 'food_nightlife',
    badge: '🍜',
    openHours: '24/7',
  },
  ...WEST_COASTAL_POIS,
];

// =========================================================================
// ROAD GRAPH FOR GTA-STYLE GPS PATHFINDING ALONG ACTUAL STREETS & BRIDGES
// =========================================================================
interface GraphNode {
  id: string;
  x: number;
  z: number;
}

const ROAD_NODES: GraphNode[] = [
  // Far-West Coastal T-Junction, Đường Ven Biển Võ Nguyên Giáp & Đường Ven Sông Bạch Đằng Tây
  { id: 'coast_n', x: -973.2, z: -145.2 },
  { id: 'bd_w_884', x: -884.0, z: -145.2 },
  { id: 'bd_w_708', x: -708.0, z: -145.2 },
  { id: 'bd_w_534', x: -534.0, z: -145.2 },
  { id: 'bd_w_448', x: -448.0, z: -145.2 },
  { id: 'bd_west_elbow', x: -227.5, z: -145.2 },
  { id: 'coast_b3', x: -973.2, z: -98.0 },
  { id: 'coast_b2', x: -973.2, z: -60.0 },
  { id: 'coast_b1', x: -973.2, z: -22.0 },
  { id: 'coast_t', x: -973.2, z: 29.0 },
  { id: 'coast_n1', x: -973.2, z: 98.0 },
  { id: 'coast_s2', x: -973.2, z: 152.0 },
  { id: 'coast_s3', x: -973.2, z: 198.0 },
  { id: 'coast_s4', x: -973.2, z: 244.0 },
  { id: 'coast_s5', x: -973.2, z: 294.0 },
  { id: 'coast_s', x: -973.2, z: 344.0 },
  { id: 'w_mega_end', x: -945.0, z: 29.0 },
  { id: 'w_857', x: -857.0, z: 29.0 },
  { id: 'w_733', x: -733.0, z: 29.0 },
  { id: 'w_609', x: -609.6, z: 29.0 },
  { id: 'w_485', x: -485.6, z: 29.0 },
  { id: 'w_430', x: -430.0, z: 29.0 },
  { id: 'w_393', x: -393.6, z: 29.0 },
  { id: 'w_end', x: -345.0, z: 29.0 },
  { id: 'w_int', x: -227.5, z: 29.0 },
  { id: 'w_av_b1', x: -227.5, z: -22.0 },
  { id: 'w_av_b2', x: -227.5, z: -60.0 },
  { id: 'w_north', x: -227.5, z: -117.5 },
  { id: 'w_south', x: -227.5, z: 105.0 },
  // West North Inner Streets (Bắc 1 Z=-22, Bắc 2 Z=-60, Bắc 3 Z=-98)
  { id: 'b1_w', x: -945.0, z: -22.0 },
  { id: 'b1_857', x: -857.0, z: -22.0 },
  { id: 'b1_733', x: -733.0, z: -22.0 },
  { id: 'b1_609', x: -609.6, z: -22.0 },
  { id: 'b1_581', x: -581.6, z: -22.0 },
  { id: 'b1_485', x: -485.6, z: -22.0 },
  { id: 'b1_439', x: -439.6, z: -22.0 },
  { id: 'b1_393', x: -393.6, z: -22.0 },
  { id: 'b2_w', x: -945.0, z: -60.0 },
  { id: 'b2_733', x: -733.0, z: -60.0 },
  { id: 'b2_581', x: -581.6, z: -60.0 },
  { id: 'b2_551', x: -551.6, z: -60.0 },
  { id: 'b2_439', x: -439.6, z: -60.0 },
  { id: 'b2_405', x: -405.6, z: -60.0 },
  { id: 'b3_w', x: -945.0, z: -98.0 },
  { id: 'b3_733', x: -733.0, z: -98.0 },
  { id: 'b3_551', x: -551.6, z: -98.0 },
  { id: 'b3_405', x: -405.6, z: -98.0 },
  { id: 'b3_265', x: -265.0, z: -98.0 },
  // West South Inner Streets (Nam 1 Z=98, Nam 2 Z=152)
  { id: 'n1_w', x: -945.0, z: 98.0 },
  { id: 'n1_857', x: -857.0, z: 98.0 },
  { id: 'n1_733', x: -733.0, z: 98.0 },
  { id: 'n1_609', x: -609.6, z: 98.0 },
  { id: 'n1_589', x: -589.6, z: 98.0 },
  { id: 'n1_485', x: -485.6, z: 98.0 },
  { id: 'n1_459', x: -459.6, z: 98.0 },
  { id: 'n1_430', x: -430.0, z: 98.0 },
  { id: 's2_w', x: -945.0, z: 152.0 },
  { id: 's2_733', x: -733.0, z: 152.0 },
  { id: 's2_589', x: -589.6, z: 152.0 },
  { id: 's2_459', x: -459.6, z: 152.0 },
  { id: 's2_430', x: -430.0, z: 152.0 },
  { id: 's2_310', x: -310.0, z: 152.0 },
  // Unified Southern & South-Central Residential Mega-Grid (Southwest <-> Đại Lộ Bệnh Viện <-> South-Central <-> Vinhomes Ocean Park!)
  { id: 'w_s_108', x: -227.5, z: 108.0 },
  { id: 'sh_e_108', x: -104.0, z: 108.0 },
  { id: 'sc_m_108', x: -2.0, z: 108.0 },
  { id: 'sc_o_108', x: 96.0, z: 108.0 },
  { id: 'sh_w_152', x: -301.0, z: 152.0 },
  { id: 'w_s_152', x: -227.5, z: 152.0 },
  { id: 'sh_e_152', x: -104.0, z: 152.0 },
  { id: 'sc_m_152', x: -2.0, z: 152.0 },
  { id: 'sc_o_152', x: 96.0, z: 148.0 },
  { id: 'sw_fw_198', x: -956.0, z: 198.0 },
  { id: 'sw_m_198', x: -615.0, z: 198.0 },
  { id: 'sh_w_198', x: -301.0, z: 198.0 },
  { id: 'w_s_198', x: -227.5, z: 198.0 },
  { id: 'sh_e_198', x: -104.0, z: 198.0 },
  { id: 'sc_m_198', x: -2.0, z: 198.0 },
  { id: 'sc_o_198', x: 96.0, z: 198.0 },
  { id: 'sw_fw_244', x: -956.0, z: 244.0 },
  { id: 'sw_m_244', x: -615.0, z: 244.0 },
  { id: 'sh_w_244', x: -301.0, z: 244.0 },
  { id: 'w_s_244', x: -227.5, z: 244.0 },
  { id: 'sh_e_244', x: -104.0, z: 244.0 },
  { id: 'sc_m_244', x: -2.0, z: 244.0 },
  { id: 'sc_o_244', x: 96.0, z: 244.0 },
  { id: 'sw_fw_294', x: -956.0, z: 294.0 },
  { id: 'sw_m_294', x: -615.0, z: 294.0 },
  { id: 'sh_w_294', x: -301.0, z: 294.0 },
  { id: 'w_s_294', x: -227.5, z: 294.0 },
  { id: 'sh_e_294', x: -104.0, z: 294.0 },
  { id: 'sc_m_294', x: -2.0, z: 294.0 },
  { id: 'sc_o_294', x: 96.0, z: 294.0 },
  { id: 'sw_fw_344', x: -956.0, z: 344.0 },
  { id: 'sw_m_344', x: -615.0, z: 344.0 },
  { id: 'sh_w_344', x: -301.0, z: 344.0 },
  { id: 'w_s_344', x: -227.5, z: 344.0 },
  { id: 'sh_e_344', x: -104.0, z: 344.0 },
  { id: 'sc_m_344', x: -2.0, z: 344.0 },
  { id: 'sc_o_344', x: 96.0, z: 344.0 },
  { id: 'center_shop', x: 0.0, z: 29.0 },
  { id: 'e_int', x: 193.5, z: 29.0 },
  { id: 'e_bd', x: 193.5, z: -117.5 },
  { id: 'e_nb', x: 193.5, z: -362.0 },
  { id: 'e_nb_top', x: 193.5, z: -458.0 },
  { id: 'nb_west', x: 76.0, z: -362.0 },
  { id: 'nb_east', x: 570.0, z: -362.0 },
  { id: 'vh_n', x: 193.5, z: 148.0 },
  { id: 'vh_n_w', x: 105.0, z: 148.0 },
  { id: 'vh_n_e', x: 282.0, z: 148.0 },
  { id: 'vh_s', x: 193.5, z: 344.0 },
  { id: 'vh_s_w', x: 105.0, z: 344.0 },
  { id: 'vh_s_e', x: 282.0, z: 344.0 },
  { id: 'vh_end', x: 193.5, z: 428.0 },
  { id: 'vhm_end', x: 282.0, z: 428.0 },
  { id: 'bd_west', x: 86.0, z: -117.5 },
  { id: 'fe_int', x: 370.0, z: 29.0 },
  { id: 'vh2_n', x: 370.0, z: 148.0 },
  { id: 'vh2b_n', x: 436.5, z: 148.0 },
  { id: 'vh2_n_e', x: 469.75, z: 148.0 },
  { id: 'vh2_s', x: 370.0, z: 344.0 },
  { id: 'vh2b_s', x: 436.5, z: 344.0 },
  { id: 'vh2_s_e', x: 469.75, z: 344.0 },
  { id: 'vh2_end', x: 370.0, z: 428.0 },
  { id: 'vh2b_end', x: 436.5, z: 428.0 },
  { id: 'fe_bd', x: 370.0, z: -117.5 },
  { id: 'fe_nb', x: 370.0, z: -362.0 },
  { id: 'fe_nb_top', x: 370.0, z: -458.0 },
  { id: 'dior_int', x: 503.0, z: 29.0 },
  { id: 'dior_east', x: 562.0, z: 29.0 },
  { id: 'vh3_n', x: 503.0, z: 148.0 },
  { id: 'vh3_n_e', x: 564.0, z: 148.0 },
  { id: 'vh3_s', x: 503.0, z: 344.0 },
  { id: 'vh3_s_e', x: 564.0, z: 344.0 },
  { id: 'vh3_end', x: 503.0, z: 428.0 },
  { id: 'dior_bd', x: 503.0, z: -117.5 },
  { id: 'ttl_nb', x: 503.0, z: -362.0 },
  { id: 'ttl_nb_top', x: 503.0, z: -458.0 },
  { id: 'bd_east', x: 538.0, z: -117.5 },
];

const ROAD_EDGE_PAIRS: Array<[string, string]> = [
  // Far-West Coastal Boulevard (Đường Ven Biển Võ Nguyên Giáp) & Đường Ven Sông Bạch Đằng Tây — connected to ALL residential inner roads & Row N4 alleys!
  ['coast_n', 'coast_b3'],
  ['coast_b3', 'coast_b2'],
  ['coast_b2', 'coast_b1'],
  ['coast_b1', 'coast_t'],
  ['coast_t', 'coast_n1'],
  ['coast_n1', 'coast_s2'],
  ['coast_s2', 'coast_s3'],
  ['coast_s3', 'coast_s4'],
  ['coast_s4', 'coast_s5'],
  ['coast_s5', 'coast_s'],
  // Direct residential inner street connections to Đường Ven Biển Võ Nguyên Giáp
  ['coast_b3', 'b3_w'],
  ['coast_b2', 'b2_w'],
  ['coast_b1', 'b1_w'],
  ['coast_t', 'w_mega_end'],
  ['coast_n1', 'n1_w'],
  ['coast_s2', 's2_w'],
  ['coast_s3', 'sw_fw_198'],
  ['coast_s4', 'sw_fw_244'],
  ['coast_s5', 'sw_fw_294'],
  ['coast_s', 'sw_fw_344'],
  // Đường Ven Sông Bạch Đằng Tây chain + Row N4 direct alley connections into Sông Hàn riverfront!
  ['coast_n', 'bd_w_884'],
  ['bd_w_884', 'bd_w_708'],
  ['bd_w_708', 'bd_w_534'],
  ['bd_w_534', 'bd_w_448'],
  ['bd_w_448', 'bd_west_elbow'],
  ['bd_west_elbow', 'w_north'],
  ['bd_w_884', 'b3_w'],
  ['bd_w_708', 'b3_733'],
  ['bd_w_534', 'b3_551'],
  ['bd_w_448', 'b3_405'],
  // Main E-W Boulevard
  ['w_mega_end', 'w_857'],
  ['w_857', 'w_733'],
  ['w_733', 'w_609'],
  ['w_609', 'w_485'],
  ['w_485', 'w_430'],
  ['w_430', 'w_393'],
  ['w_393', 'w_end'],
  ['w_end', 'w_int'],
  ['w_int', 'center_shop'],
  ['center_shop', 'e_int'],
  ['e_int', 'fe_int'],
  ['fe_int', 'dior_int'],
  ['dior_int', 'dior_east'],
  // West Avenue (connected East to Bắc 1 & Bắc 2!)
  ['w_north', 'w_av_b2'],
  ['w_av_b2', 'w_av_b1'],
  ['w_av_b1', 'w_int'],
  ['w_int', 'w_south'],
  ['w_south', 'w_s_108'],
  ['w_s_108', 'w_s_152'],
  ['w_s_152', 'w_s_198'],
  ['w_s_198', 'w_s_244'],
  ['w_s_244', 'w_s_294'],
  ['w_s_294', 'w_s_344'],
  // Unified Southern & South-Central E-W Avenues (Đông BV 1, Nam 2, Nam 3, Nam 4, Nam 5, Đại Lộ Nam 6) + Direct Links to Vinhomes Ocean Park!
  ['w_s_108', 'sh_e_108'],
  ['sh_e_108', 'sc_m_108'],
  ['sc_m_108', 'sc_o_108'],
  ['s2_310', 'sh_w_152'],
  ['sh_w_152', 'w_s_152'],
  ['w_s_152', 'sh_e_152'],
  ['sh_e_152', 'sc_m_152'],
  ['sc_m_152', 'sc_o_152'],
  ['sc_o_152', 'vh_n_w'],
  ['sw_fw_198', 'sw_m_198'],
  ['sw_m_198', 'sh_w_198'],
  ['sh_w_198', 'w_s_198'],
  ['w_s_198', 'sh_e_198'],
  ['sh_e_198', 'sc_m_198'],
  ['sc_m_198', 'sc_o_198'],
  ['sw_fw_244', 'sw_m_244'],
  ['sw_m_244', 'sh_w_244'],
  ['sh_w_244', 'w_s_244'],
  ['w_s_244', 'sh_e_244'],
  ['sh_e_244', 'sc_m_244'],
  ['sc_m_244', 'sc_o_244'],
  ['sw_fw_294', 'sw_m_294'],
  ['sw_m_294', 'sh_w_294'],
  ['sh_w_294', 'w_s_294'],
  ['w_s_294', 'sh_e_294'],
  ['sh_e_294', 'sc_m_294'],
  ['sc_m_294', 'sc_o_294'],
  ['sw_fw_344', 'sw_m_344'],
  ['sw_m_344', 'sh_w_344'],
  ['sh_w_344', 'w_s_344'],
  ['w_s_344', 'sh_e_344'],
  ['sh_e_344', 'sc_m_344'],
  ['sc_m_344', 'sc_o_344'],
  ['sc_o_344', 'vh_s_w'],
  // All 6 Southern N-S Ring Connectors
  ['sw_fw_198', 'sw_fw_244'],
  ['sw_fw_244', 'sw_fw_294'],
  ['sw_fw_294', 'sw_fw_344'],
  ['s2_589', 'sw_m_198'],
  ['sw_m_198', 'sw_m_244'],
  ['sw_m_244', 'sw_m_294'],
  ['sw_m_294', 'sw_m_344'],
  ['sh_w_152', 'sh_w_198'],
  ['sh_w_198', 'sh_w_244'],
  ['sh_w_244', 'sh_w_294'],
  ['sh_w_294', 'sh_w_344'],
  ['sh_e_108', 'sh_e_152'],
  ['sh_e_152', 'sh_e_198'],
  ['sh_e_198', 'sh_e_244'],
  ['sh_e_244', 'sh_e_294'],
  ['sh_e_294', 'sh_e_344'],
  ['sc_m_108', 'sc_m_152'],
  ['sc_m_152', 'sc_m_198'],
  ['sc_m_198', 'sc_m_244'],
  ['sc_m_244', 'sc_m_294'],
  ['sc_m_294', 'sc_m_344'],
  ['sc_o_108', 'sc_o_152'],
  ['sc_o_152', 'sc_o_198'],
  ['sc_o_198', 'sc_o_244'],
  ['sc_o_244', 'sc_o_294'],
  ['sc_o_294', 'sc_o_344'],
  // Đường Nội Khu Bắc 1 (Z=-22)
  ['b1_w', 'b1_857'],
  ['b1_857', 'b1_733'],
  ['b1_733', 'b1_609'],
  ['b1_609', 'b1_581'],
  ['b1_581', 'b1_485'],
  ['b1_485', 'b1_439'],
  ['b1_439', 'b1_393'],
  ['b1_393', 'w_av_b1'],
  // Đường Nội Khu Bắc 2 (Z=-60)
  ['b2_w', 'b2_733'],
  ['b2_733', 'b2_581'],
  ['b2_581', 'b2_551'],
  ['b2_551', 'b2_439'],
  ['b2_439', 'b2_405'],
  ['b2_405', 'w_av_b2'],
  // Đường Nội Khu Bắc 3 (Z=-98)
  ['b3_w', 'b3_733'],
  ['b3_733', 'b3_551'],
  ['b3_551', 'b3_405'],
  ['b3_405', 'b3_265'],
  // North Alley Vertical Links
  ['w_857', 'b1_857'],
  ['w_733', 'b1_733'],
  ['w_609', 'b1_609'],
  ['w_485', 'b1_485'],
  ['w_393', 'b1_393'],
  ['b1_733', 'b2_733'],
  ['b1_581', 'b2_581'],
  ['b1_439', 'b2_439'],
  ['b2_733', 'b3_733'],
  ['b2_551', 'b3_551'],
  ['b2_405', 'b3_405'],
  // Đường Nội Khu Nam 1 (Z=98) & Nam 2 (Z=152) + South Alleys
  ['n1_w', 'n1_857'],
  ['n1_857', 'n1_733'],
  ['n1_733', 'n1_609'],
  ['n1_609', 'n1_589'],
  ['n1_589', 'n1_485'],
  ['n1_485', 'n1_459'],
  ['n1_459', 'n1_430'],
  ['s2_w', 's2_733'],
  ['s2_733', 's2_589'],
  ['s2_589', 's2_459'],
  ['s2_459', 's2_430'],
  ['s2_430', 's2_310'],
  ['w_857', 'n1_857'],
  ['w_733', 'n1_733'],
  ['w_609', 'n1_609'],
  ['w_485', 'n1_485'],
  ['w_430', 'n1_430'],
  ['n1_430', 's2_430'],
  ['n1_733', 's2_733'],
  ['n1_589', 's2_589'],
  ['n1_459', 's2_459'],
  // Phố Đi Bộ + Cầu Sông Hàn + North Bank + Vinhomes 1, 2 & 3 N-S + E-W Links
  ['e_nb_top', 'e_nb'],
  ['e_nb', 'e_bd'],
  ['e_bd', 'e_int'],
  ['e_int', 'vh_n'],
  ['vh_n', 'vh_s'],
  ['vh_s', 'vh_end'],
  ['vh_n_w', 'vh_n'],
  ['vh_n', 'vh_n_e'],
  ['vh_n_e', 'vh2_n'],
  ['vh2_n', 'vh2b_n'],
  ['vh2b_n', 'vh2_n_e'],
  ['vh2_n_e', 'vh3_n'],
  ['vh3_n', 'vh3_n_e'],
  ['vh_s_w', 'vh_s'],
  ['vh_s', 'vh_s_e'],
  ['vh_s_e', 'vh2_s'],
  ['vh2_s', 'vh2b_s'],
  ['vh2b_s', 'vh2_s_e'],
  ['vh2_s_e', 'vh3_s'],
  ['vh3_s', 'vh3_s_e'],
  // Vinhomes Ocean Park Trung Tâm & 2 Đông N-S Boulevards (X = 282.0 & 436.5, Z = 148..428)
  ['vh_n_e', 'vh_s_e'],
  ['vh_s_e', 'vhm_end'],
  ['vh2b_n', 'vh2b_s'],
  ['vh2b_s', 'vh2b_end'],
  // Sơn Tây + Cầu Rồng + North Bank + Vinhomes 2 N-S
  ['fe_nb_top', 'fe_nb'],
  ['fe_nb', 'fe_bd'],
  ['fe_bd', 'fe_int'],
  ['fe_int', 'vh2_n'],
  ['vh2_n', 'vh2_s'],
  ['vh2_s', 'vh2_end'],
  // DIOR / Paris Avenue + Cầu Trần Thị Lý + North Bank + Vinhomes 3 N-S
  ['ttl_nb_top', 'ttl_nb'],
  ['ttl_nb', 'dior_bd'],
  ['dior_bd', 'dior_int'],
  ['dior_int', 'vh3_n'],
  ['vh3_n', 'vh3_s'],
  ['vh3_s', 'vh3_end'],
  // Đường Bạch Đằng
  ['w_north', 'bd_west'],
  ['bd_west', 'e_bd'],
  ['e_bd', 'fe_bd'],
  ['fe_bd', 'dior_bd'],
  ['dior_bd', 'bd_east'],
  // Đường Trần Hưng Đạo (Bờ Bắc)
  ['nb_west', 'e_nb'],
  ['e_nb', 'fe_nb'],
  ['fe_nb', 'ttl_nb'],
  ['ttl_nb', 'nb_east'],
];

const NODE_BY_ID: Record<string, GraphNode> = Object.fromEntries(ROAD_NODES.map((n) => [n.id, n]));

function projectPointToSegment(
  px: number,
  pz: number,
  ax: number,
  az: number,
  bx: number,
  bz: number
): { x: number; z: number; distSq: number } {
  const vx = bx - ax;
  const vz = bz - az;
  const lenSq = vx * vx + vz * vz;
  let t = 0;
  if (lenSq > 1e-6) {
    t = ((px - ax) * vx + (pz - az) * vz) / lenSq;
    if (t < 0) t = 0;
    else if (t > 1) t = 1;
  }
  const cx = ax + vx * t;
  const cz = az + vz * t;
  const dx = px - cx;
  const dz = pz - cz;
  return { x: cx, z: cz, distSq: dx * dx + dz * dz };
}

interface ClosestEdgeHit {
  edgeIdx: number;
  uId: string;
  vId: string;
  x: number;
  z: number;
  distSq: number;
}

function findClosestRoadEdge(px: number, pz: number): ClosestEdgeHit {
  let best: ClosestEdgeHit = {
    edgeIdx: 0,
    uId: ROAD_EDGE_PAIRS[0][0],
    vId: ROAD_EDGE_PAIRS[0][1],
    x: 0,
    z: 29,
    distSq: Infinity,
  };
  for (let i = 0; i < ROAD_EDGE_PAIRS.length; i++) {
    const [uId, vId] = ROAD_EDGE_PAIRS[i];
    const u = NODE_BY_ID[uId];
    const v = NODE_BY_ID[vId];
    const hit = projectPointToSegment(px, pz, u.x, u.z, v.x, v.z);
    if (hit.distSq < best.distSq) {
      best = { edgeIdx: i, uId, vId, x: hit.x, z: hit.z, distSq: hit.distSq };
    }
  }
  return best;
}

export interface GpsRouteResult {
  points: Array<{ x: number; z: number }>;
  totalMeters: number;
}

/**
 * Computes a GTA-style shortest street + bridge route from (startX, startZ) to (goalX, goalZ).
 */
export function computeCityGpsRoute(
  startX: number,
  startZ: number,
  goalX: number,
  goalZ: number
): GpsRouteResult {
  const directDist = Math.hypot(goalX - startX, goalZ - startZ);
  if (directDist <= 28) {
    return {
      points: [
        { x: startX, z: startZ },
        { x: goalX, z: goalZ },
      ],
      totalMeters: Math.round(directDist),
    };
  }

  const startHit = findClosestRoadEdge(startX, startZ);
  const goalHit = findClosestRoadEdge(goalX, goalZ);

  // If both start & goal snap to the same road segment, follow it directly
  if (startHit.edgeIdx === goalHit.edgeIdx) {
    const pts = [
      { x: startX, z: startZ },
      { x: startHit.x, z: startHit.z },
      { x: goalHit.x, z: goalHit.z },
      { x: goalX, z: goalZ },
    ];
    return {
      points: pts,
      totalMeters: Math.round(computePolylineLength(pts)),
    };
  }

  // Build adjacency list with virtual start/goal projection nodes
  const adj = new Map<string, Array<{ to: string; cost: number }>>();
  const coords = new Map<string, { x: number; z: number }>();

  for (const n of ROAD_NODES) {
    adj.set(n.id, []);
    coords.set(n.id, { x: n.x, z: n.z });
  }
  const addEdge = (a: string, b: string) => {
    const ca = coords.get(a)!;
    const cb = coords.get(b)!;
    const w = Math.hypot(cb.x - ca.x, cb.z - ca.z);
    adj.get(a)!.push({ to: b, cost: w });
    adj.get(b)!.push({ to: a, cost: w });
  };
  for (const [u, v] of ROAD_EDGE_PAIRS) {
    addEdge(u, v);
  }

  coords.set('__start__', { x: startHit.x, z: startHit.z });
  adj.set('__start__', []);
  addEdge('__start__', startHit.uId);
  addEdge('__start__', startHit.vId);

  coords.set('__goal__', { x: goalHit.x, z: goalHit.z });
  adj.set('__goal__', []);
  addEdge('__goal__', goalHit.uId);
  addEdge('__goal__', goalHit.vId);

  // Dijkstra across ~31 nodes (< 0.05ms)
  const dist = new Map<string, number>();
  const prev = new Map<string, string | null>();
  const unvisited = new Set<string>(adj.keys());
  for (const k of unvisited) {
    dist.set(k, Infinity);
    prev.set(k, null);
  }
  dist.set('__start__', 0);

  while (unvisited.size > 0) {
    let cur: string | null = null;
    let curD = Infinity;
    for (const k of unvisited) {
      const d = dist.get(k)!;
      if (d < curD) {
        curD = d;
        cur = k;
      }
    }
    if (!cur || cur === '__goal__' || curD === Infinity) break;
    unvisited.delete(cur);

    const neighbors = adj.get(cur) || [];
    for (const edge of neighbors) {
      if (!unvisited.has(edge.to)) continue;
      const alt = curD + edge.cost;
      if (alt < dist.get(edge.to)!) {
        dist.set(edge.to, alt);
        prev.set(edge.to, cur);
      }
    }
  }

  const nodePath: Array<{ x: number; z: number }> = [];
  let trace: string | null = '__goal__';
  while (trace) {
    const c = coords.get(trace);
    if (c) nodePath.push(c);
    trace = prev.get(trace) ?? null;
  }
  nodePath.reverse();

  if (nodePath.length < 2) {
    const pts = [
      { x: startX, z: startZ },
      { x: goalX, z: goalZ },
    ];
    return { points: pts, totalMeters: Math.round(directDist) };
  }

  const rawPoints: Array<{ x: number; z: number }> = [{ x: startX, z: startZ }, ...nodePath, { x: goalX, z: goalZ }];
  // Deduplicate tiny segments < 0.8m
  const cleaned: Array<{ x: number; z: number }> = [rawPoints[0]];
  for (let i = 1; i < rawPoints.length; i++) {
    const last = cleaned[cleaned.length - 1];
    if (Math.hypot(rawPoints[i].x - last.x, rawPoints[i].z - last.z) >= 0.8) {
      cleaned.push(rawPoints[i]);
    }
  }
  if (cleaned.length === 1) cleaned.push({ x: goalX, z: goalZ });

  return {
    points: cleaned,
    totalMeters: Math.round(computePolylineLength(cleaned)),
  };
}

function computePolylineLength(pts: Array<{ x: number; z: number }>): number {
  let sum = 0;
  for (let i = 1; i < pts.length; i++) {
    sum += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z);
  }
  return sum;
}

/**
 * Returns a crisp Vietnamese district/street label for the player's current 3D position.
 */
export function detectCurrentCityZone(x: number, z: number, floor: number): string {
  // Far-West Coastal T-Junction, Đường Ven Biển Võ Nguyên Giáp, Sông Hàn Estuary & Mỹ Khê Tây Beach
  if (x < -960.0) {
    if (z < -165.0 && x < -996.0) return 'Cửa Biển Sông Hàn • Biển Mỹ Khê Tây';
    if (x < -1032.0) return 'Biển Mỹ Khê Tây • Khu Tắm Biển';
    if (x < -996.0) {
      if (z >= -24 && z <= 6) return 'Sân Bóng Chuyền Bãi Biển Mỹ Khê Tây';
      if (z >= 48 && z <= 70) return 'Quán Bar Dừa Tươi • Bãi Biển Mỹ Khê Tây';
      if (z >= 74 && z <= 102) return 'Khu Tắm Nước Ngọt & Thay Đồ Ven Biển';
      if (z >= 108 && z <= 136) return 'Trạm Thuê Mô Tô Nước & Chèo Kayak';
      return 'Bãi Cát Vàng Mỹ Khê Tây';
    }
    if (x < -981.4) return 'Phố Đi Bộ Ven Biển Mỹ Khê Tây';
    if (z >= -155.5 && z <= -135.0) return 'Ngã 3 Ven Biển • Sông Hàn';
    if (z >= 15.0 && z <= 43.0) return 'Ngã 3 Ven Biển • Đại Lộ Trung Tâm';
    if (z >= 332.0 && z <= 356.0) return 'Ngã 3 Ven Biển • Đại Lộ Nam 6';
    return 'Đường Ven Biển Võ Nguyên Giáp';
  }
  // Đường Ven Sông Bạch Đằng Tây & Bờ Kè Ven Sông Tây (connecting Võ Nguyên Giáp <-> Bạch Đằng along Sông Hàn)
  if (x >= -960.0 && x <= -214.0 && z >= -165.2 && z <= -134.0) {
    if (z < -153.4) return 'Bờ Kè Ven Sông Bạch Đằng Tây';
    return 'Đường Ven Sông Bạch Đằng Tây';
  }
  if (x >= -240.0 && x <= -214.0 && z >= -137.0 && z <= -125.0) {
    return 'Đường Ven Sông Bạch Đằng Tây';
  }
  // Specific sub-zones inside Mega Phố Cư Dân Tây (-960..-242 North, -960..-305 South, 56 Alleys, 5 Inner Streets & 22 Walkable Hàng Quán)
  for (let i = 0; i < WEST_WALKABLE_SHOPS.length; i++) {
    const s = WEST_WALKABLE_SHOPS[i];
    if (x >= s.minX && x <= s.maxX && z >= s.minZ && z <= s.maxZ) {
      return floor > 1 ? `${s.name} • Tầng ${floor}` : s.name;
    }
  }
  const market = findResidentialMarketAt(x, z);
  if (market) {
    return market.name;
  }
  const westAlley = findWestAlleyAt(x, z, 0.25);
  if (westAlley) {
    return westAlley.label;
  }
  if (x >= -434.15 && x <= -425.85 && z >= 37.2 && z <= 156.15) {
    return 'Đường Kết Nối Nam Tây · Cổng Trường';
  }
  if (x >= -960.15 && x <= -951.85 && z >= 193.8 && z <= 352.4) {
    return 'Đường Vành Đai Cực Tây Nam';
  }
  if (x >= -619.15 && x <= -610.85 && z >= 193.8 && z <= 352.4) {
    return 'Đường Trục Tây Nam Mở Rộng';
  }
  if (x >= -305.15 && x <= -296.85 && z >= 147.8 && z <= 352.4) {
    return 'Đường Kết Nối Tây Nam Bệnh Viện';
  }
  if (x >= -108.15 && x <= -99.85 && z >= 103.8 && z <= 352.4) {
    return 'Đường Kết Nối Đông Nam Bệnh Viện';
  }
  if (x >= -6.15 && x <= 2.15 && z >= 103.8 && z <= 352.4) {
    return 'Đường Trục Nam Trung Tâm';
  }
  if (x >= 91.85 && x <= 105.0 && z >= 103.8 && z <= 352.4) {
    return 'Đường Vành Đai Tây Ocean Park';
  }
  for (let i = 0; i < WEST_INNER_ROADS.length; i++) {
    const r = WEST_INNER_ROADS[i];
    if (z >= r.minZ - 0.15 && z <= r.maxZ + 0.15 && x >= r.x1 && x <= r.x2) {
      return r.name;
    }
  }
  if (x >= -960.0 && x <= 100.0 && z >= 352.4 && z <= 362.5) {
    return 'Công Viên Đại Lộ Nam Liên Khu';
  }
  if (x >= -241.0 && x <= -214.0 && z >= 88.0 && z <= 352.4) {
    return 'Đại Lộ Bệnh Viện Nam';
  }
  if (x > -100.0 && x <= 100.0 && z >= 104.0 && z <= 352.4) {
    return 'Khu Dân Cư Nam Trung Tâm • Kết Nối Ocean Park';
  }
  if ((x >= -305.0 && x <= -241.0 && z >= 135.0 && z <= 352.4) || (x >= -214.0 && x <= -100.0 && z >= 88.0 && z <= 352.4)) {
    return 'Khu Dân Cư Nam Bệnh Viện • Hẻm 210–272';
  }
  if (x >= -960.0 && x <= -241.0 && z >= -134.5 && z < -17.8) {
    if (z <= -102.0) {
      if (x >= -396.0 && x <= -362.0) return 'Công Viên Bắc Tổ 7 · Đường Bắc 3';
      return x > -362.0 ? 'Khu Dân Cư Bắc 3 · Sau Cyber' : 'Khu Phố Bắc 3 · Tổ Dân Phố 7';
    }
    if (z <= -64.0) {
      if (x >= -390.0 && x <= -362.0) return 'Sân Cầu Lông & Công Viên Tổ 5';
      return x > -362.0 ? 'Khu Phố Sau Cyber · Tổ 5' : 'Khu Phố Trong 2 · Tổ Dân Phố 5';
    }
    if (x >= -380.0 && x <= -362.0) return 'Nhà Văn Hóa Tổ Dân Phố Số 4';
    return x > -362.0 ? 'Khu Phố Sau Cyber & Bệnh Viện' : 'Khu Phố Trong 1 • Tổ Dân Phố 4';
  }
  if (x >= -960.0 && x <= -362.0 && z >= -18.0 && z <= 15.6) {
    return 'Phố Cư Dân Tây • Hẻm 425–905';
  }
  if (x >= -960.0 && x <= -305.0 && z >= 42.5 && z <= 352.4 && (x <= -426.0 || z >= 148.0)) {
    if (z >= 298.0) return 'Khu Đô Thị Nam 6 • Liên Kết Đại Lộ Ocean Park';
    if (z >= 248.0) return 'Khu Dân Cư Tây Nam Mở Rộng • Tổ Dân Phố 13';
    if (z >= 202.0) return 'Khu Dân Cư Tây Nam • Tổ Dân Phố 12';
    if (z >= 156.0) return x > -426.0 ? 'Khu Dân Cư Sau Trường THPT PCT' : 'Khu Phố Nam 3 · Tổ Dân Phố 8';
    if (z >= 134.0) return 'Vườn Hoa & Sân Chơi Tổ 6 · Khu Dân Cư Nam Tây';
    if (z >= 102.0) return 'Khu Phố Nam Trong · Tổ Dân Phố 6';
    if (z >= 76.2) return 'Sân Sinh Hoạt Nam · Khu Dân Cư Nam Tây';
    return 'Khu Dân Cư Nam Tây • Hẻm 426–850';
  }

  // Check exact inside building footprints first
  for (let i = 0; i < CITY_BUILDINGS.length; i++) {
    const b = CITY_BUILDINGS[i];
    if (x >= b.minX && x <= b.maxX && z >= b.minZ && z <= b.maxZ) {
      return floor > 1 ? `${b.label} • Tầng ${floor}` : b.label;
    }
  }

  // Bridges & River
  if (z >= -351 && z <= -126) {
    if (x >= 183 && x <= 204) return 'Cầu Sông Hàn';
    if (x >= 355 && x <= 385) return 'Cầu Rồng Đà Nẵng';
    if (x >= 488 && x <= 518) return 'Cầu Trần Thị Lý';
    if (x >= 139 && x <= 153 && z >= -143) return 'Cầu Tàu Bạch Đằng';
    return 'Bờ Sông Hàn';
  }
  if (z < -351) return 'Bờ Bắc • Trần Hưng Đạo';
  if (z >= -134.5 && z <= -107.0) return 'Đường Bạch Đằng';

  // Phan Châu Trinh High School Campus & West School District (Z = 40..150)
  if (x >= -425.5 && x < -363 && z >= 40 && z <= 150) {
    if (z >= 93) return 'Sân Bóng Rổ 3x3 & Skatepark';
    if (x <= -394) return 'Phố Ăn Vặt Cổng Trường';
    return 'Nhà Sách FAHASA & Hobby Manga';
  }
  if (x >= -364 && x <= -304 && z >= 40 && z <= 150) {
    return 'Trường THPT Phan Châu Trinh';
  }

  // Vinhomes South
  if (z >= 135) {
    if (x >= 469.75) {
      if (z >= 332) return 'Ngã Tư Nam Ocean Park 3';
      if (z <= 162 && x >= 488 && x <= 518) return 'Ngã Tư DIOR Nam';
      return 'Vinhomes Ocean Park 3';
    }
    if (x >= 403.25) {
      if (z >= 332) return 'Ngã Tư Nam Ocean Park 2 Đông';
      if (z <= 162 && x >= 421 && x <= 452) return 'Ngã Ba Ocean Park 2 Đông';
      return 'Vinhomes Ocean Park 2 Đông';
    }
    if (x >= 326) {
      if (z >= 332) return 'Ngã Tư Nam Ocean Park 2';
      if (z <= 162 && x >= 355 && x <= 385) return 'Ngã Tư Sơn Tây Nam';
      return 'Vinhomes Ocean Park 2';
    }
    if (x >= 238) {
      if (z >= 332) return 'Ngã Tư Nam Ocean Park Trung Tâm';
      if (z <= 162 && x >= 267 && x <= 297) return 'Ngã Ba Đại Lộ Ocean Park';
      return 'Vinhomes Ocean Park Trung Tâm';
    }
    if (z >= 332) return 'Ngã Tư Nam Ocean Park';
    return 'Vinhomes Ocean Park';
  }

  // Phố Đi Bộ
  if (x >= 176 && x <= 210 && z >= -107 && z <= 18) {
    return 'Phố Đi Bộ Sông Hàn';
  }

  // Intersections along Main Boulevard
  if (z >= 18 && z <= 40) {
    if (x >= -242 && x <= -212) return 'Ngã Tư Bệnh Viện';
    if (x >= 178 && x <= 209) return 'Ngã Tư Phố Đi Bộ';
    if (x >= 355 && x <= 385) return 'Ngã Tư Sơn Tây';
    if (x >= 488 && x <= 518) return 'Ngã Tư DIOR';
    return 'Đại Lộ Trung Tâm';
  }

  if (x >= 325 && x <= 416 && z < 18 && z > -108) return 'Khu Công Nghệ Sơn Tây';
  if (x >= 382 && x <= 495) return 'Đại Lộ Luxury';
  if (x <= -170) return 'Khu Tây • Bệnh Viện & Công An';
  if (x >= -25 && x <= 25) return 'Khu Trung Tâm • Card Shop';
  return 'Thành Phố Trung Tâm';
}
