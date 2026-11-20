/**
 * Pokemon TCG Card Shop Simulator - Core Logic & Data Engine
 * Features:
 * - 10-card Booster Packs with Pokemon TCG Pocket pull rates
 * - 10 packs per Booster Box
 * - Authentic TCG card scan images (images.pokemontcg.io) + PokeAPI official artwork
 * - TCG Pocket Rarity tiers: ♢, ♢♢, ♢♢♢, ♢♢♢♢, ☆, ☆☆, ☆☆☆, 👑 Crown Rare
 * - 0.05% God Pack (Gói Thần Thánh) mechanics with guaranteed 10 ultra-rare cards
 * - Store level progression: Level 1 (151), Level 2 (Crown Zenith), Level 3 (Paldea Evolved), Level 5 (Prismatic Evolutions)
 */

import { EXPANDED_POKEMON_CARDS } from './pokemonCardsExpanded';
import { getBoosterSetCards as getPokemonBoosterSetCards, ALL_SETS_POKEMON_CARDS } from './pokemonSetsCardDatabase';
import type {
  CityHuntSpot,
  MarketPulseEvent,
  SatelliteKioskState,
  SecurityAlertEvent,
  TournamentBracketState,
  TournamentTrophy,
} from './shopExpansionSystems';
import {
  ONEPIECE_BOOSTER_SETS,
  ALL_ONEPIECE_BOOSTER_SETS,
  ONEPIECE_COLLECTOR_BOX_SETS,
  ALL_ONEPIECE_COLLECTOR_BOXES,
  ONEPIECE_BOUNTY_MYSTERY_SETS,
  ALL_ONEPIECE_BOUNTY_SETS,
  OP_GACHA_PACK_TIERS,
  ONEPIECE_CARDS_DB,
  ONEPIECE_PRODUCT_LICENSES,
  ONEPIECE_SHELF_UNLOCKS,
  ONEPIECE_STARTER_UNLOCKED_SHELVES,
  isOnePieceSetId,
  isOnePieceProductId,
  isOnePieceCollectorProduct,
  isOnePieceBountyProduct,
  isOnePieceGachaProduct,
  getOnePieceCollectorShelfIdForProduct,
  getOnePieceSet,
  getOnePieceSetCards,
  ripOnePieceBoosterPack,
  rollOnePieceGachaPack,
  rollOnePieceBountyBox,
  ONEPIECE_SET_EVENTS,
  OnePieceSetEventInfo,
} from './onePieceData';
import type { ShopDeliveryState } from './cardDeliverySystem';

export {
  ONEPIECE_BOOSTER_SETS,
  ALL_ONEPIECE_BOOSTER_SETS,
  ONEPIECE_COLLECTOR_BOX_SETS,
  ALL_ONEPIECE_COLLECTOR_BOXES,
  ONEPIECE_BOUNTY_MYSTERY_SETS,
  ALL_ONEPIECE_BOUNTY_SETS,
  OP_GACHA_PACK_TIERS,
  ONEPIECE_CARDS_DB,
  ONEPIECE_PRODUCT_LICENSES,
  ONEPIECE_SHELF_UNLOCKS,
  ONEPIECE_STARTER_UNLOCKED_SHELVES,
  isOnePieceSetId,
  isOnePieceProductId,
  isOnePieceCollectorProduct,
  isOnePieceBountyProduct,
  isOnePieceGachaProduct,
  getOnePieceCollectorShelfIdForProduct,
  getOnePieceSet,
  getOnePieceSetCards,
  ripOnePieceBoosterPack,
  rollOnePieceGachaPack,
  rollOnePieceBountyBox,
  ONEPIECE_SET_EVENTS,
  type OnePieceSetEventInfo,
};

export function getBoosterSetCards(setId: string): PokemonCard[] {
  if (isOnePieceSetId(setId)) {
    return getOnePieceSetCards(setId);
  }
  return getPokemonBoosterSetCards(setId);
}

export type PokemonType =
  | 'Fire'
  | 'Water'
  | 'Grass'
  | 'Lightning'
  | 'Psychic'
  | 'Fighting'
  | 'Darkness'
  | 'Metal'
  | 'Dragon'
  | 'Colorless'
  | 'Fairy'
  | 'None';

export type PocketRarity =
  | 'Diamond1' // ♢ 1 Kim Cương (Common)
  | 'Diamond2' // ♢♢ 2 Kim Cương (Uncommon)
  | 'Diamond3' // ♢♢♢ 3 Kim Cương (Rare Holo)
  | 'Diamond4' // ♢♢♢♢ 4 Kim Cương (Pokemon ex)
  | 'Star1' // ☆ 1 Sao (Illustration Rare - IR)
  | 'Star2' // ☆☆ 2 Sao (Full Art Trainer / Secret ex)
  | 'Star3' // ☆☆☆ 3 Sao (Immersive Rare 3D)
  | 'Crown'; // 👑 Crown Rare (Thẻ Vàng tối thượng 24K)

export type CardRarity =
  | 'Common'
  | 'Uncommon'
  | 'Rare Holo'
  | 'Double Rare EX'
  | 'Double Rare'
  | 'Illustration Rare'
  | 'Special Illustration Rare'
  | 'Hyper Rare Gold';

export interface PokemonCard {
  id: string;
  dexNumber: number;
  name: string;
  subtitle?: string;
  setId?: string;
  type: PokemonType;
  hp: number;
  rarity: CardRarity;
  pocketRarity: PocketRarity;
  raritySymbol: string;
  rarityLabel: string;
  setName: string;
  setNumber: string;
  marketPrice: number; // USD market price
  artist: string;
  attacks: Array<{ name: string; damage: string; cost: PokemonType[] }>;
  weakness: PokemonType;
  retreatCost: number;
  flavorText: string;
  holographicType: 'none' | 'reverse' | 'holo' | 'cosmic' | 'rainbow' | 'gold' | 'immersive';
  cardColor: string;
  accentColor: string;
  icon: string;
  imageUrl: string; // Full authentic TCG card scan
  artUrl: string; // Official Pokemon character illustration
  hasRgbAura?: boolean; // Dynamic RGB Chroma rotating aura for top grails
  isSlab?: boolean; // Graded slab flag
  slab?: GradedSlab; // PSA or CGC grade metadata
  universe?: 'pokemon' | 'onepiece';
  isManga?: boolean; // One Piece Manga Rare flag
  power?: number; // Power rating in One Piece TCG (e.g. 5000, 12000)
  faction?: string; // Faction in One Piece TCG (e.g. Straw Hat Crew, Navy)
  cardNumber?: string; // Standard Bandai OP card number (e.g. OP01-120)
  specialEventTitle?: string; // Unique set hit event title
  fallbackUrl?: string; // Procedural SVG fallback
}

export interface BoosterSetInfo {
  id: string;
  name: string;
  series: string;
  releaseYear: number;
  totalCards: number;
  unlockLevel: number;
  packWholesalePrice: number;
  packRetailPrice: number;
  boxWholesalePrice: number;
  boxRetailPrice: number;
  packsPerBox: number;
  coverPokemon: string;
  themeColor: string;
  accentColor: string;
  packImageUrl: string;
  boxImageUrl: string;
  description: string;
  logoUrl?: string;
  coverArtUrl?: string;
  universe?: 'pokemon' | 'onepiece';
}

export interface InventoryItem {
  id: string;
  productId: string;
  name: string;
  type: 'pack' | 'box' | 'single' | 'accessory';
  setName?: string;
  cardData?: PokemonCard;
  wholesaleCost: number;
  retailPrice: number;
  quantity: number;
  shelvedQuantity: number;
  imageUrl?: string;
  themeColor?: string;
}

export interface ShopCustomer {
  id: string;
  name: string;
  avatarColor: string;
  role: 'Collector' | 'Kid' | 'Player' | 'Whale' | 'Scalper';
  budget: number;
  initialBudget: number;
  preferredProduct: 'pack' | 'box' | 'single';
  basket: Array<{ item: InventoryItem; count: number; unitPrice: number }>;
  status: 'entering' | 'browsing' | 'queuing' | 'paying' | 'leaving';
  position: [number, number, number];
  targetPosition: [number, number, number];
  speechBubble?: string;
  patience: number;
  queueIndex?: number;
}

export interface DisplayCardEntry {
  card: PokemonCard;
  retailPrice: number;
  isSold?: boolean;
  isReserved?: boolean;
  isSlab?: boolean;
  slab?: GradedSlab;
  placedOrder?: number;
}

export interface PlaceDisplayCardResult {
  showcaseCards: DisplayCardEntry[];
  shelfCards: DisplayCardEntry[];
  location: 'showcase' | 'shelf';
  slotIndex: number;
}

export interface DeliveryParcel {
  id: string;
  orderTime: number;
  productId: string;
  name: string;
  productName?: string;
  type: 'pack' | 'box';
  itemType?: 'pack' | 'box';
  setName: string;
  totalItems: number;
  remainingItems: number;
  wholesaleCost: number;
  retailPrice: number;
  imageUrl: string;
  themeColor: string;
}

export interface TodayStats {
  revenue: number;
  profit: number;
  customersServed: number;
  itemsSold: number;
}

export interface ShopState {
  shopName: string;
  storeLevel: number;
  storeExp: number;
  storeExpToNext: number;
  cash: number;
  totalRevenue: number;
  packsOpenedCount: number;
  customersServedCount: number;
  reputation: number; // 0 to 100
  unlockedSets: string[];
  purchasedLicenses?: string[]; // IDs of purchased product licenses
  unlockedShelves?: string[]; // IDs of unlocked display & retail shelves
  binderCards: Record<string, number>; // cardId -> quantity
  inventory: InventoryItem[];
  showcaseCards: DisplayCardEntry[];
  shelfCards: DisplayCardEntry[];
  opShowcaseCards?: DisplayCardEntry[];
  opShelfCards?: DisplayCardEntry[];
  tableRentalPricePerHour?: number;
  tablePlayersCount?: number;
  totalTableRentalEarnings?: number;
  hiredStaff?: {
    cashier: number;
    restocker: number;
    officeStaff?: number;
    liveStreamer?: number;
    gradingReceptionist?: number;
    gradingSpecialists?: number;
    auctioneer?: number;
    auctionHost?: number;
  };
  liveStudioUnlocked?: boolean;
  gradingJobs?: GradingJob[];
  gradedSlabs?: OwnedGradedSlabEntry[];
  customerGradingOrders?: CustomerGradingOrder[];
  gradingPopReport?: Record<string, GradingPopReportEntry>;
  gradingLabStats?: GradingLabStats;
  slabAuctions?: SlabAuctionLot[];
  auctionConsignmentOffers?: AuctionConsignmentOffer[];
  auctionHistory?: CompletedAuctionRecord[];
  buybackOffers?: WalkInBuybackOffer[];
  vipSlabOrders?: VipSlabOrder[];
  activeMarketTrend?: DailyMarketTrend;
  dailySalesHistory: Array<{
    day: number;
    revenue: number;
    profit: number;
    itemsSold: number;
  }>;
  currentDay: number;
  inGameHour: number; // 0.0 to 24.0 (07:00 to 00:00 is business hours)
  inGameMinute: number; // 0 to 59
  isShopOpen: boolean;
  pendingDeliveries: DeliveryParcel[];
  carriedParcel?: DeliveryParcel | null;
  isCarriedBoxOpen?: boolean;
  todayStats?: TodayStats;
  deliveryState?: ShopDeliveryState;
  // 3-Group Empire, Tournament, Market Pulse, Restoration, Security & Master Set Expansion
  activeTournament?: TournamentBracketState | null;
  trophyCollection?: TournamentTrophy[];
  marketPulseNews?: MarketPulseEvent[];
  liveBreakStats?: {
    breaksHosted: number;
    slotsSold: number;
    totalRevenue: number;
    viralFollowers: number;
  };
  cityHuntSpots?: CityHuntSpot[];
  ownedLuxuryAssets?: string[];
  satelliteKiosks?: Record<string, SatelliteKioskState>;
  claimedMasterSetMilestones?: string[];
  securityLevel?: number;
  activeSecurityAlert?: SecurityAlertEvent | null;
  securityStats?: {
    theftsPrevented: number;
    totalLosses: number;
    bountiesEarned: number;
  };
}

// ==========================================
// 1. BOOSTER SET DEFINITIONS (10 Packs per Box, Level Unlocks)
// ==========================================
export function getCardHoloClass(price: number, hasRgbAura?: boolean): string {
  if (price >= 1000) return 'card-holo-tier-4000';
  if (price >= 100) return 'card-holo-tier-100';
  if (price >= 25) return 'card-holo-tier-25';
  if (price >= 5 || hasRgbAura) return 'card-holo-tier-5';
  return '';
}

export const BOOSTER_SETS: Record<string, BoosterSetInfo> = {
  pokemon30thCommon: {
    id: 'pokemon30thCommon',
    name: '30th Anniversary (Common Set)',
    series: 'Pokémon 30th Celebration (2026)',
    releaseYear: 2026,
    totalCards: 706,
    unlockLevel: 1, // Common starter set (Pack Lvl 1, Box Lvl 2)
    packWholesalePrice: 2.5,
    packRetailPrice: 4.5, // 80% lãi
    boxWholesalePrice: 22.5, // 9 packs x $2.50
    boxRetailPrice: 41.0, // 82% lãi
    packsPerBox: 9,
    coverPokemon: 'Mew G/RGB 30th ($4000) & Pikachu',
    themeColor: '#0284c7',
    accentColor: '#38bdf8',
    logoUrl: 'https://images.pokemontcg.io/sv3pt5/logo.png',
    coverArtUrl: '/assets/grail_4000.jpg',
    packImageUrl: 'https://cdn.hstatic.net/products/200000160361/1234_7343f2ac70a64e7d8eee069e79da0905.jpg',
    boxImageUrl: 'https://www.gameon.games/cdn/shop/files/POK1010447101_1.jpg?v=1783496579&width=1920',
    description: 'Bộ mở rộng kỉ niệm 30 năm Pokemon giá bình dân tân thủ, cơ hội săn lá bài Thần thoại Mew G/RGB YOSHIROTTEN trị giá $4,000!',
  },
  paldeanFates: {
    id: 'paldeanFates',
    name: 'Scarlet & Violet: Paldean Fates',
    series: 'Scarlet & Violet (Special Expansion)',
    releaseYear: 2024,
    totalCards: 1162,
    unlockLevel: 3, // Pack Lvl 3, Box Lvl 4
    packWholesalePrice: 4.8,
    packRetailPrice: 9.0, // 88% lãi
    boxWholesalePrice: 43.2, // 9 packs x $4.80
    boxRetailPrice: 81.0, // 88% lãi
    packsPerBox: 9,
    coverPokemon: 'Shiny Mimikyu & Shiny Charizard ex',
    themeColor: '#581c87',
    accentColor: '#c084fc',
    logoUrl: 'https://images.pokemontcg.io/sv4pt5/logo.png',
    coverArtUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/778.png',
    packImageUrl: 'https://cdn.hstatic.net/products/200000992511/-pokemon-scarlet-_-violet-paldean-fates-elite-trainer-box-tcgp85618-10_078e0146ed5f409e9419ab821e2e72d4_master.jpg',
    boxImageUrl: 'https://acgamesonline.com/cdn/shop/files/raw--17_1200x1200.png?v=1711036389',
    description: 'Hộp Elite Trainer Box Scarlet & Violet: Paldean Fates với Shiny Mimikyu lấp lánh và cơ hội săn Shiny Charizard ex Special Illustration Rare!',
  },
  cosmicEclipse: {
    id: 'cosmicEclipse',
    name: 'Sun & Moon: Cosmic Eclipse',
    series: 'Sun & Moon',
    releaseYear: 2019,
    totalCards: 846,
    unlockLevel: 5, // Pack & Box Lvl 5
    packWholesalePrice: 5.0,
    packRetailPrice: 9.5, // 90% lãi
    boxWholesalePrice: 45.0, // 9 packs x $5.00
    boxRetailPrice: 86.0, // 91% lãi
    packsPerBox: 9,
    coverPokemon: 'Arceus Dialga Palkia & Solgaleo',
    themeColor: '#4f46e5',
    accentColor: '#818cf8',
    logoUrl: 'https://images.pokemontcg.io/sm12/logo.png',
    coverArtUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/493.png',
    packImageUrl: 'https://tcgplayer-cdn.tcgplayer.com/product/206028_in_1000x1000.jpg',
    boxImageUrl: 'https://cdn.shoplightspeed.com/shops/643438/files/72436375/pokemon-me02-phantasmal-flames-elite-trainer-box.jpg',
    description: 'Set đỉnh cao thời Sun & Moon quy tụ bộ ba thần thánh Arceus, Dialga, Palkia cùng Red & Blue!',
  },
  deltaReign: {
    id: 'deltaReign',
    name: 'Destined Rivals',
    series: 'Scarlet & Violet: Destined Rivals (2025)',
    releaseYear: 2025,
    totalCards: 806,
    unlockLevel: 6, // Pack & Box Lvl 6
    packWholesalePrice: 5.2,
    packRetailPrice: 9.8, // 88% lãi
    boxWholesalePrice: 46.8, // 9 packs x $5.20
    boxRetailPrice: 88.0, // 88% lãi
    packsPerBox: 9,
    coverPokemon: 'Team Rocket Giovanni & Mewtwo',
    themeColor: '#dc2626',
    accentColor: '#ef4444',
    logoUrl: 'https://images.pokemontcg.io/sv7/logo.png',
    coverArtUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/150.png',
    packImageUrl: 'https://screenfreegames.com/cdn/shop/files/PokemonDestinedRivalsBoosterpack.webp?v=1747974163',
    boxImageUrl: 'https://screenfreegames.com/cdn/shop/files/pokemondestinedrivalselitetrainerbox.png?v=1746559914',
    description: 'Bộ mở rộng Scarlet & Violet: Destined Rivals huyền thoại với Mewtwo và trùm Team Rocket Giovanni!',
  },
  perfectOrder: {
    id: 'perfectOrder',
    name: 'Perfect Order',
    series: 'Kalos Legends Expansion',
    releaseYear: 2025,
    totalCards: 576,
    unlockLevel: 7, // Pack & Box Lvl 7
    packWholesalePrice: 5.3,
    packRetailPrice: 10.0, // 89% lãi
    boxWholesalePrice: 47.7, // 9 packs x $5.30
    boxRetailPrice: 90.0, // 89% lãi
    packsPerBox: 9,
    coverPokemon: 'Zygarde Complete & Xerneas',
    themeColor: '#16a34a',
    accentColor: '#4ade80',
    logoUrl: 'https://images.pokemontcg.io/sv7/logo.png',
    coverArtUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/718.png',
    packImageUrl: 'https://pokesymbols.com/images/tcg/sets/booster-pack-art/perfect-order-pack-3.avif',
    boxImageUrl: 'https://gamesland.ca/cdn/shop/files/pokemon-me25-ascended-heroes-elite-trainer-box-pre-order-pokemon-5367499.png?v=1766196609',
    description: 'Trật tự hoàn hảo của Zygarde dạng hoàn chỉnh 100% thức tỉnh cân bằng lại hệ sinh thái lục địa!',
  },
  evolvingSkies: {
    id: 'evolvingSkies',
    name: 'Sword & Shield: Evolving Skies',
    series: 'Sword & Shield',
    releaseYear: 2021,
    totalCards: 1106,
    unlockLevel: 8, // Pack & Box Lvl 8
    packWholesalePrice: 5.5,
    packRetailPrice: 10.5, // 91% lãi
    boxWholesalePrice: 49.5, // 9 packs x $5.50
    boxRetailPrice: 95.0, // 92% lãi
    packsPerBox: 9,
    coverPokemon: 'Rayquaza VMAX & Duraludon',
    themeColor: '#059669',
    accentColor: '#34d399',
    logoUrl: 'https://images.pokemontcg.io/swsh7/logo.png',
    coverArtUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/384.png',
    packImageUrl: 'https://m.media-amazon.com/images/I/814N5FR88dL._AC_UF894,1000_QL80_.jpg',
    boxImageUrl: 'https://static0.dualshockersimages.com/wordpress/wp-content/uploads/2021/08/Pok-mon-TCG-All-Cards-Confirmed-For-Evolving-Skies-Expansion.jpg?w=1200&h=675&fit=crop',
    description: 'Set rồng thần và Eeveelutions đắt giá nhất kỷ nguyên Sword & Shield với Rayquaza VMAX Alt Art và Moonbreon!',
  },
  prismaticEvolutions: {
    id: 'prismaticEvolutions',
    name: 'Ascended Heroes',
    series: 'Mega Evolution (2025)',
    releaseYear: 2025,
    totalCards: 741,
    unlockLevel: 9, // Pack & Box Lvl 9
    packWholesalePrice: 6.3,
    packRetailPrice: 12.0, // 90% lãi
    boxWholesalePrice: 56.7, // 9 packs x $6.30
    boxRetailPrice: 108.0, // 90% lãi
    packsPerBox: 9,
    coverPokemon: 'Mega Dragonite',
    themeColor: '#0891b2',
    accentColor: '#eab308',
    logoUrl: 'https://images.pokemontcg.io/sv8pt5/logo.png',
    coverArtUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/149.png',
    packImageUrl: 'https://tcgplayer-cdn.tcgplayer.com/product/672434_in_1000x1000.jpg',
    boxImageUrl: 'https://gamesland.ca/cdn/shop/files/pokemon-me25-ascended-heroes-elite-trainer-box-pre-order-pokemon-5367499.png?v=1766196609',
    description: 'Set Mega Evolution: Ascended Heroes với Dragonite, các thẻ siêu anh hùng huyền thoại và tỷ lệ hit cực cao!',
  },
  pokemonRedVintage: {
    id: 'pokemonRedVintage',
    name: 'Base Set Vintage (Red Version)',
    series: 'Original Series 1996-1999',
    releaseYear: 1999,
    totalCards: 665,
    unlockLevel: 10, // Pack & Box Lvl 10 (Chase cuối level 10)
    packWholesalePrice: 50.0,
    packRetailPrice: 95.0, // 90% lãi
    boxWholesalePrice: 450.0, // 9 packs x $50.00
    boxRetailPrice: 855.0, // 90% lãi ($405 lãi)
    packsPerBox: 9,
    coverPokemon: '1st Edition Shadowless Charizard ($3,800)',
    themeColor: '#b91c1c',
    accentColor: '#ef4444',
    logoUrl: 'https://images.pokemontcg.io/base1/logo.png',
    coverArtUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/6.png',
    packImageUrl: '/assets/packs/base_set_charizard_pack_transparent.png',
    boxImageUrl: 'https://images-wixmp-ed30a86b8c4ca887773594c2.wixmp.com/f/c9be30e5-5d79-4c7e-b734-3ce0a28bb294/d9tkts1-dae18058-0d96-4877-9300-1a00856253fa.png/v1/fill/w_894,h_894,q_70,strp/pokemon_red_version_game_boy_hq_box_art_clean_by_jadelune_d9tkts1-pre.jpg?token=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1cm46YXBwOjdlMGQxODg5ODIyNjQzNzNhNWYwZDQxNWVhMGQyNmUwIiwiaXNzIjoidXJuOmFwcDo3ZTBkMTg4OTgyMjY0MzczYTVmMGQ0MTVlYTBkMjZlMCIsIm9iaiI6W1t7ImhlaWdodCI6Ijw9OTAwIiwicGF0aCI6Ii9mL2M5YmUzMGU1LTVkNzktNGM3ZS1iNzM0LTNjZTBhMjhiYjI5NC9kOXRrdHMxLWRhZTE4MDU4LTBkOTYtNDg3Ny05MzAwLTFhMDA4NTYyNTNmYS5wbmciLCJ3aWR0aCI6Ijw9OTAwIn1dXSwiYXVkIjpbInVybjpzZXJ2aWNlOmltYWdlLm9wZXJhdGlvbnMiXX0.pr7ctJ4bW-espPOxmjoabbn7Im71XEaOaM0gtWOy_kI',
    description: 'Hộp bài nguyên bản Game Boy Red Version chứa 9 gói bài Base Set cổ điển với huyền thoại 1st Edition Charizard $3,800!',
  },
};

// Aliases defined as NON-ENUMERABLE properties to prevent duplicate keys in Object.values(BOOSTER_SETS)
Object.defineProperty(BOOSTER_SETS, 'surgingSparks', {
  get: () => BOOSTER_SETS.paldeanFates,
  enumerable: false,
  configurable: true,
});
Object.defineProperty(BOOSTER_SETS, 'ascendedHeroes', {
  get: () => BOOSTER_SETS.prismaticEvolutions,
  enumerable: false,
  configurable: true,
});
Object.defineProperty(BOOSTER_SETS, 'destinedRivals', {
  get: () => BOOSTER_SETS.deltaReign,
  enumerable: false,
  configurable: true,
});

/**
 * Unique list of all booster sets without duplicates
 */
export const ALL_UNIQUE_BOOSTER_SETS: BoosterSetInfo[] = [
  BOOSTER_SETS.pokemon30thCommon,
  BOOSTER_SETS.paldeanFates,
  BOOSTER_SETS.cosmicEclipse,
  BOOSTER_SETS.deltaReign,
  BOOSTER_SETS.perfectOrder,
  BOOSTER_SETS.evolvingSkies,
  BOOSTER_SETS.prismaticEvolutions,
  BOOSTER_SETS.pokemonRedVintage,
];

/**
 * High-Value Rare Collector / Ultra-Premium Box Catalog (Mở khóa từ Cấp 10+)
 * Lợi nhuận bán cao hơn bình thường (67% - 80% lãi)
 */
export const COLLECTOR_MAX_BOXES_PER_SHELF = 4;
export const COLLECTOR_SHELF_LAYOUT = '1x1' as const;

export const COLLECTOR_BOX_SETS: Record<string, BoosterSetInfo> = {
  collector_30th_night_upc: {
    id: 'collector_30th_night_upc',
    name: '30th Celebration Night Ultra Premium Collection',
    series: 'Pokémon 30th Anniversary (Celebration Night UPC)',
    releaseYear: 2026,
    totalCards: 300,
    unlockLevel: 10, // Mở khóa Cấp 10
    packWholesalePrice: 22.5,
    packRetailPrice: 50.0,
    boxWholesalePrice: 450.0,
    boxRetailPrice: 1000.0, // Lãi $550 (122.2% siêu lợi nhuận)
    packsPerBox: 20,
    coverPokemon: 'Celebration Night Charizard & Golden Pikachu 30th',
    themeColor: '#090d16',
    accentColor: '#f59e0b',
    logoUrl: 'https://images.pokemontcg.io/base1/logo.png',
    coverArtUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png',
    packImageUrl: '/packs/pokemon30thCommon.png',
    boxImageUrl: '/boxes/pokemon30thCelebrationNight.png',
    description:
      'Hộp Ultra-Premium Collection Hoàng Gia 30 năm (30th Celebration Night UPC): 20 gói đặc biệt 30th, thẻ kim loại kỉ niệm vàng Charizard & Pikachu, playmat Celebration Night & phụ kiện siêu VIP. Siêu lợi nhuận: Lãi +$550/hộp (122%)!',
  },
  collector_sv151_upc: {
    id: 'collector_sv151_upc',
    name: 'Scarlet & Violet: 151 Ultra-Premium Collection',
    series: 'Scarlet & Violet 151 (UPC)',
    releaseYear: 2023,
    totalCards: 207,
    unlockLevel: 10, // Mở khóa Cấp 10
    packWholesalePrice: 23.5,
    packRetailPrice: 53.0,
    boxWholesalePrice: 380.0,
    boxRetailPrice: 850.0, // Lãi $470 (123.7% siêu lợi nhuận)
    packsPerBox: 16,
    coverPokemon: 'Mew ex Metal Promo & Charizard ex 151 SIR',
    themeColor: '#e11d48',
    accentColor: '#f472b6',
    logoUrl: 'https://images.pokemontcg.io/sv3pt5/logo.png',
    coverArtUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/151.png',
    packImageUrl: '/packs/sv151_upc_pack_clean.png',
    boxImageUrl: '/boxes/sv151_clean.png',
    description:
      'Hộp Ultra-Premium Collection Scarlet & Violet 151 (Mew UPC): 16 gói 151 chính hãng, thẻ kim loại Mew ex, promo Mew ex & Mewtwo. Siêu lợi nhuận: Lãi +$470/hộp (124%)!',
  },
  collector_prismatic_spc: {
    id: 'collector_prismatic_spc',
    name: 'Prismatic Evolutions Super-Premium Collection',
    series: 'Scarlet & Violet: Prismatic Evolutions (SPC)',
    releaseYear: 2025,
    totalCards: 180,
    unlockLevel: 10, // Mở khóa Cấp 10
    packWholesalePrice: 7.3,
    packRetailPrice: 18.0,
    boxWholesalePrice: 110.0,
    boxRetailPrice: 270.0, // Lãi $160 (145.5% siêu lợi nhuận)
    packsPerBox: 15,
    coverPokemon: 'Stellar Tera Eevee ex SIR & Umbreon ex',
    themeColor: '#7c3aed',
    accentColor: '#c084fc',
    logoUrl: 'https://images.pokemontcg.io/sv8pt5/logo.png',
    coverArtUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/133.png',
    packImageUrl: '/packs/prismatic_spc_tight.png',
    boxImageUrl: '/boxes/prismatic_clean.png',
    description:
      'Hộp Super-Premium Collection SV Prismatic Evolutions (Eevee Terastal SPC): 15 gói thẻ SV 151 cao cấp, promo Eevee ex, hộp bài nhung Eevee & playmat. Siêu lợi nhuận: Lãi +$160/hộp (145%)!',
  },
  collector_25th_upc: {
    id: 'collector_25th_upc',
    name: '25th Celebrations Ultra-Premium Collection Box',
    series: 'Pokémon 25th Anniversary Celebrations (UPC)',
    releaseYear: 2021,
    totalCards: 250,
    unlockLevel: 10, // Mở khóa Cấp 10
    packWholesalePrice: 20.0,
    packRetailPrice: 50.0,
    boxWholesalePrice: 500.0,
    boxRetailPrice: 1250.0, // Lãi $750 (150% siêu lợi nhuận)
    packsPerBox: 25,
    coverPokemon: 'Gold Metal Base Set Pikachu & Charizard',
    themeColor: '#ca8a04',
    accentColor: '#facc15',
    logoUrl: 'https://images.pokemontcg.io/base1/logo.png',
    coverArtUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png',
    packImageUrl: '/packs/celebrations25th_clean.png',
    boxImageUrl: '/boxes/celeb25_clean.png',
    description:
      'Bảo vật kỷ niệm 25 năm Celebrations Ultra-Premium Collection: 25 gói Celebrations chính hãng (Charizard Base Set #4, Umbreon Gold Star). Siêu lợi nhuận kỷ lục: Lãi +$750/hộp (150%)!',
  },
};

export const ALL_COLLECTOR_BOXES: BoosterSetInfo[] = [
  COLLECTOR_BOX_SETS.collector_30th_night_upc,
  COLLECTOR_BOX_SETS.collector_sv151_upc,
  COLLECTOR_BOX_SETS.collector_prismatic_spc,
  COLLECTOR_BOX_SETS.collector_25th_upc,
];

/**
 * Official GameStop Pokémon Mystery Boxes (Mở khóa từ Cấp 10+)
 */
export const GAMESTOP_MYSTERY_SETS: Record<string, BoosterSetInfo> = {
  gamestop_mystery_gold: {
    id: 'gamestop_mystery_gold',
    name: 'GameStop Mystery Power Box (Gold Edition)',
    series: 'GameStop Exclusive (Gold Edition)',
    releaseYear: 2026,
    totalCards: 200,
    unlockLevel: 10, // Mở khóa Cấp 10
    packWholesalePrice: 15.0,
    packRetailPrice: 26.0,
    boxWholesalePrice: 75.0,
    boxRetailPrice: 130.0, // Lãi $55
    packsPerBox: 5,
    coverPokemon: 'Mystery Gold Pikachu & Charizard Vintage',
    themeColor: '#121214',
    accentColor: '#e11d48',
    logoUrl: '/boxes/gamestop_gamestopLogo.png',
    coverArtUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png',
    packImageUrl: '/packs/pokemon30thCommon.png',
    boxImageUrl: '/boxes/gamestop_box1.png',
    description:
      'Hộp bí ẩn GameStop Mystery Power Box (Gold Edition): 5 booster packs đặc biệt, thẻ vintage foil và xúc xắc phụ kiện độc quyền GameStop.',
  },
  gamestop_mystery_charizard: {
    id: 'gamestop_mystery_charizard',
    name: 'GameStop Collector Mystery Chest (Charizard)',
    series: 'GameStop Exclusive (Charizard Edition)',
    releaseYear: 2026,
    totalCards: 220,
    unlockLevel: 11, // Mở khóa Cấp 11
    packWholesalePrice: 18.0,
    packRetailPrice: 33.0,
    boxWholesalePrice: 90.0,
    boxRetailPrice: 165.0, // Lãi $75
    packsPerBox: 6,
    coverPokemon: 'Charizard Tera & Ultra Beasts',
    themeColor: '#0a0a0c',
    accentColor: '#f97316',
    logoUrl: '/boxes/gamestop_gamestopLogo.png',
    coverArtUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/6.png',
    packImageUrl: '/packs/paldeanFates.jpg',
    boxImageUrl: '/boxes/gamestop_box2.png',
    description:
      'Rương bí ẩn GameStop Collector Mystery Chest (Charizard Edition): 6 booster packs hiếm, thẻ promo Charizard và huy hiệu kim loại.',
  },
  gamestop_mystery_black: {
    id: 'gamestop_mystery_black',
    name: 'GameStop Ultra Mystery Vault (Black Diamond)',
    series: 'GameStop Exclusive (Black Vault)',
    releaseYear: 2026,
    totalCards: 250,
    unlockLevel: 12, // Mở khóa Cấp 12
    packWholesalePrice: 20.0,
    packRetailPrice: 38.0,
    boxWholesalePrice: 120.0,
    boxRetailPrice: 230.0, // Lãi $110
    packsPerBox: 8,
    coverPokemon: 'Graded Slabs & Vintage Holo Grails',
    themeColor: '#050507',
    accentColor: '#ef4444',
    logoUrl: '/boxes/gamestop_gamestopLogo.png',
    coverArtUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/150.png',
    packImageUrl: '/packs/destinedRivals.png',
    boxImageUrl: '/boxes/gamestop_box3.png',
    description:
      'Hộp bí ẩn GameStop Ultra Mystery Vault siêu phẩm: 8 booster packs, cơ hội rút thẻ Vintage Base Set và Graded Slab PSA 10.',
  },
};

export const ALL_GAMESTOP_MYSTERY_BOXES: BoosterSetInfo[] = [
  GAMESTOP_MYSTERY_SETS.gamestop_mystery_gold,
  GAMESTOP_MYSTERY_SETS.gamestop_mystery_charizard,
  GAMESTOP_MYSTERY_SETS.gamestop_mystery_black,
];

export const ALL_GAMESTOP_MYSTERY_SETS: BoosterSetInfo[] = ALL_GAMESTOP_MYSTERY_BOXES;

// ==========================================
// 1.5 PRODUCT LICENSES & LEVEL 1–10 PROGRESSION
// ==========================================
export interface ProductLicense {
  id: string;
  productId: string;
  name: string;
  set: string;
  type: 'pack' | 'box';
  level: number;
  cost: number; // Wholesale unit cost
  price: number; // Retail unit price
  licenseFee: number; // License fee to unlock
  packsPerBox?: number;
  description: string;
  imageUrl?: string;
}

export const PRODUCT_LICENSES: ProductLicense[] = [
  {
    id: 'lic_30th_pack',
    productId: 'pokemon30thCommon_pack',
    name: 'Giấy Phép Pack 30th Common',
    set: '30th Common',
    type: 'pack',
    level: 1,
    licenseFee: 0,
    cost: 2.5,
    price: 4.5,
    description: 'Cho phép nhập và bán gói bài kỉ niệm 30th Common tân thủ (10 thẻ/pack).',
    imageUrl: 'https://cdn.hstatic.net/products/200000160361/1234_7343f2ac70a64e7d8eee069e79da0905.jpg',
  },
  {
    id: 'lic_30th_box',
    productId: 'pokemon30thCommon_box',
    name: 'Giấy Phép Box 30th Common',
    set: '30th Common',
    type: 'box',
    level: 2,
    licenseFee: 50,
    cost: 22.5,
    price: 41.0,
    packsPerBox: 9,
    description: 'Cho phép nhập và bán hộp nguyên seal 9 pack 30th Common.',
    imageUrl: 'https://www.gameon.games/cdn/shop/files/POK1010447101_1.jpg?v=1783496579&width=1920',
  },
  {
    id: 'lic_paldean_pack',
    productId: 'paldeanFates_pack',
    name: 'Giấy Phép Pack Scarlet & Violet (Paldea Fates)',
    set: 'Scarlet & Violet (Paldea Fates)',
    type: 'pack',
    level: 3,
    licenseFee: 100,
    cost: 4.8,
    price: 9.0,
    description: 'Cho phép nhập và bán gói bài Scarlet & Violet Paldean Fates.',
    imageUrl: 'https://cdn.hstatic.net/products/200000992511/-pokemon-scarlet-_-violet-paldean-fates-elite-trainer-box-tcgp85618-10_078e0146ed5f409e9419ab821e2e72d4_master.jpg',
  },
  {
    id: 'lic_paldean_box',
    productId: 'paldeanFates_box',
    name: 'Giấy Phép Box Scarlet & Violet (Paldea Fates)',
    set: 'Scarlet & Violet (Paldea Fates)',
    type: 'box',
    level: 4,
    licenseFee: 150,
    cost: 43.2,
    price: 81.0,
    packsPerBox: 9,
    description: 'Cho phép nhập và bán hộp nguyên seal 9 pack Paldean Fates.',
    imageUrl: 'https://acgamesonline.com/cdn/shop/files/raw--17_1200x1200.png?v=1711036389',
  },
  {
    id: 'lic_cosmic_pack',
    productId: 'cosmicEclipse_pack',
    name: 'Giấy Phép Pack Cosmic Eclipse',
    set: 'Cosmic Eclipse',
    type: 'pack',
    level: 5,
    licenseFee: 200,
    cost: 5.0,
    price: 9.5,
    description: 'Cho phép nhập và bán gói bài Sun & Moon Cosmic Eclipse.',
    imageUrl: 'https://tcgplayer-cdn.tcgplayer.com/product/206028_in_1000x1000.jpg',
  },
  {
    id: 'lic_cosmic_box',
    productId: 'cosmicEclipse_box',
    name: 'Giấy Phép Box Cosmic Eclipse',
    set: 'Cosmic Eclipse',
    type: 'box',
    level: 5,
    licenseFee: 250,
    cost: 45.0,
    price: 86.0,
    packsPerBox: 9,
    description: 'Cho phép nhập và bán hộp nguyên seal 9 pack Cosmic Eclipse.',
    imageUrl: 'https://cdn.shoplightspeed.com/shops/643438/files/72436375/pokemon-me02-phantasmal-flames-elite-trainer-box.jpg',
  },
  {
    id: 'lic_destined_pack',
    productId: 'deltaReign_pack',
    name: 'Giấy Phép Pack Destined Rivals',
    set: 'Destined Rivals',
    type: 'pack',
    level: 6,
    licenseFee: 250,
    cost: 5.2,
    price: 9.8,
    description: 'Cho phép nhập và bán gói bài Destined Rivals Team Rocket & Mewtwo.',
    imageUrl: 'https://screenfreegames.com/cdn/shop/files/PokemonDestinedRivalsBoosterpack.webp?v=1747974163',
  },
  {
    id: 'lic_destined_box',
    productId: 'deltaReign_box',
    name: 'Giấy Phép Box Destined Rivals',
    set: 'Destined Rivals',
    type: 'box',
    level: 6,
    licenseFee: 300,
    cost: 46.8,
    price: 88.0,
    packsPerBox: 9,
    description: 'Cho phép nhập và bán hộp nguyên seal 9 pack Destined Rivals.',
    imageUrl: 'https://screenfreegames.com/cdn/shop/files/pokemondestinedrivalselitetrainerbox.png?v=1746559914',
  },
  {
    id: 'lic_perfect_pack',
    productId: 'perfectOrder_pack',
    name: 'Giấy Phép Pack Perfect Order',
    set: 'Perfect Order',
    type: 'pack',
    level: 7,
    licenseFee: 300,
    cost: 5.3,
    price: 10.0,
    description: 'Cho phép nhập và bán gói bài Kalos Legends Perfect Order.',
    imageUrl: 'https://pokesymbols.com/images/tcg/sets/booster-pack-art/perfect-order-pack-3.avif',
  },
  {
    id: 'lic_perfect_box',
    productId: 'perfectOrder_box',
    name: 'Giấy Phép Box Perfect Order',
    set: 'Perfect Order',
    type: 'box',
    level: 7,
    licenseFee: 350,
    cost: 47.7,
    price: 90.0,
    packsPerBox: 9,
    description: 'Cho phép nhập và bán hộp nguyên seal 9 pack Perfect Order.',
    imageUrl: 'https://gamesland.ca/cdn/shop/files/pokemon-me25-ascended-heroes-elite-trainer-box-pre-order-pokemon-5367499.png?v=1766196609',
  },
  {
    id: 'lic_evolving_pack',
    productId: 'evolvingSkies_pack',
    name: 'Giấy Phép Pack Evolving Skies',
    set: 'Evolving Skies',
    type: 'pack',
    level: 8,
    licenseFee: 400,
    cost: 5.5,
    price: 10.5,
    description: 'Cho phép nhập và bán gói bài thần rồng Evolving Skies Rayquaza.',
    imageUrl: 'https://m.media-amazon.com/images/I/814N5FR88dL._AC_UF894,1000_QL80_.jpg',
  },
  {
    id: 'lic_evolving_box',
    productId: 'evolvingSkies_box',
    name: 'Giấy Phép Box Evolving Skies',
    set: 'Evolving Skies',
    type: 'box',
    level: 8,
    licenseFee: 450,
    cost: 49.5,
    price: 95.0,
    packsPerBox: 9,
    description: 'Cho phép nhập và bán hộp nguyên seal 9 pack Evolving Skies.',
    imageUrl: 'https://static0.dualshockersimages.com/wordpress/wp-content/uploads/2021/08/Pok-mon-TCG-All-Cards-Confirmed-For-Evolving-Skies-Expansion.jpg?w=1200&h=675&fit=crop',
  },
  {
    id: 'lic_prismatic_pack',
    productId: 'prismaticEvolutions_pack',
    name: 'Giấy Phép Pack Ascended Heroes',
    set: 'Ascended Heroes',
    type: 'pack',
    level: 9,
    licenseFee: 500,
    cost: 6.3,
    price: 12.0,
    description: 'Cho phép nhập và bán gói bài Mega Evolution Ascended Heroes.',
    imageUrl: 'https://tcgplayer-cdn.tcgplayer.com/product/672434_in_1000x1000.jpg',
  },
  {
    id: 'lic_prismatic_box',
    productId: 'prismaticEvolutions_box',
    name: 'Giấy Phép Box Ascended Heroes',
    set: 'Ascended Heroes',
    type: 'box',
    level: 9,
    licenseFee: 600,
    cost: 56.7,
    price: 108.0,
    packsPerBox: 9,
    description: 'Cho phép nhập và bán hộp nguyên seal 9 pack Ascended Heroes.',
    imageUrl: 'https://gamesland.ca/cdn/shop/files/pokemon-me25-ascended-heroes-elite-trainer-box-pre-order-pokemon-5367499.png?v=1766196609',
  },
  {
    id: 'lic_vintage_pack',
    productId: 'pokemonRedVintage_pack',
    name: 'Giấy Phép Pack Base Set Vintage',
    set: 'Base Set Vintage',
    type: 'pack',
    level: 10,
    licenseFee: 800,
    cost: 50.0,
    price: 95.0,
    description: 'Cho phép nhập và bán gói bài huyền thoại cổ điển 1999 Base Set Vintage ($50 vốn/pack).',
    imageUrl: '/assets/packs/base_set_charizard_pack_transparent.png',
  },
  {
    id: 'lic_vintage_box',
    productId: 'pokemonRedVintage_box',
    name: 'Giấy Phép Box Base Set Vintage',
    set: 'Base Set Vintage',
    type: 'box',
    level: 10,
    licenseFee: 1000,
    cost: 450.0,
    price: 855.0,
    packsPerBox: 9,
    description: 'Cho phép nhập và bán hộp nguyên seal 9 pack Game Boy Red Version Base Set (Lãi ròng $405/hộp).',
    imageUrl: 'https://images-wixmp-ed30a86b8c4ca887773594c2.wixmp.com/f/c9be30e5-5d79-4c7e-b734-3ce0a28bb294/d9tkts1-dae18058-0d96-4877-9300-1a00856253fa.png/v1/fill/w_894,h_894,q_70,strp/pokemon_red_version_game_boy_hq_box_art_clean_by_jadelune_d9tkts1-pre.jpg?token=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1cm46YXBwOjdlMGQxODg5ODIyNjQzNzNhNWYwZDQxNWVhMGQyNmUwIiwiaXNzIjoidXJuOmFwcDo3ZTBkMTg4OTgyMjY0MzczYTVmMGQ0MTVlYTBkMjZlMCIsIm9iaiI6W1t7ImhlaWdodCI6Ijw9OTAwIiwicGF0aCI6Ii9mL2M5YmUzMGU1LTVkNzktNGM3ZS1iNzM0LTNjZTBhMjhiYjI5NC9kOXRrdHMxLWRhZTE4MDU4LTBkOTYtNDg3Ny05MzAwLTFhMDA4NTYyNTNmYS5wbmciLCJ3aWR0aCI6Ijw9OTAwIn1dXSwiYXVkIjpbInVybjpzZXJ2aWNlOmltYWdlLm9wZXJhdGlvbnMiXX0.pr7ctJ4bW-espPOxmjoabbn7Im71XEaOaM0gtWOy_kI',
  },
  // Level 10+ Mystery & VIP Collector Licenses:
  {
    id: 'lic_gs_mystery_gold',
    productId: 'gamestop_mystery_gold_box',
    name: 'Giấy Phép GameStop Mystery Gold Box',
    set: 'GameStop Mystery Box',
    type: 'box',
    level: 10,
    licenseFee: 1000,
    cost: 75.0,
    price: 130.0,
    packsPerBox: 5,
    description: 'Hộp bí ẩn GameStop Gold Edition (Thẻ PSA/CGC 10 + 2 Booster Packs).',
    imageUrl: '/boxes/gamestop_box1.png',
  },
  {
    id: 'lic_mystery_gacha_packs',
    productId: 'gacha_silver',
    name: 'Giấy Phép Kệ Gondola Mystery Packs (8 Tiers)',
    set: 'Mystery Gacha Packs',
    type: 'pack',
    level: 10,
    licenseFee: 1200,
    cost: 15.0,
    price: 25.0,
    description: 'Mở khóa phân phối 8 phân hạng Pokémon Mystery Pack trên kệ Gondola giữa shop.',
    imageUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png',
  },
  {
    id: 'lic_col_30th_night_upc',
    productId: 'collector_30th_night_upc_box',
    name: 'Giấy Phép 30th Celebration Night UPC',
    set: 'VIP Collector 1x1',
    type: 'box',
    level: 10,
    licenseFee: 1200,
    cost: 450.0,
    price: 1000.0,
    packsPerBox: 20,
    description: 'Bảo vật kỉ niệm hoàng gia 30 năm Ultra Premium Collection. Siêu lợi nhuận: Lãi +$550/hộp (122%)!',
    imageUrl: '/boxes/pokemon30thCelebrationNight.png',
  },
  {
    id: 'lic_col_sv151_upc',
    productId: 'collector_sv151_upc_box',
    name: 'Giấy Phép Scarlet & Violet 151 UPC (Mew)',
    set: 'VIP Collector 1x1',
    type: 'box',
    level: 10,
    licenseFee: 1500,
    cost: 380.0,
    price: 850.0,
    packsPerBox: 16,
    description: 'Rương Mew 151 Ultra-Premium Collection với thẻ kim loại Mew ex và 16 gói 151. Siêu lợi nhuận: Lãi +$470/hộp (124%)!',
    imageUrl: '/boxes/sv151_clean.png',
  },
  {
    id: 'lic_col_prismatic_spc',
    productId: 'collector_prismatic_spc_box',
    name: 'Giấy Phép Prismatic Evolutions SPC (Eevee)',
    set: 'VIP Collector 1x1',
    type: 'box',
    level: 10,
    licenseFee: 1800,
    cost: 110.0,
    price: 270.0,
    packsPerBox: 15,
    description: 'Hộp Super-Premium Eevee Terastal Prismatic Evolutions 15 packs. Siêu lợi nhuận: Lãi +$160/hộp (145%)!',
    imageUrl: '/boxes/prismatic_clean.png',
  },
  {
    id: 'lic_col_25th_upc',
    productId: 'collector_25th_upc_box',
    name: 'Giấy Phép 25th Celebrations UPC Box',
    set: 'VIP Collector 1x1',
    type: 'box',
    level: 10,
    licenseFee: 2500,
    cost: 500.0,
    price: 1250.0,
    packsPerBox: 25,
    description: 'Bảo vật 25 năm Celebrations UPC chứa 25 gói Celebrations chính hãng. Siêu lợi nhuận: Lãi +$750/hộp (150%)!',
    imageUrl: '/boxes/celeb25_clean.png',
  },
  ...ONEPIECE_PRODUCT_LICENSES,
];

export function hasProductLicense(purchasedLicenses: string[] = [], licenseIdOrProductId: string): boolean {
  if (!licenseIdOrProductId) return true;
  // Starter pack license on Floor 1 is free and unlocked from the beginning
  if (
    licenseIdOrProductId === 'lic_30th_pack' ||
    licenseIdOrProductId === 'pokemon30thCommon_pack' ||
    licenseIdOrProductId === 'pokemon30thCommon'
  ) {
    return true;
  }
  if (purchasedLicenses.includes(licenseIdOrProductId)) return true;
  const allLic = [...PRODUCT_LICENSES, ...ONEPIECE_PRODUCT_LICENSES];
  return purchasedLicenses.some((licId) => {
    const found = allLic.find((p) => p.id === licId);
    return found?.productId === licenseIdOrProductId || found?.id === licenseIdOrProductId;
  });
}

// ==========================================
// PROGRESSIVE SHELF UNLOCK SYSTEM (LEVEL + UNLOCK FEE)
// ==========================================
export type ShelfUnlockCategory = 'wall_expansion' | 'card_display' | 'specialty' | 'collector_vip';

export interface ShelfUnlockDefinition {
  id: string;
  name: string;
  shortName: string;
  category: ShelfUnlockCategory;
  floor?: 1 | 2;
  level: number;
  fee: number;
  capacityText: string;
  description: string;
  accentColor: string;
  bayIndex?: number;
}

export const STARTER_UNLOCKED_SHELVES: string[] = [
  'shelf_wall_bay_1',
  'shelf_card_1',
  ...ONEPIECE_STARTER_UNLOCKED_SHELVES,
];

export const SHELF_UNLOCKS: ShelfUnlockDefinition[] = [
  // 1. 4-Bay Expansion Collection Wall Shelf (Tường Phải)
  {
    id: 'shelf_wall_bay_1',
    name: 'Khoang Kệ Expansion #1 (Khởi Đầu)',
    shortName: 'Kệ Expansion #1',
    category: 'wall_expansion',
    level: 1,
    fee: 0,
    capacityText: '2 Ô Box (16 Hộp) · 8 Cột Pack (80 Gói)',
    description: 'Khoang kệ bán lẻ khởi đầu miễn phí để xếp các Booster Pack và Booster Box cơ bản.',
    accentColor: '#0284c7',
    bayIndex: 0,
  },
  {
    id: 'shelf_wall_bay_2',
    name: 'Khoang Kệ Expansion #2',
    shortName: 'Kệ Expansion #2',
    category: 'wall_expansion',
    level: 3,
    fee: 150,
    capacityText: '+2 Ô Box (16 Hộp) · +8 Cột Pack (80 Gói)',
    description: 'Mở rộng khoang kệ thứ 2 trên dãy Expansion Collection tường phải để chứa thêm nhiều set bài mới.',
    accentColor: '#0ea5e9',
    bayIndex: 1,
  },
  {
    id: 'shelf_wall_bay_3',
    name: 'Khoang Kệ Expansion #3',
    shortName: 'Kệ Expansion #3',
    category: 'wall_expansion',
    level: 5,
    fee: 350,
    capacityText: '+2 Ô Box (16 Hộp) · +8 Cột Pack (80 Gói)',
    description: 'Mở khóa khoang kệ thứ 3 cho các dòng Expansion tầm trung và cao cấp.',
    accentColor: '#38bdf8',
    bayIndex: 2,
  },
  {
    id: 'shelf_wall_bay_4',
    name: 'Khoang Kệ Expansion #4 (Full Dãy)',
    shortName: 'Kệ Expansion #4',
    category: 'wall_expansion',
    level: 8,
    fee: 600,
    capacityText: '+2 Ô Box (16 Hộp) · +8 Cột Pack (80 Gói)',
    description: 'Hoàn thiện toàn bộ 4 khoang kệ Expansion Collection tường phải với sức chứa tối đa 320 pack + 64 box!',
    accentColor: '#f59e0b',
    bayIndex: 3,
  },
  // 2. 3 Back-Wall Card Display Shelves (Tường Sau)
  {
    id: 'shelf_card_1',
    name: 'Kệ Trưng Bày Thẻ #1 (Fire & Dragon)',
    shortName: 'Kệ Thẻ #1',
    category: 'card_display',
    level: 1,
    fee: 0,
    capacityText: '6 Chân Đứng Thẻ Hiếm',
    description: 'Kệ trưng bày thẻ lẻ đầu tiên trên tường sau (miễn phí khi mở tiệm).',
    accentColor: '#ea580c',
    bayIndex: 0,
  },
  {
    id: 'shelf_card_2',
    name: 'Kệ Trưng Bày Thẻ #2 (30th Vintage)',
    shortName: 'Kệ Thẻ #2',
    category: 'card_display',
    level: 4,
    fee: 200,
    capacityText: '+6 Chân Đứng Thẻ Hiếm',
    description: 'Mở khóa kệ kính tường sau số #2 để trưng bày thêm 6 thẻ lẻ hoặc Slab PSA/CGC.',
    accentColor: '#eab308',
    bayIndex: 1,
  },
  {
    id: 'shelf_card_3',
    name: 'Kệ Trưng Bày Thẻ #3 (Secret Rare)',
    shortName: 'Kệ Thẻ #3',
    category: 'card_display',
    level: 7,
    fee: 450,
    capacityText: '+6 Chân Đứng Thẻ Hiếm',
    description: 'Mở khóa kệ kính tường sau số #3 dành cho các thẻ Secret Illustration Rare tối thượng.',
    accentColor: '#a855f7',
    bayIndex: 2,
  },
  // 3. Specialty Center & Counter Shelves
  {
    id: 'shelf_gacha_gondola',
    name: 'Kệ Gondola Mystery Gacha (Giữa Shop)',
    shortName: 'Kệ Mystery Gacha',
    category: 'specialty',
    level: 7,
    fee: 500,
    capacityText: '8 Hạng Gói Mystery (Tier 1 → 8)',
    description: 'Mở khóa kệ đảo giữa cửa hàng chuyên bán 8 phân hạng Pokémon Mystery Pack.',
    accentColor: '#8b5cf6',
  },
  {
    id: 'shelf_gamestop_mystery',
    name: 'Kệ GameStop Mystery Box (Quầy Thu Ngân)',
    shortName: 'Kệ GameStop Mystery',
    category: 'specialty',
    level: 8,
    fee: 600,
    capacityText: '3 Tầng Hộp GameStop Mystery',
    description: 'Mở khóa kệ thép đen GameStop đặt cạnh quầy thu ngân để bày bán các Mystery Power Box.',
    accentColor: '#ef4444',
  },
  // 4. Left-Wall VIP Collector 1x1 Shelves
  {
    id: 'shelf_collector_1',
    name: 'Kệ VIP #1: 30th Celebration Night UPC',
    shortName: 'Kệ VIP 30th Night',
    category: 'collector_vip',
    level: 9,
    fee: 500,
    capacityText: '2 Hộp VIP Collector 1×1',
    description: 'Mở khóa tủ trưng bày VIP tường trái #1 dành cho rương 30th Celebration Night UPC.',
    accentColor: '#f59e0b',
    bayIndex: 0,
  },
  {
    id: 'shelf_collector_2',
    name: 'Kệ VIP #2: Scarlet & Violet 151 UPC',
    shortName: 'Kệ VIP SV151',
    category: 'collector_vip',
    level: 9,
    fee: 700,
    capacityText: '2 Hộp VIP Collector 1×1',
    description: 'Mở khóa tủ trưng bày VIP tường trái #2 dành cho rương Scarlet & Violet 151 UPC.',
    accentColor: '#e11d48',
    bayIndex: 1,
  },
  {
    id: 'shelf_collector_3',
    name: 'Kệ VIP #3: Prismatic Evolutions SPC',
    shortName: 'Kệ VIP Prismatic',
    category: 'collector_vip',
    level: 10,
    fee: 900,
    capacityText: '2 Hộp VIP Collector 1×1',
    description: 'Mở khóa tủ trưng bày VIP tường trái #3 dành cho rương Prismatic Evolutions SPC.',
    accentColor: '#7c3aed',
    bayIndex: 2,
  },
  {
    id: 'shelf_collector_4',
    name: 'Kệ VIP #4: 25th Celebrations UPC',
    shortName: 'Kệ VIP 25th UPC',
    category: 'collector_vip',
    level: 10,
    fee: 1200,
    capacityText: '2 Hộp VIP Collector 1×1',
    description: 'Mở khóa tủ trưng bày VIP tường trái #4 dành cho bảo vật 25th Celebrations UPC.',
    accentColor: '#eab308',
    bayIndex: 3,
  },
  ...ONEPIECE_SHELF_UNLOCKS,
];

export function isShelfUnlocked(unlockedShelves: string[] | undefined, shelfId: string): boolean {
  if (!shelfId) return true;
  if (STARTER_UNLOCKED_SHELVES.includes(shelfId)) return true;
  if (!Array.isArray(unlockedShelves)) return false;
  return unlockedShelves.includes(shelfId);
}

export function getUnlockedWallBayIndices(unlockedShelves?: string[]): number[] {
  return [0, 1, 2, 3].filter((b) => isShelfUnlocked(unlockedShelves, `shelf_wall_bay_${b + 1}`));
}

export function getOpUnlockedWallBayIndices(unlockedShelves?: string[]): number[] {
  return [0, 1, 2, 3].filter((b) => isShelfUnlocked(unlockedShelves, `op_shelf_wall_bay_${b + 1}`));
}

export function getWallShelfCapacity(unlockedShelves?: string[]): {
  unlockedBayIndices: number[];
  maxBoxSlots: number;
  maxPackColumns: number;
  maxBoxUnits: number;
  maxPackUnits: number;
} {
  const unlockedBayIndices = getUnlockedWallBayIndices(unlockedShelves);
  return {
    unlockedBayIndices,
    maxBoxSlots: unlockedBayIndices.length * 2,
    maxPackColumns: unlockedBayIndices.length * 8,
    maxBoxUnits: unlockedBayIndices.length * 16,
    maxPackUnits: unlockedBayIndices.length * 80,
  };
}

export function getOpWallShelfCapacity(unlockedShelves?: string[]): {
  unlockedBayIndices: number[];
  maxBoxSlots: number;
  maxPackColumns: number;
  maxBoxUnits: number;
  maxPackUnits: number;
} {
  const unlockedBayIndices = getOpUnlockedWallBayIndices(unlockedShelves);
  return {
    unlockedBayIndices,
    maxBoxSlots: unlockedBayIndices.length * 2,
    maxPackColumns: unlockedBayIndices.length * 8,
    maxBoxUnits: unlockedBayIndices.length * 16,
    maxPackUnits: unlockedBayIndices.length * 80,
  };
}

export function getCollectorShelfIdForProduct(productId: string): string | null {
  const clean = (productId || '').replace(/_box$/, '');
  if (clean === 'collector_30th_night_upc') return 'shelf_collector_1';
  if (clean === 'collector_sv151_upc') return 'shelf_collector_2';
  if (clean === 'collector_prismatic_spc') return 'shelf_collector_3';
  if (clean === 'collector_25th_upc') return 'shelf_collector_4';
  const opCol = getOnePieceCollectorShelfIdForProduct(productId);
  if (opCol) return opCol;
  return null;
}

export function canStockProductOnUnlockedShelves(
  inventory: InventoryItem[],
  productId: string,
  unlockedShelves?: string[],
  options?: { isFromParcel?: boolean }
): { allowed: boolean; reason?: string; requiredShelf?: ShelfUnlockDefinition } {
  // === FLOOR 2: ONE PIECE PRODUCT ROUTING ===
  if (isOnePieceProductId(productId)) {
    if (isOnePieceGachaProduct(productId)) {
      const def = SHELF_UNLOCKS.find((s) => s.id === 'op_shelf_gacha_gondola')!;
      if (!isShelfUnlocked(unlockedShelves, def.id)) {
        return {
          allowed: false,
          reason: `Tầng 2 · Đảo Gondola Trái Ác Quỷ đang bị khóa (Cần Cấp ${def.level} · Phí $${def.fee}).`,
          requiredShelf: def,
        };
      }
      return { allowed: true };
    }

    if (isOnePieceBountyProduct(productId)) {
      const def = SHELF_UNLOCKS.find((s) => s.id === 'op_shelf_bounty_mystery')!;
      if (!isShelfUnlocked(unlockedShelves, def.id)) {
        return {
          allowed: false,
          reason: `Tầng 2 · Kệ Rương Truy Nã Grand Line đang bị khóa (Cần Cấp ${def.level} · Phí $${def.fee}).`,
          requiredShelf: def,
        };
      }
      return { allowed: true };
    }

    if (isOnePieceCollectorProduct(productId)) {
      const colShelfId = getOnePieceCollectorShelfIdForProduct(productId) || 'op_shelf_collector_1';
      const def = SHELF_UNLOCKS.find((s) => s.id === colShelfId)!;
      if (!isShelfUnlocked(unlockedShelves, colShelfId)) {
        return {
          allowed: false,
          reason: `${def.name} đang bị khóa (Cần Cấp ${def.level} · Phí $${def.fee}).`,
          requiredShelf: def,
        };
      }
      const existing = inventory.find((i) => i.productId === productId || i.productId === productId.replace(/_box$/, ''));
      const curShelved = existing ? Math.min(existing.quantity || 0, existing.shelvedQuantity || 0) : 0;
      if (curShelved >= COLLECTOR_MAX_BOXES_PER_SHELF) {
        return {
          allowed: false,
          reason: `${def.shortName} chỉ bày tối đa ${COLLECTOR_MAX_BOXES_PER_SHELF} hộp 1×1 trên kệ Tầng 2.`,
          requiredShelf: def,
        };
      }
      return { allowed: true };
    }

    const opCap = getOpWallShelfCapacity(unlockedShelves);
    const isOpBox = productId.endsWith('_box');
    const nextLockedOpWallBay = [
      'op_shelf_wall_bay_2',
      'op_shelf_wall_bay_3',
      'op_shelf_wall_bay_4',
    ]
      .map((id) => SHELF_UNLOCKS.find((s) => s.id === id)!)
      .find((def) => !isShelfUnlocked(unlockedShelves, def.id));

    if (isOpBox) {
      let usedSlots = 0;
      let targetShelved = 0;
      let targetOldSlots = 0;
      for (const item of inventory) {
        if (
          item.type === 'box' &&
          isOnePieceProductId(item.productId) &&
          !isOnePieceCollectorProduct(item.productId) &&
          !isOnePieceBountyProduct(item.productId)
        ) {
          const shelved = Math.max(0, Math.min(item.quantity || 0, item.shelvedQuantity || 0));
          const slotsForItem = shelved > 0 ? Math.ceil(shelved / 8) : 0;
          usedSlots += slotsForItem;
          if (item.productId === productId) {
            targetShelved = shelved;
            targetOldSlots = slotsForItem;
          }
        }
      }
      const newSlotsNeeded = usedSlots - targetOldSlots + Math.ceil((targetShelved + 1) / 8);
      if (newSlotsNeeded > opCap.maxBoxSlots) {
        return {
          allowed: false,
          reason: nextLockedOpWallBay
            ? `Các khoang kệ One Piece Tầng 2 đã kín ô Box (${opCap.maxBoxSlots} ô)! Hãy mở khóa ${nextLockedOpWallBay.shortName} (Cấp ${nextLockedOpWallBay.level} · $${nextLockedOpWallBay.fee}).`
            : `Toàn bộ ${opCap.maxBoxSlots} ô Booster Box One Piece trên Tầng 2 đã đầy!`,
          requiredShelf: nextLockedOpWallBay,
        };
      }
      return { allowed: true };
    }

    let usedCols = 0;
    let targetShelved = 0;
    let targetOldCols = 0;
    for (const item of inventory) {
      if (item.type === 'pack' && isOnePieceProductId(item.productId) && !isOnePieceGachaProduct(item.productId)) {
        const shelved = Math.max(0, Math.min(item.quantity || 0, item.shelvedQuantity || 0));
        const colsForItem = shelved > 0 ? Math.ceil(shelved / 10) : 0;
        usedCols += colsForItem;
        if (item.productId === productId) {
          targetShelved = shelved;
          targetOldCols = colsForItem;
        }
      }
    }
    const newColsNeeded = usedCols - targetOldCols + Math.ceil((targetShelved + 1) / 10);
    if (newColsNeeded > opCap.maxPackColumns) {
      return {
        allowed: false,
        reason: nextLockedOpWallBay
          ? `Các khoang kệ One Piece Tầng 2 đã kín cột Pack (${opCap.maxPackColumns} cột)! Hãy mở khóa ${nextLockedOpWallBay.shortName} (Cấp ${nextLockedOpWallBay.level} · $${nextLockedOpWallBay.fee}).`
          : `Toàn bộ ${opCap.maxPackColumns} cột Pack One Piece trên Tầng 2 đã đầy!`,
        requiredShelf: nextLockedOpWallBay,
      };
    }
    return { allowed: true };
  }

  // === FLOOR 1: POKÉMON PRODUCT ROUTING ===
  if (productId.startsWith('gacha_')) {
    const def = SHELF_UNLOCKS.find((s) => s.id === 'shelf_gacha_gondola')!;
    if (!isShelfUnlocked(unlockedShelves, def.id)) {
      return {
        allowed: false,
        reason: `Kệ Gondola Mystery Gacha đang bị khóa (Cần Cấp ${def.level} · Phí $${def.fee}).`,
        requiredShelf: def,
      };
    }
    return { allowed: true };
  }

  if (isGameStopMysteryProduct(productId)) {
    const def = SHELF_UNLOCKS.find((s) => s.id === 'shelf_gamestop_mystery')!;
    if (!isShelfUnlocked(unlockedShelves, def.id)) {
      return {
        allowed: false,
        reason: `Kệ GameStop Mystery Box đang bị khóa (Cần Cấp ${def.level} · Phí $${def.fee}).`,
        requiredShelf: def,
      };
    }
    return { allowed: true };
  }

  if (isCollectorBoxProduct(productId)) {
    const colShelfId = getCollectorShelfIdForProduct(productId) || 'shelf_collector_1';
    const def = SHELF_UNLOCKS.find((s) => s.id === colShelfId)!;
    if (!isShelfUnlocked(unlockedShelves, colShelfId)) {
      return {
        allowed: false,
        reason: `${def.name} đang bị khóa (Cần Cấp ${def.level} · Phí $${def.fee}).`,
        requiredShelf: def,
      };
    }
    const existing = inventory.find((i) => i.productId === productId || i.productId === productId.replace(/_box$/, ''));
    const curShelved = existing ? Math.min(existing.quantity || 0, existing.shelvedQuantity || 0) : 0;
    if (curShelved >= COLLECTOR_MAX_BOXES_PER_SHELF) {
      return {
        allowed: false,
        reason: `${def.shortName} chỉ bày tối đa ${COLLECTOR_MAX_BOXES_PER_SHELF} hộp 1×1 trên kệ.`,
        requiredShelf: def,
      };
    }
    return { allowed: true };
  }

  const cap = getWallShelfCapacity(unlockedShelves);
  const isBox = productId.endsWith('_box');
  const nextLockedWallBay = ['shelf_wall_bay_2', 'shelf_wall_bay_3', 'shelf_wall_bay_4']
    .map((id) => SHELF_UNLOCKS.find((s) => s.id === id)!)
    .find((def) => !isShelfUnlocked(unlockedShelves, def.id));

  if (isBox) {
    let usedSlots = 0;
    let targetShelved = 0;
    let targetOldSlots = 0;
    for (const item of inventory) {
      if (
        item.type === 'box' &&
        !isOnePieceProductId(item.productId) &&
        !isCollectorBoxProduct(item.productId) &&
        !isGameStopMysteryProduct(item.productId)
      ) {
        const shelved = options?.isFromParcel
          ? Math.max(0, Math.min(item.quantity || 0, item.shelvedQuantity || 0))
          : Math.max(0, Math.min(item.quantity || 0, item.shelvedQuantity || 0));
        const slotsForItem = shelved > 0 ? Math.ceil(shelved / 8) : 0;
        usedSlots += slotsForItem;
        if (item.productId === productId) {
          targetShelved = shelved;
          targetOldSlots = slotsForItem;
        }
      }
    }
    const newSlotsNeeded = usedSlots - targetOldSlots + Math.ceil((targetShelved + 1) / 8);
    if (newSlotsNeeded > cap.maxBoxSlots) {
      return {
        allowed: false,
        reason: nextLockedWallBay
          ? `Các khoang kệ Expansion đã mở hiện đã kín ô Box (${cap.maxBoxSlots} ô)! Hãy mở khóa ${nextLockedWallBay.shortName} (Cấp ${nextLockedWallBay.level} · $${nextLockedWallBay.fee}).`
          : `Toàn bộ ${cap.maxBoxSlots} ô Booster Box trên dãy kệ tường phải đã đầy!`,
        requiredShelf: nextLockedWallBay,
      };
    }
    return { allowed: true };
  }

  // Standard Booster Pack on 4-bay Expansion wall rack
  let usedCols = 0;
  let targetShelved = 0;
  let targetOldCols = 0;
  for (const item of inventory) {
    if (item.type === 'pack' && !isOnePieceProductId(item.productId) && !item.productId.startsWith('gacha_')) {
      const shelved = Math.max(0, Math.min(item.quantity || 0, item.shelvedQuantity || 0));
      const colsForItem = shelved > 0 ? Math.ceil(shelved / 10) : 0;
      usedCols += colsForItem;
      if (item.productId === productId) {
        targetShelved = shelved;
        targetOldCols = colsForItem;
      }
    }
  }
  const newColsNeeded = usedCols - targetOldCols + Math.ceil((targetShelved + 1) / 10);
  if (newColsNeeded > cap.maxPackColumns) {
    return {
      allowed: false,
      reason: nextLockedWallBay
        ? `Các khoang kệ Expansion đã mở hiện đã kín cột Pack (${cap.maxPackColumns} cột)! Hãy mở khóa ${nextLockedWallBay.shortName} (Cấp ${nextLockedWallBay.level} · $${nextLockedWallBay.fee}).`
        : `Toàn bộ ${cap.maxPackColumns} cột Pack trên dãy kệ tường phải đã đầy!`,
      requiredShelf: nextLockedWallBay,
    };
  }
  return { allowed: true };
}

export const LEVEL_TOTAL_XP: Record<number, number> = {
  1: 0,
  2: 250,
  3: 460,
  4: 690,
  5: 940,
  6: 1210,
  7: 1500,
  8: 1810,
  9: 1660,
  10: 2090,
  11: 2580,
  12: 3130,
  13: 3740,
  14: 4410,
  15: 5140,
  16: 5930,
  17: 6780,
  18: 7690,
  19: 8660,
  20: 9690,
};

export const LEVEL_XP_REQUIREMENTS: Record<number, number> = {
  1: 250,
  2: 210,
  3: 230,
  4: 250,
  5: 270,
  6: 290,
  7: 310,
  8: 330,
  9: 430,
  10: 490,
  11: 550,
  12: 610,
  13: 670,
  14: 730,
  15: 790,
  16: 850,
  17: 910,
  18: 970,
  19: 1030,
  20: 1090,
};

/**
 * Standardized Level XP Curve matching user specified table:
 * Formula: xp_to_next(L) = 430 + 60 * (L - 9) for L >= 9
 */
export function getXpToNextLevel(level: number): number {
  if (level <= 1) return 250;
  if (LEVEL_XP_REQUIREMENTS[level]) return LEVEL_XP_REQUIREMENTS[level];
  return 430 + Math.max(0, level - 9) * 60;
}

/**
 * Applies gained EXP to player shop, supporting multi-level ups
 */
export function applyExpGain(
  currentExp: number,
  currentLevel: number,
  expGained: number
): {
  newExp: number;
  newLevel: number;
  newExpToNext: number;
  didLevelUp: boolean;
  levelsGained: number;
} {
  let exp = currentExp + expGained;
  let lvl = currentLevel;
  let expNeeded = getXpToNextLevel(lvl);
  let didLevelUp = false;
  let levelsGained = 0;

  while (exp >= expNeeded) {
    exp -= expNeeded;
    lvl += 1;
    didLevelUp = true;
    levelsGained += 1;
    expNeeded = getXpToNextLevel(lvl);
  }

  return {
    newExp: exp,
    newLevel: lvl,
    newExpToNext: expNeeded,
    didLevelUp,
    levelsGained,
  };
}

/**
 * Calculate EXP when opening a pack:
 * Base: 1 XP
 * Bonus:
 * - Rare (Diamond3 / Diamond4 / Rare Holo / ex): +3 XP
 * - Ultra / Epic (Star1 / Star2 / Illustration Rare / Double Rare EX): +8 XP
 * - Full Art / Ghost / Crown (Star3 / Crown / Hyper Rare Gold / Special Illustration Rare): +20 XP
 */
export function calculatePackOpenExp(cards: PokemonCard[] = []): {
  baseExp: number;
  bonusExp: number;
  totalExp: number;
  bestBonusLabel?: string;
} {
  const baseExp = 1;
  let bonusExp = 0;
  let bestBonusLabel: string | undefined = undefined;

  for (const card of cards) {
    const pr = card.pocketRarity;
    if (
      pr === 'Crown' ||
      pr === 'Star3' ||
      card.rarity === 'Hyper Rare Gold' ||
      card.rarity === 'Special Illustration Rare' ||
      card.hasRgbAura
    ) {
      if (bonusExp < 20) {
        bonusExp = 20;
        bestBonusLabel = 'Full Art / Ghost / Crown (+20 XP)';
      }
    } else if (
      pr === 'Star1' ||
      pr === 'Star2' ||
      card.rarity === 'Illustration Rare' ||
      card.rarity === 'Double Rare EX'
    ) {
      if (bonusExp < 8) {
        bonusExp = 8;
        bestBonusLabel = 'Ultra / Epic (+8 XP)';
      }
    } else if (
      pr === 'Diamond3' ||
      pr === 'Diamond4' ||
      card.rarity === 'Rare Holo' ||
      card.rarity === 'Double Rare'
    ) {
      if (bonusExp < 3) {
        bonusExp = 3;
        bestBonusLabel = 'Rare (+3 XP)';
      }
    }
  }

  return {
    baseExp,
    bonusExp,
    totalExp: baseExp + bonusExp,
    bestBonusLabel,
  };
}

export function isCollectorBoxProduct(productIdOrSetId?: string): boolean {
  if (!productIdOrSetId) return false;
  const cleanId = productIdOrSetId.replace(/_box$/, '');
  return cleanId in COLLECTOR_BOX_SETS;
}

export function isGameStopMysteryProduct(productIdOrSetId?: string): boolean {
  if (!productIdOrSetId) return false;
  const cleanId = productIdOrSetId.replace(/_box$/, '');
  return cleanId in GAMESTOP_MYSTERY_SETS;
}

/**
 * Safe BoosterSet resolver supporting legacy IDs, aliases, Collector UPC/SPC and GameStop Mystery sets
 */
export function getBoosterSet(setId?: string): BoosterSetInfo {
  if (!setId) return BOOSTER_SETS.paldeanFates || BOOSTER_SETS.pokemon30thCommon;
  const normalizedId = setId.replace(/_box$/, '').replace(/_pack$/, '');
  const opSet = getOnePieceSet(normalizedId);
  if (opSet) return opSet;
  if ((COLLECTOR_BOX_SETS as any)[normalizedId]) return (COLLECTOR_BOX_SETS as any)[normalizedId];
  if ((GAMESTOP_MYSTERY_SETS as any)[normalizedId]) return (GAMESTOP_MYSTERY_SETS as any)[normalizedId];
  const gachaTierKey = normalizedId.replace(/^gacha_/, '');
  if (gachaTierKey in OP_GACHA_PACK_TIERS) {
    const tier = OP_GACHA_PACK_TIERS[gachaTierKey];
    return {
      id: `gacha_${tier.id}`,
      name: `Devil Fruit: ${tier.name}`,
      series: 'Devil Fruit Mystery Gondola (2F)',
      releaseYear: 2026,
      totalCards: 64,
      unlockLevel: 7,
      packWholesalePrice: Math.round(tier.price * 0.6 * 100) / 100,
      packRetailPrice: tier.price,
      boxWholesalePrice: Math.round(tier.price * 0.6 * 8 * 100) / 100,
      boxRetailPrice: tier.price * 8,
      packsPerBox: 8,
      coverPokemon: tier.vietnameseName,
      themeColor: tier.themeColor,
      accentColor: tier.accentColor,
      packImageUrl: tier.imageUrl,
      boxImageUrl: tier.imageUrl,
      description: tier.description,
      universe: 'onepiece',
    };
  }
  if (normalizedId.startsWith('gacha_') || (typeof GACHA_PACK_TIERS !== 'undefined' && (GACHA_PACK_TIERS as any)[normalizedId])) {
    const tierKey = normalizedId.replace('gacha_', '');
    const tier = typeof GACHA_PACK_TIERS !== 'undefined' ? (GACHA_PACK_TIERS[tierKey] || GACHA_PACK_TIERS.silver) : null;
    if (tier) {
      return {
        id: `gacha_${tier.id}`,
        name: `Mystery Pack: ${tier.name}`,
        vietnameseName: tier.vietnameseName,
        generation: 'GACHA GONDOLA',
        packPrice: tier.price,
        boxPrice: tier.price * 8,
        costPerPack: Math.round(tier.price * 0.7 * 100) / 100,
        costPerBox: Math.round(tier.price * 0.7 * 8 * 100) / 100,
        series: 'Pokémon Mystery Pack Gondola',
        packImageUrl: tier.imageUrl,
        boxImageUrl: tier.imageUrl,
        themeColor: tier.themeColor,
        totalCardsInSet: 50,
      } as any;
    }
  }
  if (normalizedId === 'paldeanFates' || normalizedId === 'surgingSparks') return BOOSTER_SETS.paldeanFates;
  if (normalizedId === 'prismaticEvolutions' || normalizedId === 'ascendedHeroes') return BOOSTER_SETS.prismaticEvolutions;
  if (normalizedId === 'deltaReign' || normalizedId === 'destinedRivals') return BOOSTER_SETS.deltaReign;
  return (BOOSTER_SETS as any)[normalizedId] || BOOSTER_SETS.paldeanFates || BOOSTER_SETS.pokemon30thCommon;
}

/**
 * Standard Rarity Rank Weight for Sorting Cards
 */
export const POCKET_RARITY_RANK: Record<PocketRarity, number> = {
  Crown: 8,
  Star3: 7,
  Star2: 6,
  Star1: 5,
  Diamond4: 4,
  Diamond3: 3,
  Diamond2: 2,
  Diamond1: 1,
};

// ==========================================
// 2. AUTHENTIC POKEMON CARDS MASTER DATABASE
// ==========================================
const CURATED_GRAIL_CARDS: PokemonCard[] = [
  // --- 🌟 USER REQUESTED GRAIL CARDS ($50 to $35,000) ---
  {
    id: 'pikachu_illustrator_35000',
    dexNumber: 25,
    name: 'Pikachu Illustrator CoroCoro 1998',
    subtitle: 'Chén Thánh Tối Thượng Thế Giới ($35,000) 👑',
    type: 'Lightning',
    hp: 90,
    rarity: 'Hyper Rare Gold',
    pocketRarity: 'Crown',
    raritySymbol: '👑',
    rarityLabel: 'Crown Rare (Chén Thánh $35,000)',
    setName: '30th Anniversary (Common Set)',
    setNumber: 'ILLUSTRATOR-01',
    marketPrice: 35000.0,
    artist: 'Atsuko Nishida',
    attacks: [
      { name: 'Drawing Wonder', damage: 'Ability', cost: [] },
      { name: 'Pika Lightning Surge', damage: '150', cost: ['Lightning', 'Lightning', 'Colorless'] },
    ],
    weakness: 'Fighting',
    retreatCost: 1,
    flavorText: 'Bảo vật vĩ đại nhất lịch sử thẻ bài TCG thế giới - Pikachu Illustrator trao tặng cho quán quân vẽ truyện tranh CoroCoro!',
    holographicType: 'gold',
    cardColor: '#ca8a04',
    accentColor: '#fde047',
    icon: '👑',
    imageUrl: 'https://images.pokemontcg.io/basep/1_hires.png',
    artUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png',
    hasRgbAura: true,
  },
  {
    id: 'gengar_masaki_20000',
    dexNumber: 94,
    name: 'Gengar Masaki Vending Machine Promo',
    subtitle: 'Bảo Vật Cổ Nhật Bản 1999 ($20,000) 👑',
    type: 'Psychic',
    hp: 110,
    rarity: 'Hyper Rare Gold',
    pocketRarity: 'Crown',
    raritySymbol: '👑',
    rarityLabel: 'Crown Rare (Gengar Masaki $20,000)',
    setName: '30th Anniversary (Common Set)',
    setNumber: 'MASAKI-094',
    marketPrice: 20000.0,
    artist: 'Ken Sugimori',
    attacks: [
      { name: 'Curse Exchange', damage: 'Ability', cost: [] },
      { name: 'Shadow Room', damage: '120', cost: ['Psychic', 'Psychic', 'Psychic'] },
    ],
    weakness: 'Darkness',
    retreatCost: 2,
    flavorText: 'Thẻ bài Gengar Masaki cực hiếm chỉ nhận được khi gửi thẻ qua bưu điện chiến dịch Masaki Mail Campaign năm 1999 tại Nhật Bản!',
    holographicType: 'gold',
    cardColor: '#6b21a8',
    accentColor: '#c084fc',
    icon: '👑',
    imageUrl: 'https://images.pokemontcg.io/base2/4_hires.png',
    artUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/94.png',
    hasRgbAura: true,
  },
  {
    id: 'charizard_base_set_2_15000',
    dexNumber: 6,
    name: 'Charizard Base Set 2 Siêu Hiếm',
    subtitle: 'Holy Vintage Grail ($15,000) 👑',
    type: 'Fire',
    hp: 120,
    rarity: 'Hyper Rare Gold',
    pocketRarity: 'Crown',
    raritySymbol: '👑',
    rarityLabel: 'Crown Rare (Huyền Thoại $15,000)',
    setName: '30th Anniversary (Common Set)',
    setNumber: '4/130',
    marketPrice: 15000.0,
    artist: 'Mitsuhiro Arita',
    attacks: [
      { name: 'Energy Burn', damage: 'Ability', cost: [] },
      { name: 'Fire Spin', damage: '100', cost: ['Fire', 'Fire', 'Fire', 'Fire'] },
    ],
    weakness: 'Water',
    retreatCost: 3,
    flavorText: 'Lá bài Charizard Base Set 2 Shadowless huyền thoại tối thượng của thế giới TCG, trị giá kỉ lục $15,000!',
    holographicType: 'gold',
    cardColor: '#b91c1c',
    accentColor: '#f87171',
    icon: '👑',
    imageUrl: '/assets/cards/charizard_base_set_2.png',
    artUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/6.png',
    hasRgbAura: true,
  },
  {
    id: 'charizard_full_gold_8000',
    dexNumber: 6,
    name: 'Charizard Full Gold 24K',
    subtitle: 'Supreme Pure Gold Edition ($8,000) 👑',
    type: 'Fire',
    hp: 330,
    rarity: 'Hyper Rare Gold',
    pocketRarity: 'Crown',
    raritySymbol: '👑',
    rarityLabel: 'Crown Rare (Gold 24K $8,000)',
    setName: '30th Anniversary (Common Set)',
    setNumber: '30TH-GOLD',
    marketPrice: 8000.0,
    artist: '5ban Graphics',
    attacks: [
      { name: 'Infernal Reign', damage: 'Ability', cost: [] },
      { name: 'Burning Darkness', damage: '180+', cost: ['Fire', 'Fire'] },
    ],
    weakness: 'Water',
    retreatCost: 2,
    flavorText: 'Thẻ bài Charizard mạ vàng kim 24K nguyên khối lấp lánh cực hiếm, giá trị thị trường $8,000!',
    holographicType: 'gold',
    cardColor: '#ca8a04',
    accentColor: '#fde047',
    icon: '👑',
    imageUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcShvHUpzFr30IRc2BycX4kH-YTWKQrUALZ_3U3A4fCyNUCptyz8j_7Ne2Qf&s=10',
    artUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/6.png',
    hasRgbAura: true,
  },
  {
    id: 'mew_red_3800',
    dexNumber: 151,
    name: 'Mew Red Supreme Edition',
    subtitle: 'Cosmic Red Hologram ($3,800) 👑',
    type: 'Psychic',
    hp: 220,
    rarity: 'Hyper Rare Gold',
    pocketRarity: 'Crown',
    raritySymbol: '👑',
    rarityLabel: 'Crown Rare (Mew Đỏ $3,800)',
    setName: '30th Anniversary (Common Set)',
    setNumber: '30TH-RED',
    marketPrice: 3800.0,
    artist: 'YOSHIROTTEN',
    attacks: [
      { name: 'Psystrike Crimson', damage: '260', cost: ['Psychic', 'Psychic'] },
    ],
    weakness: 'Darkness',
    retreatCost: 0,
    flavorText: 'Phiên bản Mew đỏ ánh hào quang lửa cosmic rực sáng, tuyệt phẩm sưu tập trị giá $3,800!',
    holographicType: 'gold',
    cardColor: '#dc2626',
    accentColor: '#f87171',
    icon: '👑',
    imageUrl: 'https://tcgplayer-cdn.tcgplayer.com/product/717607_in_1000x1000.jpg',
    artUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/151.png',
    hasRgbAura: true,
  },
  {
    id: 'mew_blue_3500',
    dexNumber: 151,
    name: 'Mew Blue Shiny Hologram',
    subtitle: 'Prismatic Blue Edition ($3,500) 👑',
    type: 'Psychic',
    hp: 220,
    rarity: 'Hyper Rare Gold',
    pocketRarity: 'Crown',
    raritySymbol: '👑',
    rarityLabel: 'Crown Rare (Mew Xanh $3,500)',
    setName: '30th Anniversary (Common Set)',
    setNumber: '30TH-BLUE',
    marketPrice: 3500.0,
    artist: 'YOSHIROTTEN',
    attacks: [
      { name: 'Azure Miracle', damage: '250', cost: ['Psychic', 'Psychic'] },
    ],
    weakness: 'Darkness',
    retreatCost: 0,
    flavorText: 'Thần thú Mew Shiny xanh ngọc lấp lánh dải quang phổ lăng kính, trị giá $3,500!',
    holographicType: 'gold',
    cardColor: '#0284c7',
    accentColor: '#38bdf8',
    icon: '👑',
    imageUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT9OpIohSczcm_tNLAoet3Nf-XTVhkIYNBvK9xRv4knvA&s=10',
    artUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/151.png',
    hasRgbAura: true,
  },
  {
    id: 'charizard_x_ex_600',
    dexNumber: 6,
    name: 'Mega Charizard X ex Flames',
    subtitle: 'Phantasmal Blue Flames ($600) ☆☆',
    type: 'Fire',
    hp: 330,
    rarity: 'Special Illustration Rare',
    pocketRarity: 'Star2',
    raritySymbol: '☆☆',
    rarityLabel: 'Special Illustration Rare ($600)',
    setName: 'Phantasmal Flames ME02',
    setNumber: 'ME02-006',
    marketPrice: 600.0,
    artist: 'PLANETA Igarashi',
    attacks: [
      { name: 'Dragon Claw', damage: '120', cost: ['Fire', 'Colorless'] },
      { name: 'Blue Flare Storm', damage: '280', cost: ['Fire', 'Fire', 'Colorless'] },
    ],
    weakness: 'Water',
    retreatCost: 2,
    flavorText: 'Mega Charizard X bốc lửa xanh ma thuật kiêu hãnh thống trị bầu trời!',
    holographicType: 'cosmic',
    cardColor: '#0369a1',
    accentColor: '#38bdf8',
    icon: '🐉',
    imageUrl: '/assets/cards/mega_charizard_x.png',
    artUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/6.png',
    hasRgbAura: true,
  },
  {
    id: 'charizard_151_sir_500',
    dexNumber: 6,
    name: 'Charizard ex 151 Special Illustration',
    subtitle: 'SV 151 Supreme Hit ($500) ☆☆☆',
    type: 'Fire',
    hp: 330,
    rarity: 'Special Illustration Rare',
    pocketRarity: 'Star3',
    raritySymbol: '☆☆☆',
    rarityLabel: 'Immersive Rare ($500)',
    setName: 'Scarlet & Violet: 151',
    setNumber: '199/165',
    marketPrice: 500.0,
    artist: 'AKIRA EGAWA',
    attacks: [
      { name: 'Brave Wing', damage: '60+', cost: ['Fire'] },
      { name: 'Explosive Vortex', damage: '330', cost: ['Fire', 'Fire', 'Fire', 'Colorless'] },
    ],
    weakness: 'Water',
    retreatCost: 2,
    flavorText: 'Lá bài đỉnh cao nhất set 151 với hình ảnh Charizard bay trên ngọn núi lửa cuộn trào nham thạch.',
    holographicType: 'cosmic',
    cardColor: '#ea580c',
    accentColor: '#fb923c',
    icon: '🔥',
    imageUrl: 'https://images.pokemontcg.io/sv3pt5/199_hires.png',
    artUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/6.png',
    hasRgbAura: true,
  },
  {
    id: 'charizard_svp_promo_100',
    dexNumber: 6,
    name: 'Charizard ex SVP Black Star Promo',
    subtitle: 'Special Illustration Promo ($100) ☆',
    type: 'Fire',
    hp: 330,
    rarity: 'Illustration Rare',
    pocketRarity: 'Star1',
    raritySymbol: '☆',
    rarityLabel: 'Illustration Rare ($100)',
    setName: 'Scarlet & Violet: 151',
    setNumber: 'SVP-074',
    marketPrice: 100.0,
    artist: 'Takumi Wada',
    attacks: [
      { name: 'Slash', damage: '80', cost: ['Colorless', 'Colorless'] },
      { name: 'Flare Blitz', damage: '200', cost: ['Fire', 'Fire', 'Colorless'] },
    ],
    weakness: 'Water',
    retreatCost: 2,
    flavorText: 'Thẻ bài Promo Charizard tuyệt mỹ vẽ bởi họa sĩ kỳ cựu Takumi Wada.',
    holographicType: 'holo',
    cardColor: '#c2410c',
    accentColor: '#f97316',
    icon: '🔥',
    imageUrl: 'https://images.pokemontcg.io/svp/74_hires.png',
    artUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/6.png',
    hasRgbAura: true,
  },
  {
    id: 'mew_30th_50',
    dexNumber: 151,
    name: 'Mew 30th Anniversary Edition',
    subtitle: 'Celebration Holo ($50) ☆',
    type: 'Psychic',
    hp: 90,
    rarity: 'Illustration Rare',
    pocketRarity: 'Star1',
    raritySymbol: '☆',
    rarityLabel: 'Illustration Rare ($50)',
    setName: '30th Anniversary (Common Set)',
    setNumber: '30TH-152',
    marketPrice: 50.0,
    artist: 'Ken Sugimori',
    attacks: [
      { name: 'Psychic Spheres', damage: '60', cost: ['Psychic', 'Colorless'] },
    ],
    weakness: 'Darkness',
    retreatCost: 1,
    flavorText: 'Thẻ Mew kỉ niệm 30 năm Pokemon phiên bản thẻ bài đặc biệt được đông đảo người sưu tập yêu thích.',
    holographicType: 'holo',
    cardColor: '#ec4899',
    accentColor: '#f472b6',
    icon: '✨',
    imageUrl: 'https://images.pokemontcg.io/sv3pt5/151_hires.png',
    artUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/151.png',
    hasRgbAura: true,
  },
  // --- 👑 SUPREME HOLY GRAIL ($4,000) - 30TH ANNIVERSARY YOSHIROTTEN ---
  {
    id: 'mew_30th_grgb_grail',
    dexNumber: 151,
    name: 'Mew 30th G/RGB YOSHIROTTEN',
    subtitle: 'Supreme Holy Grail ($4,000) 👑',
    type: 'Psychic',
    hp: 250,
    rarity: 'Hyper Rare Gold',
    pocketRarity: 'Crown',
    raritySymbol: '👑',
    rarityLabel: 'Crown Rare (Holy Grail $4,000)',
    setName: '30th Anniversary (Common Set)',
    setNumber: '30C-G/RGB',
    marketPrice: 4000.0,
    artist: 'YOSHIROTTEN',
    attacks: [
      { name: 'Cosmic Prismatic Ray', damage: '300', cost: ['Psychic', 'Psychic', 'Colorless'] },
      { name: 'Celebration Rebirth', damage: 'Ability', cost: [] },
    ],
    weakness: 'Darkness',
    retreatCost: 0,
    flavorText: 'Tuyệt phẩm kỉ niệm 30 năm Pokemon vẽ bởi nghệ sĩ YOSHIROTTEN, hiệu ứng quang phổ RGB đa chiều vô tiền khoáng hậu, giá thị trường $4,000!',
    holographicType: 'gold',
    cardColor: '#f43f5e',
    accentColor: '#fb7185',
    icon: '👑',
    imageUrl: '/assets/grail_4000.jpg',
    artUrl: '/assets/grail_4000.jpg',
    hasRgbAura: true,
  },
  {
    id: 'pikachu_30th_gold_crown',
    dexNumber: 25,
    name: 'Pikachu 30th Gold Crown',
    subtitle: 'Golden 30th Anniversary ($1,200) 👑',
    type: 'Lightning',
    hp: 200,
    rarity: 'Hyper Rare Gold',
    pocketRarity: 'Crown',
    raritySymbol: '👑',
    rarityLabel: 'Crown Rare (Gold 24K)',
    setName: '30th Anniversary (Common Set)',
    setNumber: '025/025',
    marketPrice: 1200.0,
    artist: 'Mitsuhiro Arita',
    attacks: [
      { name: 'Volt Tackle 30th', damage: '220', cost: ['Lightning', 'Lightning', 'Colorless'] },
    ],
    weakness: 'Fighting',
    retreatCost: 1,
    flavorText: 'Pikachu mạ vàng 24K kỉ niệm 30 năm Pokemon với chữ ký của giám đốc Ken Sugimori.',
    holographicType: 'gold',
    cardColor: '#eab308',
    accentColor: '#fef08a',
    icon: '⚡',
    imageUrl: 'https://images.pokemontcg.io/cel25/25_hires.png',
    artUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png',
    hasRgbAura: true,
  },
  {
    id: 'umbreon_30th_moonbreon',
    dexNumber: 197,
    name: 'Umbreon VMAX Moonbreon 30th',
    subtitle: 'Immersive Moon Alt Art ($880) ☆☆☆',
    type: 'Darkness',
    hp: 310,
    rarity: 'Special Illustration Rare',
    pocketRarity: 'Star3',
    raritySymbol: '☆☆☆',
    rarityLabel: 'Immersive Rare (Moonbreon)',
    setName: '30th Anniversary (Common Set)',
    setNumber: '215/203',
    marketPrice: 880.0,
    artist: 'KEIICHIRO ITO',
    attacks: [
      { name: 'Dark Signal', damage: 'Ability', cost: [] },
      { name: 'Max Darkness', damage: '160', cost: ['Darkness', 'Colorless', 'Colorless'] },
    ],
    weakness: 'Grass',
    retreatCost: 2,
    flavorText: 'Lá bài Moonbreon vươn tới mặt trăng huyền thoại trong giới TCG, trị giá hàng trăm đô la săn đón.',
    holographicType: 'cosmic',
    cardColor: '#1e1b4b',
    accentColor: '#818cf8',
    icon: '🌙',
    imageUrl: 'https://images.pokemontcg.io/swsh7/215_hires.png',
    artUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/197.png',
    hasRgbAura: true,
  },
  {
    id: 'rayquaza_30th_vmax',
    dexNumber: 384,
    name: 'Rayquaza VMAX Shiny 30th',
    subtitle: 'Special Secret Art ($350) ☆☆',
    type: 'Dragon',
    hp: 320,
    rarity: 'Special Illustration Rare',
    pocketRarity: 'Star2',
    raritySymbol: '☆☆',
    rarityLabel: 'Full Art Secret',
    setName: '30th Anniversary (Common Set)',
    setNumber: '218/203',
    marketPrice: 350.0,
    artist: 'PLANETA Mochizuki',
    attacks: [
      { name: 'Azure Pulse', damage: 'Ability', cost: [] },
      { name: 'Max Burst', damage: '340', cost: ['Fire', 'Lightning'] },
    ],
    weakness: 'Colorless',
    retreatCost: 2,
    flavorText: 'Rồng thần Rayquaza đen bóng bay qua tầng ozone với năng lượng cuồn cuộn.',
    holographicType: 'rainbow',
    cardColor: '#065f46',
    accentColor: '#34d399',
    icon: '🐉',
    imageUrl: 'https://images.pokemontcg.io/swsh7/218_hires.png',
    artUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/384.png',
    hasRgbAura: true,
  },
  {
    id: 'charizard_30th_celebration',
    dexNumber: 6,
    name: 'Charizard Base Set 30th Reprint',
    subtitle: 'Celebration Classic ($195) ☆☆',
    type: 'Fire',
    hp: 120,
    rarity: 'Special Illustration Rare',
    pocketRarity: 'Star2',
    raritySymbol: '☆☆',
    rarityLabel: 'Classic Holo 30th',
    setName: '30th Anniversary (Common Set)',
    setNumber: '004/025',
    marketPrice: 195.0,
    artist: 'Mitsuhiro Arita',
    attacks: [
      { name: 'Energy Burn', damage: 'Ability', cost: [] },
      { name: 'Fire Spin', damage: '100', cost: ['Fire', 'Fire', 'Fire', 'Fire'] },
    ],
    weakness: 'Water',
    retreatCost: 3,
    flavorText: 'Tái bản lá bài Base Set Charizard 1996 với con dấu 30th Anniversary dập chìm trên foil hologram.',
    holographicType: 'holo',
    cardColor: '#c2410c',
    accentColor: '#fb923c',
    icon: '🔥',
    imageUrl: 'https://images.pokemontcg.io/cel25/4_hires.png',
    artUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/6.png',
    hasRgbAura: true,
  },
  {
    id: 'walking_wake_ex_tf',
    dexNumber: 1009,
    name: 'Walking Wake ex SIR',
    subtitle: 'Temporal Forces Ancient ($55) ☆',
    type: 'Water',
    hp: 220,
    rarity: 'Illustration Rare',
    pocketRarity: 'Star1',
    raritySymbol: '☆',
    rarityLabel: 'Illustration Rare',
    setName: 'Temporal Forces (Wild Force)',
    setNumber: '205/162',
    marketPrice: 55.0,
    artist: 'Teeziro',
    attacks: [
      { name: 'Aurora Gain', damage: '24', cost: ['Water'] },
      { name: 'Catharsis Roar', damage: '120+', cost: ['Water', 'Colorless', 'Colorless'] },
    ],
    weakness: 'Lightning',
    retreatCost: 1,
    flavorText: 'Dạng cổ đại bí ẩn của Suicune đi trên mặt nước với vẻ uy nghiêm ngút trời.',
    holographicType: 'holo',
    cardColor: '#0284c7',
    accentColor: '#38bdf8',
    icon: '🌊',
    imageUrl: 'https://images.pokemontcg.io/sv5/205_hires.png',
    artUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/1009.png',
    hasRgbAura: true,
  },
  {
    id: 'pecharunt_ex_sf',
    dexNumber: 1025,
    name: 'Pecharunt ex SIR',
    subtitle: 'Shrouded Fable Mochi ($45) ☆',
    type: 'Darkness',
    hp: 190,
    rarity: 'Illustration Rare',
    pocketRarity: 'Star1',
    raritySymbol: '☆',
    rarityLabel: 'Illustration Rare',
    setName: 'Scarlet & Violet: Shrouded Fable',
    setNumber: '093/064',
    marketPrice: 45.0,
    artist: 'Akira Komayama',
    attacks: [
      { name: 'Subjugating Chains', damage: 'Ability', cost: [] },
      { name: 'Irritant Burst', damage: '60x', cost: ['Darkness', 'Darkness'] },
    ],
    weakness: 'Fighting',
    retreatCost: 1,
    flavorText: 'Pokemon hệ Độc/Bóng tối với quả mochi độc điều khiển tâm trí các thần thú Kitakami!',
    holographicType: 'holo',
    cardColor: '#581c87',
    accentColor: '#c084fc',
    icon: '🍑',
    imageUrl: 'https://images.pokemontcg.io/sv6pt5/93_hires.png',
    artUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/1025.png',
    hasRgbAura: true,
  },
  // --- 👑 CROWN RARE (Thẻ Vàng Tối Thượng 24K & Stellar Crown - Rate 0.16%) ---
  {
    id: 'p151_mew_gold',
    dexNumber: 151,
    name: 'Mew ex Gold Crown',
    subtitle: 'Crown Rare Gold 24K (👑)',
    type: 'Psychic',
    hp: 180,
    rarity: 'Hyper Rare Gold',
    pocketRarity: 'Crown',
    raritySymbol: '👑',
    rarityLabel: 'Crown Rare (Vàng 24K)',
    setName: 'Scarlet & Violet: 151',
    setNumber: '207/165',
    marketPrice: 185.0,
    artist: '5ban Graphics',
    attacks: [
      { name: 'Restart', damage: 'Ability', cost: [] },
      { name: 'Genome Hacking', damage: 'Copy', cost: ['Colorless', 'Colorless', 'Colorless'] },
    ],
    weakness: 'Darkness',
    retreatCost: 0,
    flavorText: 'Thẻ bài mạ vàng kim nguyên khối cực hiếm 1/625 packs trong Pocket, biểu tượng của sự may mắn tối thượng!',
    holographicType: 'gold',
    cardColor: '#ca8a04',
    accentColor: '#fde047',
    icon: '👑',
    imageUrl: 'https://images.pokemontcg.io/sv3pt5/207_hires.png',
    artUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/151.png',
    hasRgbAura: true,
  },
  {
    id: 'cz_arceus_gold',
    dexNumber: 493,
    name: 'Arceus VSTAR Gold Crown',
    subtitle: 'Crown Rare Gold (👑)',
    type: 'Colorless',
    hp: 280,
    rarity: 'Hyper Rare Gold',
    pocketRarity: 'Crown',
    raritySymbol: '👑',
    rarityLabel: 'Crown Rare (Vàng 24K)',
    setName: 'Crown Zenith',
    setNumber: 'GG70/GG70',
    marketPrice: 135.0,
    artist: 'AKIRA EGAWA',
    attacks: [
      { name: 'Starbirth', damage: 'VSTAR Power', cost: [] },
      { name: 'Trinity Nova', damage: '200', cost: ['Colorless', 'Colorless', 'Colorless'] },
    ],
    weakness: 'Fighting',
    retreatCost: 2,
    flavorText: 'Đấng sáng tạo vũ trụ giáng lâm với vầng hào quang vàng kim thần thánh bảo hộ muôn loài.',
    holographicType: 'gold',
    cardColor: '#a16207',
    accentColor: '#fef08a',
    icon: '👑',
    imageUrl: 'https://images.pokemontcg.io/swsh12pt5gg/GG70_hires.png',
    artUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/493.png',
    hasRgbAura: true,
  },
  {
    id: 'sv7_terapagos_ex_sir',
    dexNumber: 1024,
    name: 'Terapagos ex Stellar SIR',
    subtitle: 'Stellar Crown Rare (👑) - Rùa Vũ Trụ',
    type: 'Colorless',
    hp: 230,
    rarity: 'Hyper Rare Gold',
    pocketRarity: 'Crown',
    raritySymbol: '👑',
    rarityLabel: 'Crown Rare (Stellar Tối Thượng)',
    setName: 'Stellar Crown',
    setNumber: '170/142',
    marketPrice: 140.0,
    artist: '5ban Graphics',
    attacks: [
      { name: 'Unified Beatdown', damage: '30x', cost: ['Colorless', 'Colorless'] },
      { name: 'Crown Opal', damage: '180', cost: ['Grass', 'Water', 'Lightning'] },
    ],
    weakness: 'Fighting',
    retreatCost: 2,
    flavorText: 'Linh thú Terapagos bao bọc toàn bộ 18 hệ năng lượng trong mai rùa ngọc bích đa sắc màu rực rỡ!',
    holographicType: 'gold',
    cardColor: '#0284c7',
    accentColor: '#38bdf8',
    icon: '🐢',
    imageUrl: 'https://images.pokemontcg.io/sv7/170_hires.png',
    artUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/1024.png',
    hasRgbAura: true,
  },

  // --- ☆☆☆ 3 SAO: IMMERSIVE / STELLAR SIR (Tranh Động 3D - Rate 0.22%) ---
  {
    id: 'sv8_pikachu_ex_sir',
    dexNumber: 25,
    name: 'Pikachu ex Stellar SIR',
    subtitle: 'Stellar Crown SIR (☆☆☆) - Vương Miện Tối Thượng',
    type: 'Lightning',
    hp: 200,
    rarity: 'Special Illustration Rare',
    pocketRarity: 'Star3',
    raritySymbol: '☆☆☆',
    rarityLabel: '3 Sao (Stellar Crown SIR)',
    setName: 'Surging Sparks (2024-2025)',
    setNumber: '238/191',
    marketPrice: 360.0,
    artist: 'GIDORA',
    attacks: [
      { name: 'Topaz Bolt', damage: '300', cost: ['Lightning', 'Lightning', 'Colorless'] },
    ],
    weakness: 'Fighting',
    retreatCost: 1,
    flavorText: 'Lá bài đỉnh cao nhất hiện tại 2024-2025 của set Surging Sparks. Pikachu đội vương miện ngọc quý Stellar lấp lánh cầu vồng!',
    holographicType: 'immersive',
    cardColor: '#ca8a04',
    accentColor: '#fde047',
    icon: '⚡',
    imageUrl: 'https://images.pokemontcg.io/sv8/238_hires.png',
    artUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png',
    hasRgbAura: true,
  },
  {
    id: 'p151_charizard_sir',
    dexNumber: 6,
    name: 'Charizard ex Immersive',
    subtitle: 'Immersive Rare 3D (☆☆☆)',
    type: 'Fire',
    hp: 330,
    rarity: 'Special Illustration Rare',
    pocketRarity: 'Star3',
    raritySymbol: '☆☆☆',
    rarityLabel: '3 Sao (Immersive Rare)',
    setName: 'Scarlet & Violet: 151',
    setNumber: '199/165',
    marketPrice: 295.0,
    artist: 'Akira Egawa',
    attacks: [
      { name: 'Brave Wing', damage: '60+', cost: ['Fire'] },
      { name: 'Explosive Vortex', damage: '330', cost: ['Fire', 'Fire', 'Colorless', 'Colorless'] },
    ],
    weakness: 'Water',
    retreatCost: 2,
    flavorText: 'Ngọn lửa rực cháy trên đỉnh núi dung nham Kanto. Cảnh tượng 3D tương tác sống động bậc nhất!',
    holographicType: 'immersive',
    cardColor: '#b91c1c',
    accentColor: '#f97316',
    icon: '🔥',
    imageUrl: 'https://images.pokemontcg.io/sv3pt5/199_hires.png',
    artUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/6.png',
    hasRgbAura: true,
  },
  {
    id: 'p151_mew_ex_sir',
    dexNumber: 151,
    name: 'Mew ex Immersive',
    subtitle: 'Immersive Rare 3D (☆☆☆)',
    type: 'Psychic',
    hp: 180,
    rarity: 'Special Illustration Rare',
    pocketRarity: 'Star3',
    raritySymbol: '☆☆☆',
    rarityLabel: '3 Sao (Immersive Rare)',
    setName: 'Scarlet & Violet: 151',
    setNumber: '205/165',
    marketPrice: 175.0,
    artist: 'USGMEN',
    attacks: [
      { name: 'Restart', damage: 'Ability', cost: [] },
      { name: 'Genome Hacking', damage: 'Copy', cost: ['Colorless', 'Colorless', 'Colorless'] },
    ],
    weakness: 'Darkness',
    retreatCost: 0,
    flavorText: 'Mew bay xuyên qua khu rừng Kanto dưới ánh nắng ban mai trong thế giới 3D đa chiều!',
    holographicType: 'immersive',
    cardColor: '#a21caf',
    accentColor: '#f472b6',
    icon: '🔮',
    imageUrl: 'https://images.pokemontcg.io/sv3pt5/205_hires.png',
    artUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/151.png',
    hasRgbAura: true,
  },

  // --- ☆☆ 2 SAO: FULL ART / SECRET EX (Rate 0.50%) ---
  {
    id: 'sv6_greninja_ex_sir',
    dexNumber: 658,
    name: 'Greninja ex Special Illustration Rare',
    subtitle: 'Full Art Secret (☆☆) - Tuyệt Phẩm Nhẫn Giả',
    type: 'Water',
    hp: 310,
    rarity: 'Special Illustration Rare',
    pocketRarity: 'Star2',
    raritySymbol: '☆☆',
    rarityLabel: '2 Sao (Full Art Secret)',
    setName: 'Twilight Masquerade',
    setNumber: '214/167',
    marketPrice: 310.0,
    artist: 'AKIRA EGAWA',
    attacks: [
      { name: 'Shinobi Slash', damage: '170', cost: ['Water'] },
      { name: 'Mirage Barrage', damage: '120x', cost: ['Water', 'Colorless', 'Colorless'] },
    ],
    weakness: 'Lightning',
    retreatCost: 1,
    flavorText: 'Siêu phẩm hội họa bùng nổ của Twilight Masquerade. Ninja ếch phi tiêu lướt qua thác nước với phong cách rực rỡ sắc màu!',
    holographicType: 'rainbow',
    cardColor: '#0c4a6e',
    accentColor: '#38bdf8',
    icon: '🥷',
    imageUrl: 'https://images.pokemontcg.io/sv6/214_hires.png',
    artUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/658.png',
    hasRgbAura: true,
  },
  {
    id: 'sv6_carmine_sir',
    dexNumber: 9999,
    name: 'Carmine Special Illustration Rare',
    subtitle: 'Full Art Trainer (☆☆)',
    type: 'Colorless',
    hp: 0,
    rarity: 'Special Illustration Rare',
    pocketRarity: 'Star2',
    raritySymbol: '☆☆',
    rarityLabel: '2 Sao (Full Art Waifu Trainer)',
    setName: 'Twilight Masquerade',
    setNumber: '217/167',
    marketPrice: 120.0,
    artist: 'En Morikura',
    attacks: [{ name: 'Festival Rally', damage: 'Trainer', cost: [] }],
    weakness: 'Colorless',
    retreatCost: 0,
    flavorText: 'Cô nàng Carmine cá tính từ làng Kitakami tại lễ hội mặt nạ Masked Festival với ánh nhìn sắc sảo!',
    holographicType: 'rainbow',
    cardColor: '#be123c',
    accentColor: '#fb7185',
    icon: '🎭',
    imageUrl: 'https://images.pokemontcg.io/sv6/217_hires.png',
    artUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/1017.png',
    hasRgbAura: true,
  },
  {
    id: 'pe_umbreon_sir',
    dexNumber: 197,
    name: 'Umbreon ex (Moonbreon)',
    subtitle: 'Full Art Secret (☆☆)',
    type: 'Darkness',
    hp: 280,
    rarity: 'Special Illustration Rare',
    pocketRarity: 'Star2',
    raritySymbol: '☆☆',
    rarityLabel: '2 Sao (Full Art Secret)',
    setName: 'Prismatic Evolutions',
    setNumber: '215/203',
    marketPrice: 420.0,
    artist: 'HYOGONOSUKE',
    attacks: [
      { name: 'Moonlight Veil', damage: 'Ability', cost: [] },
      { name: 'Dark Eclipse', damage: '260', cost: ['Darkness', 'Darkness', 'Colorless'] },
    ],
    weakness: 'Grass',
    retreatCost: 2,
    flavorText: 'Trăng tròn soi rọi ánh sáng ma mị trên từng vòng phát quang. Tuyệt phẩm đắt giá nhất giới TCG hiện đại!',
    holographicType: 'rainbow',
    cardColor: '#18181b',
    accentColor: '#38bdf8',
    icon: '🌙',
    imageUrl: 'https://images.pokemontcg.io/swsh7/215_hires.png',
    artUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/197.png',
    hasRgbAura: true,
  },
  {
    id: 'swsh7_rayquaza_vmax_alt',
    dexNumber: 384,
    name: 'Rayquaza VMAX Alt Art',
    subtitle: 'Full Art Secret (☆☆)',
    type: 'Dragon',
    hp: 320,
    rarity: 'Special Illustration Rare',
    pocketRarity: 'Star2',
    raritySymbol: '☆☆',
    rarityLabel: '2 Sao (Full Art Secret)',
    setName: 'Prismatic Evolutions',
    setNumber: '218/203',
    marketPrice: 460.0,
    artist: 'Anesaki Dynamic',
    attacks: [
      { name: 'Azure Pulse', damage: 'Ability', cost: [] },
      { name: 'Max Burst', damage: '340', cost: ['Fire', 'Lightning'] },
    ],
    weakness: 'Colorless',
    retreatCost: 2,
    flavorText: 'Thần rồng bay lượn uốn khúc giữa những rặng cây tùng cổ thụ trong đêm trăng huyền ảo.',
    holographicType: 'rainbow',
    cardColor: '#065f46',
    accentColor: '#34d399',
    icon: '🐉',
    imageUrl: 'https://images.pokemontcg.io/swsh7/218_hires.png',
    artUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/384.png',
    hasRgbAura: true,
  },
  {
    id: 'swsh12_lugia_v_alt',
    dexNumber: 249,
    name: 'Lugia V Alt Art',
    subtitle: 'Full Art Secret (☆☆)',
    type: 'Colorless',
    hp: 220,
    rarity: 'Special Illustration Rare',
    pocketRarity: 'Star2',
    raritySymbol: '☆☆',
    rarityLabel: '2 Sao (Full Art Secret)',
    setName: 'Crown Zenith',
    setNumber: '186/195',
    marketPrice: 195.0,
    artist: 'kawayoo',
    attacks: [
      { name: 'Read the Wind', damage: 'Draw', cost: ['Colorless'] },
      { name: 'Aero Dive', damage: '130', cost: ['Colorless', 'Colorless', 'Colorless', 'Colorless'] },
    ],
    weakness: 'Lightning',
    retreatCost: 2,
    flavorText: 'Thần biển cả vỗ cánh rẽ sóng băng qua xoáy nước đại dương ngút ngàn bão tố.',
    holographicType: 'rainbow',
    cardColor: '#1e3a8a',
    accentColor: '#93c5fd',
    icon: '🌊',
    imageUrl: 'https://images.pokemontcg.io/swsh12/186_hires.png',
    artUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/249.png',
    hasRgbAura: true,
  },


  // --- ☆ 1 SAO: ILLUSTRATION RARE (IR - Rate 2.57%) ---
  {
    id: 'p151_pikachu_ir',
    dexNumber: 25,
    name: 'Pikachu Illustration Rare',
    subtitle: 'Illustration Rare (☆)',
    type: 'Lightning',
    hp: 70,
    rarity: 'Illustration Rare',
    pocketRarity: 'Star1',
    raritySymbol: '☆',
    rarityLabel: '1 Sao (Illustration Rare)',
    setName: 'Scarlet & Violet: 151',
    setNumber: '173/165',
    marketPrice: 92.0,
    artist: 'Hiroyuki Yamamoto',
    attacks: [
      { name: 'Charge', damage: 'Search', cost: ['Lightning'] },
      { name: 'Pika Punch', damage: '50', cost: ['Lightning', 'Colorless', 'Colorless'] },
    ],
    weakness: 'Fighting',
    retreatCost: 1,
    flavorText: 'Chú chuột điện Pikachu dễ thương dạo bước cùng vô số bạn bè Kanto trên cánh đồng hoa bát ngát!',
    holographicType: 'cosmic',
    cardColor: '#ca8a04',
    accentColor: '#facc15',
    icon: '⚡',
    imageUrl: 'https://images.pokemontcg.io/sv3pt5/173_hires.png',
    artUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png',
  },
  {
    id: 'sv2_magikarp_ir',
    dexNumber: 129,
    name: 'Magikarp Illustration Rare',
    subtitle: 'Illustration Rare (☆)',
    type: 'Water',
    hp: 30,
    rarity: 'Illustration Rare',
    pocketRarity: 'Star1',
    raritySymbol: '☆',
    rarityLabel: '1 Sao (Illustration Rare)',
    setName: 'Paldea Evolved',
    setNumber: '203/193',
    marketPrice: 145.0,
    artist: 'Shinji Kanda',
    attacks: [{ name: 'Splashing Around', damage: '10', cost: ['Water'] }],
    weakness: 'Lightning',
    retreatCost: 1,
    flavorText: 'Tranh thủy mặc cá chép vượt vũ môn hóa rồng kinh điển của họa sĩ Shinji Kanda!',
    holographicType: 'cosmic',
    cardColor: '#c2410c',
    accentColor: '#fdba74',
    icon: '🐟',
    imageUrl: 'https://images.pokemontcg.io/sv2/203_hires.png',
    artUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/129.png',
  },
  {
    id: 'sv6_eevee_ir',
    dexNumber: 133,
    name: 'Eevee Illustration Rare (SV6)',
    subtitle: 'Illustration Rare (☆) - Phòng Ngủ Êm Ái',
    type: 'Colorless',
    hp: 70,
    rarity: 'Illustration Rare',
    pocketRarity: 'Star1',
    raritySymbol: '☆',
    rarityLabel: '1 Sao (Illustration Rare)',
    setName: 'Twilight Masquerade',
    setNumber: '188/167',
    marketPrice: 65.0,
    artist: 'Kedamahadaitai Yawarakai',
    attacks: [{ name: 'Ascension', damage: 'Evolve', cost: ['Colorless'] }],
    weakness: 'Fighting',
    retreatCost: 1,
    flavorText: 'Eevee cuộn tròn ngủ say sưa giữa căn phòng tràn ngập gấu bông và đồ chơi êm ái vô cùng đáng yêu!',
    holographicType: 'cosmic',
    cardColor: '#78716c',
    accentColor: '#d6d3d1',
    icon: '🦊',
    imageUrl: 'https://images.pokemontcg.io/sv6/188_hires.png',
    artUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/133.png',
    hasRgbAura: false,
  },
  {
    id: 'p151_charmander_ir',
    dexNumber: 4,
    name: 'Charmander Illustration Rare',
    subtitle: 'Illustration Rare (☆)',
    type: 'Fire',
    hp: 70,
    rarity: 'Illustration Rare',
    pocketRarity: 'Star1',
    raritySymbol: '☆',
    rarityLabel: '1 Sao (Illustration Rare)',
    setName: 'Scarlet & Violet: 151',
    setNumber: '168/165',
    marketPrice: 48.0,
    artist: 'Akira Egawa',
    attacks: [
      { name: 'Blazing Destruction', damage: 'Discard', cost: ['Fire'] },
      { name: 'Steady Firebreathing', damage: '30', cost: ['Fire', 'Colorless'] },
    ],
    weakness: 'Water',
    retreatCost: 1,
    flavorText: 'Khủng long lửa Charmander ngắm nhìn ngọn núi lửa xa xăm nơi định mệnh nó thuộc về.',
    holographicType: 'cosmic',
    cardColor: '#ea580c',
    accentColor: '#fdba74',
    icon: '🦎',
    imageUrl: 'https://images.pokemontcg.io/sv3pt5/168_hires.png',
    artUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/4.png',
  },
  {
    id: 'p151_squirtle_ir',
    dexNumber: 7,
    name: 'Squirtle Illustration Rare',
    subtitle: 'Illustration Rare (☆)',
    type: 'Water',
    hp: 60,
    rarity: 'Illustration Rare',
    pocketRarity: 'Star1',
    raritySymbol: '☆',
    rarityLabel: '1 Sao (Illustration Rare)',
    setName: 'Scarlet & Violet: 151',
    setNumber: '170/165',
    marketPrice: 38.0,
    artist: 'Mitsuhiro Arita',
    attacks: [{ name: 'Withdraw', damage: 'Protect', cost: ['Water'] }, { name: 'Skull Bash', damage: '20', cost: ['Water', 'Colorless'] }],
    weakness: 'Lightning',
    retreatCost: 1,
    flavorText: 'Tung tăng dạo chơi trên bãi cát trắng ven bờ biển nhiệt đới trong xanh.',
    holographicType: 'cosmic',
    cardColor: '#0284c7',
    accentColor: '#7dd3fc',
    icon: '🐢',
    imageUrl: 'https://images.pokemontcg.io/sv3pt5/170_hires.png',
    artUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/7.png',
  },
  {
    id: 'p151_bulbasaur_ir',
    dexNumber: 1,
    name: 'Bulbasaur Illustration Rare',
    subtitle: 'Illustration Rare (☆)',
    type: 'Grass',
    hp: 70,
    rarity: 'Illustration Rare',
    pocketRarity: 'Star1',
    raritySymbol: '☆',
    rarityLabel: '1 Sao (Illustration Rare)',
    setName: 'Scarlet & Violet: 151',
    setNumber: '166/165',
    marketPrice: 35.0,
    artist: 'Yuu Nishida',
    attacks: [{ name: 'Leech Seed', damage: '20', cost: ['Grass', 'Colorless'] }],
    weakness: 'Fire',
    retreatCost: 2,
    flavorText: 'Nằm phơi nắng êm đềm bên ô cửa sổ ban mai, chồi non trên lưng hấp thụ ánh mặt trời ấm áp.',
    holographicType: 'cosmic',
    cardColor: '#16a34a',
    accentColor: '#86efac',
    icon: '🌱',
    imageUrl: 'https://images.pokemontcg.io/sv3pt5/166_hires.png',
    artUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/1.png',
  },
  {
    id: 'p151_charmeleon_ir',
    dexNumber: 5,
    name: 'Charmeleon Illustration Rare',
    subtitle: 'Illustration Rare (☆)',
    type: 'Fire',
    hp: 90,
    rarity: 'Illustration Rare',
    pocketRarity: 'Star1',
    raritySymbol: '☆',
    rarityLabel: '1 Sao (Illustration Rare)',
    setName: 'Scarlet & Violet: 151',
    setNumber: '169/165',
    marketPrice: 42.0,
    artist: 'Akira Egawa',
    attacks: [
      { name: 'Combustion', damage: '20', cost: ['Fire'] },
      { name: 'Fire Blast', damage: '90', cost: ['Fire', 'Fire', 'Colorless'] },
    ],
    weakness: 'Water',
    retreatCost: 2,
    flavorText: 'Đứng hiên ngang giữa dòng dung nham nóng bỏng chuẩn bị tiến hóa thành rồng lửa.',
    holographicType: 'cosmic',
    cardColor: '#c2410c',
    accentColor: '#fb923c',
    icon: '🔥',
    imageUrl: 'https://images.pokemontcg.io/sv3pt5/169_hires.png',
    artUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/5.png',
  },

  // --- ♢♢♢♢ 4 KIM CƯƠNG: POKEMON EX ĐẶC BIỆT (Rate 1.67%) ---
  {
    id: 'p151_blastoise_sir',
    dexNumber: 9,
    name: 'Blastoise ex',
    subtitle: 'Pokemon ex Đặc Biệt (♢♢♢♢)',
    type: 'Water',
    hp: 330,
    rarity: 'Double Rare EX',
    pocketRarity: 'Diamond4',
    raritySymbol: '♢♢♢♢',
    rarityLabel: '4 Kim Cương (Pokemon ex)',
    setName: 'Scarlet & Violet: 151',
    setNumber: '200/165',
    marketPrice: 115.0,
    artist: 'Mitsuhiro Arita',
    attacks: [
      { name: 'Twin Cannons', damage: '140x', cost: ['Water', 'Water'] },
      { name: 'Hydro Tackle', damage: '240', cost: ['Water', 'Water', 'Colorless'] },
    ],
    weakness: 'Lightning',
    retreatCost: 3,
    flavorText: 'Pháo nước đại bác lặn sâu dưới đáy đại dương ngắm nhìn ánh sáng mặt trời huyền ảo.',
    holographicType: 'rainbow',
    cardColor: '#0369a1',
    accentColor: '#38bdf8',
    icon: '🌊',
    imageUrl: 'https://images.pokemontcg.io/sv3pt5/200_hires.png',
    artUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/9.png',
  },
  {
    id: 'p151_venusaur_sir',
    dexNumber: 3,
    name: 'Venusaur ex',
    subtitle: 'Pokemon ex Đặc Biệt (♢♢♢♢)',
    type: 'Grass',
    hp: 340,
    rarity: 'Double Rare EX',
    pocketRarity: 'Diamond4',
    raritySymbol: '♢♢♢♢',
    rarityLabel: '4 Kim Cương (Pokemon ex)',
    setName: 'Scarlet & Violet: 151',
    setNumber: '198/165',
    marketPrice: 95.0,
    artist: 'Yuu Nishida',
    attacks: [
      { name: 'Tranquil Flower', damage: 'Ability', cost: [] },
      { name: 'Dangerous Toxwhip', damage: '150', cost: ['Grass', 'Grass', 'Colorless'] },
    ],
    weakness: 'Fire',
    retreatCost: 4,
    flavorText: 'Đóa hoa khổng lồ nở rộ giữa rừng mưa nhiệt đới sau cơn bão, toát lên hương thơm tĩnh lặng.',
    holographicType: 'rainbow',
    cardColor: '#15803d',
    accentColor: '#4ade80',
    icon: '🍃',
    imageUrl: 'https://images.pokemontcg.io/sv3pt5/198_hires.png',
    artUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/3.png',
  },
  {
    id: 'p151_alakazam_sir',
    dexNumber: 65,
    name: 'Alakazam ex',
    subtitle: 'Pokemon ex Đặc Biệt (♢♢♢♢)',
    type: 'Psychic',
    hp: 310,
    rarity: 'Double Rare EX',
    pocketRarity: 'Diamond4',
    raritySymbol: '♢♢♢♢',
    rarityLabel: '4 Kim Cương (Pokemon ex)',
    setName: 'Scarlet & Violet: 151',
    setNumber: '201/165',
    marketPrice: 75.0,
    artist: 'Shinya Komatsu',
    attacks: [
      { name: 'Mind Jack', damage: '90+', cost: ['Colorless', 'Colorless'] },
      { name: 'Dimensional Hand', damage: '120', cost: ['Psychic', 'Psychic'] },
    ],
    weakness: 'Darkness',
    retreatCost: 1,
    flavorText: 'Bậc thầy tâm linh kiểm soát thìa bạc lơ lửng, tạo chiều không gian bí ẩn từ phòng thí nghiệm.',
    holographicType: 'rainbow',
    cardColor: '#86198f',
    accentColor: '#e879f9',
    icon: '🥄',
    imageUrl: 'https://images.pokemontcg.io/sv3pt5/201_hires.png',
    artUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/65.png',
  },
  {
    id: 'p151_zapdos_sir',
    dexNumber: 145,
    name: 'Zapdos ex',
    subtitle: 'Pokemon ex Đặc Biệt (♢♢♢♢)',
    type: 'Lightning',
    hp: 250,
    rarity: 'Double Rare EX',
    pocketRarity: 'Diamond4',
    raritySymbol: '♢♢♢♢',
    rarityLabel: '4 Kim Cương (Pokemon ex)',
    setName: 'Scarlet & Violet: 151',
    setNumber: '202/165',
    marketPrice: 85.0,
    artist: 'Shinji Kanda',
    attacks: [
      { name: 'Volt Float', damage: 'Ability', cost: [] },
      { name: 'Multishot Lightning', damage: '120', cost: ['Lightning', 'Lightning', 'Lightning'] },
    ],
    weakness: 'Lightning',
    retreatCost: 2,
    flavorText: 'Cánh chim sấm sét xé toạc tầng mây bão tố trong phong cách vẽ mực thần thánh.',
    holographicType: 'rainbow',
    cardColor: '#a16207',
    accentColor: '#fef08a',
    icon: '⚡',
    imageUrl: 'https://images.pokemontcg.io/sv3pt5/202_hires.png',
    artUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/145.png',
  },
  {
    id: 'p151_gyarados_ex',
    dexNumber: 130,
    name: 'Gyarados ex',
    subtitle: 'Pokemon ex Đặc Biệt (♢♢♢♢)',
    type: 'Water',
    hp: 300,
    rarity: 'Double Rare EX',
    pocketRarity: 'Diamond4',
    raritySymbol: '♢♢♢♢',
    rarityLabel: '4 Kim Cương (Pokemon ex)',
    setName: 'Scarlet & Violet: 151',
    setNumber: '130/165',
    marketPrice: 22.0,
    artist: '5ban Graphics',
    attacks: [{ name: 'Waterfall', damage: '100', cost: ['Water', 'Water', 'Colorless'] }, { name: 'Tyrannical Hole', damage: '220', cost: ['Water', 'Water', 'Water', 'Colorless'] }],
    weakness: 'Lightning',
    retreatCost: 4,
    flavorText: 'Cơn thịnh nộ của bạo long biển cả dâng trào cuốn phăng mọi chiến hạm.',
    holographicType: 'holo',
    cardColor: '#0284c7',
    accentColor: '#38bdf8',
    icon: '🌊',
    imageUrl: 'https://images.pokemontcg.io/sv3pt5/130_hires.png',
    artUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/130.png',
  },

  // --- ♢♢♢ 3 KIM CƯƠNG: RARE HOLO (Rate 20.00%) ---
  {
    id: 'p151_dragonite_holo',
    dexNumber: 149,
    name: 'Dragonite Holo',
    subtitle: 'Rare Holo (♢♢♢)',
    type: 'Dragon',
    hp: 180,
    rarity: 'Rare Holo',
    pocketRarity: 'Diamond3',
    raritySymbol: '♢♢♢',
    rarityLabel: '3 Kim Cương (Rare Holo)',
    setName: 'Scarlet & Violet: 151',
    setNumber: '149/165',
    marketPrice: 12.0,
    artist: 'Kouki Saitou',
    attacks: [
      { name: 'Jet Cruise', damage: 'Ability', cost: [] },
      { name: 'Dragon Pulse', damage: '180', cost: ['Water', 'Lightning'] },
    ],
    weakness: 'Colorless',
    retreatCost: 2,
    flavorText: 'Rồng biển hiền từ bay lượn trên đại dương mênh mông, sẵn sàng giải cứu những người gặp nạn.',
    holographicType: 'holo',
    cardColor: '#b45309',
    accentColor: '#fbbf24',
    icon: '🐲',
    imageUrl: 'https://images.pokemontcg.io/sv3pt5/149_hires.png',
    artUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/149.png',
  },
  {
    id: 'p151_gengar_holo',
    dexNumber: 94,
    name: 'Gengar Holo',
    subtitle: 'Rare Holo (♢♢♢)',
    type: 'Psychic',
    hp: 130,
    rarity: 'Rare Holo',
    pocketRarity: 'Diamond3',
    raritySymbol: '♢♢♢',
    rarityLabel: '3 Kim Cương (Rare Holo)',
    setName: 'Scarlet & Violet: 151',
    setNumber: '094/165',
    marketPrice: 18.0,
    artist: 'Tomokazu Komiya',
    attacks: [
      { name: 'Poltergeist', damage: '50x', cost: ['Psychic'] },
      { name: 'Hollow Slap', damage: '80', cost: ['Colorless', 'Colorless'] },
    ],
    weakness: 'Darkness',
    retreatCost: 1,
    flavorText: 'Bóng ma nhe răng cười tinh quái ẩn hiện dưới ánh trăng rằm.',
    holographicType: 'holo',
    cardColor: '#4c1d95',
    accentColor: '#c084fc',
    icon: '👻',
    imageUrl: 'https://images.pokemontcg.io/sv3pt5/94_hires.png',
    artUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/94.png',
  },
  {
    id: 'p151_snorlax_holo',
    dexNumber: 143,
    name: 'Snorlax Holo',
    subtitle: 'Rare Holo (♢♢♢)',
    type: 'Colorless',
    hp: 150,
    rarity: 'Rare Holo',
    pocketRarity: 'Diamond3',
    raritySymbol: '♢♢♢',
    rarityLabel: '3 Kim Cương (Rare Holo)',
    setName: 'Scarlet & Violet: 151',
    setNumber: '143/165',
    marketPrice: 15.0,
    artist: 'Narumi Sato',
    attacks: [{ name: 'Voracious', damage: 'Ability', cost: [] }, { name: 'Heavy Impact', damage: '130', cost: ['Colorless', 'Colorless', 'Colorless', 'Colorless'] }],
    weakness: 'Fighting',
    retreatCost: 4,
    flavorText: 'Ăn hết 400kg thức ăn mỗi ngày rồi chìm vào giấc ngủ say sưa bất chấp mọi thứ.',
    holographicType: 'holo',
    cardColor: '#52525b',
    accentColor: '#d4d4d8',
    icon: '💤',
    imageUrl: 'https://images.pokemontcg.io/sv3pt5/143_hires.png',
    artUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/143.png',
  },

  // --- ♢♢ 2 KIM CƯƠNG: UNCOMMON / STAGE 1 (Rate 60.00% at slot 10) ---
  {
    id: 'p151_eevee_holo',
    dexNumber: 133,
    name: 'Eevee Reverse Holo',
    subtitle: 'Uncommon Reverse (♢♢)',
    type: 'Colorless',
    hp: 70,
    rarity: 'Uncommon',
    pocketRarity: 'Diamond2',
    raritySymbol: '♢♢',
    rarityLabel: '2 Kim Cương (Uncommon)',
    setName: 'Scarlet & Violet: 151',
    setNumber: '133/165',
    marketPrice: 8.5,
    artist: 'Naoyo Kimura',
    attacks: [{ name: 'Cheer Up', damage: 'Energy', cost: ['Colorless'] }, { name: 'Kick', damage: '20', cost: ['Colorless', 'Colorless'] }],
    weakness: 'Fighting',
    retreatCost: 1,
    flavorText: 'Loài Pokemon có cấu trúc ADN bất ổn nhất, chứa đựng khả năng biến hóa vô tận theo 8 con đường!',
    holographicType: 'reverse',
    cardColor: '#71717a',
    accentColor: '#e4e4e7',
    icon: '🦊',
    imageUrl: 'https://images.pokemontcg.io/sv3pt5/133_hires.png',
    artUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/133.png',
  },
  {
    id: 'p151_haunter_uncommon',
    dexNumber: 93,
    name: 'Haunter',
    subtitle: 'Uncommon (♢♢)',
    type: 'Psychic',
    hp: 80,
    rarity: 'Uncommon',
    pocketRarity: 'Diamond2',
    raritySymbol: '♢♢',
    rarityLabel: '2 Kim Cương (Uncommon)',
    setName: 'Scarlet & Violet: 151',
    setNumber: '093/165',
    marketPrice: 2.0,
    artist: 'Tomokazu Komiya',
    attacks: [{ name: 'Will-O-Wisp', damage: '30', cost: ['Psychic'] }],
    weakness: 'Darkness',
    retreatCost: 1,
    flavorText: 'Liếm bằng lưỡi khí ga ma quái làm đối thủ run rẩy không thể di chuyển.',
    holographicType: 'none',
    cardColor: '#581c87',
    accentColor: '#c084fc',
    icon: '👻',
    imageUrl: 'https://images.pokemontcg.io/sv3pt5/93_hires.png',
    artUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/93.png',
  },
  {
    id: 'p151_wartortle_uncommon',
    dexNumber: 8,
    name: 'Wartortle',
    subtitle: 'Uncommon (♢♢)',
    type: 'Water',
    hp: 100,
    rarity: 'Uncommon',
    pocketRarity: 'Diamond2',
    raritySymbol: '♢♢',
    rarityLabel: '2 Kim Cương (Uncommon)',
    setName: 'Scarlet & Violet: 151',
    setNumber: '008/165',
    marketPrice: 2.5,
    artist: 'Mitsuhiro Arita',
    attacks: [{ name: 'Aqua Slash', damage: '50', cost: ['Water', 'Colorless'] }],
    weakness: 'Lightning',
    retreatCost: 2,
    flavorText: 'Cặp tai và chiếc đuôi mây bông xù là biểu tượng của sự trường thọ.',
    holographicType: 'none',
    cardColor: '#0369a1',
    accentColor: '#7dd3fc',
    icon: '🐢',
    imageUrl: 'https://images.pokemontcg.io/sv3pt5/8_hires.png',
    artUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/8.png',
  },

  // --- ♢ 1 KIM CƯƠNG: COMMON (Rate 100% at slots 1-7) ---
  {
    id: 'p151_abra_common',
    dexNumber: 63,
    name: 'Abra',
    subtitle: 'Common (♢)',
    type: 'Psychic',
    hp: 50,
    rarity: 'Common',
    pocketRarity: 'Diamond1',
    raritySymbol: '♢',
    rarityLabel: '1 Kim Cương (Common)',
    setName: 'Scarlet & Violet: 151',
    setNumber: '063/165',
    marketPrice: 0.5,
    artist: 'Sekio',
    attacks: [{ name: 'Teleport', damage: 'Switch', cost: ['Psychic'] }],
    weakness: 'Darkness',
    retreatCost: 1,
    flavorText: 'Ngủ 18 tiếng mỗi ngày nhưng vẫn cảm nhận được mối nguy hiểm và dịch chuyển tức thời.',
    holographicType: 'none',
    cardColor: '#9333ea',
    accentColor: '#d8b4fe',
    icon: '🔮',
    imageUrl: 'https://images.pokemontcg.io/sv3pt5/63_hires.png',
    artUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/63.png',
  },
  {
    id: 'p151_machop_common',
    dexNumber: 66,
    name: 'Machop',
    subtitle: 'Common (♢)',
    type: 'Fighting',
    hp: 70,
    rarity: 'Common',
    pocketRarity: 'Diamond1',
    raritySymbol: '♢',
    rarityLabel: '1 Kim Cương (Common)',
    setName: 'Scarlet & Violet: 151',
    setNumber: '066/165',
    marketPrice: 0.5,
    artist: 'Kurumitsu',
    attacks: [{ name: 'Mountain Chop', damage: '30', cost: ['Fighting', 'Fighting'] }],
    weakness: 'Psychic',
    retreatCost: 2,
    flavorText: 'Tập luyện không ngừng nghỉ bằng cách nâng vác những tảng đá khổng lồ.',
    holographicType: 'none',
    cardColor: '#b45309',
    accentColor: '#fcd34d',
    icon: '🥊',
    imageUrl: 'https://images.pokemontcg.io/sv3pt5/66_hires.png',
    artUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/66.png',
  },
  {
    id: 'p151_pidgey_common',
    dexNumber: 16,
    name: 'Pidgey',
    subtitle: 'Common (♢)',
    type: 'Colorless',
    hp: 60,
    rarity: 'Common',
    pocketRarity: 'Diamond1',
    raritySymbol: '♢',
    rarityLabel: '1 Kim Cương (Common)',
    setName: 'Scarlet & Violet: 151',
    setNumber: '016/165',
    marketPrice: 0.4,
    artist: 'Jerky',
    attacks: [{ name: 'Gust', damage: '20', cost: ['Colorless'] }],
    weakness: 'Lightning',
    retreatCost: 1,
    flavorText: 'Loài chim hiền lành phổ biến tại Kanto, thường vỗ cánh tạo luồng cát để tự vệ.',
    holographicType: 'none',
    cardColor: '#78716c',
    accentColor: '#d6d3d1',
    icon: '🐦',
    imageUrl: 'https://images.pokemontcg.io/sv3pt5/16_hires.png',
    artUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/16.png',
  },
  {
    id: 'p151_caterpie_common',
    dexNumber: 10,
    name: 'Caterpie',
    subtitle: 'Common (♢)',
    type: 'Grass',
    hp: 50,
    rarity: 'Common',
    pocketRarity: 'Diamond1',
    raritySymbol: '♢',
    rarityLabel: '1 Kim Cương (Common)',
    setName: 'Scarlet & Violet: 151',
    setNumber: '010/165',
    marketPrice: 0.35,
    artist: 'Teeziro',
    attacks: [{ name: 'Spit Silk', damage: 'Paralyze', cost: ['Grass'] }],
    weakness: 'Fire',
    retreatCost: 1,
    flavorText: 'Nhả tơ nhũ tương để quấn kén, ngụy trang hoàn hảo giữa những tán lá xanh.',
    holographicType: 'none',
    cardColor: '#15803d',
    accentColor: '#86efac',
    icon: '🐛',
    imageUrl: 'https://images.pokemontcg.io/sv3pt5/10_hires.png',
    artUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/10.png',
  },
  {
    id: 'p151_gastly_common',
    dexNumber: 92,
    name: 'Gastly',
    subtitle: 'Common (♢)',
    type: 'Psychic',
    hp: 50,
    rarity: 'Common',
    pocketRarity: 'Diamond1',
    raritySymbol: '♢',
    rarityLabel: '1 Kim Cương (Common)',
    setName: 'Scarlet & Violet: 151',
    setNumber: '092/165',
    marketPrice: 0.45,
    artist: 'Tomokazu Komiya',
    attacks: [{ name: 'Lick', damage: '10', cost: ['Psychic'] }],
    weakness: 'Darkness',
    retreatCost: 1,
    flavorText: 'Cơ thể 95% là khí ga độc, thường lượn lờ trong những ngôi nhà hoang.',
    holographicType: 'none',
    cardColor: '#3b0764',
    accentColor: '#a855f7',
    icon: '👻',
    imageUrl: 'https://images.pokemontcg.io/sv3pt5/92_hires.png',
    artUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/92.png',
  },
  {
    id: 'p151_dratini_common',
    dexNumber: 147,
    name: 'Dratini',
    subtitle: 'Common (♢)',
    type: 'Dragon',
    hp: 70,
    rarity: 'Common',
    pocketRarity: 'Diamond1',
    raritySymbol: '♢',
    rarityLabel: '1 Kim Cương (Common)',
    setName: 'Scarlet & Violet: 151',
    setNumber: '147/165',
    marketPrice: 0.8,
    artist: 'Kouki Saitou',
    attacks: [{ name: 'Wrap', damage: '20', cost: ['Water'] }],
    weakness: 'Colorless',
    retreatCost: 1,
    flavorText: 'Rồng con huyền thoại ẩn mình dưới làn nước sâu trong các thung lũng bí ẩn.',
    holographicType: 'none',
    cardColor: '#1d4ed8',
    accentColor: '#60a5fa',
    icon: '🐉',
    imageUrl: 'https://images.pokemontcg.io/sv3pt5/147_hires.png',
    artUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/147.png',
  },
];

// ==========================================
// PALDEAN FATES (SCARLET & VIOLET) MASTER CARDS WITH TCGPLAYER PRICING
// ==========================================
export const PALDEAN_FATES_CARDS: PokemonCard[] = [
  {
    id: 'sv4pt5-234',
    dexNumber: 6,
    name: 'Shiny Charizard ex (SIR)',
    subtitle: 'Paldean Fates Special Illustration ($128.50) 👑',
    type: 'Darkness',
    hp: 330,
    rarity: 'Special Illustration Rare',
    pocketRarity: 'Crown',
    raritySymbol: '👑',
    rarityLabel: 'Crown Rare / Special Illustration ($128.50)',
    setName: 'Scarlet & Violet: Paldean Fates',
    setNumber: '234/091',
    marketPrice: 128.5,
    artist: 'Akira Egawa',
    attacks: [
      { name: 'Infernal Reign', damage: 'Ability', cost: [] },
      { name: 'Burning Darkness', damage: '180+', cost: ['Fire', 'Fire'] },
    ],
    weakness: 'Grass',
    retreatCost: 2,
    flavorText: 'Rồng lửa Charizard Shiny hắc ám huyền thoại từ Paldean Fates, được săn đón cuồng nhiệt nhất thế giới TCG hiện đại!',
    holographicType: 'gold',
    cardColor: '#1e1b4b',
    accentColor: '#fbbf24',
    icon: '👑',
    imageUrl: 'https://images.pokemontcg.io/sv4pt5/234_hires.png',
    artUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/6.png',
    hasRgbAura: true,
  },
  {
    id: 'sv4pt5-232',
    dexNumber: 151,
    name: 'Shiny Mew ex (SIR)',
    subtitle: 'Paldean Fates Special Illustration ($92.00) ☆☆☆',
    type: 'Psychic',
    hp: 180,
    rarity: 'Special Illustration Rare',
    pocketRarity: 'Star3',
    raritySymbol: '☆☆☆',
    rarityLabel: 'Special Illustration Rare ($92.00)',
    setName: 'Scarlet & Violet: Paldean Fates',
    setNumber: '232/091',
    marketPrice: 92.0,
    artist: 'USGMEN',
    attacks: [
      { name: 'Restart', damage: 'Ability', cost: [] },
      { name: 'Genome Hacking', damage: 'Copy', cost: ['Colorless', 'Colorless', 'Colorless'] },
    ],
    weakness: 'Darkness',
    retreatCost: 0,
    flavorText: 'Thần thú Mew Shiny màu xanh biển vui đùa trong thế giới huyền ảo Paldean Fates.',
    holographicType: 'cosmic',
    cardColor: '#0284c7',
    accentColor: '#38bdf8',
    icon: '🔮',
    imageUrl: 'https://images.pokemontcg.io/sv4pt5/232_hires.png',
    artUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/151.png',
    hasRgbAura: true,
  },
  {
    id: 'sv4pt5-233',
    dexNumber: 282,
    name: 'Shiny Gardevoir ex (SIR)',
    subtitle: 'Paldean Fates Special Illustration ($54.00) ☆☆',
    type: 'Psychic',
    hp: 310,
    rarity: 'Special Illustration Rare',
    pocketRarity: 'Star2',
    raritySymbol: '☆☆',
    rarityLabel: 'Special Illustration Rare ($54.00)',
    setName: 'Scarlet & Violet: Paldean Fates',
    setNumber: '233/091',
    marketPrice: 54.0,
    artist: 'Masako Tomii',
    attacks: [
      { name: 'Psychic Embrace', damage: 'Ability', cost: [] },
      { name: 'Miracle Force', damage: '190', cost: ['Psychic', 'Psychic', 'Colorless'] },
    ],
    weakness: 'Darkness',
    retreatCost: 2,
    flavorText: 'Gardevoir Shiny với bộ váy xanh dương tuyệt mỹ bảo vệ huấn luyện viên hết mình.',
    holographicType: 'rainbow',
    cardColor: '#7e22ce',
    accentColor: '#c084fc',
    icon: '✨',
    imageUrl: 'https://images.pokemontcg.io/sv4pt5/233_hires.png',
    artUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/282.png',
    hasRgbAura: true,
  },
  {
    id: 'sv4pt5-237',
    dexNumber: 0,
    name: 'Iono (SIR)',
    subtitle: 'Paldean Fates Special Supporter ($42.00) ☆☆',
    type: 'Lightning',
    hp: 0,
    rarity: 'Special Illustration Rare',
    pocketRarity: 'Star2',
    raritySymbol: '☆☆',
    rarityLabel: 'Special Supporter ($42.00)',
    setName: 'Scarlet & Violet: Paldean Fates',
    setNumber: '237/091',
    marketPrice: 42.0,
    artist: 'Megumi Mizutani',
    attacks: [
      { name: 'Stream Broadcast', damage: 'Draw', cost: [] },
    ],
    weakness: 'None',
    retreatCost: 0,
    flavorText: 'Streamer kiêm Gym Leader điện quang Iono cực hot của vùng Paldea!',
    holographicType: 'rainbow',
    cardColor: '#eab308',
    accentColor: '#fde047',
    icon: '⚡',
    imageUrl: 'https://images.pokemontcg.io/sv4pt5/237_hires.png',
    artUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png',
    hasRgbAura: true,
  },
  {
    id: 'sv4pt5-131',
    dexNumber: 25,
    name: 'Shiny Pikachu',
    subtitle: 'Paldean Fates Baby Shiny ($41.50) ☆',
    type: 'Lightning',
    hp: 60,
    rarity: 'Illustration Rare',
    pocketRarity: 'Star1',
    raritySymbol: '☆',
    rarityLabel: 'Illustration Rare ($41.50)',
    setName: 'Scarlet & Violet: Paldean Fates',
    setNumber: '131/091',
    marketPrice: 41.5,
    artist: 'Hiroyuki Yamamoto',
    attacks: [
      { name: 'Charge', damage: 'Energy', cost: ['Colorless'] },
      { name: 'Pika Bolt', damage: '30', cost: ['Lightning', 'Colorless'] },
    ],
    weakness: 'Fighting',
    retreatCost: 1,
    flavorText: 'Pikachu Shiny màu cam óng ánh lấp lánh biểu tượng của dòng thẻ Paldean Fates!',
    holographicType: 'holo',
    cardColor: '#ca8a04',
    accentColor: '#fde047',
    icon: '⚡',
    imageUrl: 'https://images.pokemontcg.io/sv4pt5/131_hires.png',
    artUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png',
    hasRgbAura: true,
  },
  {
    id: 'sv4pt5-37',
    dexNumber: 778,
    name: 'Shiny Mimikyu',
    subtitle: 'Paldean Fates ETB Mascot ($26.50) ☆',
    type: 'Psychic',
    hp: 70,
    rarity: 'Illustration Rare',
    pocketRarity: 'Star1',
    raritySymbol: '☆',
    rarityLabel: 'Illustration Rare ($26.50)',
    setName: 'Scarlet & Violet: Paldean Fates',
    setNumber: '037/091',
    marketPrice: 26.5,
    artist: 'Mitsuhiro Arita',
    attacks: [
      { name: 'Safeguard', damage: 'Ability', cost: [] },
      { name: 'Ghost Punch', damage: '30', cost: ['Psychic', 'Colorless'] },
    ],
    weakness: 'Metal',
    retreatCost: 1,
    flavorText: 'Linh vật của hộp Scarlet & Violet: Paldean Fates Elite Trainer Box lấp lánh ngôi sao kỳ ảo!',
    holographicType: 'holo',
    cardColor: '#581c87',
    accentColor: '#c084fc',
    icon: '👻',
    imageUrl: 'https://images.pokemontcg.io/sv4pt5/37_hires.png',
    artUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/778.png',
    hasRgbAura: true,
  },
  {
    id: 'sv4pt5-109',
    dexNumber: 4,
    name: 'Shiny Charmander',
    subtitle: 'Paldean Fates Baby Shiny ($31.00) ☆',
    type: 'Fire',
    hp: 70,
    rarity: 'Illustration Rare',
    pocketRarity: 'Star1',
    raritySymbol: '☆',
    rarityLabel: 'Illustration Rare ($31.00)',
    setName: 'Scarlet & Violet: Paldean Fates',
    setNumber: '109/091',
    marketPrice: 31.0,
    artist: 'Teeziro',
    attacks: [
      { name: 'Playful Scratch', damage: '10', cost: ['Colorless'] },
      { name: 'Ember', damage: '30', cost: ['Fire', 'Colorless'] },
    ],
    weakness: 'Water',
    retreatCost: 1,
    flavorText: 'Thằn lằn lửa Charmander Shiny tông vàng nhạt cực kỳ quý hiếm!',
    holographicType: 'holo',
    cardColor: '#c2410c',
    accentColor: '#fb923c',
    icon: '🔥',
    imageUrl: 'https://images.pokemontcg.io/sv4pt5/109_hires.png',
    artUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/4.png',
    hasRgbAura: true,
  },
  {
    id: 'sv4pt5-110',
    dexNumber: 5,
    name: 'Shiny Charmeleon',
    subtitle: 'Paldean Fates Baby Shiny ($21.50) ☆',
    type: 'Fire',
    hp: 90,
    rarity: 'Illustration Rare',
    pocketRarity: 'Star1',
    raritySymbol: '☆',
    rarityLabel: 'Illustration Rare ($21.50)',
    setName: 'Scarlet & Violet: Paldean Fates',
    setNumber: '110/091',
    marketPrice: 21.5,
    artist: 'Mitsuhiro Arita',
    attacks: [{ name: 'Combustion', damage: '50', cost: ['Fire', 'Fire'] }],
    weakness: 'Water',
    retreatCost: 2,
    flavorText: 'Charmeleon dạng Shiny tiến hóa trước thềm bùng cháy thành rồng đen!',
    holographicType: 'holo',
    cardColor: '#b91c1c',
    accentColor: '#f87171',
    icon: '🔥',
    imageUrl: 'https://images.pokemontcg.io/sv4pt5/110_hires.png',
    artUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/5.png',
  },
  {
    id: 'sv4pt5-15',
    dexNumber: 937,
    name: 'Ceruledge Holo',
    subtitle: 'Paldean Fates Booster Pack Mascot ($16.50) ☆',
    type: 'Fire',
    hp: 140,
    rarity: 'Rare Holo',
    pocketRarity: 'Star1',
    raritySymbol: '☆',
    rarityLabel: 'Rare Holo Pack Cover ($16.50)',
    setName: 'Scarlet & Violet: Paldean Fates',
    setNumber: '015/091',
    marketPrice: 16.5,
    artist: 'Ryuta Fuse',
    attacks: [
      { name: 'Life Siphon', damage: '50', cost: ['Fire', 'Colorless'] },
      { name: 'Fighting Blade', damage: '100+', cost: ['Fire', 'Fire', 'Colorless'] },
    ],
    weakness: 'Water',
    retreatCost: 2,
    flavorText: 'Hiệp sĩ song kiếm Ceruledge xuất hiện trên bao bì gói bài Paldean Fates!',
    holographicType: 'holo',
    cardColor: '#581c87',
    accentColor: '#a855f7',
    icon: '⚔️',
    imageUrl: 'https://images.pokemontcg.io/sv4pt5/15_hires.png',
    artUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/937.png',
  },
  {
    id: 'sv4pt5-166',
    dexNumber: 448,
    name: 'Shiny Lucario',
    subtitle: 'Paldean Fates Baby Shiny ($15.00) ☆',
    type: 'Fighting',
    hp: 130,
    rarity: 'Illustration Rare',
    pocketRarity: 'Star1',
    raritySymbol: '☆',
    rarityLabel: 'Illustration Rare ($15.00)',
    setName: 'Scarlet & Violet: Paldean Fates',
    setNumber: '166/091',
    marketPrice: 15.0,
    artist: 'chibi',
    attacks: [{ name: 'Aura Sphere', damage: '110', cost: ['Fighting', 'Fighting'] }],
    weakness: 'Psychic',
    retreatCost: 2,
    flavorText: 'Hiệp sĩ sóng xung kích Lucario Shiny màu vàng lục cực ngầu.',
    holographicType: 'holo',
    cardColor: '#854d0e',
    accentColor: '#facc15',
    icon: '🥋',
    imageUrl: 'https://images.pokemontcg.io/sv4pt5/166_hires.png',
    artUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/448.png',
  },
  // --- ♢♢♢♢ DOUBLE RARE EX CARDS ---
  {
    id: 'sv4pt5-29',
    dexNumber: 282,
    name: 'Gardevoir ex',
    subtitle: 'Paldean Fates Double Rare ($7.50)',
    type: 'Psychic',
    hp: 310,
    rarity: 'Double Rare',
    pocketRarity: 'Diamond4',
    raritySymbol: '♢♢♢♢',
    rarityLabel: 'Double Rare EX ($7.50)',
    setName: 'Scarlet & Violet: Paldean Fates',
    setNumber: '029/091',
    marketPrice: 7.5,
    artist: 'PLANETA Yamashita',
    attacks: [{ name: 'Psychic Embrace', damage: 'Ability', cost: [] }],
    weakness: 'Darkness',
    retreatCost: 2,
    flavorText: 'Gardevoir ex sẵn sàng tạo hố đen bảo vệ chủ nhân.',
    holographicType: 'holo',
    cardColor: '#7e22ce',
    accentColor: '#c084fc',
    icon: '🔮',
    imageUrl: 'https://images.pokemontcg.io/sv4pt5/29_hires.png',
    artUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/282.png',
  },
  {
    id: 'sv4pt5-2',
    dexNumber: 205,
    name: 'Forretress ex',
    subtitle: 'Paldean Fates Double Rare ($1.80)',
    type: 'Grass',
    hp: 270,
    rarity: 'Double Rare',
    pocketRarity: 'Diamond4',
    raritySymbol: '♢♢♢♢',
    rarityLabel: 'Double Rare EX ($1.80)',
    setName: 'Scarlet & Violet: Paldean Fates',
    setNumber: '002/091',
    marketPrice: 1.8,
    artist: 'PLANETA Tsuji',
    attacks: [{ name: 'Exploding Energy', damage: 'Ability', cost: [] }],
    weakness: 'Fire',
    retreatCost: 3,
    flavorText: 'Vỏ thép pháo đài bọc năng lượng bùng nổ của Forretress ex.',
    holographicType: 'holo',
    cardColor: '#15803d',
    accentColor: '#4ade80',
    icon: '🛡️',
    imageUrl: 'https://images.pokemontcg.io/sv4pt5/2_hires.png',
    artUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/205.png',
  },
  {
    id: 'sv4pt5-16',
    dexNumber: 956,
    name: 'Espathra ex',
    subtitle: 'Paldean Fates Double Rare ($1.75)',
    type: 'Psychic',
    hp: 260,
    rarity: 'Double Rare',
    pocketRarity: 'Diamond4',
    raritySymbol: '♢♢♢♢',
    rarityLabel: 'Double Rare EX ($1.75)',
    setName: 'Scarlet & Violet: Paldean Fates',
    setNumber: '016/091',
    marketPrice: 1.75,
    artist: '5ban Graphics',
    attacks: [{ name: 'Stance Lock', damage: 'Ability', cost: [] }],
    weakness: 'Darkness',
    retreatCost: 1,
    flavorText: 'Đà điểu tâm linh Espathra ex thôi miên đối thủ bằng ánh mắt sắc bén.',
    holographicType: 'holo',
    cardColor: '#9333ea',
    accentColor: '#d8b4fe',
    icon: '🔮',
    imageUrl: 'https://images.pokemontcg.io/sv4pt5/16_hires.png',
    artUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/956.png',
  },
  // --- ♢♢♢ RARE HOLOS ---
  {
    id: 'sv4pt5-10',
    dexNumber: 467,
    name: 'Magmortar',
    subtitle: 'Paldean Fates Rare Holo ($0.65)',
    type: 'Fire',
    hp: 140,
    rarity: 'Rare Holo',
    pocketRarity: 'Diamond3',
    raritySymbol: '♢♢♢',
    rarityLabel: 'Rare Holo ($0.65)',
    setName: 'Scarlet & Violet: Paldean Fates',
    setNumber: '010/091',
    marketPrice: 0.65,
    artist: 'Shin Nagasawa',
    attacks: [{ name: 'Fire Blaster', damage: '140', cost: ['Fire', 'Fire', 'Colorless'] }],
    weakness: 'Water',
    retreatCost: 3,
    flavorText: 'Khẩu pháo nhiệt độ 2000 độ C bắn liên hồi từ hai cánh tay.',
    holographicType: 'holo',
    cardColor: '#ea580c',
    accentColor: '#fdba74',
    icon: '💥',
    imageUrl: 'https://images.pokemontcg.io/sv4pt5/10_hires.png',
    artUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/467.png',
  },
  {
    id: 'sv4pt5-11',
    dexNumber: 479,
    name: 'Heat Rotom',
    subtitle: 'Paldean Fates Rare Holo ($0.55)',
    type: 'Fire',
    hp: 90,
    rarity: 'Rare Holo',
    pocketRarity: 'Diamond3',
    raritySymbol: '♢♢♢',
    rarityLabel: 'Rare Holo ($0.55)',
    setName: 'Scarlet & Violet: Paldean Fates',
    setNumber: '011/091',
    marketPrice: 0.55,
    artist: 'Masakazu Fukuda',
    attacks: [{ name: 'Overheat', damage: '100', cost: ['Fire', 'Colorless'] }],
    weakness: 'Water',
    retreatCost: 1,
    flavorText: 'Rotom biến hình vào lò nướng tạo luồng nhiệt cực nóng.',
    holographicType: 'holo',
    cardColor: '#c2410c',
    accentColor: '#f97316',
    icon: '⚡',
    imageUrl: 'https://images.pokemontcg.io/sv4pt5/11_hires.png',
    artUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/479.png',
  },
  // --- ♢♢ UNCOMMONS ---
  {
    id: 'sv4pt5-20',
    dexNumber: 26,
    name: 'Raichu',
    subtitle: 'Paldean Fates Uncommon ($0.80)',
    type: 'Lightning',
    hp: 140,
    rarity: 'Uncommon',
    pocketRarity: 'Diamond2',
    raritySymbol: '♢♢',
    rarityLabel: 'Uncommon ($0.80)',
    setName: 'Scarlet & Violet: Paldean Fates',
    setNumber: '020/091',
    marketPrice: 0.8,
    artist: 'Kouki Saitou',
    attacks: [{ name: 'Thunderbolt', damage: '120', cost: ['Lightning', 'Lightning', 'Colorless'] }],
    weakness: 'Fighting',
    retreatCost: 1,
    flavorText: 'Đuôi của Raichu chạm đất phóng tia sét 100,000 vôn.',
    holographicType: 'none',
    cardColor: '#d97706',
    accentColor: '#fde047',
    icon: '⚡',
    imageUrl: 'https://images.pokemontcg.io/sv4pt5/20_hires.png',
    artUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/26.png',
  },
  {
    id: 'sv4pt5-7',
    dexNumber: 131,
    name: 'Lapras',
    subtitle: 'Paldean Fates Uncommon ($0.60)',
    type: 'Water',
    hp: 110,
    rarity: 'Uncommon',
    pocketRarity: 'Diamond2',
    raritySymbol: '♢♢',
    rarityLabel: 'Uncommon ($0.60)',
    setName: 'Scarlet & Violet: Paldean Fates',
    setNumber: '007/091',
    marketPrice: 0.6,
    artist: 'Mizue',
    attacks: [{ name: 'Hydro Pump', damage: '70', cost: ['Water', 'Water'] }],
    weakness: 'Lightning',
    retreatCost: 2,
    flavorText: 'Lapras hiền hòa bơi qua đại dương chở mọi người trên lưng.',
    holographicType: 'none',
    cardColor: '#0284c7',
    accentColor: '#38bdf8',
    icon: '🌊',
    imageUrl: 'https://images.pokemontcg.io/sv4pt5/7_hires.png',
    artUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/131.png',
  },
  {
    id: 'sv4pt5-23',
    dexNumber: 936,
    name: 'Armarouge',
    subtitle: 'Paldean Fates Uncommon ($0.85)',
    type: 'Fire',
    hp: 130,
    rarity: 'Uncommon',
    pocketRarity: 'Diamond2',
    raritySymbol: '♢♢',
    rarityLabel: 'Uncommon ($0.85)',
    setName: 'Scarlet & Violet: Paldean Fates',
    setNumber: '023/091',
    marketPrice: 0.85,
    artist: 'Akira Komayama',
    attacks: [{ name: 'Fire Off', damage: 'Ability', cost: [] }],
    weakness: 'Water',
    retreatCost: 2,
    flavorText: 'Bộ giáp vàng kiên cố chứa đựng hỏa lực vô biên của Armarouge.',
    holographicType: 'none',
    cardColor: '#b91c1c',
    accentColor: '#f87171',
    icon: '🔥',
    imageUrl: 'https://images.pokemontcg.io/sv4pt5/23_hires.png',
    artUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/936.png',
  },
  {
    id: 'sv4pt5-44',
    dexNumber: 0,
    name: 'Ultra Ball',
    subtitle: 'Paldean Fates Item Trainer ($0.40)',
    type: 'Colorless',
    hp: 0,
    rarity: 'Uncommon',
    pocketRarity: 'Diamond2',
    raritySymbol: '♢♢',
    rarityLabel: 'Trainer Item ($0.40)',
    setName: 'Scarlet & Violet: Paldean Fates',
    setNumber: '044/091',
    marketPrice: 0.4,
    artist: 'Studio Boreas',
    attacks: [{ name: 'Search Pokemon', damage: 'Item', cost: [] }],
    weakness: 'None',
    retreatCost: 0,
    flavorText: 'Bỏ 2 lá bài để tìm 1 Pokemon bất kỳ trong bộ bài lên tay.',
    holographicType: 'none',
    cardColor: '#4b5563',
    accentColor: '#9ca3af',
    icon: '⚽',
    imageUrl: 'https://images.pokemontcg.io/sv4pt5/44_hires.png',
    artUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png',
  },
  {
    id: 'sv4pt5-36',
    dexNumber: 0,
    name: 'Nest Ball',
    subtitle: 'Paldean Fates Item Trainer ($0.40)',
    type: 'Colorless',
    hp: 0,
    rarity: 'Uncommon',
    pocketRarity: 'Diamond2',
    raritySymbol: '♢♢',
    rarityLabel: 'Trainer Item ($0.40)',
    setName: 'Scarlet & Violet: Paldean Fates',
    setNumber: '036/091',
    marketPrice: 0.4,
    artist: 'Toyste Beach',
    attacks: [{ name: 'Call Basic Pokemon', damage: 'Item', cost: [] }],
    weakness: 'None',
    retreatCost: 0,
    flavorText: 'Tìm một Pokemon cơ bản đặt thẳng lên hàng ghế dự bị Bench.',
    holographicType: 'none',
    cardColor: '#16a34a',
    accentColor: '#86efac',
    icon: '⚽',
    imageUrl: 'https://images.pokemontcg.io/sv4pt5/36_hires.png',
    artUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png',
  },
  // --- ♢ COMMONS (10 UNIQUE COMMONS) ---
  {
    id: 'sv4pt5-1',
    dexNumber: 204,
    name: 'Pineco',
    subtitle: 'Paldean Fates Common ($0.15)',
    type: 'Grass',
    hp: 70,
    rarity: 'Common',
    pocketRarity: 'Diamond1',
    raritySymbol: '♢',
    rarityLabel: 'Common ($0.15)',
    setName: 'Scarlet & Violet: Paldean Fates',
    setNumber: '001/091',
    marketPrice: 0.15,
    artist: 'Kouki Saitou',
    attacks: [{ name: 'Rollout', damage: '30', cost: ['Grass', 'Grass'] }],
    weakness: 'Fire',
    retreatCost: 2,
    flavorText: 'Pineco treo ngược trên cành cây ngụy trang thành quả thông.',
    holographicType: 'none',
    cardColor: '#15803d',
    accentColor: '#86efac',
    icon: '🍃',
    imageUrl: 'https://images.pokemontcg.io/sv4pt5/1_hires.png',
    artUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/204.png',
  },
  {
    id: 'sv4pt5-3',
    dexNumber: 556,
    name: 'Maractus',
    subtitle: 'Paldean Fates Common ($0.14)',
    type: 'Grass',
    hp: 100,
    rarity: 'Common',
    pocketRarity: 'Diamond1',
    raritySymbol: '♢',
    rarityLabel: 'Common ($0.14)',
    setName: 'Scarlet & Violet: Paldean Fates',
    setNumber: '003/091',
    marketPrice: 0.14,
    artist: 'Pani Kobayashi',
    attacks: [{ name: 'Peck', damage: '20', cost: ['Grass'] }],
    weakness: 'Fire',
    retreatCost: 2,
    flavorText: 'Khi nhảy múa vui vẻ, Maractus phát ra âm thanh như đàn maracas.',
    holographicType: 'none',
    cardColor: '#15803d',
    accentColor: '#86efac',
    icon: '🌵',
    imageUrl: 'https://images.pokemontcg.io/sv4pt5/3_hires.png',
    artUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/556.png',
  },
  {
    id: 'sv4pt5-9',
    dexNumber: 126,
    name: 'Magmar',
    subtitle: 'Paldean Fates Common ($0.25)',
    type: 'Fire',
    hp: 90,
    rarity: 'Common',
    pocketRarity: 'Diamond1',
    raritySymbol: '♢',
    rarityLabel: 'Common ($0.25)',
    setName: 'Scarlet & Violet: Paldean Fates',
    setNumber: '009/091',
    marketPrice: 0.25,
    artist: 'Pani Kobayashi',
    attacks: [{ name: 'Live Coal', damage: '20', cost: ['Fire'] }],
    weakness: 'Water',
    retreatCost: 2,
    flavorText: 'Cơ thể Magmar rực lửa cam như nham thạch núi lửa phun trào.',
    holographicType: 'none',
    cardColor: '#c2410c',
    accentColor: '#fdba74',
    icon: '🔥',
    imageUrl: 'https://images.pokemontcg.io/sv4pt5/9_hires.png',
    artUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/126.png',
  },
  {
    id: 'sv4pt5-19',
    dexNumber: 25,
    name: 'Pikachu',
    subtitle: 'Paldean Fates Common ($0.38)',
    type: 'Lightning',
    hp: 60,
    rarity: 'Common',
    pocketRarity: 'Diamond1',
    raritySymbol: '♢',
    rarityLabel: 'Common ($0.38)',
    setName: 'Scarlet & Violet: Paldean Fates',
    setNumber: '019/091',
    marketPrice: 0.38,
    artist: 'Yuu Nishida',
    attacks: [{ name: 'Quick Attack', damage: '20', cost: ['Lightning'] }],
    weakness: 'Fighting',
    retreatCost: 1,
    flavorText: 'Tích tụ điện trong hai túi má đỏ rực rỡ.',
    holographicType: 'none',
    cardColor: '#ca8a04',
    accentColor: '#fde047',
    icon: '⚡',
    imageUrl: 'https://images.pokemontcg.io/sv4pt5/19_hires.png',
    artUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png',
  },
  {
    id: 'sv4pt5-17',
    dexNumber: 4,
    name: 'Charmander',
    subtitle: 'Paldean Fates Common ($0.75)',
    type: 'Fire',
    hp: 70,
    rarity: 'Common',
    pocketRarity: 'Diamond1',
    raritySymbol: '♢',
    rarityLabel: 'Common ($0.75)',
    setName: 'Scarlet & Violet: Paldean Fates',
    setNumber: '017/091',
    marketPrice: 0.75,
    artist: 'Naoki Saito',
    attacks: [{ name: 'Scratch', damage: '10', cost: ['Colorless'] }],
    weakness: 'Water',
    retreatCost: 1,
    flavorText: 'Ngọn lửa trên đuôi Charmander thể hiện sức sống tràn trề.',
    holographicType: 'none',
    cardColor: '#c2410c',
    accentColor: '#fb923c',
    icon: '🔥',
    imageUrl: 'https://images.pokemontcg.io/sv4pt5/17_hires.png',
    artUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/4.png',
  },
  {
    id: 'sv4pt5-14',
    dexNumber: 935,
    name: 'Charcadet',
    subtitle: 'Paldean Fates Common ($0.20)',
    type: 'Fire',
    hp: 70,
    rarity: 'Common',
    pocketRarity: 'Diamond1',
    raritySymbol: '♢',
    rarityLabel: 'Common ($0.20)',
    setName: 'Scarlet & Violet: Paldean Fates',
    setNumber: '014/091',
    marketPrice: 0.2,
    artist: 'Souichirou Gunjima',
    attacks: [{ name: 'Ember', damage: '30', cost: ['Fire', 'Colorless'] }],
    weakness: 'Water',
    retreatCost: 1,
    flavorText: 'Than hồng nung nấu ý chí kiên định của tiểu chiến binh lửa.',
    holographicType: 'none',
    cardColor: '#991b1b',
    accentColor: '#ef4444',
    icon: '🔥',
    imageUrl: 'https://images.pokemontcg.io/sv4pt5/14_hires.png',
    artUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/935.png',
  },
  {
    id: 'sv4pt5-21',
    dexNumber: 170,
    name: 'Chinchou',
    subtitle: 'Paldean Fates Common ($0.15)',
    type: 'Lightning',
    hp: 60,
    rarity: 'Common',
    pocketRarity: 'Diamond1',
    raritySymbol: '♢',
    rarityLabel: 'Common ($0.15)',
    setName: 'Scarlet & Violet: Paldean Fates',
    setNumber: '021/091',
    marketPrice: 0.15,
    artist: 'Pani Kobayashi',
    attacks: [{ name: 'Tiny Charge', damage: '10', cost: ['Lightning'] }],
    weakness: 'Fighting',
    retreatCost: 1,
    flavorText: 'Hai xúc tu phát sáng soi rọi đáy biển sâu thẳm.',
    holographicType: 'none',
    cardColor: '#0284c7',
    accentColor: '#38bdf8',
    icon: '💡',
    imageUrl: 'https://images.pokemontcg.io/sv4pt5/21_hires.png',
    artUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/170.png',
  },
  {
    id: 'sv4pt5-22',
    dexNumber: 322,
    name: 'Numel',
    subtitle: 'Paldean Fates Common ($0.15)',
    type: 'Fire',
    hp: 80,
    rarity: 'Common',
    pocketRarity: 'Diamond1',
    raritySymbol: '♢',
    rarityLabel: 'Common ($0.15)',
    setName: 'Scarlet & Violet: Paldean Fates',
    setNumber: '022/091',
    marketPrice: 0.15,
    artist: 'Scav',
    attacks: [{ name: 'Tackle', damage: '20', cost: ['Colorless'] }],
    weakness: 'Water',
    retreatCost: 2,
    flavorText: 'Lưng chứa magma nóng chảy sôi sục không ngừng.',
    holographicType: 'none',
    cardColor: '#c2410c',
    accentColor: '#fb923c',
    icon: '🌋',
    imageUrl: 'https://images.pokemontcg.io/sv4pt5/22_hires.png',
    artUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/322.png',
  },
  {
    id: 'sv4pt5-38',
    dexNumber: 0,
    name: 'Paldean Student',
    subtitle: 'Paldean Fates Supporter ($0.20)',
    type: 'Colorless',
    hp: 0,
    rarity: 'Common',
    pocketRarity: 'Diamond1',
    raritySymbol: '♢',
    rarityLabel: 'Supporter ($0.20)',
    setName: 'Scarlet & Violet: Paldean Fates',
    setNumber: '038/091',
    marketPrice: 0.2,
    artist: 'Hideki Ishikawa',
    attacks: [{ name: 'Study Session', damage: 'Draw 3', cost: [] }],
    weakness: 'None',
    retreatCost: 0,
    flavorText: 'Học sinh học viện Uva/Naranja năng động khám phá kho báu vùng Paldea.',
    holographicType: 'none',
    cardColor: '#3b82f6',
    accentColor: '#93c5fd',
    icon: '🎓',
    imageUrl: 'https://images.pokemontcg.io/sv4pt5/38_hires.png',
    artUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png',
  },
  {
    id: 'sv4pt5-33',
    dexNumber: 915,
    name: 'Lechonk',
    subtitle: 'Paldean Fates Common ($0.18)',
    type: 'Colorless',
    hp: 60,
    rarity: 'Common',
    pocketRarity: 'Diamond1',
    raritySymbol: '♢',
    rarityLabel: 'Common ($0.18)',
    setName: 'Scarlet & Violet: Paldean Fates',
    setNumber: '033/091',
    marketPrice: 0.18,
    artist: 'Miki Tanaka',
    attacks: [{ name: 'Mud Slap', damage: '20', cost: ['Colorless'] }],
    weakness: 'Fighting',
    retreatCost: 1,
    flavorText: 'Chú heo tròn trịa mê mẩn đào tìm những quả mọng thơm ngon.',
    holographicType: 'none',
    cardColor: '#71717a',
    accentColor: '#a1a1aa',
    icon: '🐷',
    imageUrl: 'https://images.pokemontcg.io/sv4pt5/33_hires.png',
    artUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/915.png',
  },
];

export const POKEMON_CARDS_DB: PokemonCard[] = (() => {
  const map = new Map<string, PokemonCard>();
  for (const c of CURATED_GRAIL_CARDS) {
    map.set(c.id, c);
  }
  for (const c of ALL_SETS_POKEMON_CARDS) {
    map.set(c.id, c);
  }
  for (const c of PALDEAN_FATES_CARDS) {
    map.set(c.id, c);
  }
  for (const c of EXPANDED_POKEMON_CARDS as unknown as PokemonCard[]) {
    if (!map.has(c.id)) {
      map.set(c.id, c);
    }
  }
  return Array.from(map.values());
})();

// ==========================================
// 3. PACK GENERATOR / RIP SIMULATOR (10 Cards per Pack + God Pack 0.05%)
// ==========================================

export interface PackRipResult {
  cards: PokemonCard[];
  isGodPack: boolean;
  setId: string;
  hasMangaRare?: boolean;
  specialEventTitle?: string;
  mangaRareCard?: PokemonCard;
}

export interface BoxRipResult {
  packs: PackRipResult[];
  totalCards: number;
  totalMarketValue: number;
  hitCards: PokemonCard[]; // Star1, Star2, Star3, Crown, Diamond4
  godPackCount: number;
  setId: string;
  hasMangaHit?: boolean;
  mangaHits?: PokemonCard[];
  boxEventTitle?: string;
  guaranteedSecretHit?: PokemonCard;
}

export function ripBoosterPack(setId: string = 'paldeanFates'): PokemonCard[] {
  const result = ripBoosterPackWithMetadata(setId);
  return result.cards;
}

export function ripBoosterPackWithMetadata(setId: string = 'paldeanFates'): PackRipResult {
  if (isOnePieceSetId(setId)) {
    return ripOnePieceBoosterPack(setId);
  }
  // STRICT AUTHENTIC SEPARATION: Pull cards strictly and exclusively belonging to this expansion
  const availableSetCards = getBoosterSetCards(setId);

  const isPikachu30th = (c: PokemonCard) =>
    c.raritySymbol === '⚡30TH' || c.rarityLabel.startsWith('Pikachu 30th');

  // Pool 30 lá Pikachu 30th riêng cho slot cuối cùng (tấm #10) của pack/box 30th
  const pikachu30thPool = availableSetCards.filter(isPikachu30th);
  const is30thSet = setId === 'pokemon30thCommon' && pikachu30thPool.length > 0;

  // Group cards by TCG Pocket Rarity (tách Pikachu 30th khỏi pool Star1 thường để giữ độc quyền ở lá cuối)
  const d1Commons = availableSetCards.filter((c) => c.pocketRarity === 'Diamond1');
  const d2Uncommons = availableSetCards.filter((c) => c.pocketRarity === 'Diamond2');
  const d3Rares = availableSetCards.filter((c) => c.pocketRarity === 'Diamond3');
  const d4Ex = availableSetCards.filter((c) => c.pocketRarity === 'Diamond4');
  const s1Illustration = availableSetCards.filter((c) => c.pocketRarity === 'Star1' && !isPikachu30th(c));
  const s2FullArt = availableSetCards.filter((c) => c.pocketRarity === 'Star2');
  const s3Immersive = availableSetCards.filter((c) => c.pocketRarity === 'Star3');
  const crownRares = availableSetCards.filter((c) => c.pocketRarity === 'Crown');

  // Ultra-rare pool for God Pack (from Star1 up to Crown, excl. Pikachu 30th slot-10 exclusives)
  const ultraRares = availableSetCards.filter(
    (c) =>
      !isPikachu30th(c) &&
      (c.pocketRarity === 'Star1' ||
        c.pocketRarity === 'Star2' ||
        c.pocketRarity === 'Star3' ||
        c.pocketRarity === 'Crown')
  );

  // --- GOD PACK (Gói Thần Thánh) CHECK: 0.05% (1/2000 packs) ---
  const isGodPack = Math.random() < 0.0005;

  if (isGodPack && ultraRares.length > 0) {
    const godCards: PokemonCard[] = [];
    const usedGodIds = new Set<string>();
    const godLoopCount = is30thSet ? 9 : 10;
    for (let i = 0; i < godLoopCount; i++) {
      const avail = ultraRares.filter((c) => !usedGodIds.has(c.id));
      const pick =
        avail.length > 0
          ? avail[Math.floor(Math.random() * avail.length)]
          : ultraRares[Math.floor(Math.random() * ultraRares.length)];
      if (pick) {
        usedGodIds.add(pick.id);
        godCards.push(pick);
      }
    }
    if (is30thSet) {
      const finalPika = pikachu30thPool[Math.floor(Math.random() * pikachu30thPool.length)];
      if (finalPika) godCards.push(finalPika);
    }
    if (godCards.length === 10) {
      return {
        cards: godCards,
        isGodPack: true,
        setId,
      };
    }
  }

  // --- REGULAR 10-CARD PACK PULL LOGIC (WITH STRICT IN-PACK DUPLICATE PROTECTION) ---
  const pickedIds = new Set<string>();
  const picked: PokemonCard[] = [];

  // Helper unique random picker: NEVER leaks Common/Uncommon slots into Ultra Rare/Crown tiers!
  const pickUnique = (pool: PokemonCard[], fallback: PokemonCard[] = d1Commons): PokemonCard => {
    if (pool && pool.length > 0) {
      const availPool = pool.filter((c) => c && !pickedIds.has(c.id));
      if (availPool.length > 0) {
        const chosen = availPool[Math.floor(Math.random() * availPool.length)];
        if (chosen) {
          pickedIds.add(chosen.id);
          return chosen;
        }
      }
    }
    if (fallback && fallback.length > 0) {
      const availFallback = fallback.filter((c) => c && !pickedIds.has(c.id));
      if (availFallback.length > 0) {
        const chosen = availFallback[Math.floor(Math.random() * availFallback.length)];
        if (chosen) {
          pickedIds.add(chosen.id);
          return chosen;
        }
      }
      // Allow repeating a card from the safe fallback pool before ever escalating to higher rarity
      const repeatSafe = fallback[Math.floor(Math.random() * fallback.length)];
      if (repeatSafe) return repeatSafe;
    }
    const lowTierPool = [...d1Commons, ...d2Uncommons, ...d3Rares];
    if (lowTierPool.length > 0) {
      const availLow = lowTierPool.filter((c) => c && !pickedIds.has(c.id));
      const chosen = (availLow.length > 0 ? availLow : lowTierPool)[
        Math.floor(Math.random() * (availLow.length > 0 ? availLow.length : lowTierPool.length))
      ];
      if (chosen) {
        pickedIds.add(chosen.id);
        return chosen;
      }
    }
    const anyCard =
      (availableSetCards.length > 0
        ? availableSetCards[Math.floor(Math.random() * availableSetCards.length)]
        : POKEMON_CARDS_DB[0]) || POKEMON_CARDS_DB[0];
    if (anyCard) pickedIds.add(anyCard.id);
    return anyCard;
  };

  // Cards 1 through 7: 7 UNIQUE Commons (♢ 1 Kim Cương) - strictly from Common/Uncommon pools
  for (let i = 0; i < 7; i++) {
    picked.push(pickUnique(d1Commons, d2Uncommons));
  }

  // Card 8: Common / Uncommon (75% Common ♢, 25% Uncommon ♢♢)
  if (Math.random() < 0.25 && d2Uncommons.length > 0) {
    picked.push(pickUnique(d2Uncommons, d1Commons));
  } else {
    picked.push(pickUnique(d1Commons, d2Uncommons));
  }

  if (is30thSet) {
    // --- ĐẶC QUYỀN PACK & BOX 30TH ANNIVERSARY ---
    // Lá kế cuối (Card #9): Thường là thẻ hiếm hoặc mắc tiền (ưu tiên các thẻ Star1/2/3, EX, Classic Collection, Crown giá trị cao)
    const normalCrowns = crownRares.filter((c) => c.marketPrice < 1000);
    const expensiveD4 = d4Ex.filter((c) => c.marketPrice >= 1.5);
    const expensiveRares = d3Rares.filter((c) => c.marketPrice >= 1.5);
    const roll30thPenultimate = Math.random();

    if (roll30thPenultimate < 0.006 && crownRares.length > 0) {
      // 0.6% Crown (90% Crown thường < $1000, 10% Mega Grail >= $1000 như R/G/B Mew $3,161-$4,492)
      const useNormalCrown = normalCrowns.length > 0 && Math.random() < 0.9;
      picked.push(pickUnique(useNormalCrown ? normalCrowns : crownRares, s3Immersive));
    } else if (roll30thPenultimate < 0.04 && s3Immersive.length > 0) {
      // 3.4% Star3 (☆☆☆ Immersive / SIR / Futuristic Rare)
      picked.push(pickUnique(s3Immersive, s2FullArt));
    } else if (roll30thPenultimate < 0.14 && s2FullArt.length > 0) {
      // 10.0% Star2 (☆☆ Full Art / Ultra Rare)
      picked.push(pickUnique(s2FullArt, s1Illustration));
    } else if (roll30thPenultimate < 0.42 && s1Illustration.length > 0) {
      // 28.0% Star1 (☆ Illustration Rare / Classic Collection)
      picked.push(pickUnique(s1Illustration, d4Ex));
    } else if (roll30thPenultimate < 0.8 && d4Ex.length > 0) {
      // 38.0% Diamond4 (ưu tiên EX / Classic Hits mắc tiền)
      const exPool = expensiveD4.length > 0 && Math.random() < 0.85 ? expensiveD4 : d4Ex;
      picked.push(pickUnique(exPool, d3Rares));
    } else {
      // 20.0% Diamond3 (ưu tiên Rare mắc tiền, fallback lên EX nếu cần)
      const rarePool = expensiveRares.length > 0 && Math.random() < 0.8 ? expensiveRares : d3Rares;
      picked.push(pickUnique(rarePool.length > 0 ? rarePool : d4Ex, d4Ex));
    }

    // Lá cuối cùng (Card #10): LUÔN LÀ 1 TRONG 30 LÁ PIKACHU 30TH ANNIVERSARY!
    picked.push(pickUnique(pikachu30thPool, s1Illustration));
  } else {
    // Card 9: Slot cận áp chót (35% Common ♢, 58% Uncommon ♢♢, 6.5% Rare ♢♢♢, 0.5% Double Rare ♢♢♢♢)
    const roll9 = Math.random();
    if (roll9 < 0.005 && d4Ex.length > 0) {
      picked.push(pickUnique(d4Ex, d3Rares));
    } else if (roll9 < 0.07 && d3Rares.length > 0) {
      picked.push(pickUnique(d3Rares, d2Uncommons));
    } else if (roll9 < 0.65 && d2Uncommons.length > 0) {
      picked.push(pickUnique(d2Uncommons, d1Commons));
    } else {
      picked.push(pickUnique(d1Commons, d2Uncommons));
    }

    // Card 10: HIT SLOT! (Tỷ lệ thực tế: ~79.4% Uncommon, 16% Rare, 2.5% EX/Holo, 1.5% 1-Star, 0.35% 2-Star, 0.15% 3-Star, 0.08% Crown)
    const hitRoll = Math.random();
    if (hitRoll < 0.0008 && crownRares.length > 0) {
      picked.push(pickUnique(crownRares, s3Immersive));
    } else if (hitRoll < 0.0023 && s3Immersive.length > 0) {
      picked.push(pickUnique(s3Immersive, s2FullArt));
    } else if (hitRoll < 0.0058 && s2FullArt.length > 0) {
      picked.push(pickUnique(s2FullArt, s1Illustration));
    } else if (hitRoll < 0.0208 && s1Illustration.length > 0) {
      picked.push(pickUnique(s1Illustration, d4Ex));
    } else if (hitRoll < 0.0458 && d4Ex.length > 0) {
      picked.push(pickUnique(d4Ex, d3Rares));
    } else if (hitRoll < 0.2058 && d3Rares.length > 0) {
      picked.push(pickUnique(d3Rares, d2Uncommons));
    } else if (d2Uncommons.length > 0) {
      picked.push(pickUnique(d2Uncommons, d1Commons));
    } else {
      picked.push(pickUnique(d1Commons, d2Uncommons));
    }
  }

  return {
    cards: picked,
    isGodPack: false,
    setId,
  };
}

/**
 * Rips an entire Booster Box or Collector UPC/SPC Box
 * Incorporates authentic box events:
 * - One Piece TCG: Guaranteed 1+ AA/SEC hit per box + ~4.5% Manga Rare Case Hit
 * - Pokémon TCG: 30th Anniversary Pikachu guarantees and SIR/Crown hit seeding
 * Returns all individual packs, total hit cards, total market value, god packs, and event titles.
 */
export function ripBoosterBoxWithMetadata(setId: string = 'paldeanFates'): BoxRipResult {
  const packs: PackRipResult[] = [];
  const hitCards: PokemonCard[] = [];
  let totalMarketValue = 0;
  let godPackCount = 0;

  const setMeta = getBoosterSet(setId);
  const packCount = setMeta?.packsPerBox || 10;
  const isOP = isOnePieceSetId(setId);

  // Check for Case Hit / Manga Rare Event for One Piece Boxes (~4.5% chance)
  const isMangaBoxCaseHit = isOP && Math.random() < 0.045;
  const mangaTargetPackIndex = isMangaBoxCaseHit ? Math.floor(Math.random() * packCount) : -1;

  for (let i = 0; i < packCount; i++) {
    // If this pack is designated as the Manga Case Hit, pass guarantee to ripOnePieceBoosterPack
    const isSpecialMangaPack = isMangaBoxCaseHit && i === mangaTargetPackIndex;
    const packResult = isSpecialMangaPack
      ? ripOnePieceBoosterPack(setId, 'Crown')
      : ripBoosterPackWithMetadata(setId);

    packs.push(packResult);
    if (packResult.isGodPack) godPackCount++;

    packResult.cards.forEach((card) => {
      if (!card) return;
      totalMarketValue += card.marketPrice || 0;
      if (
        card.isManga ||
        card.pocketRarity === 'Star1' ||
        card.pocketRarity === 'Star2' ||
        card.pocketRarity === 'Star3' ||
        card.pocketRarity === 'Crown' ||
        card.pocketRarity === 'Diamond4'
      ) {
        hitCards.push(card);
      }
    });
  }

  // --- AUTHENTIC BOX HIT GUARANTEE (BẢO HIỂM NHÀ MÁY) ---
  // In One Piece TCG, every factory sealed booster box is guaranteed at least 1 Alternate Art (AA), Secret Rare (SEC), or Manga Rare!
  let guaranteedSecretHit: PokemonCard | undefined;
  if (isOP) {
    const hasUltraSecretHit = hitCards.some(
      (c) => c.isManga || c.pocketRarity === 'Star1' || c.pocketRarity === 'Star2' || c.pocketRarity === 'Star3' || c.pocketRarity === 'Crown'
    );
    if (!hasUltraSecretHit && packs.length > 0) {
      // Seed a guaranteed Alternate Art / Secret Rare in the final third of the box (pack #packCount - 3)
      const targetPackIdx = Math.max(0, packCount - 3);
      const guaranteedPack = ripOnePieceBoosterPack(setId, 'Star1');
      if (guaranteedPack.cards.length > 0) {
        // Replace target pack
        packs[targetPackIdx] = guaranteedPack;
        const secretCard = guaranteedPack.cards.find(
          (c) => c.pocketRarity === 'Star1' || c.pocketRarity === 'Star2' || c.pocketRarity === 'Star3' || c.pocketRarity === 'Crown'
        ) || guaranteedPack.cards[guaranteedPack.cards.length - 1];
        if (secretCard) {
          guaranteedSecretHit = secretCard;
          hitCards.push(secretCard);
          totalMarketValue += secretCard.marketPrice || 0;
        }
      }
    }
  }

  const mangaHits = hitCards.filter((c) => c.isManga || c.pocketRarity === 'Star3' || c.pocketRarity === 'Crown');
  const hasMangaHit = mangaHits.length > 0;

  let boxEventTitle: string | undefined;
  if (hasMangaHit) {
    boxEventTitle = `👑 HỘP BẢO VẬT VUA HẢI TẶC: ĐÃ KÍCH HOẠT HIT MANGA RARE TRUYỀN THUYẾT (${mangaHits[0]?.name})!`;
  } else if (guaranteedSecretHit) {
    boxEventTitle = `⚔️ SỰ KIỆN HỘP: BẢO HIỂM NHÀ MÁY CAM KẾT HIT ALTERNATE ART (AA) / SECRET RARE!`;
  } else if (isOP) {
    boxEventTitle = `🏴‍☠️ HỘP BOOSTER ONE PIECE: ĐẠI CHIẾN ĐẠI HẢI TRÌNH (${setMeta.name})`;
  } else if (setId === 'pokemon30thCommon') {
    boxEventTitle = `⚡ HỘP KỶ NIỆM 30TH POKÉMON: CAM KẾT HIT PIKACHU 30TH & SIÊU THẺ SIR!`;
  }

  const totalCalculatedCards = packs.reduce((acc, p) => acc + (p.cards?.length || 0), 0);

  return {
    packs,
    totalCards: totalCalculatedCards,
    totalMarketValue: Math.round(totalMarketValue * 100) / 100,
    hitCards,
    godPackCount,
    setId,
    hasMangaHit,
    mangaHits,
    boxEventTitle,
    guaranteedSecretHit,
  };
}

// ==========================================
// 4. LEVEL PROGRESSION & UNLOCK CHECKER
// ==========================================
export function getUnlockedSetsForLevel(level: number): string[] {
  const pokeIds = ALL_UNIQUE_BOOSTER_SETS
    .filter((set) => set.unlockLevel <= level)
    .map((set) => set.id);
  const opIds = ALL_ONEPIECE_BOOSTER_SETS
    .filter((set) => set.unlockLevel <= level)
    .map((set) => set.id);
  return Array.from(new Set([...pokeIds, ...opIds]));
}

// ==========================================
// 5. SHOP MANAGEMENT & INITIAL STATE
// ==========================================
export function createInitialShopState(): ShopState {
  return {
    shopName: 'PokeVault 3D TCG Store',
    storeLevel: 1,
    storeExp: 0,
    storeExpToNext: 100, // Level 1 -> 2 cần 100 XP
    cash: 2500.0, // Starting seed capital for restocking orders
    totalRevenue: 0,
    packsOpenedCount: 0,
    customersServedCount: 0,
    reputation: 85,
    unlockedSets: ['pokemon30thCommon', 'op10RoyalBlood', 'op01RomanceDawn'], // Starters Lv1: 1F Pokémon + 2F One Piece
    purchasedLicenses: [
      'lic_30th_pack',
      'pokemon30thCommon_pack',
      'lic_op10_pack',
      'op10RoyalBlood_pack',
      'lic_op01_pack',
      'op01RomanceDawn_pack',
    ], // Level 1 license miễn phí $0
    unlockedShelves: [...STARTER_UNLOCKED_SHELVES], // Level 1 mở 1 khoang kệ Expansion + 1 kệ thẻ tường sau mỗi tầng
    binderCards: {},
    inventory: [
      // Level 1 One Piece Starter (Box Rẻ Nhất Tầng 2): Pack & Box OP-10
      {
        id: 'inv_pack_op10',
        productId: 'op10RoyalBlood_pack',
        name: 'Pack OP-10: The Royal Blood (10 Thẻ)',
        type: 'pack',
        setName: 'OP-10: The Royal Blood',
        wholesaleCost: 1.8,
        retailPrice: 3.5,
        quantity: 0,
        shelvedQuantity: 0,
      },
      {
        id: 'inv_box_op10',
        productId: 'op10RoyalBlood_box',
        name: 'Booster Box OP-10: The Royal Blood (9 Packs)',
        type: 'box',
        setName: 'OP-10: The Royal Blood',
        wholesaleCost: 16.2,
        retailPrice: 31.5,
        quantity: 0,
        shelvedQuantity: 0,
      },
      // Level 1: Pack 30th Common (Cost: $2.50, Price: $4.50)
      {
        id: 'inv_pack_30th',
        productId: 'pokemon30thCommon_pack',
        name: 'Pack 30th Common (10 Thẻ)',
        type: 'pack',
        setName: '30th Anniversary (Common Set)',
        wholesaleCost: 2.5,
        retailPrice: 4.5,
        quantity: 0,
        shelvedQuantity: 0,
      },
      // Level 2: Box 30th Common (Cost: $22.50, Price: $41.00)
      {
        id: 'inv_box_30th',
        productId: 'pokemon30thCommon_box',
        name: 'Booster Box 30th Common (9 Packs)',
        type: 'box',
        setName: '30th Anniversary (Common Set)',
        wholesaleCost: 22.5,
        retailPrice: 41.0,
        quantity: 0,
        shelvedQuantity: 0,
      },
      // Level 3: Pack Scarlet & Violet Paldean Fates (Cost: $4.80, Price: $9.00)
      {
        id: 'inv_pack_paldean',
        productId: 'paldeanFates_pack',
        name: 'Pack Scarlet & Violet: Paldean Fates (10 Thẻ)',
        type: 'pack',
        setName: 'Scarlet & Violet: Paldean Fates',
        wholesaleCost: 4.8,
        retailPrice: 9.0,
        quantity: 0,
        shelvedQuantity: 0,
      },
      // Level 4: Box Scarlet & Violet Paldean Fates (Cost: $43.20, Price: $81.00)
      {
        id: 'inv_box_paldean',
        productId: 'paldeanFates_box',
        name: 'Booster Box Scarlet & Violet: Paldean Fates (9 Packs)',
        type: 'box',
        setName: 'Scarlet & Violet: Paldean Fates',
        wholesaleCost: 43.2,
        retailPrice: 81.0,
        quantity: 0,
        shelvedQuantity: 0,
      },
      // Level 5: Pack Cosmic Eclipse (Cost: $5.00, Price: $9.50)
      {
        id: 'inv_pack_cosmic',
        productId: 'cosmicEclipse_pack',
        name: 'Pack Cosmic Eclipse (10 Thẻ)',
        type: 'pack',
        setName: 'Sun & Moon: Cosmic Eclipse',
        wholesaleCost: 5.0,
        retailPrice: 9.5,
        quantity: 0,
        shelvedQuantity: 0,
      },
      // Level 5: Box Cosmic Eclipse (Cost: $45.00, Price: $86.00)
      {
        id: 'inv_box_cosmic',
        productId: 'cosmicEclipse_box',
        name: 'Booster Box Cosmic Eclipse (9 Packs)',
        type: 'box',
        setName: 'Sun & Moon: Cosmic Eclipse',
        wholesaleCost: 45.0,
        retailPrice: 86.0,
        quantity: 0,
        shelvedQuantity: 0,
      },
      // Level 6: Pack Destined Rivals (Cost: $5.20, Price: $9.80)
      {
        id: 'inv_pack_destined',
        productId: 'deltaReign_pack',
        name: 'Pack Destined Rivals (10 Thẻ)',
        type: 'pack',
        setName: 'Destined Rivals',
        wholesaleCost: 5.2,
        retailPrice: 9.8,
        quantity: 0,
        shelvedQuantity: 0,
      },
      // Level 6: Box Destined Rivals (Cost: $46.80, Price: $88.00)
      {
        id: 'inv_box_destined',
        productId: 'deltaReign_box',
        name: 'Booster Box Destined Rivals (9 Packs)',
        type: 'box',
        setName: 'Destined Rivals',
        wholesaleCost: 46.8,
        retailPrice: 88.0,
        quantity: 0,
        shelvedQuantity: 0,
      },
      // Level 7: Pack Perfect Order (Cost: $5.30, Price: $10.00)
      {
        id: 'inv_pack_perfect',
        productId: 'perfectOrder_pack',
        name: 'Pack Perfect Order (10 Thẻ)',
        type: 'pack',
        setName: 'Perfect Order',
        wholesaleCost: 5.3,
        retailPrice: 10.0,
        quantity: 0,
        shelvedQuantity: 0,
      },
      // Level 7: Box Perfect Order (Cost: $47.70, Price: $90.00)
      {
        id: 'inv_box_perfect',
        productId: 'perfectOrder_box',
        name: 'Booster Box Perfect Order (9 Packs)',
        type: 'box',
        setName: 'Perfect Order',
        wholesaleCost: 47.7,
        retailPrice: 90.0,
        quantity: 0,
        shelvedQuantity: 0,
      },
      // Level 8: Pack Evolving Skies (Cost: $5.50, Price: $10.50)
      {
        id: 'inv_pack_evolving',
        productId: 'evolvingSkies_pack',
        name: 'Pack Evolving Skies (10 Thẻ)',
        type: 'pack',
        setName: 'Sword & Shield: Evolving Skies',
        wholesaleCost: 5.5,
        retailPrice: 10.5,
        quantity: 0,
        shelvedQuantity: 0,
      },
      // Level 8: Box Evolving Skies (Cost: $49.50, Price: $95.00)
      {
        id: 'inv_box_evolving',
        productId: 'evolvingSkies_box',
        name: 'Booster Box Evolving Skies (9 Packs)',
        type: 'box',
        setName: 'Sword & Shield: Evolving Skies',
        wholesaleCost: 49.5,
        retailPrice: 95.0,
        quantity: 0,
        shelvedQuantity: 0,
      },
      // Level 9: Pack Ascended Heroes (Cost: $6.30, Price: $12.00)
      {
        id: 'inv_pack_prismatic',
        productId: 'prismaticEvolutions_pack',
        name: 'Pack Ascended Heroes (10 Thẻ)',
        type: 'pack',
        setName: 'Ascended Heroes',
        wholesaleCost: 6.3,
        retailPrice: 12.0,
        quantity: 0,
        shelvedQuantity: 0,
      },
      // Level 9: Box Ascended Heroes (Cost: $56.70, Price: $108.00)
      {
        id: 'inv_box_prismatic',
        productId: 'prismaticEvolutions_box',
        name: 'Booster Box Ascended Heroes (9 Packs)',
        type: 'box',
        setName: 'Ascended Heroes',
        wholesaleCost: 56.7,
        retailPrice: 108.0,
        quantity: 0,
        shelvedQuantity: 0,
      },
      // Level 10: Pack Base Set Vintage (Cost: $50.00, Price: $95.00)
      {
        id: 'inv_pack_vintage',
        productId: 'pokemonRedVintage_pack',
        name: 'Pack Base Set Vintage (10 Thẻ)',
        type: 'pack',
        setName: 'Base Set Vintage (Red Version)',
        wholesaleCost: 50.0,
        retailPrice: 95.0,
        quantity: 0,
        shelvedQuantity: 0,
      },
      // Level 10: Box Base Set Vintage (Cost: $450.00, Price: $855.00)
      {
        id: 'inv_box_vintage',
        productId: 'pokemonRedVintage_box',
        name: 'Booster Box Red Vintage (9 Packs)',
        type: 'box',
        setName: 'Base Set Vintage (Red Version)',
        wholesaleCost: 450.0,
        retailPrice: 855.0,
        quantity: 0,
        shelvedQuantity: 0,
      },
      // VIP Left-Wall Collector Boxes (Mở khóa từ Cấp 10+ · Siêu Lợi Nhuận)
      {
        id: 'inv_col_30th_night_upc',
        productId: 'collector_30th_night_upc_box',
        name: '30th Celebration Night Ultra Premium Collection (20 Packs)',
        type: 'box',
        setName: 'Pokémon 30th Anniversary (Celebration Night UPC)',
        wholesaleCost: 450.0,
        retailPrice: 1000.0,
        quantity: 0,
        shelvedQuantity: 0,
      },
      {
        id: 'inv_col_sv151_upc',
        productId: 'collector_sv151_upc_box',
        name: 'Scarlet & Violet: 151 Ultra-Premium Collection (16 Packs)',
        type: 'box',
        setName: 'Scarlet & Violet 151 (UPC)',
        wholesaleCost: 380.0,
        retailPrice: 850.0,
        quantity: 0,
        shelvedQuantity: 0,
      },
      {
        id: 'inv_col_prismatic_spc',
        productId: 'collector_prismatic_spc_box',
        name: 'Prismatic Evolutions Super-Premium Collection (15 Packs)',
        type: 'box',
        setName: 'Scarlet & Violet: Prismatic Evolutions (SPC)',
        wholesaleCost: 110.0,
        retailPrice: 270.0,
        quantity: 0,
        shelvedQuantity: 0,
      },
      {
        id: 'inv_col_25th_upc',
        productId: 'collector_25th_upc_box',
        name: '25th Celebrations Ultra-Premium Collection Box (25 Packs)',
        type: 'box',
        setName: 'Pokémon 25th Anniversary Celebrations (UPC)',
        wholesaleCost: 500.0,
        retailPrice: 1250.0,
        quantity: 0,
        shelvedQuantity: 0,
      },
      // GameStop Pokémon Mystery Boxes (Mở khóa từ Cấp 10+)
      {
        id: 'inv_gs_mystery_gold',
        productId: 'gamestop_mystery_gold_box',
        name: 'GameStop Mystery Power Box (Gold Edition)',
        type: 'box',
        setName: 'GameStop Exclusive (Gold Edition)',
        wholesaleCost: 75.0,
        retailPrice: 130.0,
        quantity: 0,
        shelvedQuantity: 0,
      },
      {
        id: 'inv_gs_mystery_charizard',
        productId: 'gamestop_mystery_charizard_box',
        name: 'GameStop Collector Mystery Chest (Charizard)',
        type: 'box',
        setName: 'GameStop Exclusive (Charizard Edition)',
        wholesaleCost: 90.0,
        retailPrice: 165.0,
        quantity: 0,
        shelvedQuantity: 0,
      },
      {
        id: 'inv_gs_mystery_black',
        productId: 'gamestop_mystery_black_box',
        name: 'GameStop Ultra Mystery Vault (Black Diamond)',
        type: 'box',
        setName: 'GameStop Exclusive (Black Vault)',
        wholesaleCost: 120.0,
        retailPrice: 230.0,
        quantity: 0,
        shelvedQuantity: 0,
      },
      // Pokémon Mystery Packs (8 Tiers - Mở khóa từ Cấp 10+)
      ...Object.values(GACHA_PACK_TIERS).map((tier) => ({
        id: `inv_gacha_${tier.id}`,
        productId: `gacha_${tier.id}`,
        name: `Mystery Pack: ${tier.name}`,
        type: 'pack' as const,
        setName: 'Pokémon Mystery Pack Gondola',
        wholesaleCost: Math.round(tier.price * 0.6 * 100) / 100, // 40% margin
        retailPrice: tier.price,
        quantity: 0,
        shelvedQuantity: 0,
      })),
      // === FLOOR 2: ONE PIECE CARD GAME INVENTORY ===
      ...ALL_ONEPIECE_BOOSTER_SETS.flatMap((opSet) => [
        {
          id: `inv_pack_${opSet.id}`,
          productId: `${opSet.id}_pack`,
          name: `Pack ${opSet.name} (10 Thẻ)`,
          type: 'pack' as const,
          setName: opSet.name,
          wholesaleCost: opSet.packWholesalePrice,
          retailPrice: opSet.packRetailPrice,
          quantity: 0,
          shelvedQuantity: 0,
          imageUrl: opSet.packImageUrl,
          themeColor: opSet.themeColor,
        },
        {
          id: `inv_box_${opSet.id}`,
          productId: `${opSet.id}_box`,
          name: `Booster Box ${opSet.name} (${opSet.packsPerBox} Packs)`,
          type: 'box' as const,
          setName: opSet.name,
          wholesaleCost: opSet.boxWholesalePrice,
          retailPrice: opSet.boxRetailPrice,
          quantity: 0,
          shelvedQuantity: 0,
          imageUrl: opSet.boxImageUrl,
          themeColor: opSet.themeColor,
        },
      ]),
      ...ALL_ONEPIECE_COLLECTOR_BOXES.map((opCol) => ({
        id: `inv_${opCol.id}`,
        productId: `${opCol.id}_box`,
        name: `${opCol.name} (${opCol.packsPerBox} Packs)`,
        type: 'box' as const,
        setName: opCol.series,
        wholesaleCost: opCol.boxWholesalePrice,
        retailPrice: opCol.boxRetailPrice,
        quantity: 0,
        shelvedQuantity: 0,
        imageUrl: opCol.boxImageUrl,
        themeColor: opCol.themeColor,
      })),
      ...ALL_ONEPIECE_BOUNTY_SETS.map((opBounty) => ({
        id: `inv_${opBounty.id}`,
        productId: `${opBounty.id}_box`,
        name: opBounty.name,
        type: 'box' as const,
        setName: opBounty.series,
        wholesaleCost: opBounty.boxWholesalePrice,
        retailPrice: opBounty.boxRetailPrice,
        quantity: 0,
        shelvedQuantity: 0,
        imageUrl: opBounty.boxImageUrl,
        themeColor: opBounty.themeColor,
      })),
      ...Object.values(OP_GACHA_PACK_TIERS).map((tier) => ({
        id: `inv_gacha_${tier.id}`,
        productId: `gacha_${tier.id}`,
        name: `Devil Fruit: ${tier.name}`,
        type: 'pack' as const,
        setName: 'Devil Fruit Mystery Gondola (2F)',
        wholesaleCost: Math.round(tier.price * 0.6 * 100) / 100,
        retailPrice: tier.price,
        quantity: 0,
        shelvedQuantity: 0,
        imageUrl: tier.imageUrl,
        themeColor: tier.themeColor,
      })),
    ],
    showcaseCards: [],
    shelfCards: [],
    opShowcaseCards: [],
    opShelfCards: [],
    tableRentalPricePerHour: 5.0,
    tablePlayersCount: 0,
    totalTableRentalEarnings: 0,
    hiredStaff: {
      cashier: 0,
      restocker: 0,
      officeStaff: 0,
      liveStreamer: 0,
      gradingReceptionist: 0,
      gradingSpecialists: 0,
      auctioneer: 0,
      auctionHost: 0,
    },
    liveStudioUnlocked: false,
    gradingJobs: [],
    gradedSlabs: [],
    customerGradingOrders: [],
    gradingPopReport: {},
    gradingLabStats: {
      totalGraded: 0,
      psaCount: 0,
      cgcCount: 0,
      bgsCount: 0,
      grade10Count: 0,
      pristine10Count: 0,
      blackLabelCount: 0,
      totalFeesSpent: 0,
      totalSlabValueCreated: 0,
      customerOrdersCompleted: 0,
      customerServiceProfit: 0,
      auctionsCompleted: 0,
      auctionProfit: 0,
      consignmentCommissionEarned: 0,
      consignmentLotsCompleted: 0,
      buybackSnipes: 0,
    },
    slabAuctions: [],
    auctionConsignmentOffers: [],
    auctionHistory: [],
    buybackOffers: [],
    vipSlabOrders: [],
    activeMarketTrend: DAILY_MARKET_TRENDS[0],
    dailySalesHistory: [],
    currentDay: 1,
    inGameHour: 7, // 07:00 AM Store opens
    inGameMinute: 0,
    isShopOpen: true,
    pendingDeliveries: [],
    carriedParcel: null,
    isCarriedBoxOpen: false,
    todayStats: {
      revenue: 0,
      profit: 0,
      customersServed: 0,
      itemsSold: 0,
    },
    activeTournament: null,
    trophyCollection: [],
    marketPulseNews: [],
    liveBreakStats: {
      breaksHosted: 0,
      slotsSold: 0,
      totalRevenue: 0,
      viralFollowers: 50,
    },
    cityHuntSpots: [],
    ownedLuxuryAssets: [],
    satelliteKiosks: {
      aeon_kiosk: { id: 'aeon_kiosk', unlocked: false, tier: 1, uncollectedCash: 0, totalEarned: 0, itemsSold: 0 },
      landmark_kiosk: { id: 'landmark_kiosk', unlocked: false, tier: 1, uncollectedCash: 0, totalEarned: 0, itemsSold: 0 },
    },
    claimedMasterSetMilestones: [],
    securityLevel: 0,
    activeSecurityAlert: null,
    securityStats: {
      theftsPrevented: 0,
      totalLosses: 0,
      bountiesEarned: 0,
    },
  };
}

/**
 * Dedicated VIP Testing Store State:
 * - Level 27 (Max Cấp)
 * - $1,000,000.00 Tiền Mặt
 * - Tất cả set Pokémon & One Piece được mở khóa
 * - Toàn bộ giấy phép sỉ (Licenses)
 * - Toàn bộ kệ trưng bày tầng 1 & tầng 2 (Shelves)
 */
export function createTestVipShopState(): ShopState {
  const initial = createInitialShopState();
  const allPokemonSets = ALL_UNIQUE_BOOSTER_SETS.map((s) => s.id);
  const allOnePieceSets = ALL_ONEPIECE_BOOSTER_SETS.map((s) => s.id);
  const allSets = Array.from(
    new Set([
      ...allPokemonSets,
      ...allOnePieceSets,
      'pokemon30thCommon',
      'pokemon30thNight',
      'sv151',
      'prismaticEvolutions',
      'celeb25',
      'destinedRivals',
      'crownZenith',
      'evolvingSkies',
      'deltaReign',
      'baseSetVintage',
      'gamestopMystery1',
      'gamestopMystery2',
      'gamestopMystery3',
    ])
  );

  const allLicenses = Array.from(
    new Set(
      PRODUCT_LICENSES.flatMap((lic) => [
        lic.id,
        lic.productId,
      ])
    )
  );

  const allShelves = Array.from(
    new Set([
      ...STARTER_UNLOCKED_SHELVES,
      ...SHELF_UNLOCKS.map((s) => s.id),
      ...ONEPIECE_SHELF_UNLOCKS.map((s) => s.id),
    ])
  );

  return {
    ...initial,
    shopName: 'PokeVault 3D - VIP Testing Hub',
    storeLevel: 27,
    storeExp: 99999,
    storeExpToNext: 100000,
    cash: 1000000.0,
    totalRevenue: 2500000,
    packsOpenedCount: 500,
    customersServedCount: 200,
    reputation: 100,
    unlockedSets: allSets,
    purchasedLicenses: allLicenses,
    unlockedShelves: allShelves,
    tableRentalPricePerHour: 10.0,
    tablePlayersCount: 8,
    totalTableRentalEarnings: 15000,
    hiredStaff: {
      cashier: 1,
      restocker: 1,
      officeStaff: 0,
      liveStreamer: 0,
      gradingReceptionist: 0,
      gradingSpecialists: 0,
      auctioneer: 0,
      auctionHost: 0,
    },
    liveStudioUnlocked: true,
    gradingJobs: [],
    gradedSlabs: [],
    customerGradingOrders: [],
    gradingPopReport: {},
    gradingLabStats: {
      totalGraded: 0,
      psaCount: 0,
      cgcCount: 0,
      bgsCount: 0,
      grade10Count: 0,
      pristine10Count: 0,
      blackLabelCount: 0,
      totalFeesSpent: 0,
      totalSlabValueCreated: 0,
      customerOrdersCompleted: 0,
      customerServiceProfit: 0,
      auctionsCompleted: 0,
      auctionProfit: 0,
      consignmentCommissionEarned: 0,
      consignmentLotsCompleted: 0,
      buybackSnipes: 0,
    },
    slabAuctions: [],
    auctionConsignmentOffers: [],
    auctionHistory: [],
    buybackOffers: [],
    vipSlabOrders: [],
    activeMarketTrend: DAILY_MARKET_TRENDS[0],
    activeTournament: null,
    trophyCollection: [],
    marketPulseNews: [],
    liveBreakStats: {
      breaksHosted: 0,
      slotsSold: 0,
      totalRevenue: 0,
      viralFollowers: 120,
    },
    cityHuntSpots: [],
    ownedLuxuryAssets: [],
    satelliteKiosks: {
      aeon_kiosk: { id: 'aeon_kiosk', unlocked: false, tier: 1, uncollectedCash: 0, totalEarned: 0, itemsSold: 0 },
      landmark_kiosk: { id: 'landmark_kiosk', unlocked: false, tier: 1, uncollectedCash: 0, totalEarned: 0, itemsSold: 0 },
    },
    claimedMasterSetMilestones: [],
    securityLevel: 0,
    activeSecurityAlert: null,
    securityStats: {
      theftsPrevented: 0,
      totalLosses: 0,
      bountiesEarned: 0,
    },
  };
}

const MAX_SHOWCASE_SLOTS = 10;
const MAX_SHELF_SLOTS = 18;

/**
 * Automatically places a kept card (or PSA/CGC graded slab) onto a visible 3D stand:
 * 1) First empty or sold slot on the 10-stand Gold Showcase Table (indices 0..9)
 * 2) Else first empty or sold slot on the 18-stand Wall Shelves (indices 0..17)
 * 3) Else replaces the oldest/lowest-priced visible slot on the 10-stand Showcase Table (0..9)
 */
export function placeCardInDisplaySlots(
  showcaseCards: DisplayCardEntry[] = [],
  shelfCards: DisplayCardEntry[] = [],
  newEntry: Omit<DisplayCardEntry, 'placedOrder'>,
  unlockedShelves?: string[]
): PlaceDisplayCardResult {
  const nextShowcase = showcaseCards.slice(0, MAX_SHOWCASE_SLOTS).map((item) => (item ? { ...item } : item));
  const nextShelf = shelfCards.slice(0, MAX_SHELF_SLOTS).map((item) => (item ? { ...item } : item));

  const resolvedSlab = newEntry.slab ?? (newEntry.card as any)?.slab;
  const hasSlab = Boolean(resolvedSlab && newEntry.isSlab !== false);

  const cardCopy: PokemonCard & { isSlab?: boolean; slab?: GradedSlab } = hasSlab
    ? { ...newEntry.card, isSlab: true, slab: resolvedSlab }
    : { ...newEntry.card };
  if (!hasSlab) {
    delete cardCopy.isSlab;
    delete cardCopy.slab;
  }

  let maxOrder = 0;
  for (const s of nextShowcase) {
    if (s && typeof s.placedOrder === 'number' && s.placedOrder > maxOrder) maxOrder = s.placedOrder;
  }
  for (const s of nextShelf) {
    if (s && typeof s.placedOrder === 'number' && s.placedOrder > maxOrder) maxOrder = s.placedOrder;
  }

  const normalizedEntry: DisplayCardEntry = {
    card: cardCopy,
    retailPrice: newEntry.retailPrice,
    isSold: false,
    isSlab: hasSlab,
    slab: hasSlab ? resolvedSlab : undefined,
    placedOrder: maxOrder + 1,
  };

  // 1. Check Showcase Table slots 0..9 for empty or sold spot
  for (let i = 0; i < MAX_SHOWCASE_SLOTS; i++) {
    const slot = nextShowcase[i];
    if (!slot || !slot.card || slot.isSold) {
      nextShowcase[i] = normalizedEntry;
      return {
        showcaseCards: nextShowcase,
        shelfCards: nextShelf,
        location: 'showcase',
        slotIndex: i,
      };
    }
  }

  // 2. Check unlocked Wall Shelves slots 0..17 for empty or sold spot
  for (let i = 0; i < MAX_SHELF_SLOTS; i++) {
    const shelfNum = Math.floor(i / 6) + 1;
    if (!isShelfUnlocked(unlockedShelves, `shelf_card_${shelfNum}`)) continue;
    const slot = nextShelf[i];
    if (!slot || !slot.card || slot.isSold) {
      nextShelf[i] = normalizedEntry;
      return {
        showcaseCards: nextShowcase,
        shelfCards: nextShelf,
        location: 'shelf',
        slotIndex: i,
      };
    }
  }

  // 3. All 28 visible stands occupied & unsold: rotate into the Showcase Table slot
  // preferring starter cards (placedOrder = 0) cheapest-first, then oldest kept slot
  let replaceIdx = 0;
  let minOrder = Infinity;
  let minPrice = Infinity;
  for (let i = 0; i < MAX_SHOWCASE_SLOTS; i++) {
    const slot = nextShowcase[i];
    const order = slot?.placedOrder ?? 0;
    const price = slot?.retailPrice ?? 0;
    if (order < minOrder || (order === minOrder && price <= minPrice)) {
      minOrder = order;
      minPrice = price;
      replaceIdx = i;
    }
  }

  nextShowcase[replaceIdx] = normalizedEntry;
  return {
    showcaseCards: nextShowcase,
    shelfCards: nextShelf,
    location: 'showcase',
    slotIndex: replaceIdx,
  };
}

/**
 * Places a One Piece card (or graded slab) onto Floor 2 visible 3D stands:
 * 1) Floor 2 10-stand Gold Showcase Table (0..9)
 * 2) Unlocked Floor 2 Back-Wall OP Card Display Shelves (0..17, gated by op_shelf_card_1..3)
 * 3) Oldest/cheapest slot rotation on Floor 2 Showcase Table
 */
export function placeOpCardInDisplaySlots(
  opShowcaseCards: DisplayCardEntry[] = [],
  opShelfCards: DisplayCardEntry[] = [],
  newEntry: Omit<DisplayCardEntry, 'placedOrder'>,
  unlockedShelves?: string[]
): PlaceDisplayCardResult {
  const nextShowcase = opShowcaseCards.slice(0, MAX_SHOWCASE_SLOTS).map((item) => (item ? { ...item } : item));
  const nextShelf = opShelfCards.slice(0, MAX_SHELF_SLOTS).map((item) => (item ? { ...item } : item));

  const resolvedSlab = newEntry.slab ?? (newEntry.card as any)?.slab;
  const hasSlab = Boolean(resolvedSlab && newEntry.isSlab !== false);

  const cardCopy: PokemonCard & { isSlab?: boolean; slab?: GradedSlab } = hasSlab
    ? { ...newEntry.card, isSlab: true, slab: resolvedSlab }
    : { ...newEntry.card };
  if (!hasSlab) {
    delete cardCopy.isSlab;
    delete cardCopy.slab;
  }

  let maxOrder = 0;
  for (const s of nextShowcase) {
    if (s && typeof s.placedOrder === 'number' && s.placedOrder > maxOrder) maxOrder = s.placedOrder;
  }
  for (const s of nextShelf) {
    if (s && typeof s.placedOrder === 'number' && s.placedOrder > maxOrder) maxOrder = s.placedOrder;
  }

  const normalizedEntry: DisplayCardEntry = {
    card: cardCopy,
    retailPrice: newEntry.retailPrice,
    isSold: false,
    isSlab: hasSlab,
    slab: hasSlab ? resolvedSlab : undefined,
    placedOrder: maxOrder + 1,
  };

  for (let i = 0; i < MAX_SHOWCASE_SLOTS; i++) {
    const slot = nextShowcase[i];
    if (!slot || !slot.card || slot.isSold) {
      nextShowcase[i] = normalizedEntry;
      return {
        showcaseCards: nextShowcase,
        shelfCards: nextShelf,
        location: 'showcase',
        slotIndex: i,
      };
    }
  }

  for (let i = 0; i < MAX_SHELF_SLOTS; i++) {
    const shelfNum = Math.floor(i / 6) + 1;
    if (!isShelfUnlocked(unlockedShelves, `op_shelf_card_${shelfNum}`)) continue;
    const slot = nextShelf[i];
    if (!slot || !slot.card || slot.isSold) {
      nextShelf[i] = normalizedEntry;
      return {
        showcaseCards: nextShowcase,
        shelfCards: nextShelf,
        location: 'shelf',
        slotIndex: i,
      };
    }
  }

  let replaceIdx = 0;
  let minOrder = Infinity;
  let minPrice = Infinity;
  for (let i = 0; i < MAX_SHOWCASE_SLOTS; i++) {
    const slot = nextShowcase[i];
    const order = slot?.placedOrder ?? 0;
    const price = slot?.retailPrice ?? 0;
    if (order < minOrder || (order === minOrder && price <= minPrice)) {
      minOrder = order;
      minPrice = price;
      replaceIdx = i;
    }
  }

  nextShowcase[replaceIdx] = normalizedEntry;
  return {
    showcaseCards: nextShowcase,
    shelfCards: nextShelf,
    location: 'showcase',
    slotIndex: replaceIdx,
  };
}

// Calculate customer willingness to buy based on price vs market value
export function calculatePurchaseProbability(retailPrice: number, marketPrice: number): {
  willBuy: boolean;
  satisfaction: 'Great Deal' | 'Fair Price' | 'Overpriced' | 'Ripoff';
  chance: number;
} {
  const ratio = retailPrice / Math.max(0.1, marketPrice);

  if (ratio <= 0.9) {
    return { willBuy: true, satisfaction: 'Great Deal', chance: 0.98 };
  } else if (ratio <= 1.15) {
    return { willBuy: Math.random() < 0.85, satisfaction: 'Fair Price', chance: 0.85 };
  } else if (ratio <= 1.35) {
    return { willBuy: Math.random() < 0.45, satisfaction: 'Overpriced', chance: 0.45 };
  } else {
    return { willBuy: Math.random() < 0.1, satisfaction: 'Ripoff', chance: 0.1 };
  }
}

export type ShopShelfStationId =
  | 'shelves'
  | 'gacha'
  | 'collector_shelves'
  | 'gamestop_shelf'
  | 'showcase'
  | 'shelf_1'
  | 'shelf_2'
  | 'shelf_3'
  | 'op_shelves'
  | 'op_gacha'
  | 'op_collector_shelves'
  | 'op_bounty_shelf'
  | 'op_showcase'
  | 'op_shelf_1'
  | 'op_shelf_2'
  | 'op_shelf_3';

function resolveInventoryVisualMeta(item: InventoryItem): { imageUrl?: string; themeColor?: string } {
  if (item.imageUrl && item.themeColor) {
    return { imageUrl: item.imageUrl, themeColor: item.themeColor };
  }
  if (item.productId.startsWith('gacha_')) {
    const tierId = item.productId.replace('gacha_', '');
    const opTier = OP_GACHA_PACK_TIERS[tierId];
    if (opTier) {
      return {
        imageUrl: item.imageUrl || opTier.imageUrl,
        themeColor: item.themeColor || opTier.themeColor,
      };
    }
    const tier = GACHA_PACK_TIERS[tierId];
    if (tier) {
      return {
        imageUrl: item.imageUrl || tier.imageUrl,
        themeColor: item.themeColor || tier.themeColor,
      };
    }
  }
  const setId = item.productId.replace(/_(pack|box)$/, '');
  const setMeta = getBoosterSet(setId);
  if (setMeta) {
    return {
      imageUrl: item.imageUrl || (item.type === 'box' ? setMeta.boxImageUrl : setMeta.packImageUrl),
      themeColor: item.themeColor || setMeta.themeColor,
    };
  }
  return { imageUrl: item.imageUrl, themeColor: item.themeColor };
}

function getInventoryMarketReferencePrice(item: InventoryItem): number {
  if (item.productId.startsWith('gacha_')) {
    const tierId = item.productId.replace('gacha_', '');
    return (
      OP_GACHA_PACK_TIERS[tierId]?.price ||
      GACHA_PACK_TIERS[tierId]?.price ||
      Math.max(1, item.wholesaleCost * 1.67)
    );
  }
  const setId = item.productId.replace(/_(pack|box)$/, '');
  const setMeta = getBoosterSet(setId);
  if (setMeta) {
    return item.type === 'box' ? setMeta.boxRetailPrice : setMeta.packRetailPrice;
  }
  if (item.cardData?.marketPrice) {
    return item.cardData.marketPrice;
  }
  return Math.max(1, item.wholesaleCost * 1.85);
}

/**
 * Returns only shelf/display station IDs (both Floor 1 Pokémon & Floor 2 One Piece)
 * that currently have at least 1 real item stocked for sale.
 */
export function getStockedStationIds(shopState: ShopState): ShopShelfStationId[] {
  const stocked = new Set<ShopShelfStationId>();
  const unlocked = shopState.unlockedShelves;

  for (const item of shopState.inventory || []) {
    const availableOnShelf = Math.min(item.quantity || 0, item.shelvedQuantity || 0);
    if (availableOnShelf <= 0) continue;

    if (isOnePieceProductId(item.productId)) {
      if (isOnePieceGachaProduct(item.productId)) {
        if (isShelfUnlocked(unlocked, 'op_shelf_gacha_gondola')) {
          stocked.add('op_gacha');
        }
      } else if (isOnePieceCollectorProduct(item.productId)) {
        const colId = getOnePieceCollectorShelfIdForProduct(item.productId);
        if (!colId || isShelfUnlocked(unlocked, colId)) {
          stocked.add('op_collector_shelves');
        }
      } else if (isOnePieceBountyProduct(item.productId)) {
        if (isShelfUnlocked(unlocked, 'op_shelf_bounty_mystery')) {
          stocked.add('op_bounty_shelf');
        }
      } else if (item.type === 'pack' || item.type === 'box') {
        stocked.add('op_shelves');
      }
      continue;
    }

    if (item.productId.startsWith('gacha_')) {
      if (isShelfUnlocked(unlocked, 'shelf_gacha_gondola')) {
        stocked.add('gacha');
      }
    } else if (isCollectorBoxProduct(item.productId)) {
      const colId = getCollectorShelfIdForProduct(item.productId);
      if (!colId || isShelfUnlocked(unlocked, colId)) {
        stocked.add('collector_shelves');
      }
    } else if (isGameStopMysteryProduct(item.productId)) {
      if (isShelfUnlocked(unlocked, 'shelf_gamestop_mystery')) {
        stocked.add('gamestop_shelf');
      }
    } else if (item.type === 'pack' || item.type === 'box') {
      stocked.add('shelves');
    }
  }

  // Floor 1 Display Cards
  const showcase = shopState.showcaseCards || [];
  if (showcase.some((s) => Boolean(s && s.card && !s.isSold && !s.isReserved))) {
    stocked.add('showcase');
  }

  const shelves = shopState.shelfCards || [];
  if (shelves.slice(0, 6).some((s) => Boolean(s && s.card && !s.isSold && !s.isReserved))) {
    stocked.add('shelf_1');
  }
  if (
    isShelfUnlocked(unlocked, 'shelf_card_2') &&
    shelves.slice(6, 12).some((s) => Boolean(s && s.card && !s.isSold && !s.isReserved))
  ) {
    stocked.add('shelf_2');
  }
  if (
    isShelfUnlocked(unlocked, 'shelf_card_3') &&
    shelves.slice(12, 18).some((s) => Boolean(s && s.card && !s.isSold && !s.isReserved))
  ) {
    stocked.add('shelf_3');
  }

  // Floor 2 One Piece Display Cards
  const opShowcase = shopState.opShowcaseCards || [];
  if (opShowcase.some((s) => Boolean(s && s.card && !s.isSold && !s.isReserved))) {
    stocked.add('op_showcase');
  }

  const opShelves = shopState.opShelfCards || [];
  if (opShelves.slice(0, 6).some((s) => Boolean(s && s.card && !s.isSold && !s.isReserved))) {
    stocked.add('op_shelf_1');
  }
  if (
    isShelfUnlocked(unlocked, 'op_shelf_card_2') &&
    opShelves.slice(6, 12).some((s) => Boolean(s && s.card && !s.isSold && !s.isReserved))
  ) {
    stocked.add('op_shelf_2');
  }
  if (
    isShelfUnlocked(unlocked, 'op_shelf_card_3') &&
    opShelves.slice(12, 18).some((s) => Boolean(s && s.card && !s.isSold && !s.isReserved))
  ) {
    stocked.add('op_shelf_3');
  }

  return Array.from(stocked);
}

function getStationInventoryPredicate(stationId: ShopShelfStationId): ((item: InventoryItem) => boolean) | null {
  switch (stationId) {
    case 'shelves':
      return (item) =>
        (item.type === 'pack' || item.type === 'box') &&
        !isOnePieceProductId(item.productId) &&
        !item.productId.startsWith('gacha_') &&
        !isCollectorBoxProduct(item.productId) &&
        !isGameStopMysteryProduct(item.productId);
    case 'gacha':
      return (item) => item.productId.startsWith('gacha_') && !isOnePieceGachaProduct(item.productId);
    case 'collector_shelves':
      return (item) => isCollectorBoxProduct(item.productId);
    case 'gamestop_shelf':
      return (item) => isGameStopMysteryProduct(item.productId);
    case 'op_shelves':
      return (item) =>
        (item.type === 'pack' || item.type === 'box') &&
        isOnePieceProductId(item.productId) &&
        !isOnePieceGachaProduct(item.productId) &&
        !isOnePieceCollectorProduct(item.productId) &&
        !isOnePieceBountyProduct(item.productId);
    case 'op_gacha':
      return (item) => isOnePieceGachaProduct(item.productId);
    case 'op_collector_shelves':
      return (item) => isOnePieceCollectorProduct(item.productId);
    case 'op_bounty_shelf':
      return (item) => isOnePieceBountyProduct(item.productId);
    default:
      return null;
  }
}

/**
 * Live shelf-picking when an NPC arrives at a shelf/display station inside the shop (Floor 1 or Floor 2).
 * Deducts shelvedQuantity (or marks display card slot as isReserved) immediately so
 * empty shelves never yield items and concurrent customers cannot double-pick the last item.
 */
export function pickItemFromStationForCustomer(
  shopState: ShopState,
  stationId: ShopShelfStationId,
  customer: ShopCustomer
): {
  picked: { item: InventoryItem; count: number; unitPrice: number } | null;
  updatedState: ShopState;
  reason?: 'empty' | 'budget' | 'overpriced';
} {
  const isOpDisplay =
    stationId === 'op_showcase' ||
    stationId === 'op_shelf_1' ||
    stationId === 'op_shelf_2' ||
    stationId === 'op_shelf_3';
  const isPokeDisplay =
    stationId === 'showcase' ||
    stationId === 'shelf_1' ||
    stationId === 'shelf_2' ||
    stationId === 'shelf_3';

  // 1. Display card stations (Floor 1 or Floor 2)
  if (isPokeDisplay || isOpDisplay) {
    if (stationId === 'shelf_2' && !isShelfUnlocked(shopState.unlockedShelves, 'shelf_card_2')) {
      return { picked: null, updatedState: shopState, reason: 'empty' };
    }
    if (stationId === 'shelf_3' && !isShelfUnlocked(shopState.unlockedShelves, 'shelf_card_3')) {
      return { picked: null, updatedState: shopState, reason: 'empty' };
    }
    if (stationId === 'op_shelf_2' && !isShelfUnlocked(shopState.unlockedShelves, 'op_shelf_card_2')) {
      return { picked: null, updatedState: shopState, reason: 'empty' };
    }
    if (stationId === 'op_shelf_3' && !isShelfUnlocked(shopState.unlockedShelves, 'op_shelf_card_3')) {
      return { picked: null, updatedState: shopState, reason: 'empty' };
    }

    const isShowcase = stationId === 'showcase' || stationId === 'op_showcase';
    const sourceList = isOpDisplay
      ? isShowcase
        ? [...(shopState.opShowcaseCards || [])]
        : [...(shopState.opShelfCards || [])]
      : isShowcase
      ? [...(shopState.showcaseCards || [])]
      : [...(shopState.shelfCards || [])];

    const startIdx = isShowcase
      ? 0
      : stationId === 'shelf_1' || stationId === 'op_shelf_1'
      ? 0
      : stationId === 'shelf_2' || stationId === 'op_shelf_2'
      ? 6
      : 12;
    const endIdx = isShowcase ? Math.min(10, sourceList.length) : Math.min(startIdx + 6, sourceList.length);

    const stockedSlots: Array<{ slot: DisplayCardEntry; idx: number }> = [];
    for (let i = startIdx; i < endIdx; i++) {
      const slot = sourceList[i];
      if (slot && slot.card && !slot.isSold && !slot.isReserved) {
        stockedSlots.push({ slot, idx: i });
      }
    }

    if (stockedSlots.length === 0) {
      return { picked: null, updatedState: shopState, reason: 'empty' };
    }

    const affordable = stockedSlots.filter((e) => e.slot.retailPrice <= customer.budget);
    if (affordable.length === 0) {
      return { picked: null, updatedState: shopState, reason: 'budget' };
    }

    const chosen = affordable[Math.floor(Math.random() * affordable.length)];
    const decision = calculatePurchaseProbability(chosen.slot.retailPrice, chosen.slot.card.marketPrice);
    if (!decision.willBuy) {
      return { picked: null, updatedState: shopState, reason: 'overpriced' };
    }

    sourceList[chosen.idx] = { ...chosen.slot, isReserved: true };
    const updatedState: ShopState = isOpDisplay
      ? isShowcase
        ? { ...shopState, opShowcaseCards: sourceList }
        : { ...shopState, opShelfCards: sourceList }
      : isShowcase
      ? { ...shopState, showcaseCards: sourceList }
      : { ...shopState, shelfCards: sourceList };

    const cardWithSlab: PokemonCard & { isSlab?: boolean; slab?: GradedSlab } = chosen.slot.isSlab || chosen.slot.slab
      ? { ...chosen.slot.card, isSlab: true, slab: chosen.slot.slab || (chosen.slot.card as any).slab }
      : { ...chosen.slot.card };

    const prefix = isOpDisplay
      ? isShowcase
        ? 'op_single_'
        : 'op_shelf_'
      : isShowcase
      ? 'single_'
      : 'shelf_';

    const basketEntry = {
      item: {
        id: prefix + chosen.slot.card.id + '_' + chosen.idx,
        productId: chosen.slot.card.id,
        name: `${chosen.slot.card.name} (${chosen.slot.card.rarityLabel})`,
        type: 'single' as const,
        cardData: cardWithSlab,
        wholesaleCost: chosen.slot.card.marketPrice * 0.7,
        retailPrice: chosen.slot.retailPrice,
        quantity: 1,
        shelvedQuantity: 1,
        imageUrl: chosen.slot.card.imageUrl,
        themeColor: chosen.slot.card.accentColor || chosen.slot.card.cardColor,
      },
      count: 1,
      unitPrice: chosen.slot.retailPrice,
    };

    return { picked: basketEntry, updatedState };
  }

  // 2. Shelved Pack & Box stations (Floor 1 & Floor 2)
  if (stationId === 'gacha' && !isShelfUnlocked(shopState.unlockedShelves, 'shelf_gacha_gondola')) {
    return { picked: null, updatedState: shopState, reason: 'empty' };
  }
  if (stationId === 'gamestop_shelf' && !isShelfUnlocked(shopState.unlockedShelves, 'shelf_gamestop_mystery')) {
    return { picked: null, updatedState: shopState, reason: 'empty' };
  }
  if (stationId === 'op_gacha' && !isShelfUnlocked(shopState.unlockedShelves, 'op_shelf_gacha_gondola')) {
    return { picked: null, updatedState: shopState, reason: 'empty' };
  }
  if (stationId === 'op_bounty_shelf' && !isShelfUnlocked(shopState.unlockedShelves, 'op_shelf_bounty_mystery')) {
    return { picked: null, updatedState: shopState, reason: 'empty' };
  }

  const predicate = getStationInventoryPredicate(stationId);
  if (!predicate) {
    return { picked: null, updatedState: shopState, reason: 'empty' };
  }

  const stockedAtStation = (shopState.inventory || []).filter((item) => {
    const available = Math.min(item.quantity || 0, item.shelvedQuantity || 0);
    if (available <= 0 || !predicate(item)) return false;
    if (stationId === 'collector_shelves') {
      const colId = getCollectorShelfIdForProduct(item.productId);
      if (colId && !isShelfUnlocked(shopState.unlockedShelves, colId)) return false;
    }
    if (stationId === 'op_collector_shelves') {
      const colId = getOnePieceCollectorShelfIdForProduct(item.productId);
      if (colId && !isShelfUnlocked(shopState.unlockedShelves, colId)) return false;
    }
    return true;
  });

  if (stockedAtStation.length === 0) {
    return { picked: null, updatedState: shopState, reason: 'empty' };
  }

  const affordable = stockedAtStation.filter((item) => item.retailPrice <= customer.budget);
  if (affordable.length === 0) {
    return { picked: null, updatedState: shopState, reason: 'budget' };
  }

  const preferredMatches = affordable.filter((item) => item.type === customer.preferredProduct);
  const pool = preferredMatches.length > 0 ? preferredMatches : affordable;
  const chosen = pool[Math.floor(Math.random() * pool.length)];

  const marketRef = getInventoryMarketReferencePrice(chosen);
  const decision = calculatePurchaseProbability(chosen.retailPrice, marketRef);
  if (!decision.willBuy) {
    return { picked: null, updatedState: shopState, reason: 'overpriced' };
  }

  const available = Math.min(chosen.quantity || 0, chosen.shelvedQuantity || 0);
  const maxByBudget = Math.max(1, Math.floor(customer.budget / Math.max(0.1, chosen.retailPrice)));
  const count = chosen.type === 'box' ? 1 : Math.min(available, Math.min(3, maxByBudget));
  if (count <= 0) {
    return { picked: null, updatedState: shopState, reason: 'empty' };
  }

  const updatedInv = shopState.inventory.map((inv) => {
    if (inv.id === chosen.id) {
      const clampedShelved = Math.min(inv.quantity || 0, inv.shelvedQuantity || 0);
      return {
        ...inv,
        shelvedQuantity: Math.max(0, clampedShelved - count),
      };
    }
    return inv;
  });

  const visualMeta = resolveInventoryVisualMeta(chosen);
  const pickedItem: InventoryItem = {
    ...chosen,
    ...visualMeta,
  };

  return {
    picked: {
      item: pickedItem,
      count,
      unitPrice: chosen.retailPrice,
    },
    updatedState: {
      ...shopState,
      inventory: updatedInv,
    },
  };
}

/**
 * Restores any shelved stock or reserved display cards held in a customer's basket if
 * they depart without checking out (safety net against stuck reservations).
 */
export function releaseCustomerReservedItems(shopState: ShopState, customer: ShopCustomer): ShopState {
  if (!customer.basket || customer.basket.length === 0) return shopState;

  let updatedInv = [...shopState.inventory];
  let updatedShowcase = [...shopState.showcaseCards];
  let updatedShelf = [...(shopState.shelfCards || [])];
  let updatedOpShowcase = [...(shopState.opShowcaseCards || [])];
  let updatedOpShelf = [...(shopState.opShelfCards || [])];

  for (const bItem of customer.basket) {
    if (bItem.item.type === 'single') {
      const parts = bItem.item.id.split('_');
      const slotIdx = parseInt(parts[parts.length - 1], 10);
      if (bItem.item.id.startsWith('op_shelf_')) {
        if (!isNaN(slotIdx) && updatedOpShelf[slotIdx]) {
          updatedOpShelf[slotIdx] = { ...updatedOpShelf[slotIdx], isReserved: false };
        }
      } else if (bItem.item.id.startsWith('op_single_')) {
        if (!isNaN(slotIdx) && updatedOpShowcase[slotIdx]) {
          updatedOpShowcase[slotIdx] = { ...updatedOpShowcase[slotIdx], isReserved: false };
        }
      } else if (bItem.item.id.startsWith('shelf_')) {
        if (!isNaN(slotIdx) && updatedShelf[slotIdx]) {
          updatedShelf[slotIdx] = { ...updatedShelf[slotIdx], isReserved: false };
        }
      } else {
        if (!isNaN(slotIdx) && updatedShowcase[slotIdx]) {
          updatedShowcase[slotIdx] = { ...updatedShowcase[slotIdx], isReserved: false };
        }
      }
    } else {
      updatedInv = updatedInv.map((inv) => {
        if (inv.id === bItem.item.id || inv.productId === bItem.item.productId) {
          return {
            ...inv,
            shelvedQuantity: Math.min(inv.quantity || 0, (inv.shelvedQuantity || 0) + (bItem.count || 1)),
          };
        }
        return inv;
      });
    }
  }

  return {
    ...shopState,
    inventory: updatedInv,
    showcaseCards: updatedShowcase,
    shelfCards: updatedShelf,
    opShowcaseCards: updatedOpShowcase,
    opShelfCards: updatedOpShelf,
  };
}

export function generateCustomer(
  availableItems: InventoryItem[],
  showcaseCards: DisplayCardEntry[],
  shelfCards: DisplayCardEntry[] = [],
  options?: { startEmptyBasket?: boolean }
): ShopCustomer {
  const names = [
    'Tuấn Collector',
    'Minh Pikachu',
    'Lan Anh TCG',
    'Hoàng Long Shark',
    'Huy Eevee',
    'Bảo Nam Pro',
    'Alex Trọc',
    'Thầy Bảy Sưu Tầm',
    'Bé Na Kanto',
    'David Wilson',
  ];
  const roles: ShopCustomer['role'][] = ['Collector', 'Kid', 'Player', 'Whale', 'Scalper'];
  const role = roles[Math.floor(Math.random() * roles.length)];
  const name = names[Math.floor(Math.random() * names.length)];

  let budget = 35;
  if (role === 'Kid') budget = 20 + Math.floor(Math.random() * 25);
  if (role === 'Player') budget = 65 + Math.floor(Math.random() * 55);
  if (role === 'Collector') budget = 750 + Math.floor(Math.random() * 850); // $750 - $1,600 (đủ sức mua SPC & UPC)
  if (role === 'Whale') budget = 1800 + Math.floor(Math.random() * 1800); // $1,800 - $3,600 (đại gia mua trọn bộ UPC)
  if (role === 'Scalper') budget = 1200 + Math.floor(Math.random() * 800); // $1,200 - $2,000
  const initialBudget = budget;

  const basket: ShopCustomer['basket'] = [];

  if (!options?.startEmptyBasket) {
    // Combine showcase cards and 3 card shelves cards for single card browsing
    const allSingleCards = [
      ...showcaseCards.map((s, idx) => (s ? { ...s, source: 'showcase' as const, slotIndex: idx } : null)),
      ...shelfCards.map((s, idx) => (s ? { ...s, source: 'shelf' as const, slotIndex: idx } : null)),
    ].filter((s): s is DisplayCardEntry & { source: 'showcase' | 'shelf'; slotIndex: number } => Boolean(s && s.card));

    // Consider showcase or wall shelf single card
    const availableSingles = allSingleCards.filter(
      (s) => !s.isSold && !s.isReserved && s.retailPrice <= budget
    );
    if (availableSingles.length > 0 && (role === 'Collector' || role === 'Whale' || Math.random() < 0.38)) {
      const chosen = availableSingles[Math.floor(Math.random() * availableSingles.length)];
      const decision = calculatePurchaseProbability(chosen.retailPrice, chosen.card.marketPrice);
      if (decision.willBuy) {
        basket.push({
          item: {
            id: (chosen.source === 'shelf' ? 'shelf_' : 'single_') + chosen.card.id + '_' + chosen.slotIndex,
            productId: chosen.card.id,
            name: `${chosen.card.name} (${chosen.card.rarityLabel})`,
            type: 'single',
            cardData: chosen.card,
            wholesaleCost: chosen.card.marketPrice * 0.7,
            retailPrice: chosen.retailPrice,
            quantity: 1,
            shelvedQuantity: 1,
            imageUrl: chosen.card.imageUrl,
            themeColor: chosen.card.accentColor || chosen.card.cardColor,
          },
          count: 1,
          unitPrice: chosen.retailPrice,
        });
        budget -= chosen.retailPrice;
      }
    }

    // Consider shelves products (packs or boxes): MUST have BOTH quantity > 0 AND shelvedQuantity > 0
    const stockedShelves = availableItems.filter(
      (i) => (i.quantity || 0) > 0 && (i.shelvedQuantity || 0) > 0 && i.retailPrice <= budget
    );
    if (stockedShelves.length > 0) {
      const chosenProduct = stockedShelves[Math.floor(Math.random() * stockedShelves.length)];
      const availableCount = Math.min(chosenProduct.quantity, chosenProduct.shelvedQuantity);
      const count = Math.min(
        availableCount,
        chosenProduct.type === 'box' ? 1 : Math.max(1, Math.min(3, Math.floor(budget / chosenProduct.retailPrice)))
      );
      if (count > 0) {
        const visualMeta = resolveInventoryVisualMeta(chosenProduct);
        basket.push({
          item: { ...chosenProduct, ...visualMeta },
          count,
          unitPrice: chosenProduct.retailPrice,
        });
        budget -= chosenProduct.retailPrice * count;
      }
    }
  }

  const avatarColors = ['#f59e0b', '#ef4444', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899', '#06b6d4'];
  const spawnSide = Math.random() < 0.5 ? -1 : 1;
  const spawnX = spawnSide * (8.5 + Math.random() * 2.0);
  const spawnZ = 21.0 + Math.random() * 1.5;

  const hasAnyStockInShop =
    availableItems.some((i) => (i.quantity || 0) > 0 && (i.shelvedQuantity || 0) > 0) ||
    showcaseCards.some((s) => Boolean(s && s.card && !s.isSold && !s.isReserved)) ||
    shelfCards.some((s) => Boolean(s && s.card && !s.isSold && !s.isReserved));

  const initialBubble = options?.startEmptyBasket
    ? hasAnyStockInShop
      ? 'Đang vào xem hàng trên kệ...'
      : 'Vào xem tiệm có hàng gì chưa...'
    : basket.length > 0
    ? 'Đang vào xem hàng trên kệ...'
    : 'Ủa? Kệ tiệm trống trơn, chưa có hàng bán à!';

  return {
    id: 'cust_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 4),
    name,
    avatarColor: avatarColors[Math.floor(Math.random() * avatarColors.length)],
    role,
    budget: Math.max(0, budget),
    initialBudget,
    preferredProduct: role === 'Whale' ? 'box' : role === 'Collector' ? 'single' : 'pack',
    basket,
    status: 'entering',
    position: [spawnX, 0, spawnZ], // Outdoor street/sidewalk walking across shop front
    targetPosition: [0.0, 0, 15.5], // Center of open glass entrance door
    speechBubble: initialBubble,
    patience: 100,
  };
}

// ==========================================
// 6. PROGRESSIVE MYSTERY PACK GACHA SYSTEM
// ==========================================
export interface CardSubgrades {
  centering: number; // 7.0 - 10.0 (0.5 step)
  corners: number;
  edges: number;
  surface: number;
  centeringRatio: string; // e.g. '51/49 · 50/50'
  notes: string;
}

export type SlabGuardColor = 'none' | 'gold' | 'crimson' | 'cyan' | 'emerald' | 'obsidian';

export interface GradedSlab {
  company: 'PSA' | 'BGS' | 'CGC';
  grade: number; // 7, 8, 8.5, 9, 9.5, 10
  gradeLabel: string; // 'GEM MT 10', 'PRISTINE 10', 'BLACK LABEL 10', 'GEM MINT 9.5', 'MINT 9', 'NM-MT 8'
  certNumber: string;
  year: number;
  subgrades?: CardSubgrades;
  slabGuardColor?: SlabGuardColor;
  isCertFancy?: boolean;
  regradedCount?: number;
}

export interface GachaPackInfo {
  id: 'silver' | 'gold' | 'blaze' | 'degen' | 'nova' | 'void' | 'crown' | 'grail';
  name: string;
  vietnameseName: string;
  price: number;
  floorPrice: number; // Strictly 50% of price (Tối đa chỉ lỗ 50%)
  imageUrl: string;
  themeColor: string;
  accentColor: string;
  rank: number;
  description: string;
  slabChance: number; // Combined slab probability (0.5% Grade 10 + 5% Grade 9 + 10% Grade 8 = 15.5%)
  topJackpot: number;
}

export interface GachaPullResult {
  card: PokemonCard;
  isSlab: boolean;
  slab?: GradedSlab;
  rawPrice: number;
  gradeMultiplier: number;
  payoutValue: number;
  multiplier: number;
  isJackpot: boolean;
  packId: string;
  packName: string;
}

export const GACHA_PACK_TIERS: Record<string, GachaPackInfo> = {
  silver: {
    id: 'silver',
    name: 'Silver Pack',
    vietnameseName: 'Gói Bạc Tân Thủ',
    price: 20.0,
    floorPrice: 10.0, // Tối thiểu $10 (50% tiền bỏ ra)
    imageUrl: 'https://jup.ag/images/gacha/jupiter-silver.webp',
    themeColor: '#94a3b8',
    accentColor: '#cbd5e1',
    rank: 1,
    description: 'Mystery Box bình dân: 0.5% PSA/CGC 10 (x4-x5 giá raw), 5% PSA/CGC 9 (+30-40%), 10% PSA/CGC 8 (= giá raw)!',
    slabChance: 0.155,
    topJackpot: 120.0,
  },
  gold: {
    id: 'gold',
    name: 'Gold Pack',
    vietnameseName: 'Gói Vàng Thượng Hạng',
    price: 50.0,
    floorPrice: 25.0, // Tối thiểu $25
    imageUrl: 'https://jup.ag/images/gacha/jupiter-gold.webp',
    themeColor: '#eab308',
    accentColor: '#fde047',
    rank: 2,
    description: 'Mystery Box mạ vàng: 0.5% PSA/CGC 10 (x4-x5 raw), 5% PSA/CGC 9 (+30-40%), 10% PSA/CGC 8 (= raw)!',
    slabChance: 0.155,
    topJackpot: 350.0,
  },
  blaze: {
    id: 'blaze',
    name: 'Blaze Pack',
    vietnameseName: 'Gói Lửa Rực Cháy',
    price: 100.0,
    floorPrice: 50.0, // Tối thiểu $50
    imageUrl: 'https://jup.ag/images/gacha/jupiter-blaze.webp',
    themeColor: '#ef4444',
    accentColor: '#f87171',
    rank: 3,
    description: 'Gói lửa rực rỡ: cơ hội trúng Slab PSA/CGC 10 nhân 4-5x giá thẻ raw, bảo hiểm sàn 50%!',
    slabChance: 0.155,
    topJackpot: 800.0,
  },
  degen: {
    id: 'degen',
    name: 'Degen Pack',
    vietnameseName: 'Gói Degen Dân Chơi',
    price: 250.0,
    floorPrice: 125.0, // Tối thiểu $125
    imageUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT5bA30f1gxRnJz0QUG6u2JtFBaTZjDxZe7SGy6JinaWWfRvSxQzTejQA8&s=10',
    themeColor: '#a855f7',
    accentColor: '#c084fc',
    rank: 4,
    description: 'Dành cho dân chơi săn PSA/CGC 10 (x4-x5 raw) hoặc PSA/CGC 9 (+30-40%) với jackpot tới $2,000!',
    slabChance: 0.155,
    topJackpot: 2000.0,
  },
  nova: {
    id: 'nova',
    name: 'Nova Pack',
    vietnameseName: 'Gói Siêu Tân Tinh Nova',
    price: 500.0,
    floorPrice: 250.0, // Tối thiểu $250
    imageUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRVMIdFovOlNhrT_2lpO64tO0K8Ll74GcmZGSx-nW32IQ&s=10',
    themeColor: '#06b6d4',
    accentColor: '#22d3ee',
    rank: 5,
    description: 'Năng lượng vũ trụ săn Slab PSA/CGC 10 (x4-x5 giá raw), nổ hũ lên tới $4,500!',
    slabChance: 0.155,
    topJackpot: 4500.0,
  },
  void: {
    id: 'void',
    name: 'Void Pack',
    vietnameseName: 'Gói Hư Vô Void',
    price: 1000.0,
    floorPrice: 500.0, // Tối thiểu $500
    imageUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSJtaxIHHgO-vI5jsPnUA6yMH5ZoqBWe1Hcf3qwUhXb1w&s=10',
    themeColor: '#4338ca',
    accentColor: '#6366f1',
    rank: 6,
    description: 'Hố đen hư vô chứa các siêu phẩm vintage & cơ hội lên PSA/CGC 10 nhân 4-5 lần giá trị raw!',
    slabChance: 0.155,
    topJackpot: 9000.0,
  },
  crown: {
    id: 'crown',
    name: 'Crown Pack',
    vietnameseName: 'Gói Vương Miện Hoàng Gia',
    price: 2500.0,
    floorPrice: 1250.0, // Tối thiểu $1,250
    imageUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRXBrMu6XMvSlqvye08NlXrFfedSgl7eVO_VTeDkWFwPA&s=10',
    themeColor: '#ca8a04',
    accentColor: '#facc15',
    rank: 7,
    description: 'Vương miện hoàng gia dành cho các Whale! Săn Charizard Gold, Masaki Gengar lên PSA/CGC 10 x4-x5 giá raw!',
    slabChance: 0.155,
    topJackpot: 20000.0,
  },
  grail: {
    id: 'grail',
    name: 'Grail Pack',
    vietnameseName: 'Gói Chén Thánh Tối Thượng',
    price: 5000.0,
    floorPrice: 2500.0, // Tối thiểu $2,500
    imageUrl: 'https://jup.ag/images/gacha/jupiter-grail.webp',
    themeColor: '#db2777',
    accentColor: '#f472b6',
    rank: 8,
    description: 'Bảo vật tối thượng của thế giới TCG! Cơ hội rinh về Grail lên PSA/CGC 10 nhân 4-5 lần giá raw!',
    slabChance: 0.155,
    topJackpot: 35000.0,
  },
};

let cachedGachaSortedCards: PokemonCard[] | null = null;
function getGachaSortedCards(): PokemonCard[] {
  if (!cachedGachaSortedCards) {
    cachedGachaSortedCards = POKEMON_CARDS_DB.filter(
      (c) => c.raritySymbol !== '⚡30TH' && !c.rarityLabel.startsWith('Pikachu 30th')
    ).sort((a, b) => a.marketPrice - b.marketPrice);
  }
  return cachedGachaSortedCards;
}

/**
 * Roll Gacha / Mystery Box Pack (supports Floor 1 Pokemon & Floor 2 Devil Fruit One Piece)
 */
export function rollGachaPack(packTierId: string, rng: () => number = Math.random): GachaPullResult {
  const cleanTier = (packTierId || '').replace(/^gacha_/, '');
  if (cleanTier in OP_GACHA_PACK_TIERS || packTierId.startsWith('op_') || packTierId.startsWith('gacha_op_')) {
    return rollOnePieceGachaPack(cleanTier, rng);
  }
  const pack = GACHA_PACK_TIERS[cleanTier] || GACHA_PACK_TIERS.silver;
  const rand = rng();

  let rawMultiplier = 0.5; // Default minimum floor (50% return)
  let isJackpot = false;

  if (rand < 0.35) {
    // 35% chance: Lower floor tier (0.50x to 0.75x)
    rawMultiplier = 0.5 + rng() * 0.25;
  } else if (rand < 0.68) {
    // 33% chance: Break-even / near cost (0.80x to 1.15x)
    rawMultiplier = 0.8 + rng() * 0.35;
  } else if (rand < 0.88) {
    // 20% chance: Nice profit (1.25x to 2.5x)
    rawMultiplier = 1.25 + rng() * 1.25;
  } else if (rand < 0.97) {
    // 9% chance: Big Hit (3.0x to 6.0x)
    rawMultiplier = 3.0 + rng() * 3.0;
    isJackpot = true;
  } else {
    // 3% chance: MEGA JACKPOT (7.0x to 15.0x)
    rawMultiplier = 7.0 + rng() * 8.0;
    isJackpot = true;
  }

  // Raw base card value (never drops below 50% floor)
  const rawPrice = Math.max(pack.floorPrice, Math.round(pack.price * rawMultiplier));

  // Pick suitable card from DB close to rawPrice via binary search
  const sortedCards = getGachaSortedCards();
  let lo = 0;
  let hi = sortedCards.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (sortedCards[mid].marketPrice < rawPrice) lo = mid + 1;
    else hi = mid;
  }
  let bestCard = sortedCards[lo];
  if (lo > 0 && Math.abs(sortedCards[lo - 1].marketPrice - rawPrice) < Math.abs(bestCard.marketPrice - rawPrice)) {
    bestCard = sortedCards[lo - 1];
  }

  const slabRoll = rng();
  let isSlab = false;
  let slab: GradedSlab | undefined = undefined;
  let gradeMultiplier = 1.0;

  if (slabRoll < 0.005) {
    isSlab = true;
    const company: 'PSA' | 'CGC' = rng() < 0.5 ? 'PSA' : 'CGC';
    gradeMultiplier = +(4.0 + rng() * 1.0).toFixed(2); // 4.00x - 5.00x
    isJackpot = true;
    slab = {
      company,
      grade: 10,
      gradeLabel: company === 'CGC' ? 'PRISTINE 10' : 'GEM MT 10',
      certNumber: Math.floor(10000000 + rng() * 89999999).toString(),
      year: bestCard.setName.includes('Vintage') ? 1999 : 2024,
    };
  } else if (slabRoll < 0.055) {
    isSlab = true;
    const company: 'PSA' | 'CGC' = rng() < 0.5 ? 'PSA' : 'CGC';
    gradeMultiplier = +(1.3 + rng() * 0.1).toFixed(2); // 1.30x - 1.40x (+30% to +40%)
    slab = {
      company,
      grade: 9,
      gradeLabel: 'MINT 9',
      certNumber: Math.floor(10000000 + rng() * 89999999).toString(),
      year: bestCard.setName.includes('Vintage') ? 1999 : 2024,
    };
  } else if (slabRoll < 0.155) {
    isSlab = true;
    const company: 'PSA' | 'CGC' = rng() < 0.5 ? 'PSA' : 'CGC';
    gradeMultiplier = 1.0; // Ngang giá thẻ raw
    slab = {
      company,
      grade: 8,
      gradeLabel: 'NM-MT 8',
      certNumber: Math.floor(10000000 + rng() * 89999999).toString(),
      year: bestCard.setName.includes('Vintage') ? 1999 : 2024,
    };
  }

  const finalPayoutValue = Math.max(pack.floorPrice, Math.round(rawPrice * gradeMultiplier * 100) / 100);
  const finalMultiplier = finalPayoutValue / pack.price;

  const finalCard: PokemonCard = {
    ...bestCard,
    marketPrice: finalPayoutValue,
    hasRgbAura: finalPayoutValue >= 50 || (slab?.grade === 10),
  };

  return {
    card: finalCard,
    isSlab,
    slab,
    rawPrice,
    gradeMultiplier,
    payoutValue: finalPayoutValue,
    multiplier: Math.round(finalMultiplier * 100) / 100,
    isJackpot,
    packId: pack.id,
    packName: pack.name,
  };
}

export interface GameStopMysteryBoxResult {
  boxId: string;
  boxName: string;
  retailPrice: number;
  slabCard: PokemonCard;
  slab: GradedSlab;
  slabMarketValue: number;
  packs: Array<{
    setId: string;
    setName: string;
    packImageUrl: string;
  }>;
  totalMarketValue: number;
}

/**
 * Roll GameStop Pokémon Mystery Box (or Floor 2 Grand Line Bounty Mystery Box)
 */
export function rollGameStopMysteryBox(
  boxId: string,
  rng: () => number = Math.random
): GameStopMysteryBoxResult {
  if (isOnePieceBountyProduct(boxId)) {
    return rollOnePieceBountyBox(boxId, rng);
  }
  const box = GAMESTOP_MYSTERY_SETS[boxId] || GAMESTOP_MYSTERY_SETS.gamestop_mystery_gold;

  // 1. Guaranteed PSA 10 or CGC 10 Slab
  const isPSA = rng() < 0.65;
  const company: 'PSA' | 'CGC' = isPSA ? 'PSA' : 'CGC';
  const grade = 10;
  const gradeLabel = company === 'PSA' ? 'GEM MT 10' : 'PRISTINE 10';
  const certNumber = String(Math.floor(10000000 + rng() * 89999999));
  const year = 2024;

  const slab: GradedSlab = {
    company,
    grade,
    gradeLabel,
    certNumber,
    year,
  };

  // 2. Select card based on box tier:
  // - Gold ($120): card raw price ~$30 - $80 (PSA 10 multiplier 2.5x - 3.5x => $75 - $280)
  // - Charizard ($150): card raw price ~$50 - $140, prioritized Charizard/Fire/Dragon hits
  // - Black ($200): card raw price ~$80 - $250+, ultra rare grail (PSA 10 multiplier => $200 - $850)
  let candidateCards = POKEMON_CARDS_DB.filter(
    (c) => c.raritySymbol !== '⚡30TH' && !c.rarityLabel.startsWith('Pikachu 30th')
  );

  if (boxId === 'gamestop_mystery_charizard') {
    const zards = candidateCards.filter(
      (c) =>
        c.name.toLowerCase().includes('charizard') ||
        c.type === 'Fire' ||
        c.type === 'Dragon'
    );
    if (zards.length > 0) candidateCards = zards;
  }

  let minRaw = 25;
  let maxRaw = 90;
  if (boxId === 'gamestop_mystery_charizard') {
    minRaw = 45;
    maxRaw = 150;
  } else if (boxId === 'gamestop_mystery_black') {
    minRaw = 75;
    maxRaw = 300;
  }

  const tieredCards = candidateCards.filter((c) => c.marketPrice >= minRaw && c.marketPrice <= maxRaw);
  const pool = tieredCards.length > 0 ? tieredCards : candidateCards;
  const rawCard = pool[Math.floor(rng() * pool.length)] || candidateCards[0];

  const slabMultiplier = Math.round((2.4 + rng() * 1.4) * 10) / 10; // 2.4x to 3.8x for PSA/CGC 10
  const slabMarketValue = Math.round(rawCard.marketPrice * slabMultiplier);

  const slabCard: PokemonCard = {
    ...rawCard,
    marketPrice: slabMarketValue,
    hasRgbAura: slabMarketValue >= 80,
    isSlab: true,
    slab,
  };

  // 3. Exactly 2 Random Booster Packs
  const availableSetKeys = [
    'paldeanFates',
    'prismaticEvolutions',
    'evolvingSkies',
    'cosmicEclipse',
    'deltaReign',
    'pokemon30thCommon',
  ];

  const pack1Key = availableSetKeys[Math.floor(rng() * availableSetKeys.length)];
  let pack2Key = availableSetKeys[Math.floor(rng() * availableSetKeys.length)];
  if (pack2Key === pack1Key) {
    pack2Key = availableSetKeys[(availableSetKeys.indexOf(pack1Key) + 1) % availableSetKeys.length];
  }

  const set1 = getBoosterSet(pack1Key);
  const set2 = getBoosterSet(pack2Key);

  const packs = [
    {
      setId: set1.id,
      setName: set1.name,
      packImageUrl: set1.packImageUrl,
    },
    {
      setId: set2.id,
      setName: set2.name,
      packImageUrl: set2.packImageUrl,
    },
  ];

  const totalMarketValue = slabMarketValue + set1.packRetailPrice + set2.packRetailPrice;

  return {
    boxId: box.id,
    boxName: box.name,
    retailPrice: box.boxRetailPrice,
    slabCard,
    slab,
    slabMarketValue,
    packs,
    totalMarketValue,
  };
}

// ==========================================
// 7B. UNIVERSAL STAFF WORKING HOURS (07:00 AM - 10:00 PM / 22:00)
// ==========================================
export const STAFF_WORK_START_HOUR = 7;
export const STAFF_WORK_END_HOUR = 22;
export const CASHIER_UNLOCK_LEVEL = 5;
export const RESTOCKER_UNLOCK_LEVEL = 10;
export const OFFICE_STAFF_UNLOCK_LEVEL = 20;
export const OFFICE_STAFF_WAGE = 22; // $22/hour for Office Staff in Manager Office
export const LIVE_STREAMER_UNLOCK_LEVEL = 6;
export const LIVE_STREAMER_WAGE = 20; // $20/hour for Livestream Studio Host
export const LIVE_STUDIO_BUILD_LEVEL = 6;
export const LIVE_STUDIO_BUILD_COST = 650;

export type StaffRole =
  | 'cashier'
  | 'restocker'
  | 'officeStaff'
  | 'liveStreamer'
  | 'gradingReceptionist'
  | 'gradingSpecialists'
  | 'auctioneer'
  | 'auctionHost';

export function getStaffUnlockLevel(role: StaffRole): number {
  switch (role) {
    case 'cashier':
      return CASHIER_UNLOCK_LEVEL;
    case 'restocker':
      return RESTOCKER_UNLOCK_LEVEL;
    case 'liveStreamer':
      return LIVE_STREAMER_UNLOCK_LEVEL;
    case 'officeStaff':
      return OFFICE_STAFF_UNLOCK_LEVEL;
    case 'gradingReceptionist':
    case 'gradingSpecialists':
    case 'auctioneer':
    case 'auctionHost':
      return GRADING_SHOP_UNLOCK_LEVEL;
  }
}

export function isStaffWorkingHours(inGameHour: number, inGameMinute: number = 0): boolean {
  const raw = (((inGameHour || 0) + (inGameMinute || 0) / 60) % 24 + 24) % 24;
  return raw >= STAFF_WORK_START_HOUR && raw < STAFF_WORK_END_HOUR;
}

export const AUCTION_OPEN_HOUR = 9; // 09:00 AM Showroom opens
export const AUCTION_CLOSE_HOUR = 22; // 22:00 PM Showroom closes
export const AUCTION_PRIME_START_HOUR = 18; // 18:00 - 22:00 Prime VIP Whale Rush (+15% ceiling)
export const AUCTIONEER_WAGE = 35; // $35/hour
export const AUCTION_HOST_WAGE = 40; // $40/hour
export const AUCTION_BROKER_COMMISSION_RATE = 0.18; // 18% brokerage fee on VIP consignment lots

export interface AuctionShowroomSchedule {
  isOpen: boolean;
  isPrimeTime: boolean;
  rawHour: number;
  scheduleLabel: string;
  primeLabel: string;
  statusLabel: string;
}

export function getAuctionShowroomSchedule(
  inGameHour: number,
  inGameMinute: number = 0
): AuctionShowroomSchedule {
  const rawHour = (((inGameHour || 0) + (inGameMinute || 0) / 60) % 24 + 24) % 24;
  const isOpen = rawHour >= AUCTION_OPEN_HOUR && rawHour < AUCTION_CLOSE_HOUR;
  const isPrimeTime = rawHour >= AUCTION_PRIME_START_HOUR && rawHour < AUCTION_CLOSE_HOUR;
  return {
    isOpen,
    isPrimeTime,
    rawHour,
    scheduleLabel: '09:00 – 22:00',
    primeLabel: '18:00 – 22:00',
    statusLabel: !isOpen
      ? 'ĐÃ ĐÓNG CỬA (MỞ 09:00–22:00)'
      : isPrimeTime
      ? 'GIỜ VÀNG ĐẠI GIA (+15% TRẦN BID)'
      : 'ĐANG MỞ CỬA (09:00–22:00)',
  };
}

export interface AutoWholesaleOrderSelection {
  parcel: DeliveryParcel;
  totalCost: number;
  item: InventoryItem;
  orderCount: number;
}

/**
 * Office Staff auto-order selector:
 * Picks the highest-priority low-stock licensed & shelf-ready product the player can afford,
 * deducts exact wholesale cost from player cash, and creates a DeliveryParcel outside the shop
 * for the Restocker NPC to carry in and place onto shelves.
 */
export function pickNextAutoWholesaleOrder(state: {
  cash: number;
  storeLevel: number;
  inventory: InventoryItem[];
  purchasedLicenses?: string[];
  unlockedShelves?: string[];
  pendingDeliveries: DeliveryParcel[];
}): AutoWholesaleOrderSelection | null {
  const pending = state.pendingDeliveries || [];
  if (pending.length >= 6) return null;

  const allLicenses = [...PRODUCT_LICENSES, ...ONEPIECE_PRODUCT_LICENSES];
  const candidates: Array<{
    item: InventoryItem;
    orderCount: number;
    totalCost: number;
    effectiveTotal: number;
  }> = [];

  for (const item of state.inventory || []) {
    if (!item || !item.productId) continue;

    // 1. Must be allowed onto currently unlocked shelves
    const canStock = canStockProductOnUnlockedShelves(
      state.inventory,
      item.productId,
      state.unlockedShelves
    );
    if (!canStock.allowed) continue;

    // 2. Must meet level + license requirement
    const licDef = allLicenses.find(
      (l) => l.productId === item.productId || l.id === item.productId
    );
    if (licDef) {
      if ((state.storeLevel || 1) < licDef.level) continue;
      if (!hasProductLicense(state.purchasedLicenses, item.productId)) continue;
    } else if (isGameStopMysteryProduct(item.productId)) {
      if ((state.storeLevel || 1) < 8) continue;
    } else if (item.productId.startsWith('gacha_')) {
      if ((state.storeLevel || 1) < 7) continue;
    } else if (!hasProductLicense(state.purchasedLicenses, item.productId)) {
      continue;
    }

    // 3. Check if stock (warehouse + already ordered parcels) is low relative to shelf target
    const isCollector =
      isCollectorBoxProduct(item.productId) || isOnePieceCollectorProduct(item.productId);
    const targetShelf = isCollector
      ? COLLECTOR_MAX_BOXES_PER_SHELF
      : item.type === 'pack'
      ? 8
      : 6;

    const pendingQty = pending
      .filter((p) => p.productId === item.productId)
      .reduce((sum, p) => sum + (p.remainingItems || p.totalItems || 0), 0);
    const effectiveTotal = (item.quantity || 0) + pendingQty;

    if (effectiveTotal >= targetShelf + 2) continue;

    // 4. Determine realistic wholesale crate size & check player cash
    const orderCount = isCollector
      ? 2
      : item.type === 'pack' && !item.productId.startsWith('gacha_')
      ? 10
      : item.productId.startsWith('gacha_')
      ? 4
      : (item.wholesaleCost || 0) >= 80
      ? 2
      : 4;

    const unitCost = Number(item.wholesaleCost || 0);
    if (unitCost <= 0) continue;
    const totalCost = Math.round(unitCost * orderCount * 100) / 100;
    if ((state.cash || 0) < totalCost) continue;

    candidates.push({ item, orderCount, totalCost, effectiveTotal });
  }

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => {
    const aEmpty = (a.item.shelvedQuantity || 0) === 0 ? 0 : 1;
    const bEmpty = (b.item.shelvedQuantity || 0) === 0 ? 0 : 1;
    if (aEmpty !== bEmpty) return aEmpty - bEmpty;
    if ((a.item.shelvedQuantity || 0) !== (b.item.shelvedQuantity || 0)) {
      return (a.item.shelvedQuantity || 0) - (b.item.shelvedQuantity || 0);
    }
    if (a.effectiveTotal !== b.effectiveTotal) {
      return a.effectiveTotal - b.effectiveTotal;
    }
    return a.totalCost - b.totalCost;
  });

  const chosen = candidates[0];
  const pId = chosen.item.productId;
  const pType: 'pack' | 'box' = chosen.item.type === 'box' ? 'box' : 'pack';
  const cleanSetId = pId.replace('_pack', '').replace('_box', '');
  const bSet = getBoosterSet(cleanSetId);
  const now = Date.now();

  const parcel: DeliveryParcel = {
    id: 'parcel_auto_' + now.toString(36) + Math.random().toString(36).slice(2, 6),
    orderTime: now,
    productId: pId,
    name: chosen.item.name,
    productName: chosen.item.name,
    type: pType,
    itemType: pType,
    setName: chosen.item.setName || bSet.name,
    totalItems: chosen.orderCount,
    remainingItems: chosen.orderCount,
    wholesaleCost: chosen.item.wholesaleCost,
    retailPrice: chosen.item.retailPrice,
    imageUrl:
      chosen.item.imageUrl || (pType === 'box' ? bSet.boxImageUrl : bSet.packImageUrl),
    themeColor: bSet.themeColor || (pType === 'box' ? '#f59e0b' : '#0284c7'),
  };

  return {
    parcel,
    totalCost: chosen.totalCost,
    item: chosen.item,
    orderCount: chosen.orderCount,
  };
}

// ==========================================
// 8. PSA & CGC TCG CARD GRADING LAB SYSTEM (LEVEL 25+)
// ==========================================
export const GRADING_SHOP_UNLOCK_LEVEL = 25;
export const GRADING_FEE_PER_CARD = 80; // Standard $80 per card
export const GRADING_CLEANING_FEE = 15; // Optional ultrasonic microfiber polish ($15/card)
export const CRACK_REGRADE_FEE = 25; // Precision ultrasonic casing crack fee ($25/card)
export const SLAB_GUARD_FEE = 12; // Protective anodized bumper guard ($12/slab)
export const GRADING_RECEPTIONIST_WAGE = 20; // $20/hour
export const GRADING_SPECIALIST_WAGE = 30; // $30/hour per specialist
export const MAX_GRADING_SPECIALISTS = 4;

export type GradingCompany = 'PSA' | 'CGC' | 'BGS';
export type GradingServiceTierId = 'standard' | 'express' | 'walkthrough';

export interface GradingServiceTierInfo {
  id: GradingServiceTierId;
  name: string;
  badge: string;
  fee: number;
  speedMultiplier: number; // 1.0 = base, 1.85 = faster, 3.0 = fastest
  grade10BonusPct: number; // +0%, +2%, +4%
  xpBonus: number;
  reputationBonus: number;
  description: string;
}

export const GRADING_SERVICE_TIERS: Record<GradingServiceTierId, GradingServiceTierInfo> = {
  standard: {
    id: 'standard',
    name: 'Standard Lab',
    badge: 'TIÊU CHUẨN',
    fee: GRADING_FEE_PER_CARD,
    speedMultiplier: 1.0,
    grade10BonusPct: 0,
    xpBonus: 35,
    reputationBonus: 0,
    description: 'Chấm điểm tiêu chuẩn 4 tiêu chí. Tỉ lệ Grade 10 gốc 8%.',
  },
  express: {
    id: 'express',
    name: 'Express Priority',
    badge: 'NHANH x1.85',
    fee: 135,
    speedMultiplier: 1.85,
    grade10BonusPct: 2,
    xpBonus: 65,
    reputationBonus: 1,
    description: 'Ưu tiên bàn kính hiển vi kỹ thuật số, tốc độ x1.85 và +2% cơ hội Grade 10.',
  },
  walkthrough: {
    id: 'walkthrough',
    name: 'Super Express VIP',
    badge: 'SIÊU TỐC x3.0',
    fee: 220,
    speedMultiplier: 3.0,
    grade10BonusPct: 4,
    xpBonus: 130,
    reputationBonus: 2,
    description: 'Kiểm tra laser 2 lớp bởi chuyên gia trưởng, tốc độ x3.0 và +4% cơ hội Grade 10.',
  },
};

export interface PreGradeInspection {
  cardId: string;
  centering: number;
  corners: number;
  edges: number;
  surface: number;
  centeringRatio: string;
  conditionTag: 'Gem Mint Candidate' | 'Mint Contender' | 'Near Mint' | 'Off-Center / Whitening';
  grade10PotentialPct: number; // 4..16%
  preGradeBonus: number; // -0.03 .. +0.06 probability adjustment
  recommendation: string;
}

export interface GradingRoiAdvice {
  expectedSlabValue: number;
  totalCost: number;
  expectedNetProfit: number;
  breakevenRawPrice: number;
  verdict: 'highly_recommended' | 'profitable' | 'risky';
  summary: string;
}

export interface GradingJob {
  id: string;
  card: PokemonCard;
  sourceType: 'binder' | 'showcase' | 'shelf' | 'op_showcase' | 'op_shelf';
  company: GradingCompany;
  tier?: GradingServiceTierId;
  cleaned?: boolean;
  preGradeBonus?: number;
  feePaid: number;
  submittedAt: number;
  durationMs: number;
  elapsedMs: number;
  status: 'queued' | 'grading' | 'completed';
  resultSlab?: GradedSlab;
  rawPrice: number;
  gradedPrice?: number;
  gradeMultiplier?: number;
}

export interface OwnedGradedSlabEntry {
  id: string;
  card: PokemonCard;
  slab: GradedSlab;
  rawPrice: number;
  gradedPrice: number;
  gradedAt: number;
}

export interface CustomerGradingOrder {
  id: string;
  customerName: string;
  customerRole: 'Collector' | 'Whale' | 'Investor' | 'Trader';
  card: PokemonCard;
  company: GradingCompany;
  tier: GradingServiceTierId;
  customerPaysFee: number;
  labCost: number;
  netProfit: number;
  status: 'waiting_approval' | 'grading' | 'ready_pickup';
  durationMs: number;
  elapsedMs: number;
  createdAt: number;
  resultSlab?: GradedSlab;
  gradedPrice?: number;
}

export interface GradingPopReportEntry {
  cardId: string;
  cardName: string;
  universe: 'pokemon' | 'onepiece';
  psa10: number;
  psa9: number;
  psa8: number;
  psa7: number;
  cgcPristine10: number;
  cgcGem10: number;
  cgc9: number;
  cgc8: number;
  cgc7: number;
  bgsBlack10?: number;
  bgsGold10?: number;
  bgs9_5?: number;
  bgs9?: number;
  bgs8_5?: number;
  bgs8?: number;
}

export interface GradingLabStats {
  totalGraded: number;
  psaCount: number;
  cgcCount: number;
  bgsCount?: number;
  grade10Count: number;
  pristine10Count: number;
  blackLabelCount?: number;
  totalFeesSpent: number;
  totalSlabValueCreated: number;
  customerOrdersCompleted: number;
  customerServiceProfit: number;
  auctionsCompleted?: number;
  auctionProfit?: number;
  consignmentCommissionEarned?: number;
  consignmentLotsCompleted?: number;
  buybackSnipes?: number;
  bestSlabCardName?: string;
  bestSlabLabel?: string;
  bestSlabValue?: number;
}

export interface GradingSpeedStats {
  specialistsCount: number;
  maxConcurrent: number;
  maxQueue: number;
  secondsPerCard: number;
  speedLabel: string;
}

export interface GraderResearchBrief {
  id: string;
  category: 'PSA Standard' | 'CGC Standard' | 'BGS Black Label' | 'ROI & Chiến Lược' | 'Bảo Quản & Vệ Sinh';
  title: string;
  highlightMetric: string;
  summary: string;
  detail: string;
}

export const GRADER_RESEARCH_BRIEFS: GraderResearchBrief[] = [
  {
    id: 'psa_centering_standard',
    category: 'PSA Standard',
    title: 'Quy chuẩn PSA 10 Gem Mint (55/45 Centering)',
    highlightMetric: '8% Base · x2.80 Giá trị',
    summary: 'PSA ưu tiên độ cân tâm mặt trước ≤ 55/45 và 4 góc sắc nét dưới ánh sáng 10x.',
    detail:
      'Trên thị trường sưu tầm, hộp PSA nhãn đỏ (8 số Cert) có thanh khoản cao nhất đối với thẻ Vintage Pokémon và Chase Card hiện đại. PSA 9 (x1.35) là mức phổ biến cho thẻ mới bóc pack (Pack Fresh).',
  },
  {
    id: 'cgc_pristine_black_gold',
    category: 'CGC Standard',
    title: 'CGC Pristine 10 Black & Gold Label',
    highlightMetric: '2% Pristine · x3.40 Giá trị',
    summary: 'CGC tách bạch giữa CGC 10 Gem Mint (6%) và CGC 10 Pristine nhãn Đen-Vàng (2%).',
    detail:
      'Để đạt CGC Pristine 10, thẻ gần như phải đạt điểm 10 ở cả 4 tiêu chí (Centering, Corners, Edges, Surface). Giá trị thị trường của CGC Pristine 10 vượt cả PSA 10 truyền thống (x3.40 giá Raw).',
  },
  {
    id: 'bgs_black_label_quad10',
    category: 'BGS Black Label',
    title: 'Beckett (BGS) Black Label 10 · Tứ Quý 10.0',
    highlightMetric: '0.6% Black Label · x5.20 Giá trị',
    summary: 'Đỉnh cao tối thượng của thế giới TCG: cả 4 Subgrades CTR/CRN/EDG/SRF đều phải đạt 10.0 tuyệt đối.',
    detail:
      'BGS phân tách khắt khe từ BGS 9.5 Gem Mint (x2.15), BGS 10 Pristine Gold (x3.60) đến BGS Black Label 10 (x5.20). Chỉ nên gửi thẻ có nhãn "Gem Mint Candidate" (50/50 Centering) qua gói Express hoặc VIP + Vệ sinh UV.',
  },
  {
    id: 'crack_regrade_crossover',
    category: 'ROI & Chiến Lược',
    title: 'Chiến thuật Crack & Re-Grade / Crossover & Đấu Giá VIP',
    highlightMetric: 'Đấu Giá x1.20–1.65 · Cert Đẹp +15%',
    summary: 'Có thể đập hộp PSA 9 / BGS 9.5 chấm lại săn Grade 10 hoặc mang Grail lên Sàn Đấu Giá VIP.',
    detail:
      'Thuê đủ 4 Chuyên gia giúp giảm rủi ro trầy mép khi đập hộp xuống chỉ còn 6%. Các Slab đạt Grade 10 / Pristine 10 / Black Label khi đưa vào Sàn Đấu Giá Showroom sẽ thu hút các đại gia cạnh tranh giá lên tới 165% thị trường.',
  },
  {
    id: 'roi_breakeven_math',
    category: 'ROI & Chiến Lược',
    title: 'Ngưỡng hòa vốn (Breakeven) khi gửi chấm $80',
    highlightMetric: 'EV Dương ≥ $225 · Săn 10 ≥ $58',
    summary: 'Không nên gửi chấm thẻ Raw giá dưới $55 trừ khi là thẻ kỷ niệm cá nhân.',
    detail:
      'Với phí Standard $80/thẻ: để có +EV chắc chắn ở mức trung bình, thẻ Raw cần từ ~$225 trở lên. Với thẻ $58–$220, hãy soi Kính Lúp 10x chọn nhãn "Gem Mint Candidate" + Vệ sinh UV ($15) để tối ưu cơ hội Grade 10 (x2.8–x5.2 giá).',
  },
  {
    id: 'surface_ultrasonic_prep',
    category: 'Bảo Quản & Vệ Sinh',
    title: 'Vệ Sinh UV, Slab Guard & Săn Số Cert Đẹp',
    highlightMetric: '+2.5% G10 · +5% Guard · +15% Cert',
    summary: 'Vệ sinh UV loại bỏ vết mờ bề mặt; gắn viền Slab Guard & giữ số Cert lặp/tiến giúp tăng giá đấu giá.',
    detail:
      'Chi $15 vệ sinh Microfiber + UV nâng điểm Surface rõ rệt. Các số Cert hiếm (tứ quý, số tiến 12345, đuôi 0000/7777/8888) và viền bảo vệ Slab Guard ($12) được các đại gia săn đón với giá cao hơn hẳn.',
  },
];

export function getGradingSpeedStats(specialistsCount: number): GradingSpeedStats {
  const count = Math.max(0, Math.min(MAX_GRADING_SPECIALISTS, Math.floor(specialistsCount || 0)));
  if (count === 0) {
    return {
      specialistsCount: 0,
      maxConcurrent: 0,
      maxQueue: 0,
      secondsPerCard: 0,
      speedLabel: 'Chưa thuê chuyên gia thẩm định',
    };
  }
  const secondsTable = [0, 24, 14, 9, 5];
  const queueTable = [0, 3, 6, 9, 12];
  const seconds = secondsTable[count] || 5;
  return {
    specialistsCount: count,
    maxConcurrent: count,
    maxQueue: queueTable[count] || count * 3,
    secondsPerCard: seconds,
    speedLabel: `${count} chuyên gia · ${count} luồng song song · ${seconds}s / thẻ`,
  };
}

export function findAnyRawCardById(cardId: string): PokemonCard | undefined {
  return (
    POKEMON_CARDS_DB.find((c) => c.id === cardId) ||
    ONEPIECE_CARDS_DB.find((c) => c.id === cardId)
  );
}

function hashSeedString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}

/**
 * 10x Loupe Pre-Grading Inspection for any RAW card.
 * Estimates Centering, Corners, Edges, Surface & Grade 10 likelihood deterministically from card+slot key.
 */
export function inspectRawCardForGrading(card: PokemonCard, seedKey?: string): PreGradeInspection {
  const s1 = hashSeedString(`${card.id}:${seedKey || 'binder'}:c`);
  const s2 = hashSeedString(`${card.id}:${seedKey || 'binder'}:k`);
  const s3 = hashSeedString(`${card.id}:${seedKey || 'binder'}:e`);
  const s4 = hashSeedString(`${card.id}:${seedKey || 'binder'}:s`);

  const snapHalf = (v: number) => Math.max(7.0, Math.min(10.0, Math.round(v * 2) / 2));

  // Higher rarity / newer cards skew slightly cleaner out of pack
  const priceBoost = (card.marketPrice || 0) >= 80 ? 0.35 : (card.marketPrice || 0) >= 25 ? 0.15 : 0;

  const centering = snapHalf(7.8 + s1 * 2.3 + priceBoost * 0.4);
  const corners = snapHalf(7.8 + s2 * 2.3 + priceBoost * 0.4);
  const edges = snapHalf(7.9 + s3 * 2.2 + priceBoost * 0.3);
  const surface = snapHalf(7.7 + s4 * 2.4 + priceBoost * 0.4);

  const avg = (centering + corners + edges + surface) / 4;
  const frontLeft = Math.round(50 + (10 - centering) * 3.8);
  const frontRight = 100 - frontLeft;
  const topBot = Math.round(50 + (10 - centering) * 2.5);
  const centeringRatio = `${frontLeft}/${frontRight} · ${topBot}/${100 - topBot}`;

  let conditionTag: PreGradeInspection['conditionTag'] = 'Near Mint';
  let preGradeBonus = 0;
  let grade10PotentialPct = 8;
  let recommendation = 'Thẻ đạt chuẩn Near Mint–Mint. Tỷ lệ PSA/CGC 10 ở mức tiêu chuẩn (~8%).';

  if (avg >= 9.6 && Math.min(centering, corners, edges, surface) >= 9.5) {
    conditionTag = 'Gem Mint Candidate';
    preGradeBonus = 0.05;
    grade10PotentialPct = 13;
    recommendation = 'Ứng viên Gem Mint 10 sáng giá! Góc cạnh sắc nét, tâm thẻ cân đều.';
  } else if (avg >= 9.0) {
    conditionTag = 'Mint Contender';
    preGradeBonus = 0.02;
    grade10PotentialPct = 10;
    recommendation = 'Tiềm năng cao đạt Grade 9–10. Rất phù hợp gửi Express hoặc vệ sinh bề mặt.';
  } else if (avg < 8.3) {
    conditionTag = 'Off-Center / Whitening';
    preGradeBonus = -0.025;
    grade10PotentialPct = 5.5;
    recommendation = 'Viền hơi lệch hoặc có chấm trắng nhẹ ở góc. Cân nhắc kỹ trước khi chi $80.';
  }

  return {
    cardId: card.id,
    centering,
    corners,
    edges,
    surface,
    centeringRatio,
    conditionTag,
    grade10PotentialPct,
    preGradeBonus,
    recommendation,
  };
}

export function getGradingCardRoiAdvice(
  rawPrice: number,
  company: GradingCompany,
  tier: GradingServiceTierId = 'standard',
  grade10ChancePct: number = 8,
  includeCleaning: boolean = false
): GradingRoiAdvice {
  const safeRaw = Math.max(0.5, rawPrice || 1);
  const tierInfo = GRADING_SERVICE_TIERS[tier] || GRADING_SERVICE_TIERS.standard;
  const totalCost = tierInfo.fee + (includeCleaning ? GRADING_CLEANING_FEE : 0);

  const p10 = Math.max(0.03, Math.min(0.24, (grade10ChancePct + tierInfo.grade10BonusPct + (includeCleaning ? 2.5 : 0)) / 100));
  const p9 = 0.34;
  const p8 = 0.38;
  const p7 = Math.max(0, 1 - p10 - p9 - p8);

  const m10 = company === 'BGS' ? 3.9 : 2.8;
  const m9 = company === 'BGS' ? 1.85 : company === 'CGC' ? 1.3 : 1.35;
  const m8 = company === 'BGS' ? 1.15 : 1.05;
  const m7 = 0.85;

  const expectedMultiplier = p10 * m10 + p9 * m9 + p8 * m8 + p7 * m7;
  const expectedSlabValue = Number((safeRaw * expectedMultiplier).toFixed(2));
  const expectedNetProfit = Number((expectedSlabValue - safeRaw - totalCost).toFixed(2));
  const gainPerDollar = Math.max(0.15, expectedMultiplier - 1);
  const breakevenRawPrice = Math.ceil(totalCost / gainPerDollar);

  let verdict: GradingRoiAdvice['verdict'] = 'risky';
  let summary = `Thẻ Raw dưới ngưỡng hòa vốn (~$${breakevenRawPrice}). Phí chấm cao hơn mức tăng giá trị kỳ vọng.`;
  if (expectedNetProfit >= 25) {
    verdict = 'highly_recommended';
    summary = `Kèo rất thơm (+$${expectedNetProfit.toFixed(0)} kỳ vọng)! Giá Raw vượt xa ngưỡng hòa vốn $${breakevenRawPrice}.`;
  } else if (expectedNetProfit >= 0) {
    verdict = 'profitable';
    summary = `Có lãi kỳ vọng (+$${expectedNetProfit.toFixed(0)}). Đạt Grade 9.5–10 sẽ sinh lời tốt.`;
  }

  return {
    expectedSlabValue,
    totalCost,
    expectedNetProfit,
    breakevenRawPrice,
    verdict,
    summary,
  };
}

function buildSubgradesForGrade(
  grade: number,
  gradeLabel: string,
  rng: () => number,
  cleaned: boolean = false
): CardSubgrades {
  const snapHalf = (v: number) => Math.max(6.5, Math.min(10.0, Math.round(v * 2) / 2));
  const isBlackLabel = gradeLabel.includes('BLACK LABEL');
  const isPristine = gradeLabel.includes('PRISTINE');

  let centering = 9.0;
  let corners = 9.0;
  let edges = 9.0;
  let surface = 9.0;
  let centeringRatio = '54/46 · 52/48';
  let notes = 'Thẻ bảo quản tốt, độ bóng holo đều màu.';

  if (grade === 10 && isBlackLabel) {
    centering = 10;
    corners = 10;
    edges = 10;
    surface = 10;
    centeringRatio = '50/50 · 50/50';
    notes = 'HUYỀN THOẠI BGS BLACK LABEL! Đạt điểm 10.0 tuyệt đối cả 4 tiêu chí dưới máy quét quang học.';
  } else if (grade === 10 && isPristine) {
    centering = 10;
    corners = 10;
    edges = 10;
    surface = rng() < 0.75 ? 10 : 9.5;
    centeringRatio = '50/50 · 50/50';
    notes = 'Hoàn mỹ tuyệt đối cả 4 tiêu chí! Không tì vết dưới kính hiển vi UV 10x.';
  } else if (grade === 10) {
    centering = rng() < 0.6 ? 10 : 9.5;
    corners = rng() < 0.75 ? 10 : 9.5;
    edges = rng() < 0.75 ? 10 : 9.5;
    surface = cleaned || rng() < 0.75 ? 10 : 9.5;
    centeringRatio = centering === 10 ? '51/49 · 50/50' : '53/47 · 52/48';
    notes = 'Đạt chuẩn Gem Mint 10! Bốn góc sắc bén, cân tâm hoàn hảo trong ngưỡng 55/45.';
  } else if (grade === 9.5) {
    centering = snapHalf(9.5 + (rng() < 0.35 ? 0.5 : 0));
    corners = snapHalf(9.5 + (rng() < 0.4 ? 0.5 : 0));
    edges = 9.5;
    surface = cleaned || rng() < 0.45 ? 10 : 9.0;
    centeringRatio = '52/48 · 51/49';
    notes = 'BGS 9.5 Gem Mint: Rất sát chuẩn 10, chỉ hụt 0.5 điểm ở 1–2 tiêu chí phụ.';
  } else if (grade === 9) {
    centering = snapHalf(8.5 + rng() * 1.5);
    corners = snapHalf(8.5 + rng() * 1.0);
    edges = snapHalf(8.5 + rng() * 1.5);
    surface = snapHalf((cleaned ? 9.0 : 8.5) + rng() * 1.0);
    centeringRatio = centering >= 9.5 ? '54/46 · 53/47' : '57/43 · 55/45';
    notes = 'Mint 9: Có một chấm trắng siêu nhỏ ở mép sau hoặc lệch tâm nhẹ so với chuẩn 10.';
  } else if (grade >= 8) {
    centering = snapHalf(7.5 + rng() * 1.5);
    corners = snapHalf(7.5 + rng() * 1.5);
    edges = snapHalf(7.5 + rng() * 1.5);
    surface = snapHalf((cleaned ? 8.5 : 7.5) + rng() * 1.5);
    centeringRatio = '60/40 · 58/42';
    notes = 'NM-MT 8/8.5: Viền có vết mòn nhẹ hoặc bề mặt có đường print-line mờ khi soi nghiêng.';
  } else {
    centering = snapHalf(7.0 + rng() * 1.5);
    corners = snapHalf(6.5 + rng() * 1.5);
    edges = snapHalf(7.0 + rng() * 1.5);
    surface = snapHalf(7.0 + rng() * 1.5);
    centeringRatio = '64/36 · 61/39';
    notes = 'Near Mint 7: Cạnh hơi xước trắng hoặc lệch tâm rõ rệt, phù hợp giữ sưu tầm.';
  }

  return {
    centering,
    corners,
    edges,
    surface,
    centeringRatio,
    notes,
  };
}

export function evaluateFancyCert(certNumber: string): boolean {
  if (!certNumber || certNumber.length < 6) return false;
  if (/(.)\1{4,}/.test(certNumber)) return true; // 5+ repeating identical digits (e.g. 77777)
  if (/0{4,}$|7{4,}$|8{4,}$|9{4,}$/.test(certNumber)) return true; // Repeating trophy suffix
  if (certNumber.includes('12345') || certNumber.includes('67890') || certNumber.includes('54321')) return true;
  const rev = certNumber.split('').reverse().join('');
  if (rev === certNumber) return true; // Radar / Palindrome cert
  return false;
}

export interface RollGradingOptions {
  tier?: GradingServiceTierId;
  cleaned?: boolean;
  preGradeBonus?: number;
}

/**
 * Rolls PSA, CGC or BGS grading outcome from a RAW Pokémon or One Piece card.
 * Strict base Grade 10 probability for PSA/CGC: 8% total (within the 5% - 10% target band).
 * - PSA: 8% PSA 10 (x2.8), 34% PSA 9 (x1.35), 38% PSA 8 (x1.05), 20% PSA 7 (x0.85)
 * - CGC: 2% CGC 10 PRISTINE (x3.4) + 6% CGC 10 GEM MINT (x2.6), 34% CGC 9 (x1.30), 38% CGC 8 (x1.05), 20% CGC 7 (x0.85)
 * - BGS: 0.6% BLACK LABEL 10 (x5.2), 1.4% PRISTINE 10 (x3.6), 6% GEM MINT 9.5 (x2.15), 34% MINT 9 (x1.28), 38% NM-MT+ 8.5 (x1.02), 20% NM-MT 8 (x0.85)
 */
export function rollGradingResult(
  card: PokemonCard,
  company: GradingCompany,
  rng: () => number = Math.random,
  options?: RollGradingOptions
): {
  slab: GradedSlab;
  gradeMultiplier: number;
  rawPrice: number;
  gradedPrice: number;
} {
  const tierInfo = options?.tier ? GRADING_SERVICE_TIERS[options.tier] : undefined;
  const tierBonus = tierInfo ? tierInfo.grade10BonusPct / 100 : 0;
  const cleanBonus = options?.cleaned ? 0.025 : 0;
  const preBonus = options?.preGradeBonus || 0;
  const grade10Cutoff = Math.max(0.04, Math.min(0.24, 0.08 + tierBonus + cleanBonus + preBonus));
  const grade9Cutoff = Math.min(0.65, grade10Cutoff + 0.34);
  const grade8Cutoff = Math.min(0.9, grade9Cutoff + 0.38);

  const r = rng();
  let grade = 8;
  let gradeLabel = 'NM-MT 8';
  let gradeMultiplier = 1.05;

  if (company === 'CGC') {
    const pristineCutoff = grade10Cutoff * 0.25; // 2% at base 8%
    if (r < pristineCutoff) {
      grade = 10;
      gradeLabel = 'PRISTINE 10';
      gradeMultiplier = 3.4;
    } else if (r < grade10Cutoff) {
      grade = 10;
      gradeLabel = 'GEM MINT 10';
      gradeMultiplier = 2.6;
    } else if (r < grade9Cutoff) {
      grade = 9;
      gradeLabel = 'MINT 9';
      gradeMultiplier = 1.3;
    } else if (r < grade8Cutoff) {
      grade = 8;
      gradeLabel = 'NM/M 8';
      gradeMultiplier = 1.05;
    } else {
      grade = 7;
      gradeLabel = 'NM 7';
      gradeMultiplier = 0.85;
    }
  } else if (company === 'BGS') {
    const blackLabelCutoff = grade10Cutoff * 0.075; // 0.6% at base 8%
    const bgsGold10Cutoff = grade10Cutoff * 0.25; // 2.0% combined Grade 10 at base 8%
    if (r < blackLabelCutoff) {
      grade = 10;
      gradeLabel = 'BLACK LABEL 10';
      gradeMultiplier = 5.2;
    } else if (r < bgsGold10Cutoff) {
      grade = 10;
      gradeLabel = 'PRISTINE 10';
      gradeMultiplier = 3.6;
    } else if (r < grade10Cutoff) {
      grade = 9.5;
      gradeLabel = 'GEM MINT 9.5';
      gradeMultiplier = 2.15;
    } else if (r < grade9Cutoff) {
      grade = 9;
      gradeLabel = 'MINT 9';
      gradeMultiplier = 1.28;
    } else if (r < grade8Cutoff) {
      grade = 8.5;
      gradeLabel = 'NM-MT+ 8.5';
      gradeMultiplier = 1.02;
    } else {
      grade = 8;
      gradeLabel = 'NM-MT 8';
      gradeMultiplier = 0.85;
    }
  } else {
    if (r < grade10Cutoff) {
      grade = 10;
      gradeLabel = 'GEM MT 10';
      gradeMultiplier = 2.8;
    } else if (r < grade9Cutoff) {
      grade = 9;
      gradeLabel = 'MINT 9';
      gradeMultiplier = 1.35;
    } else if (r < grade8Cutoff) {
      grade = 8;
      gradeLabel = 'NM-MT 8';
      gradeMultiplier = 1.05;
    } else {
      grade = 7;
      gradeLabel = 'NM 7';
      gradeMultiplier = 0.85;
    }
  }

  const certDigits = company === 'PSA' ? 8 : 10;
  let certNumber = '';
  for (let i = 0; i < certDigits; i++) {
    certNumber += Math.floor((i === 0 ? 1 + rng() * 8 : rng() * 10)).toString();
  }

  // Only award themed collector serial on genuine multi-call random RNG (never hijacks constant test RNG)
  const f1 = rng();
  const f2 = rng();
  if (f1 !== f2 && f1 < 0.045) {
    const fancyDigit = ['7', '8', '9'][Math.floor(f2 * 3)] || '8';
    const prefix = Math.floor(10 + f2 * 89).toString();
    certNumber =
      company === 'PSA'
        ? `${prefix}${fancyDigit.repeat(6)}`
        : `${prefix}${fancyDigit.repeat(8)}`;
  }

  const isCertFancy = f1 !== f2 ? evaluateFancyCert(certNumber) : false;
  const rawPrice = Math.max(0.5, card.marketPrice || 1);
  const gradedPrice = Math.max(1, Number((rawPrice * gradeMultiplier).toFixed(2)));
  const subgrades = buildSubgradesForGrade(grade, gradeLabel, rng, Boolean(options?.cleaned));

  return {
    slab: {
      company,
      grade,
      gradeLabel,
      certNumber,
      year: 2026,
      subgrades,
      slabGuardColor: 'none',
      isCertFancy,
    },
    gradeMultiplier,
    rawPrice,
    gradedPrice,
  };
}

/**
 * Advances active grading queue cleanly using the number of hired specialists and per-job service tier speed.
 */
export function advanceGradingQueue(
  jobs: GradingJob[] = [],
  deltaMs: number,
  specialistsCount: number,
  rng: () => number = Math.random,
  speedBonusPct: number = 0
): {
  nextJobs: GradingJob[];
  changed: boolean;
  newlyCompleted: GradingJob[];
} {
  if (!jobs || jobs.length === 0 || specialistsCount <= 0) {
    return { nextJobs: jobs, changed: false, newlyCompleted: [] };
  }

  const speed = getGradingSpeedStats(specialistsCount);
  let activeCount = jobs.filter((j) => j.status === 'grading').length;
  let changed = false;
  const newlyCompleted: GradingJob[] = [];
  const speedBoostMult = 1 + Math.max(0, speedBonusPct) / 100;

  const nextJobs = jobs.map((job) => {
    if (job.status === 'completed') return job;

    const tierInfo = job.tier ? GRADING_SERVICE_TIERS[job.tier] : GRADING_SERVICE_TIERS.standard;
    const targetDurationMs = Math.max(1500, Math.round((speed.secondsPerCard * 1000) / (tierInfo.speedMultiplier * speedBoostMult)));

    let status = job.status;
    let durationMs = job.durationMs;
    let elapsedMs = job.elapsedMs;

    if (status === 'queued' && activeCount < speed.maxConcurrent) {
      status = 'grading';
      durationMs = targetDurationMs;
      elapsedMs = 0;
      activeCount += 1;
      changed = true;
    }

    if (status === 'grading') {
      // If player hired additional specialists mid-job, smoothly scale remaining duration proportionally
      if (durationMs !== targetDurationMs && durationMs > 0) {
        const pct = Math.min(1, elapsedMs / durationMs);
        durationMs = targetDurationMs;
        elapsedMs = pct * targetDurationMs;
      }

      elapsedMs += deltaMs;
      changed = true;

      if (elapsedMs >= durationMs) {
        const outcome = rollGradingResult(job.card, job.company, rng, {
          tier: job.tier,
          cleaned: job.cleaned,
          preGradeBonus: job.preGradeBonus,
        });
        const completedJob: GradingJob = {
          ...job,
          status: 'completed',
          durationMs,
          elapsedMs: durationMs,
          resultSlab: outcome.slab,
          rawPrice: outcome.rawPrice,
          gradedPrice: outcome.gradedPrice,
          gradeMultiplier: outcome.gradeMultiplier,
        };
        newlyCompleted.push(completedJob);
        return completedJob;
      }

      return {
        ...job,
        status,
        durationMs,
        elapsedMs,
      };
    }

    return job;
  });

  return { nextJobs, changed, newlyCompleted };
}

const GRADING_CUSTOMER_NAMES = [
  'Minh Khang',
  'Gia Bảo',
  'Thanh Trúc',
  'Hoàng Nam',
  'Quốc Huy',
  'Bảo Ngọc',
  'Anh Khoa',
  'Thảo Vy',
  'Đức Thịnh',
  'Khánh Linh',
];

export function generateCustomerGradingOrder(
  storeLevel: number,
  rng: () => number = Math.random
): CustomerGradingOrder {
  const highValuePkm = POKEMON_CARDS_DB.filter((c) => (c.marketPrice || 0) >= 35);
  const highValueOp = ONEPIECE_CARDS_DB.filter((c) => (c.marketPrice || 0) >= 25);
  const combinedPool = [...highValuePkm, ...highValueOp];
  const fallbackPool = combinedPool.length > 0 ? combinedPool : POKEMON_CARDS_DB;
  const card = fallbackPool[Math.floor(rng() * fallbackPool.length)];

  const companyRoll = rng();
  const company: GradingCompany = companyRoll < 0.45 ? 'PSA' : companyRoll < 0.8 ? 'CGC' : 'BGS';
  const tierRoll = rng();
  const tier: GradingServiceTierId =
    tierRoll < 0.45 ? 'standard' : tierRoll < 0.82 ? 'express' : 'walkthrough';

  const roles: CustomerGradingOrder['customerRole'][] = ['Collector', 'Whale', 'Investor', 'Trader'];
  const customerRole = roles[Math.floor(rng() * roles.length)];
  const customerName = GRADING_CUSTOMER_NAMES[Math.floor(rng() * GRADING_CUSTOMER_NAMES.length)];

  const baseFee = GRADING_SERVICE_TIERS[tier].fee;
  const serviceMarkup = tier === 'standard' ? 35 : tier === 'express' ? 55 : 95;
  const levelBonus = Math.min(25, Math.max(0, storeLevel - GRADING_SHOP_UNLOCK_LEVEL));
  const customerPaysFee = baseFee + serviceMarkup + levelBonus;
  const labCost = Math.round(baseFee * 0.45);
  const netProfit = customerPaysFee - labCost;

  const durationMs = tier === 'standard' ? 16000 : tier === 'express' ? 10000 : 6000;

  return {
    id: `cust_grade_${Date.now()}_${Math.floor(rng() * 10000)}`,
    customerName,
    customerRole,
    card,
    company,
    tier,
    customerPaysFee,
    labCost,
    netProfit,
    status: 'waiting_approval',
    durationMs,
    elapsedMs: 0,
    createdAt: Date.now(),
  };
}

export function advanceCustomerGradingOrders(
  orders: CustomerGradingOrder[] = [],
  deltaMs: number,
  specialistsCount: number,
  rng: () => number = Math.random
): {
  nextOrders: CustomerGradingOrder[];
  changed: boolean;
  newlyReady: CustomerGradingOrder[];
} {
  if (!orders || orders.length === 0 || specialistsCount <= 0) {
    return { nextOrders: orders, changed: false, newlyReady: [] };
  }

  const speedFactor = 1 + (Math.max(1, specialistsCount) - 1) * 0.35;
  let changed = false;
  const newlyReady: CustomerGradingOrder[] = [];

  const nextOrders = orders.map((order) => {
    if (order.status !== 'grading') return order;
    const nextElapsed = order.elapsedMs + deltaMs * speedFactor;
    changed = true;
    if (nextElapsed >= order.durationMs) {
      const outcome = rollGradingResult(order.card, order.company, rng, { tier: order.tier });
      const readyOrder: CustomerGradingOrder = {
        ...order,
        status: 'ready_pickup',
        elapsedMs: order.durationMs,
        resultSlab: outcome.slab,
        gradedPrice: outcome.gradedPrice,
      };
      newlyReady.push(readyOrder);
      return readyOrder;
    }
    return {
      ...order,
      elapsedMs: nextElapsed,
    };
  });

  return { nextOrders, changed, newlyReady };
}

export function recordGradedSlabIntoStats(
  prevStats: GradingLabStats | undefined,
  prevPop: Record<string, GradingPopReportEntry> | undefined,
  card: PokemonCard,
  slab: GradedSlab,
  gradedPrice: number,
  feePaid: number
): {
  nextStats: GradingLabStats;
  nextPop: Record<string, GradingPopReportEntry>;
} {
  const isBlackLabel = slab.company === 'BGS' && slab.grade >= 10 && slab.gradeLabel.includes('BLACK LABEL');
  const isPristine =
    (slab.company === 'CGC' || slab.company === 'BGS') &&
    slab.grade >= 10 &&
    slab.gradeLabel.includes('PRISTINE');

  const stats: GradingLabStats = {
    totalGraded: (prevStats?.totalGraded || 0) + 1,
    psaCount: (prevStats?.psaCount || 0) + (slab.company === 'PSA' ? 1 : 0),
    cgcCount: (prevStats?.cgcCount || 0) + (slab.company === 'CGC' ? 1 : 0),
    bgsCount: (prevStats?.bgsCount || 0) + (slab.company === 'BGS' ? 1 : 0),
    grade10Count: (prevStats?.grade10Count || 0) + (slab.grade >= 10 ? 1 : 0),
    pristine10Count: (prevStats?.pristine10Count || 0) + (isPristine ? 1 : 0),
    blackLabelCount: (prevStats?.blackLabelCount || 0) + (isBlackLabel ? 1 : 0),
    totalFeesSpent: (prevStats?.totalFeesSpent || 0) + feePaid,
    totalSlabValueCreated: (prevStats?.totalSlabValueCreated || 0) + gradedPrice,
    customerOrdersCompleted: prevStats?.customerOrdersCompleted || 0,
    customerServiceProfit: prevStats?.customerServiceProfit || 0,
    auctionsCompleted: prevStats?.auctionsCompleted || 0,
    auctionProfit: prevStats?.auctionProfit || 0,
    consignmentCommissionEarned: prevStats?.consignmentCommissionEarned || 0,
    consignmentLotsCompleted: prevStats?.consignmentLotsCompleted || 0,
    buybackSnipes: prevStats?.buybackSnipes || 0,
    bestSlabCardName: prevStats?.bestSlabCardName,
    bestSlabLabel: prevStats?.bestSlabLabel,
    bestSlabValue: prevStats?.bestSlabValue,
  };

  if (!stats.bestSlabValue || gradedPrice >= stats.bestSlabValue) {
    stats.bestSlabCardName = card.name;
    stats.bestSlabLabel = `${slab.company} ${slab.gradeLabel}`;
    stats.bestSlabValue = gradedPrice;
  }

  const nextPop: Record<string, GradingPopReportEntry> = { ...(prevPop || {}) };
  const existing = nextPop[card.id] || {
    cardId: card.id,
    cardName: card.name,
    universe: card.universe === 'onepiece' ? 'onepiece' : 'pokemon',
    psa10: 0,
    psa9: 0,
    psa8: 0,
    psa7: 0,
    cgcPristine10: 0,
    cgcGem10: 0,
    cgc9: 0,
    cgc8: 0,
    cgc7: 0,
    bgsBlack10: 0,
    bgsGold10: 0,
    bgs9_5: 0,
    bgs9: 0,
    bgs8_5: 0,
    bgs8: 0,
  };

  const updated: GradingPopReportEntry = {
    bgsBlack10: 0,
    bgsGold10: 0,
    bgs9_5: 0,
    bgs9: 0,
    bgs8_5: 0,
    bgs8: 0,
    ...existing,
  };

  if (slab.company === 'PSA') {
    if (slab.grade >= 10) updated.psa10 += 1;
    else if (slab.grade === 9) updated.psa9 += 1;
    else if (slab.grade === 8) updated.psa8 += 1;
    else updated.psa7 += 1;
  } else if (slab.company === 'BGS') {
    if (isBlackLabel) updated.bgsBlack10 = (updated.bgsBlack10 || 0) + 1;
    else if (slab.grade >= 10) updated.bgsGold10 = (updated.bgsGold10 || 0) + 1;
    else if (slab.grade >= 9.5) updated.bgs9_5 = (updated.bgs9_5 || 0) + 1;
    else if (slab.grade >= 9) updated.bgs9 = (updated.bgs9 || 0) + 1;
    else if (slab.grade >= 8.5) updated.bgs8_5 = (updated.bgs8_5 || 0) + 1;
    else updated.bgs8 = (updated.bgs8 || 0) + 1;
  } else {
    if (slab.grade >= 10 && slab.gradeLabel.includes('PRISTINE')) updated.cgcPristine10 += 1;
    else if (slab.grade >= 10) updated.cgcGem10 += 1;
    else if (slab.grade === 9) updated.cgc9 += 1;
    else if (slab.grade === 8) updated.cgc8 += 1;
    else updated.cgc7 += 1;
  }
  nextPop[card.id] = updated;

  return { nextStats: stats, nextPop };
}

// ==========================================
// 9. SLAB GUARD, CRACK & RE-GRADE, LIVE AUCTION HOUSE, BUYBACK SNIPE & MARKET TRENDS
// ==========================================
export const SLAB_GUARD_OPTIONS: Array<{
  id: SlabGuardColor;
  name: string;
  hex: string;
  bonusLabel: string;
}> = [
  { id: 'gold', name: 'Gold Foil Bumper', hex: '#fbbf24', bonusLabel: '+5% Đấu Giá' },
  { id: 'crimson', name: 'PSA Crimson Bumper', hex: '#ef4444', bonusLabel: '+5% Đấu Giá' },
  { id: 'cyan', name: 'Hyper Cyan Bumper', hex: '#22d3ee', bonusLabel: '+5% Đấu Giá' },
  { id: 'emerald', name: 'Jade Emerald Bumper', hex: '#10b981', bonusLabel: '+5% Đấu Giá' },
  { id: 'obsidian', name: 'Black Label Obsidian', hex: '#3f3f46', bonusLabel: '+5% Đấu Giá' },
];

export interface DailyMarketTrend {
  id: string;
  title: string;
  badge: string;
  description: string;
  target: 'all' | 'pokemon' | 'onepiece' | 'black_label' | 'pristine' | 'fancy_cert';
  bonusPct: number; // e.g., 20 => +20% valuation & auction ceiling
}

export const DAILY_MARKET_TRENDS: DailyMarketTrend[] = [
  {
    id: 'trend_black_label_mania',
    title: 'Cơn Sốt Black Label & Pristine 10',
    badge: '+28% GRAIL',
    description: 'Các Whale săn lùng BGS Black Label 10 & CGC Pristine 10 sẵn sàng trả trần cực cao trên Sàn Đấu Giá.',
    target: 'black_label',
    bonusPct: 28,
  },
  {
    id: 'trend_pokemon_vintage_boom',
    title: 'Sóng Tăng Giá Pokémon Collector',
    badge: '+22% POKÉMON',
    description: 'Thị trường Pokémon TCG bùng nổ thanh khoản, tăng mạnh giá trị mọi Slab Pokémon trong phòng trưng bày.',
    target: 'pokemon',
    bonusPct: 22,
  },
  {
    id: 'trend_onepiece_gear5_fever',
    title: 'Cơn Địa Chấn One Piece Manga & OP',
    badge: '+24% ONE PIECE',
    description: 'Nhà sưu tầm hải tặc đẩy giá Slab One Piece lên đỉnh mới suốt ngày hôm nay.',
    target: 'onepiece',
    bonusPct: 24,
  },
  {
    id: 'trend_cgc_pristine_rush',
    title: 'Làn Sóng Săn Nhãn Đen-Vàng CGC',
    badge: '+24% PRISTINE',
    description: 'CGC Pristine 10 Đen-Vàng đang khan hiếm nguồn cung, tăng mạnh lực mua của các đại gia.',
    target: 'pristine',
    bonusPct: 24,
  },
  {
    id: 'trend_fancy_cert_collectors',
    title: 'Ngày Hội Săn Số Cert Đẹp (Radar / Tứ Quý)',
    badge: '+20% CERT HIẾM',
    description: 'Các Slab sở hữu số Cert lặp hoặc số tiến được cộng thêm giá trị sưu tầm đặc biệt.',
    target: 'fancy_cert',
    bonusPct: 20,
  },
];

export function pickDailyMarketTrend(day: number, rng?: () => number): DailyMarketTrend {
  if (rng) {
    return DAILY_MARKET_TRENDS[Math.floor(rng() * DAILY_MARKET_TRENDS.length)];
  }
  const idx = Math.abs(Math.floor(day || 1)) % DAILY_MARKET_TRENDS.length;
  return DAILY_MARKET_TRENDS[idx];
}

export function getSlabMarketValuation(
  card: PokemonCard,
  slab: GradedSlab,
  baseGradedPrice: number,
  activeTrend?: DailyMarketTrend,
  options?: { marketPulseMultiplier?: number; grailBonusPct?: number }
): {
  effectiveValue: number;
  fancyCertBonusPct: number;
  guardBonusPct: number;
  trendBonusPct: number;
  pulseBonusPct: number;
  grailBonusPct: number;
} {
  const fancyCertBonusPct = slab.isCertFancy || evaluateFancyCert(slab.certNumber) ? 15 : 0;
  const guardBonusPct = slab.slabGuardColor && slab.slabGuardColor !== 'none' ? 5 : 0;
  let trendBonusPct = 0;

  if (activeTrend) {
    const isOp = card.universe === 'onepiece';
    const isBlack = slab.company === 'BGS' && slab.gradeLabel.includes('BLACK LABEL');
    const isPris = slab.grade >= 10 && slab.gradeLabel.includes('PRISTINE');
    if (
      activeTrend.target === 'all' ||
      (activeTrend.target === 'pokemon' && !isOp) ||
      (activeTrend.target === 'onepiece' && isOp) ||
      (activeTrend.target === 'black_label' && (isBlack || isPris)) ||
      (activeTrend.target === 'pristine' && (isPris || slab.grade >= 10)) ||
      (activeTrend.target === 'fancy_cert' && fancyCertBonusPct > 0)
    ) {
      trendBonusPct = activeTrend.bonusPct;
    }
  }

  const pulseMult = options?.marketPulseMultiplier ?? 1;
  const pulseBonusPct = Math.round((pulseMult - 1) * 100);
  const isGrail =
    card.pocketRarity === 'Crown' ||
    card.pocketRarity === 'Star3' ||
    slab.grade >= 10;
  const grailBonusPct = isGrail ? options?.grailBonusPct || 0 : 0;

  const totalFactor =
    (1 + (fancyCertBonusPct + guardBonusPct + trendBonusPct + grailBonusPct) / 100) *
    Math.max(0.5, pulseMult);
  const effectiveValue = Math.max(1, Math.round(baseGradedPrice * totalFactor));
  return {
    effectiveValue,
    fancyCertBonusPct,
    guardBonusPct,
    trendBonusPct,
    pulseBonusPct,
    grailBonusPct,
  };
}

export function crackAndRegradeSlab(params: {
  entry: OwnedGradedSlabEntry;
  targetCompany: GradingCompany;
  tier?: GradingServiceTierId;
  cleanSurface?: boolean;
  specialistsCount: number;
  riskReductionPct?: number;
  rng?: () => number;
}): {
  newEntry: OwnedGradedSlabEntry;
  feePaid: number;
  didDamage: boolean;
  gradeImproved: boolean;
  summary: string;
} {
  const {
    entry,
    targetCompany,
    tier = 'standard',
    cleanSurface = true,
    specialistsCount,
    riskReductionPct = 0,
    rng = Math.random,
  } = params;

  const tierInfo = GRADING_SERVICE_TIERS[tier] || GRADING_SERVICE_TIERS.standard;
  const feePaid = CRACK_REGRADE_FEE + tierInfo.fee + (cleanSurface ? GRADING_CLEANING_FEE : 0);

  // Cracking risk decreases from 18% down to 6% with 4 hired specialists (plus Apple Lab buff)
  const crackRisk = Math.max(
    0.02,
    0.18 - Math.min(4, Math.max(0, specialistsCount)) * 0.03 - Math.max(0, riskReductionPct) / 100
  );
  const didDamage = rng() < crackRisk;

  let prevBonus = 0;
  if (entry.slab.grade >= 10) prevBonus = 0.04;
  else if (entry.slab.grade >= 9.5) prevBonus = 0.03;
  else if (entry.slab.grade >= 9) prevBonus = 0.015;
  else prevBonus = -0.02;

  if (didDamage) {
    prevBonus -= 0.055;
  }

  const rolled = rollGradingResult(entry.card, targetCompany, rng, {
    tier,
    cleaned: cleanSurface,
    preGradeBonus: prevBonus,
  });

  const nextSlab: GradedSlab = {
    ...rolled.slab,
    slabGuardColor: 'none',
    regradedCount: (entry.slab.regradedCount || 0) + 1,
  };

  const gradeImproved =
    rolled.slab.grade > entry.slab.grade ||
    (rolled.slab.grade === entry.slab.grade && rolled.gradedPrice > entry.gradedPrice);

  const summary = didDamage
    ? `⚠️ Khi đập vỏ cũ vô tình xước nhẹ mép thẻ! Kết quả mới: ${targetCompany} ${nextSlab.gradeLabel} ($${rolled.gradedPrice.toLocaleString()}).`
    : gradeImproved
    ? `🚀 CROSSOVER THÀNH CÔNG! Từ ${entry.slab.company} ${entry.slab.gradeLabel} nâng lên ${targetCompany} ${nextSlab.gradeLabel} ($${rolled.gradedPrice.toLocaleString()})!`
    : `🔨 Đã đập hộp & chấm lại: ${targetCompany} ${nextSlab.gradeLabel} ($${rolled.gradedPrice.toLocaleString()}).`;

  return {
    newEntry: {
      ...entry,
      id: `slab_${Date.now()}_${Math.floor(rng() * 10000)}`,
      slab: nextSlab,
      gradedPrice: rolled.gradedPrice,
      gradedAt: Date.now(),
    },
    feePaid,
    didDamage,
    gradeImproved,
    summary,
  };
}

export interface AuctionVipBidder {
  id: string;
  name: string;
  title: string;
  location: string;
  color: string;
}

export const AUCTION_VIP_BIDDERS: AuctionVipBidder[] = [
  { id: 'whale_lm81', name: 'Quốc Vương Landmark 81', title: 'Top 1% Whale', location: 'Landmark 81', color: '#fbbf24' },
  { id: 'whale_porsche', name: 'Đại Gia Porsche Center', title: 'Luxury Collector', location: 'Porsche Showroom', color: '#ef4444' },
  { id: 'whale_casariva', name: 'Nữ Hoàng Casa Riva', title: 'Black Label Hunter', location: 'Casa Riva', color: '#38bdf8' },
  { id: 'whale_vinfast', name: 'Chủ Tịch Ocean Park', title: 'TCG Investor', location: 'Vinhomes 2', color: '#34d399' },
  { id: 'whale_tokyo', name: 'Kaito Tokyo Vault', title: 'International Syndicate', location: 'Global Buyer', color: '#c084fc' },
  { id: 'whale_hotel', name: 'VIP Boutique Hotel', title: 'High Roller', location: 'Boutique Hotel', color: '#fb923c' },
];

export interface AuctionBidEvent {
  id: string;
  bidderName: string;
  bidderLocation: string;
  amount: number;
  isPlayer?: boolean;
  timestamp: number;
}

export interface AuctionConsignmentOffer {
  id: string;
  consignorName: string;
  consignorRole: string;
  entry: OwnedGradedSlabEntry;
  marketValuation: number;
  suggestedStartPrice: number;
  reservePrice: number;
  commissionRate: number;
  estimatedCommission: number;
  arrivedAt: number;
}

export interface SlabAuctionLot {
  id: string;
  entry: OwnedGradedSlabEntry;
  startPrice: number;
  reservePrice: number;
  currentBid: number;
  highestBidderName?: string;
  highestBidderLocation?: string;
  highestBidderIsPlayer?: boolean;
  bidCount: number;
  maxCeilingBid: number;
  durationMs: number;
  remainingMs: number;
  nextBidCooldownMs: number;
  status: 'live' | 'ended';
  startedAt: number;
  bidHistory: AuctionBidEvent[];
  isConsignment?: boolean;
  consignorName?: string;
  consignorRole?: string;
  commissionRate?: number;
}

export interface CompletedAuctionRecord {
  id: string;
  cardName: string;
  gradeLabel: string;
  company: GradingCompany;
  sold: boolean;
  finalPrice: number;
  baseMarketPrice: number;
  buyerName?: string;
  isConsignment?: boolean;
  commissionEarned?: number;
  wonByPlayer?: boolean;
  endedAt: number;
}

export function startSlabAuction(params: {
  entry: OwnedGradedSlabEntry;
  startPrice: number;
  reservePrice: number;
  durationMs?: number;
  storeLevel?: number;
  reputation?: number;
  activeTrend?: DailyMarketTrend;
  auctioneerCount?: number;
  auctionHostCount?: number;
  isPrimeTime?: boolean;
  isConsignment?: boolean;
  consignorName?: string;
  consignorRole?: string;
  commissionRate?: number;
  rng?: () => number;
}): SlabAuctionLot {
  const {
    entry,
    startPrice,
    reservePrice,
    durationMs = 30000,
    storeLevel = 25,
    reputation = 80,
    activeTrend,
    auctioneerCount = 0,
    auctionHostCount = 0,
    isPrimeTime = false,
    isConsignment = false,
    consignorName,
    consignorRole,
    commissionRate = AUCTION_BROKER_COMMISSION_RATE,
    rng = Math.random,
  } = params;

  const val = getSlabMarketValuation(entry.card, entry.slab, entry.gradedPrice, activeTrend);
  const g = entry.slab.grade;
  const label = entry.slab.gradeLabel || '';
  let ceilingFactor = 1.25;
  if (label.includes('BLACK LABEL')) ceilingFactor = 1.62 + rng() * 0.18;
  else if (label.includes('PRISTINE')) ceilingFactor = 1.48 + rng() * 0.18;
  else if (g >= 10) ceilingFactor = 1.35 + rng() * 0.18;
  else if (g >= 9.5) ceilingFactor = 1.26 + rng() * 0.14;
  else if (g >= 9) ceilingFactor = 1.18 + rng() * 0.12;
  else ceilingFactor = 1.08 + rng() * 0.1;

  const repBonus = Math.max(0, (reputation - 50) * 0.002) + Math.max(0, (storeLevel - 25) * 0.015);
  const staffBoost = (auctioneerCount > 0 ? 0.10 : 0) + (auctionHostCount > 0 ? 0.12 : 0);
  const primeBoost = isPrimeTime ? 0.15 : 0;
  const maxCeilingBid = Math.max(
    Math.round(startPrice * 1.15),
    Math.round(val.effectiveValue * (ceilingFactor + repBonus + staffBoost + primeBoost))
  );

  const tempoScale = auctionHostCount > 0 || isPrimeTime ? 0.72 : 1.0;

  return {
    id: `auc_${Date.now()}_${Math.floor(rng() * 10000)}`,
    entry,
    startPrice: Math.max(1, Math.round(startPrice)),
    reservePrice: Math.max(1, Math.round(reservePrice)),
    currentBid: Math.max(1, Math.round(startPrice)),
    highestBidderIsPlayer: false,
    bidCount: 0,
    maxCeilingBid,
    durationMs,
    remainingMs: durationMs,
    nextBidCooldownMs: Math.round((2000 + Math.floor(rng() * 1800)) * tempoScale),
    status: 'live',
    startedAt: Date.now(),
    bidHistory: [],
    isConsignment,
    consignorName,
    consignorRole,
    commissionRate: isConsignment ? commissionRate : undefined,
  };
}

const CONSIGNOR_PROFILES: Array<{ name: string; role: string }> = [
  { name: 'Bác Sĩ Quang Minh', role: 'Nhà Sưu Tầm Thảo Điền' },
  { name: 'Trần Bảo Long', role: 'Đại Gia Landmark 81' },
  { name: 'Trần Gia Vault', role: 'Quỹ Sưu Tầm Sài Gòn' },
  { name: 'Akira Takahashi', role: 'Collector Osaka' },
  { name: 'Phú Quý Hải Phòng', role: 'High-End TCG Broker' },
  { name: 'Lê Hoàng Minh', role: 'Thành Viên VIP Porsche' },
  { name: 'Minh Thư Quận 1', role: 'Hunter BGS Black Label' },
];

export function getAuctionCommissionRate(params?: {
  auctionHostCount?: number;
  isPrimeTime?: boolean;
}): number {
  const hostBonus = (params?.auctionHostCount || 0) > 0 ? 0.02 : 0;
  const primeBonus = params?.isPrimeTime ? 0.02 : 0;
  return Number((AUCTION_BROKER_COMMISSION_RATE + hostBonus + primeBonus).toFixed(2));
}

export function generateAuctionConsignmentOffer(params: {
  activeTrend?: DailyMarketTrend;
  auctionHostCount?: number;
  isPrimeTime?: boolean;
  rng?: () => number;
}): AuctionConsignmentOffer {
  const {
    activeTrend,
    auctionHostCount = 0,
    isPrimeTime = false,
    rng = Math.random,
  } = params;

  const pkmHigh = POKEMON_CARDS_DB.filter((c) => (c.marketPrice || 0) >= 55);
  const opHigh = ONEPIECE_CARDS_DB.filter((c) => (c.marketPrice || 0) >= 45);
  const pool = [...pkmHigh, ...opHigh];
  const card = (pool.length > 0 ? pool : POKEMON_CARDS_DB)[Math.floor(rng() * Math.max(1, pool.length))];
  const rawPrice = Math.max(40, Math.round(card.marketPrice || 80));

  const compRoll = rng();
  const company: GradingCompany = compRoll < 0.42 ? 'PSA' : compRoll < 0.74 ? 'BGS' : 'CGC';
  const rolled = rollGradingResult(card, company, rng, {
    tier: 'walkthrough',
    cleaned: true,
    preGradeBonus: 0.1,
  });

  // Consignors bring graded slabs (9.5 or 10 trophy slabs)
  if (rolled.slab.grade < 9.5) {
    rolled.slab.grade = 10;
    rolled.slab.gradeLabel =
      company === 'BGS' ? 'PRISTINE 10' : company === 'CGC' ? 'PRISTINE 10' : 'GEM MT 10';
    rolled.gradedPrice = Math.round(rawPrice * (company === 'PSA' ? 2.8 : 3.2));
  }

  const entry: OwnedGradedSlabEntry = {
    id: `consign_slab_${Date.now()}_${Math.floor(rng() * 10000)}`,
    card,
    slab: rolled.slab,
    rawPrice,
    gradedPrice: rolled.gradedPrice,
    gradedAt: Date.now(),
  };

  const val = getSlabMarketValuation(card, rolled.slab, rolled.gradedPrice, activeTrend);
  const suggestedStartPrice = Math.max(30, Math.round(val.effectiveValue * 0.78));
  const reservePrice = Math.max(suggestedStartPrice, Math.round(val.effectiveValue * (0.88 + rng() * 0.08)));
  const commissionRate = getAuctionCommissionRate({ auctionHostCount, isPrimeTime });
  const estimatedCommission = Math.max(10, Math.round(val.effectiveValue * 1.15 * commissionRate));
  const profile = CONSIGNOR_PROFILES[Math.floor(rng() * CONSIGNOR_PROFILES.length)];

  return {
    id: `consign_offer_${Date.now()}_${Math.floor(rng() * 10000)}`,
    consignorName: profile.name,
    consignorRole: profile.role,
    entry,
    marketValuation: val.effectiveValue,
    suggestedStartPrice,
    reservePrice,
    commissionRate,
    estimatedCommission,
    arrivedAt: Date.now(),
  };
}

export function startAuctionFromConsignmentOffer(params: {
  offer: AuctionConsignmentOffer;
  storeLevel?: number;
  reputation?: number;
  activeTrend?: DailyMarketTrend;
  auctioneerCount?: number;
  auctionHostCount?: number;
  isPrimeTime?: boolean;
  durationMs?: number;
  rng?: () => number;
}): SlabAuctionLot {
  const { offer, durationMs = 26000, ...rest } = params;
  return startSlabAuction({
    entry: offer.entry,
    startPrice: offer.suggestedStartPrice,
    reservePrice: offer.reservePrice,
    durationMs,
    isConsignment: true,
    consignorName: offer.consignorName,
    consignorRole: offer.consignorRole,
    commissionRate: offer.commissionRate,
    ...rest,
  });
}

export function createConsignmentAuctionLot(params: {
  storeLevel?: number;
  reputation?: number;
  activeTrend?: DailyMarketTrend;
  auctioneerCount?: number;
  auctionHostCount?: number;
  isPrimeTime?: boolean;
  durationMs?: number;
  rng?: () => number;
}): SlabAuctionLot {
  const offer = generateAuctionConsignmentOffer({
    activeTrend: params.activeTrend,
    auctionHostCount: params.auctionHostCount,
    isPrimeTime: params.isPrimeTime,
    rng: params.rng,
  });
  return startAuctionFromConsignmentOffer({
    offer,
    ...params,
  });
}

export function placeUserBidOnAuctionLot(
  lot: SlabAuctionLot,
  stepPct: number = 0.06
): { nextLot: SlabAuctionLot; bidAmount: number; netPayableIfWin: number } | null {
  if (lot.status !== 'live' || !lot.isConsignment) return null;
  const minStep = Math.max(10, Math.round(lot.startPrice * 0.05));
  const rawNext = Math.round(lot.currentBid * (1 + stepPct));
  const bidAmount = lot.bidCount === 0 && lot.currentBid === lot.startPrice
    ? Math.max(lot.startPrice, lot.currentBid + minStep)
    : Math.max(lot.currentBid + minStep, rawNext);

  const commissionRate = lot.commissionRate ?? AUCTION_BROKER_COMMISSION_RATE;
  const commissionSaved = Math.max(10, Math.round(bidAmount * commissionRate));
  const netPayableIfWin = Math.max(0, bidAmount - commissionSaved);

  const ev: AuctionBidEvent = {
    id: `bid_player_${Date.now()}_${lot.bidCount + 1}`,
    bidderName: 'Bạn (Chủ Sàn)',
    bidderLocation: 'Chủ Sàn Đấu Giá',
    amount: bidAmount,
    isPlayer: true,
    timestamp: Date.now(),
  };

  return {
    bidAmount,
    netPayableIfWin,
    nextLot: {
      ...lot,
      currentBid: bidAmount,
      highestBidderName: 'Bạn (Chủ Sàn)',
      highestBidderLocation: 'Chủ Sàn Đấu Giá',
      highestBidderIsPlayer: true,
      bidCount: lot.bidCount + 1,
      remainingMs: Math.max(lot.remainingMs, 4500),
      bidHistory: [ev, ...lot.bidHistory].slice(0, 12),
    },
  };
}

export function advanceSlabAuctions(
  lots: SlabAuctionLot[] = [],
  deltaMs: number,
  activeTrend?: DailyMarketTrend,
  rng: () => number = Math.random,
  options?: { auctionHostCount?: number; isPrimeTime?: boolean }
): {
  nextLots: SlabAuctionLot[];
  changed: boolean;
  newBids: Array<{ lotId: string; cardName: string; amount: number; bidderName: string }>;
  newlyEnded: SlabAuctionLot[];
} {
  if (!lots || lots.length === 0) {
    return { nextLots: lots, changed: false, newBids: [], newlyEnded: [] };
  }

  let changed = false;
  const newBids: Array<{ lotId: string; cardName: string; amount: number; bidderName: string }> = [];
  const newlyEnded: SlabAuctionLot[] = [];
  const boostTempo = (options?.auctionHostCount || 0) > 0 || Boolean(options?.isPrimeTime);

  const nextLots = lots.map((lot) => {
    if (lot.status !== 'live') return lot;
    changed = true;
    const nextRemaining = Math.max(0, lot.remainingMs - deltaMs);
    let nextBidCooldown = lot.nextBidCooldownMs - deltaMs;
    let currentBid = lot.currentBid;
    let highestBidderName = lot.highestBidderName;
    let highestBidderLocation = lot.highestBidderLocation;
    let highestBidderIsPlayer = lot.highestBidderIsPlayer;
    let bidCount = lot.bidCount;
    let bidHistory = lot.bidHistory;

    if (nextRemaining > 0 && nextBidCooldown <= 0 && currentBid < lot.maxCeilingBid) {
      const val = getSlabMarketValuation(lot.entry.card, lot.entry.slab, lot.entry.gradedPrice, activeTrend);
      const hypeRatio = currentBid / Math.max(1, val.effectiveValue);
      const baseChance = hypeRatio < 1.1 ? 0.88 : hypeRatio < 1.35 ? 0.68 : 0.45;
      const bidChance = Math.min(0.96, baseChance + (boostTempo ? 0.1 : 0));

      if (rng() < bidChance) {
        const pctStep = (0.05 + rng() * 0.065) * (boostTempo ? 1.12 : 1.0);
        const minIncrement = Math.max(5, Math.round(lot.startPrice * 0.04));
        const proposed = Math.min(
          lot.maxCeilingBid,
          Math.max(currentBid + minIncrement, Math.round(currentBid * (1 + pctStep)))
        );

        if (proposed > currentBid) {
          const candidates = AUCTION_VIP_BIDDERS.filter((b) => b.name !== highestBidderName);
          const bidder = candidates[Math.floor(rng() * candidates.length)] || AUCTION_VIP_BIDDERS[0];
          currentBid = proposed;
          highestBidderName = bidder.name;
          highestBidderLocation = bidder.location;
          highestBidderIsPlayer = false;
          bidCount += 1;
          const ev: AuctionBidEvent = {
            id: `bid_${Date.now()}_${bidCount}`,
            bidderName: bidder.name,
            bidderLocation: bidder.location,
            amount: proposed,
            timestamp: Date.now(),
          };
          bidHistory = [ev, ...bidHistory].slice(0, 12);
          newBids.push({
            lotId: lot.id,
            cardName: lot.entry.card.name,
            amount: proposed,
            bidderName: bidder.name,
          });
        }
      }
      const cooldownScale = boostTempo ? 0.72 : 1.0;
      nextBidCooldown = Math.round((2400 + Math.floor(rng() * 2400)) * cooldownScale);
    }

    if (nextRemaining <= 0) {
      const endedLot: SlabAuctionLot = {
        ...lot,
        currentBid,
        highestBidderName,
        highestBidderLocation,
        highestBidderIsPlayer,
        bidCount,
        bidHistory,
        remainingMs: 0,
        nextBidCooldownMs: 0,
        status: 'ended',
      };
      newlyEnded.push(endedLot);
      return endedLot;
    }

    return {
      ...lot,
      currentBid,
      highestBidderName,
      highestBidderLocation,
      highestBidderIsPlayer,
      bidCount,
      bidHistory,
      remainingMs: nextRemaining,
      nextBidCooldownMs: nextBidCooldown,
    };
  });

  return { nextLots, changed, newBids, newlyEnded };
}

export function settleSlabAuction(
  lot: SlabAuctionLot,
  bonusCommissionPct: number = 0
): {
  sold: boolean;
  isConsignment: boolean;
  wonByPlayer: boolean;
  finalPrice: number;
  payoutToPlayer: number;
  netCostToPlayer: number;
  commissionEarned: number;
  netProfit: number;
  xpBonus: number;
  repBonus: number;
  record: CompletedAuctionRecord;
} {
  const sold = lot.bidCount > 0 && lot.currentBid >= lot.reservePrice;
  const isConsignment = Boolean(lot.isConsignment);
  const wonByPlayer = Boolean(sold && isConsignment && lot.highestBidderIsPlayer);
  const finalPrice = sold ? lot.currentBid : 0;
  const commissionRate = (lot.commissionRate ?? AUCTION_BROKER_COMMISSION_RATE) + Math.max(0, bonusCommissionPct) / 100;
  const commissionEarned = sold && isConsignment ? Math.max(10, Math.round(finalPrice * commissionRate)) : 0;
  const netCostToPlayer = wonByPlayer ? Math.max(0, finalPrice - commissionEarned) : 0;
  const payoutToPlayer = sold ? (wonByPlayer ? 0 : isConsignment ? commissionEarned : finalPrice) : 0;
  const netProfit = sold
    ? wonByPlayer
      ? commissionEarned
      : isConsignment
      ? commissionEarned
      : Math.round(finalPrice - lot.entry.rawPrice)
    : 0;
  const xpBonus = sold ? (finalPrice >= 1000 ? 90 : 50) : 10;
  const repBonus = sold ? (lot.entry.slab.grade >= 10 ? 2 : 1) : 0;

  return {
    sold,
    isConsignment,
    wonByPlayer,
    finalPrice,
    payoutToPlayer,
    netCostToPlayer,
    commissionEarned,
    netProfit,
    xpBonus,
    repBonus,
    record: {
      id: lot.id,
      cardName: lot.entry.card.name,
      gradeLabel: lot.entry.slab.gradeLabel,
      company: lot.entry.slab.company,
      sold,
      finalPrice: sold ? finalPrice : lot.currentBid,
      baseMarketPrice: lot.entry.gradedPrice,
      buyerName: sold ? lot.highestBidderName : undefined,
      isConsignment,
      commissionEarned,
      wonByPlayer,
      endedAt: Date.now(),
    },
  };
}

export interface WalkInBuybackOffer {
  id: string;
  sellerName: string;
  card: PokemonCard;
  askingPrice: number;
  rawMarketPrice: number;
  discountPct: number;
  inspected: boolean;
  inspection: PreGradeInspection;
  condition?: 'MP' | 'LP' | 'NM' | 'MINT';
  isCounterfeit?: boolean;
  scannedAuthenticity?: boolean;
  detectedFake?: boolean;
  restored?: boolean;
  preGradeBonus?: number;
  createdAt: number;
}

const BUYBACK_SELLER_NAMES = [
  'Nam Phong',
  'Tuấn Kiệt',
  'Ngọc Hân',
  'Minh Trí',
  'Quỳnh Anh',
  'Hải Đăng',
  'Trọng Nghĩa',
  'Lan Phương',
];

export function generateWalkInBuybackOffer(
  storeLevel: number,
  rng: () => number = Math.random
): WalkInBuybackOffer {
  const pkmPool = POKEMON_CARDS_DB.filter((c) => (c.marketPrice || 0) >= 45);
  const opPool = ONEPIECE_CARDS_DB.filter((c) => (c.marketPrice || 0) >= 35);
  const pool = [...pkmPool, ...opPool];
  const card = (pool.length > 0 ? pool : POKEMON_CARDS_DB)[Math.floor(rng() * Math.max(1, pool.length))];
  const rawMarketPrice = Math.max(10, Math.round(card.marketPrice || 50));
  const condRoll = rng();
  const condition: WalkInBuybackOffer['condition'] =
    condRoll < 0.14 ? 'MP' : condRoll < 0.36 ? 'LP' : condRoll < 0.82 ? 'NM' : 'MINT';
  const isCounterfeit = rng() < 0.2;
  const conditionExtraDiscount = condition === 'MP' ? 14 : condition === 'LP' ? 7 : 0;
  const fakeExtraDiscount = isCounterfeit ? 12 : 0;
  const discountPct = Math.min(52, Math.round(14 + rng() * 14) + conditionExtraDiscount + fakeExtraDiscount);
  const askingPrice = Math.max(8, Math.round(rawMarketPrice * (1 - discountPct / 100)));
  const seedKey = `buyback_${Math.floor(rng() * 999999)}_${storeLevel}`;
  const inspection = inspectRawCardForGrading(card, seedKey);

  return {
    id: `buy_${Date.now()}_${Math.floor(rng() * 10000)}`,
    sellerName: BUYBACK_SELLER_NAMES[Math.floor(rng() * BUYBACK_SELLER_NAMES.length)],
    card,
    askingPrice,
    rawMarketPrice,
    discountPct,
    inspected: false,
    inspection,
    condition,
    isCounterfeit,
    scannedAuthenticity: false,
    detectedFake: false,
    restored: false,
    preGradeBonus: condition === 'MINT' ? 0.03 : condition === 'LP' ? -0.02 : condition === 'MP' ? -0.04 : 0,
    createdAt: Date.now(),
  };
}

export interface VipSlabOrder {
  id: string;
  vipName: string;
  landmark: string;
  universe: 'pokemon' | 'onepiece' | 'any';
  minGrade: number; // e.g., 9.5 or 10
  bonusMultiplier: number; // e.g., 1.38x of slab gradedPrice
  minCardRawPrice: number;
  xpReward: number;
  repReward: number;
  createdAt: number;
}

const VIP_LANDMARKS = [
  { vipName: 'Giám Đốc Porsche Center', landmark: 'Porsche Center Showroom' },
  { vipName: 'Doanh Nhân Landmark 81', landmark: 'Landmark 81 Sky Lounge' },
  { vipName: 'Tổng Giám Đốc Casa Riva', landmark: 'Casa Riva Penthouse' },
  { vipName: 'Khách VIP Boutique Hotel', landmark: 'Boutique Hotel Lobby' },
];

export function generateVipSlabOrder(
  storeLevel: number,
  rng: () => number = Math.random
): VipSlabOrder {
  const dest = VIP_LANDMARKS[Math.floor(rng() * VIP_LANDMARKS.length)];
  const univRoll = rng();
  const universe: VipSlabOrder['universe'] =
    univRoll < 0.4 ? 'pokemon' : univRoll < 0.75 ? 'onepiece' : 'any';
  const minGrade = rng() < 0.65 ? 10 : 9.5;
  const bonusMultiplier = Number((minGrade >= 10 ? 1.38 + rng() * 0.12 : 1.28 + rng() * 0.1).toFixed(2));
  const minCardRawPrice = storeLevel >= 27 ? 60 : 35;

  return {
    id: `vip_${Date.now()}_${Math.floor(rng() * 10000)}`,
    vipName: dest.vipName,
    landmark: dest.landmark,
    universe,
    minGrade,
    bonusMultiplier,
    minCardRawPrice,
    xpReward: minGrade >= 10 ? 60 : 40,
    repReward: 2,
    createdAt: Date.now(),
  };
}

export const RESTOCKER_FLOOR2_Y = 5.2;

export interface RestockerShelfDestination {
  floor: 1 | 2;
  x: number;
  y: number;
  z: number;
  lookY: number;
  zone: 'wall' | 'gacha' | 'collector' | 'mystery';
  cleanSetId: string;
  defaultBayIndex: number;
}

const F1_GACHA_TIER_ORDER = ['silver', 'gold', 'blaze', 'degen', 'nova', 'void', 'crown', 'grail'] as const;
const F2_GACHA_TIER_ORDER = ['op_gomu', 'op_mera', 'op_ope', 'op_hie', 'op_pika', 'op_uo', 'op_yami', 'op_nika'] as const;
const EAST_WALL_BAY_ZS = [-6.05, -3.35, -0.65, 2.05] as const;
const COLLECTOR_BAY_ZS = [-1.8, 1.6, 5.0, 8.4] as const;

/**
 * Resolves the exact Floor 1 / Floor 2 3D stand coordinate and shelf-facing yaw
 * for a delivered productId so hired Restocker staff walk to the matching shelf unit & bay.
 */
export function resolveBaseRestockerTarget(
  productId: string,
  unlockedShelves: string[] = []
): RestockerShelfDestination {
  const raw = (productId || '').trim();
  const isOP = isOnePieceProductId(raw);
  const floor: 1 | 2 = isOP ? 2 : 1;
  const y = isOP ? RESTOCKER_FLOOR2_Y : 0;
  const cleanSetId = raw.replace(/_(box|pack)$/i, '');

  // 1. VIP Collector / Pirate Vaults (West Wall Cabinets at X = -11.75, 4 bays along Z)
  if (isCollectorBoxProduct(raw) || isOnePieceCollectorProduct(raw)) {
    const list = isOP ? ALL_ONEPIECE_COLLECTOR_BOXES : ALL_COLLECTOR_BOXES;
    const matchedIdx = list.findIndex((s) => s.id === cleanSetId || s.id === raw);
    const bayIdx = matchedIdx >= 0 ? Math.min(3, matchedIdx) : 0;
    return {
      floor,
      x: -10.25,
      y,
      z: COLLECTOR_BAY_ZS[bayIdx],
      lookY: -Math.PI / 2,
      zone: 'collector',
      cleanSetId,
      defaultBayIndex: bayIdx,
    };
  }

  // 2. GameStop Mystery Rack (Floor 1) & One Piece Bounty Rack (Floor 2) at (-5.8, floorY, 4.3) facing +Z
  if (isGameStopMysteryProduct(raw) || isOnePieceBountyProduct(raw)) {
    return {
      floor,
      x: -5.8,
      y,
      z: 5.6,
      lookY: Math.PI,
      zone: 'mystery',
      cleanSetId,
      defaultBayIndex: 0,
    };
  }

  // 3. Mystery Gacha Gondola (Floor 1) & Devil Fruit Gacha Gondola (Floor 2) at (2.4, floorY, 2.5) facing +Z
  if (isOnePieceGachaProduct(raw) || raw.toLowerCase().startsWith('gacha_')) {
    const tierKey = raw.replace(/^gacha_/i, '').replace(/_pack$/i, '').toLowerCase();
    const order = isOP ? F2_GACHA_TIER_ORDER : F1_GACHA_TIER_ORDER;
    const tierIdx = order.indexOf(tierKey as never);
    const col = tierIdx >= 0 ? tierIdx % 4 : 0;
    const standX = Number((2.4 + (-1.35 + col * 0.9)).toFixed(2));
    return {
      floor,
      x: standX,
      y,
      z: 4.1,
      lookY: Math.PI,
      zone: 'gacha',
      cleanSetId: tierKey,
      defaultBayIndex: col,
    };
  }

  // 4. East Wall Booster Box & Pack Shelves at X = 11.4 (4 bays: Bay 0..3 at Z = -6.05..+2.05)
  const shelfPrefix = isOP ? 'op_shelf_wall_bay_' : 'shelf_wall_bay_';
  let defaultBayIndex = 0;
  if (unlockedShelves.length > 0) {
    const firstUnlocked = [0, 1, 2, 3].find((b) => unlockedShelves.includes(`${shelfPrefix}${b + 1}`));
    if (firstUnlocked !== undefined) {
      defaultBayIndex = firstUnlocked;
    }
  }

  return {
    floor,
    x: 9.75,
    y,
    z: EAST_WALL_BAY_ZS[defaultBayIndex],
    lookY: Math.PI / 2,
    zone: 'wall',
    cleanSetId,
    defaultBayIndex,
  };
}
