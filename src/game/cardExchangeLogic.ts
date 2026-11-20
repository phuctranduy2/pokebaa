/**
 * Sàn Thẻ TCG Exchange - Core Market Engine & Registry
 * Mô phỏng trong game, không phải lời khuyên tài chính.
 *
 * Sổ thẻ ERC-721 (thẻ độc nhất) & ERC-1155 (thẻ thường gom chồng),
 * Chợ mua/bán khớp lệnh & lệnh giới hạn (Limit Order),
 * Động cơ biến động giá Geometric Brownian Motion với Box-Muller standard normal & Hype decay,
 * Sự kiện riêng từng thẻ (Reprint, Hot Meta, OP Rotation, Grading Fail),
 * Thuế lệnh 1% & Thuế lợi nhuận chốt lời 10% (ghi vào app Bill).
 */

import { EXPANDED_OP_SEEDS, OpCardSeed } from './onePieceCardsExpanded';
import { createOnePieceCardSvgDataUrl } from './onePieceSvg';

// ==========================================
// CONFIGURATION (TẤT CẢ HẰNG SỐ NẰM TẠI ĐÂY)
// ==========================================
export const CARD_EXCHANGE_CONFIG = {
  DISCLAIMER: 'Mô phỏng trong game, không phải lời khuyên tài chính.',
  
  FEES: {
    ORDER_TAX_RATE: 0.01, // 1% thuế sàn mỗi lệnh mua / bán
    REALIZED_PROFIT_TAX_RATE: 0.10, // 10% thuế trên lãi đã chốt (ghi vào app Bill)
  },

  PREMIUMS: {
    LOW_SERIAL_THRESHOLD: 0.10, // Serial < 10% tổng phát hành (ví dụ serial <= 10 trên 100)
    LOW_SERIAL_PREMIUM: 0.15, // +15% phí bảo hiểm giá cho serial thấp
    FIRST_PULL_PREMIUM: 0.05, // +5% phí bảo hiểm nếu người chơi rút đầu tiên
  },

  PRICE_ENGINE: {
    TICK_HOURS: 1, // Mỗi tick tương đương 1 giờ game
    DRIFT_MU: 0.0002, // mu chuẩn trôi dạt nhẹ
    VOLATILITY_SIGMA: {
      Common: 0.01, // 1%
      Rare: 0.02, // 2%
      SuperRare: 0.03, // 3%
      AltArt: 0.05, // 5%
      Manga: 0.07, // 7%
      SecretRare: 0.07, // 7%
    } as Record<CardRarity, number>,
    HYPE_DAILY_DECAY: 0.20, // Hype giảm 20% mỗi ngày (tức * 0.80 sau 24h)
    MIN_PRICE: 0.10, // Giá sàn tối thiểu không thể giảm dưới $0.10
  },

  EVENTS: {
    REPRINT_DROP: -0.30, // In lại thẻ: -30% giá
    HOT_CHARACTER_BOOST_MIN: 0.20, // Nhân vật hot / meta buff: +20% đến +40%
    HOT_CHARACTER_BOOST_MAX: 0.40,
    OP_ROTATION_DROP: -0.25, // Rotation chỉ áp dụng cho thẻ One Piece chơi được block cũ: -25%
    GRADING_FAIL_DROP: -0.15, // Kiểm định siết chặt / grading thất bại: -15%
    ADVANCE_NOTICE_DAYS_MIN: 1, // Báo tin trước 1-3 ngày
    ADVANCE_NOTICE_DAYS_MAX: 3,
  },

  STORAGE_KEY: 'pkm_card_exchange_state_v1',
};

// ==========================================
// TYPE DEFINITIONS
// ==========================================
export type CardFranchise = 'onepiece' | 'pokemon';

export type CardRarity = 'Common' | 'Rare' | 'SuperRare' | 'AltArt' | 'Manga' | 'SecretRare';

export type MarketRegimeType = 'bluechip_mm' | 'meme_ponzi';
export type MmPhaseType = 'accumulation' | 'pump' | 'distribution' | 'shakeout';
export type MemePhaseType = 'long_sideway' | 'meme_pump' | 'rug_dump' | 'dead_cat_bounce';

export interface CardGradingInfo {
  company: 'PSA' | 'CGC' | 'BGS';
  score: number; // 9, 9.5, 10
  label: string; // e.g. "PSA 10 Gem Mint", "BGS 10 Black Label"
  multiplier: number; // e.g. 2.5
}

export interface CardOwnerRecord {
  id: string;
  owner: string;
  timestamp: number;
  gameDay: number;
  gameHour: number;
  price: number;
  type: 'pull' | 'buy' | 'sell' | 'sync';
}

/** Thẻ độc nhất ERC-721 (Mỗi lá là 1 thực thể riêng với id, serial, grading, provenance) */
export interface UniqueCardItem {
  id: string;
  cardCode: string;
  name: string;
  franchise: CardFranchise;
  rarity: CardRarity;
  imageUrl: string;
  serial?: {
    number: number;
    total: number;
  };
  condition: 'Gem Mint' | 'Mint' | 'Near Mint' | 'Lightly Played';
  grading?: CardGradingInfo;
  ownerHistory: CardOwnerRecord[];
  isFirstOwner: boolean; // "Do bạn rút đầu tiên"
  basePrice: number; // Giá cơ sở hiện tại theo cardCode
  purchasePrice: number; // Giá vốn đã trả để mua hoặc định giá khi rút
  acquiredAtDay: number;
  acquiredAtHour: number;
}

/** Thẻ thường gom chồng ERC-1155 (Cùng cardCode gộp chung số lượng) */
export interface FungibleCardStack {
  cardCode: string;
  name: string;
  franchise: CardFranchise;
  rarity: CardRarity;
  imageUrl: string;
  quantity: number;
  totalCostBasis: number; // Tổng chi phí vốn bỏ ra
  avgBuyPrice: number; // Giá vốn trung bình = totalCostBasis / quantity
}

export type MarketModeType = 'crypto' | 'forex' | 'hose';

export type ChartTimeframe = '1m' | '5m' | '15m' | '1H' | '4H' | '1D' | '1W';

export interface CandleStick {
  timeLabel: string;
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  subCandlesCount?: number;
  subCandles?: CandleStick[];
  timeframe?: ChartTimeframe;
  marketMode?: MarketModeType;
}

export interface OrderBookRow {
  price: number;
  volume: number;
  isPlayerOrder?: boolean;
}

export interface LimitOrder {
  id: string;
  cardCode: string;
  cardName: string;
  type: 'buy' | 'sell';
  price: number;
  volume: number;
  filledVolume: number;
  createdAt: number;
  gameDay: number;
  gameHour: number;
  status: 'open' | 'filled' | 'cancelled';
  isUniqueCard?: boolean;
  uniqueCardId?: string; // Nếu bán thẻ độc nhất
}

export interface MarketEvent {
  id: string;
  cardCode: string;
  cardName: string;
  title: string;
  description: string;
  impactType: 'reprint' | 'hot_meta' | 'rotation' | 'grading_fail';
  priceImpactPct: number; // e.g. -0.30 or +0.35
  scheduledDay: number; // Ngày phát tác
  status: 'rumor' | 'active' | 'resolved';
  announcedDay: number;
}

export interface TradeHistoryRecord {
  id: string;
  cardCode: string;
  cardName: string;
  type: 'market_buy' | 'market_sell' | 'limit_buy' | 'limit_sell';
  price: number;
  volume: number;
  totalValue: number;
  feeTax1Pct: number;
  realizedProfit: number;
  profitTax10Pct: number;
  timestamp: number;
  gameDay: number;
  gameHour: number;
  details?: string;
}

export interface BillTaxRecord {
  id: string;
  type: 'exchange_profit_tax' | 'exchange_fee';
  title: string;
  description: string;
  amount: number;
  gameDay: number;
  gameHour: number;
  timestamp: number;
}

export interface MarketCardMeta {
  cardCode: string;
  name: string;
  franchise: CardFranchise;
  rarity: CardRarity;
  imageUrl: string;
  artUrl?: string;
  currentPrice: number;
  previousClose: number;
  hype: number; // Điểm hype (giảm 20%/ngày)
  high24h: number;
  low24h: number;
  volume24h: number;
  candles: CandleStick[];
  isOlderBlockOp?: boolean; // Block cũ OP-01, OP-02 dễ bị rotation
  regime: MarketRegimeType; // 'bluechip_mm' (crypto MM lái, bơm thổi chu kỳ) | 'meme_ponzi' (shitcoin ponzi, bơm x5-x10, rug pull, sideway cạn vol)
  mmPhase?: MmPhaseType; // 'accumulation' | 'pump' | 'distribution' | 'shakeout'
  memePhase?: MemePhaseType; // 'long_sideway' | 'meme_pump' | 'rug_dump' | 'dead_cat_bounce'
  phaseDurationTicks?: number; // Số tick còn lại trong giai đoạn hiện tại
  baseAnchorPrice?: number; // Giá neo chuẩn ban đầu để MM căn chỉnh hồi về
  poolLiquidityUsd?: number; // Tổng thanh khoản USD trong Pool AMM (TVL)
  poolTokenReserve?: number; // Lượng thẻ dự trữ trong Pool
  dollarsPerPoint?: number; // Số USD cần nạp mua để giá tăng lên 1 giá ($1)
}

export interface CardExchangeState {
  hasSeenIntro: boolean;
  marketCards: Record<string, MarketCardMeta>;
  vaultUniqueCards: UniqueCardItem[];
  vaultFungibleStacks: Record<string, FungibleCardStack>;
  activeOrders: LimitOrder[];
  tradeHistory: TradeHistoryRecord[];
  billTaxRecords: BillTaxRecord[];
  marketEvents: MarketEvent[];
  lastTickDay: number;
  lastTickHour: number;
}

