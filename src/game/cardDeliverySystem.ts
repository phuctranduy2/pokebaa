import { computeCityGpsRoute, detectCurrentCityZone } from './cityMapData';
import {
  ALL_UNIQUE_BOOSTER_SETS,
  ALL_ONEPIECE_BOOSTER_SETS,
  applyExpGain,
  getBoosterSet,
  getUnlockedSetsForLevel,
  ONEPIECE_CARDS_DB,
  OwnedGradedSlabEntry,
  POKEMON_CARDS_DB,
  PokemonCard,
  ShopState,
} from './pokemonShopLogic';

export type DeliveryOrderCategory = 'pack_box' | 'vip_sniper' | 'rush_mystery' | 'multi_route';

export type DeliveryItemSource =
  | 'shop_inventory'
  | 'binder_card'
  | 'graded_slab'
  | 'station_dispatch';

export interface DeliveryDropLocation {
  poiId: string;
  locationName: string;
  districtName: string;
  x: number;
  z: number;
  categoryHint: 'commerce' | 'luxury' | 'civic' | 'food' | 'residence' | 'landmark' | 'tech';
  preferredRecipients: string[];
}

export interface DeliveryStopCargo {
  source: DeliveryItemSource;
  productId?: string;
  cardId?: string;
  slabId?: string;
  label: string;
  itemType: 'pack' | 'box' | 'single' | 'slab';
  imageUrl?: string;
  quantity: number;
  itemValue: number;
  wholesaleCost: number;
  themeColor?: string;
  isOnePiece?: boolean;
  /** Snapshot of slab in case order is cancelled and refunded */
  slabSnapshot?: OwnedGradedSlabEntry;
}

export interface DeliveryStop {
  stopId: string;
  poiId: string;
  locationName: string;
  districtName: string;
  recipientName: string;
  recipientAvatarColor: string;
  note: string;
  x: number;
  z: number;
  cargo: DeliveryStopCargo;
  deliveryFee: number;
  tipBonus: number;
  expReward: number;
  completed?: boolean;
}

export interface DeliveryOrder {
  id: string;
  code: string;
  category: DeliveryOrderCategory;
  title: string;
  subtitle: string;
  stops: DeliveryStop[];
  totalDistanceMeters: number;
  baseFee: number;
  rushBonusFee: number;
  itemPayout: number;
  tipBonus: number;
  expReward: number;
  reputationBonus: number;
  timeLimitSec: number | null;
  createdAtMs: number;
  minLevel: number;
}

export interface ActiveDeliveryMission extends DeliveryOrder {
  acceptedAtMs: number;
  deadlineAtMs: number | null;
  currentStopIndex: number;
  earnedCashSoFar: number;
  earnedExpSoFar: number;
  isLate: boolean;
}

export interface DeliveryDailyStats {
  day: number;
  deliveriesCompleted: number;
  rushCompleted: number;
  vipCompleted: number;
  multiRouteCompleted: number;
  packsDelivered: number;
  boxesDelivered: number;
  cardsDelivered: number;
  revenueEarned: number;
  claimedTaskIds: string[];
}

export interface ShopDeliveryState {
  availableOrders: DeliveryOrder[];
  activeMission: ActiveDeliveryMission | null;
  completedCount: number;
  totalEarnings: number;
  totalTips: number;
  streak: number;
  rating: number;
  lastBoardRefreshDay: number;
  dailyStats: DeliveryDailyStats;
}

export interface DailyTaskDefinition {
  id: string;
  title: string;
  description: string;
  target: number;
  rewardCash: number;
  rewardExp: number;
  metric: 'deliveries' | 'rush' | 'vip' | 'customers' | 'revenue' | 'packs_opened';
}

export interface DailyTaskProgress extends DailyTaskDefinition {
  current: number;
  completed: boolean;
  claimed: boolean;
}

export const SHOP_ORIGIN_X = 0.0;
export const SHOP_ORIGIN_Z = 20.5;

const RECIPIENT_AVATAR_COLORS = [
  '#f59e0b',
  '#38bdf8',
  '#10b981',
  '#ec4899',
  '#a855f7',
  '#fb7185',
  '#14b8a6',
  '#ef4444',
];

/**
 * Curated sidewalk/plaza drop-off coordinates grounded to actual CITY_POIS
 * so the player's Poké-Sport 155 motorbike and walking avatar can reach every NPC cleanly.
 */
