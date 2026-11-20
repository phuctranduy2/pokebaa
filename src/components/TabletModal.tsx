import React, { useState, useEffect } from 'react';
import {
  X,
  ShoppingCart,
  Layers,
  Wrench,
  Palette,
  Warehouse,
  FolderOpen,
  Users,
  FileCheck,
  TrendingUp,
  Award,
  Package,
  Plus,
  Minus,
  Check,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Lock,
  DollarSign,
  AlertCircle,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Briefcase,
  Swords,
  Trophy,
  Clock,
  Coffee,
  FileText,
  Code,
  Database,
  Search,
  Copy,
  Terminal,
  ExternalLink,
  Flame,
  CheckCircle2,
  Crown,
  Video,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  BOOSTER_SETS,
  COLLECTOR_BOX_SETS,
  GAMESTOP_MYSTERY_SETS,
  GACHA_PACK_TIERS,
  BoosterSetInfo,
  InventoryItem,
  ShopState,
  hasProductLicense,
  PRODUCT_LICENSES,
  SHELF_UNLOCKS,
  ShelfUnlockCategory,
  isShelfUnlocked,
  STARTER_UNLOCKED_SHELVES,
  PokemonCard,
  StaffRole,
} from '../game/pokemonShopLogic';
import {
  ONEPIECE_BOOSTER_SETS,
  ALL_ONEPIECE_BOOSTER_SETS,
  ONEPIECE_COLLECTOR_BOX_SETS,
  ALL_ONEPIECE_COLLECTOR_BOXES,
  ONEPIECE_BOUNTY_MYSTERY_SETS,
  ALL_ONEPIECE_BOUNTY_SETS,
  OP_GACHA_PACK_TIERS,
  ONEPIECE_PRODUCT_LICENSES,
  ONEPIECE_CARDS_DB,
  ONEPIECE_SET_EVENTS,
} from '../game/onePieceData';
import { soundManager } from '../game/audio';
import { OnePieceApiAppView } from './OnePieceApiAppView';
import { CardExchangeAppView } from './CardExchangeAppView';
import { PokeShipAppView } from './PokeShipAppView';
import { StaffAppView } from './StaffAppView';
import { CardSocialFeedView } from './CardSocialFeedView';
import { getMasterSetWholesaleDiscount } from '../game/shopExpansionSystems';
import { loadCardExchangeState, BillTaxRecord } from '../game/cardExchangeLogic';
import {
  DeliveryOrder,
  DeliveryStop,
  getDailyTaskProgressList,
} from '../game/cardDeliverySystem';

export type TabletSupplySubTab =
  | 'cardpack'
  | 'mystery_pack'
  | 'mystery_box'
  | 'figure'
  | 'merchandise'
  | 'licenses'
  | 'shelf_unlocks';

interface TabletModalProps {
  shopState: ShopState;
  initialApp?: TabletAppId;
  initialItemsSubTab?: TabletSupplySubTab;
  activeProfileId?: string;
  onUpdateCash?: (newCash: number) => void;
  onOrderStock: (orderedItems: Array<{ item: Partial<InventoryItem>; count: number; totalCost: number }>) => void;
  onUpdatePrices: (updatedInventory: InventoryItem[]) => void;
  onPurchaseUpgrade: (upgradeId: string, cost: number) => void;
  onPurchaseLicense?: (licenseId: string, fee: number) => void;
  onPurchaseShelfUnlock?: (shelfId: string, fee: number) => void;
  onHireStaff?: (
    role: StaffRole,
    action: 'hire' | 'fire'
  ) => void;
  onSetTableRentalPrice?: (price: number) => void;
  onHostTournament?: () => void;
  onAcceptDeliveryOrder?: (order: DeliveryOrder) => void;
  onCancelDeliveryMission?: () => void;
  onRefreshDeliveryBoard?: () => void;
  onClaimDailyTask?: (taskId: string) => void;
  onFocusDeliveryOnMap?: (stop: DeliveryStop) => void;
  onOpenCityEmpire?: () => void;
  onOpenBattleArena?: () => void;
  onOpenPokeLive?: () => void;
  onHaggleCityHunt?: (spotId: string, discountPct: number) => void;
  onBuyCityHunt?: (spotId: string) => void;
  onRefreshCityHunts?: () => void;
  onRefreshMarketPulses?: () => void;
  onNavigateToPoi?: (poiId: string, name: string, x: number, z: number) => void;
  onSellBinderCardOnSocial?: (cardId: string, cardName: string, price: number) => void;
  onBuyOverpricedCard?: (card: PokemonCard, price: number, sellerName: string) => void;
  onClose: () => void;
}

export type TabletAppId =
  | 'home'
  | 'supply'
  | 'storage'
  | 'manage'
  | 'employee'
  | 'bill'
  | 'daily_task'
  | 'achievement'
  | 'battle_arena'
  | 'onepiece_api'
  | 'card_exchange'
  | 'card_social'
  | 'pokeship';