// ==========================================
// BOX-MULLER STANDARD NORMAL TRANSFORM
// ==========================================
export function boxMullerRandom(): number {
  let u1 = 0;
  let u2 = 0;
  while (u1 === 0) u1 = Math.random();
  while (u2 === 0) u2 = Math.random();
  return Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
}

// ==========================================
// UNIQUE CARD PRICING ENGINE (WITH PREMIUMS)
// ==========================================
export function calculateUniqueCardPrice(
  card: UniqueCardItem,
  marketPrice: number
): {
  finalPrice: number;
  basePrice: number;
  lowSerialBonus: number;
  firstPullBonus: number;
  gradingBonus: number;
  isLowSerial: boolean;
} {
  const base = marketPrice;
  let lowSerialBonus = 0;
  let firstPullBonus = 0;
  let gradingBonus = 0;

  // Serial thấp (< 10% tổng phát hành) -> +15%
  const isLowSerial = Boolean(
    card.serial &&
      card.serial.total > 0 &&
      card.serial.number / card.serial.total <= CARD_EXCHANGE_CONFIG.PREMIUMS.LOW_SERIAL_THRESHOLD
  );

  if (isLowSerial) {
    lowSerialBonus = base * CARD_EXCHANGE_CONFIG.PREMIUMS.LOW_SERIAL_PREMIUM;
  }

  // Do bạn rút đầu tiên -> +5%
  if (card.isFirstOwner) {
    firstPullBonus = base * CARD_EXCHANGE_CONFIG.PREMIUMS.FIRST_PULL_PREMIUM;
  }

  // Phụ phí grading
  if (card.grading) {
    const mult = card.grading.multiplier > 1 ? card.grading.multiplier - 1 : 0.5;
    gradingBonus = base * mult;
  }

  const finalPrice = Math.max(
    CARD_EXCHANGE_CONFIG.PRICE_ENGINE.MIN_PRICE,
    Number((base + lowSerialBonus + firstPullBonus + gradingBonus).toFixed(2))
  );

  return {
    finalPrice,
    basePrice: base,
    lowSerialBonus: Number(lowSerialBonus.toFixed(2)),
    firstPullBonus: Number(firstPullBonus.toFixed(2)),
    gradingBonus: Number(gradingBonus.toFixed(2)),
    isLowSerial,
  };
}

/**
 * Mô hình Pool Thanh Khoản Crypto AMM (x * y = k) & Độ sâu thanh khoản (Pool Depth):
 * - Thẻ Hit / Chén thánh sưu tầm (Luffy Manga $4,200, Shanks $1,650, Charizard $420, Mew $280...):
 *   Thanh khoản cực dày (TVL $200k - $2.5M USD). Để tăng 1 giá ($1), cần nạp vào pool một lượng tiền lớn ($150 - $500 USD).
 *   Do đó giá được neo vững chắc quanh giá trị sưu tầm thực tế, không bao giờ bị bơm ảo lên $23,000!
 * - Thẻ Giá Rẻ Penny (< $5, $0.18 - $0.90):
 *   Thanh khoản mỏng ($1,500 - $6,000 USD). Đội lái MM hoặc cá voi chỉ cần vài chục USD là đã có thể lái giá,
 *   tạo chu kỳ Bơm thổi (Meme Pump x2-x5), Xả hàng (Rug Dump -80%), Nảy xác chết và Ngủ đông sideway cạn vol.
 */
export function computeCardLiquidityPool(basePrice: number, regime: MarketRegimeType): {
  poolLiquidityUsd: number;
  poolTokenReserve: number;
  dollarsPerPoint: number;
} {
  if (regime === 'bluechip_mm') {
    const poolLiquidityUsd = Math.round(basePrice * 500);
    const poolTokenReserve = 500;
    const dollarsPerPoint = Math.round(poolLiquidityUsd / (2 * basePrice)); // ~250 USD để tăng $1
    return { poolLiquidityUsd, poolTokenReserve, dollarsPerPoint };
  } else {
    const poolLiquidityUsd = Math.round(Math.max(1500, basePrice * 8000));
    const poolTokenReserve = Math.round(poolLiquidityUsd / basePrice);
    const dollarsPerPoint = Math.round(poolLiquidityUsd / (2 * basePrice)); // ~4000 (tức $40 cho $0.01)
    return { poolLiquidityUsd, poolTokenReserve, dollarsPerPoint };
  }
}