export const DELIVERY_DROP_LOCATIONS: DeliveryDropLocation[] = [
  {
    poiId: 'poi_starbucks',
    locationName: 'Starbucks Coffee',
    districtName: 'Đại Lộ Trung Tâm',
    x: -21.0,
    z: 18.2,
    categoryHint: 'food',
    preferredRecipients: ['Minh Anh', 'Khánh Vy', 'Tuấn Kiệt'],
  },
  {
    poiId: 'poi_landmark81',
    locationName: 'Landmark 81 • Vincom',
    districtName: 'Trung Tâm Thành Phố',
    x: 0.0,
    z: 40.5,
    categoryHint: 'landmark',
    preferredRecipients: ['Bảo Long', 'Thảo Nhi', 'Gia Huy'],
  },
  {
    poiId: 'poi_porsche',
    locationName: 'Porsche Center Showroom',
    districtName: 'Đại Lộ Trung Tâm Đông',
    x: 68.0,
    z: 18.2,
    categoryHint: 'luxury',
    preferredRecipients: ['Doanh Nhân Hải', 'CEO Hoàng Nam', 'Quốc Bảo'],
  },
  {
    poiId: 'poi_aeon_mall',
    locationName: 'AEON Mall Megamall',
    districtName: 'Ngã Tư Phố Đi Bộ Nam',
    x: 128.0,
    z: 40.2,
    categoryHint: 'commerce',
    preferredRecipients: ['Bé Bắp', 'Chị Linh AEON', 'Hoàng Phúc'],
  },
  {
    poiId: 'poi_police',
    locationName: 'Đồn Công An Thành Phố',
    districtName: 'Khu Tây',
    x: -192.5,
    z: 18.2,
    categoryHint: 'civic',
    preferredRecipients: ['Chiến Sĩ Hùng', 'Anh Dũng', 'Trọng Nhân'],
  },
  {
    poiId: 'poi_hospital',
    locationName: 'Bệnh Viện Đa Khoa Quốc Tế',
    districtName: 'Ngã Tư Bệnh Viện',
    x: -271.0,
    z: 39.8,
    categoryHint: 'civic',
    preferredRecipients: ['Bác Sĩ Lan', 'Y Tá Phương', 'Dược Sĩ Kiên'],
  },
  {
    poiId: 'poi_phan_chau_trinh',
    locationName: 'Trường THPT Phan Châu Trinh',
    districtName: 'Khu Giáo Dục Tây',
    x: -333.0,
    z: 39.8,
    categoryHint: 'civic',
    preferredRecipients: ['Nhóm Bài Thủ 12A1', 'Lớp Trưởng Duy', 'Bạn Hà My'],
  },
  {
    poiId: 'poi_fahasa_bookstore',
    locationName: 'Nhà Sách FAHASA & Hobby Manga',
    districtName: 'Khu Giáo Dục Tây',
    x: -378.0,
    z: 40.0,
    categoryHint: 'commerce',
    preferredRecipients: ['Quản Lý Minh Anh', 'CLB Manga PCT', 'Bạn Khánh Vy'],
  },
  {
    poiId: 'poi_school_snack_alley',
    locationName: 'Phố Ăn Vặt Cổng Trường',
    districtName: 'Khu Giáo Dục Tây',
    x: -410.0,
    z: 40.0,
    categoryHint: 'food',
    preferredRecipients: ['Cô Chủ Trà Sữa', 'Hội Ăn Vặt 11A2', 'Bạn Gia Bảo'],
  },
  {
    poiId: 'poi_youth_basketball_park',
    locationName: 'Sân Bóng Rổ 3x3 & Skatepark',
    districtName: 'Khu Giáo Dục Tây',
    x: -394.0,
    z: 96.0,
    categoryHint: 'landmark',
    preferredRecipients: ['Đội Bóng Rổ PCT', 'Skater Quốc Anh', 'Huấn Luyện Viên Sơn'],
  },
  {
    poiId: 'poi_cyber_stadium',
    locationName: 'Cyber Stadium • E-Sport',
    districtName: 'Khu Tây',
    x: -352.0,
    z: 16.5,
    categoryHint: 'tech',
    preferredRecipients: ['Streamer Minh Khôi', 'Team E-Sport PCT', 'Quản Lý Cyber'],
  },
  {
    poiId: 'poi_west_residential',
    locationName: 'Phố Cư Dân Tây • Hẻm 425–905',
    districtName: 'Khu Dân Cư Tây',
    x: -393.6,
    z: 16.8,
    categoryHint: 'residence',
    preferredRecipients: ['Cô Ba Tạp Hóa', 'Chú Bảy Sửa Xe', 'Quán Hủ Tiếu 545'],
  },
  {
    poiId: 'poi_west_residential_rear',
    locationName: 'Nhà Văn Hóa Tổ 4 & Khu Phố Sau Cyber',
    districtName: 'Khu Dân Cư Tây Bắc',
    x: -371.0,
    z: -24.5,
    categoryHint: 'residence',
    preferredRecipients: ['Bác Tổ Trưởng Tổ 4', 'Chú Năm Cờ Tướng', 'Chị Hoa Nội Khu'],
  },
  {
    poiId: 'poi_shop_n2_oc_sau_cyber',
    locationName: 'Quán Ốc & Nướng Sau Cyber',
    districtName: 'Khu Phố Sau Cyber',
    x: -303.5,
    z: -28.0,
    categoryHint: 'food',
    preferredRecipients: ['Chú Tám Ốc Nướng', 'Anh Quân Shipper', 'Khách Bàn Ngoài'],
  },
  {
    poiId: 'poi_shop_n2_trasua_cyber',
    locationName: 'Cafe & Bi-a Sau Bệnh Viện',
    districtName: 'Khu Phố Sau Cyber',
    x: -260.6,
    z: -28.0,
    categoryHint: 'food',
    preferredRecipients: ['Bạn Duy Bi-a', 'Chị Thảo Trà Sữa', 'Bác Sĩ Ca Trực'],
  },
  {
    poiId: 'poi_west_badminton_t5',
    locationName: 'Sân Cầu Lông Tổ 5 & Khu Tây Bắc',
    districtName: 'Khu Dân Cư Tây Bắc',
    x: -376.0,
    z: -62.0,
    categoryHint: 'residence',
    preferredRecipients: ['CLB Cầu Lông Tổ 5', 'Bác Sĩ Nha Khoa 605', 'Anh Hùng Hẻm 545'],
  },
  {
    poiId: 'poi_west_north3_park',
    locationName: 'Công Viên Bắc Tổ 7 · Đường Bắc 3',
    districtName: 'Khu Dân Cư Bắc 3',
    x: -378.0,
    z: -99.0,
    categoryHint: 'landmark',
    preferredRecipients: ['Tổ Trưởng Tổ 7', 'Bác Tư Tập Thể Dục', 'Quán Cháo Vịt Bắc 3'],
  },
  {
    poiId: 'poi_west_residential_south',
    locationName: 'Khu Dân Cư Nam Tây • Hẻm 426–850',
    districtName: 'Khu Dân Cư Nam Tây',
    x: -485.6,
    z: 40.5,
    categoryHint: 'residence',
    preferredRecipients: ['Cô Út Cơm Tấm', 'Anh Tùng Bún Đậu', 'O Nga Bún Bò Huế 490'],
  },
  {
    poiId: 'poi_market_north',
    locationName: 'Chợ Bắc Tây • Chợ Dân Sinh Khu Bắc',
    districtName: 'Khu Dân Cư Bắc 1',
    x: -545.0,
    z: -24.5,
    categoryHint: 'commerce',
    preferredRecipients: ['Cô Mai Hoa Tươi', 'Chú Tám Hải Sản', 'Chị Hạnh Bún Mắm'],
  },
  {
    poiId: 'poi_market_south',
    locationName: 'Chợ Nam Tây • Chợ Dân Sinh Khu Nam',
    districtName: 'Khu Dân Cư Nam Tây',
    x: -556.6,
    z: 100.5,
    categoryHint: 'commerce',
    preferredRecipients: ['Cô Ba Chè Thập Cẩm', 'Anh Minh Trái Cây Miền Tây', 'Bác Bảo Vệ Bãi Xe Chợ'],
  },
  {
    poiId: 'poi_west_south_inner',
    locationName: 'Đường Nội Khu Nam & Vườn Hoa Tổ 6–8',
    districtName: 'Khu Dân Cư Nam Tây',
    x: -609.6,
    z: 98.0,
    categoryHint: 'residence',
    preferredRecipients: ['Chủ Tiệm Vàng Kim Phát', 'Cô Sáu Tạp Hóa 490/5', 'Chị Lan Hẻm 550'],
  },
  {
    poiId: 'poi_shop_s3_taphoa_sau_truong',
    locationName: 'Tạp Hóa & Trà Chanh Sau Trường PCT',
    districtName: 'Khu Sau Trường THPT PCT',
    x: -390.5,
    z: 158.0,
    categoryHint: 'food',
    preferredRecipients: ['Cô Thu Trà Chanh', 'Hội Học Sinh 12A1', 'Chú Bảo Vệ Trường'],
  },
  {
    poiId: 'poi_toxic',
    locationName: 'TOXIC Beer Club',
    districtName: 'Phố Đi Bộ Sông Hàn',
    x: 182.8,
    z: 2.0,
    categoryHint: 'food',
    preferredRecipients: ['DJ Kenzo', 'Quản Lý Phong', 'MC Tín'],
  },
  {
    poiId: 'poi_khoi',
    locationName: 'Khói Food Garden',
    districtName: 'Phố Đi Bộ Sông Hàn',
    x: 204.2,
    z: -26.0,
    categoryHint: 'food',
    preferredRecipients: ['Bếp Trưởng Hùng', 'Ngọc Mai', 'Anh Tài'],
  },
  {
    poiId: 'poi_viewing_pier',
    locationName: 'Cầu Tàu Cá Chép Hóa Rồng',
    districtName: 'Đường Bạch Đằng',
    x: 146.0,
    z: -129.0,
    categoryHint: 'landmark',
    preferredRecipients: ['Nhiếp Ảnh Gia Khoa', 'Cặp Đôi Minh - Trang', 'Bạn Đức'],
  },
  {
    poiId: 'poi_vietcombank',
    locationName: 'Ngân Hàng Vietcombank',
    districtName: 'Đại Lộ Trung Tâm Đông',
    x: 251.0,
    z: 18.2,
    categoryHint: 'civic',
    preferredRecipients: ['Trưởng Phòng Tuấn', 'Chị Ngọc VCB', 'Anh Vũ'],
  },
  {
    poiId: 'poi_casa_riva',
    locationName: 'CASA RIVA • ThaiGrand Hotel',
    districtName: 'Khu Khách Sạn Sông Hàn',
    x: 284.0,
    z: -48.5,
    categoryHint: 'residence',
    preferredRecipients: ['Khách VIP Phòng 201', 'Lễ Tân Thảo', 'Mr. Somchai'],
  },
  {
    poiId: 'poi_sun_wheel',
    locationName: 'Cầu Tình Yêu • Bến Du Thuyền',
    districtName: 'Bờ Bắc Sông Hàn',
    x: 279.0,
    z: -350.0,
    categoryHint: 'landmark',
    preferredRecipients: ['Hướng Dẫn Viên Vy', 'Gia Đình Anh Sơn', 'Team Review'],
  },
  {
    poiId: 'poi_apple',
    locationName: 'Apple Flagship Store',
    districtName: 'Khu Công Nghệ Sơn Tây',
    x: 381.0,
    z: -31.0,
    categoryHint: 'tech',
    preferredRecipients: ['Kỹ Thuật Viên Tùng', 'Reviewer Công Nghệ', 'Bảo Khang'],
  },
  {
    poiId: 'poi_sony',
    locationName: 'SONY Flagship Ginza',
    districtName: 'Góc Bạch Đằng • Sơn Tây',
    x: 381.0,
    z: -88.2,
    categoryHint: 'tech',
    preferredRecipients: ['Photographer Nam', 'Chị Hạnh Sony', 'Minh Trí'],
  },
  {
    poiId: 'poi_katinat',
    locationName: 'KATINAT Coffee & Tea House',
    districtName: 'Đường Sơn Tây Nam',
    x: 359.5,
    z: 82.0,
    categoryHint: 'food',
    preferredRecipients: ['Barista Đăng', 'Quỳnh Như', 'Nhóm Bạn Katinat'],
  },
  {
    poiId: 'poi_vpbank',
    locationName: 'Ngân Hàng VPBank',
    districtName: 'Đường Sơn Tây Nam',
    x: 381.0,
    z: 86.0,
    categoryHint: 'civic',
    preferredRecipients: ['Giám Đốc Chi Nhánh', 'Thanh Hà VPB', 'Anh Quân'],
  },
  {
    poiId: 'poi_louis_vuitton',
    locationName: 'Louis Vuitton Flagship',
    districtName: 'Đại Lộ Luxury',
    x: 397.0,
    z: 18.2,
    categoryHint: 'luxury',
    preferredRecipients: ['Stylist Chloe', 'Anh Thành VIP', 'Khách Hàng Diamond'],
  },
  {
    poiId: 'poi_gucci',
    locationName: 'Gucci Palazzo',
    districtName: 'Đại Lộ Luxury',
    x: 423.9,
    z: 18.2,
    categoryHint: 'luxury',
    preferredRecipients: ['Nhà Sưu Tập Marco', 'Chị Thanh Gucci', 'Trần Bảo'],
  },
  {
    poiId: 'poi_dior',
    locationName: 'DIOR Flagship Boutique',
    districtName: 'Ngã Tư DIOR',
    x: 474.6,
    z: 18.2,
    categoryHint: 'luxury',
    preferredRecipients: ['Tiểu Thư Bảo Ngọc', 'Quản Lý Dior', 'Anh Khôi Paris'],
  },
  {
    poiId: 'poi_prada',
    locationName: 'PRADA Milano',
    districtName: 'Ngã Tư DIOR Nam',
    x: 474.6,
    z: 40.2,
    categoryHint: 'luxury',
    preferredRecipients: ['Sếp Hưng Prada', 'Chị Diễm My', 'Hoàng Bách'],
  },
  {
    poiId: 'poi_vinhomes',
    locationName: 'Vinhomes Ocean Park 1',
    districtName: 'Shophouse S1-08',
    x: 182.5,
    z: 185.0,
    categoryHint: 'residence',
    preferredRecipients: ['Cư Dân Căn S1-08', 'Anh Tiến Vinhomes', 'Bé Bin'],
  },
  {
    poiId: 'poi_vinhomes_2',
    locationName: 'Vinhomes Ocean Park 2',
    districtName: 'Shophouse S2-12',
    x: 359.0,
    z: 185.0,
    categoryHint: 'residence',
    preferredRecipients: ['Cư Dân Căn S2-12', 'Chị Hương VH2', 'Minh Khôi'],
  },
  {
    poiId: 'poi_vinhomes_3',
    locationName: 'Vinhomes Ocean Park 3',
    districtName: 'Shophouse Paris P3-05',
    x: 492.0,
    z: 185.0,
    categoryHint: 'residence',
    preferredRecipients: ['Chủ Biệt Thự P3-05', 'Anh Việt Ocean 3', 'Gia Bảo'],
  },
];