export const TabletModal: React.FC<TabletModalProps> = ({
  shopState,
  initialApp = 'home',
  initialItemsSubTab = 'cardpack',
  activeProfileId = 'default',
  onUpdateCash,
  onOrderStock,
  onUpdatePrices,
  onPurchaseUpgrade,
  onPurchaseLicense,
  onPurchaseShelfUnlock,
  onHireStaff,
  onSetTableRentalPrice,
  onHostTournament,
  onAcceptDeliveryOrder,
  onCancelDeliveryMission,
  onRefreshDeliveryBoard,
  onClaimDailyTask,
  onFocusDeliveryOnMap,
  onOpenCityEmpire,
  onOpenBattleArena,
  onOpenPokeLive,
  onHaggleCityHunt,
  onBuyCityHunt,
  onRefreshCityHunts,
  onRefreshMarketPulses,
  onNavigateToPoi,
  onSellBinderCardOnSocial,
  onBuyOverpricedCard,
  onClose,
}) => {
  const [currentApp, setCurrentApp] = useState<TabletAppId>(initialApp);
  const [supplyTab, setSupplyTab] = useState<'items' | 'facilities' | 'expand' | 'decoration' | 'floor2'>('items');
  const [itemsSubTab, setItemsSubTab] = useState<TabletSupplySubTab>(initialItemsSubTab);
  // Franchise separator for wholesale stock ordering: Pokemon vs One Piece
  const [catalogFranchise, setCatalogFranchise] = useState<'pokemon' | 'onepiece'>('pokemon');

  useEffect(() => {
    setCurrentApp(initialApp);
    if (initialApp === 'supply' && initialItemsSubTab) {
      setSupplyTab('items');
      setItemsSubTab(initialItemsSubTab);
    }
  }, [initialApp, initialItemsSubTab]);

  // Cart state: itemId -> quantity
  const [cart, setCart] = useState<Record<string, number>>({});
  const [showCartDrawer, setShowCartDrawer] = useState<boolean>(false);
  const [orderSuccessNotice, setOrderSuccessNotice] = useState<string | null>(null);

  // Pricing manage state
  const [inventoryPrices, setInventoryPrices] = useState<InventoryItem[]>(shopState.inventory);

  // Battle Arena Tablet State (Matching user screenshot 10)
  const [arenaTab, setArenaTab] = useState<'matches' | 'settings'>('matches');
  const [tournamentHosted, setTournamentHosted] = useState<boolean>(false);
  const [servedRefreshments, setServedRefreshments] = useState<boolean>(false);
  const [currentRentalFee, setCurrentRentalFee] = useState<number>(shopState.tableRentalPricePerHour || 5);

  const handlePriceSelect = (price: number) => {
    soundManager.playSelectSound();
    setCurrentRentalFee(price);
    onSetTableRentalPrice?.(price);
  };

  const handleTournamentClick = () => {
    if (shopState.cash < 50 || tournamentHosted) return;
    soundManager.playRarePullFanfare();
    confetti({
      particleCount: 150,
      spread: 90,
      origin: { y: 0.5 },
      colors: ['#3b82f6', '#ef4444', '#ffd700', '#10b981'],
    });
    setTournamentHosted(true);
    onHostTournament?.();
  };

  const handleRefreshmentsClick = () => {
    if (shopState.cash < 15 || servedRefreshments) return;
    soundManager.playChipSound();
    setServedRefreshments(true);
  };

  // Catalog for Supply App (Matching Image 2 & Economy Table)
  const cardPackCatalog = [
    // Level 1: Pack 30th Common (Cost: $2.50, Retail: $4.50, 80% ROI)
    {
      id: 'bundle_30th_pack_tab',
      productId: 'pokemon30thCommon_pack',
      name: 'Pack 30th Anniversary Common (10 Thẻ)',
      setName: '30th Anniversary (Common Set)',
      generation: 'GENERATION . I',
      pricePerUnit: 2.5,
      bundleCount: 10,
      price: 25.0,
      retailSuggested: 4.5,
      unlocked: hasProductLicense(shopState.purchasedLicenses, 'pokemon30thCommon_pack') && shopState.storeLevel >= 1,
      image: 'https://cdn.hstatic.net/products/200000160361/1234_7343f2ac70a64e7d8eee069e79da0905.jpg',
      badge: 'Cấp 1 · Miễn Phí',
      tag: 'x 10 Packs',
      type: 'pack' as const,
    },
    // Level 2: Box 30th Common (1 Box = 9 Packs, Cost: $22.50, Retail: $41.00)
    {
      id: 'bundle_30th_box_tab',
      productId: 'pokemon30thCommon_box',
      name: 'Booster Box 30th Common (9 Packs)',
      setName: '30th Anniversary (Common Set)',
      generation: 'GENERATION . I',
      pricePerUnit: 22.5,
      bundleCount: 1,
      price: 22.5,
      retailSuggested: 41.0,
      unlocked: hasProductLicense(shopState.purchasedLicenses, 'pokemon30thCommon_box') && shopState.storeLevel >= 2,
      image: 'https://www.gameon.games/cdn/shop/files/POK1010447101_1.jpg?v=1783496579&width=1920',
      badge: shopState.storeLevel >= 2 ? (hasProductLicense(shopState.purchasedLicenses, 'pokemon30thCommon_box') ? 'Sẵn Sàng' : 'Cần Giấy Phép ($50)') : 'Khóa Cấp 2',
      tag: '1 Box · 9 Packs',
      type: 'box' as const,
    },
    // Level 3: Pack Paldean Fates (Cost: $4.80, Retail: $9.00)
    {
      id: 'bundle_paldean_pack_tab',
      productId: 'paldeanFates_pack',
      name: 'Pack Scarlet & Violet Paldean Fates',
      setName: 'Scarlet & Violet: Paldean Fates',
      generation: 'GENERATION . I',
      pricePerUnit: 4.8,
      bundleCount: 10,
      price: 48.0,
      retailSuggested: 9.0,
      unlocked: hasProductLicense(shopState.purchasedLicenses, 'paldeanFates_pack') && shopState.storeLevel >= 3,
      image: 'https://cdn.hstatic.net/products/200000992511/-pokemon-scarlet-_-violet-paldean-fates-elite-trainer-box-tcgp85618-10_078e0146ed5f409e9419ab821e2e72d4_master.jpg',
      badge: shopState.storeLevel >= 3 ? (hasProductLicense(shopState.purchasedLicenses, 'paldeanFates_pack') ? 'Sẵn Sàng' : 'Cần Giấy Phép ($100)') : 'Khóa Cấp 3',
      tag: 'x 10 Packs',
      type: 'pack' as const,
    },
    // Level 4: Box Paldean Fates (Cost: $43.20, Retail: $81.00)
    {
      id: 'bundle_paldean_box_tab',
      productId: 'paldeanFates_box',
      name: 'Booster Box Paldean Fates (9 Packs)',
      setName: 'Scarlet & Violet: Paldean Fates',
      generation: 'GENERATION . I',
      pricePerUnit: 43.2,
      bundleCount: 1,
      price: 43.2,
      retailSuggested: 81.0,
      unlocked: hasProductLicense(shopState.purchasedLicenses, 'paldeanFates_box') && shopState.storeLevel >= 4,
      image: 'https://acgamesonline.com/cdn/shop/files/raw--17_1200x1200.png?v=1711036389',
      badge: shopState.storeLevel >= 4 ? (hasProductLicense(shopState.purchasedLicenses, 'paldeanFates_box') ? 'Sẵn Sàng' : 'Cần Giấy Phép ($150)') : 'Khóa Cấp 4',
      tag: '1 Box · 9 Packs',
      type: 'box' as const,
    },
    // Level 5: Pack Cosmic Eclipse (Cost: $5.00, Retail: $9.50)
    {
      id: 'bundle_cosmic_pack_tab',
      productId: 'cosmicEclipse_pack',
      name: 'Pack Cosmic Eclipse (10 Thẻ)',
      setName: 'Sun & Moon: Cosmic Eclipse',
      generation: 'GENERATION . II',
      pricePerUnit: 5.0,
      bundleCount: 10,
      price: 50.0,
      retailSuggested: 9.5,
      unlocked: hasProductLicense(shopState.purchasedLicenses, 'cosmicEclipse_pack') && shopState.storeLevel >= 5,
      image: 'https://tcgplayer-cdn.tcgplayer.com/product/206028_in_1000x1000.jpg',
      badge: shopState.storeLevel >= 5 ? (hasProductLicense(shopState.purchasedLicenses, 'cosmicEclipse_pack') ? 'Sẵn Sàng' : 'Cần Giấy Phép ($200)') : 'Khóa Cấp 5',
      tag: 'x 10 Packs',
      type: 'pack' as const,
    },
    // Level 5: Box Cosmic Eclipse (Cost: $45.00, Retail: $86.00)
    {
      id: 'bundle_cosmic_box_tab',
      productId: 'cosmicEclipse_box',
      name: 'Booster Box Cosmic Eclipse (9 Packs)',
      setName: 'Sun & Moon: Cosmic Eclipse',
      generation: 'GENERATION . II',
      pricePerUnit: 45.0,
      bundleCount: 1,
      price: 45.0,
      retailSuggested: 86.0,
      unlocked: hasProductLicense(shopState.purchasedLicenses, 'cosmicEclipse_box') && shopState.storeLevel >= 5,
      image: 'https://cdn.shoplightspeed.com/shops/643438/files/72436375/pokemon-me02-phantasmal-flames-elite-trainer-box.jpg',
      badge: shopState.storeLevel >= 5 ? (hasProductLicense(shopState.purchasedLicenses, 'cosmicEclipse_box') ? 'Sẵn Sàng' : 'Cần Giấy Phép ($250)') : 'Khóa Cấp 5',
      tag: '1 Box · 9 Packs',
      type: 'box' as const,
    },
    // Level 6: Pack Destined Rivals (Cost: $5.20, Retail: $9.80)
    {
      id: 'bundle_destined_pack_tab',
      productId: 'deltaReign_pack',
      name: 'Pack Destined Rivals (10 Thẻ)',
      setName: 'Destined Rivals (Rocket vs Mewtwo)',
      generation: 'GENERATION . II',
      pricePerUnit: 5.2,
      bundleCount: 10,
      price: 52.0,
      retailSuggested: 9.8,
      unlocked: hasProductLicense(shopState.purchasedLicenses, 'deltaReign_pack') && shopState.storeLevel >= 6,
      image: 'https://screenfreegames.com/cdn/shop/files/PokemonDestinedRivalsBoosterpack.webp?v=1747974163',
      badge: shopState.storeLevel >= 6 ? (hasProductLicense(shopState.purchasedLicenses, 'deltaReign_pack') ? 'Sẵn Sàng' : 'Cần Giấy Phép ($250)') : 'Khóa Cấp 6',
      tag: 'x 10 Packs',
      type: 'pack' as const,
    },
    // Level 6: Box Destined Rivals (Cost: $46.80, Retail: $88.00)
    {
      id: 'bundle_destined_box_tab',
      productId: 'deltaReign_box',
      name: 'Booster Box Destined Rivals (9 Packs)',
      setName: 'Destined Rivals (Rocket vs Mewtwo)',
      generation: 'GENERATION . II',
      pricePerUnit: 46.8,
      bundleCount: 1,
      price: 46.8,
      retailSuggested: 88.0,
      unlocked: hasProductLicense(shopState.purchasedLicenses, 'deltaReign_box') && shopState.storeLevel >= 6,
      image: 'https://screenfreegames.com/cdn/shop/files/pokemondestinedrivalselitetrainerbox.png?v=1746559914',
      badge: shopState.storeLevel >= 6 ? (hasProductLicense(shopState.purchasedLicenses, 'deltaReign_box') ? 'Sẵn Sàng' : 'Cần Giấy Phép ($300)') : 'Khóa Cấp 6',
      tag: '1 Box · 9 Packs',
      type: 'box' as const,
    },
    // Level 7: Pack Perfect Order (Cost: $5.30, Retail: $10.00)
    {
      id: 'bundle_perfect_pack_tab',
      productId: 'perfectOrder_pack',
      name: 'Pack Perfect Order (10 Thẻ)',
      setName: 'Kalos Legends: Perfect Order',
      generation: 'GENERATION . II',
      pricePerUnit: 5.3,
      bundleCount: 10,
      price: 53.0,
      retailSuggested: 10.0,
      unlocked: hasProductLicense(shopState.purchasedLicenses, 'perfectOrder_pack') && shopState.storeLevel >= 7,
      image: 'https://pokesymbols.com/images/tcg/sets/booster-pack-art/perfect-order-pack-3.avif',
      badge: shopState.storeLevel >= 7 ? (hasProductLicense(shopState.purchasedLicenses, 'perfectOrder_pack') ? 'Sẵn Sàng' : 'Cần Giấy Phép ($300)') : 'Khóa Cấp 7',
      tag: 'x 10 Packs',
      type: 'pack' as const,
    },
    // Level 7: Box Perfect Order (Cost: $47.70, Retail: $90.00)
    {
      id: 'bundle_perfect_box_tab',
      productId: 'perfectOrder_box',
      name: 'Booster Box Perfect Order (9 Packs)',
      setName: 'Kalos Legends: Perfect Order',
      generation: 'GENERATION . II',
      pricePerUnit: 47.7,
      bundleCount: 1,
      price: 47.7,
      retailSuggested: 90.0,
      unlocked: hasProductLicense(shopState.purchasedLicenses, 'perfectOrder_box') && shopState.storeLevel >= 7,
      image: 'https://gamesland.ca/cdn/shop/files/pokemon-me25-ascended-heroes-elite-trainer-box-pre-order-pokemon-5367499.png?v=1766196609',
      badge: shopState.storeLevel >= 7 ? (hasProductLicense(shopState.purchasedLicenses, 'perfectOrder_box') ? 'Sẵn Sàng' : 'Cần Giấy Phép ($350)') : 'Khóa Cấp 7',
      tag: '1 Box · 9 Packs',
      type: 'box' as const,
    },
    // Level 8: Pack Evolving Skies (Cost: $5.50, Retail: $10.50)
    {
      id: 'bundle_evolving_pack_tab',
      productId: 'evolvingSkies_pack',
      name: 'Pack Evolving Skies (10 Thẻ)',
      setName: 'Sword & Shield: Evolving Skies',
      generation: 'GENERATION . II',
      pricePerUnit: 5.5,
      bundleCount: 10,
      price: 55.0,
      retailSuggested: 10.5,
      unlocked: hasProductLicense(shopState.purchasedLicenses, 'evolvingSkies_pack') && shopState.storeLevel >= 8,
      image: 'https://m.media-amazon.com/images/I/814N5FR88dL._AC_UF894,1000_QL80_.jpg',
      badge: shopState.storeLevel >= 8 ? (hasProductLicense(shopState.purchasedLicenses, 'evolvingSkies_pack') ? 'Sẵn Sàng' : 'Cần Giấy Phép ($400)') : 'Khóa Cấp 8',
      tag: 'x 10 Packs',
      type: 'pack' as const,
    },
    // Level 8: Box Evolving Skies (Cost: $49.50, Retail: $95.00)
    {
      id: 'bundle_evolving_box_tab',
      productId: 'evolvingSkies_box',
      name: 'Booster Box Evolving Skies (9 Packs)',
      setName: 'Sword & Shield: Evolving Skies',
      generation: 'GENERATION . II',
      pricePerUnit: 49.5,
      bundleCount: 1,
      price: 49.5,
      retailSuggested: 95.0,
      unlocked: hasProductLicense(shopState.purchasedLicenses, 'evolvingSkies_box') && shopState.storeLevel >= 8,
      image: 'https://static0.dualshockersimages.com/wordpress/wp-content/uploads/2021/08/Pok-mon-TCG-All-Cards-Confirmed-For-Evolving-Skies-Expansion.jpg?w=1200&h=675&fit=crop',
      badge: shopState.storeLevel >= 8 ? (hasProductLicense(shopState.purchasedLicenses, 'evolvingSkies_box') ? 'Sẵn Sàng' : 'Cần Giấy Phép ($450)') : 'Khóa Cấp 8',
      tag: '1 Box · 9 Packs',
      type: 'box' as const,
    },
    // Level 9: Pack Ascended Heroes (Cost: $6.30, Retail: $12.00)
    {
      id: 'bundle_prismatic_pack_tab',
      productId: 'prismaticEvolutions_pack',
      name: 'Pack Ascended Heroes (10 Thẻ)',
      setName: 'Ascended Heroes (Prismatic)',
      generation: 'GENERATION . II',
      pricePerUnit: 6.3,
      bundleCount: 10,
      price: 63.0,
      retailSuggested: 12.0,
      unlocked: hasProductLicense(shopState.purchasedLicenses, 'prismaticEvolutions_pack') && shopState.storeLevel >= 9,
      image: 'https://gamesland.ca/cdn/shop/files/pokemon-me25-ascended-heroes-elite-trainer-box-pre-order-pokemon-5367499.png?v=1766196609',
      badge: shopState.storeLevel >= 9 ? (hasProductLicense(shopState.purchasedLicenses, 'prismaticEvolutions_pack') ? 'Sẵn Sàng' : 'Cần Giấy Phép ($500)') : 'Khóa Cấp 9',
      tag: 'x 10 Packs',
      type: 'pack' as const,
    },
    // Level 9: Box Ascended Heroes (Cost: $56.70, Retail: $108.00)
    {
      id: 'bundle_prismatic_box_tab',
      productId: 'prismaticEvolutions_box',
      name: 'Booster Box Ascended Heroes (9 Packs)',
      setName: 'Ascended Heroes (Prismatic)',
      generation: 'GENERATION . II',
      pricePerUnit: 56.7,
      bundleCount: 1,
      price: 56.7,
      retailSuggested: 108.0,
      unlocked: hasProductLicense(shopState.purchasedLicenses, 'prismaticEvolutions_box') && shopState.storeLevel >= 9,
      image: 'https://gamesland.ca/cdn/shop/files/pokemon-me25-ascended-heroes-elite-trainer-box-pre-order-pokemon-5367499.png?v=1766196609',
      badge: shopState.storeLevel >= 9 ? (hasProductLicense(shopState.purchasedLicenses, 'prismaticEvolutions_box') ? 'Sẵn Sàng' : 'Cần Giấy Phép ($600)') : 'Khóa Cấp 9',
      tag: '1 Box · 9 Packs',
      type: 'box' as const,
    },
    // Level 10: Pack Base Set Vintage (Cost: $50.00, Retail: $95.00)
    {
      id: 'bundle_vintage_pack_tab',
      productId: 'pokemonRedVintage_pack',
      name: 'Pack Base Set Vintage Red/Blue (10 Thẻ)',
      setName: 'Base Set (Red & Blue Vintage)',
      generation: 'GENERATION . II',
      pricePerUnit: 50.0,
      bundleCount: 10,
      price: 500.0,
      retailSuggested: 95.0,
      unlocked: hasProductLicense(shopState.purchasedLicenses, 'pokemonRedVintage_pack') && shopState.storeLevel >= 10,
      image: 'https://images-na.ssl-images-amazon.com/images/I/51REXB8bUgL.jpg',
      badge: shopState.storeLevel >= 10 ? (hasProductLicense(shopState.purchasedLicenses, 'pokemonRedVintage_pack') ? 'Sẵn Sàng' : 'Cần Giấy Phép ($800)') : 'Khóa Cấp 10',
      tag: 'x 10 Packs',
      type: 'pack' as const,
    },
    // Level 10: Box Base Set Vintage (Cost: $450.00, Retail: $855.00)
    {
      id: 'bundle_vintage_box_tab',
      productId: 'pokemonRedVintage_box',
      name: 'Booster Box Base Set Vintage (9 Packs)',
      setName: 'Base Set (Red & Blue Vintage)',
      generation: 'GENERATION . II',
      pricePerUnit: 450.0,
      bundleCount: 1,
      price: 450.0,
      retailSuggested: 855.0,
      unlocked: hasProductLicense(shopState.purchasedLicenses, 'pokemonRedVintage_box') && shopState.storeLevel >= 10,
      image: 'https://images-na.ssl-images-amazon.com/images/I/51REXB8bUgL.jpg',
      badge: shopState.storeLevel >= 10 ? (hasProductLicense(shopState.purchasedLicenses, 'pokemonRedVintage_box') ? 'Sẵn Sàng' : 'Cần Giấy Phép ($1,000)') : 'Khóa Cấp 10',
      tag: '1 Box · 9 Packs',
      type: 'box' as const,
    },
    {
      id: 'col_30th_night_upc_order',
      productId: 'collector_30th_night_upc_box',
      name: COLLECTOR_BOX_SETS.collector_30th_night_upc.name,
      setName: COLLECTOR_BOX_SETS.collector_30th_night_upc.series,
      generation: 'VIP COLLECTOR (1×1)',
      pricePerUnit: COLLECTOR_BOX_SETS.collector_30th_night_upc.boxWholesalePrice,
      bundleCount: 1,
      price: COLLECTOR_BOX_SETS.collector_30th_night_upc.boxWholesalePrice,
      retailSuggested: COLLECTOR_BOX_SETS.collector_30th_night_upc.boxRetailPrice,
      unlocked: shopState.storeLevel >= 10,
      image: COLLECTOR_BOX_SETS.collector_30th_night_upc.boxImageUrl,
      badge: shopState.storeLevel >= 10 ? '👑 VIP Siêu Lợi Nhuận' : '🔒 Khóa (Cấp 10)',
      tag: '20 Packs · Lãi +$550 (122%)',
      type: 'box' as const,
    },
    {
      id: 'col_sv151_upc_order',
      productId: 'collector_sv151_upc_box',
      name: COLLECTOR_BOX_SETS.collector_sv151_upc.name,
      setName: COLLECTOR_BOX_SETS.collector_sv151_upc.series,
      generation: 'VIP COLLECTOR (1×1)',
      pricePerUnit: COLLECTOR_BOX_SETS.collector_sv151_upc.boxWholesalePrice,
      bundleCount: 1,
      price: COLLECTOR_BOX_SETS.collector_sv151_upc.boxWholesalePrice,
      retailSuggested: COLLECTOR_BOX_SETS.collector_sv151_upc.boxRetailPrice,
      unlocked: shopState.storeLevel >= 10,
      image: COLLECTOR_BOX_SETS.collector_sv151_upc.boxImageUrl,
      badge: shopState.storeLevel >= 10 ? '👑 VIP Siêu Lợi Nhuận' : '🔒 Khóa (Cấp 10)',
      tag: '16 Packs · Lãi +$470 (124%)',
      type: 'box' as const,
    },
    {
      id: 'col_prismatic_spc_order',
      productId: 'collector_prismatic_spc_box',
      name: COLLECTOR_BOX_SETS.collector_prismatic_spc.name,
      setName: COLLECTOR_BOX_SETS.collector_prismatic_spc.series,
      generation: 'VIP COLLECTOR (1×1)',
      pricePerUnit: COLLECTOR_BOX_SETS.collector_prismatic_spc.boxWholesalePrice,
      bundleCount: 1,
      price: COLLECTOR_BOX_SETS.collector_prismatic_spc.boxWholesalePrice,
      retailSuggested: COLLECTOR_BOX_SETS.collector_prismatic_spc.boxRetailPrice,
      unlocked: shopState.storeLevel >= 10,
      image: COLLECTOR_BOX_SETS.collector_prismatic_spc.boxImageUrl,
      badge: shopState.storeLevel >= 10 ? '👑 VIP Siêu Lợi Nhuận' : '🔒 Khóa (Cấp 10)',
      tag: '15 Packs · Lãi +$160 (145%)',
      type: 'box' as const,
    },
    {
      id: 'col_25th_upc_order',
      productId: 'collector_25th_upc_box',
      name: COLLECTOR_BOX_SETS.collector_25th_upc.name,
      setName: COLLECTOR_BOX_SETS.collector_25th_upc.series,
      generation: 'VIP COLLECTOR (1×1)',
      pricePerUnit: COLLECTOR_BOX_SETS.collector_25th_upc.boxWholesalePrice,
      bundleCount: 1,
      price: COLLECTOR_BOX_SETS.collector_25th_upc.boxWholesalePrice,
      retailSuggested: COLLECTOR_BOX_SETS.collector_25th_upc.boxRetailPrice,
      unlocked: shopState.storeLevel >= 10,
      image: COLLECTOR_BOX_SETS.collector_25th_upc.boxImageUrl,
      badge: shopState.storeLevel >= 10 ? '👑 VIP Siêu Lợi Nhuận' : '🔒 Khóa (Cấp 10)',
      tag: '25 Packs · Lãi +$750 (150%)',
      type: 'box' as const,
    },
    {
      id: 'gamestop_mystery_gold_order',
      productId: 'gamestop_mystery_gold_box',
      name: GAMESTOP_MYSTERY_SETS.gamestop_mystery_gold.name,
      setName: GAMESTOP_MYSTERY_SETS.gamestop_mystery_gold.series,
      generation: 'GameStop Exclusive',
      pricePerUnit: GAMESTOP_MYSTERY_SETS.gamestop_mystery_gold.boxWholesalePrice,
      bundleCount: 1,
      price: GAMESTOP_MYSTERY_SETS.gamestop_mystery_gold.boxWholesalePrice,
      retailSuggested: GAMESTOP_MYSTERY_SETS.gamestop_mystery_gold.boxRetailPrice,
      unlocked: shopState.storeLevel >= 8,
      image: GAMESTOP_MYSTERY_SETS.gamestop_mystery_gold.boxImageUrl,
      badge: shopState.storeLevel >= 8 ? 'Cấp 8 Mở Khóa' : 'Khóa (Cấp 8)',
      tag: '1 PSA/CGC 10 Slab + 2 Packs',
      type: 'box' as const,
    },
    {
      id: 'gamestop_mystery_charizard_order',
      productId: 'gamestop_mystery_charizard_box',
      name: GAMESTOP_MYSTERY_SETS.gamestop_mystery_charizard.name,
      setName: GAMESTOP_MYSTERY_SETS.gamestop_mystery_charizard.series,
      generation: 'GameStop Exclusive',
      pricePerUnit: GAMESTOP_MYSTERY_SETS.gamestop_mystery_charizard.boxWholesalePrice,
      bundleCount: 1,
      price: GAMESTOP_MYSTERY_SETS.gamestop_mystery_charizard.boxWholesalePrice,
      retailSuggested: GAMESTOP_MYSTERY_SETS.gamestop_mystery_charizard.boxRetailPrice,
      unlocked: shopState.storeLevel >= 8,
      image: GAMESTOP_MYSTERY_SETS.gamestop_mystery_charizard.boxImageUrl,
      badge: shopState.storeLevel >= 8 ? 'Cấp 8 Mở Khóa' : 'Khóa (Cấp 8)',
      tag: '1 PSA/CGC 10 Slab + 2 Packs',
      type: 'box' as const,
    },
    {
      id: 'gamestop_mystery_black_order',
      productId: 'gamestop_mystery_black_box',
      name: GAMESTOP_MYSTERY_SETS.gamestop_mystery_black.name,
      setName: GAMESTOP_MYSTERY_SETS.gamestop_mystery_black.series,
      generation: 'GameStop Exclusive',
      pricePerUnit: GAMESTOP_MYSTERY_SETS.gamestop_mystery_black.boxWholesalePrice,
      bundleCount: 1,
      price: GAMESTOP_MYSTERY_SETS.gamestop_mystery_black.boxWholesalePrice,
      retailSuggested: GAMESTOP_MYSTERY_SETS.gamestop_mystery_black.boxRetailPrice,
      unlocked: shopState.storeLevel >= 8,
      image: GAMESTOP_MYSTERY_SETS.gamestop_mystery_black.boxImageUrl,
      badge: shopState.storeLevel >= 8 ? 'Cấp 8 Mở Khóa' : 'Khóa (Cấp 8)',
      tag: '1 PSA/CGC 10 Slab + 2 Packs',
      type: 'box' as const,
    },
    // ==========================================
    // 8 POKÉMON MYSTERY GACHA PACKS (KỆ GONDOLA GIỮA SHOP - CẤP 7)
    // ==========================================
    ...Object.values(GACHA_PACK_TIERS).map((tier) => ({
      id: `order_gacha_${tier.id}`,
      productId: `gacha_${tier.id}`,
      name: `Mystery Pack: ${tier.name}`,
      setName: 'Pokémon Mystery Pack Gondola',
      generation: `TIER ${tier.rank} · GACHA GONDOLA`,
      pricePerUnit: Math.round(tier.price * 0.7 * 100) / 100,
      bundleCount: 1,
      price: Math.round(tier.price * 0.7 * 100) / 100,
      retailSuggested: tier.price,
      unlocked: shopState.storeLevel >= 7,
      image: tier.imageUrl,
      badge: shopState.storeLevel >= 7 ? `Tier ${tier.rank} Mystery` : 'Khóa (Cấp 7)',
      tag: `Top Slab $${tier.topJackpot.toLocaleString()} · Kệ Gondola`,
      type: 'pack' as const,
    })),
  ];

  // Facilities catalog (Image 6 Display Table, Image 3 Cashier Counter, Shelves)
  const facilitiesCatalog = [
    {
      id: 'facility_showcase_table',
      name: 'Bàn Trưng Bày Thẻ Hiếm 10 Chân Đứng Vàng (Card Display Table)',
      category: 'Display Table',
      price: 350.0,
      image: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/rare-candy.png',
      icon: '🏆',
      description: 'Mẫu bàn gỗ cao cấp gồm 10 chân đứng kim loại mạ vàng chữ T xếp 2 hàng 5 để chưng bán các thẻ quý (Ảnh 5 & 6)!',
    },
    {
      id: 'facility_cashier_desk',
      name: 'Quầy Thu Ngân Hiện Đại Bo Cong Chữ U (Cashier Counter)',
      category: 'Counter',
      price: 500.0,
      image: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/amulet-coin.png',
      icon: '🏪',
      description: 'Quầy thu ngân chữ U chuẩn cửa hàng TCG Card Shop kèm màn hình cảm ứng POS và máy POS bấm số (Ảnh 3 & 4)!',
    },
    {
      id: 'facility_double_shelf',
      name: 'Kệ Trưng Bày Đôi Đa Năng (Double Shelf Unit)',
      category: 'Shelf',
      price: 280.0,
      image: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png',
      icon: '🪜',
      description: 'Kệ trưng bày 4 tầng để đặt pack bài, booster box và phụ kiện cho khách tham quan tự do chọn lựa.',
    },
    {
      id: 'facility_single_shelf',
      name: 'Kệ Trưng Bày Đơn Áp Tường (Single Wall Shelf)',
      category: 'Shelf',
      price: 150.0,
      image: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/great-ball.png',
      icon: '📦',
      description: 'Kệ đơn gọn gàng áp sát tường giúp tối ưu diện tích sàn và lối đi cho khách hàng.',
    },
    {
      id: 'facility_play_table',
      name: 'Bàn Đấu Thẻ TCG Đôi (Play Table)',
      category: 'Entertainment',
      price: 220.0,
      image: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/ultra-ball.png',
      icon: '🎲',
      description: 'Bàn đấu thẻ bài 2 người kèm thảm playmat, thu hút hội bài thủ tụ họp và tăng danh tiếng cửa tiệm.',
    },
  ];

  // Figures & Merchandise
  const figureCatalog = [
    {
      id: 'fig_pikachu_scale',
      name: 'Mô Hình Pikachu Vinyl 1/8 Scale',
      price: 45.0,
      retailSuggested: 75.0,
      image: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png',
      description: 'Mô hình Pikachu chính hãng sắc nét, món đồ lưu niệm đắt hàng nhất tiệm!',
      type: 'accessory' as const,
    },
    {
      id: 'fig_charizard_flame',
      name: 'Mô Hình Charizard Rực Lửa LED Deluxe',
      price: 120.0,
      retailSuggested: 195.0,
      image: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/6.png',
      description: 'Tượng Charizard có đèn LED bốc lửa, biểu tượng đẳng cấp của mọi cửa hàng Pokemon TCG!',
      type: 'accessory' as const,
    },
    {
      id: 'fig_mew_crystal',
      name: 'Tượng Pha Lê Mew 3D Hologram 30th',
      price: 250.0,
      retailSuggested: 420.0,
      image: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/151.png',
      description: 'Pha lê khắc laser 3D thần thoại Mew kỉ niệm 30 năm, bảo vật thu hút Whale collector.',
      type: 'accessory' as const,
    },
  ];

  const merchCatalog = [
    {
      id: 'merch_sleeves_pikachu',
      name: 'Bọc Bài Pikachu Matte Sleeves (65x)',
      price: 6.0,
      retailSuggested: 12.0,
      image: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/master-ball.png',
      description: 'Bọc thẻ nhám cao cấp bảo vệ thẻ bài khỏi trầy xước và ẩm ướt.',
      type: 'accessory' as const,
    },
    {
      id: 'merch_deck_box',
      name: 'Hộp Đựng Bài Da Từ Tính TCG Deck Box',
      price: 14.0,
      retailSuggested: 28.0,
      image: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/nest-ball.png',
      description: 'Hộp da nam châm sang trọng chứa được 100+ lá bài có bọc đôi.',
      type: 'accessory' as const,
    },
    {
      id: 'merch_playmat_champions',
      name: 'Thảm Đấu Bài World Championship Playmat',
      price: 18.0,
      retailSuggested: 35.0,
      image: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/dusk-ball.png',
      description: 'Thảm cao su chống trượt in hình đấu trường thi đấu Pokemon đỉnh cao.',
      type: 'accessory' as const,
    },
  ];

  // One Piece Cardpack Catalog (Tầng 2 - Grand Line Edition)
  const onePieceCardPackCatalog = [
    // Standard Booster Sets (Level 10-20 & Reserved Level 21+)
    ...ALL_ONEPIECE_BOOSTER_SETS.flatMap((set) => {
      const packProdId = `${set.id}_pack`;
      const boxProdId = `${set.id}_box`;
      const packLic = ONEPIECE_PRODUCT_LICENSES.find((l) => l.productId === packProdId);
      const boxLic = ONEPIECE_PRODUCT_LICENSES.find((l) => l.productId === boxProdId);
      const isLevel10to20 = set.unlockLevel <= 20;
      const genLabel = isLevel10to20 ? 'ONE PIECE BOOSTER (CẤP 10-20)' : 'ONE PIECE GRAIL (CẤP 21+)';

      const hasPackLic = hasProductLicense(shopState.purchasedLicenses, packProdId);
      const hasBoxLic = hasProductLicense(shopState.purchasedLicenses, boxProdId);
      const levelMet = shopState.storeLevel >= set.unlockLevel;

      return [
        {
          id: `bundle_${set.id}_pack_tab`,
          productId: packProdId,
          name: `Pack ${set.name} (6 Thẻ)`,
          setName: set.name,
          generation: genLabel,
          pricePerUnit: set.packWholesalePrice,
          bundleCount: 10,
          price: Math.round(set.packWholesalePrice * 10 * 100) / 100,
          retailSuggested: set.packRetailPrice,
          unlocked: hasPackLic && levelMet,
          image: set.packImageUrl,
          badge: levelMet
            ? hasPackLic
              ? 'Đã Có Giấy Phép'
              : `Cần Giấy Phép ($${packLic?.licenseFee?.toLocaleString() || '...'})`
            : `Khóa Cấp ${set.unlockLevel}`,
          tag: 'x 10 Packs (6 Thẻ/Gói)',
          type: 'pack' as const,
          universe: 'onepiece' as const,
        },
        {
          id: `bundle_${set.id}_box_tab`,
          productId: boxProdId,
          name: `Booster Box ${set.name} (24 Packs)`,
          setName: set.name,
          generation: genLabel,
          pricePerUnit: set.boxWholesalePrice,
          bundleCount: 1,
          price: set.boxWholesalePrice,
          retailSuggested: set.boxRetailPrice,
          unlocked: hasBoxLic && levelMet,
          image: set.boxImageUrl,
          badge: levelMet
            ? hasBoxLic
              ? 'Đã Có Giấy Phép'
              : `Cần Giấy Phép ($${boxLic?.licenseFee?.toLocaleString() || '...'})`
            : `Khóa Cấp ${set.unlockLevel}`,
          tag: '1 Box · 24 Packs (144 Thẻ)',
          type: 'box' as const,
          universe: 'onepiece' as const,
        },
      ];
    }),
    // VIP Collector Boxes 1x1 (Tường Trái Tầng 2)
    {
      id: 'bundle_op_col_luffy_gear5',
      productId: 'op_col_luffy_gear5_box',
      name: 'Rương Luffy Gear 5 Nika Ultra-Premium Treasure (20 Packs)',
      setName: 'Luffy Gear 5 Nika Ultra-Premium',
      generation: 'ONE PIECE VIP COLLECTOR (1×1)',
      pricePerUnit: 460.0,
      bundleCount: 1,
      price: 460.0,
      retailSuggested: 1020.0,
      unlocked: hasProductLicense(shopState.purchasedLicenses, 'op_col_luffy_gear5_box') && shopState.storeLevel >= 9,
      image: ONEPIECE_COLLECTOR_BOX_SETS.op_col_luffy_gear5.boxImageUrl,
      badge: shopState.storeLevel >= 9 ? (hasProductLicense(shopState.purchasedLicenses, 'op_col_luffy_gear5_box') ? 'Sẵn Sàng' : 'Cần Giấy Phép ($1,250)') : 'Khóa Cấp 9',
      tag: '1 Hộp · 20 Packs',
      type: 'box' as const,
      universe: 'onepiece' as const,
    },
    {
      id: 'bundle_op_col_four_emperors',
      productId: 'op_col_four_emperors_box',
      name: 'Rương Four Emperors Imperial Vault Box (16 Packs)',
      setName: 'Four Emperors Imperial Vault',
      generation: 'ONE PIECE VIP COLLECTOR (1×1)',
      pricePerUnit: 390.0,
      bundleCount: 1,
      price: 390.0,
      retailSuggested: 880.0,
      unlocked: hasProductLicense(shopState.purchasedLicenses, 'op_col_four_emperors_box') && shopState.storeLevel >= 9,
      image: ONEPIECE_COLLECTOR_BOX_SETS.op_col_four_emperors.boxImageUrl,
      badge: shopState.storeLevel >= 9 ? (hasProductLicense(shopState.purchasedLicenses, 'op_col_four_emperors_box') ? 'Sẵn Sàng' : 'Cần Giấy Phép ($1,500)') : 'Khóa Cấp 9',
      tag: '1 Hộp · 16 Packs',
      type: 'box' as const,
      universe: 'onepiece' as const,
    },
    {
      id: 'bundle_op_col_roger_gold',
      productId: 'op_col_roger_gold_box',
      name: 'Rương Gol D. Roger Laugh Tale Sovereign Trunk (22 Packs)',
      setName: 'Gol D. Roger Sovereign Trunk',
      generation: 'ONE PIECE VIP COLLECTOR (1×1)',
      pricePerUnit: 480.0,
      bundleCount: 1,
      price: 480.0,
      retailSuggested: 1150.0,
      unlocked: hasProductLicense(shopState.purchasedLicenses, 'op_col_roger_gold_box') && shopState.storeLevel >= 10,
      image: ONEPIECE_COLLECTOR_BOX_SETS.op_col_roger_gold.boxImageUrl,
      badge: shopState.storeLevel >= 10 ? (hasProductLicense(shopState.purchasedLicenses, 'op_col_roger_gold_box') ? 'Sẵn Sàng' : 'Cần Giấy Phép ($1,850)') : 'Khóa Cấp 10',
      tag: '1 Hộp · 22 Packs',
      type: 'box' as const,
      universe: 'onepiece' as const,
    },
    {
      id: 'bundle_op_col_anniversary_trunk',
      productId: 'op_col_anniversary_trunk_box',
      name: 'Rương Grand Line 25th Anniversary Trunk (25 Packs)',
      setName: 'Grand Line 25th Trunk',
      generation: 'ONE PIECE VIP COLLECTOR (1×1)',
      pricePerUnit: 520.0,
      bundleCount: 1,
      price: 520.0,
      retailSuggested: 1300.0,
      unlocked: hasProductLicense(shopState.purchasedLicenses, 'op_col_anniversary_trunk_box') && shopState.storeLevel >= 10,
      image: ONEPIECE_COLLECTOR_BOX_SETS.op_col_anniversary_trunk.boxImageUrl,
      badge: shopState.storeLevel >= 10 ? (hasProductLicense(shopState.purchasedLicenses, 'op_col_anniversary_trunk_box') ? 'Sẵn Sàng' : 'Cần Giấy Phép ($2,500)') : 'Khóa Cấp 10',
      tag: '1 Hộp · 25 Packs',
      type: 'box' as const,
      universe: 'onepiece' as const,
    },
  ];

  // One Piece Gacha Mystery Packs (Trái Ác Quỷ)
  const onePieceGachaPackCatalog = Object.values(OP_GACHA_PACK_TIERS).map((tier) => ({
    id: `bundle_gacha_${tier.id}_tab`,
    productId: `gacha_${tier.id}`,
    name: `Trái Ác Quỷ: ${tier.vietnameseName}`,
    setName: tier.name,
    generation: 'DEVIL FRUIT GACHA (TẦNG 2)',
    pricePerUnit: Math.round(tier.price * 0.6 * 100) / 100,
    bundleCount: 1,
    price: Math.round(tier.price * 0.6 * 100) / 100,
    retailSuggested: tier.price,
    unlocked: shopState.storeLevel >= 7,
    image: tier.imageUrl,
    badge: `Tier ${tier.rank} · ${tier.name}`,
    tag: `Sàn $${tier.floorPrice} · Hũ $${tier.topJackpot.toLocaleString()}`,
    type: 'pack' as const,
    universe: 'onepiece' as const,
  }));

  // One Piece Bounty Mystery Boxes (Kệ Truy Nã)
  const onePieceBountyBoxCatalog = ALL_ONEPIECE_BOUNTY_SETS.map((box) => ({
    id: `bundle_${box.id}_tab`,
    productId: `${box.id}_box`,
    name: box.name,
    setName: box.series,
    generation: 'ONE PIECE BOUNTY EXCLUSIVE',
    pricePerUnit: box.boxWholesalePrice,
    bundleCount: 1,
    price: box.boxWholesalePrice,
    retailSuggested: box.boxRetailPrice,
    unlocked: shopState.storeLevel >= (box.unlockLevel || 10),
    image: box.boxImageUrl,
    badge: `Cấp ${box.unlockLevel || 10} · Cam kết Slab 10`,
    tag: `${box.coverPokemon}`,
    type: 'box' as const,
    universe: 'onepiece' as const,
  }));

  // Cart operations
  const handleAddToCart = (itemId: string) => {
    const item = allOrderableItems.find((i) => i.id === itemId);
    if (item && 'unlocked' in item && !(item as any).unlocked) {
      soundManager.playWrongBuzzer();
      return;
    }
    soundManager.playSelectSound();
    setCart((prev) => ({
      ...prev,
      [itemId]: (prev[itemId] || 0) + 1,
    }));
  };

  const handleRemoveFromCart = (itemId: string) => {
    soundManager.playSelectSound();
    setCart((prev) => {
      const current = prev[itemId] || 0;
      if (current <= 1) {
        const next = { ...prev };
        delete next[itemId];
        return next;
      }
      return { ...prev, [itemId]: current - 1 };
    });
  };

  // Calculate cart total across all Pokémon and One Piece items
  const allOrderableItems = [
    ...cardPackCatalog.map((i) => ({ ...i, category: 'pack' })),
    ...onePieceCardPackCatalog.map((i) => ({ ...i, category: 'pack' })),
    ...onePieceGachaPackCatalog.map((i) => ({ ...i, category: 'pack' })),
    ...onePieceBountyBoxCatalog.map((i) => ({ ...i, category: 'box' })),
    ...facilitiesCatalog.map((i) => ({ ...i, bundleCount: 1, type: 'accessory' as const, category: 'facility' })),
    ...figureCatalog.map((i) => ({ ...i, bundleCount: 1, type: 'accessory' as const, category: 'figure' })),
    ...merchCatalog.map((i) => ({ ...i, bundleCount: 1, type: 'accessory' as const, category: 'merchandise' })),
  ];

  const wholesaleDiscount = getMasterSetWholesaleDiscount(shopState.claimedMasterSetMilestones || []);
  const wholesaleDiscountPct = Math.round(wholesaleDiscount * 100);

  const rawCartCost = Object.entries(cart).reduce((sum, [id, qty]) => {
    const item = allOrderableItems.find((i) => i.id === id);
    return sum + (item ? item.price * qty : 0);
  }, 0);
  const totalCartCost = Number((rawCartCost * (1 - wholesaleDiscount)).toFixed(2));

  const totalCartCount = Object.values(cart).reduce((a, b) => a + b, 0);

  // Submit cart order
  const handleCheckoutCart = () => {
    if (totalCartCost > shopState.cash) {
      soundManager.playWrongBuzzer();
      setOrderSuccessNotice('⚠️ Không đủ tiền trong quỹ cửa hàng để đặt lô hàng này!');
      setTimeout(() => setOrderSuccessNotice(null), 3000);
      return;
    }

    soundManager.playCashRegister();
    confetti({ particleCount: 60, spread: 70 });

    const orderPayload: Array<{ item: Partial<InventoryItem>; count: number; totalCost: number }> = [];

    Object.entries(cart).forEach(([id, qty]) => {
      const product = allOrderableItems.find((i) => i.id === id);
      if (!product) return;
      const discountedUnitCost = Number(((product.price / (product.bundleCount || 1)) * (1 - wholesaleDiscount)).toFixed(2));

      orderPayload.push({
        item: {
          productId: (product as any).productId || product.id,
          name: product.name,
          setName: (product as any).setName,
          type: (product as any).type || 'accessory',
          wholesaleCost: discountedUnitCost,
          retailPrice: (product as any).retailSuggested || product.price * 1.5,
        },
        count: (product.bundleCount || 1) * qty,
        totalCost: Number((product.price * qty * (1 - wholesaleDiscount)).toFixed(2)),
      });
    });

    onOrderStock(orderPayload);
    setCart({});
    setShowCartDrawer(false);
    setOrderSuccessNotice(
      wholesaleDiscountPct > 0
        ? `Đã đặt ${orderPayload.length} lô hàng (Giảm sỉ Master Set -${wholesaleDiscountPct}%)!`
        : `Đã đặt thành công ${orderPayload.length} lô hàng! Hàng đã về kho.`
    );
    setTimeout(() => setOrderSuccessNotice(null), 3000);
  };

  const renderCatalogPackItem = (pack: any) => {
    const matchingLicense = PRODUCT_LICENSES.find(
      (lic) => lic.productId === pack.productId || lic.id === pack.productId
    );
    const requiredLevel = matchingLicense?.level || 1;
    const licenseFee = matchingLicense?.licenseFee || 0;
    const isLevelMet = shopState.storeLevel >= requiredLevel;
    const isUnlocked = pack.unlocked;
    const hasCash = shopState.cash >= licenseFee;
    const isOp10Box = pack.productId === 'op10RoyalBlood_box';
    const isOp10Pack = pack.productId === 'op10RoyalBlood_pack';

    return (
      <div
        key={pack.id}
        className={`rounded-xl border-2 p-3 shadow transition flex flex-col justify-between relative overflow-hidden ${
          isOp10Box
            ? 'border-amber-500 bg-gradient-to-b from-amber-50/90 via-white to-amber-50/50 shadow-lg ring-2 ring-amber-400/60 hover:shadow-xl'
            : isUnlocked
            ? 'border-zinc-200 bg-white hover:shadow-md'
            : isLevelMet
            ? 'border-amber-400 bg-gradient-to-b from-amber-50/70 to-white hover:shadow-md hover:border-amber-500'
            : 'border-zinc-300 bg-zinc-100 opacity-75'
        }`}
      >
        {isOp10Box && (
          <div className="absolute top-0 right-0 bg-gradient-to-r from-red-600 via-amber-500 to-yellow-400 text-black font-black text-[10px] px-2.5 py-0.5 rounded-bl-lg shadow-sm z-10 uppercase tracking-wider">
            ⭐ Box Rẻ Nhất $16.20
          </div>
        )}
        {isOp10Pack && (
          <div className="absolute top-0 right-0 bg-gradient-to-r from-sky-600 to-cyan-500 text-white font-black text-[10px] px-2.5 py-0.5 rounded-bl-lg shadow-sm z-10 uppercase tracking-wider">
            ⭐ Gói Rẻ Nhất $1.80
          </div>
        )}
        <div className="relative h-40 w-full rounded-lg bg-zinc-100 overflow-hidden flex items-center justify-center p-2 mb-2">
          <img
            src={pack.image}
            alt={pack.name}
            className={`h-full object-contain transition ${
              !isUnlocked ? (isLevelMet ? 'filter brightness-95' : 'grayscale') : ''
            }`}
          />
          <span className="absolute top-2 left-2 rounded bg-black/70 px-2 py-0.5 text-[10px] font-bold text-white">
            {pack.tag}
          </span>

          {!isUnlocked && (
            <div className="absolute inset-0 bg-black/55 flex flex-col items-center justify-center p-2 text-center text-white">
              {isLevelMet ? (
                <div className="flex flex-col items-center gap-1">
                  <span className="text-xl">📜</span>
                  <span className="text-[11px] font-black text-amber-300">
                    Đủ Cấp {requiredLevel}
                  </span>
                  <span className="text-[10px] font-bold bg-amber-950/80 text-amber-200 px-2 py-0.5 rounded border border-amber-500/50">
                    Cần Mua Giấy Phép (${licenseFee})
                  </span>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <Lock className="h-7 w-7 text-zinc-300 mb-1" />
                  <span className="text-[11px] font-black text-amber-300">
                    Khóa Cấp {requiredLevel}
                  </span>
                  <span className="text-[9px] text-zinc-300 mt-0.5">
                    (Tiệm hiện tại: Cấp {shopState.storeLevel})
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        <div>
          <div className="text-xs font-black text-zinc-900 truncate" title={pack.name}>
            {pack.name}
          </div>
          <div className="text-[11px] text-zinc-500 flex items-center justify-between mt-0.5">
            <span>{pack.tag}</span>
            <span className="text-emerald-700 font-bold">Bán gợi ý: ${pack.retailSuggested.toFixed(2)}</span>
          </div>
        </div>

        <div className="mt-3 pt-2 border-t border-zinc-200 flex items-center justify-between gap-1.5">
          <div>
            <div className="text-[10px] text-zinc-400 font-bold">Giá sỉ</div>
            <div className="text-sm font-black text-zinc-900">
              ${pack.price.toLocaleString()}
            </div>
          </div>

          {isUnlocked ? (
            <button
              onClick={() => handleAddToCart(pack.id)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#0284c7] hover:bg-sky-600 active:scale-95 text-white font-black text-xs shadow cursor-pointer transition"
            >
              <ShoppingCart className="h-3.5 w-3.5" />
              <span>Thêm</span>
            </button>
          ) : isLevelMet && matchingLicense ? (
            <button
              onClick={() => {
                if (onPurchaseLicense) {
                  onPurchaseLicense(matchingLicense.id, licenseFee);
                }
              }}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-black text-xs shadow cursor-pointer transition active:scale-95 ${
                hasCash
                  ? 'bg-amber-400 hover:bg-amber-500 text-amber-950 border border-amber-500 animate-pulse'
                  : 'bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300'
              }`}
              title={`Nhấn để trả tiền mua giấy phép $${licenseFee} và mở khóa vĩnh viễn!`}
            >
              <FileText className="h-3.5 w-3.5 shrink-0 text-amber-950" />
              <span>Mua Giấy Phép (${licenseFee})</span>
            </button>
          ) : (
            <button
              disabled
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-zinc-200 text-zinc-500 font-bold text-xs cursor-not-allowed border border-zinc-300"
            >
              <Lock className="h-3 w-3 shrink-0" />
              <span>Khóa Cấp {requiredLevel}</span>
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-2 sm:p-4 select-none animate-in fade-in duration-200">
      {/* TABLET CHASSIS - MATCHING ẢNH 1 & ẢNH 2 */}
      <div className="relative w-full max-w-5xl h-[92vh] max-h-[720px] rounded-[36px] bg-[#121316] p-3 sm:p-4 shadow-[0_25px_80px_rgba(0,0,0,0.95)] border-4 border-[#2a2d34] flex flex-col justify-between overflow-hidden">
        {/* Tablet Camera Notch on Left Edge */}
        <div className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-8 bg-zinc-700/80 rounded-full" />

        {/* TOP STATUS BAR (08:00 AM, SIGNAL, BATTERY, CLOSE [X] - MATCHING ẢNH 1) */}
        <div className="relative z-20 flex items-center justify-between px-3 py-1.5 rounded-t-2xl bg-black/40 text-white border-b border-white/10 text-xs">
          {/* Time & Day */}
          <div className="flex items-center gap-3">
            <span className="font-extrabold text-sm tracking-wide text-white font-mono">08:00 AM</span>
            <span className="text-[11px] text-zinc-400 font-bold hidden sm:inline">Mon 01 · Day {shopState.currentDay || 1}</span>
            <span className="text-[11px] font-black text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-500/40">
              Quỹ Tiệm: ${shopState.cash.toFixed(2)}
            </span>
          </div>

          {/* Right Status Icons */}
          <div className="flex items-center gap-3">
            {/* Signal Bars */}
            <div className="flex items-end gap-0.5 h-3" title="Wifi Signal Full">
              <span className="w-1 h-1 bg-white rounded-xs" />
              <span className="w-1 h-2 bg-white rounded-xs" />
              <span className="w-1 h-2.5 bg-white rounded-xs" />
              <span className="w-1 h-3 bg-white rounded-xs" />
            </div>

            {/* Battery Indicator */}
            <div className="flex items-center gap-0.5" title="Battery 100%">
              <div className="w-6 h-3 rounded-xs border border-white p-0.5 flex items-center">
                <div className="w-full h-full bg-emerald-400 rounded-2xs" />
              </div>
              <div className="w-0.5 h-1.5 bg-white rounded-r-xs" />
            </div>

            {/* Red Close Button [X] (Matching Ảnh 1 & 2) */}
            <button
              onClick={onClose}
              title="Đóng Tablet [TAB]"
              className="flex h-6 w-6 items-center justify-center rounded-md bg-[#e53935] hover:bg-red-600 text-white font-black text-xs shadow cursor-pointer transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* VIEW 1: TABLET HOME SCREEN (EXACT ẢNH 1 REPLICA WITH 12 APP ICONS)       */}
        {/* ========================================================================= */}
        {currentApp === 'home' && (
          <div
            className="flex-1 relative flex flex-col justify-between p-4 sm:p-8 rounded-b-2xl overflow-hidden bg-cover bg-center bg-no-repeat"
            style={{
              backgroundImage: 'url("https://i.pinimg.com/736x/70/33/19/70331930b71a21e3ef8c016f5f5eef88.jpg")',
            }}
          >
            {/* Subtle dark backdrop overlay to ensure app icons pop cleanly */}
            <div className="absolute inset-0 bg-black/30 pointer-events-none" />

            {/* 12 App Icons Grid (Matching Ảnh 1) */}
            <div className="relative z-10 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4 sm:gap-6 md:gap-7 my-auto max-w-4xl mx-auto w-full">
              {/* 1. Supply App (Opens www.pokemoecard.com/Shop/Card - Ảnh 2) */}
              <div
                onClick={() => {
                  soundManager.playSelectSound();
                  setCurrentApp('supply');
                }}
                className="group flex flex-col items-center gap-2 cursor-pointer transition transform hover:scale-105"
              >
                <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white shadow-xl flex items-center justify-center border-2 border-white/80 group-hover:border-cyan-300">
                  <div className="absolute inset-2 rounded-xl bg-gradient-to-tr from-amber-400 via-rose-500 to-cyan-400 opacity-90 flex items-center justify-center">
                    <ShoppingCart className="h-8 w-8 text-white drop-shadow-md" />
                  </div>
                </div>
                <span className="text-xs sm:text-sm font-extrabold text-white tracking-wide drop-shadow-md">Supply</span>
              </div>

              {/* 2. Storage App */}
              <div
                onClick={() => {
                  soundManager.playSelectSound();
                  setCurrentApp('storage');
                }}
                className="group flex flex-col items-center gap-2 cursor-pointer transition transform hover:scale-105"
              >
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-[#0284c7] shadow-xl flex items-center justify-center border-2 border-cyan-300/80 group-hover:border-white">
                  <Warehouse className="h-8 w-8 text-white drop-shadow-md" />
                </div>
                <span className="text-xs sm:text-sm font-extrabold text-white tracking-wide drop-shadow-md">Storage</span>
              </div>

              {/* 6. Manage App */}
              <div
                onClick={() => {
                  soundManager.playSelectSound();
                  setCurrentApp('manage');
                }}
                className="group flex flex-col items-center gap-2 cursor-pointer transition transform hover:scale-105"
              >
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-[#7c3aed] shadow-xl flex items-center justify-center border-2 border-purple-300/80 group-hover:border-white">
                  <FolderOpen className="h-8 w-8 text-white drop-shadow-md" />
                </div>
                <span className="text-xs sm:text-sm font-extrabold text-white tracking-wide drop-shadow-md">Manage</span>
              </div>

              {/* 7. Employee App (Thuê Nhân Viên Theo Giờ) */}
              <div
                onClick={() => {
                  soundManager.playSelectSound();
                  setCurrentApp('employee');
                }}
                className="group flex flex-col items-center gap-2 cursor-pointer transition transform hover:scale-105"
              >
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-[#1e40af] shadow-xl flex items-center justify-center border-2 border-blue-400/80 group-hover:border-white">
                  <Users className="h-8 w-8 text-white drop-shadow-md" />
                </div>
                <span className="text-xs sm:text-sm font-extrabold text-white tracking-wide drop-shadow-md">Employee</span>
              </div>

              {/* 8. Bill App */}
              <div
                onClick={() => {
                  soundManager.playSelectSound();
                  setCurrentApp('bill');
                }}
                className="group flex flex-col items-center gap-2 cursor-pointer transition transform hover:scale-105"
              >
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-[#0284c7] shadow-xl flex items-center justify-center border-2 border-sky-300/80 group-hover:border-white">
                  <FileCheck className="h-8 w-8 text-white drop-shadow-md" />
                </div>
                <span className="text-xs sm:text-sm font-extrabold text-white tracking-wide drop-shadow-md">Bill</span>
              </div>

              {/* 9. Daily Task App */}
              {(() => {
                const claimableTasks = getDailyTaskProgressList(shopState).filter(
                  (t) => t.completed && !t.claimed
                ).length;
                return (
                  <div
                    onClick={() => {
                      soundManager.playSelectSound();
                      setCurrentApp('daily_task');
                    }}
                    className="group relative flex flex-col items-center gap-2 cursor-pointer transition transform hover:scale-105"
                  >
                    <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-[#9333ea] shadow-xl flex items-center justify-center border-2 border-purple-300/80 group-hover:border-white">
                      <TrendingUp className="h-8 w-8 text-white drop-shadow-md" />
                      {claimableTasks > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 h-6 w-6 rounded-full bg-emerald-500 border-2 border-white text-black text-[11px] font-black flex items-center justify-center shadow">
                          {claimableTasks}
                        </span>
                      )}
                    </div>
                    <span className="text-xs sm:text-sm font-extrabold text-white tracking-wide drop-shadow-md">Daily Task</span>
                  </div>
                );
              })()}

              {/* 10. Achievement App (with Notification badge '1') */}
              <div
                onClick={() => {
                  soundManager.playSelectSound();
                  setCurrentApp('achievement');
                }}
                className="group relative flex flex-col items-center gap-2 cursor-pointer transition transform hover:scale-105"
              >
                <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-[#0284c7] shadow-xl flex items-center justify-center border-2 border-cyan-300/80 group-hover:border-white">
                  <Award className="h-8 w-8 text-yellow-300 drop-shadow-md" />
                  {/* Badge 1 (Ảnh 1) */}
                  <span className="absolute -top-1.5 -right-1.5 h-6 w-6 rounded-full bg-red-600 border-2 border-white text-white text-[11px] font-black flex items-center justify-center shadow">
                    1
                  </span>
                </div>
                <span className="text-xs sm:text-sm font-extrabold text-white tracking-wide drop-shadow-md">Achievement</span>
              </div>

              {/* Battle Arena App (Bàn Đấu Pokemon - $5/h) */}
              <div
                onClick={() => {
                  soundManager.playSelectSound();
                  setCurrentApp('battle_arena');
                }}
                className="group relative flex flex-col items-center gap-2 cursor-pointer transition transform hover:scale-105"
              >
                <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-blue-700 via-indigo-600 to-sky-400 shadow-xl flex items-center justify-center border-2 border-sky-300 group-hover:border-white">
                  <Swords className="h-8 w-8 text-white drop-shadow-md" />
                  <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 rounded-full bg-emerald-500 border border-white text-white text-[10px] font-black shadow flex items-center gap-0.5">
                    ${currentRentalFee}/h
                  </span>
                </div>
                <span className="text-xs sm:text-sm font-extrabold text-sky-200 tracking-wide drop-shadow-md">Bàn Đấu</span>
              </div>

              {/* Giải Đấu App (Tổ Chức Giải Đấu Bracket 8 Đội & Tủ Cúp) */}
              {onOpenBattleArena && (
                <div
                  onClick={() => {
                    soundManager.playSelectSound();
                    onClose();
                    onOpenBattleArena();
                  }}
                  className="group relative flex flex-col items-center gap-2 cursor-pointer transition transform hover:scale-105"
                >
                  <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-rose-700 via-red-600 to-amber-500 shadow-xl flex items-center justify-center border-2 border-rose-300 group-hover:border-white">
                    <Trophy className="h-8 w-8 text-amber-100 drop-shadow-md" />
                    <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 rounded-full bg-amber-400 border border-white text-black text-[9px] font-black shadow">
                      CUP
                    </span>
                  </div>
                  <span className="text-xs sm:text-sm font-extrabold text-rose-200 tracking-wide drop-shadow-md">Giải Đấu</span>
                </div>
              )}

              {/* 14. One Piece TCG REST API App */}
              <div
                onClick={() => {
                  soundManager.playSelectSound();
                  setCurrentApp('onepiece_api');
                }}
                className="group relative flex flex-col items-center gap-2 cursor-pointer transition transform hover:scale-105"
              >
                <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-red-600 via-rose-600 to-amber-500 shadow-xl flex items-center justify-center border-2 border-rose-300 group-hover:border-white">
                  <Code className="h-8 w-8 text-white drop-shadow-md" />
                  <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 rounded-full bg-gradient-to-r from-red-600 to-amber-500 border border-white text-white text-[9px] font-black shadow">
                    REST
                  </span>
                </div>
                <span className="text-xs sm:text-sm font-extrabold text-rose-200 tracking-wide drop-shadow-md">OP API</span>
              </div>

              {/* 15. Sàn Thẻ TCG Exchange App */}
              <div
                onClick={() => {
                  soundManager.playSelectSound();
                  setCurrentApp('card_exchange');
                }}
                className="group relative flex flex-col items-center gap-2 cursor-pointer transition transform hover:scale-105"
              >
                <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-black/90 shadow-xl flex items-center justify-center border-2 border-emerald-400 group-hover:border-white overflow-hidden p-2">
                  <img
                    src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQPhGLRPvfdv_obQaacsQ7fXzW88crdY5E_oUwQAksTow&s=10"
                    alt="GMGN Logo"
                    className="w-full h-full object-contain"
                  />
                  <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 border border-white text-zinc-950 text-[9px] font-black shadow">
                    SÀN
                  </span>
                </div>
                <span className="text-xs sm:text-sm font-extrabold text-emerald-200 tracking-wide drop-shadow-md">Sàn Thẻ</span>
              </div>

              {/* 16. PokeShip Express Delivery App */}
              <div
                onClick={() => {
                  soundManager.playSelectSound();
                  setCurrentApp('pokeship');
                }}
                className="group relative flex flex-col items-center gap-2 cursor-pointer transition transform hover:scale-105"
              >
                <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-white via-emerald-50 to-emerald-100 shadow-xl flex items-center justify-center border-2 border-emerald-400/90 group-hover:border-white p-1.5">
                  <img
                    src="/assets/aistudio/image_4ef28ede.png"
                    alt="PokéShip"
                    className="w-full h-full object-contain rounded-full drop-shadow-sm"
                  />
                  <span
                    className={`absolute -top-1.5 -right-1.5 px-1.5 py-0.5 rounded-full border border-white text-[9px] font-black shadow ${
                      shopState.deliveryState?.activeMission
                        ? 'bg-amber-400 text-black'
                        : 'bg-emerald-500 text-black'
                    }`}
                  >
                    {shopState.deliveryState?.activeMission
                      ? 'ĐANG GIAO'
                      : `${shopState.deliveryState?.availableOrders?.length || 5} ĐƠN`}
                  </span>
                </div>
                <span className="text-xs sm:text-sm font-extrabold text-emerald-200 tracking-wide drop-shadow-md">PokeShip</span>
              </div>

              {/* 17. Đế Chế TCG & Săn Hàng Hiếm 3D */}
              {onOpenCityEmpire && (
                <div
                  onClick={() => {
                    soundManager.playSelectSound();
                    onClose();
                    onOpenCityEmpire();
                  }}
                  className="group relative flex flex-col items-center gap-2 cursor-pointer transition transform hover:scale-105"
                >
                  <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-amber-600 via-rose-600 to-purple-600 shadow-xl flex items-center justify-center border-2 border-amber-300 group-hover:border-white">
                    <Crown className="h-8 w-8 text-amber-100 drop-shadow-md" />
                    <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 rounded-full bg-amber-400 border border-white text-black text-[9px] font-black shadow">
                      VIP
                    </span>
                  </div>
                  <span className="text-xs sm:text-sm font-extrabold text-amber-200 tracking-wide drop-shadow-md">Đế Chế 3D</span>
                </div>
              )}

              {/* 18. PokeLive Studio (Standalone App Livestream) */}
              {onOpenPokeLive && (
                <div
                  onClick={() => {
                    soundManager.playSelectSound();
                    onClose();
                    onOpenPokeLive();
                  }}
                  className="group relative flex flex-col items-center gap-2 cursor-pointer transition transform hover:scale-105"
                >
                  <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-rose-600 via-pink-600 to-fuchsia-600 shadow-xl flex items-center justify-center border-2 border-rose-300 group-hover:border-white">
                    <Video className="h-8 w-8 text-white drop-shadow-md" />
                    <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 rounded-full bg-rose-500 border border-white text-white text-[9px] font-black shadow">
                      LIVE
                    </span>
                  </div>
                  <span className="text-xs sm:text-sm font-extrabold text-rose-200 tracking-wide drop-shadow-md">PokeLive</span>
                </div>
              )}

              {/* CardX (Chợ Mạng X / Threads & Báo Thị Trường TCG) */}
              <div
                onClick={() => {
                  soundManager.playSelectSound();
                  setCurrentApp('card_social');
                }}
                className="group relative flex flex-col items-center gap-2 cursor-pointer transition transform hover:scale-105"
              >
                <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-zinc-950 via-neutral-900 to-zinc-800 shadow-xl flex items-center justify-center border-2 border-sky-400/90 group-hover:border-white">
                  <span className="text-3xl font-black text-white drop-shadow-md">𝕏</span>
                  <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 rounded-full bg-sky-400 border border-white text-black text-[9px] font-black shadow">
                    CHỢ X
                  </span>
                </div>
                <span className="text-xs sm:text-sm font-extrabold text-sky-200 tracking-wide drop-shadow-md">CardX</span>
              </div>
            </div>

            {/* Bottom Footer Key Prompts */}
            <div className="relative z-10 flex items-center justify-between pt-4 border-t border-white/10 text-xs text-cyan-200/80">
              <span className="font-bold">PokeMoe Card Shop Tablet OS v2.6</span>
              <div className="flex items-center gap-3">
                <span className="bg-black/40 px-2.5 py-1 rounded-lg border border-white/20 font-bold text-white">
                  Nhấn <kbd className="text-amber-400 font-black">TAB</kbd> để Bật / Tắt Tablet
                </span>
                <span className="bg-black/40 px-2.5 py-1 rounded-lg border border-white/20 font-bold text-white">
                  Close <kbd className="text-amber-400 font-black">[B]</kbd>
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 2: SUPPLY BROWSER APP (EXACT ẢNH 2 REPLICA)                          */}
        {/* ========================================================================= */}
        {currentApp === 'supply' && (
          <div className="flex-1 flex flex-col bg-[#eef2f6] text-zinc-900 rounded-b-2xl overflow-hidden">
            {/* Browser URL & Navigation Bar (Ảnh 2) */}
            <div className="flex items-center justify-between px-3 py-2 bg-[#2d3748] text-white border-b border-zinc-700">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentApp('home')}
                  title="Quay lại Màn Hình Chính Tablet"
                  className="flex h-7 w-7 items-center justify-center rounded bg-zinc-700 hover:bg-zinc-600 text-zinc-300 hover:text-white cursor-pointer"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button className="flex h-7 w-7 items-center justify-center rounded bg-zinc-800 text-zinc-500 cursor-not-allowed">
                  <ChevronRight className="h-4 w-4" />
                </button>
                <button
                  onClick={() => soundManager.playSelectSound()}
                  title="Tải lại trang"
                  className="flex h-7 w-7 items-center justify-center rounded bg-zinc-700 hover:bg-zinc-600 text-zinc-300 hover:text-white cursor-pointer"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* URL Address Bar */}
              <div className="flex-1 mx-3 max-w-xl flex items-center gap-2 bg-[#1a202c] px-3 py-1.5 rounded-lg border border-zinc-600 text-xs text-zinc-300 font-mono">
                <Lock className="h-3 w-3 text-emerald-400" />
                <span className="truncate">www.pokemoecard.com/Shop/Card</span>
              </div>

              {/* Home Icon button */}
              <button
                onClick={() => setCurrentApp('home')}
                className="px-3 py-1 rounded bg-[#0284c7] hover:bg-sky-600 text-white font-black text-xs cursor-pointer shadow"
              >
                Tablet Home
              </button>
            </div>

            {/* Browser Top Tabs Bar (Items, Facilities, Expand, Decoration, 2nd Floor, Cart - Ảnh 2) */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-[#1e293b] text-white shadow-md flex-wrap gap-2">
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  onClick={() => setSupplyTab('items')}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
                    supplyTab === 'items'
                      ? 'bg-[#0284c7] text-white shadow'
                      : 'bg-[#334155] text-zinc-300 hover:bg-[#475569]'
                  }`}
                >
                  <Package className="h-3.5 w-3.5" />
                  <span>Items</span>
                </button>

                <button
                  onClick={() => setSupplyTab('facilities')}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
                    supplyTab === 'facilities'
                      ? 'bg-[#0284c7] text-white shadow'
                      : 'bg-[#334155] text-zinc-300 hover:bg-[#475569]'
                  }`}
                >
                  <Layers className="h-3.5 w-3.5" />
                  <span>Facilities</span>
                </button>

                <button
                  onClick={() => setSupplyTab('expand')}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
                    supplyTab === 'expand'
                      ? 'bg-[#0284c7] text-white shadow'
                      : 'bg-[#334155] text-zinc-300 hover:bg-[#475569]'
                  }`}
                >
                  <Wrench className="h-3.5 w-3.5" />
                  <span>Expand</span>
                </button>

                <button
                  onClick={() => setSupplyTab('decoration')}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
                    supplyTab === 'decoration'
                      ? 'bg-[#0284c7] text-white shadow'
                      : 'bg-[#334155] text-zinc-300 hover:bg-[#475569]'
                  }`}
                >
                  <Palette className="h-3.5 w-3.5" />
                  <span>Decoration</span>
                </button>

                <button
                  onClick={() => setSupplyTab('floor2')}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
                    supplyTab === 'floor2'
                      ? 'bg-[#0284c7] text-white shadow'
                      : 'bg-[#334155] text-zinc-300 hover:bg-[#475569]'
                  }`}
                >
                  <Wrench className="h-3.5 w-3.5" />
                  <span>2nd Floor</span>
                </button>
              </div>

              {/* Shopping Cart Pill Button ($0.00 / Cart Count - Ảnh 2) */}
              <div
                onClick={() => setShowCartDrawer(true)}
                className="flex items-center rounded-lg bg-white overflow-hidden shadow border border-amber-400 cursor-pointer hover:shadow-lg transition"
              >
                <div className="px-4 py-1.5 font-black text-sm text-zinc-900 font-mono flex items-center gap-1.5">
                  <span>${totalCartCost.toFixed(2)}</span>
                  {wholesaleDiscountPct > 0 && (
                    <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-black text-emerald-700">
                      -{wholesaleDiscountPct}%
                    </span>
                  )}
                </div>
                <button className="bg-[#f59e0b] hover:bg-amber-500 text-white px-3.5 py-1.5 flex items-center gap-1.5 font-black text-xs cursor-pointer">
                  <ShoppingCart className="h-4 w-4" />
                  <span>Cart ({totalCartCount})</span>
                </button>
              </div>
            </div>

            {/* PRODUCT HEADER BANNER WITH DUAL FRANCHISE SWITCHER */}
            <div className="bg-[#0369a1] text-white">
              <div className="px-5 py-2.5 flex items-center justify-between border-b border-sky-600/40">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-white/20 flex items-center justify-center">
                    <ShoppingCart className="h-5 w-5 text-yellow-300" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-wider text-white">DANH MỤC ĐẶT HÀNG SỈ</h3>
                    <p className="text-[11px] text-sky-100">Chọn vũ trụ thẻ bài để nhập hàng về tiệm TCG</p>
                  </div>
                </div>

                {orderSuccessNotice && (
                  <div className="text-xs font-black bg-emerald-500 text-black px-3 py-1 rounded-full animate-bounce">
                    {orderSuccessNotice}
                  </div>
                )}
              </div>

              {/* DUAL FRANCHISE SWITCHER PILLS (POKÉMON vs ONE PIECE) */}
              <div className="px-5 py-2 bg-[#024e7a] flex flex-wrap items-center justify-between gap-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-black uppercase tracking-wider text-yellow-300">Vũ Trụ Thẻ:</span>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  {/* POKEMON TAB */}
                  <button
                    onClick={() => {
                      soundManager.playSelectSound();
                      setCatalogFranchise('pokemon');
                    }}
                    className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer active:scale-95 ${
                      catalogFranchise === 'pokemon'
                        ? 'bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-400 text-amber-950 shadow-md ring-2 ring-yellow-300 font-extrabold'
                        : 'bg-black/30 text-sky-100 hover:bg-black/45 border border-sky-500/30'
                    }`}
                  >
                    <span className="text-sm">⚡</span>
                    <span>POKÉMON TCG</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                      catalogFranchise === 'pokemon' ? 'bg-amber-950/20 text-amber-950' : 'bg-black/40 text-sky-200'
                    }`}>
                      Tầng 1 & Toàn Tiệm
                    </span>
                  </button>

                  {/* ONE PIECE TAB */}
                  <button
                    onClick={() => {
                      soundManager.playSelectSound();
                      setCatalogFranchise('onepiece');
                      if (itemsSubTab === 'figure' || itemsSubTab === 'merchandise') {
                        setItemsSubTab('cardpack');
                      }
                    }}
                    className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer active:scale-95 ${
                      catalogFranchise === 'onepiece'
                        ? 'bg-gradient-to-r from-red-600 via-rose-600 to-amber-500 text-white shadow-md ring-2 ring-amber-300 font-extrabold animate-pulse'
                        : 'bg-black/30 text-sky-100 hover:bg-black/45 border border-sky-500/30'
                    }`}
                  >
                    <span className="text-sm">🏴‍☠️</span>
                    <span>ONE PIECE CARD GAME</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded font-black ${
                      catalogFranchise === 'onepiece' ? 'bg-black/40 text-yellow-300' : 'bg-rose-900/60 text-yellow-300'
                    }`}>
                      ⭐ Box Rẻ Nhất $16.20 · Tầng 2
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* SUB-TABS: Dynamic based on catalogFranchise */}
            {supplyTab === 'items' && catalogFranchise === 'pokemon' && (
              <div className="flex items-center gap-2 px-5 py-2 bg-[#f1f5f9] border-b border-zinc-200 flex-wrap">
                <button
                  onClick={() => setItemsSubTab('cardpack')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
                    itemsSubTab === 'cardpack'
                      ? 'bg-[#0284c7] text-white shadow'
                      : 'bg-zinc-300 text-zinc-700 hover:bg-zinc-400'
                  }`}
                >
                  Cardpack Pokémon
                </button>
                <button
                  onClick={() => setItemsSubTab('mystery_pack')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                    itemsSubTab === 'mystery_pack'
                      ? 'bg-purple-600 text-white shadow'
                      : 'bg-purple-100 text-purple-900 hover:bg-purple-200 border border-purple-300'
                  }`}
                >
                  <span>🎁 Mystery Pack</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded font-black ${
                      shopState.storeLevel >= 7
                        ? 'bg-purple-800 text-white'
                        : 'bg-zinc-800 text-amber-300'
                    }`}
                  >
                    {shopState.storeLevel >= 7 ? 'Cấp 7' : 'Khóa Cấp 7'}
                  </span>
                </button>
                <button
                  onClick={() => setItemsSubTab('mystery_box')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                    itemsSubTab === 'mystery_box'
                      ? 'bg-amber-600 text-white shadow'
                      : 'bg-amber-100 text-amber-900 hover:bg-amber-200 border border-amber-300'
                  }`}
                >
                  <span>📦 Mystery Box</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded font-black ${
                      shopState.storeLevel >= 8
                        ? 'bg-amber-800 text-white'
                        : 'bg-zinc-800 text-amber-300'
                    }`}
                  >
                    {shopState.storeLevel >= 8 ? 'Cấp 8' : 'Khóa Cấp 8'}
                  </span>
                </button>
                <button
                  onClick={() => setItemsSubTab('figure')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
                    itemsSubTab === 'figure'
                      ? 'bg-[#0284c7] text-white shadow'
                      : 'bg-zinc-300 text-zinc-700 hover:bg-zinc-400'
                  }`}
                >
                  Figure
                </button>
                <button
                  onClick={() => setItemsSubTab('merchandise')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
                    itemsSubTab === 'merchandise'
                      ? 'bg-[#0284c7] text-white shadow'
                      : 'bg-zinc-300 text-zinc-700 hover:bg-zinc-400'
                  }`}
                >
                  Merchandise
                </button>
                <button
                  onClick={() => setItemsSubTab('licenses')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                    itemsSubTab === 'licenses'
                      ? 'bg-amber-500 text-amber-950 shadow font-extrabold border border-amber-400'
                      : 'bg-amber-100 text-amber-900 hover:bg-amber-200 border border-amber-300'
                  }`}
                >
                  <FileText className="h-3.5 w-3.5 text-amber-800" />
                  <span>📜 Giấy Phép (Licenses)</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded font-black bg-amber-800 text-amber-100">
                    {shopState.purchasedLicenses?.filter((l) => !l.startsWith('lic_op')).length || 1}/{PRODUCT_LICENSES.filter((l) => !l.id.startsWith('lic_op')).length}
                  </span>
                </button>
                <button
                  onClick={() => setItemsSubTab('shelf_unlocks')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                    itemsSubTab === 'shelf_unlocks'
                      ? 'bg-cyan-600 text-white shadow font-extrabold border border-cyan-500'
                      : 'bg-cyan-100 text-cyan-900 hover:bg-cyan-200 border border-cyan-300'
                  }`}
                >
                  <Layers className="h-3.5 w-3.5" />
                  <span>🪜 Mở Khóa Kệ</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded font-black bg-cyan-900 text-cyan-100">
                    {SHELF_UNLOCKS.filter((s) => !s.id.startsWith('op_shelf_') && isShelfUnlocked(shopState.unlockedShelves || STARTER_UNLOCKED_SHELVES, s.id)).length}/{SHELF_UNLOCKS.filter((s) => !s.id.startsWith('op_shelf_')).length}
                  </span>
                </button>
              </div>
            )}

            {/* ONE PIECE SUB-TABS */}
            {supplyTab === 'items' && catalogFranchise === 'onepiece' && (
              <div className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-red-50 via-amber-50 to-orange-50 border-b border-red-200 flex-wrap">
                <button
                  onClick={() => setItemsSubTab('cardpack')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                    itemsSubTab === 'cardpack'
                      ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow ring-1 ring-red-400'
                      : 'bg-white text-rose-900 hover:bg-rose-100 border border-rose-200'
                  }`}
                >
                  <span>🃏 Pack & Box One Piece</span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded font-black bg-yellow-400 text-black">
                    OP-10 $16.20
                  </span>
                </button>
                <button
                  onClick={() => setItemsSubTab('mystery_pack')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                    itemsSubTab === 'mystery_pack'
                      ? 'bg-purple-700 text-white shadow ring-1 ring-purple-400'
                      : 'bg-purple-100 text-purple-900 hover:bg-purple-200 border border-purple-300'
                  }`}
                >
                  <span>🍇 Trái Ác Quỷ Gacha</span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded font-black bg-purple-950 text-purple-200">
                    8 Tiers
                  </span>
                </button>
                <button
                  onClick={() => setItemsSubTab('mystery_box')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                    itemsSubTab === 'mystery_box'
                      ? 'bg-amber-700 text-white shadow ring-1 ring-amber-400'
                      : 'bg-amber-100 text-amber-950 hover:bg-amber-200 border border-amber-300'
                  }`}
                >
                  <span>☠️ Rương Truy Nã Wanted</span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded font-black bg-amber-950 text-amber-200">
                    5 Hạng
                  </span>
                </button>
                <button
                  onClick={() => setItemsSubTab('licenses')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                    itemsSubTab === 'licenses'
                      ? 'bg-amber-500 text-amber-950 shadow font-extrabold border border-amber-400'
                      : 'bg-white text-amber-900 hover:bg-amber-100 border border-amber-300'
                  }`}
                >
                  <FileText className="h-3.5 w-3.5 text-amber-800" />
                  <span>📜 Giấy Phép One Piece</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded font-black bg-amber-800 text-amber-100">
                    {shopState.purchasedLicenses?.filter((l) => l.startsWith('lic_op') || l.startsWith('op')).length || 2}/{PRODUCT_LICENSES.filter((l) => l.id.startsWith('lic_op')).length}
                  </span>
                </button>
                <button
                  onClick={() => setItemsSubTab('shelf_unlocks')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                    itemsSubTab === 'shelf_unlocks'
                      ? 'bg-rose-700 text-white shadow font-extrabold ring-1 ring-rose-400'
                      : 'bg-white text-rose-900 hover:bg-rose-100 border border-rose-300'
                  }`}
                >
                  <Layers className="h-3.5 w-3.5" />
                  <span>🪜 Kệ Tầng 2 (Grand Line)</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded font-black bg-rose-950 text-rose-100">
                    {SHELF_UNLOCKS.filter((s) => s.id.startsWith('op_shelf_') && isShelfUnlocked(shopState.unlockedShelves || STARTER_UNLOCKED_SHELVES, s.id)).length}/{SHELF_UNLOCKS.filter((s) => s.id.startsWith('op_shelf_')).length}
                  </span>
                </button>
              </div>
            )}

            {/* TAB CONTENT: CATALOG LISTING */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5">
              {/* 1. POKÉMON CARDPACKS SUB-TAB */}
              {supplyTab === 'items' && itemsSubTab === 'cardpack' && catalogFranchise === 'pokemon' && (
                <div className="space-y-6">
                  {/* HELPFUL BANNER EXPLAINING LICENSES */}
                  <div className="rounded-xl border border-sky-200 bg-sky-50/90 p-3 text-xs text-sky-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="h-9 w-9 rounded-xl bg-sky-600 text-white flex items-center justify-center shrink-0 font-black text-lg shadow-xs">
                        📜
                      </div>
                      <div>
                        <div className="font-black text-xs sm:text-sm text-sky-900 flex items-center gap-2">
                          <span>Cơ Chế Giấy Phép Phân Phối (Product Licenses)</span>
                          <span className="text-[10px] font-bold bg-sky-200 text-sky-900 px-2 py-0.5 rounded-full">
                            Cấp tiệm: Lv.{shopState.storeLevel}
                          </span>
                        </div>
                        <div className="text-[11px] text-sky-700 mt-0.5">
                          Đạt đủ Cấp độ mở quyền mua. Nhấn nút <strong>[📜 Mua Giấy Phép ($)]</strong> trên từng sản phẩm để trả phí mở khóa vĩnh viễn!
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => setItemsSubTab('licenses')}
                      className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-black text-xs shrink-0 cursor-pointer shadow transition flex items-center gap-1 active:scale-95"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      <span>Xem Tất Cả Giấy Phép</span>
                    </button>
                  </div>

                  {/* GENERATION . I */}
                  <div>
                    <div className="flex items-center justify-between mb-3 border-l-4 border-[#0284c7] pl-2.5">
                      <h4 className="text-sm font-black text-zinc-800 tracking-wider">GENERATION . I</h4>
                      <span className="text-[11px] font-bold text-amber-700">Refresh on Wed / Sun</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {cardPackCatalog
                        .filter((p) => p.generation === 'GENERATION . I')
                        .map(renderCatalogPackItem)}
                    </div>
                  </div>

                  {/* VIP COLLECTOR BOXES (LEFT-WALL SHELVES 1×1) */}
                  <div>
                    <div className="flex items-center justify-between mb-3 border-l-4 border-amber-500 pl-2.5 flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-black text-amber-800 tracking-wider">👑 VIP COLLECTOR & ULTRA-PREMIUM BOXES (KỆ 1×1)</h4>
                        {shopState.storeLevel < 10 ? (
                          <span className="text-[11px] font-black text-amber-900 bg-amber-100 border border-amber-400 px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                            <Lock className="h-3 w-3 text-amber-800" /> Yêu cầu Cấp Cửa Hàng Level 10
                          </span>
                        ) : (
                          <span className="text-[11px] font-black text-emerald-900 bg-emerald-100 border border-emerald-400 px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                            ✨ ĐÃ MỞ KHÓA (CẤP 10+) · SIÊU LỢI NHUẬN +122% ~ +150%
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] font-bold text-amber-700">Max 2 Hộp / Kệ · Tường Trái</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {cardPackCatalog
                        .filter((p) => p.generation === 'VIP COLLECTOR (1×1)')
                        .map((pack) => {
                          const isLocked = shopState.storeLevel < 10 || !pack.unlocked;
                          const profit = pack.retailSuggested - pack.price;
                          const profitPercent = Math.round((profit / pack.price) * 100);

                          return (
                            <div
                              key={pack.id}
                              className={`rounded-xl border-2 transition flex flex-col justify-between relative overflow-hidden ${
                                isLocked
                                  ? 'border-zinc-300 bg-zinc-100/90 opacity-80'
                                  : 'border-amber-400/80 bg-gradient-to-b from-amber-50/80 to-white shadow-md hover:shadow-lg'
                              } p-3`}
                            >
                              <div className="relative h-40 w-full rounded-lg bg-white overflow-hidden flex items-center justify-center p-2 mb-2 border border-amber-200">
                                <img
                                  src={pack.image}
                                  alt={pack.name}
                                  className={`h-full object-contain ${isLocked ? 'grayscale-[40%]' : ''}`}
                                />
                                <span className={`absolute top-2 left-2 rounded px-2 py-0.5 text-[10px] font-black ${
                                  isLocked ? 'bg-zinc-700 text-white' : 'bg-amber-500 text-black'
                                }`}>
                                  {pack.tag}
                                </span>

                                {isLocked && (
                                  <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center p-2 text-center text-white">
                                    <Lock className="h-7 w-7 text-amber-400 mb-1" />
                                    <span className="text-[11px] font-black text-amber-300 uppercase tracking-wide">
                                      Mở Khóa Tại Cấp 10
                                    </span>
                                    <span className="text-[10px] text-zinc-300 mt-0.5">
                                      (Cấp hiện tại: {shopState.storeLevel}/10)
                                    </span>
                                  </div>
                                )}
                              </div>

                              <div>
                                <div className="text-xs font-black text-zinc-900 line-clamp-2">{pack.name}</div>
                                <div className="text-[11px] text-amber-800 font-bold mt-0.5">
                                  Bán lẻ gợi ý: ${pack.retailSuggested.toLocaleString()}
                                </div>
                                <div className="mt-1 flex items-center gap-1">
                                  <span className="text-[10px] font-black text-emerald-800 bg-emerald-100 border border-emerald-300 px-1.5 py-0.5 rounded">
                                    🔥 Lãi +${profit.toLocaleString()} (+{profitPercent}%)
                                  </span>
                                </div>
                              </div>

                              <div className="mt-3 pt-2 border-t border-amber-100 flex items-center justify-between">
                                <div>
                                  <div className="text-[10px] font-bold text-zinc-500">Giá nhập sỉ</div>
                                  <div className="text-base font-black text-zinc-900">${pack.price.toLocaleString()}</div>
                                </div>
                                {isLocked ? (
                                  <button
                                    disabled
                                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-zinc-300 text-zinc-600 font-bold text-xs cursor-not-allowed shadow-none"
                                  >
                                    <Lock className="h-3 w-3" />
                                    <span>Khóa (Cấp 10)</span>
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleAddToCart(pack.id)}
                                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-black font-black text-xs shadow cursor-pointer transition active:scale-95"
                                  >
                                    <ShoppingCart className="h-3.5 w-3.5" />
                                    <span>Nhập Hộp</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>

                  {/* GENERATION . II */}
                  <div>
                    <div className="flex items-center justify-between mb-3 border-l-4 border-[#0284c7] pl-2.5">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-black text-zinc-800 tracking-wider">GENERATION . II</h4>
                        <span className="text-[10px] font-bold bg-sky-100 text-sky-800 px-2 py-0.5 rounded-full border border-sky-300">
                          Bộ Mở Rộng Thế Hệ Mới (Sun & Moon / Sword & Shield / Scarlet & Violet)
                        </span>
                      </div>
                      <span className="text-[11px] font-bold text-amber-700">Đủ cấp nhấn Mua Giấy Phép để mở khóa</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {cardPackCatalog
                        .filter((p) => p.generation === 'GENERATION . II')
                        .map(renderCatalogPackItem)}
                    </div>
                  </div>

                  {/* 4. GONDOLA MYSTERY PACKS (LEVEL 7 REQUIRED) */}
                  <div className="pt-4 border-t-2 border-dashed border-zinc-200">
                    <div className="flex items-center justify-between mb-3 border-l-4 border-purple-600 pl-2.5 flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-black text-purple-900 tracking-wider">
                          🎁 POKÉMON MYSTERY PACKS (KỆ GONDOLA GIỮA TIỆM) · 8 TIER
                        </h4>
                        <span className="text-[10px] font-bold bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full border border-purple-300">
                          Tier 1 Silver ($20) ➔ Tier 8 Cosmic ($5,000)
                        </span>
                      </div>
                      {shopState.storeLevel < 7 ? (
                        <span className="text-[11px] font-black text-rose-700 bg-rose-100 px-3 py-1 rounded-full border border-rose-300 flex items-center gap-1.5 shadow-sm">
                          <Lock className="h-3.5 w-3.5" />
                          <span>Mở Khóa ở Cấp 7 (Shop Level 7) · Hiện tại: Cấp {shopState.storeLevel}</span>
                        </span>
                      ) : (
                        <span className="text-[11px] font-black text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full border border-emerald-300 flex items-center gap-1.5 shadow-sm">
                          <Check className="h-3.5 w-3.5" />
                          <span>Đã Mở Khóa · Sẵn Sàng Nhập Hàng Về Kệ Gondola</span>
                        </span>
                      )}
                    </div>

                    {shopState.storeLevel < 7 && (
                      <div className="mb-4 rounded-xl border-2 border-dashed border-purple-300 bg-purple-50/70 p-3.5 text-xs text-purple-900 flex items-center gap-3">
                        <Lock className="h-6 w-6 text-purple-600 shrink-0" />
                        <div>
                          <div className="font-black text-sm">Chưa đạt Cấp Cửa Hàng Level 7 để nhập Mystery Pack!</div>
                          <p className="text-[11px] text-purple-700 mt-0.5">
                            Hãy bán thêm thẻ, phục vụ khách và thu phí bàn đấu để tích lũy EXP lên Cấp 7 (Shop Level 7).
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {cardPackCatalog
                        .filter((p) => p.generation.includes('GACHA GONDOLA'))
                        .map((pack) => (
                          <div
                            key={pack.id}
                            className={`rounded-xl border-2 p-3 shadow transition flex flex-col justify-between ${
                              pack.unlocked
                                ? 'border-purple-300 bg-gradient-to-b from-purple-50/50 to-white hover:shadow-md hover:border-purple-400'
                                : 'border-zinc-300 bg-zinc-100 opacity-80'
                            }`}
                          >
                            <div className="relative h-44 w-full rounded-lg bg-zinc-900/5 overflow-hidden flex items-center justify-center p-2 mb-2">
                              <img src={pack.image} alt={pack.name} className={`h-full object-contain ${!pack.unlocked ? 'grayscale' : ''}`} />
                              <span className={`absolute top-2 left-2 rounded px-2 py-0.5 text-[10px] font-black ${pack.unlocked ? 'bg-purple-600 text-white' : 'bg-zinc-700 text-zinc-300'}`}>
                                {pack.badge}
                              </span>
                              {!pack.unlocked && (
                                <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-white">
                                  <Lock className="h-7 w-7 text-amber-300 mb-1" />
                                  <span className="text-[11px] font-black bg-black/80 px-2 py-0.5 rounded text-amber-300">
                                    Khóa (Cấp 7)
                                  </span>
                                </div>
                              )}
                            </div>

                            <div>
                              <div className="text-xs font-black text-zinc-900 truncate">{pack.name}</div>
                              <div className="text-[11px] text-purple-700 font-bold">{pack.tag}</div>
                              <div className="text-[10px] text-zinc-500">Giá bán lẻ gợi ý: ${pack.retailSuggested.toLocaleString()}</div>
                            </div>

                            <div className="mt-3 pt-2 border-t border-purple-100 flex items-center justify-between">
                              <div>
                                <div className="text-[10px] text-zinc-500 font-bold">Giá sỉ (1 gói):</div>
                                <div className="text-base font-black text-purple-900">${pack.price.toLocaleString()}</div>
                              </div>
                              {pack.unlocked ? (
                                <button
                                  onClick={() => handleAddToCart(pack.id)}
                                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-black text-xs shadow cursor-pointer transition"
                                >
                                  <ShoppingCart className="h-3.5 w-3.5" />
                                  <span>Thêm</span>
                                </button>
                              ) : (
                                <span className="text-xs text-zinc-400 font-bold">Khóa (Cấp 7)</span>
                              )}
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* 5. GAMESTOP MYSTERY BOXES (LEVEL 8 REQUIRED) */}
                  <div className="pt-4 border-t-2 border-dashed border-zinc-200">
                    <div className="flex items-center justify-between mb-3 border-l-4 border-amber-600 pl-2.5 flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-black text-amber-900 tracking-wider">
                          📦 OFFICIAL GAMESTOP POKÉMON MYSTERY BOXES (KỆ GAMESTOP)
                        </h4>
                        <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full border border-amber-300">
                          Chứa 1 PSA/CGC 10 Graded Slab + 2 Booster Packs
                        </span>
                      </div>
                      {shopState.storeLevel < 8 ? (
                        <span className="text-[11px] font-black text-rose-700 bg-rose-100 px-3 py-1 rounded-full border border-rose-300 flex items-center gap-1.5 shadow-sm">
                          <Lock className="h-3.5 w-3.5" />
                          <span>Mở Khóa ở Cấp 8 (Shop Level 8) · Hiện tại: Cấp {shopState.storeLevel}</span>
                        </span>
                      ) : (
                        <span className="text-[11px] font-black text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full border border-emerald-300 flex items-center gap-1.5 shadow-sm">
                          <Check className="h-3.5 w-3.5" />
                          <span>Đã Mở Khóa · Sẵn Sàng Nhập Hộp Về Kệ GameStop</span>
                        </span>
                      )}
                    </div>

                    {shopState.storeLevel < 8 && (
                      <div className="mb-4 rounded-xl border-2 border-dashed border-amber-300 bg-amber-50/70 p-3.5 text-xs text-amber-900 flex items-center gap-3">
                        <Lock className="h-6 w-6 text-amber-600 shrink-0" />
                        <div>
                          <div className="font-black text-sm">Chưa đạt Cấp Cửa Hàng Level 8 để nhập Mystery Box!</div>
                          <p className="text-[11px] text-amber-700 mt-0.5">
                            Mystery Box chứa các thẻ bài Graded Slab PSA 10 giá trị cực cao. Hãy nâng cấp tiệm lên Cấp 8 để mở quyền nhập hàng chính hãng.
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      {cardPackCatalog
                        .filter((p) => p.generation === 'GameStop Exclusive')
                        .map((pack) => (
                          <div
                            key={pack.id}
                            className={`rounded-xl border-2 p-3 shadow transition flex flex-col justify-between ${
                              pack.unlocked
                                ? 'border-amber-400 bg-gradient-to-b from-amber-50/60 to-white hover:shadow-md'
                                : 'border-zinc-300 bg-zinc-100 opacity-80'
                            }`}
                          >
                            <div className="relative h-44 w-full rounded-lg bg-zinc-900/5 overflow-hidden flex items-center justify-center p-2 mb-2">
                              <img src={pack.image} alt={pack.name} className={`h-full object-contain ${!pack.unlocked ? 'grayscale' : ''}`} />
                              <span className={`absolute top-2 left-2 rounded px-2 py-0.5 text-[10px] font-black ${pack.unlocked ? 'bg-amber-500 text-black' : 'bg-zinc-700 text-zinc-300'}`}>
                                {pack.badge}
                              </span>
                              {!pack.unlocked && (
                                <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-white">
                                  <Lock className="h-7 w-7 text-amber-300 mb-1" />
                                  <span className="text-[11px] font-black bg-black/80 px-2 py-0.5 rounded text-amber-300">
                                    Khóa (Cấp 8)
                                  </span>
                                </div>
                              )}
                            </div>

                            <div>
                              <div className="text-xs font-black text-zinc-900">{pack.name}</div>
                              <div className="text-[11px] text-amber-700 font-bold">{pack.tag}</div>
                              <div className="text-[10px] text-zinc-500">Giá bán lẻ gợi ý: ${pack.retailSuggested.toLocaleString()}</div>
                            </div>

                            <div className="mt-3 pt-2 border-t border-amber-100 flex items-center justify-between">
                              <div>
                                <div className="text-[10px] text-zinc-500 font-bold">Giá sỉ (1 hộp):</div>
                                <div className="text-base font-black text-amber-950">${pack.price.toLocaleString()}</div>
                              </div>
                              {pack.unlocked ? (
                                <button
                                  onClick={() => handleAddToCart(pack.id)}
                                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-black font-black text-xs shadow cursor-pointer transition"
                                >
                                  <ShoppingCart className="h-3.5 w-3.5" />
                                  <span>Nhập Hộp</span>
                                </button>
                              ) : (
                                <span className="text-xs text-zinc-400 font-bold">Khóa (Cấp 8)</span>
                              )}
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ONE PIECE CARDPACKS & BOOSTER BOXES */}
              {supplyTab === 'items' && itemsSubTab === 'cardpack' && catalogFranchise === 'onepiece' && (
                <div className="space-y-6">
                  {/* HELPFUL BANNER EXPLAINING ONE PIECE TẦNG 2 & OP-10 RẺ NHẤT */}
                  <div className="rounded-2xl border-2 border-red-300 bg-gradient-to-r from-red-50 via-amber-50 to-orange-50 p-4 shadow-sm">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-600 to-rose-700 text-white flex items-center justify-center font-black text-2xl shadow-md shrink-0 border border-red-400">
                          🏴‍☠️
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-sm sm:text-base font-black text-rose-950">
                              KHO HÀNG ONE PIECE CARD GAME (TẦNG 2 · GRAND LINE)
                            </h3>
                            <span className="text-[10px] font-black bg-yellow-400 text-black px-2.5 py-0.5 rounded-full shadow-xs">
                              ⭐ OP-10 Box Rẻ Nhất $16.20
                            </span>
                          </div>
                          <p className="text-xs text-rose-900 mt-1 max-w-2xl leading-relaxed">
                            Toàn bộ các bộ Booster Box (Display 9 Packs), Gói Lẻ (10 thẻ/pack) và Rương VIP 1×1 sẽ được giao đến cửa hàng và xếp lên <strong>dãy kệ One Piece Tầng 2</strong>.
                          </p>
                        </div>
                      </div>
                      <div className="bg-white/95 border border-red-200 px-4 py-2.5 rounded-xl shadow-xs text-right shrink-0">
                        <div className="text-[10px] font-bold text-zinc-500 uppercase">Cấp Tiệm Của Bạn</div>
                        <div className="text-base font-black text-rose-900">
                          Level {shopState.storeLevel} · {shopState.storeLevel >= 1 ? 'Đã Mở OP-10 & OP-01' : 'Cần Cấp 1'}
                        </div>
                        <div className="text-[10px] text-emerald-600 font-bold mt-0.5">
                          Quỹ: ${shopState.cash.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ⭐ 1. NỀN KINH TẾ TẦNG 2 · CẤP 10 ➔ 20 (11 BỘ BOOSTER CHUẨN THỊ TRƯỜNG EN) */}
                  <div className="rounded-2xl border-2 border-amber-400 bg-gradient-to-b from-amber-50/70 via-white to-amber-50/30 p-4 shadow-md">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 border-l-4 border-amber-500 pl-3 gap-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm sm:text-base font-black text-amber-950 tracking-wider">
                            ⭐ NỀN KINH TẾ TẦNG 2 · CẤP 10 ➔ 20 (11 BỘ BOOSTER EN MARKET)
                          </h4>
                          <span className="text-[10px] font-black bg-gradient-to-r from-red-600 to-amber-500 text-white px-2.5 py-0.5 rounded-full shadow-xs">
                            GIÁ THỊ TRƯỜNG EBAY · LÃI ~90% · 24 PACKS/BOX · 6 THẺ/PACK
                          </span>
                        </div>
                        <p className="text-xs text-amber-800 mt-0.5">
                          Khởi đầu từ <strong>OP-10 Royal Blood ($245/box, $11.25/pack)</strong> đến <strong>OP-11 ($550/box, $25.50/pack)</strong>. Mua Box tiết kiệm ~10% so với mua 24 pack lẻ!
                        </p>
                      </div>
                      <span className="text-[11px] font-bold text-amber-800 bg-amber-100 px-2 py-1 rounded-lg border border-amber-300 shrink-0">
                        11 Bộ Level 10–20
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {onePieceCardPackCatalog
                        .filter((p) => p.generation.includes('CẤP 10-20'))
                        .map(renderCatalogPackItem)}
                    </div>
                  </div>

                  {/* 🏴‍☠️ 2. BỘ SƯU TẬP CHÉN THÁNH LEVEL 21+ (OP-03, OP-02, EB, PRB, OP-05, OP-01) */}
                  <div>
                    <div className="flex items-center justify-between mb-3 border-l-4 border-rose-600 pl-2.5">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-black text-rose-950 tracking-wider">
                          🏴‍☠️ BỘ SƯU TẬP CHÉN THÁNH ONE PIECE (DÀNH CHO CẤP 21+)
                        </h4>
                        <span className="text-[10px] font-bold bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full border border-rose-200">
                          OP-03, OP-02, EB-02, EB-01, PRB-01, OP-05 & Chén Thánh OP-01 ($1,305/box)
                        </span>
                      </div>
                      <span className="text-[11px] font-bold text-amber-700">Đạt Cấp 21+ & Mua Giấy Phép</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {onePieceCardPackCatalog
                        .filter((p) => p.generation.includes('CẤP 21+'))
                        .map(renderCatalogPackItem)}
                    </div>
                  </div>

                  {/* 👑 3. ONE PIECE VIP COLLECTOR TREASURES (1×1 · TƯỜNG TRÁI TẦNG 2) */}
                  <div>
                    <div className="flex items-center justify-between mb-3 border-l-4 border-amber-500 pl-2.5 flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-black text-amber-900 tracking-wider">
                          👑 RƯƠNG VIP ONE PIECE COLLECTOR TREASURES (KỆ 1×1 TẦNG 2)
                        </h4>
                        {shopState.storeLevel < 9 ? (
                          <span className="text-[11px] font-black text-amber-900 bg-amber-100 border border-amber-400 px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                            <Lock className="h-3 w-3 text-amber-800" /> Yêu cầu Cấp Cửa Hàng Level 9+
                          </span>
                        ) : (
                          <span className="text-[11px] font-black text-emerald-900 bg-emerald-100 border border-emerald-400 px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                            ✨ ĐÃ MỞ KHÓA (CẤP {shopState.storeLevel}) · SIÊU LỢI NHUẬN +120% ~ +150%
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] font-bold text-amber-700">Max 2 Rương / Kệ · Tường Trái Tầng 2</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {onePieceCardPackCatalog
                        .filter((p) => p.generation.includes('VIP COLLECTOR'))
                        .map((pack) => {
                          const isLocked = !pack.unlocked;
                          const profit = pack.retailSuggested - pack.price;
                          const profitPercent = Math.round((profit / pack.price) * 100);

                          return (
                            <div
                              key={pack.id}
                              className={`rounded-xl border-2 transition flex flex-col justify-between relative overflow-hidden ${
                                isLocked
                                  ? 'border-zinc-300 bg-zinc-100/90 opacity-80'
                                  : 'border-amber-400/80 bg-gradient-to-b from-amber-50/80 to-white shadow-md hover:shadow-lg'
                              } p-3`}
                            >
                              <div className="relative h-40 w-full rounded-lg bg-white overflow-hidden flex items-center justify-center p-2 mb-2 border border-amber-200">
                                <img
                                  src={pack.image}
                                  alt={pack.name}
                                  className={`h-full object-contain ${isLocked ? 'grayscale-[40%]' : ''}`}
                                />
                                <span className={`absolute top-2 left-2 rounded px-2 py-0.5 text-[10px] font-black ${
                                  isLocked ? 'bg-zinc-700 text-white' : 'bg-amber-500 text-black'
                                }`}>
                                  {pack.tag}
                                </span>

                                {isLocked && (
                                  <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center p-2 text-center text-white">
                                    <Lock className="h-7 w-7 text-amber-400 mb-1" />
                                    <span className="text-[11px] font-black text-amber-300 uppercase tracking-wide">
                                      Cần Giấy Phép & Cấp 9-10
                                    </span>
                                  </div>
                                )}
                              </div>

                              <div>
                                <div className="text-xs font-black text-zinc-900 line-clamp-2">{pack.name}</div>
                                <div className="text-[11px] text-amber-800 font-bold mt-0.5">
                                  Bán lẻ gợi ý: ${pack.retailSuggested.toLocaleString()}
                                </div>
                                <div className="mt-1 flex items-center gap-1">
                                  <span className="text-[10px] font-black text-emerald-800 bg-emerald-100 border border-emerald-300 px-1.5 py-0.5 rounded">
                                    🔥 Lãi +${profit.toLocaleString()} (+{profitPercent}%)
                                  </span>
                                </div>
                              </div>

                              <div className="mt-3 pt-2 border-t border-amber-100 flex items-center justify-between">
                                <div>
                                  <div className="text-[10px] font-bold text-zinc-500">Giá nhập sỉ</div>
                                  <div className="text-base font-black text-zinc-900">${pack.price.toLocaleString()}</div>
                                </div>
                                {isLocked ? (
                                  <button
                                    disabled
                                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-zinc-300 text-zinc-600 font-bold text-xs cursor-not-allowed shadow-none"
                                  >
                                    <Lock className="h-3 w-3" />
                                    <span>Chưa Mở</span>
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleAddToCart(pack.id)}
                                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-black font-black text-xs shadow cursor-pointer transition active:scale-95"
                                  >
                                    <ShoppingCart className="h-3.5 w-3.5" />
                                    <span>Nhập Rương</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                </div>
              )}

              {/* DEDICATED MYSTERY PACK SUB-TAB */}
              {supplyTab === 'items' && itemsSubTab === 'mystery_pack' && catalogFranchise === 'pokemon' && (
                <div className="space-y-6">
                  <div>
                    <div className="flex items-center justify-between mb-3 border-l-4 border-purple-600 pl-2.5 flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-black text-purple-900 tracking-wider">
                          🎁 POKÉMON MYSTERY PACKS (KỆ GONDOLA GIỮA TIỆM) · 8 TIER
                        </h4>
                        <span className="text-[10px] font-bold bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full border border-purple-300">
                          Tier 1 Silver ($20) ➔ Tier 8 Cosmic ($5,000)
                        </span>
                      </div>
                      {shopState.storeLevel < 7 ? (
                        <span className="text-[11px] font-black text-rose-700 bg-rose-100 px-3 py-1 rounded-full border border-rose-300 flex items-center gap-1.5 shadow-sm">
                          <Lock className="h-3.5 w-3.5" />
                          <span>Mở Khóa ở Cấp 7 (Shop Level 7) · Hiện tại: Cấp {shopState.storeLevel}</span>
                        </span>
                      ) : (
                        <span className="text-[11px] font-black text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full border border-emerald-300 flex items-center gap-1.5 shadow-sm">
                          <Check className="h-3.5 w-3.5" />
                          <span>Đã Mở Khóa · Sẵn Sàng Nhập Hàng Về Kệ Gondola</span>
                        </span>
                      )}
                    </div>

                    {shopState.storeLevel < 7 && (
                      <div className="mb-4 rounded-xl border-2 border-dashed border-purple-300 bg-purple-50/70 p-3.5 text-xs text-purple-900 flex items-center gap-3">
                        <Lock className="h-6 w-6 text-purple-600 shrink-0" />
                        <div>
                          <div className="font-black text-sm">Chưa đạt Cấp Cửa Hàng Level 7 để nhập Mystery Pack!</div>
                          <p className="text-[11px] text-purple-700 mt-0.5">
                            Hãy bán thêm thẻ, phục vụ khách và thu phí bàn đấu để tích lũy EXP lên Cấp 7 (Shop Level 7).
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {cardPackCatalog
                        .filter((p) => p.generation.includes('GACHA GONDOLA'))
                        .map((pack) => (
                          <div
                            key={pack.id}
                            className={`rounded-xl border-2 p-3 shadow transition flex flex-col justify-between ${
                              pack.unlocked
                                ? 'border-purple-300 bg-gradient-to-b from-purple-50/50 to-white hover:shadow-md hover:border-purple-400'
                                : 'border-zinc-300 bg-zinc-100 opacity-80'
                            }`}
                          >
                            <div className="relative h-44 w-full rounded-lg bg-zinc-900/5 overflow-hidden flex items-center justify-center p-2 mb-2">
                              <img src={pack.image} alt={pack.name} className={`h-full object-contain ${!pack.unlocked ? 'grayscale' : ''}`} />
                              <span className={`absolute top-2 left-2 rounded px-2 py-0.5 text-[10px] font-black ${pack.unlocked ? 'bg-purple-600 text-white' : 'bg-zinc-700 text-zinc-300'}`}>
                                {pack.badge}
                              </span>
                              {!pack.unlocked && (
                                <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-white">
                                  <Lock className="h-7 w-7 text-amber-300 mb-1" />
                                  <span className="text-[11px] font-black bg-black/80 px-2 py-0.5 rounded text-amber-300">
                                    Khóa (Cấp 7)
                                  </span>
                                </div>
                              )}
                            </div>

                            <div>
                              <div className="text-xs font-black text-zinc-900 truncate">{pack.name}</div>
                              <div className="text-[11px] text-purple-700 font-bold">{pack.tag}</div>
                              <div className="text-[10px] text-zinc-500">Giá bán lẻ gợi ý: ${pack.retailSuggested.toLocaleString()}</div>
                            </div>

                            <div className="mt-3 pt-2 border-t border-purple-100 flex items-center justify-between">
                              <div>
                                <div className="text-[10px] text-zinc-500 font-bold">Giá sỉ (1 gói):</div>
                                <div className="text-base font-black text-purple-900">${pack.price.toLocaleString()}</div>
                              </div>
                              {pack.unlocked ? (
                                <button
                                  onClick={() => handleAddToCart(pack.id)}
                                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-black text-xs shadow cursor-pointer transition"
                                >
                                  <ShoppingCart className="h-3.5 w-3.5" />
                                  <span>Thêm</span>
                                </button>
                              ) : (
                                <span className="text-xs text-zinc-400 font-bold">Khóa (Cấp 7)</span>
                              )}
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ONE PIECE DEVIL FRUIT GACHA MYSTERY PACKS */}
              {supplyTab === 'items' && itemsSubTab === 'mystery_pack' && catalogFranchise === 'onepiece' && (
                <div className="space-y-6">
                  <div>
                    <div className="flex items-center justify-between mb-3 border-l-4 border-purple-600 pl-2.5 flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-black text-purple-900 tracking-wider">
                          🍇 TRÁI ÁC QUỶ MYSTERY GACHA (KỆ TRÁI ÁC QUỶ TẦNG 2) · 8 HẠNG
                        </h4>
                        <span className="text-[10px] font-bold bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full border border-purple-300">
                          Tier 1 Gomu Gomu ($20) ➔ Tier 8 Hito Hito Nika ($5,000)
                        </span>
                      </div>
                      {shopState.storeLevel < 7 ? (
                        <span className="text-[11px] font-black text-rose-700 bg-rose-100 px-3 py-1 rounded-full border border-rose-300 flex items-center gap-1.5 shadow-sm">
                          <Lock className="h-3.5 w-3.5" />
                          <span>Mở Khóa ở Cấp 7 (Shop Level 7) · Hiện tại: Cấp {shopState.storeLevel}</span>
                        </span>
                      ) : (
                        <span className="text-[11px] font-black text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full border border-emerald-300 flex items-center gap-1.5 shadow-sm">
                          <Check className="h-3.5 w-3.5" />
                          <span>Đã Mở Khóa · Sẵn Sàng Nhập Hàng Về Kệ Trái Ác Quỷ Tầng 2</span>
                        </span>
                      )}
                    </div>

                    {shopState.storeLevel < 7 && (
                      <div className="mb-4 rounded-xl border-2 border-dashed border-purple-300 bg-purple-50/70 p-3.5 text-xs text-purple-900 flex items-center gap-3">
                        <Lock className="h-6 w-6 text-purple-600 shrink-0" />
                        <div>
                          <div className="font-black text-sm">Chưa đạt Cấp Cửa Hàng Level 7 để nhập Gói Trái Ác Quỷ!</div>
                          <p className="text-[11px] text-purple-700 mt-0.5">
                            Gói Gacha Trái Ác Quỷ chứa các thẻ bài One Piece Manga Rare & Oda Signature giá trị khủng. Hãy lên Cấp 7 để mở quyền nhập.
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {onePieceGachaPackCatalog.map((pack) => (
                        <div
                          key={pack.id}
                          className={`rounded-xl border-2 p-3 shadow transition flex flex-col justify-between ${
                            pack.unlocked
                              ? 'border-purple-300 bg-gradient-to-b from-purple-50/50 to-white hover:shadow-md hover:border-purple-400'
                              : 'border-zinc-300 bg-zinc-100 opacity-80'
                          }`}
                        >
                          <div className="relative h-44 w-full rounded-lg bg-zinc-900/5 overflow-hidden flex items-center justify-center p-2 mb-2">
                            <img src={pack.image} alt={pack.name} className={`h-full object-contain ${!pack.unlocked ? 'grayscale' : ''}`} />
                            <span className={`absolute top-2 left-2 rounded px-2 py-0.5 text-[10px] font-black ${pack.unlocked ? 'bg-purple-600 text-white' : 'bg-zinc-700 text-zinc-300'}`}>
                              {pack.badge}
                            </span>
                            {!pack.unlocked && (
                              <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-white">
                                <Lock className="h-7 w-7 text-amber-300 mb-1" />
                                <span className="text-[11px] font-black bg-black/80 px-2 py-0.5 rounded text-amber-300">
                                  Khóa (Cấp 7)
                                </span>
                              </div>
                            )}
                          </div>

                          <div>
                            <div className="text-xs font-black text-zinc-900 truncate">{pack.name}</div>
                            <div className="text-[11px] text-purple-700 font-bold">{pack.tag}</div>
                            <div className="text-[10px] text-zinc-500">Giá bán lẻ gợi ý: ${pack.retailSuggested.toLocaleString()}</div>
                          </div>

                          <div className="mt-3 pt-2 border-t border-purple-100 flex items-center justify-between">
                            <div>
                              <div className="text-[10px] text-zinc-500 font-bold">Giá sỉ (1 gói):</div>
                              <div className="text-base font-black text-purple-900">${pack.price.toLocaleString()}</div>
                            </div>
                            {pack.unlocked ? (
                              <button
                                onClick={() => handleAddToCart(pack.id)}
                                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-black text-xs shadow cursor-pointer transition active:scale-95"
                              >
                                <ShoppingCart className="h-3.5 w-3.5" />
                                <span>Thêm</span>
                              </button>
                            ) : (
                              <span className="text-xs text-zinc-400 font-bold">Khóa (Cấp 7)</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* DEDICATED MYSTERY BOX SUB-TAB */}
              {supplyTab === 'items' && itemsSubTab === 'mystery_box' && catalogFranchise === 'pokemon' && (
                <div className="space-y-6">
                  <div>
                    <div className="flex items-center justify-between mb-3 border-l-4 border-amber-600 pl-2.5 flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-black text-amber-900 tracking-wider">
                          📦 OFFICIAL GAMESTOP POKÉMON MYSTERY BOXES (KỆ GAMESTOP)
                        </h4>
                        <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full border border-amber-300">
                          Chứa 1 PSA/CGC 10 Graded Slab + 2 Booster Packs
                        </span>
                      </div>
                      {shopState.storeLevel < 8 ? (
                        <span className="text-[11px] font-black text-rose-700 bg-rose-100 px-3 py-1 rounded-full border border-rose-300 flex items-center gap-1.5 shadow-sm">
                          <Lock className="h-3.5 w-3.5" />
                          <span>Mở Khóa ở Cấp 8 (Shop Level 8) · Hiện tại: Cấp {shopState.storeLevel}</span>
                        </span>
                      ) : (
                        <span className="text-[11px] font-black text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full border border-emerald-300 flex items-center gap-1.5 shadow-sm">
                          <Check className="h-3.5 w-3.5" />
                          <span>Đã Mở Khóa · Sẵn Sàng Nhập Hộp Về Kệ GameStop</span>
                        </span>
                      )}
                    </div>

                    {shopState.storeLevel < 8 && (
                      <div className="mb-4 rounded-xl border-2 border-dashed border-amber-300 bg-amber-50/70 p-3.5 text-xs text-amber-900 flex items-center gap-3">
                        <Lock className="h-6 w-6 text-amber-600 shrink-0" />
                        <div>
                          <div className="font-black text-sm">Chưa đạt Cấp Cửa Hàng Level 8 để nhập Mystery Box!</div>
                          <p className="text-[11px] text-amber-700 mt-0.5">
                            Mystery Box chứa các thẻ bài Graded Slab PSA 10 giá trị cực cao. Hãy nâng cấp tiệm lên Cấp 8 để mở quyền nhập hàng chính hãng.
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      {cardPackCatalog
                        .filter((p) => p.generation === 'GameStop Exclusive')
                        .map((pack) => (
                          <div
                            key={pack.id}
                            className={`rounded-xl border-2 p-3 shadow transition flex flex-col justify-between ${
                              pack.unlocked
                                ? 'border-amber-400 bg-gradient-to-b from-amber-50/60 to-white hover:shadow-md'
                                : 'border-zinc-300 bg-zinc-100 opacity-80'
                            }`}
                          >
                            <div className="relative h-44 w-full rounded-lg bg-zinc-900/5 overflow-hidden flex items-center justify-center p-2 mb-2">
                              <img src={pack.image} alt={pack.name} className={`h-full object-contain ${!pack.unlocked ? 'grayscale' : ''}`} />
                              <span className={`absolute top-2 left-2 rounded px-2 py-0.5 text-[10px] font-black ${pack.unlocked ? 'bg-amber-500 text-black' : 'bg-zinc-700 text-zinc-300'}`}>
                                {pack.badge}
                              </span>
                              {!pack.unlocked && (
                                <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-white">
                                  <Lock className="h-7 w-7 text-amber-300 mb-1" />
                                  <span className="text-[11px] font-black bg-black/80 px-2 py-0.5 rounded text-amber-300">
                                    Khóa (Cấp 8)
                                  </span>
                                </div>
                              )}
                            </div>

                            <div>
                              <div className="text-xs font-black text-zinc-900">{pack.name}</div>
                              <div className="text-[11px] text-amber-700 font-bold">{pack.tag}</div>
                              <div className="text-[10px] text-zinc-500">Giá bán lẻ gợi ý: ${pack.retailSuggested.toLocaleString()}</div>
                            </div>

                            <div className="mt-3 pt-2 border-t border-amber-100 flex items-center justify-between">
                              <div>
                                <div className="text-[10px] text-zinc-500 font-bold">Giá sỉ (1 hộp):</div>
                                <div className="text-base font-black text-amber-950">${pack.price.toLocaleString()}</div>
                              </div>
                              {pack.unlocked ? (
                                <button
                                  onClick={() => handleAddToCart(pack.id)}
                                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-black font-black text-xs shadow cursor-pointer transition"
                                >
                                  <ShoppingCart className="h-3.5 w-3.5" />
                                  <span>Nhập Hộp</span>
                                </button>
                              ) : (
                                <span className="text-xs text-zinc-400 font-bold">Khóa (Cấp 8)</span>
                              )}
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ONE PIECE GRAND LINE WANTED BOUNTY BOXES */}
              {supplyTab === 'items' && itemsSubTab === 'mystery_box' && catalogFranchise === 'onepiece' && (
                <div className="space-y-6">
                  <div>
                    <div className="flex items-center justify-between mb-3 border-l-4 border-amber-600 pl-2.5 flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-black text-amber-900 tracking-wider">
                          ☠️ RƯƠNG TRUY NÃ GRAND LINE WANTED MYSTERY BOXES (BÀN GỖ TẦNG 2)
                        </h4>
                        <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full border border-amber-300">
                          Chứa 1 Graded Slab Hải Tặc BGS/PSA 10 + 2 Booster Packs One Piece
                        </span>
                      </div>
                      {shopState.storeLevel < 8 ? (
                        <span className="text-[11px] font-black text-rose-700 bg-rose-100 px-3 py-1 rounded-full border border-rose-300 flex items-center gap-1.5 shadow-sm">
                          <Lock className="h-3.5 w-3.5" />
                          <span>Mở Khóa ở Cấp 8 (Shop Level 8) · Hiện tại: Cấp {shopState.storeLevel}</span>
                        </span>
                      ) : (
                        <span className="text-[11px] font-black text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full border border-emerald-300 flex items-center gap-1.5 shadow-sm">
                          <Check className="h-3.5 w-3.5" />
                          <span>Đã Mở Khóa · Sẵn Sàng Nhập Hộp Về Bàn Truy Nã Tầng 2</span>
                        </span>
                      )}
                    </div>

                    {shopState.storeLevel < 8 && (
                      <div className="mb-4 rounded-xl border-2 border-dashed border-amber-300 bg-amber-50/70 p-3.5 text-xs text-amber-900 flex items-center gap-3">
                        <Lock className="h-6 w-6 text-amber-600 shrink-0" />
                        <div>
                          <div className="font-black text-sm">Chưa đạt Cấp Cửa Hàng Level 8 để nhập Rương Truy Nã!</div>
                          <p className="text-[11px] text-amber-700 mt-0.5">
                            Rương Truy Nã Hải Tặc chứa các thẻ Graded Slab PSA 10 giá trị cực cao. Hãy nâng cấp tiệm lên Cấp 8 để mở quyền nhập hàng chính hãng.
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      {onePieceBountyBoxCatalog.map((pack) => (
                        <div
                          key={pack.id}
                          className={`rounded-xl border-2 p-3 shadow transition flex flex-col justify-between ${
                            pack.unlocked
                              ? 'border-amber-400 bg-gradient-to-b from-amber-50/60 to-white hover:shadow-md'
                              : 'border-zinc-300 bg-zinc-100 opacity-80'
                          }`}
                        >
                          <div className="relative h-44 w-full rounded-lg bg-zinc-900/5 overflow-hidden flex items-center justify-center p-2 mb-2">
                            <img src={pack.image} alt={pack.name} className={`h-full object-contain ${!pack.unlocked ? 'grayscale' : ''}`} />
                            <span className={`absolute top-2 left-2 rounded px-2 py-0.5 text-[10px] font-black ${pack.unlocked ? 'bg-amber-500 text-black' : 'bg-zinc-700 text-zinc-300'}`}>
                              {pack.badge}
                            </span>
                            {!pack.unlocked && (
                              <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-white">
                                <Lock className="h-7 w-7 text-amber-300 mb-1" />
                                <span className="text-[11px] font-black bg-black/80 px-2 py-0.5 rounded text-amber-300">
                                  Khóa (Cấp 8)
                                </span>
                              </div>
                            )}
                          </div>

                          <div>
                            <div className="text-xs font-black text-zinc-900">{pack.name}</div>
                            <div className="text-[11px] text-amber-700 font-bold">{pack.tag}</div>
                            <div className="text-[10px] text-zinc-500">Giá bán lẻ gợi ý: ${pack.retailSuggested.toLocaleString()}</div>
                          </div>

                          <div className="mt-3 pt-2 border-t border-amber-100 flex items-center justify-between">
                            <div>
                              <div className="text-[10px] text-zinc-500 font-bold">Giá sỉ (1 hộp):</div>
                              <div className="text-base font-black text-amber-950">${pack.price.toLocaleString()}</div>
                            </div>
                            {pack.unlocked ? (
                              <button
                                onClick={() => handleAddToCart(pack.id)}
                                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-black font-black text-xs shadow cursor-pointer transition active:scale-95"
                              >
                                <ShoppingCart className="h-3.5 w-3.5" />
                                <span>Nhập Hộp</span>
                              </button>
                            ) : (
                              <span className="text-xs text-zinc-400 font-bold">Khóa (Cấp 8)</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* DEDICATED LICENSES SUB-TAB */}
              {supplyTab === 'items' && itemsSubTab === 'licenses' && (() => {
                const isOnePiece = catalogFranchise === 'onepiece';
                const displayLicenses = isOnePiece
                  ? PRODUCT_LICENSES.filter((l) => l.id.startsWith('lic_op'))
                  : PRODUCT_LICENSES.filter((l) => !l.id.startsWith('lic_op'));
                const ownedCount = displayLicenses.filter((lic) => hasProductLicense(shopState.purchasedLicenses, lic.id)).length;

                return (
                  <div className="space-y-6">
                    {/* Banner */}
                    <div className={`rounded-2xl border-2 p-4 shadow-sm ${
                      isOnePiece
                        ? 'border-red-300 bg-gradient-to-r from-red-50 via-amber-50/70 to-orange-50'
                        : 'border-amber-300 bg-gradient-to-r from-amber-50 via-amber-100/60 to-white'
                    }`}>
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-2xl shadow-sm shrink-0 border ${
                            isOnePiece
                              ? 'bg-rose-600 text-white border-rose-400'
                              : 'bg-amber-500 text-amber-950 border-amber-400'
                          }`}>
                            {isOnePiece ? '🏴‍☠️' : '📜'}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className={`text-sm sm:text-base font-black ${isOnePiece ? 'text-rose-950' : 'text-amber-950'}`}>
                                {isOnePiece
                                  ? 'HỢP ĐỒNG PHÂN PHỐI SỈ ONE PIECE CARD GAME (TẦNG 2 · GRAND LINE)'
                                  : 'HỢP ĐỒNG PHÂN PHỐI SỈ POKÉMON TCG (TẦNG 1 & TOÀN TIỆM)'}
                              </h3>
                              <span className="text-[10px] font-bold bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full border border-amber-300">
                                {isOnePiece ? '⭐ OP-10 Starter $16.20' : 'Chính thức'}
                              </span>
                            </div>
                            <p className={`text-xs mt-1 max-w-2xl leading-relaxed ${isOnePiece ? 'text-rose-900' : 'text-amber-800'}`}>
                              {isOnePiece
                                ? 'Bộ OP-10 The Royal Blood là dòng box rẻ nhất toàn tiệm ($16.20/box) và mở sẵn từ Cấp 1! Các bộ OP-02 đến OP-09 cùng Rương VIP yêu cầu cấp tiệm để mua giấy phép phân phối.'
                                : 'Mỗi dòng Pack / Box yêu cầu Cấp Cửa Hàng tương ứng để được cấp quyền phân phối. Trả phí giấy phép 1 lần duy nhất để vĩnh viễn mở quyền nhập sỉ với giá gốc!'}
                            </p>
                          </div>
                        </div>
                        <div className="bg-white/95 border border-amber-200 px-4 py-2.5 rounded-xl shadow-xs text-right shrink-0">
                          <div className="text-[10px] font-bold text-zinc-500 uppercase">Tiến Độ Sở Hữu</div>
                          <div className={`text-base font-black ${isOnePiece ? 'text-rose-900' : 'text-amber-900'}`}>
                            {ownedCount} / {displayLicenses.length} Giấy Phép
                          </div>
                          <div className="text-[10px] text-emerald-600 font-bold mt-0.5">
                            Quỹ tiệm: ${shopState.cash.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Grid of Licenses */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {displayLicenses.map((lic) => {
                        const isOwned = hasProductLicense(shopState.purchasedLicenses, lic.id);
                        const isLevelMet = shopState.storeLevel >= lic.level;
                        const hasCash = shopState.cash >= lic.licenseFee;
                        const isOp10BoxLic = lic.id === 'lic_op10_box';

                        return (
                          <div
                            key={lic.id}
                            className={`rounded-xl border-2 p-3.5 transition flex gap-3.5 items-center justify-between relative overflow-hidden ${
                              isOp10BoxLic
                                ? 'border-amber-500 bg-amber-50/50 shadow-md ring-1 ring-amber-400'
                                : isOwned
                                ? 'border-emerald-300 bg-emerald-50/50 shadow-xs'
                                : isLevelMet
                                ? 'border-amber-400 bg-white shadow-md hover:border-amber-500'
                                : 'border-zinc-200 bg-zinc-50/80 opacity-75'
                            }`}
                          >
                            {isOp10BoxLic && (
                              <div className="absolute top-0 right-0 bg-yellow-400 text-black text-[9px] font-black px-2 py-0.5 rounded-bl shadow-xs">
                                ⭐ Box Rẻ Nhất $16.20
                              </div>
                            )}
                            <div className="relative w-20 h-24 rounded-lg bg-zinc-100 overflow-hidden flex items-center justify-center shrink-0 border border-zinc-200 p-1">
                              <img
                                src={lic.imageUrl || 'https://cdn.hstatic.net/products/200000160361/1234_7343f2ac70a64e7d8eee069e79da0905.jpg'}
                                alt={lic.name}
                                className={`h-full object-contain ${!isOwned && !isLevelMet ? 'grayscale' : ''}`}
                              />
                              <span
                                className={`absolute top-1 left-1 text-[9px] font-black px-1.5 py-0.2 rounded ${
                                  lic.type === 'box' ? 'bg-indigo-600 text-white' : 'bg-sky-600 text-white'
                                }`}
                              >
                                {lic.type === 'box' ? 'Box' : 'Pack'}
                              </span>
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span
                                  className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                                    isLevelMet
                                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                      : 'bg-zinc-200 text-zinc-600'
                                  }`}
                                >
                                  {isLevelMet ? `✅ Cấp ${lic.level} Đạt` : `🔒 Cần Cấp ${lic.level}`}
                                </span>
                                <span className="text-[10px] text-zinc-500 font-bold">{lic.set}</span>
                              </div>
                              <h4 className="text-xs sm:text-sm font-black text-zinc-900 truncate mt-1">
                                {lic.name}
                              </h4>
                              <p className="text-[11px] text-zinc-600 line-clamp-1 mt-0.5">
                                {lic.description}
                              </p>
                              <div className="mt-2 flex items-center gap-3 text-[11px] flex-wrap">
                                <span className="text-zinc-500">
                                  Giá sỉ: <strong className="text-zinc-900">${lic.cost.toFixed(2)}</strong>
                                </span>
                                <span className="text-zinc-500">
                                  Bán gợi ý: <strong className="text-emerald-700">${lic.price.toFixed(2)}</strong>
                                </span>
                                <span className="text-amber-800 font-bold">
                                  Phí giấy phép: ${lic.licenseFee}
                                </span>
                              </div>
                            </div>

                            <div className="shrink-0 flex flex-col items-end gap-1.5">
                              {isOwned ? (
                                <div className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-black shadow-xs">
                                  <Check className="h-4 w-4" />
                                  <span>Đã Mở</span>
                                </div>
                              ) : isLevelMet ? (
                                <button
                                  onClick={() => onPurchaseLicense?.(lic.id, lic.licenseFee)}
                                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black shadow transition active:scale-95 cursor-pointer ${
                                    hasCash
                                      ? 'bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-amber-950 border border-amber-400 animate-pulse'
                                      : 'bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300'
                                  }`}
                                  title={`Nhấn để trả $${lic.licenseFee} mở khóa giấy phép vĩnh viễn`}
                                >
                                  <FileText className="h-3.5 w-3.5" />
                                  <span>Mua ${lic.licenseFee}</span>
                                </button>
                              ) : (
                                <div className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-zinc-200 text-zinc-500 text-xs font-bold border border-zinc-300">
                                  <Lock className="h-3.5 w-3.5" />
                                  <span>Khóa Cấp {lic.level}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* DEDICATED SHELF UNLOCKS SUB-TAB (PROGRESSIVE LEVEL + FEE UNLOCKING) */}
              {supplyTab === 'items' && itemsSubTab === 'shelf_unlocks' && (() => {
                const isOnePiece = catalogFranchise === 'onepiece';
                const currentUnlocked = shopState.unlockedShelves || STARTER_UNLOCKED_SHELVES;
                const totalShelvesForFranchise = SHELF_UNLOCKS.filter((s) =>
                  isOnePiece ? s.id.startsWith('op_shelf_') : !s.id.startsWith('op_shelf_')
                );
                const unlockedCount = totalShelvesForFranchise.filter((s) => isShelfUnlocked(currentUnlocked, s.id)).length;

                const categoryMeta: Array<{ key: ShelfUnlockCategory; title: string; subtitle: string; badgeClass: string }> = isOnePiece
                  ? [
                      {
                        key: 'wall_expansion',
                        title: '1. Dãy Kệ Tường One Piece (Grand Line Expansion · 4 Khoang Tầng 2)',
                        subtitle: 'Mỗi khoang mở thêm 2 ô Booster Box (16 hộp) và 8 cột Booster Pack (80 gói One Piece).',
                        badgeClass: 'border-rose-500 text-rose-900 bg-rose-50',
                      },
                      {
                        key: 'specialty',
                        title: '2. Đảo Trái Ác Quỷ & Bàn Rương Truy Nã (Tầng 2)',
                        subtitle: 'Kệ Gondola Trái Ác Quỷ 8 Hạng và Bàn Gỗ Rương Truy Nã Hải Tặc Grand Line.',
                        badgeClass: 'border-purple-500 text-purple-900 bg-purple-50',
                      },
                      {
                        key: 'collector_vip',
                        title: '3. Dãy Tủ Kính VIP One Piece Tường Trái (4 Khoang 1×1 Tầng 2)',
                        subtitle: 'Trưng bày rương bảo vật Luffy Gear 5, Tứ Hoàng, Vua Hải Tặc Roger & Kỉ Niệm 25 Năm.',
                        badgeClass: 'border-amber-500 text-amber-900 bg-amber-50',
                      },
                    ]
                  : [
                      {
                        key: 'wall_expansion',
                        title: '1. Dãy Kệ Tường Phải (Pokémon TCG Expansion Collection · 4 Khoang)',
                        subtitle: 'Mỗi khoang mở thêm 2 ô Booster Box (16 hộp) và 8 cột Booster Pack (80 gói).',
                        badgeClass: 'border-sky-500 text-sky-900 bg-sky-50',
                      },
                      {
                        key: 'card_display',
                        title: '2. Kệ Trưng Bày Thẻ Tường Sau (3 Kệ Kính · 6 Thẻ/Kệ)',
                        subtitle: 'Trưng bày các thẻ hiếm hoặc Slab PSA/CGC thu hút khách sưu tầm.',
                        badgeClass: 'border-amber-500 text-amber-900 bg-amber-50',
                      },
                      {
                        key: 'specialty',
                        title: '3. Kệ Đặc Biệt Trung Tâm & Quầy Thu Ngân',
                        subtitle: 'Kệ Gondola 8 hạng Mystery Gacha và Kệ thép GameStop Mystery Box.',
                        badgeClass: 'border-purple-500 text-purple-900 bg-purple-50',
                      },
                      {
                        key: 'collector_vip',
                        title: '4. Dãy Tủ Kính VIP Collector Tường Trái (4 Khoang 1×1)',
                        subtitle: 'Mở khóa từng tủ trưng bày các rương sưu tầm UPC / SPC siêu lợi nhuận.',
                        badgeClass: 'border-rose-500 text-rose-900 bg-rose-50',
                      },
                    ];

                return (
                  <div className="space-y-6">
                    {/* Header Banner */}
                    <div className={`rounded-2xl border-2 p-4 shadow-sm ${
                      isOnePiece
                        ? 'border-rose-300 bg-gradient-to-r from-rose-50 via-red-50 to-amber-50'
                        : 'border-cyan-300 bg-gradient-to-r from-cyan-50 via-sky-50 to-white'
                    }`}>
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-12 h-12 rounded-xl text-white flex items-center justify-center font-black text-2xl shadow-sm shrink-0 ${
                            isOnePiece ? 'bg-rose-600' : 'bg-cyan-600'
                          }`}>
                            🪜
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className={`text-sm sm:text-base font-black ${isOnePiece ? 'text-rose-950' : 'text-cyan-950'}`}>
                                {isOnePiece ? 'MỞ KHÓA KỆ ONE PIECE TẦNG 2 (GRAND LINE)' : 'MỞ KHÓA KỆ TRƯNG BÀY POKÉMON (TẦNG 1)'}
                              </h3>
                              <span className="text-[10px] font-bold bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full border border-amber-300">
                                Cấp Hiện Tại: Lv.{shopState.storeLevel}
                              </span>
                            </div>
                            <p className={`text-xs mt-1 max-w-2xl leading-relaxed ${isOnePiece ? 'text-rose-900' : 'text-cyan-800'}`}>
                              {isOnePiece
                                ? 'Tầng 2 sở hữu dãy kệ tường 4 khoang cho Box/Pack One Piece, kệ đảo Trái Ác Quỷ, bàn Rương Truy Nã và dãy tủ kính VIP 1×1!'
                                : 'Khi mới mở tiệm, bạn có 1 khoang kệ Expansion #1 và 1 kệ thẻ #1 hoạt động. Lên cấp cửa hàng để trả phí mở khóa dần các khoang kệ còn lại.'}
                            </p>
                          </div>
                        </div>
                        <div className="bg-white/95 border border-amber-200 px-4 py-2.5 rounded-xl shadow-xs text-right shrink-0">
                          <div className="text-[10px] font-bold text-zinc-500 uppercase">Tiến Độ Kệ Tiệm</div>
                          <div className={`text-base font-black ${isOnePiece ? 'text-rose-900' : 'text-cyan-900'}`}>
                            {unlockedCount} / {totalShelvesForFranchise.length} Kệ Đã Mở
                          </div>
                          <div className="text-[10px] text-emerald-600 font-bold mt-0.5">
                            Quỹ tiệm: ${shopState.cash.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Categorized Shelf Cards */}
                    {categoryMeta.map((cat) => {
                      const shelves = totalShelvesForFranchise.filter((s) => s.category === cat.key);
                      return (
                        <div key={cat.key} className="space-y-3">
                          <div className={`border-l-4 pl-3 py-1 rounded-r-lg ${cat.badgeClass}`}>
                            <h4 className="text-xs sm:text-sm font-black uppercase tracking-wide">{cat.title}</h4>
                            <p className="text-[11px] opacity-80">{cat.subtitle}</p>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                            {shelves.map((shelf) => {
                              const isOwned = isShelfUnlocked(currentUnlocked, shelf.id);
                              const isLevelMet = shopState.storeLevel >= shelf.level;
                              const hasCash = shopState.cash >= shelf.fee;

                              return (
                                <div
                                  key={shelf.id}
                                  className={`rounded-xl border-2 p-3.5 transition flex items-center justify-between gap-3 ${
                                    isOwned
                                      ? 'border-emerald-300 bg-emerald-50/50 shadow-xs'
                                      : isLevelMet
                                      ? 'border-cyan-400 bg-white shadow-md hover:border-cyan-500'
                                      : 'border-zinc-200 bg-zinc-50/85 opacity-80'
                                  }`}
                                >
                                  <div className="flex items-start gap-3 flex-1 min-w-0">
                                    <div
                                      className="w-11 h-11 rounded-xl flex items-center justify-center text-xl font-black shrink-0 border shadow-xs text-white"
                                      style={{
                                        backgroundColor: isOwned ? '#10b981' : isLevelMet ? shelf.accentColor : '#64748b',
                                      }}
                                    >
                                      {isOwned ? '🔓' : '🔒'}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <span
                                          className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                                            isOwned
                                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                              : isLevelMet
                                              ? 'bg-sky-100 text-sky-800 border border-sky-300'
                                              : 'bg-zinc-200 text-zinc-600'
                                          }`}
                                        >
                                          {isOwned
                                            ? '✅ Đã Mở Khóa'
                                            : isLevelMet
                                            ? `✅ Đạt Cấp ${shelf.level}`
                                            : `🔒 Cần Cấp ${shelf.level}`}
                                        </span>
                                        <span className="text-[10px] font-bold text-cyan-800 bg-cyan-50 px-2 py-0.5 rounded border border-cyan-200">
                                          {shelf.capacityText}
                                        </span>
                                      </div>
                                      <h5 className="text-xs sm:text-sm font-black text-zinc-900 truncate mt-1">
                                        {shelf.name}
                                      </h5>
                                      <p className="text-[11px] text-zinc-600 line-clamp-2 mt-0.5">
                                        {shelf.description}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="shrink-0 flex flex-col items-end gap-1">
                                    {isOwned ? (
                                      <div className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-black">
                                        <Check className="h-4 w-4" />
                                        <span>Đang Hoạt Động</span>
                                      </div>
                                    ) : isLevelMet ? (
                                      <button
                                        onClick={() => onPurchaseShelfUnlock?.(shelf.id, shelf.fee)}
                                        className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black shadow transition active:scale-95 cursor-pointer ${
                                          hasCash
                                            ? 'bg-gradient-to-r from-cyan-500 to-sky-600 hover:from-cyan-600 hover:to-sky-700 text-white'
                                            : 'bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300'
                                        }`}
                                        title={`Trả $${shelf.fee} để mở khóa kệ vĩnh viễn`}
                                      >
                                        <span>Mở Khóa ${shelf.fee.toLocaleString()}</span>
                                      </button>
                                    ) : (
                                      <div className="flex flex-col items-end">
                                        <div className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-zinc-200 text-zinc-600 text-xs font-bold border border-zinc-300">
                                          <Lock className="h-3.5 w-3.5" />
                                          <span>Cấp {shelf.level}</span>
                                        </div>
                                        <span className="text-[10px] font-bold text-zinc-500 mt-0.5">
                                          Phí: ${shelf.fee.toLocaleString()}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

              {/* 2. FIGURES SUB-TAB */}
              {supplyTab === 'items' && itemsSubTab === 'figure' && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {figureCatalog.map((fig) => (
                    <div
                      key={fig.id}
                      className="rounded-xl border-2 border-zinc-200 bg-white p-3.5 shadow hover:shadow-md transition flex flex-col justify-between"
                    >
                      <div className="relative h-44 w-full rounded-lg bg-zinc-50 overflow-hidden flex items-center justify-center p-2 mb-2">
                        <img src={fig.image} alt={fig.name} className="h-full object-contain" />
                      </div>
                      <div>
                        <div className="text-xs font-black text-zinc-900">{fig.name}</div>
                        <p className="text-[11px] text-zinc-500 mt-1 line-clamp-2">{fig.description}</p>
                      </div>
                      <div className="mt-3 pt-2 border-t border-zinc-100 flex items-center justify-between">
                        <div>
                          <div className="text-sm font-black text-zinc-900">${fig.price.toFixed(2)}</div>
                          <div className="text-[10px] text-emerald-600 font-bold">Bán gợi ý: ${fig.retailSuggested}</div>
                        </div>
                        <button
                          onClick={() => handleAddToCart(fig.id)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#0284c7] hover:bg-sky-600 text-white font-black text-xs cursor-pointer shadow"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>Đặt Hàng</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* 3. MERCHANDISE SUB-TAB */}
              {supplyTab === 'items' && itemsSubTab === 'merchandise' && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {merchCatalog.map((merch) => (
                    <div
                      key={merch.id}
                      className="rounded-xl border-2 border-zinc-200 bg-white p-3.5 shadow hover:shadow-md transition flex flex-col justify-between"
                    >
                      <div className="relative h-44 w-full rounded-lg bg-zinc-50 overflow-hidden flex items-center justify-center p-2 mb-2">
                        <img src={merch.image} alt={merch.name} className="h-28 object-contain" />
                      </div>
                      <div>
                        <div className="text-xs font-black text-zinc-900">{merch.name}</div>
                        <p className="text-[11px] text-zinc-500 mt-1 line-clamp-2">{merch.description}</p>
                      </div>
                      <div className="mt-3 pt-2 border-t border-zinc-100 flex items-center justify-between">
                        <div>
                          <div className="text-sm font-black text-zinc-900">${merch.price.toFixed(2)}</div>
                          <div className="text-[10px] text-emerald-600 font-bold">Bán gợi ý: ${merch.retailSuggested}</div>
                        </div>
                        <button
                          onClick={() => handleAddToCart(merch.id)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#0284c7] hover:bg-sky-600 text-white font-black text-xs cursor-pointer shadow"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>Đặt Hàng</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* 4. FACILITIES TAB (Bàn trưng bày Ảnh 5 & 6, Quầy Thu Ngân Ảnh 3, Kệ Hàng) */}
              {supplyTab === 'facilities' && (
                <div className="space-y-4">
                  <div className="rounded-xl border-2 border-cyan-300 bg-gradient-to-r from-cyan-50 to-sky-50 p-3.5 text-xs text-cyan-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
                    <div>
                      <div className="font-black text-sm text-cyan-900 flex items-center gap-2">
                        <span>🪜 Nâng Cấp & Mở Khóa Hệ Thống Kệ Tiệm</span>
                        <span className="text-[10px] bg-cyan-600 text-white px-2 py-0.5 rounded-full font-black">
                          {SHELF_UNLOCKS.filter((s) => isShelfUnlocked(shopState.unlockedShelves || STARTER_UNLOCKED_SHELVES, s.id)).length}/{SHELF_UNLOCKS.length} Kệ Đã Mở
                        </span>
                      </div>
                      <p className="text-[11px] text-cyan-800 mt-0.5">
                        Mở khóa thêm các khoang kệ Expansion Collection, Kệ Trưng Bày Thẻ, Kệ Mystery Gacha, GameStop và Kệ VIP Collector theo cấp cửa hàng!
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        soundManager.playSelectSound();
                        setSupplyTab('items');
                        setItemsSubTab('shelf_unlocks');
                      }}
                      className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-black text-xs cursor-pointer shadow shrink-0 flex items-center gap-1.5"
                    >
                      <Layers className="h-4 w-4" />
                      <span>Mở Khóa Kệ Ngay</span>
                    </button>
                  </div>

                  <div className="bg-sky-50 border border-sky-200 rounded-xl p-3 text-xs text-sky-800">
                    💡 <strong>Nội Thất & Cơ Sở Vật Chất Cửa Tiệm:</strong> Đặt mua bàn trưng bày 10 chân đứng vàng (Ảnh 5 & 6) và quầy thu ngân bo cong chữ U hiện đại (Ảnh 3).
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {facilitiesCatalog.map((fac) => (
                      <div
                        key={fac.id}
                        className="rounded-xl border-2 border-zinc-200 bg-white p-4 shadow hover:shadow-md transition flex flex-col justify-between"
                      >
                        <div className="flex items-start gap-3">
                          <div className="text-3xl p-3 rounded-xl bg-amber-100 border border-amber-300 shrink-0">
                            {fac.icon}
                          </div>
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-sky-600 bg-sky-100 px-2 py-0.5 rounded">
                              {fac.category}
                            </span>
                            <div className="text-xs sm:text-sm font-black text-zinc-900 mt-1">{fac.name}</div>
                            <p className="text-xs text-zinc-600 mt-1">{fac.description}</p>
                          </div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center justify-between">
                          <div className="text-base font-black text-zinc-900">${fac.price.toFixed(2)}</div>
                          <button
                            onClick={() => handleAddToCart(fac.id)}
                            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#0284c7] hover:bg-sky-600 text-white font-black text-xs cursor-pointer shadow"
                          >
                            <ShoppingCart className="h-3.5 w-3.5" />
                            <span>Mua Cơ Sở Vật Chất</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 5. EXPAND & DECORATION & FLOOR 2 TABS */}
              {(supplyTab === 'expand' || supplyTab === 'decoration' || supplyTab === 'floor2') && (
                <div className="py-8 text-center space-y-3">
                  <div className="text-4xl">🏗️</div>
                  <h4 className="text-base font-black text-zinc-800 uppercase">
                    {supplyTab === 'expand' ? 'Mở Rộng Diện Tích Sàn Cửa Hàng' : supplyTab === 'decoration' ? 'Trang Trí & Đèn Neon Tiệm' : 'Khu Vực Tầng 2 (VIP Lounge)'}
                  </h4>
                  <p className="text-xs text-zinc-500 max-w-md mx-auto">
                    Khu vực này giúp mở rộng quy mô tiệm TCG lên tầm cao mới khi đạt danh tiếng và số lượng khách phục vụ cao!
                  </p>
                  <button
                    onClick={() => onPurchaseUpgrade(supplyTab, 500)}
                    disabled={shopState.cash < 500}
                    className="px-6 py-2.5 rounded-xl bg-[#0284c7] text-white font-black text-xs hover:bg-sky-600 cursor-pointer shadow disabled:bg-zinc-300 disabled:text-zinc-500 disabled:cursor-not-allowed"
                  >
                    Nâng Cấp ($500.00)
                  </button>
                </div>
              )}
            </div>

            {/* SLIDE-OUT CART MODAL / DRAWER */}
            {showCartDrawer && (
              <div className="absolute inset-0 z-40 bg-black/65 flex justify-end">
                <div className="w-full max-w-md bg-white h-full p-4 flex flex-col justify-between shadow-2xl animate-in slide-in-from-right duration-200">
                  <div className="flex items-center justify-between border-b pb-3">
                    <div className="flex items-center gap-2">
                      <ShoppingCart className="h-5 w-5 text-sky-600" />
                      <h4 className="text-sm font-black text-zinc-900">Giỏ Hàng Nhập Sỉ ({totalCartCount})</h4>
                    </div>
                    <button
                      onClick={() => setShowCartDrawer(false)}
                      className="p-1 rounded-md text-zinc-400 hover:text-zinc-700 cursor-pointer"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto py-3 space-y-2">
                    {Object.keys(cart).length === 0 ? (
                      <div className="text-center py-16 text-zinc-400 text-xs">
                        Giỏ hàng đang trống. Hãy chọn món hàng để thêm vào giỏ!
                      </div>
                    ) : (
                      Object.entries(cart).map(([id, qty]) => {
                        const item = allOrderableItems.find((i) => i.id === id);
                        if (!item) return null;
                        return (
                          <div
                            key={id}
                            className="flex items-center justify-between p-2.5 rounded-lg border border-zinc-200 bg-zinc-50"
                          >
                            <div className="flex-1 pr-2">
                              <div className="text-xs font-black text-zinc-900 truncate">{item.name}</div>
                              <div className="text-[11px] text-zinc-500">${item.price.toFixed(2)} x {qty}</div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleRemoveFromCart(id)}
                                className="h-6 w-6 rounded bg-zinc-200 hover:bg-zinc-300 text-zinc-800 flex items-center justify-center font-bold text-xs"
                              >
                                -
                              </button>
                              <span className="text-xs font-black w-4 text-center">{qty}</span>
                              <button
                                onClick={() => handleAddToCart(id)}
                                className="h-6 w-6 rounded bg-zinc-200 hover:bg-zinc-300 text-zinc-800 flex items-center justify-center font-bold text-xs"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <div className="border-t pt-3 space-y-3">
                    {wholesaleDiscountPct > 0 && (
                      <div className="flex items-center justify-between text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1.5">
                        <span>🏆 Ưu đãi Master Set 100%:</span>
                        <span>Giảm -{wholesaleDiscountPct}%</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-zinc-500 font-bold">Tổng Thanh Toán:</span>
                      <span className="text-lg font-black text-zinc-900 font-mono">${totalCartCost.toFixed(2)}</span>
                    </div>

                    <button
                      disabled={Object.keys(cart).length === 0}
                      onClick={handleCheckoutCart}
                      className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-sm cursor-pointer shadow-lg disabled:bg-zinc-300 disabled:text-zinc-500 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      <Check className="h-4 w-4" />
                      <span>XÁC NHẬN ĐẶT HÀNG GIAO TẬN TIỆM</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 3: EMPLOYEE APP (THUÊ NHÂN VIÊN BÁN HÀNG THEO GIỜ - WEB HR PORTAL)   */}
        {/* ========================================================================= */}
        {currentApp === 'employee' && (
          <StaffAppView
            shopState={shopState}
            onBack={() => setCurrentApp('home')}
            onHireStaff={onHireStaff}
          />
        )}

        {/* ========================================================================= */}
        {/* VIEW 3.5: BATTLE ARENA APP SCREEN (MATCHING USER SCREENSHOT 10)           */}
        {/* ========================================================================= */}
        {currentApp === 'battle_arena' && (
          <div className="flex-1 bg-gradient-to-b from-zinc-950 via-[#0d1527] to-zinc-950 text-white p-4 sm:p-6 rounded-b-2xl overflow-y-auto flex flex-col justify-between">
            <div>
              {/* Top Header */}
              <div className="flex items-center justify-between border-b border-blue-900/60 pb-3">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-500 to-sky-400 flex items-center justify-center text-white shadow-lg border border-blue-300">
                    <Swords className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base sm:text-lg font-black text-sky-300 uppercase tracking-wide">
                        Khu Vực Bàn Đấu Pokemon TCG (Battle Arena)
                      </h3>
                      <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-black text-emerald-400 border border-emerald-500/40 flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        {currentRentalFee}$/Giờ Mỗi Người Chơi
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400">
                      Các bài thủ thi đấu trực tiếp tại bàn chơi. Tiền thuê bàn tự động thu về cho cửa hàng mỗi giờ chơi!
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setCurrentApp('home')}
                  className="px-3 py-1.5 rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-sky-400 hover:text-white transition cursor-pointer text-xs font-bold"
                >
                  Về Trang Chủ
                </button>
              </div>

              {/* Quick Stats Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-3">
                <div className="rounded-2xl border border-blue-500/30 bg-blue-950/40 p-3 flex flex-col justify-between">
                  <span className="text-[11px] text-zinc-400 flex items-center gap-1 font-medium">
                    <Users className="h-3.5 w-3.5 text-sky-400" /> Bài Thủ Đang Chơi
                  </span>
                  <span className="text-xl font-black text-white mt-1">{shopState.tablePlayersCount || 4} Người</span>
                  <span className="text-[10px] text-sky-300">2 trận đấu song song</span>
                </div>

                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/40 p-3 flex flex-col justify-between">
                  <span className="text-[11px] text-zinc-400 flex items-center gap-1 font-medium">
                    <Clock className="h-3.5 w-3.5 text-emerald-400" /> Giá Thuê / Giờ
                  </span>
                  <span className="text-xl font-black text-emerald-300 mt-1">${currentRentalFee}.00 / h</span>
                  <span className="text-[10px] text-emerald-400">
                    Thu nhập: ${(currentRentalFee * (shopState.tablePlayersCount || 4)).toFixed(0)}/h tổng
                  </span>
                </div>

                <div className="rounded-2xl border border-amber-500/30 bg-amber-950/40 p-3 flex flex-col justify-between">
                  <span className="text-[11px] text-zinc-400 flex items-center gap-1 font-medium">
                    <TrendingUp className="h-3.5 w-3.5 text-amber-400" /> Tổng Tiền Thu Hôm Nay
                  </span>
                  <span className="text-xl font-black text-amber-300 mt-1">
                    ${(shopState.totalTableRentalEarnings || 0).toFixed(2)}
                  </span>
                  <span className="text-[10px] text-amber-400">Tự động cộng vào ngân quỹ</span>
                </div>

                <div className="rounded-2xl border border-purple-500/30 bg-purple-950/40 p-3 flex flex-col justify-between">
                  <span className="text-[11px] text-zinc-400 flex items-center gap-1 font-medium">
                    <Trophy className="h-3.5 w-3.5 text-purple-400" /> Độ Nổi Tiếng Bàn Đấu
                  </span>
                  <span className="text-xl font-black text-purple-300 mt-1">Hạng A+</span>
                  <span className="text-[10px] text-purple-300">
                    {tournamentHosted ? 'Đang diễn ra giải đấu sôi nổi!' : 'Luôn kín bàn 100%'}
                  </span>
                </div>
              </div>

              {/* Tab Navigation */}
              <div className="flex items-center gap-2 mb-3">
                <button
                  onClick={() => setArenaTab('matches')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    arenaTab === 'matches'
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/40'
                      : 'bg-zinc-900/80 text-zinc-400 hover:text-white'
                  }`}
                >
                  <Swords className="h-3.5 w-3.5" /> Trận Đấu Đang Diễn Ra (Live Matches)
                </button>
                <button
                  onClick={() => setArenaTab('settings')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    arenaTab === 'settings'
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/40'
                      : 'bg-zinc-900/80 text-zinc-400 hover:text-white'
                  }`}
                >
                  <DollarSign className="h-3.5 w-3.5" /> Cài Đặt Mức Phí & Dịch Vụ
                </button>
              </div>

              {/* Tab Contents */}
              {arenaTab === 'matches' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* MATCH 1: TABLE 1 */}
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-3.5 relative overflow-hidden">
                    <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-xs font-bold text-white uppercase tracking-wider">
                          Bàn Số 1: Trận Đấu Tiêu Điểm
                        </span>
                      </div>
                      <span className="text-[10px] text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                        Lượt 8 • Best of 3
                      </span>
                    </div>

                    <div className="space-y-2 mt-2.5">
                      <div className="flex items-center justify-between p-2 rounded-xl bg-zinc-950/60 border border-zinc-800/80">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-lg bg-red-600 flex items-center justify-center text-xs font-black">
                            🔥
                          </div>
                          <div>
                            <div className="text-xs font-bold text-white">Tuấn Charizard (Áo vest kem)</div>
                            <div className="text-[10px] text-zinc-400">Deck: Charizard ex Darkness Ablaze</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-bold text-emerald-400">2 Prize Còn Lại</span>
                          <div className="text-[10px] text-zinc-500">Đã thanh toán ${currentRentalFee}</div>
                        </div>
                      </div>

                      <div className="flex items-center justify-center">
                        <span className="text-[9px] font-black tracking-widest text-zinc-500 uppercase px-2 py-0.5 rounded bg-zinc-800">
                          VS
                        </span>
                      </div>

                      <div className="flex items-center justify-between p-2 rounded-xl bg-zinc-950/60 border border-zinc-800/80">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-lg bg-yellow-500 text-black flex items-center justify-center text-xs font-black">
                            ⚡
                          </div>
                          <div>
                            <div className="text-xs font-bold text-white">Minh Kính Cận (Áo sơ mi sọc xanh)</div>
                            <div className="text-[10px] text-zinc-400">Deck: Miraidon ex Lightning Acceleration</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-bold text-amber-400">3 Prize Còn Lại</span>
                          <div className="text-[10px] text-zinc-500">Đã thanh toán ${currentRentalFee}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* MATCH 2: TABLE 2 */}
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-3.5 relative overflow-hidden">
                    <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full bg-purple-400 animate-pulse" />
                        <span className="text-xs font-bold text-white uppercase tracking-wider">
                          Bàn Số 2: Trận Đấu Huyền Thoại
                        </span>
                      </div>
                      <span className="text-[10px] text-purple-400 font-bold bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                        Lượt 5 • Sudden Death
                      </span>
                    </div>

                    <div className="space-y-2 mt-2.5">
                      <div className="flex items-center justify-between p-2 rounded-xl bg-zinc-950/60 border border-zinc-800/80">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-lg bg-indigo-600 flex items-center justify-center text-xs font-black">
                            👁️
                          </div>
                          <div>
                            <div className="text-xs font-bold text-white">Alex Trọc (Áo hoodie xanh navy)</div>
                            <div className="text-[10px] text-zinc-400">Deck: Mewtwo VSTAR Psychic Embrace</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-bold text-emerald-400">1 Prize Còn Lại</span>
                          <div className="text-[10px] text-zinc-500">Đã thanh toán ${currentRentalFee}</div>
                        </div>
                      </div>

                      <div className="flex items-center justify-center">
                        <span className="text-[9px] font-black tracking-widest text-zinc-500 uppercase px-2 py-0.5 rounded bg-zinc-800">
                          VS
                        </span>
                      </div>

                      <div className="flex items-center justify-between p-2 rounded-xl bg-zinc-950/60 border border-zinc-800/80">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-lg bg-sky-600 flex items-center justify-center text-xs font-black">
                            🌊
                          </div>
                          <div>
                            <div className="text-xs font-bold text-white">Huy Eevee (Áo phông xám)</div>
                            <div className="text-[10px] text-zinc-400">Deck: Lugia VSTAR Archeops Energy</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-bold text-emerald-400">2 Prize Còn Lại</span>
                          <div className="text-[10px] text-zinc-500">Đã thanh toán ${currentRentalFee}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4 space-y-4">
                  <div className="text-xs font-bold text-zinc-300">
                    Chọn mức phí thuê bàn theo giờ (Mặc định: $5/giờ). Giá càng hợp lý thì khách ngồi càng lâu:
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { price: 3, label: '$3.00 / h', desc: 'Giá bình dân, hút nhiều bài thủ mới' },
                      { price: 5, label: '$5.00 / h', desc: 'Mức chuẩn thị trường TCG (Khuyên Dùng)' },
                      { price: 8, label: '$8.00 / h', desc: 'Bàn cao cấp cho các giải đấu' },
                      { price: 10, label: '$10.00 / h', desc: 'Dành cho bài thủ chuyên nghiệp / VIP' },
                    ].map((tier) => (
                      <button
                        key={tier.price}
                        onClick={() => handlePriceSelect(tier.price)}
                        className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                          currentRentalFee === tier.price
                            ? 'border-emerald-400 bg-emerald-950/50 shadow-md shadow-emerald-500/20'
                            : 'border-zinc-800 bg-zinc-950/50 hover:border-zinc-700'
                        }`}
                      >
                        <div className="text-base font-black text-white">{tier.label}</div>
                        <div className="text-[10px] text-zinc-400 mt-1">{tier.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-zinc-800/80 mt-3">
              <div className="flex flex-wrap items-center gap-2">
                {onOpenBattleArena && (
                  <button
                    onClick={() => {
                      soundManager.playSelectSound();
                      onClose();
                      onOpenBattleArena();
                    }}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-500 hover:brightness-110 text-white font-black text-xs shadow-md transition cursor-pointer flex items-center gap-1.5"
                  >
                    <Swords className="h-4 w-4" />
                    Mở Giải Đấu Bracket 8 Đội &amp; Tủ Cúp
                  </button>
                )}

                <button
                  onClick={handleTournamentClick}
                  disabled={shopState.cash < 50 || tournamentHosted}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-black text-xs shadow-md transition disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  <Trophy className="h-4 w-4" />
                  {tournamentHosted ? 'Giải Đấu Đang Diễn Ra' : 'Tổ Chức Giải Đấu Tuần (Phí $50)'}
                </button>

                <button
                  onClick={handleRefreshmentsClick}
                  disabled={shopState.cash < 15 || servedRefreshments}
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-xs border border-zinc-700 transition disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  <Coffee className="h-4 w-4" />
                  {servedRefreshments ? 'Đã Phục Vụ Nước' : 'Phục Vụ Nước & Snack ($15)'}
                </button>
              </div>

              <button
                onClick={() => setCurrentApp('home')}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition cursor-pointer"
              >
                Về Trang Chủ Tablet
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 4: SÀN THẺ TCG EXCHANGE APP (CARD EXCHANGE & DERIVATIVES)            */}
        {/* ========================================================================= */}
        {currentApp === 'card_exchange' && (
          <CardExchangeAppView
            shopState={shopState}
            activeProfileId={activeProfileId}
            onUpdateCash={(newCash) => {
              if (onUpdateCash) onUpdateCash(newCash);
            }}
            onBack={() => setCurrentApp('home')}
          />
        )}

        {/* ========================================================================= */}
        {/* VIEW 4B: POKÉSHIP EXPRESS DELIVERY APP                                    */}
        {/* ========================================================================= */}
        {currentApp === 'pokeship' && (
          <PokeShipAppView
            shopState={shopState}
            onBack={() => setCurrentApp('home')}
            onAcceptOrder={(order) => onAcceptDeliveryOrder?.(order)}
            onCancelMission={() => onCancelDeliveryMission?.()}
            onRefreshBoard={() => onRefreshDeliveryBoard?.()}
            onFocusDeliveryOnMap={(stop) => onFocusDeliveryOnMap?.(stop)}
            onClaimDailyTask={(taskId) => onClaimDailyTask?.(taskId)}
            onGoToSupply={() => {
              setCurrentApp('supply');
              setSupplyTab('items');
              setItemsSubTab('cardpack');
            }}
          />
        )}

        {/* ========================================================================= */}
        {/* VIEW 4C: CARDX SOCIAL CARD MARKETPLACE WEB APP (X.COM / THREADS STYLE)    */}
        {/* ========================================================================= */}
        {currentApp === 'card_social' && (
          <CardSocialFeedView
            shopState={shopState}
            onHaggleCityHunt={(spotId, discountPct) => onHaggleCityHunt?.(spotId, discountPct)}
            onBuyCityHunt={(spotId) => onBuyCityHunt?.(spotId)}
            onRefreshCityHunts={() => onRefreshCityHunts?.()}
            onRefreshMarketPulses={onRefreshMarketPulses}
            onOpenPokeLive={
              onOpenPokeLive
                ? () => {
                    onClose();
                    onOpenPokeLive();
                  }
                : undefined
            }
            onNavigateToPoi={(poiId, name, x, z) => onNavigateToPoi?.(poiId, name, x, z)}
            onSellBinderCard={onSellBinderCardOnSocial}
            onBuyOverpricedCard={onBuyOverpricedCard}
            onBack={() => setCurrentApp('home')}
          />
        )}

        {/* ========================================================================= */}
        {/* VIEW 5: GENERIC APP VIEW (Manage, Bill, Daily Task, Achievement, OP API)  */}
        {/* ========================================================================= */}
        {currentApp !== 'home' &&
          currentApp !== 'supply' &&
          currentApp !== 'employee' &&
          currentApp !== 'battle_arena' &&
          currentApp !== 'card_exchange' &&
          currentApp !== 'card_social' &&
          currentApp !== 'pokeship' && (
          <div className="flex-1 bg-gradient-to-b from-zinc-900 to-black text-white p-5 rounded-b-2xl overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="text-xl font-black text-cyan-300 uppercase">{currentApp.replace('_', ' ')} APP</span>
              </div>
              <button
                onClick={() => setCurrentApp('home')}
                className="px-3 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-white cursor-pointer"
              >
                Về Trang Chủ
              </button>
            </div>

            {/* App specific content */}
            {currentApp === 'bill' && (
              <div className="space-y-4 max-w-2xl mx-auto">
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex items-center justify-between">
                  <div>
                    <div className="text-xs text-zinc-400 uppercase font-bold">Ví Ngân Sách Cửa Hàng</div>
                    <div className="text-2xl font-black text-emerald-400 mt-1">
                      ${shopState.cash.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-zinc-400 font-bold">Ngày {shopState.currentDay}</div>
                    <div className="text-xs text-amber-300 font-mono">{shopState.inGameHour}:00 Giờ Game</div>
                  </div>
                </div>

                {/* Sàn Thẻ Tax Ledger */}
                <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                    <div className="flex items-center gap-2">
                      <FileCheck className="w-4 h-4 text-sky-400" />
                      <span className="text-sm font-black text-white uppercase">Thuế & Phí Từ Sàn Thẻ TCG (10% Lãi Chốt & 1% Lệnh)</span>
                    </div>
                    <span className="text-[10px] text-zinc-400 font-mono">Tự động quyết toán</span>
                  </div>

                  {(() => {
                    const exchangeState = loadCardExchangeState(activeProfileId);
                    const bills = exchangeState.billTaxRecords || [];
                    if (bills.length === 0) {
                      return (
                        <div className="py-6 text-center text-xs text-zinc-500">
                          Chưa có phát sinh thuế chốt lời từ Sàn Thẻ. Khi bạn bán thẻ có lãi thực tế trên Sàn Thẻ, 10% thuế lợi nhuận sẽ được ghi nhận tại đây!
                        </div>
                      );
                    }
                    return (
                      <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                        {bills.map((bill) => (
                          <div key={bill.id} className="p-2.5 rounded-xl bg-black/40 border border-zinc-800 flex items-center justify-between text-xs">
                            <div>
                              <div className="font-bold text-white">{bill.title}</div>
                              <div className="text-[10px] text-zinc-400">{bill.description}</div>
                              <div className="text-[9px] text-zinc-500 font-mono mt-0.5">Ngày {bill.gameDay} • {bill.gameHour}:00</div>
                            </div>
                            <div className="text-right font-mono">
                              <span className="text-xs font-bold text-amber-400">-${bill.amount.toFixed(2)}</span>
                              <div className="text-[9px] text-emerald-400 font-bold">ĐÃ TRỪ VÍ</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>

                {/* Shop Overhead Bills */}
                <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 space-y-2">
                  <div className="text-xs font-bold text-zinc-400 uppercase">Hóa Đơn Vận Hành Cửa Hàng Định Kỳ</div>
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-black/40 border border-zinc-800 text-xs">
                    <div>
                      <div className="font-bold text-white">Điện Lạnh & Đèn LED Tủ Kính Trưng Bày</div>
                      <div className="text-[10px] text-zinc-400">Tiêu thụ điện năng tủ showcase & điều hòa shop</div>
                    </div>
                    <span className="font-mono text-zinc-300 font-bold">$15.00 / ngày</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-black/40 border border-zinc-800 text-xs">
                    <div>
                      <div className="font-bold text-white">Băng Thông Mạng POS & Sàn Thẻ TCG</div>
                      <div className="text-[10px] text-zinc-400">Đường truyền cáp quang tốc độ cao cập nhật giá nến</div>
                    </div>
                    <span className="font-mono text-zinc-300 font-bold">$5.00 / ngày</span>
                  </div>
                </div>
              </div>
            )}

            {currentApp === 'manage' && (
              <div className="space-y-3">
                <div className="text-xs text-zinc-400">Điều chỉnh biên độ giá bán lẻ cho các sản phẩm tại cửa hàng:</div>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {inventoryPrices.map((item, idx) => (
                    <div key={item.id} className="flex items-center justify-between p-3 rounded-xl bg-zinc-900 border border-zinc-800">
                      <div>
                        <div className="text-xs font-bold text-white">{item.name}</div>
                        <div className="text-[10px] text-zinc-400">Giá nhập sỉ: ${item.wholesaleCost.toFixed(2)}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-zinc-400">$</span>
                        <input
                          type="number"
                          value={item.retailPrice}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 1;
                            const copy = [...inventoryPrices];
                            copy[idx].retailPrice = val;
                            setInventoryPrices(copy);
                            onUpdatePrices(copy);
                          }}
                          className="w-20 bg-black px-2 py-1 rounded text-right font-black text-emerald-400 text-xs border border-zinc-700"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {currentApp === 'achievement' && (
              <div className="space-y-3 max-w-xl mx-auto">
                <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-500/50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🏆</span>
                    <div>
                      <div className="text-xs font-black text-amber-300">Nhà Khai Trương Tiệm TCG</div>
                      <div className="text-[10px] text-zinc-400">Bắt đầu vận hành cửa hàng thẻ bài đầu tiên!</div>
                    </div>
                  </div>
                  <span className="text-xs font-black text-emerald-400 bg-emerald-950 px-2.5 py-1 rounded-full border border-emerald-500/40">
                    ĐÃ ĐẠT
                  </span>
                </div>
              </div>
            )}

            {currentApp === 'daily_task' && (() => {
              const tasks = getDailyTaskProgressList(shopState);
              const doneCount = tasks.filter((t) => t.completed).length;
              return (
                <div className="space-y-4 max-w-2xl mx-auto">
                  <div className="rounded-2xl border border-purple-500/40 bg-purple-950/30 p-4 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="text-sm font-black text-purple-200">
                        NHIỆM VỤ NGÀY {shopState.currentDay} • POKÉSHIP & BÁN HÀNG
                      </div>
                      <div className="text-xs text-zinc-400 mt-0.5">
                        Hoàn thành các mục tiêu trong ngày để nhận thưởng Tiền Mặt + Kinh Nghiệm Nâng Cấp Tiệm!
                      </div>
                    </div>
                    <div className="rounded-xl bg-black/50 border border-purple-400/40 px-3 py-1.5 text-xs font-black text-purple-300">
                      {doneCount}/{tasks.length} Hoàn Thành
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    {tasks.map((task) => {
                      const pct = Math.min(100, Math.round((task.current / Math.max(1, task.target)) * 100));
                      return (
                        <div
                          key={task.id}
                          className={`rounded-2xl border p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                            task.claimed
                              ? 'border-emerald-500/30 bg-emerald-950/15 opacity-75'
                              : task.completed
                                ? 'border-amber-400/70 bg-amber-950/25 shadow-lg'
                                : 'border-zinc-800 bg-zinc-900/75'
                          }`}
                        >
                          <div className="flex-1 min-w-0 space-y-1.5">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-black text-white">{task.title}</span>
                              <span className="rounded-md bg-emerald-500/20 border border-emerald-500/40 px-2 py-0.5 text-[10px] font-black text-emerald-300">
                                +${task.rewardCash} • +{task.rewardExp} XP
                              </span>
                            </div>
                            <p className="text-xs text-zinc-400">{task.description}</p>
                            <div className="flex items-center gap-2.5">
                              <div className="flex-1 h-2 rounded-full bg-zinc-800 overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-300 ${
                                    task.completed ? 'bg-emerald-400' : 'bg-purple-500'
                                  }`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className="text-[11px] font-mono font-bold text-zinc-300 tabular-nums shrink-0">
                                {task.current}/{task.target}
                              </span>
                            </div>
                          </div>

                          <div className="shrink-0">
                            {task.claimed ? (
                              <span className="inline-flex items-center gap-1 rounded-xl border border-emerald-500/40 bg-emerald-950/60 px-3 py-1.5 text-xs font-black text-emerald-300">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                <span>ĐÃ NHẬN</span>
                              </span>
                            ) : task.completed ? (
                              <button
                                type="button"
                                onClick={() => {
                                  soundManager.playCashRegister();
                                  onClaimDailyTask?.(task.id);
                                }}
                                className="rounded-xl bg-gradient-to-r from-amber-400 to-emerald-400 hover:from-amber-300 hover:to-emerald-300 px-4 py-2 text-xs font-black text-black shadow-lg cursor-pointer transition"
                              >
                                Nhận Thưởng
                              </button>
                            ) : (
                              <span className="inline-block rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-[11px] font-bold text-zinc-500">
                                Đang Tiến Hành
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {currentApp === 'onepiece_api' && (
              <OnePieceApiAppView onBack={() => setCurrentApp('home')} />
            )}

            {currentApp !== 'manage' &&
              currentApp !== 'bill' &&
              currentApp !== 'daily_task' &&
              currentApp !== 'achievement' &&
              currentApp !== 'onepiece_api' && (
                <div className="py-12 text-center text-zinc-400 text-xs">
                  Ứng dụng {currentApp} đang được kích hoạt và đồng bộ dữ liệu thời gian thực từ cửa hàng!
                </div>
              )}
          </div>
        )}
      </div>
    </div>
  );
};