// ==========================================
// SEED CARD CATALOG (ONE PIECE + POKÉMON MOCK)
// ==========================================
export function getInitialMarketCatalog(): Record<string, MarketCardMeta> {
  const catalog: Record<string, MarketCardMeta> = {};

  // 1. One Piece Cards Selection
  // - Hit / Chén thánh đắt tiền: Lấy đúng giá thật ($85 - $4,200), chạy cơ chế MM lái (Accumulation -> Pump -> Distribution -> Shakeout)
  // - Thẻ phổ thông / giá rẻ: Lấy đúng giá lẻ ($0.22 - $0.35), chạy cơ chế Meme Ponzi (Long Sideway, God Candle x5, Rug Dump -80%, Dead Cat Bounce)
  const opSelection: Array<{
    seedId: string;
    code: string;
    rarity: CardRarity;
    isOld: boolean;
    regime: MarketRegimeType;
    exactPrice: number;
    initialMmPhase?: MmPhaseType;
    initialMemePhase?: MemePhaseType;
  }> = [
    // Chén thánh / Hit thẻ cực đắt (Crypto MM Lái)
    { seedId: 'op05-119', code: 'OP05-119-MANGA', rarity: 'Manga', isOld: false, regime: 'bluechip_mm', exactPrice: 4200.0, initialMmPhase: 'pump' },
    { seedId: 'op01-120', code: 'OP01-120-MANGA', rarity: 'Manga', isOld: true, regime: 'bluechip_mm', exactPrice: 1650.0, initialMmPhase: 'accumulation' },
    { seedId: 'op06-118', code: 'OP06-118-MANGA', rarity: 'Manga', isOld: false, regime: 'bluechip_mm', exactPrice: 1280.0, initialMmPhase: 'distribution' },
    { seedId: 'op02-013', code: 'OP02-013-MANGA', rarity: 'Manga', isOld: true, regime: 'bluechip_mm', exactPrice: 920.0, initialMmPhase: 'shakeout' },
    { seedId: 'op04-083', code: 'OP04-083-MANGA', rarity: 'Manga', isOld: false, regime: 'bluechip_mm', exactPrice: 790.0, initialMmPhase: 'accumulation' },
    { seedId: 'op09-001', code: 'OP09-001-SEC', rarity: 'SecretRare', isOld: false, regime: 'bluechip_mm', exactPrice: 185.0, initialMmPhase: 'pump' },
    { seedId: 'op01-016', code: 'OP01-016', rarity: 'AltArt', isOld: true, regime: 'bluechip_mm', exactPrice: 125.0, initialMmPhase: 'accumulation' },
    { seedId: 'op01-025', code: 'OP01-025', rarity: 'AltArt', isOld: true, regime: 'bluechip_mm', exactPrice: 85.0, initialMmPhase: 'pump' },

    // Thẻ giá rẻ phổ thông (Meme Ponzi / Penny Cards)
    { seedId: 'op01-004', code: 'OP01-004', rarity: 'Common', isOld: true, regime: 'meme_ponzi', exactPrice: 0.25, initialMemePhase: 'long_sideway' },
    { seedId: 'op01-015', code: 'OP01-015', rarity: 'Common', isOld: true, regime: 'meme_ponzi', exactPrice: 0.30, initialMemePhase: 'meme_pump' },
    { seedId: 'op01-011', code: 'OP01-011', rarity: 'Common', isOld: true, regime: 'meme_ponzi', exactPrice: 0.35, initialMemePhase: 'rug_dump' },
    { seedId: 'op01-052', code: 'OP01-052', rarity: 'Common', isOld: true, regime: 'meme_ponzi', exactPrice: 0.22, initialMemePhase: 'dead_cat_bounce' },
  ];

  const OP_ART_MAP: Record<string, string> = {
    'OP05-119-MANGA': 'https://optcgapi.com/media/static/Card_Images/OP05-119_p1.jpg',
    'OP01-120-MANGA': 'https://optcgapi.com/media/static/Card_Images/OP01-120_p1.jpg',
    'OP06-118-MANGA': 'https://optcgapi.com/media/static/Card_Images/OP06-118_p1.jpg',
    'OP02-013-MANGA': 'https://optcgapi.com/media/static/Card_Images/OP02-013_p1.jpg',
    'OP04-083-MANGA': 'https://optcgapi.com/media/static/Card_Images/OP04-083_p1.jpg',
    'OP09-001-SEC': 'https://optcgapi.com/media/static/Card_Images/OP09-001.jpg',
    'OP01-016': 'https://optcgapi.com/media/static/Card_Images/OP01-016_p1.jpg',
    'OP01-025': 'https://optcgapi.com/media/static/Card_Images/OP01-025.jpg',
    'OP01-004': 'https://optcgapi.com/media/static/Card_Images/OP01-004.jpg',
    'OP01-015': 'https://optcgapi.com/media/static/Card_Images/OP01-015.jpg',
    'OP01-011': 'https://optcgapi.com/media/static/Card_Images/OP01-011.jpg',
    'OP01-052': 'https://optcgapi.com/media/static/Card_Images/OP01-052.jpg',
  };

  for (const item of opSelection) {
    const seed = EXPANDED_OP_SEEDS.find((s) => s.id === item.seedId) || {
      name: item.code,
      price: item.exactPrice,
      icon: '🏴‍☠️',
      faction: 'Grand Line Pirates',
      power: 6000,
      bgA: '#b91c1c',
      bgB: '#450a0a',
      accent: '#fde047',
    };

    const initialPrice = item.exactPrice;
    const history = generateInitialCandles(initialPrice, item.rarity, item.regime);
    const lastClose = history[history.length - 1].close;

    const opCardSvg = createOnePieceCardSvgDataUrl({
      name: seed.name,
      code: item.code,
      faction: (seed as any).faction || 'Grand Line Pirates',
      power: (seed as any).power || 5000,
      rarityLabel: item.rarity,
      price: initialPrice,
      icon: (seed as any).icon || '🏴‍☠️',
      bgA: (seed as any).bgA || '#b91c1c',
      bgB: (seed as any).bgB || '#450a0a',
      accent: (seed as any).accent || '#fde047',
      isManga: item.rarity === 'Manga',
    });

    const realArtUrl = OP_ART_MAP[item.code] || opCardSvg;
    const pool = computeCardLiquidityPool(initialPrice, item.regime);

    catalog[item.code] = {
      cardCode: item.code,
      name: seed.name,
      franchise: 'onepiece',
      rarity: item.rarity,
      imageUrl: realArtUrl,
      artUrl: realArtUrl,
      currentPrice: lastClose,
      previousClose: history[history.length - 2]?.close || lastClose,
      hype: item.regime === 'bluechip_mm' ? (item.initialMmPhase === 'pump' ? 0.15 : 0.04) : (item.initialMemePhase === 'meme_pump' ? 0.60 : 0.01),
      high24h: Math.max(...history.slice(-24).map((c) => c.high)),
      low24h: Math.min(...history.slice(-24).map((c) => c.low)),
      volume24h: history.slice(-24).reduce((sum, c) => sum + c.volume, 0),
      candles: history,
      isOlderBlockOp: item.isOld,
      regime: item.regime,
      mmPhase: item.initialMmPhase,
      memePhase: item.initialMemePhase,
      phaseDurationTicks: Math.floor(4 + Math.random() * 6),
      baseAnchorPrice: initialPrice,
      ...pool,
    };
  }

  // 2. Simulated Pokémon Cards
  // - High-end Cards: Thẻ xịn đắt tiền ($68 - $420)
  // - Cheap Meme Cards: Thẻ phổ thông giá tí hon ($0.18 - $0.90) chạy Ponzi meme coin
  const pokemonCards: Array<{
    code: string;
    name: string;
    rarity: CardRarity;
    basePrice: number;
    svgColor: string;
    artUrl: string;
    regime: MarketRegimeType;
    initialMmPhase?: MmPhaseType;
    initialMemePhase?: MemePhaseType;
  }> = [
    // High-End Pokémon Collectibles (Crypto MM Lái)
    { code: 'PKM-NOVA-006', name: 'Charizard Obsidian Nova', rarity: 'Manga', basePrice: 420.0, svgColor: '#ef4444', artUrl: 'https://images.pokemontcg.io/base1/4_hires.png', regime: 'bluechip_mm', initialMmPhase: 'pump' },
    { code: 'PKM-ASTRAL-151', name: 'Mew Astral Genesis', rarity: 'SecretRare', basePrice: 280.0, svgColor: '#ec4899', artUrl: 'https://images.pokemontcg.io/cel25/25_hires.png', regime: 'bluechip_mm', initialMmPhase: 'accumulation' },
    { code: 'PKM-OZONE-384', name: 'Rayquaza Sky Comet', rarity: 'AltArt', basePrice: 195.0, svgColor: '#10b981', artUrl: 'https://images.pokemontcg.io/swsh7/218_hires.png', regime: 'bluechip_mm', initialMmPhase: 'distribution' },
    { code: 'PKM-CYBER-025', name: 'Pikachu Cyber Spark', rarity: 'AltArt', basePrice: 145.0, svgColor: '#f59e0b', artUrl: 'https://images.pokemontcg.io/base1/58_hires.png', regime: 'bluechip_mm', initialMmPhase: 'shakeout' },
    { code: 'PKM-LUNAR-197', name: 'Umbreon Moonlit Void', rarity: 'SuperRare', basePrice: 85.0, svgColor: '#3b82f6', artUrl: 'https://images.pokemontcg.io/swsh7/215_hires.png', regime: 'bluechip_mm', initialMmPhase: 'accumulation' },
    { code: 'PKM-VOID-094', name: 'Gengar Phantom Void', rarity: 'SuperRare', basePrice: 68.0, svgColor: '#8b5cf6', artUrl: 'https://images.pokemontcg.io/swsh8/271_hires.png', regime: 'bluechip_mm', initialMmPhase: 'pump' },

    // Meme Penny Shitcoins (Meme Ponzi / Bơm xả liên tục & Sideway dài)
    { code: 'PKM-COMM-001', name: 'Bulbasaur Seed Bloom', rarity: 'Common', basePrice: 0.18, svgColor: '#059669', artUrl: 'https://images.pokemontcg.io/base1/44_hires.png', regime: 'meme_ponzi', initialMemePhase: 'long_sideway' },
    { code: 'PKM-COMM-004', name: 'Charmander Ember Core', rarity: 'Common', basePrice: 0.22, svgColor: '#ea580c', artUrl: 'https://images.pokemontcg.io/base1/46_hires.png', regime: 'meme_ponzi', initialMemePhase: 'meme_pump' },
    { code: 'PKM-COMM-007', name: 'Squirtle Hydro Shell', rarity: 'Rare', basePrice: 0.55, svgColor: '#0284c7', artUrl: 'https://images.pokemontcg.io/base1/63_hires.png', regime: 'meme_ponzi', initialMemePhase: 'rug_dump' },
    { code: 'PKM-COMM-143', name: 'Snorlax Heavy Slumber', rarity: 'Rare', basePrice: 0.90, svgColor: '#0f766e', artUrl: 'https://images.pokemontcg.io/swsh4/131_hires.png', regime: 'meme_ponzi', initialMemePhase: 'dead_cat_bounce' },
  ];

  for (const pkm of pokemonCards) {
    const history = generateInitialCandles(pkm.basePrice, pkm.rarity, pkm.regime);
    const lastClose = history[history.length - 1].close;

    const pool = computeCardLiquidityPool(pkm.basePrice, pkm.regime);

    catalog[pkm.code] = {
      cardCode: pkm.code,
      name: pkm.name,
      franchise: 'pokemon',
      rarity: pkm.rarity,
      imageUrl: pkm.artUrl,
      artUrl: pkm.artUrl,
      currentPrice: lastClose,
      previousClose: history[history.length - 2]?.close || lastClose,
      hype: pkm.regime === 'bluechip_mm' ? (pkm.initialMmPhase === 'pump' ? 0.12 : 0.03) : (pkm.initialMemePhase === 'meme_pump' ? 0.55 : 0.01),
      high24h: Math.max(...history.slice(-24).map((c) => c.high)),
      low24h: Math.min(...history.slice(-24).map((c) => c.low)),
      volume24h: history.slice(-24).reduce((sum, c) => sum + c.volume, 0),
      candles: history,
      isOlderBlockOp: false,
      regime: pkm.regime,
      mmPhase: pkm.initialMmPhase,
      memePhase: pkm.initialMemePhase,
      phaseDurationTicks: Math.floor(4 + Math.random() * 6),
      baseAnchorPrice: pkm.basePrice,
      ...pool,
    };
  }

  return catalog;
}

/**
 * Tạo lịch sử 36 nến 1H ban đầu:
 * - 'bluechip_mm': Mô hình Wyckoff chuyên nghiệp của Crypto MM (Tích Lũy -> Đẩy Giá Pump -> Phân Phối Đỉnh -> Rũ Bỏ Stoploss -> Tái Tích Lũy).
 * - 'meme_ponzi': Mô hình Meme Shitcoin (Sideway cạn vol dài vô tận -> Cột xanh God Candle x5-x8 -> Rug Pull xả cắm đầu -80% -> Nảy xác chết -> Sideway).
 */