export const DAILY_TASKS_CONFIG: DailyTaskDefinition[] = [
  {
    id: 'dt_deliver_1',
    title: 'Khởi Động Shipper',
    description: 'Hoàn thành 1 đơn giao hàng PokeShip trong ngày',
    target: 1,
    rewardCash: 35,
    rewardExp: 18,
    metric: 'deliveries',
  },
  {
    id: 'dt_deliver_3',
    title: 'Tay Lái Lụa Thành Phố',
    description: 'Hoàn thành 3 đơn giao hàng PokeShip trong ngày',
    target: 3,
    rewardCash: 95,
    rewardExp: 42,
    metric: 'deliveries',
  },
  {
    id: 'dt_rush_1',
    title: 'Giao Hỏa Tốc Đúng Giờ',
    description: 'Hoàn thành 1 đơn Hỏa Tốc trước khi hết đồng hồ đếm ngược',
    target: 1,
    rewardCash: 70,
    rewardExp: 30,
    metric: 'rush',
  },
  {
    id: 'dt_vip_1',
    title: 'Áp Tải Thẻ Hiếm VIP',
    description: 'Giao thành công 1 đơn Thẻ Hiếm / Slab PSA-CGC cho khách VIP',
    target: 1,
    rewardCash: 85,
    rewardExp: 35,
    metric: 'vip',
  },
  {
    id: 'dt_customers_5',
    title: 'Thu Ngân Nhanh Nhẹn',
    description: 'Phục vụ thanh toán cho 5 khách tại cửa hàng hôm nay',
    target: 5,
    rewardCash: 45,
    rewardExp: 20,
    metric: 'customers',
  },
  {
    id: 'dt_revenue_300',
    title: 'Doanh Thu Bùng Nổ',
    description: 'Đạt tổng doanh thu $300 trong ngày (bán tại tiệm + ship hàng)',
    target: 300,
    rewardCash: 110,
    rewardExp: 45,
    metric: 'revenue',
  },
];

const CARD_BY_ID_MAP: Map<string, PokemonCard> = (() => {
  const map = new Map<string, PokemonCard>();
  for (const c of POKEMON_CARDS_DB) map.set(c.id, c);
  for (const c of ONEPIECE_CARDS_DB) map.set(c.id, c);
  return map;
})();

export function resolveCardById(cardId: string): PokemonCard | undefined {
  return CARD_BY_ID_MAP.get(cardId);
}

export function createInitialDailyStats(day: number = 1): DeliveryDailyStats {
  return {
    day,
    deliveriesCompleted: 0,
    rushCompleted: 0,
    vipCompleted: 0,
    multiRouteCompleted: 0,
    packsDelivered: 0,
    boxesDelivered: 0,
    cardsDelivered: 0,
    revenueEarned: 0,
    claimedTaskIds: [],
  };
}