export function generateInitialCandles(
  basePrice: number,
  rarity: CardRarity,
  regime: MarketRegimeType = 'bluechip_mm'
): CandleStick[] {
  const candles: CandleStick[] = [];
  const now = Date.now();

  if (regime === 'bluechip_mm') {
    // 36 nến Crypto Bluechip MM
    let price = basePrice * 0.90;
    const sigma = CARD_EXCHANGE_CONFIG.PRICE_ENGINE.VOLATILITY_SIGMA[rarity] || 0.03;

    for (let i = 35; i >= 0; i--) {
      const candleTime = now - i * 3600 * 1000;
      const dateObj = new Date(candleTime);
      const timeLabel = `${dateObj.getHours().toString().padStart(2, '0')}:00`;

      let stepVol = 30;
      let openPrice = price;

      if (i > 24) {
        // Nến 0..11: Tích lũy đáy (Accumulation)
        const z = boxMullerRandom();
        price = basePrice * (0.88 + 0.03 * Math.sin(i)) * Math.exp(0.01 * z);
        stepVol = 25 + Math.floor(Math.random() * 20);
        openPrice = price * (1 - 0.006 * boxMullerRandom());
      } else if (i > 14) {
        // Nến 12..21: Sóng MM đẩy giá bơm thổi dồn dập (Pump Wave +20%)
        const progress = (24 - i) / 10;
        price = basePrice * (0.92 + 0.22 * progress) * Math.exp(0.012 * boxMullerRandom());
        stepVol = 80 + Math.floor(Math.random() * 80);
        openPrice = price * (1 - 0.015 * Math.abs(boxMullerRandom()));
      } else if (i > 7) {
        // Nến 22..28: Phân phối đỉnh & Rũ bỏ quét thanh lý (Shakeout Dump -14%)
        const progress = (14 - i) / 7;
        price = basePrice * (1.14 - 0.18 * progress) * Math.exp(0.018 * boxMullerRandom());
        stepVol = 110 + Math.floor(Math.random() * 90);
        openPrice = price * (1 + 0.018 * Math.abs(boxMullerRandom()));
      } else {
        // Nến 29..35: Hồi phục bậc thang về lại đúng giá thị trường
        const progress = (7 - i) / 7;
        price = basePrice * (0.96 + 0.04 * progress) * Math.exp(0.008 * boxMullerRandom());
        stepVol = 45 + Math.floor(Math.random() * 35);
        openPrice = price * (1 - 0.008 * boxMullerRandom());
      }

      price = Math.max(CARD_EXCHANGE_CONFIG.PRICE_ENGINE.MIN_PRICE, Number(price.toFixed(2)));
      openPrice = Math.max(CARD_EXCHANGE_CONFIG.PRICE_ENGINE.MIN_PRICE, Number(openPrice.toFixed(2)));

      const maxOC = Math.max(openPrice, price);
      const minOC = Math.min(openPrice, price);
      const high = Number((maxOC * (1 + Math.abs(boxMullerRandom()) * sigma * 0.7)).toFixed(2));
      const low = Number((Math.max(CARD_EXCHANGE_CONFIG.PRICE_ENGINE.MIN_PRICE, minOC * (1 - Math.abs(boxMullerRandom()) * sigma * 0.7))).toFixed(2));

      candles.push({
        timeLabel,
        timestamp: candleTime,
        open: openPrice,
        high,
        low,
        close: price,
        volume: stepVol,
      });
    }
  } else {
    // 36 nến Meme Ponzi / Shitcoin
    const floorPrice = Math.max(0.05, basePrice);
    let price = floorPrice;

    for (let i = 35; i >= 0; i--) {
      const candleTime = now - i * 3600 * 1000;
      const dateObj = new Date(candleTime);
      const timeLabel = `${dateObj.getHours().toString().padStart(2, '0')}:00`;

      let stepVol = 10;
      let openPrice = price;

      if (i > 21) {
        // Nến 0..14: Sideway cạn vol kéo dài, giá tí hon vài chục cent
        price = floorPrice * (0.94 + 0.10 * Math.random());
        stepVol = 4 + Math.floor(Math.random() * 8);
        openPrice = price * (0.99 + 0.02 * Math.random());
      } else if (i > 16) {
        // Nến 15..19: BƠM THỔI ĐIÊN LOẠN (God Candle x5 đến x8!)
        const pumpStep = (21 - i);
        const multiplier = 1 + pumpStep * 1.1; // vọt lên ~5.5x
        openPrice = price;
        price = floorPrice * multiplier * (0.95 + 0.15 * Math.random());
        stepVol = 200 + Math.floor(Math.random() * 300); // Vol bùng nổ
      } else if (i > 12) {
        // Nến 20..23: RUG PULL! Xả thẳng đứng cắm đầu -80%!
        openPrice = price;
        price = Math.max(floorPrice * 1.15, price * 0.35);
        stepVol = 350 + Math.floor(Math.random() * 400); // Hoảng loạn bán tháo
      } else if (i > 8) {
        // Nến 24..27: Nảy xác chết kỹ thuật (Dead cat bounce)
        openPrice = price;
        price = floorPrice * (1.3 + 0.35 * Math.random());
        stepVol = 45 + Math.floor(Math.random() * 40);
      } else {
        // Nến 28..35: Trở về sideway bất động cạn vol
        openPrice = price;
        price = floorPrice * (0.95 + 0.12 * Math.random());
        stepVol = 6 + Math.floor(Math.random() * 8);
      }

      price = Math.max(0.05, Number(price.toFixed(3)));
      openPrice = Math.max(0.05, Number(openPrice.toFixed(3)));

      const maxOC = Math.max(openPrice, price);
      const minOC = Math.min(openPrice, price);
      // Râu nến quét cực mạnh cho meme
      const high = Number((maxOC * (1 + Math.abs(boxMullerRandom()) * 0.07)).toFixed(3));
      const low = Number((Math.max(0.05, minOC * (1 - Math.abs(boxMullerRandom()) * 0.05))).toFixed(3));

      candles.push({
        timeLabel,
        timestamp: candleTime,
        open: openPrice,
        high,
        low,
        close: price,
        volume: stepVol,
      });
    }
  }

  return candles;
}

// ==========================================
// BẢNG QUY ĐỔI SỐ LƯỢNG NẾN THEO TỪNG THỊ TRƯỜNG & NGUYÊN LÝ GHÉP NẾN OHLC
// ==========================================

export interface MarketCandlePairRule {
  pair: string;
  sourceTf: ChartTimeframe;
  targetTf: ChartTimeframe;
  count: number;
  note: string;
}

export interface MarketCandleRule {
  market: MarketModeType;
  name: string;
  shortName: string;
  tradingHours: string;
  scheduleDescription: string;
  conversion: {
    '1W_to_1D': { count: number; note: string };
    '1D_to_4H': { count: number; note: string };
    '4H_to_1H': { count: number; note: string };
    '1H_to_15M': { count: number; note: string };
    '15M_to_5M': { count: number; note: string };
    '5M_to_1m': { count: number; note: string };
  };
}

export const MARKET_CANDLE_RULES: Record<MarketModeType, MarketCandleRule> = {
  crypto: {
    market: 'crypto',
    name: 'Thị trường Tiền điện tử (Crypto)',
    shortName: 'Crypto (24/7)',
    tradingHours: '24/7 (Liên tục không nghỉ cuối tuần)',
    scheduleDescription:
      'Thị trường Crypto hoạt động liên tục 24/7 không có giờ nghỉ nên phép chia thời gian rất chẵn (7 ngày/tuần, 24 giờ/ngày).',
    conversion: {
      '1W_to_1D': { count: 7, note: '7 nến ngày (Thứ 2 đến Chủ Nhật)' },
      '1D_to_4H': { count: 6, note: '6 nến 4 giờ (24h / 4h = 6 nến)' },
      '4H_to_1H': { count: 4, note: '4 nến 1 giờ (4h / 1h = 4 nến)' },
      '1H_to_15M': { count: 4, note: '4 nến 15 phút (60m / 15m = 4 nến)' },
      '15M_to_5M': { count: 3, note: '3 nến 5 phút (15m / 5m = 3 nến)' },
      '5M_to_1m': { count: 5, note: '5 nến 1 phút (5m / 1m = 5 nến)' },
    },
  },
  forex: {
    market: 'forex',
    name: 'Thị trường Ngoại hối & Vàng (Forex / Gold)',
    shortName: 'Forex / Vàng (24/5)',
    tradingHours: '24/5 (Thứ 2 đến Thứ 6, đóng cửa cuối tuần)',
    scheduleDescription:
      'Thị trường Forex và Vàng giao dịch 24/5 từ Thứ 2 đến Thứ 6 và nghỉ giao dịch vào Thứ 7 & Chủ Nhật.',
    conversion: {
      '1W_to_1D': { count: 5, note: '5 nến ngày (Thứ 2 đến Thứ 6, nghỉ cuối tuần)' },
      '1D_to_4H': { count: 6, note: '6 nến 4 giờ (24h / 4h = 6 nến)' },
      '4H_to_1H': { count: 4, note: '4 nến 1 giờ (4h / 1h = 4 nến)' },
      '1H_to_15M': { count: 4, note: '4 nến 15 phút (60m / 15m = 4 nến)' },
      '15M_to_5M': { count: 3, note: '3 nến 5 phút (15m / 5m = 3 nến)' },
      '5M_to_1m': { count: 5, note: '5 nến 1 phút (5m / 1m = 5 nến)' },
    },
  },
  hose: {
    market: 'hose',
    name: 'Thị trường Chứng khoán Việt Nam (HOSE)',
    shortName: 'Chứng khoán HOSE',
    tradingHours: 'Thứ 2 - Thứ 6: 09:00-11:30 & 13:00-15:00 (~4.5 giờ/ngày)',
    scheduleDescription:
      'Chứng khoán Việt Nam giao dịch khoảng 4.5 tiếng/ngày và nghỉ cuối tuần. Do đó 1 ngày chỉ gồm 2 nến 4 giờ (phiên sáng và chiều).',
    conversion: {
      '1W_to_1D': { count: 5, note: '5 nến ngày (Thứ 2 đến Thứ 6)' },
      '1D_to_4H': { count: 2, note: '2 nến 4 giờ (Khớp lệnh ~4.5 tiếng: phiên sáng & phiên chiều)' },
      '4H_to_1H': { count: 4, note: '4 nến 1 giờ (Nến cuối ngày khớp ATC có thể lẻ)' },
      '1H_to_15M': { count: 4, note: '4 nến 15 phút (60m / 15m = 4 nến)' },
      '15M_to_5M': { count: 3, note: '3 nến 5 phút (15m / 5m = 3 nến)' },
      '5M_to_1m': { count: 5, note: '5 nến 1 phút (5m / 1m = 5 nến)' },
    },
  },
};

/**
 * Nguyên lý ghép nến (Logic tổng hợp OHLC cốt lõi):
 * • Giá mở cửa (Open): Chính là giá mở cửa của cây nến nhỏ đầu tiên trong chuỗi thời gian đó.
 * • Giá đóng cửa (Close): Chính là giá đóng cửa của cây nến nhỏ cuối cùng trong chuỗi thời gian đó.
 * • Giá cao nhất (High): Là đỉnh râu nến cao nhất được tạo ra bởi bất kỳ cây nến nhỏ nào trong chuỗi.
 * • Giá thấp nhất (Low): Là đáy râu nến thấp nhất được tạo ra bởi bất kỳ cây nến nhỏ nào trong chuỗi.
 * • Khối lượng (Volume): Tổng khối lượng volume của tất cả các nến con trong chuỗi.
 */
export function aggregateCandles(
  subCandles: CandleStick[],
  timeLabel?: string,
  timestamp?: number,
  timeframe?: ChartTimeframe,
  marketMode?: MarketModeType
): CandleStick | null {
  if (!subCandles || subCandles.length === 0) return null;

  const first = subCandles[0];
  const last = subCandles[subCandles.length - 1];

  let highest = -Infinity;
  let lowest = Infinity;
  let totalVolume = 0;

  for (const c of subCandles) {
    if (c.high > highest) highest = c.high;
    if (c.low < lowest) lowest = c.low;
    totalVolume += c.volume || 0;
  }

  return {
    timeLabel: timeLabel || last.timeLabel,
    timestamp: timestamp || last.timestamp,
    open: first.open,
    high: highest,
    low: lowest,
    close: last.close,
    volume: totalVolume,
    subCandlesCount: subCandles.length,
    subCandles: [...subCandles],
    timeframe,
    marketMode,
  };
}