function makeSeedRandom(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function pickRandom<T>(arr: T[], rand: () => number): T {
  return arr[Math.floor(rand() * arr.length) % arr.length];
}

function buildCargoFromShopOrDispatch(
  shopState: ShopState,
  preference: 'pack_box' | 'vip_sniper' | 'rush_pack' | 'multi_item',
  rand: () => number,
  reservedProductCounts: Map<string, number>,
  reservedCardCounts: Map<string, number>,
  reservedSlabIds: Set<string>
): DeliveryStopCargo {
  // 1. VIP Sniper prefers owned Graded Slabs first, then high-value Binder Cards, then fallback VIP dispatch
  if (preference === 'vip_sniper') {
    const availSlabs = (shopState.gradedSlabs || []).filter((s) => !reservedSlabIds.has(s.id));
    if (availSlabs.length > 0) {
      const slabEntry = pickRandom(availSlabs, rand);
      reservedSlabIds.add(slabEntry.id);
      const vipMarkup = 1.32 + rand() * 0.22; // 132% - 154% market value
      const payout = Math.round((slabEntry.gradedPrice || slabEntry.rawPrice || 20) * vipMarkup * 100) / 100;
      return {
        source: 'graded_slab',
        slabId: slabEntry.id,
        cardId: slabEntry.card.id,
        label: `Slab ${slabEntry.slab.company} ${slabEntry.slab.grade} • ${slabEntry.card.name}`,
        itemType: 'slab',
        imageUrl: slabEntry.card.imageUrl,
        quantity: 1,
        itemValue: payout,
        wholesaleCost: slabEntry.rawPrice || slabEntry.card.marketPrice || 10,
        themeColor: '#f59e0b',
        isOnePiece: slabEntry.card.universe === 'onepiece',
        slabSnapshot: slabEntry,
      };
    }

    const ownedCards = Object.entries(shopState.binderCards || {})
      .map(([cid, count]) => ({
        cid,
        avail: count - (reservedCardCounts.get(cid) || 0),
        card: resolveCardById(cid),
      }))
      .filter((e): e is { cid: string; avail: number; card: PokemonCard } => Boolean(e.card) && e.avail >= 1)
      .sort((a, b) => (b.card.marketPrice || 0) - (a.card.marketPrice || 0));

    if (ownedCards.length > 0) {
      const topPool = ownedCards.slice(0, Math.min(8, ownedCards.length));
      const chosen = pickRandom(topPool, rand);
      reservedCardCounts.set(chosen.cid, (reservedCardCounts.get(chosen.cid) || 0) + 1);
      const basePrice = Math.max(4, chosen.card.marketPrice || 5);
      const vipMarkup = 1.35 + rand() * 0.2;
      const payout = Math.round(basePrice * vipMarkup * 100) / 100;
      return {
        source: 'binder_card',
        cardId: chosen.cid,
        label: `Thẻ Hiếm ${chosen.card.name} (${chosen.card.raritySymbol || '☆'})`,
        itemType: 'single',
        imageUrl: chosen.card.imageUrl,
        quantity: 1,
        itemValue: payout,
        wholesaleCost: Math.round(basePrice * 0.65 * 100) / 100,
        themeColor: chosen.card.cardColor || '#a855f7',
        isOnePiece: chosen.card.universe === 'onepiece',
      };
    }
  }

  // 2. Pack / Box from player's Shop Inventory
  const availInventory = shopState.inventory.filter((inv) => {
    const used = reservedProductCounts.get(inv.productId) || 0;
    return (inv.quantity || 0) - used >= 1 && (inv.type === 'pack' || inv.type === 'box');
  });

  if (availInventory.length > 0 && preference !== 'vip_sniper') {
    const inv = pickRandom(availInventory, rand);
    const remaining = (inv.quantity || 0) - (reservedProductCounts.get(inv.productId) || 0);
    const qty = inv.type === 'pack' ? Math.min(remaining, Math.max(1, Math.floor(rand() * 3) + 1)) : 1;
    reservedProductCounts.set(inv.productId, (reservedProductCounts.get(inv.productId) || 0) + qty);
    const cleanSetId = inv.productId.replace('_pack', '').replace('_box', '');
    const setMeta = getBoosterSet(cleanSetId);
    const unitRetail = Math.max(3, inv.retailPrice || (inv.type === 'box' ? 40 : 4.5));
    const itemPayout = Math.round(unitRetail * qty * 1.12 * 100) / 100;
    return {
      source: 'shop_inventory',
      productId: inv.productId,
      label: `${qty}x ${inv.name}`,
      itemType: inv.type === 'box' ? 'box' : 'pack',
      imageUrl: inv.imageUrl || (inv.type === 'box' ? setMeta.boxImageUrl : setMeta.packImageUrl),
      quantity: qty,
      itemValue: itemPayout,
      wholesaleCost: (inv.wholesaleCost || 2) * qty,
      themeColor: inv.themeColor || setMeta.themeColor || '#0ea5e9',
      isOnePiece: inv.productId.startsWith('op') || inv.productId.startsWith('eb') || inv.productId.startsWith('prb'),
    };
  }

  // 3. No matching stock yet: generate a real Shop Demand Order requiring actual inventory / binder stock
  const allSets = [...ALL_UNIQUE_BOOSTER_SETS, ...ALL_ONEPIECE_BOOSTER_SETS];
  const unlockedPool = allSets.filter((s) => s.unlockLevel <= Math.max(1, shopState.storeLevel || 1));
  const chosenSet = pickRandom(unlockedPool.length > 0 ? unlockedPool : allSets, rand);

  if (preference === 'vip_sniper') {
    const unlockedSetIds = new Set((unlockedPool.length > 0 ? unlockedPool : allSets).map((s) => s.id));
    const rarePool = [...POKEMON_CARDS_DB, ...ONEPIECE_CARDS_DB].filter(
      (c) =>
        (!c.setId || unlockedSetIds.has(c.setId)) &&
        (c.marketPrice || 0) >= 8
    );
    const chosenCard = pickRandom(
      rarePool.length > 0 ? rarePool : POKEMON_CARDS_DB,
      rand
    );
    const basePrice = Math.max(8, chosenCard.marketPrice || 15);
    const payout = Math.round(basePrice * 1.4 * 100) / 100;
    return {
      source: 'binder_card',
      cardId: chosenCard.id,
      label: `Thẻ Hiếm ${chosenCard.name} (${chosenCard.raritySymbol || '☆'})`,
      itemType: 'single',
      imageUrl: chosenCard.imageUrl,
      quantity: 1,
      itemValue: payout,
      wholesaleCost: Math.round(basePrice * 0.65 * 100) / 100,
      themeColor: chosenCard.cardColor || '#a855f7',
      isOnePiece: chosenCard.universe === 'onepiece',
    };
  }

  const isBox = preference === 'pack_box' ? rand() < 0.4 : rand() < 0.2;
  const qty = isBox ? 1 : Math.floor(rand() * 2) + 1;
  const estimatedRetail = isBox
    ? Math.max(30, chosenSet.boxRetailPrice || 40)
    : Math.max(3.5, chosenSet.packRetailPrice || 4.5);
  const estimatedWholesale = isBox
    ? Math.max(15, chosenSet.boxWholesalePrice || estimatedRetail * 0.55)
    : Math.max(1.8, chosenSet.packWholesalePrice || estimatedRetail * 0.55);
  const itemPayout = Math.round(estimatedRetail * qty * 1.12 * 100) / 100;
  return {
    source: 'shop_inventory',
    productId: `${chosenSet.id}_${isBox ? 'box' : 'pack'}`,
    label: isBox
      ? `1x Booster Box ${chosenSet.name}`
      : `${qty}x Pack ${chosenSet.name}`,
    itemType: isBox ? 'box' : 'pack',
    imageUrl: isBox ? chosenSet.boxImageUrl : chosenSet.packImageUrl,
    quantity: qty,
    itemValue: itemPayout,
    wholesaleCost: Math.round(estimatedWholesale * qty * 100) / 100,
    themeColor: chosenSet.themeColor,
    isOnePiece: chosenSet.universe === 'onepiece',
  };
}

function buildStopForLocation(
  loc: DeliveryDropLocation,
  prevX: number,
  prevZ: number,
  cargo: DeliveryStopCargo,
  category: DeliveryOrderCategory,
  rand: () => number,
  stopIndex: number
): { stop: DeliveryStop; routeMeters: number } {
  const route = computeCityGpsRoute(prevX, prevZ, loc.x, loc.z);
  const distMeters = Math.max(35, route.totalMeters);

  // Fee scales realistically with real city street distance + cargo tier
  const baseDistanceFee = 12 + distMeters * 0.095;
  const categoryMultiplier =
    category === 'vip_sniper' ? 1.4 : category === 'multi_route' ? 1.15 : category === 'rush_mystery' ? 1.25 : 1.0;
  const cargoTierBonus = cargo.itemType === 'box' ? 8 : cargo.itemType === 'slab' ? 12 : 3;
  const deliveryFee = Math.round((baseDistanceFee * categoryMultiplier + cargoTierBonus) * 100) / 100;

  const tipBonus = Math.round((6 + rand() * 10) * 100) / 100;
  const expReward = Math.max(8, Math.round(distMeters / 28) + (cargo.itemType === 'box' ? 8 : cargo.itemType === 'slab' ? 12 : 5));

  const notesByHint: Record<DeliveryDropLocation['categoryHint'], string[]> = {
    food: ['Giao ngay tại sảnh quán, mình đang ngồi bàn ngoài!', 'Tới nơi bấm [E] gọi mình ra nhận pack nhé!'],
    luxury: ['Giao tận tay tại sảnh Boutique, kiểm tra niêm phong giúp mình.', 'Khách VIP đang chờ mở hộp ngay tại cửa hàng!'],
    civic: ['Đứng chờ ngay cổng trước vỉa hè, cảm ơn shipper!', 'Giao giờ nghỉ trưa, tới nơi nhấn [E] bàn giao nhé.'],
    commerce: ['Mình đứng ngay cổng chính mặt tiền đường lớn.', 'Giao nhanh để tụi mình kịp bóc pack chung!'],
    residence: ['Chờ sẵn ở sảnh shophouse mặt đường đại lộ.', 'Đỗ xe ngay trước sảnh shophouse giao giúp mình nhé!'],
    landmark: ['Đứng check-in ngay quảng trường sát mặt đường.', 'Giao tại điểm hẹn ven đường, dễ tìm lắm!'],
    tech: ['Đứng trước cửa kính showroom mặt đường Sơn Tây.', 'Mang giúp mình bộ bài tới trước showroom nhé!'],
  };

  return {
    routeMeters: distMeters,
    stop: {
      stopId: `stop_${stopIndex}_${loc.poiId}_${Math.floor(rand() * 9999)}`,
      poiId: loc.poiId,
      locationName: loc.locationName,
      districtName: loc.districtName,
      recipientName: pickRandom(loc.preferredRecipients, rand),
      recipientAvatarColor: pickRandom(RECIPIENT_AVATAR_COLORS, rand),
      note: pickRandom(notesByHint[loc.categoryHint], rand),
      x: loc.x,
      z: loc.z,
      cargo,
      deliveryFee,
      tipBonus,
      expReward,
      completed: false,
    },
  };
}

export function generateDeliveryOrders(shopState: ShopState, seedOffset: number = 0): DeliveryOrder[] {
  const seed =
    Date.now() +
    seedOffset * 7919 +
    (shopState.currentDay || 1) * 131 +
    (shopState.storeLevel || 1) * 37;
  const rand = makeSeedRandom(seed);

  const reservedProductCounts = new Map<string, number>();
  const reservedCardCounts = new Map<string, number>();
  const reservedSlabIds = new Set<string>();

  const usedPoiIds = new Set<string>();
  const pickDistinctLocations = (count: number, filterFn?: (l: DeliveryDropLocation) => boolean): DeliveryDropLocation[] => {
    const pool = DELIVERY_DROP_LOCATIONS.filter((l) => !usedPoiIds.has(l.poiId) && (!filterFn || filterFn(l)));
    const fallbackPool = DELIVERY_DROP_LOCATIONS.filter(!filterFn ? () => true : filterFn);
    const chosen: DeliveryDropLocation[] = [];
    for (let i = 0; i < count; i++) {
      const candidatePool = pool.filter((l) => !chosen.includes(l));
      const src = candidatePool.length > 0 ? candidatePool : fallbackPool.filter((l) => !chosen.includes(l));
      const pick = pickRandom(src.length > 0 ? src : DELIVERY_DROP_LOCATIONS, rand);
      chosen.push(pick);
      usedPoiIds.add(pick.poiId);
    }
    return chosen;
  };

  const orders: DeliveryOrder[] = [];
  const nowMs = Date.now();

  // Order 1: Pack & Box Express (Standard)
  {
    const [loc] = pickDistinctLocations(1);
    const cargo = buildCargoFromShopOrDispatch(
      shopState,
      'pack_box',
      rand,
      reservedProductCounts,
      reservedCardCounts,
      reservedSlabIds
    );
    const { stop, routeMeters } = buildStopForLocation(loc, SHOP_ORIGIN_X, SHOP_ORIGIN_Z, cargo, 'pack_box', rand, 0);
    orders.push({
      id: `ord_pb_${nowMs}_1_${Math.floor(rand() * 999)}`,
      code: `PS-${100 + Math.floor(rand() * 899)}`,
      category: 'pack_box',
      title: `Giao ${cargo.itemType === 'box' ? 'Booster Box' : 'Booster Pack'} → ${loc.locationName}`,
      subtitle: 'Khách đặt mua từ kho hàng tiệm (nhận tiền hàng + phí ship + tip)',
      stops: [stop],
      totalDistanceMeters: routeMeters,
      baseFee: stop.deliveryFee,
      rushBonusFee: 0,
      itemPayout: cargo.itemValue,
      tipBonus: stop.tipBonus,
      expReward: stop.expReward,
      reputationBonus: 1,
      timeLimitSec: null,
      createdAtMs: nowMs,
      minLevel: 1,
    });
  }

  // Order 2: VIP Rare Card / Graded Slab Sniper
  {
    const [loc] = pickDistinctLocations(
      1,
      (l) => l.categoryHint === 'luxury' || l.categoryHint === 'residence' || l.categoryHint === 'tech'
    );
    const cargo = buildCargoFromShopOrDispatch(
      shopState,
      'vip_sniper',
      rand,
      reservedProductCounts,
      reservedCardCounts,
      reservedSlabIds
    );
    const { stop, routeMeters } = buildStopForLocation(loc, SHOP_ORIGIN_X, SHOP_ORIGIN_Z, cargo, 'vip_sniper', rand, 0);
    orders.push({
      id: `ord_vip_${nowMs}_2_${Math.floor(rand() * 999)}`,
      code: `VIP-${100 + Math.floor(rand() * 899)}`,
      category: 'vip_sniper',
      title: `Áp Tải Thẻ VIP → ${loc.locationName}`,
      subtitle: 'Khách trả giá cao 135%–155% thị trường + uy tín shop!',
      stops: [stop],
      totalDistanceMeters: routeMeters,
      baseFee: stop.deliveryFee,
      rushBonusFee: 0,
      itemPayout: cargo.itemValue,
      tipBonus: stop.tipBonus + 5,
      expReward: stop.expReward + 6,
      reputationBonus: 2,
      timeLimitSec: null,
      createdAtMs: nowMs,
      minLevel: 1,
    });
  }

  // Order 3: Timed Rush Express
  {
    const [loc] = pickDistinctLocations(1);
    const cargo = buildCargoFromShopOrDispatch(
      shopState,
      'rush_pack',
      rand,
      reservedProductCounts,
      reservedCardCounts,
      reservedSlabIds
    );
    const { stop, routeMeters } = buildStopForLocation(loc, SHOP_ORIGIN_X, SHOP_ORIGIN_Z, cargo, 'rush_mystery', rand, 0);
    // Generous yet exciting countdown based on motorbike speed (~15-20 m/s average with turns)
    const timeLimitSec = Math.max(65, Math.min(160, Math.round(routeMeters / 5.5 + 32)));
    const rushBonusFee = Math.round((stop.deliveryFee * 0.65 + 10) * 100) / 100;
    orders.push({
      id: `ord_rush_${nowMs}_3_${Math.floor(rand() * 999)}`,
      code: `FAST-${100 + Math.floor(rand() * 899)}`,
      category: 'rush_mystery',
      title: `Hỏa Tốc ${timeLimitSec}s → ${loc.locationName}`,
      subtitle: `Giao trước ${timeLimitSec} giây để nhận thêm +$${rushBonusFee.toFixed(0)} thưởng tốc độ!`,
      stops: [stop],
      totalDistanceMeters: routeMeters,
      baseFee: stop.deliveryFee,
      rushBonusFee,
      itemPayout: cargo.itemValue,
      tipBonus: stop.tipBonus,
      expReward: stop.expReward + 8,
      reputationBonus: 2,
      timeLimitSec,
      createdAtMs: nowMs,
      minLevel: 1,
    });
  }

  // Order 4: Multi-Stop City Route (2-3 stops)
  {
    const stopCount = shopState.storeLevel >= 3 && rand() < 0.45 ? 3 : 2;
    const locs = pickDistinctLocations(stopCount);
    const stops: DeliveryStop[] = [];
    let curX = SHOP_ORIGIN_X;
    let curZ = SHOP_ORIGIN_Z;
    let totalMeters = 0;
    let sumFee = 0;
    let sumItem = 0;
    let sumTip = 0;
    let sumExp = 0;

    for (let i = 0; i < locs.length; i++) {
      const cargo = buildCargoFromShopOrDispatch(
        shopState,
        'multi_item',
        rand,
        reservedProductCounts,
        reservedCardCounts,
        reservedSlabIds
      );
      const { stop, routeMeters } = buildStopForLocation(locs[i], curX, curZ, cargo, 'multi_route', rand, i);
      stops.push(stop);
      curX = locs[i].x;
      curZ = locs[i].z;
      totalMeters += routeMeters;
      sumFee += stop.deliveryFee;
      sumItem += cargo.itemValue;
      sumTip += stop.tipBonus;
      sumExp += stop.expReward;
    }

    const comboBonus = stopCount === 3 ? 28 : 16;
    orders.push({
      id: `ord_route_${nowMs}_4_${Math.floor(rand() * 999)}`,
      code: `TOUR-${100 + Math.floor(rand() * 899)}`,
      category: 'multi_route',
      title: `Lộ Trình ${stopCount} Điểm: ${locs.map((l) => l.locationName.split(' ')[0]).join(' → ')}`,
      subtitle: `Giao liên tiếp ${stopCount} khách dọc tuyến thành phố (+$${comboBonus} Combo hoàn chuỗi!)`,
      stops,
      totalDistanceMeters: totalMeters,
      baseFee: Math.round(sumFee * 100) / 100,
      rushBonusFee: comboBonus,
      itemPayout: Math.round(sumItem * 100) / 100,
      tipBonus: Math.round(sumTip * 100) / 100,
      expReward: sumExp + stopCount * 5,
      reputationBonus: stopCount,
      timeLimitSec: null,
      createdAtMs: nowMs,
      minLevel: 1,
    });
  }

  // Order 5: Long-haul / Vinhomes Ocean Park 1-3 Specialty Run
  {
    const [loc] = pickDistinctLocations(
      1,
      (l) =>
        l.poiId === 'poi_vinhomes' ||
        l.poiId === 'poi_vinhomes_2' ||
        l.poiId === 'poi_vinhomes_3' ||
        l.poiId === 'poi_sun_wheel'
    );
    const cargo = buildCargoFromShopOrDispatch(
      shopState,
      'pack_box',
      rand,
      reservedProductCounts,
      reservedCardCounts,
      reservedSlabIds
    );
    const { stop, routeMeters } = buildStopForLocation(loc, SHOP_ORIGIN_X, SHOP_ORIGIN_Z, cargo, 'pack_box', rand, 0);
    orders.push({
      id: `ord_vh_${nowMs}_5_${Math.floor(rand() * 999)}`,
      code: `OCN-${100 + Math.floor(rand() * 899)}`,
      category: 'pack_box',
      title: `Giao Khu Đô Thị → ${loc.locationName}`,
      subtitle: `Đơn đường dài qua ${detectCurrentCityZone(loc.x, loc.z, 1)} • Phí ship cao`,
      stops: [stop],
      totalDistanceMeters: routeMeters,
      baseFee: stop.deliveryFee,
      rushBonusFee: 0,
      itemPayout: cargo.itemValue,
      tipBonus: stop.tipBonus + 3,
      expReward: stop.expReward + 4,
      reputationBonus: 1,
      timeLimitSec: null,
      createdAtMs: nowMs,
      minLevel: 1,
    });
  }

  return orders;
}

export function createInitialDeliveryState(shopState?: ShopState): ShopDeliveryState {
  const baseDay = shopState?.currentDay || 1;
  const dummyState: ShopState =
    shopState ||
    ({
      storeLevel: 1,
      currentDay: baseDay,
      inventory: [],
      binderCards: {},
      gradedSlabs: [],
    } as unknown as ShopState);

  return {
    availableOrders: generateDeliveryOrders(dummyState, 0),
    activeMission: null,
    completedCount: 0,
    totalEarnings: 0,
    totalTips: 0,
    streak: 0,
    rating: 4.9,
    lastBoardRefreshDay: baseDay,
    dailyStats: createInitialDailyStats(baseDay),
  };
}

export function hasDeliverableShopStock(shopState: ShopState): boolean {
  const hasInv = (shopState.inventory || []).some(
    (inv) => (inv.quantity || 0) >= 1 && (inv.type === 'pack' || inv.type === 'box')
  );
  if (hasInv) return true;

  const hasCards = Object.values(shopState.binderCards || {}).some((qty) => qty >= 1);
  if (hasCards) return true;

  return (shopState.gradedSlabs || []).length > 0;
}

export function canAcceptDeliveryOrder(
  shopState: ShopState,
  order: DeliveryOrder
): { ok: boolean; reason?: string } {
  if (shopState.deliveryState?.activeMission) {
    return {
      ok: false,
      reason: 'Bạn đang chạy 1 đơn PokeShip khác! Hãy giao xong hoặc hủy đơn hiện tại trước.',
    };
  }
  if ((shopState.storeLevel || 1) < (order.minLevel || 1)) {
    return {
      ok: false,
      reason: `Đơn này yêu cầu cửa hàng Cấp ${order.minLevel}.`,
    };
  }

  // Verify cumulative stock across all stops
  const needInv = new Map<string, number>();
  const needInvLabel = new Map<string, string>();
  const needCards = new Map<string, number>();
  const needSlabs = new Set<string>();

  for (const st of order.stops) {
    const c = st.cargo;
    if (c.source === 'station_dispatch') {
      return {
        ok: false,
        reason: 'Đơn cũ không còn hợp lệ — hãy bấm "Tải lại đơn" để cập nhật theo kho tiệm.',
      };
    }
    if (c.source === 'shop_inventory' && c.productId) {
      needInv.set(c.productId, (needInv.get(c.productId) || 0) + c.quantity);
      if (!needInvLabel.has(c.productId)) {
        needInvLabel.set(c.productId, c.label);
      }
    } else if (c.source === 'binder_card' && c.cardId) {
      needCards.set(c.cardId, (needCards.get(c.cardId) || 0) + c.quantity);
    } else if (c.source === 'graded_slab' && c.slabId) {
      if (needSlabs.has(c.slabId)) {
        return { ok: false, reason: 'Đơn hàng tham chiếu trùng slab hiếm.' };
      }
      needSlabs.add(c.slabId);
    }
  }

  for (const [productId, reqQty] of needInv.entries()) {
    const invItem = shopState.inventory.find((i) => i.productId === productId);
    if (!invItem || (invItem.quantity || 0) < reqQty) {
      const cleanSetId = productId.replace('_pack', '').replace('_box', '');
      const setMeta = getBoosterSet(cleanSetId);
      const fallbackName = `${productId.endsWith('_box') ? 'Booster Box' : 'Pack'} ${setMeta.name}`;
      const displayName = invItem?.name || fallbackName;
      return {
        ok: false,
        reason: `Kho tiệm chưa có đủ ${reqQty}x ${displayName}. Hãy nhập hàng về kho trước!`,
      };
    }
  }

  for (const [cardId, reqQty] of needCards.entries()) {
    const owned = shopState.binderCards?.[cardId] || 0;
    if (owned < reqQty) {
      const cardName = resolveCardById(cardId)?.name || cardId;
      return {
        ok: false,
        reason: `Sổ thẻ chưa có đủ ${cardName} để giao đơn VIP. Hãy bóc pack để sưu tầm trước!`,
      };
    }
  }

  for (const slabId of needSlabs) {
    const found = (shopState.gradedSlabs || []).some((s) => s.id === slabId);
    if (!found) {
      return {
        ok: false,
        reason: 'Slab PSA/CGC trong đơn không còn trong túi trưng bày.',
      };
    }
  }

  return { ok: true };
}

export function acceptDeliveryOrder(
  shopState: ShopState,
  order: DeliveryOrder,
  nowMs: number = Date.now()
): { nextState: ShopState; accepted: boolean; reason?: string } {
  const check = canAcceptDeliveryOrder(shopState, order);
  if (!check.ok) {
    return { nextState: shopState, accepted: false, reason: check.reason };
  }

  const nextInventory = shopState.inventory.map((i) => ({ ...i }));
  const nextBinder = { ...(shopState.binderCards || {}) };
  let nextSlabs = [...(shopState.gradedSlabs || [])];

  // Deduct stock upfront (safely refunded if cancelled later)
  for (const st of order.stops) {
    const c = st.cargo;
    if (c.source === 'shop_inventory' && c.productId) {
      const inv = nextInventory.find((item) => item.productId === c.productId);
      if (inv) {
        inv.quantity = Math.max(0, (inv.quantity || 0) - c.quantity);
        inv.shelvedQuantity = Math.min(inv.quantity, inv.shelvedQuantity || 0);
      }
    } else if (c.source === 'binder_card' && c.cardId) {
      const rem = (nextBinder[c.cardId] || 0) - c.quantity;
      if (rem <= 0) delete nextBinder[c.cardId];
      else nextBinder[c.cardId] = rem;
    } else if (c.source === 'graded_slab' && c.slabId) {
      nextSlabs = nextSlabs.filter((s) => s.id !== c.slabId);
    }
  }

  const prevDelivery = shopState.deliveryState || createInitialDeliveryState(shopState);
  const activeMission: ActiveDeliveryMission = {
    ...order,
    stops: order.stops.map((s) => ({ ...s, completed: false })),
    acceptedAtMs: nowMs,
    deadlineAtMs: order.timeLimitSec ? nowMs + order.timeLimitSec * 1000 : null,
    currentStopIndex: 0,
    earnedCashSoFar: 0,
    earnedExpSoFar: 0,
    isLate: false,
  };

  return {
    accepted: true,
    nextState: {
      ...shopState,
      inventory: nextInventory,
      binderCards: nextBinder,
      gradedSlabs: nextSlabs,
      deliveryState: {
        ...prevDelivery,
        availableOrders: prevDelivery.availableOrders.filter((o) => o.id !== order.id),
        activeMission,
      },
    },
  };
}

export function cancelActiveDeliveryMission(shopState: ShopState): {
  nextState: ShopState;
  refundedCount: number;
} {
  const dState = shopState.deliveryState;
  const mission = dState?.activeMission;
  if (!dState || !mission) {
    return { nextState: shopState, refundedCount: 0 };
  }

  const nextInventory = shopState.inventory.map((i) => ({ ...i }));
  const nextBinder = { ...(shopState.binderCards || {}) };
  const nextSlabs = [...(shopState.gradedSlabs || [])];
  let refundedCount = 0;

  for (let i = mission.currentStopIndex; i < mission.stops.length; i++) {
    const st = mission.stops[i];
    if (st.completed) continue;
    const c = st.cargo;
    if (c.source === 'shop_inventory' && c.productId) {
      const inv = nextInventory.find((item) => item.productId === c.productId);
      if (inv) {
        inv.quantity = (inv.quantity || 0) + c.quantity;
        refundedCount += c.quantity;
      }
    } else if (c.source === 'binder_card' && c.cardId) {
      nextBinder[c.cardId] = (nextBinder[c.cardId] || 0) + c.quantity;
      refundedCount += c.quantity;
    } else if (c.source === 'graded_slab' && c.slabSnapshot) {
      if (!nextSlabs.some((s) => s.id === c.slabSnapshot!.id)) {
        nextSlabs.push(c.slabSnapshot);
      }
      refundedCount += 1;
    }
  }

  return {
    refundedCount,
    nextState: {
      ...shopState,
      inventory: nextInventory,
      binderCards: nextBinder,
      gradedSlabs: nextSlabs,
      deliveryState: {
        ...dState,
        activeMission: null,
        streak: 0,
        availableOrders:
          dState.availableOrders.length >= 3
            ? dState.availableOrders
            : generateDeliveryOrders(shopState, Math.floor(Math.random() * 100)),
      },
    },
  };
}

export interface StopCompletionSummary {
  nextState: ShopState;
  stopCompleted: DeliveryStop | null;
  missionFinished: boolean;
  cashEarned: number;
  tipEarned: number;
  bonusEarned: number;
  expEarned: number;
  wasOnTime: boolean;
  didLevelUp: boolean;
  newLevel: number;
}

export function completeCurrentDeliveryStop(
  shopState: ShopState,
  nowMs: number = Date.now()
): StopCompletionSummary {
  const dState = shopState.deliveryState;
  const mission = dState?.activeMission;
  if (!dState || !mission) {
    return {
      nextState: shopState,
      stopCompleted: null,
      missionFinished: false,
      cashEarned: 0,
      tipEarned: 0,
      bonusEarned: 0,
      expEarned: 0,
      wasOnTime: true,
      didLevelUp: false,
      newLevel: shopState.storeLevel,
    };
  }

  const idx = mission.currentStopIndex;
  const currentStop = mission.stops[idx];
  if (!currentStop) {
    return {
      nextState: shopState,
      stopCompleted: null,
      missionFinished: false,
      cashEarned: 0,
      tipEarned: 0,
      bonusEarned: 0,
      expEarned: 0,
      wasOnTime: true,
      didLevelUp: false,
      newLevel: shopState.storeLevel,
    };
  }

  const isFinalStop = idx >= mission.stops.length - 1;
  const wasOnTime = mission.deadlineAtMs === null || nowMs <= mission.deadlineAtMs;

  const stopItemPayout = currentStop.cargo.itemValue || 0;
  const stopFee = currentStop.deliveryFee || 0;
  const tipEarned = wasOnTime ? currentStop.tipBonus : Math.round(currentStop.tipBonus * 0.4 * 100) / 100;
  const bonusEarned =
    isFinalStop && ((mission.category === 'rush_mystery' && wasOnTime) || mission.category === 'multi_route')
      ? mission.rushBonusFee || 0
      : 0;

  const cashEarned = Math.round((stopItemPayout + stopFee + tipEarned + bonusEarned) * 100) / 100;
  const netProfit = Math.max(0, Math.round((cashEarned - (currentStop.cargo.wholesaleCost || 0)) * 100) / 100);
  const expEarned =
    currentStop.expReward +
    (isFinalStop && mission.category === 'rush_mystery' && wasOnTime ? 8 : 0) +
    (isFinalStop && mission.category === 'multi_route' ? mission.stops.length * 4 : 0);

  const updatedStops = mission.stops.map((s, sIdx) =>
    sIdx === idx ? { ...s, completed: true } : s
  );

  const expRes = applyExpGain(shopState.storeExp, shopState.storeLevel, expEarned);

  const prevDaily =
    dState.dailyStats?.day === shopState.currentDay
      ? dState.dailyStats
      : createInitialDailyStats(shopState.currentDay);

  const cargoType = currentStop.cargo.itemType;
  const nextDailyStats: DeliveryDailyStats = {
    ...prevDaily,
    day: shopState.currentDay,
    deliveriesCompleted: prevDaily.deliveriesCompleted + (isFinalStop ? 1 : 0),
    rushCompleted:
      prevDaily.rushCompleted + (isFinalStop && mission.category === 'rush_mystery' && wasOnTime ? 1 : 0),
    vipCompleted: prevDaily.vipCompleted + (isFinalStop && mission.category === 'vip_sniper' ? 1 : 0),
    multiRouteCompleted:
      prevDaily.multiRouteCompleted + (isFinalStop && mission.category === 'multi_route' ? 1 : 0),
    packsDelivered: prevDaily.packsDelivered + (cargoType === 'pack' ? currentStop.cargo.quantity : 0),
    boxesDelivered: prevDaily.boxesDelivered + (cargoType === 'box' ? currentStop.cargo.quantity : 0),
    cardsDelivered:
      prevDaily.cardsDelivered +
      (cargoType === 'single' || cargoType === 'slab' ? currentStop.cargo.quantity : 0),
    revenueEarned: Math.round((prevDaily.revenueEarned + cashEarned) * 100) / 100,
  };

  const nextActiveMission: ActiveDeliveryMission | null = isFinalStop
    ? null
    : {
        ...mission,
        stops: updatedStops,
        currentStopIndex: idx + 1,
        earnedCashSoFar: Math.round((mission.earnedCashSoFar + cashEarned) * 100) / 100,
        earnedExpSoFar: mission.earnedExpSoFar + expEarned,
        isLate: !wasOnTime,
      };

  const prevToday = shopState.todayStats || {
    revenue: 0,
    profit: 0,
    customersServed: 0,
    itemsSold: 0,
  };

  const nextStreak = isFinalStop ? (wasOnTime ? (dState.streak || 0) + 1 : 0) : dState.streak;
  const nextRating = isFinalStop
    ? Math.max(
        3.5,
        Math.min(5.0, Math.round(((dState.rating || 4.8) + (wasOnTime ? 0.04 : -0.08)) * 100) / 100)
      )
    : dState.rating;

  const baseUpdatedState: ShopState = {
    ...shopState,
    cash: Math.round((shopState.cash + cashEarned) * 100) / 100,
    totalRevenue: Math.round((shopState.totalRevenue + cashEarned) * 100) / 100,
    reputation: isFinalStop
      ? Math.min(100, Math.max(0, shopState.reputation + (wasOnTime ? mission.reputationBonus : 0)))
      : shopState.reputation,
    storeExp: expRes.newExp,
    storeLevel: expRes.newLevel,
    storeExpToNext: expRes.newExpToNext,
    unlockedSets: expRes.didLevelUp ? getUnlockedSetsForLevel(expRes.newLevel) : shopState.unlockedSets,
    todayStats: {
      ...prevToday,
      revenue: Math.round((prevToday.revenue + cashEarned) * 100) / 100,
      profit: Math.round((prevToday.profit + netProfit) * 100) / 100,
      itemsSold: prevToday.itemsSold + currentStop.cargo.quantity,
    },
    deliveryState: {
      ...dState,
      activeMission: nextActiveMission,
      completedCount: dState.completedCount + (isFinalStop ? 1 : 0),
      totalEarnings: Math.round((dState.totalEarnings + cashEarned) * 100) / 100,
      totalTips: Math.round((dState.totalTips + tipEarned) * 100) / 100,
      streak: nextStreak,
      rating: nextRating,
      availableOrders: isFinalStop
        ? generateDeliveryOrders(shopState, dState.completedCount + 1)
        : dState.availableOrders,
      dailyStats: nextDailyStats,
    },
  };

  return {
    nextState: baseUpdatedState,
    stopCompleted: currentStop,
    missionFinished: isFinalStop,
    cashEarned,
    tipEarned,
    bonusEarned,
    expEarned,
    wasOnTime,
    didLevelUp: expRes.didLevelUp,
    newLevel: expRes.newLevel,
  };
}

export function getActiveDeliveryStop(shopState: ShopState): DeliveryStop | null {
  const mission = shopState.deliveryState?.activeMission;
  if (!mission) return null;
  return mission.stops[mission.currentStopIndex] || null;
}

export function getDailyTaskProgressList(shopState: ShopState): DailyTaskProgress[] {
  const dState = shopState.deliveryState;
  const daily =
    dState?.dailyStats?.day === shopState.currentDay
      ? dState.dailyStats
      : createInitialDailyStats(shopState.currentDay);
  const claimedSet = new Set(daily.claimedTaskIds || []);

  return DAILY_TASKS_CONFIG.map((task) => {
    let current = 0;
    if (task.metric === 'deliveries') current = daily.deliveriesCompleted;
    else if (task.metric === 'rush') current = daily.rushCompleted;
    else if (task.metric === 'vip') current = daily.vipCompleted;
    else if (task.metric === 'customers') current = shopState.todayStats?.customersServed || 0;
    else if (task.metric === 'revenue') current = Math.floor(shopState.todayStats?.revenue || 0);
    else if (task.metric === 'packs_opened') current = shopState.packsOpenedCount || 0;

    return {
      ...task,
      current: Math.min(task.target, current),
      completed: current >= task.target,
      claimed: claimedSet.has(task.id),
    };
  });
}

export function claimDailyTaskReward(
  shopState: ShopState,
  taskId: string
): { nextState: ShopState; claimed: boolean; rewardCash: number; rewardExp: number } {
  const tasks = getDailyTaskProgressList(shopState);
  const task = tasks.find((t) => t.id === taskId);
  if (!task || !task.completed || task.claimed) {
    return { nextState: shopState, claimed: false, rewardCash: 0, rewardExp: 0 };
  }

  const dState = shopState.deliveryState || createInitialDeliveryState(shopState);
  const daily =
    dState.dailyStats?.day === shopState.currentDay
      ? dState.dailyStats
      : createInitialDailyStats(shopState.currentDay);

  const expRes = applyExpGain(shopState.storeExp, shopState.storeLevel, task.rewardExp);

  return {
    claimed: true,
    rewardCash: task.rewardCash,
    rewardExp: task.rewardExp,
    nextState: {
      ...shopState,
      cash: Math.round((shopState.cash + task.rewardCash) * 100) / 100,
      storeExp: expRes.newExp,
      storeLevel: expRes.newLevel,
      storeExpToNext: expRes.newExpToNext,
      unlockedSets: expRes.didLevelUp ? getUnlockedSetsForLevel(expRes.newLevel) : shopState.unlockedSets,
      deliveryState: {
        ...dState,
        dailyStats: {
          ...daily,
          claimedTaskIds: [...(daily.claimedTaskIds || []), taskId],
        },
      },
    },
  };
}