/**
 * Hàm gộp một mảng nến con liên tiếp thành mảng nến lớn theo tỉ lệ quy đổi (ratio)
 */
export function aggregateCandleSeries(
  sourceCandles: CandleStick[],
  ratio: number,
  labelFormatter: (chunk: CandleStick[], chunkIdx: number, totalChunks: number) => { timeLabel: string; timestamp: number },
  targetTf: ChartTimeframe,
  marketMode: MarketModeType
): CandleStick[] {
  if (!sourceCandles || sourceCandles.length === 0) return [];
  const chunkCount = Math.ceil(sourceCandles.length / ratio);
  const result: CandleStick[] = [];

  for (let cIdx = 0; cIdx < chunkCount; cIdx++) {
    const start = cIdx * ratio;
    const chunk = sourceCandles.slice(start, start + ratio);
    if (chunk.length === 0) continue;

    const { timeLabel, timestamp } = labelFormatter(chunk, cIdx, chunkCount);
    const agg = aggregateCandles(chunk, timeLabel, timestamp, targetTf, marketMode);
    if (agg) {
      result.push(agg);
    }
  }

  return result;
}

function createDeterministicRng(seed: number): () => number {
  let s = Math.abs(Math.floor(seed)) % 2147483647;
  if (s === 0) s = 1234567;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function seededBoxMuller(rng: () => number): number {
  let u1 = 0;
  let u2 = 0;
  while (u1 === 0) u1 = rng();
  while (u2 === 0) u2 = rng();
  return Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
}

/**
 * Bộ tạo nến Đa Khung Thời Gian (TradingView-style Multi-Timeframe Engine)
 * Tích hợp Bảng quy đổi số lượng nến theo từng thị trường (Crypto 24/7, Forex 24/5, HOSE VN)
 * và Nguyên lý ghép nến OHLC (Open=nến đầu, Close=nến cuối, High=max, Low=min, Vol=sum).
 * Đảm bảo các nến lịch sử cố định (deterministic) 100%, không bị nhảy loạn xạ giữa các tick.
 */
export function generateTimeframeCandles(
  basePrice: number,
  rarity: CardRarity,
  regime: MarketRegimeType = 'bluechip_mm',
  timeframe: ChartTimeframe = '1H',
  currentPrice: number = basePrice,
  currentDay: number = 1,
  currentHour: number = 11,
  marketMode: MarketModeType = 'crypto'
): CandleStick[] {
  const rule = MARKET_CANDLE_RULES[marketMode] || MARKET_CANDLE_RULES.crypto;
  const decimals = regime === 'meme_ponzi' ? 3 : 2;
  const sigmaBase = CARD_EXCHANGE_CONFIG.PRICE_ENGINE.VOLATILITY_SIGMA[rarity] || 0.03;

  // Hạt giống ngẫu nhiên cố định theo giá cơ sở + ngày + thị trường + khung thời gian
  // Đảm bảo nến quá khứ luôn giữ nguyên hình dạng và giá trị tuyệt đối!
  const tfHash = timeframe === '1W' ? 7 : timeframe === '1D' ? 6 : timeframe === '4H' ? 5 : timeframe === '1H' ? 4 : timeframe === '15m' ? 3 : timeframe === '5m' ? 2 : 1;
  const modeHash = marketMode === 'crypto' ? 101 : marketMode === 'forex' ? 211 : 307;
  const seedNum = Math.floor(basePrice * 100) * 17 + currentDay * 7919 + tfHash * 131 + modeHash;
  const rng = createDeterministicRng(seedNum);

  const now = Date.now();

  // 1. Nếu khung thời gian là 1m: Tạo trực tiếp 60 nến 1 phút
  if (timeframe === '1m') {
    const count = 60;
    const stepMs = 60 * 1000;
    const sigma = sigmaBase * 0.45;
    const candles: CandleStick[] = [];
    const anchorTime = Math.floor(now / stepMs) * stepMs;
    let price = Math.max(0.05, basePrice * 0.985);

    for (let i = count - 1; i >= 0; i--) {
      const candleTime = anchorTime - i * stepMs;
      const d = new Date(candleTime);
      const timeLabel = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
      let openPrice = price;
      let stepVol = Math.floor((10 + rng() * 25) * 0.4);

      if (i === 0) {
        price = currentPrice;
      } else {
        const delta = sigma * seededBoxMuller(rng) * 0.5;
        price = Math.max(0.05, price * (1 + delta));
      }

      price = Number(price.toFixed(decimals));
      openPrice = Number(openPrice.toFixed(decimals));
      const maxOC = Math.max(openPrice, price);
      const minOC = Math.min(openPrice, price);
      const high = Number((maxOC * (1 + Math.abs(seededBoxMuller(rng)) * sigma * 0.5)).toFixed(decimals));
      const low = Number((Math.max(0.05, minOC * (1 - Math.abs(seededBoxMuller(rng)) * sigma * 0.5))).toFixed(decimals));

      candles.push({
        timeLabel,
        timestamp: candleTime,
        open: openPrice,
        high: Math.max(high, maxOC),
        low: Math.min(low, minOC),
        close: price,
        volume: stepVol,
        timeframe: '1m',
        marketMode,
      });
    }

    if (candles.length > 0) {
      const last = candles[candles.length - 1];
      last.close = currentPrice;
      last.high = Math.max(last.high, currentPrice);
      last.low = Math.min(last.low, currentPrice);
    }
    return candles;
  }

  // 2. Tạo tập nến nguyên tử 5 Phút (Base 5M atomic candles)
  // Quy mô nến nền đủ lớn để tổng hợp mượt mà lên 15m, 1H, 4H, 1D, 1W
  const base5mCount = timeframe === '5m' ? 48 : timeframe === '15m' ? 108 : timeframe === '1H' ? 288 : 576;
  const step5mMs = 5 * 60 * 1000;
  const sigma5m = sigmaBase * 0.65;
  const base5mCandles: CandleStick[] = [];
  const anchor5mTime = Math.floor(now / step5mMs) * step5mMs;
  let price5m = Math.max(0.05, regime === 'bluechip_mm' ? basePrice * 0.91 : basePrice);

  for (let i = base5mCount - 1; i >= 0; i--) {
    const candleTime = anchor5mTime - i * step5mMs;
    const d = new Date(candleTime);
    const timeLabel = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
    let openPrice = price5m;
    let stepVol = Math.floor((15 + rng() * 35) * 0.7);

    if (i === 0) {
      price5m = currentPrice;
    } else {
      if (regime === 'bluechip_mm') {
        const drift = 0.0003;
        const change = Math.exp(drift + sigma5m * seededBoxMuller(rng));
        price5m = Math.max(CARD_EXCHANGE_CONFIG.PRICE_ENGINE.MIN_PRICE, price5m * change);
      } else {
        const isSpike = i % 18 === 4;
        const isDump = i % 18 === 5;
        if (isSpike) {
          price5m = price5m * (1.18 + 0.15 * rng());
          stepVol *= 6;
        } else if (isDump) {
          price5m = Math.max(0.05, price5m * 0.6);
          stepVol *= 8;
        } else {
          price5m = Math.max(0.05, price5m * (1 + (rng() - 0.49) * 0.025));
        }
      }
    }

    price5m = Number(price5m.toFixed(decimals));
    openPrice = Number(openPrice.toFixed(decimals));
    const maxOC = Math.max(openPrice, price5m);
    const minOC = Math.min(openPrice, price5m);
    const high = Number((maxOC * (1 + Math.abs(seededBoxMuller(rng)) * sigma5m * 0.6)).toFixed(decimals));
    const low = Number((Math.max(0.05, minOC * (1 - Math.abs(seededBoxMuller(rng)) * sigma5m * 0.6))).toFixed(decimals));

    base5mCandles.push({
      timeLabel,
      timestamp: candleTime,
      open: openPrice,
      high: Math.max(high, maxOC),
      low: Math.min(low, minOC),
      close: price5m,
      volume: stepVol,
      timeframe: '5m',
      marketMode,
    });
  }

  // Đảm bảo nến 5m cuối cùng đóng tại currentPrice
  if (base5mCandles.length > 0) {
    const last = base5mCandles[base5mCandles.length - 1];
    last.close = currentPrice;
    last.high = Math.max(last.high, currentPrice);
    last.low = Math.min(last.low, currentPrice);
  }

  if (timeframe === '5m') {
    return base5mCandles.slice(-48);
  }

  // 3. Khung 15 Phút (15M) <- Tổng hợp từ 5M (15M -> 5M: 3 nến)
  const ratio15Mto5M = rule.conversion['15M_to_5M'].count; // Luôn là 3 nến
  const candles15M = aggregateCandleSeries(
    base5mCandles,
    ratio15Mto5M,
    (chunk) => {
      const last = chunk[chunk.length - 1];
      const d = new Date(last.timestamp);
      return {
        timeLabel: `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`,
        timestamp: last.timestamp,
      };
    },
    '15m',
    marketMode
  );

  if (timeframe === '15m') {
    return candles15M.slice(-40);
  }

  // 4. Khung 1 Giờ (1H) <- Tổng hợp từ 15M (1H -> 15M: 4 nến)
  const ratio1Hto15M = rule.conversion['1H_to_15M'].count; // Luôn là 4 nến
  const candles1H = aggregateCandleSeries(
    candles15M,
    ratio1Hto15M,
    (chunk) => {
      const last = chunk[chunk.length - 1];
      const d = new Date(last.timestamp);
      return {
        timeLabel: `${d.getHours().toString().padStart(2, '0')}:00`,
        timestamp: last.timestamp,
      };
    },
    '1H',
    marketMode
  );

  if (timeframe === '1H') {
    return candles1H.slice(-36);
  }

  // 5. Khung 4 Giờ (4H) <- Tổng hợp từ 1H (4H -> 1H: 4 nến)
  const ratio4Hto1H = rule.conversion['4H_to_1H'].count; // Luôn là 4 nến
  const candles4H = aggregateCandleSeries(
    candles1H,
    ratio4Hto1H,
    (chunk) => {
      const last = chunk[chunk.length - 1];
      const d = new Date(last.timestamp);
      return {
        timeLabel: `${d.getHours().toString().padStart(2, '0')}:00`,
        timestamp: last.timestamp,
      };
    },
    '4H',
    marketMode
  );

  if (timeframe === '4H') {
    return candles4H.slice(-28);
  }

  // 6. Khung 1 Ngày (1D) <- Tổng hợp từ 4H theo từng thị trường:
  // - Crypto 24/7: 6 nến 4H (24h / 4h = 6)
  // - Forex 24/5: 6 nến 4H (24h / 4h = 6)
  // - HOSE VN: 2 nến 4H (~4.5 tiếng/ngày)
  const ratio1Dto4H = rule.conversion['1D_to_4H'].count;
  const candles1D = aggregateCandleSeries(
    candles4H,
    ratio1Dto4H,
    (_chunk, idx, total) => {
      const targetDay = Math.max(1, currentDay - (total - 1 - idx));
      return {
        timeLabel: `D${targetDay}`,
        timestamp: now - (total - 1 - idx) * 24 * 3600 * 1000,
      };
    },
    '1D',
    marketMode
  );

  if (timeframe === '1D') {
    return candles1D.slice(-24);
  }

  // 7. Khung 1 Tuần (1W) <- Tổng hợp từ 1D theo từng thị trường:
  // - Crypto 24/7: 7 nến 1D (Thứ 2 đến Chủ Nhật)
  // - Forex 24/5: 5 nến 1D (Thứ 2 đến Thứ 6)
  // - HOSE VN: 5 nến 1D (Thứ 2 đến Thứ 6)
  const ratio1Wto1D = rule.conversion['1W_to_1D'].count;
  const candles1W = aggregateCandleSeries(
    candles1D,
    ratio1Wto1D,
    (_chunk, idx, total) => {
      const weekIdx = Math.max(1, 10 + idx - total + 1);
      return {
        timeLabel: `W${weekIdx}`,
        timestamp: now - (total - 1 - idx) * 7 * 24 * 3600 * 1000,
      };
    },
    '1W',
    marketMode
  );

  return candles1W.slice(-20);
}

// ==========================================
// ORDER BOOK GENERATOR
// ==========================================
export function getOrderBookForCard(
  cardCode: string,
  currentPrice: number,
  playerOrders: LimitOrder[] = []
): { bids: OrderBookRow[]; asks: OrderBookRow[]; spread: number } {
  const bids: OrderBookRow[] = [];
  const asks: OrderBookRow[] = [];

  // Generate 5 Ask levels above current price (1% to 6% higher)
  for (let i = 1; i <= 5; i++) {
    const askPrice = Number((currentPrice * (1 + 0.008 * i)).toFixed(2));
    const volume = Math.floor(3 + Math.random() * 8 * i);
    asks.push({ price: askPrice, volume });
  }

  // Generate 5 Bid levels below current price (1% to 6% lower)
  for (let i = 1; i <= 5; i++) {
    const bidPrice = Number((currentPrice * (1 - 0.008 * i)).toFixed(2));
    const volume = Math.floor(4 + Math.random() * 10 * i);
    bids.push({ price: Math.max(CARD_EXCHANGE_CONFIG.PRICE_ENGINE.MIN_PRICE, bidPrice), volume });
  }

  // Inject Player's Open Limit Orders into the book
  const myCardOrders = playerOrders.filter(
    (o) => o.cardCode === cardCode && o.status === 'open' && o.volume > o.filledVolume
  );

  for (const order of myCardOrders) {
    const remainingVol = order.volume - order.filledVolume;
    if (order.type === 'buy') {
      bids.push({ price: order.price, volume: remainingVol, isPlayerOrder: true });
    } else {
      asks.push({ price: order.price, volume: remainingVol, isPlayerOrder: true });
    }
  }

  // Sort Bids descending (highest buy offer first), Asks ascending (lowest sell offer first)
  bids.sort((a, b) => b.price - a.price);
  asks.sort((a, b) => a.price - b.price);

  const bestBid = bids[0]?.price || currentPrice * 0.99;
  const bestAsk = asks[0]?.price || currentPrice * 1.01;
  const spread = Number((bestAsk - bestBid).toFixed(2));

  return { bids: bids.slice(0, 6), asks: asks.slice(0, 6), spread };
}

// ==========================================
// PRICE ENGINE TICK (TỪNG GIỜ GAME)
// Formula: P = P * exp(mu + sigma*Z + hype)
// ==========================================
export function tickPriceEngine(
  state: CardExchangeState,
  currentDay: number,
  currentHour: number
): {
  updatedState: CardExchangeState;
  filledOrders: LimitOrder[];
  activatedEvents: MarketEvent[];
  newRumorEvents: MarketEvent[];
} {
  const updatedState: CardExchangeState = JSON.parse(JSON.stringify(state));
  const filledOrders: LimitOrder[] = [];
  const activatedEvents: MarketEvent[] = [];
  const newRumorEvents: MarketEvent[] = [];

  // 1. Process Events (Check Rumors that become Active today)
  for (const event of updatedState.marketEvents) {
    if (event.status === 'rumor' && currentDay >= event.scheduledDay) {
      event.status = 'active';
      activatedEvents.push(event);

      // Apply event shock to target card
      const targetCard = updatedState.marketCards[event.cardCode];
      if (targetCard) {
        const shockMultiplier = 1 + event.priceImpactPct;
        targetCard.currentPrice = Math.max(
          CARD_EXCHANGE_CONFIG.PRICE_ENGINE.MIN_PRICE,
          Number((targetCard.currentPrice * shockMultiplier).toFixed(2))
        );

        if (event.priceImpactPct > 0) {
          targetCard.hype = Math.min(0.25, targetCard.hype + 0.12);
        } else {
          targetCard.hype = Math.max(-0.20, targetCard.hype - 0.08);
        }
      }
    }
  }

  // 2. Occasionally spawn new rumors if fewer than 2 upcoming rumors exist
  const existingRumors = updatedState.marketEvents.filter((e) => e.status === 'rumor');
  if (existingRumors.length < 2 && Math.random() < 0.15) {
    const newRumor = spawnRandomMarketEvent(updatedState.marketCards, currentDay);
    if (newRumor) {
      updatedState.marketEvents.push(newRumor);
      newRumorEvents.push(newRumor);
    }
  }

  // 3. Tick each card's price: P = P * exp(mu + sigma*Z + hype)
  // And decay hype by 20% per day (tức * 0.8^(1/24) mỗi giờ)
  const hourlyHypeDecay = Math.pow(1 - CARD_EXCHANGE_CONFIG.PRICE_ENGINE.HYPE_DAILY_DECAY, 1 / 24);

  for (const cardCode in updatedState.marketCards) {
    const card = updatedState.marketCards[cardCode];
    const regime = card.regime || (card.currentPrice >= 20 ? 'bluechip_mm' : 'meme_ponzi');
    card.regime = regime;

    let mu = CARD_EXCHANGE_CONFIG.PRICE_ENGINE.DRIFT_MU;
    let sigma = CARD_EXCHANGE_CONFIG.PRICE_ENGINE.VOLATILITY_SIGMA[card.rarity] || 0.02;
    let volFactor = 1;

    // 3.1. BLUECHIP MM (Cá voi lái giá / Bơm thổi chu kỳ Wyckoff)
    if (regime === 'bluechip_mm') {
      if (!card.mmPhase) card.mmPhase = 'accumulation';
      if (!card.phaseDurationTicks || card.phaseDurationTicks <= 0) {
        if (card.mmPhase === 'accumulation') {
          // Gom hàng đủ -> 70% kích hoạt sóng PUMP, 30% tiếp tục tích lũy
          card.mmPhase = Math.random() < 0.7 ? 'pump' : 'accumulation';
          card.phaseDurationTicks = card.mmPhase === 'pump' ? Math.floor(2 + Math.random() * 3) : Math.floor(4 + Math.random() * 6);
        } else if (card.mmPhase === 'pump') {
          // Hết sóng pump -> Chuyển sang phân phối đỉnh (Distribution)
          card.mmPhase = 'distribution';
          card.phaseDurationTicks = Math.floor(3 + Math.random() * 4);
        } else if (card.mmPhase === 'distribution') {
          // Phân phối xong -> Rũ bỏ quét stoploss (Shakeout)
          card.mmPhase = 'shakeout';
          card.phaseDurationTicks = Math.floor(2 + Math.random() * 2);
        } else {
          // Rũ bỏ xong -> Về lại gom hàng (Accumulation)
          card.mmPhase = 'accumulation';
          card.phaseDurationTicks = Math.floor(6 + Math.random() * 8);
        }
      } else {
        card.phaseDurationTicks--;
      }

      if (card.mmPhase === 'pump') {
        mu = 0.065; // Đẩy giá +6.5%/giờ
        sigma = 0.035;
        card.hype = Math.min(0.30, card.hype + 0.07);
        volFactor = 3.5;
      } else if (card.mmPhase === 'shakeout') {
        mu = -0.075; // Rũ bỏ -7.5%/giờ
        sigma = 0.045;
        card.hype = Math.max(-0.15, card.hype - 0.05);
        volFactor = 4.0;
      } else if (card.mmPhase === 'distribution') {
        mu = -0.005;
        sigma = 0.04;
        volFactor = 2.5;
      } else {
        // accumulation
        mu = 0.002;
        sigma = 0.015;
        volFactor = 1.0;
      }
    } else {
      // 3.2. MEME PONZI (Shitcoin / Bơm thổi God Candle x5-x10 & Rug Pull cắm đầu)
      if (!card.memePhase) card.memePhase = 'long_sideway';
      if (!card.phaseDurationTicks || card.phaseDurationTicks <= 0) {
        if (card.memePhase === 'long_sideway') {
          // 25% cơ hội bùng nổ cột xanh God Candle
          if (Math.random() < 0.25) {
            card.memePhase = 'meme_pump';
            card.phaseDurationTicks = Math.floor(2 + Math.random() * 3);
          } else {
            card.memePhase = 'long_sideway';
            card.phaseDurationTicks = Math.floor(10 + Math.random() * 16);
          }
        } else if (card.memePhase === 'meme_pump') {
          // Sau đợt bơm -> Dev/Whales xả hàng Rug Pull!
          card.memePhase = 'rug_dump';
          card.phaseDurationTicks = Math.floor(1 + Math.random() * 2);
        } else if (card.memePhase === 'rug_dump') {
          // Sau khi xả -> 50% nảy xác chết dụ FOMO, 50% ngủ đông sideway
          card.memePhase = Math.random() < 0.5 ? 'dead_cat_bounce' : 'long_sideway';
          card.phaseDurationTicks = card.memePhase === 'dead_cat_bounce' ? 2 : Math.floor(12 + Math.random() * 16);
        } else {
          // Nảy xác chết xong -> Về sideway dài
          card.memePhase = 'long_sideway';
          card.phaseDurationTicks = Math.floor(12 + Math.random() * 16);
        }
      } else {
        card.phaseDurationTicks--;
      }

      if (card.memePhase === 'meme_pump') {
        mu = 0.45; // Bơm thổi cực sốc +45%/h (God Candle)
        sigma = 0.12;
        card.hype = Math.min(0.85, card.hype + 0.35);
        volFactor = 18;
      } else if (card.memePhase === 'rug_dump') {
        mu = -0.65; // Rug Pull sập cắm đầu -65%/h!
        sigma = 0.10;
        card.hype = Math.max(-0.40, card.hype - 0.25);
        volFactor = 25;
      } else if (card.memePhase === 'dead_cat_bounce') {
        mu = 0.25;
        sigma = 0.08;
        volFactor = 5;
      } else {
        // long_sideway: chết thanh khoản, giá tí hon phẳng lì
        mu = 0;
        sigma = 0.005;
        volFactor = 0.25;
      }
    }

    const z = boxMullerRandom();
    let newPrice: number;

    if (regime === 'bluechip_mm') {
      const baseAnchor = card.baseAnchorPrice || card.currentPrice;
      // Trọng tài thanh khoản kéo giá hồi tụ quanh giá gốc (Mean reversion pool depth)
      const reversionDrift = -0.18 * Math.log(card.currentPrice / baseAnchor);
      const netReturn = mu * 0.4 + reversionDrift + sigma * 0.5 * z + card.hype * 0.04;
      const target = card.currentPrice * Math.exp(netReturn);
      // Giới hạn an toàn tuyệt đối cho thẻ sưu tầm: 0.85x - 1.18x giá gốc
      const bounded = Math.max(baseAnchor * 0.85, Math.min(baseAnchor * 1.18, target));
      newPrice = Number(bounded.toFixed(2));
    } else {
      // Thẻ Giá Rẻ Penny (< $5): Đội lái MM làm giá tương tự meme coin
      const returnFactor = Math.exp(mu + sigma * z + card.hype * 0.25);
      newPrice = Math.max(
        CARD_EXCHANGE_CONFIG.PRICE_ENGINE.MIN_PRICE,
        Number((card.currentPrice * returnFactor).toFixed(3))
      );
    }

    // Decay hype
    card.hype = Number((card.hype * hourlyHypeDecay).toFixed(5));

    // Append new 1H Candle
    const prevClose = card.currentPrice;
    card.previousClose = prevClose;
    card.currentPrice = newPrice;

    const maxOC = Math.max(prevClose, newPrice);
    const minOC = Math.min(prevClose, newPrice);
    const high = Number((maxOC * (1 + Math.abs(boxMullerRandom()) * sigma * 0.7)).toFixed(regime === 'meme_ponzi' ? 3 : 2));
    const low = Number(
      Math.max(
        CARD_EXCHANGE_CONFIG.PRICE_ENGINE.MIN_PRICE,
        minOC * (1 - Math.abs(boxMullerRandom()) * sigma * 0.7)
      ).toFixed(regime === 'meme_ponzi' ? 3 : 2)
    );
    const volume = Math.max(5, Math.floor((15 + Math.random() * 40 * (1 / (sigma * 8))) * volFactor));

    const timeLabel = `${currentHour.toString().padStart(2, '0')}:00`;
    card.candles.push({
      timeLabel,
      timestamp: Date.now(),
      open: prevClose,
      high,
      low,
      close: newPrice,
      volume,
    });

    // Keep max 72 candles (~3 days of 1H data)
    if (card.candles.length > 72) {
      card.candles.shift();
    }

    // Refresh 24h stats
    const last24 = card.candles.slice(-24);
    card.high24h = Math.max(...last24.map((c) => c.high));
    card.low24h = Math.min(...last24.map((c) => c.low));
    card.volume24h = last24.reduce((s, c) => s + c.volume, 0);

    // 4. Match Player Limit Orders if price crossed order price
    for (const order of updatedState.activeOrders) {
      if (order.cardCode === cardCode && order.status === 'open') {
        const remainingVol = order.volume - order.filledVolume;
        if (order.type === 'buy' && newPrice <= order.price) {
          // Market dipped below or to player's buy price -> Fill!
          order.filledVolume = order.volume;
          order.status = 'filled';
          filledOrders.push(order);
        } else if (order.type === 'sell' && newPrice >= order.price) {
          // Market surged above or to player's sell price -> Fill!
          order.filledVolume = order.volume;
          order.status = 'filled';
          filledOrders.push(order);
        }
      }
    }
  }

  updatedState.lastTickDay = currentDay;
  updatedState.lastTickHour = currentHour;

  return { updatedState, filledOrders, activatedEvents, newRumorEvents };
}

// ==========================================
// EVENT SPAWNER (REPRINT, META, OP ROTATION, GRADING)
// ==========================================
function spawnRandomMarketEvent(
  cards: Record<string, MarketCardMeta>,
  currentDay: number
): MarketEvent | null {
  const cardList = Object.values(cards);
  if (cardList.length === 0) return null;

  const eventTypes: Array<'reprint' | 'hot_meta' | 'rotation' | 'grading_fail'> = [
    'reprint',
    'hot_meta',
    'rotation',
    'grading_fail',
  ];
  const chosenType = eventTypes[Math.floor(Math.random() * eventTypes.length)];

  // If rotation, filter ONLY for One Piece cards from older blocks
  let candidates = cardList;
  if (chosenType === 'rotation') {
    candidates = cardList.filter((c) => c.franchise === 'onepiece' && c.isOlderBlockOp);
    if (candidates.length === 0) return null;
  }

  const target = candidates[Math.floor(Math.random() * candidates.length)];
  const noticeDays =
    CARD_EXCHANGE_CONFIG.EVENTS.ADVANCE_NOTICE_DAYS_MIN +
    Math.floor(
      Math.random() *
        (CARD_EXCHANGE_CONFIG.EVENTS.ADVANCE_NOTICE_DAYS_MAX -
          CARD_EXCHANGE_CONFIG.EVENTS.ADVANCE_NOTICE_DAYS_MIN +
          1)
    );

  let title = '';
  let description = '';
  let impactPct = 0;

  switch (chosenType) {
    case 'reprint':
      impactPct = CARD_EXCHANGE_CONFIG.EVENTS.REPRINT_DROP; // -30%
      title = `Thông báo Tái Bản: ${target.name}`;
      description = `Nhà phát hành công bố tái bản số lượng lớn thẻ ${target.name} trong đợt in mới. Nguồn cung tăng mạnh, áp lực giảm -30%!`;
      break;
    case 'hot_meta':
      impactPct = Number(
        (
          CARD_EXCHANGE_CONFIG.EVENTS.HOT_CHARACTER_BOOST_MIN +
          Math.random() *
            (CARD_EXCHANGE_CONFIG.EVENTS.HOT_CHARACTER_BOOST_MAX -
              CARD_EXCHANGE_CONFIG.EVENTS.HOT_CHARACTER_BOOST_MIN)
        ).toFixed(2)
      ); // +20% to +40%
      title = `Cơn Sốt Meta & Anime: ${target.name}`;
      description = `Thẻ ${target.name} vừa đoạt chức vô địch giải đấu đỉnh cao và xuất hiện ấn tượng trên màn ảnh. Nhu cầu gom thẻ tăng vọt +${Math.round(impactPct * 100)}%!`;
      break;
    case 'rotation':
      impactPct = CARD_EXCHANGE_CONFIG.EVENTS.OP_ROTATION_DROP; // -25%
      title = `Standard Rotation One Piece: ${target.name}`;
      description = `Ban tổ chức giải One Piece TCG công bố xoay tua (Rotation) block thi đấu cũ. Thẻ ${target.name} không còn hợp lệ ở giải Standard, giá thi đấu giảm -25%!`;
      break;
    case 'grading_fail':
      impactPct = CARD_EXCHANGE_CONFIG.EVENTS.GRADING_FAIL_DROP; // -15%
      title = `Siết Chặt Kiểm Định: ${target.name}`;
      description = `Báo cáo Pop Report mới cho thấy tỉ lệ đạt PSA 10 của thẻ ${target.name} bị hạ thấp kỷ lục do lỗi cắt viền hàng loạt. Thị trường hạ định giá -15%!`;
      break;
  }

  return {
    id: `ev_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    cardCode: target.cardCode,
    cardName: target.name,
    title,
    description,
    impactType: chosenType,
    priceImpactPct: impactPct,
    scheduledDay: currentDay + noticeDays,
    status: 'rumor',
    announcedDay: currentDay,
  };
}

// ==========================================
// VAULT INITIAL SEED (GIVE PLAYER STARTER STOCKS & UNIQUE CARDS)
// ==========================================
export function getInitialVault(): {
  uniqueCards: UniqueCardItem[];
  fungibleStacks: Record<string, FungibleCardStack>;
} {
  const uniqueCards: UniqueCardItem[] = [
    {
      id: 'uniq_op05_007',
      cardCode: 'OP05-119-MANGA',
      name: 'Monkey D. Luffy (Gear 5 Manga)',
      franchise: 'onepiece',
      rarity: 'Manga',
      imageUrl: 'https://optcgapi.com/media/static/Card_Images/OP05-119_p1.jpg',
      serial: { number: 7, total: 100 }, // Low serial (<10%) -> +15%
      condition: 'Gem Mint',
      grading: {
        company: 'PSA',
        score: 10,
        label: 'PSA 10 Gem Mint',
        multiplier: 2.5,
      },
      ownerHistory: [
        {
          id: 'hist_1',
          owner: 'Bạn (Rút đầu tiên)',
          timestamp: Date.now() - 86400000,
          gameDay: 1,
          gameHour: 10,
          price: 0,
          type: 'pull',
        },
      ],
      isFirstOwner: true, // +5% bonus
      basePrice: 550.0,
      purchasePrice: 0,
      acquiredAtDay: 1,
      acquiredAtHour: 10,
    },
    {
      id: 'uniq_pkm_025',
      cardCode: 'PKM-CYBER-025',
      name: 'Pikachu Cyber Spark (Alt Art)',
      franchise: 'pokemon',
      rarity: 'AltArt',
      imageUrl: 'https://images.pokemontcg.io/base1/58_hires.png',
      serial: { number: 42, total: 500 }, // Low serial 42/500 (<10%) -> +15%
      condition: 'Mint',
      ownerHistory: [
        {
          id: 'hist_2',
          owner: 'Bạn (Rút đầu tiên)',
          timestamp: Date.now() - 43200000,
          gameDay: 1,
          gameHour: 14,
          price: 0,
          type: 'pull',
        },
      ],
      isFirstOwner: true,
      basePrice: 145.0,
      purchasePrice: 0,
      acquiredAtDay: 1,
      acquiredAtHour: 14,
    },
  ];

  const fungibleStacks: Record<string, FungibleCardStack> = {
    'OP01-004': {
      cardCode: 'OP01-004',
      name: 'Usopp (Sniper)',
      franchise: 'onepiece',
      rarity: 'Common',
      imageUrl: '🎯',
      quantity: 12,
      totalCostBasis: 3.6,
      avgBuyPrice: 0.3,
    },
    'PKM-COMM-001': {
      cardCode: 'PKM-COMM-001',
      name: 'Bulbasaur Seed Bloom',
      franchise: 'pokemon',
      rarity: 'Common',
      imageUrl: '#059669',
      quantity: 8,
      totalCostBasis: 14.4,
      avgBuyPrice: 1.8,
    },
    'PKM-COMM-007': {
      cardCode: 'PKM-COMM-007',
      name: 'Squirtle Hydro Shell',
      franchise: 'pokemon',
      rarity: 'Rare',
      imageUrl: '#0284c7',
      quantity: 4,
      totalCostBasis: 22.0,
      avgBuyPrice: 5.5,
    },
  };

  return { uniqueCards, fungibleStacks };
}

// ==========================================
// STATE LOADER & SAVER
// ==========================================
export function loadCardExchangeState(profileId: string = 'default'): CardExchangeState {
  try {
    const raw = localStorage.getItem(`${CARD_EXCHANGE_CONFIG.STORAGE_KEY}_${profileId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.marketCards && parsed.vaultFungibleStacks) {
        const freshCatalog = getInitialMarketCatalog();
        for (const code in freshCatalog) {
          if (!parsed.marketCards[code]) {
            parsed.marketCards[code] = freshCatalog[code];
          }
        }
        for (const code in parsed.marketCards) {
          const fresh = freshCatalog[code];
          if (fresh) {
            parsed.marketCards[code].imageUrl = fresh.imageUrl;
            parsed.marketCards[code].artUrl = fresh.artUrl;
            parsed.marketCards[code].regime = fresh.regime;
            parsed.marketCards[code].baseAnchorPrice = fresh.baseAnchorPrice;
            if (!parsed.marketCards[code].mmPhase && fresh.mmPhase) {
              parsed.marketCards[code].mmPhase = fresh.mmPhase;
            }
            if (!parsed.marketCards[code].memePhase && fresh.memePhase) {
              parsed.marketCards[code].memePhase = fresh.memePhase;
            }
            // Attach AMM Liquidity Pool
            parsed.marketCards[code].poolLiquidityUsd = fresh.poolLiquidityUsd;
            parsed.marketCards[code].poolTokenReserve = fresh.poolTokenReserve;
            parsed.marketCards[code].dollarsPerPoint = fresh.dollarsPerPoint;

            // Cơ chế Tái Cân Bằng Thanh Khoản (Arbitrage Rebalance)
            // Giữ giá thẻ Hit Bluechip quanh giá trị sưu tầm thực tế, loại bỏ triệt để các mức giá ảo cũ
            const baseAnchor = fresh.baseAnchorPrice || fresh.currentPrice;
            if (fresh.regime === 'bluechip_mm') {
              if (parsed.marketCards[code].currentPrice > baseAnchor * 1.25 || parsed.marketCards[code].currentPrice < baseAnchor * 0.75) {
                const targetPrice = Number((baseAnchor * (0.97 + 0.05 * Math.random())).toFixed(2));
                parsed.marketCards[code].currentPrice = targetPrice;
                parsed.marketCards[code].previousClose = Number((baseAnchor * 0.98).toFixed(2));
                parsed.marketCards[code].high24h = Math.max(targetPrice, Number((baseAnchor * 1.05).toFixed(2)));
                parsed.marketCards[code].low24h = Math.min(targetPrice, Number((baseAnchor * 0.94).toFixed(2)));
                if (parsed.marketCards[code].candles && parsed.marketCards[code].candles.length > 0) {
                  const lastIdx = parsed.marketCards[code].candles.length - 1;
                  parsed.marketCards[code].candles[lastIdx].close = targetPrice;
                  parsed.marketCards[code].candles[lastIdx].high = Math.max(parsed.marketCards[code].candles[lastIdx].high, targetPrice);
                  parsed.marketCards[code].candles[lastIdx].low = Math.min(parsed.marketCards[code].candles[lastIdx].low, targetPrice);
                }
              }
            } else if (fresh.regime === 'meme_ponzi') {
              if (parsed.marketCards[code].currentPrice > 8 || parsed.marketCards[code].currentPrice < 0.05) {
                parsed.marketCards[code].currentPrice = fresh.currentPrice;
                parsed.marketCards[code].previousClose = fresh.previousClose;
                parsed.marketCards[code].candles = fresh.candles;
                parsed.marketCards[code].high24h = fresh.high24h;
                parsed.marketCards[code].low24h = fresh.low24h;
              }
            }
          }
        }
        for (const u of parsed.vaultUniqueCards || []) {
          if (freshCatalog[u.cardCode]) {
            u.imageUrl = freshCatalog[u.cardCode].imageUrl;
          }
        }
        for (const code in parsed.vaultFungibleStacks) {
          if (freshCatalog[code]) {
            parsed.vaultFungibleStacks[code].imageUrl = freshCatalog[code].imageUrl;
          }
        }
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to load card exchange state, initializing fresh state', e);
  }

  const initialCatalog = getInitialMarketCatalog();
  const { uniqueCards, fungibleStacks } = getInitialVault();

  const freshState: CardExchangeState = {
    hasSeenIntro: false,
    marketCards: initialCatalog,
    vaultUniqueCards: uniqueCards,
    vaultFungibleStacks: fungibleStacks,
    activeOrders: [],
    tradeHistory: [
      {
        id: 'init_trade_1',
        cardCode: 'OP05-119-MANGA',
        cardName: 'Monkey D. Luffy (Gear 5 Manga)',
        type: 'market_buy',
        price: 550,
        volume: 1,
        totalValue: 550,
        feeTax1Pct: 5.5,
        realizedProfit: 0,
        profitTax10Pct: 0,
        timestamp: Date.now() - 86400000,
        gameDay: 1,
        gameHour: 10,
        details: 'Khởi tạo Sổ Thẻ: Nhận thẻ rút độc nhất ERC-721 #007/100',
      },
    ],
    billTaxRecords: [],
    marketEvents: [
      {
        id: 'init_event_1',
        cardCode: 'OP01-120-ALT',
        cardName: 'Shanks (Red Hair Manga Alt)',
        title: 'Tin Đồn: Sắp công bố kết quả giải Grand Prix Hải Quân',
        description:
          'Giới đầu tư rỉ tai nhau về sự thống trị của bộ bài Shanks. Hype đang tăng nhẹ trước thềm công bố!',
        impactType: 'hot_meta',
        priceImpactPct: 0.28,
        scheduledDay: 2,
        status: 'rumor',
        announcedDay: 1,
      },
    ],
    lastTickDay: 1,
    lastTickHour: 8,
  };

  saveCardExchangeState(profileId, freshState);
  return freshState;
}

export function saveCardExchangeState(profileId: string, state: CardExchangeState): void {
  try {
    localStorage.setItem(
      `${CARD_EXCHANGE_CONFIG.STORAGE_KEY}_${profileId}`,
      JSON.stringify(state)
    );
  } catch (e) {
    console.warn('Failed to save card exchange state to localStorage', e);
  }
}
