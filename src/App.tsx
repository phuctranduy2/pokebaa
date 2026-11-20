/**
 * PokeCard Shop Simulator 3D - Main Application
 * Inspired by TCG Card Shop Simulator (Steam), pokemon-cards-css, and pokemon-rip-sim.
 */

import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { FpsBadge } from './components/FpsBadge';
import {
  ShopSceneManager,
  InteractiveShopStation,
  ShopStationType,
  InteractivePackItem,
  InteractiveBoxItem,
  PlayerMotorbikeHudState,
  GraphicsQualityPreset,
  loadSavedGraphicsQuality,
} from './game/ShopScene';
import {
  ShopState,
  ShopCustomer,
  createInitialShopState,
  generateCustomer,
  PokemonCard,
  InventoryItem,
  BOOSTER_SETS,
  ALL_UNIQUE_BOOSTER_SETS,
  ALL_COLLECTOR_BOXES,
  ALL_GAMESTOP_MYSTERY_SETS,
  GAMESTOP_MYSTERY_SETS,
  BoosterSetInfo,
  COLLECTOR_MAX_BOXES_PER_SHELF,
  COLLECTOR_BOX_SETS,
  getBoosterSet,
  GACHA_PACK_TIERS,
  rollGachaPack,
  GradedSlab,
  placeCardInDisplaySlots,
  placeOpCardInDisplaySlots,
  getUnlockedSetsForLevel,
  POKEMON_CARDS_DB,
  isGameStopMysteryProduct,
  rollGameStopMysteryBox,
  GameStopMysteryBoxResult,
  DeliveryParcel,
  getXpToNextLevel,
  applyExpGain,
  calculatePackOpenExp,
  PRODUCT_LICENSES,
  hasProductLicense,
  ProductLicense,
  getStockedStationIds,
  pickItemFromStationForCustomer,
  releaseCustomerReservedItems,
  ShopShelfStationId,
  SHELF_UNLOCKS,
  STARTER_UNLOCKED_SHELVES,
  isShelfUnlocked,
  canStockProductOnUnlockedShelves,
  ALL_ONEPIECE_BOOSTER_SETS,
  ALL_ONEPIECE_COLLECTOR_BOXES,
  ALL_ONEPIECE_BOUNTY_SETS,
  OP_GACHA_PACK_TIERS,
  ONEPIECE_SHELF_UNLOCKS,
  isOnePieceProductId,
  isOnePieceBountyProduct,
  rollOnePieceBountyBox,
  rollOnePieceGachaPack,
  GRADING_SHOP_UNLOCK_LEVEL,
  GRADING_FEE_PER_CARD,
  GRADING_CLEANING_FEE,
  CRACK_REGRADE_FEE,
  SLAB_GUARD_FEE,
  GRADING_RECEPTIONIST_WAGE,
  GRADING_SPECIALIST_WAGE,
  MAX_GRADING_SPECIALISTS,
  GRADING_SERVICE_TIERS,
  GradingCompany,
  GradingServiceTierId,
  GradingJob,
  CustomerGradingOrder,
  OwnedGradedSlabEntry,
  SlabGuardColor,
  SlabAuctionLot,
  AuctionConsignmentOffer,
  WalkInBuybackOffer,
  VipSlabOrder,
  DAILY_MARKET_TRENDS,
  pickDailyMarketTrend,
  getGradingSpeedStats,
  advanceGradingQueue,
  generateCustomerGradingOrder,
  advanceCustomerGradingOrders,
  recordGradedSlabIntoStats,
  crackAndRegradeSlab,
  startSlabAuction,
  advanceSlabAuctions,
  settleSlabAuction,
  generateWalkInBuybackOffer,
  generateVipSlabOrder,
  isStaffWorkingHours,
  OFFICE_STAFF_WAGE,
  AUCTIONEER_WAGE,
  AUCTION_HOST_WAGE,
  LIVE_STREAMER_WAGE,
  LIVE_STUDIO_BUILD_COST,
  LIVE_STUDIO_BUILD_LEVEL,
  AUCTION_BROKER_COMMISSION_RATE,
  StaffRole,
  getAuctionShowroomSchedule,
  createConsignmentAuctionLot,
  generateAuctionConsignmentOffer,
  startAuctionFromConsignmentOffer,
  placeUserBidOnAuctionLot,
  getStaffUnlockLevel,
  pickNextAutoWholesaleOrder,
  isCollectorBoxProduct,
  isOnePieceCollectorProduct,
  getSlabMarketValuation,
} from './game/pokemonShopLogic';
import { soundManager } from './game/audio';
import { ShopTitleScreen } from './components/ShopTitleScreen';
import { ShopSettingsModal } from './components/ShopSettingsModal';
import { shopProfileManager, ShopPlayerProfile } from './game/shopProfileManager';
import { PackOpeningModal } from './components/PackOpeningModal';
import { BoxOpeningModal } from './components/BoxOpeningModal';
import { GameStopMysteryModal } from './components/GameStopMysteryModal';
import { CashierCheckoutModal } from './components/CashierCheckoutModal';
import { TabletModal, TabletAppId, TabletSupplySubTab } from './components/TabletModal';
import { GachaModal } from './components/GachaModal';
import { ShowcaseModal } from './components/ShowcaseModal';
import { CardBinderModal } from './components/CardBinderModal';
import { ShelfManagementModal } from './components/ShelfManagementModal';
import { InventoryModal } from './components/InventoryModal';
import { CharacterSelectorModal } from './components/CharacterSelectorModal';
import {
  type PlayerCharacterId,
  getPlayerCharacterDef,
  loadSavedPlayerCharacterId,
  savePlayerCharacterId,
} from './game/PlayerCharacterCatalog';
import { GradedSlabCard } from './components/GradedSlabCard';
import { GradingShopModal, GradingModalTab, RawCardCandidate } from './components/GradingShopModal';
import { CityEmpireModal, CityEmpireTab } from './components/CityEmpireModal';
import { PokeLiveAppModal, LiveSessionCompletionPayload } from './components/PokeLiveAppModal';
import { BattleArenaModal } from './components/BattleArenaModal';
import { TouchJoystick } from './components/TouchJoystick';
import { PhoDiBoMixcloudPlayer } from './components/PhoDiBoMixcloudPlayer';
import { CityMinimapHud, ActiveWaypoint } from './components/CityMinimapHud';
import { CITY_POIS, type MinimapSnapshot } from './game/cityMapData';
import {
  COUNTERFEIT_SCAN_FEE,
  FAKE_REPORT_BOUNTY,
  LUXURY_ASSETS_CATALOG,
  LivePackCardOutcome,
  LiveStreamRuntimeState,
  OwnedLiveBoosterBox,
  RESTORE_CARD_FEE,
  SATELLITE_KIOSK_CATALOG,
  SHOP_SECURITY_TIERS,
  TOURNAMENT_TIERS,
  TournamentFormat,
  TournamentTierId,
  advanceTournamentRound,
  attemptCityHuntHaggle,
  checkLiveBreakPrerequisites,
  consumeLiveBoxFromInventory,
  createInitialKiosksState,
  createInitialLiveStreamRuntime,
  createLiveStreamSlots,
  createTournamentBracket,
  executeSinglePackLiveRip,
  generateCityHuntSpots,
  getLiveBreakSlotPriceBounds,
  getLuxuryAssetBuffs,
  getMarketPulseMultiplierForCard,
  getMasterSetMilestoneKey,
  getMasterSetMilestoneReward,
  getMasterSetWholesaleDiscount,
  getTrophyBuffs,
  pickAutoLiveBoosterBox,
  restoreCardCondition,
  rollDailyMarketPulses,
  rollSecurityAlertEvent,
  rollTournamentBonusReward,
  scanCardCounterfeitCheck,
  shouldAutoStartHourlyLiveSession,
  tickLiveWaitingRoom,
  tickSatelliteKiosks,
} from './game/shopExpansionSystems';
import {
  acceptDeliveryOrder,
  cancelActiveDeliveryMission,
  canAcceptDeliveryOrder,
  claimDailyTaskReward,
  completeCurrentDeliveryStop,
  createInitialDailyStats,
  createInitialDeliveryState,
  DeliveryOrder,
  generateDeliveryOrders,
  getActiveDeliveryStop,
  hasDeliverableShopStock,
} from './game/cardDeliverySystem';
import {
  Store,
  DollarSign,
  Package,
  Sparkles,
  CreditCard,
  BookOpen,
  Volume2,
  VolumeX,
  Eye,
  Pause,
  Play,
  Users,
  Trophy,
  CheckCircle2,
  Zap,
  ShoppingBag,
  ScanLine,
  Sparkle,
  Moon,
  Sun,
  Clock,
  ArrowRight,
  UserCog,
  Lightbulb,
  Bike,
  Gauge,
  MapPin,
  Timer,
  Crown,
  ShieldAlert,
  AlertTriangle,
  TrendingUp,
  Award,
  BarChart3,
  Wallet,
  ShieldCheck,
} from 'lucide-react';
import {
  advanceWeatherScheduleMinute,
  createInitialWeatherSchedule,
  resolveWeatherModeFromUrl,
  rollNewDayWeatherSchedule,
  type WeatherScheduleState,
} from './game/WeatherSystem';
import confetti from 'canvas-confetti';

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const sceneManagerRef = useRef<ShopSceneManager | null>(null);

  // Active Player Profile & Shop Database
  const [activeProfile, setActiveProfile] = useState<ShopPlayerProfile>(() =>
    shopProfileManager.getActiveProfile()
  );
  const [settingsModalOpen, setSettingsModalOpen] = useState<boolean>(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState<'profile' | 'switch' | 'history' | 'audio'>('profile');

  // App & Game State
  const [gameState, setGameState] = useState<'title' | 'playing' | 'paused'>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('autostart') === '1') return 'playing';
    }
    return 'title';
  });
  const [shopState, setShopState] = useState<ShopState>(() => shopProfileManager.getActiveProfile().shopState);

  const [activeStation, setActiveStation] = useState<InteractiveShopStation | null>(null);
  const [openModal, setOpenModal] = useState<ShopStationType | 'grading_shop' | 'character_select' | null>(null);
  const [tabletInitialApp, setTabletInitialApp] = useState<TabletAppId>('home');
  const [tabletInitialItemsSubTab, setTabletInitialItemsSubTab] = useState<TabletSupplySubTab>('cardpack');
  const [cityEmpireOpen, setCityEmpireOpen] = useState<boolean>(false);
  const [cityEmpireInitialTab, setCityEmpireInitialTab] = useState<CityEmpireTab>('luxury_kiosk');
  const [pokeLiveOpen, setPokeLiveOpen] = useState<boolean>(false);
  const pokeLiveOpenRef = useRef<boolean>(false);
  pokeLiveOpenRef.current = pokeLiveOpen;
  const [pokeLiveViewingTikTok, setPokeLiveViewingTikTok] = useState<boolean>(false);
  const pokeLiveViewingTikTokRef = useRef<boolean>(false);
  pokeLiveViewingTikTokRef.current = pokeLiveViewingTikTok;
  const [liveRuntime, setLiveRuntime] = useState<LiveStreamRuntimeState>(() =>
    createInitialLiveStreamRuntime(true)
  );
  const liveRuntimeRef = useRef<LiveStreamRuntimeState>(liveRuntime);
  liveRuntimeRef.current = liveRuntime;
  const liveAutoBeginTimerRef = useRef<number | null>(null);
  const liveFinalizeTimerRef = useRef<number | null>(null);

  const livePrereqs = checkLiveBreakPrerequisites(shopState);
  const isLiveStudioOnAir =
    liveRuntime.phase === 'streaming_selling' ||
    liveRuntime.phase === 'ripping' ||
    (pokeLiveOpen &&
      pokeLiveViewingTikTok &&
      livePrereqs.hasStudioRoom &&
      livePrereqs.hasStreamerOnShift);

  const [battleArenaOpen, setBattleArenaOpen] = useState<boolean>(false);
  const [empireWaypoint, setEmpireWaypoint] = useState<ActiveWaypoint | null>(null);
  const [nearPoiPrompt, setNearPoiPrompt] = useState<{
    id: string;
    kind: 'hunt' | 'luxury' | 'kiosk_collect' | 'catch_thief';
    badgeLabel?: string;
    priceLabel?: string;
    title: string;
    subtitle: string;
    spotId?: string;
    kioskId?: 'aeon_kiosk' | 'landmark_kiosk';
  } | null>(null);
  const [dismissedPoiPromptId, setDismissedPoiPromptId] = useState<string | null>(null);
  const nearPoiPromptRef = useRef(nearPoiPrompt);
  nearPoiPromptRef.current = nearPoiPrompt;
  const restoredBuybackBonusRef = useRef<Record<string, number>>({});
  const securitySpawnMsRef = useRef<number>(25000);
  const handleCatchShoplifterRef = useRef<() => void>(() => {});
  const [cameraMode, setCameraMode] = useState<'first' | 'third'>('first');
  const [playerCharacterId, setPlayerCharacterId] = useState<PlayerCharacterId>(() =>
    loadSavedPlayerCharacterId()
  );
  const [graphicsQuality, setGraphicsQuality] = useState<GraphicsQualityPreset>(() =>
    loadSavedGraphicsQuality()
  );
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [inToxicZone, setInToxicZone] = useState<boolean>(false);
  const [inKhoiZone, setInKhoiZone] = useState<boolean>(false);
  const [inFourUZone, setInFourUZone] = useState<boolean>(false);
  const [inNewDtvZone, setInNewDtvZone] = useState<boolean>(false);
  const [isTouchDevice, setIsTouchDevice] = useState<boolean>(false);
  const [weatherSchedule, setWeatherSchedule] = useState<WeatherScheduleState>(() => {
    const base = createInitialWeatherSchedule();
    if (typeof window !== 'undefined') {
      const { forcedWeather } = resolveWeatherModeFromUrl(window.location.search);
      if (forcedWeather) {
        return {
          ...base,
          weatherMode: forcedWeather,
          rainIntensityLevel: 1.12,
        };
      }
    }
    return base;
  });
  const weatherScheduleRef = useRef<WeatherScheduleState>(weatherSchedule);
  weatherScheduleRef.current = weatherSchedule;

  // TCG Card Shop Simulator Viewmodel: Held Pack & Held Box in Hands
  const [heldPack, setHeldPack] = useState<InteractivePackItem | null>(null);
  const [heldBox, setHeldBox] = useState<InteractiveBoxItem | null>(null);
  const [selectedOpeningSetId, setSelectedOpeningSetId] = useState<string>('pokemon30thCommon');
  const [shelfPickerTab, setShelfPickerTab] = useState<'packs' | 'boxes'>('boxes');
  const [shelfMenuOpen, setShelfMenuOpen] = useState<
    | 'gacha'
    | 'collector_shelves'
    | 'gamestop_shelf'
    | 'shelves'
    | 'op_shelves'
    | 'op_collector_shelves'
    | 'op_bounty_shelf'
    | 'op_gacha'
    | null
  >(null);
  const [showControlsGuide, setShowControlsGuide] = useState<boolean>(true);
  const [currentFloor, setCurrentFloor] = useState<1 | 2>(1);
  const [motorbikeState, setMotorbikeState] = useState<PlayerMotorbikeHudState | null>(null);
  const [isFullMapOpen, setIsFullMapOpen] = useState<boolean>(false);
  const [nearDeliveryTarget, setNearDeliveryTarget] = useState<boolean>(false);
  const [deliveryNowMs, setDeliveryNowMs] = useState<number>(() => Date.now());
  const nearDeliveryTargetRef = useRef<boolean>(false);
  nearDeliveryTargetRef.current = nearDeliveryTarget;
  const minimapPoseRef = useRef<MinimapSnapshot>({
    x: 0,
    y: 0,
    z: 0,
    yaw: 0,
    isRidingMotorbike: false,
    speedKmh: 0,
    currentFloor: 1,
    inGameHour: 12,
    hasParkedBike: true,
    parkedBikeX: -8,
    parkedBikeZ: 24,
    busX: null,
    busZ: null,
    buses: [],
  });
  const minimapListenersRef = useRef<Set<() => void>>(new Set());
  const subscribeMinimapPose = useCallback((cb: () => void) => {
    minimapListenersRef.current.add(cb);
    return () => {
      minimapListenersRef.current.delete(cb);
    };
  }, []);

  // Auto-reset shelf picker menu if player walks away
  useEffect(() => {
    if (
      !activeStation ||
      ![
        'gacha',
        'collector_shelves',
        'gamestop_shelf',
        'shelves',
        'op_shelves',
        'op_collector_shelves',
        'op_bounty_shelf',
        'op_gacha',
      ].includes(activeStation.id)
    ) {
      setShelfMenuOpen(null);
    }
  }, [activeStation]);

  // Gacha Pull Reveal Modal
  const [gachaRevealResult, setGachaRevealResult] = useState<{
    packTier: any;
    card: PokemonCard;
    payout: number;
    roiPct: number;
    isSlab?: boolean;
    slab?: GradedSlab;
    rawPrice?: number;
    gradeMultiplier?: number;
  } | null>(null);

  // GameStop Pokémon Mystery Box Unboxing State
  const [gameStopMysteryResult, setGameStopMysteryResult] = useState<GameStopMysteryBoxResult | null>(null);

  // Direct POS cashier state (per-unit item scanning synced with 3D counter)
  const [isPosScanned, setIsPosScanned] = useState<boolean>(false);
  const [posScannedCounts, setPosScannedCounts] = useState<Record<string, number>>({});
  const posScannedCountsRef = useRef<Record<string, number>>({});
  posScannedCountsRef.current = posScannedCounts;
  const handleScanOneCounterItemRef = useRef<((itemId?: string, customerOverride?: ShopCustomer | null) => void) | null>(null);

  // Day / Night & End-of-Day Summary Modal
  const [showDaySummary, setShowDaySummary] = useState<boolean>(false);
  const [toastNotification, setToastNotification] = useState<{ message: string; type?: string } | null>(null);
  const [incomingOrderNotice, setIncomingOrderNotice] = useState<DeliveryOrder | null>(null);
  const [lightSwitchHover, setLightSwitchHover] = useState<{ hovered: boolean; isOn: boolean } | null>(null);
  const hadDeliverableStockRef = useRef<boolean>(hasDeliverableShopStock(shopState));
  const incomingOrderDismissedRef = useRef<boolean>(false);
  const incomingOrderNoticeRef = useRef<DeliveryOrder | null>(null);
  incomingOrderNoticeRef.current = incomingOrderNotice;

  // Auto-dismiss toast
  useEffect(() => {
    if (toastNotification) {
      const t = setTimeout(() => setToastNotification(null), 4000);
      return () => clearTimeout(t);
    }
  }, [toastNotification]);

  // Active Customers in Store
  const [customers, setCustomers] = useState<ShopCustomer[]>([]);
  const [queuingCustomer, setQueuingCustomer] = useState<ShopCustomer | null>(null);
  const queuingCustomerRef = useRef<ShopCustomer | null>(null);
  queuingCustomerRef.current = queuingCustomer;
  const handleRestockerUnboxDeliveryRef = useRef<() => void>(() => {});
  const handleCheckoutCompleteRef = useRef<((customer: ShopCustomer, totalRevenue: number) => void) | null>(null);
  const shopStateRef = useRef<ShopState>(shopState);
  shopStateRef.current = shopState;
  const customersRef = useRef<ShopCustomer[]>(customers);
  customersRef.current = customers;
  const paidCustomerIdsRef = useRef<Set<string>>(new Set());
  const [gradingModalInitialTab, setGradingModalInitialTab] = useState<GradingModalTab>('submit');
  const gradingCustomerSpawnMsRef = useRef<number>(12000);
  const gradingBuybackSpawnMsRef = useRef<number>(15000);
  const gradingVipOrderSpawnMsRef = useRef<number>(24000);
  const gradingConsignmentSpawnMsRef = useRef<number>(12000);
  const prevGradingJobStatusRef = useRef<Record<string, GradingJob['status']>>({});
  const prevCustomerOrderStatusRef = useRef<Record<string, CustomerGradingOrder['status']>>({});
  const prevAuctionStatusRef = useRef<Record<string, SlabAuctionLot['status']>>({});
  const gradingEffectProfileIdRef = useRef<string | null>(null);

  // Detect touch
  useEffect(() => {
    setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  // Update body dataset state for test verification
  useEffect(() => {
    document.body.dataset.state = gameState;
  }, [gameState]);

  // Trigger celebration fanfare and confetti when gacha pack is revealed
  useEffect(() => {
    if (gachaRevealResult) {
      soundManager.playRarePullFanfare();
      confetti({
        particleCount: 160,
        spread: 90,
        origin: { y: 0.5 },
        colors: ['#ffd700', '#f59e0b', '#38bdf8', '#ec4899', '#ffffff'],
      });
    }
  }, [gachaRevealResult]);

  const lastSavedClockAtRef = useRef<number>(Date.now());
  const pendingClockSaveTimerRef = useRef<number | null>(null);
  const prevNonClockSnapshotRef = useRef<ShopState | null>(null);

  // Subscribe to active player profile updates & persist shopState into active account database
  useEffect(() => {
    const unsub = shopProfileManager.subscribe((prof) => {
      setActiveProfile((prev) => {
        if (
          prev.id === prof.id &&
          prev.name === prof.name &&
          prev.pin === prof.pin &&
          prev.avatarColor === prof.avatarColor &&
          prev.history === prof.history &&
          prev.shopState.shopName === prof.shopState.shopName
        ) {
          return prev;
        }
        return prof;
      });
    });
    return unsub;
  }, []);

  useEffect(() => {
    const flushSave = () => {
      if (pendingClockSaveTimerRef.current !== null) {
        window.clearTimeout(pendingClockSaveTimerRef.current);
        pendingClockSaveTimerRef.current = null;
      }
      shopProfileManager.saveActiveShopState(shopStateRef.current);
      lastSavedClockAtRef.current = Date.now();
    };
    window.addEventListener('beforeunload', flushSave);
    window.addEventListener('pagehide', flushSave);
    return () => {
      window.removeEventListener('beforeunload', flushSave);
      window.removeEventListener('pagehide', flushSave);
      if (pendingClockSaveTimerRef.current !== null) {
        window.clearTimeout(pendingClockSaveTimerRef.current);
        pendingClockSaveTimerRef.current = null;
      }
      shopProfileManager.saveActiveShopState(shopStateRef.current);
    };
  }, []);

  useEffect(() => {
    const prev = prevNonClockSnapshotRef.current;
    const prevCompletedCount = (prev?.gradingJobs || []).filter((j) => j.status === 'completed').length;
    const currCompletedCount = (shopState.gradingJobs || []).filter((j) => j.status === 'completed').length;
    const isGameplayChange =
      !prev ||
      prev.cash !== shopState.cash ||
      prev.currentDay !== shopState.currentDay ||
      prev.isShopOpen !== shopState.isShopOpen ||
      prev.storeLevel !== shopState.storeLevel ||
      prev.storeExp !== shopState.storeExp ||
      prev.shopName !== shopState.shopName ||
      prev.inventory !== shopState.inventory ||
      prev.pendingDeliveries !== shopState.pendingDeliveries ||
      prev.showcaseCards !== shopState.showcaseCards ||
      prev.shelfCards !== shopState.shelfCards ||
      prev.opShowcaseCards !== shopState.opShowcaseCards ||
      prev.opShelfCards !== shopState.opShelfCards ||
      prev.binderCards !== shopState.binderCards ||
      prev.unlockedShelves !== shopState.unlockedShelves ||
      prev.unlockedSets !== shopState.unlockedSets ||
      prev.purchasedLicenses !== shopState.purchasedLicenses ||
      prev.hiredStaff !== shopState.hiredStaff ||
      prev.carriedParcel !== shopState.carriedParcel ||
      prev.isCarriedBoxOpen !== shopState.isCarriedBoxOpen ||
      prev.todayStats !== shopState.todayStats ||
      prev.tableRentalPricePerHour !== shopState.tableRentalPricePerHour ||
      prev.tablePlayersCount !== shopState.tablePlayersCount ||
      prev.totalTableRentalEarnings !== shopState.totalTableRentalEarnings ||
      prev.packsOpenedCount !== shopState.packsOpenedCount ||
      prev.reputation !== shopState.reputation ||
      (prev.gradingJobs?.length || 0) !== (shopState.gradingJobs?.length || 0) ||
      prevCompletedCount !== currCompletedCount ||
      prev.gradedSlabs !== shopState.gradedSlabs ||
      prev.deliveryState !== shopState.deliveryState ||
      prev.trophyCollection !== shopState.trophyCollection ||
      prev.ownedLuxuryAssets !== shopState.ownedLuxuryAssets ||
      prev.satelliteKiosks !== shopState.satelliteKiosks ||
      prev.claimedMasterSetMilestones !== shopState.claimedMasterSetMilestones ||
      prev.cityHuntSpots !== shopState.cityHuntSpots ||
      prev.marketPulseNews !== shopState.marketPulseNews ||
      prev.securityLevel !== shopState.securityLevel ||
      prev.activeTournament !== shopState.activeTournament ||
      prev.liveBreakStats !== shopState.liveBreakStats ||
      prev.liveStudioUnlocked !== shopState.liveStudioUnlocked;

    prevNonClockSnapshotRef.current = shopState;

    const now = Date.now();
    if (isGameplayChange || now - lastSavedClockAtRef.current >= 10000) {
      if (pendingClockSaveTimerRef.current !== null) {
        window.clearTimeout(pendingClockSaveTimerRef.current);
        pendingClockSaveTimerRef.current = null;
      }
      shopProfileManager.saveActiveShopState(shopState);
      lastSavedClockAtRef.current = now;
    } else if (pendingClockSaveTimerRef.current === null) {
      pendingClockSaveTimerRef.current = window.setTimeout(() => {
        pendingClockSaveTimerRef.current = null;
        shopProfileManager.saveActiveShopState(shopStateRef.current);
        lastSavedClockAtRef.current = Date.now();
      }, 10000);
    }
  }, [shopState]);

  // Mount 3D Scene
  useEffect(() => {
    if (!canvasMountRef.current) return;

    const manager = new ShopSceneManager(canvasMountRef.current);
    sceneManagerRef.current = manager;
    manager.setWeatherMode(
      weatherScheduleRef.current.weatherMode,
      weatherScheduleRef.current.rainIntensityLevel,
      true
    );

    manager.onNearbyStationChange = (station) => {
      setActiveStation(station);
    };

    manager.onNearbyDeliveryTargetChange = (near) => {
      setNearDeliveryTarget(near);
    };

    manager.onCameraModeChange = (mode) => {
      setCameraMode(mode);
    };

    manager.onFloorChange = (floor) => {
      setCurrentFloor(floor);
    };

    manager.onMotorbikeStateChange = (state) => {
      setMotorbikeState(state);
    };
    manager.emitMotorbikeHudState(true);

    manager.onMinimapUpdate = (snap) => {
      minimapPoseRef.current = snap;
      minimapListenersRef.current.forEach((cb) => cb());
    };
    minimapPoseRef.current = { ...manager.getMinimapSnapshot() };

    manager.onPackPickedUp = (pack) => {
      setShopState((prev) => {
        const item = prev.inventory.find(
          (i) =>
            i.productId === `${pack.id}_pack` ||
            i.productId === pack.id ||
            i.productId === `gacha_${pack.id}`
        );
        const count = item?.shelvedQuantity || 0;
        if (count <= 0) {
          soundManager.playSelectSound();
          setToastNotification({
            type: 'warning',
            message: `⚠️ Kệ này đã hết hàng! Hãy mở Tablet (Tab) để đặt hàng về tiệm.`,
          });
          return prev;
        }

        soundManager.playSelectSound();
        const updatedInv = prev.inventory.map((invItem) =>
          invItem === item
            ? { ...invItem, shelvedQuantity: Math.max(0, (invItem.shelvedQuantity || 0) - 1) }
            : invItem
        );
        manager.syncAllShelves(updatedInv);
        setHeldPack(pack);
        return { ...prev, inventory: updatedInv };
      });
    };

    manager.onBoxPickedUp = (box) => {
      setShopState((prev) => {
        const item = prev.inventory.find(
          (i) => i.productId === `${box.id}_box` || i.productId === box.id
        );
        const count = item?.shelvedQuantity || 0;
        if (count <= 0) {
          soundManager.playSelectSound();
          setToastNotification({
            type: 'warning',
            message: `⚠️ Kệ này đang trống, chưa có hộp ${box.name}! Hãy mở Tablet (Tab) để đặt hàng về.`,
          });
          return prev;
        }

        soundManager.playSelectSound();
        const updatedInv = prev.inventory.map((invItem) =>
          invItem === item
            ? { ...invItem, shelvedQuantity: Math.max(0, (invItem.shelvedQuantity || 0) - 1) }
            : invItem
        );
        manager.syncAllShelves(updatedInv);
        setHeldBox(box);
        return { ...prev, inventory: updatedInv };
      });
    };

    manager.onMonitorClick = () => {
      soundManager.playSelectSound();
      setOpenModal('register');
    };

    manager.onCounterItemClick = (itemId: string) => {
      handleScanOneCounterItemRef.current?.(itemId);
    };

    manager.onLightSwitchHover = (hovered, isOn) => {
      setLightSwitchHover(hovered ? { hovered: true, isOn } : null);
    };

    manager.onShopLightsToggled = (isOn) => {
      soundManager.playSelectSound();
      setToastNotification({
        type: 'info',
        message: isOn
          ? '💡 Đã BẬT đèn trong shop, đèn bảng hiệu & 4 bóng rọi!'
          : '🌙 Đã TẮT đèn trong shop, đèn bảng hiệu & 4 bóng rọi.',
      });
    };

    manager.getStockedStations = () => getStockedStationIds(shopStateRef.current);

    manager.onCustomerInspectStation = (customerId: string, stationId: string) => {
      const cust = customersRef.current.find((c) => c.id === customerId);
      if (!cust) return { picked: null, reason: 'empty' };

      const result = pickItemFromStationForCustomer(
        shopStateRef.current,
        stationId as ShopShelfStationId,
        cust
      );

      if (result.picked) {
        const picked = result.picked;
        shopStateRef.current = result.updatedState;
        if (soundManager.isShopWorldAudioAllowed()) soundManager.playCardSlide();

        setShopState((prev) => {
          if (picked.item.type === 'single') {
            const parts = picked.item.id.split('_');
            const slotIdx = parseInt(parts[parts.length - 1], 10);
            if (picked.item.id.startsWith('shelf_')) {
              const nextShelf = [...(prev.shelfCards || [])];
              if (!isNaN(slotIdx) && nextShelf[slotIdx]) {
                nextShelf[slotIdx] = { ...nextShelf[slotIdx], isReserved: true };
              }
              return { ...prev, shelfCards: nextShelf };
            } else {
              const nextShowcase = [...prev.showcaseCards];
              if (!isNaN(slotIdx) && nextShowcase[slotIdx]) {
                nextShowcase[slotIdx] = { ...nextShowcase[slotIdx], isReserved: true };
              }
              return { ...prev, showcaseCards: nextShowcase };
            }
          }

          const nextInv = prev.inventory.map((inv) => {
            if (inv.id === picked.item.id || inv.productId === picked.item.productId) {
              const clampedShelved = Math.min(inv.quantity || 0, inv.shelvedQuantity || 0);
              return {
                ...inv,
                shelvedQuantity: Math.max(0, clampedShelved - picked.count),
              };
            }
            return inv;
          });
          return { ...prev, inventory: nextInv };
        });

        setCustomers((prev) =>
          prev.map((c) => {
            if (c.id !== customerId) return c;
            const nextBasket = [...c.basket];
            const existingIdx = nextBasket.findIndex((b) => b.item.id === picked.item.id);
            if (existingIdx !== -1 && picked.item.type !== 'single') {
              nextBasket[existingIdx] = {
                ...nextBasket[existingIdx],
                count: nextBasket[existingIdx].count + picked.count,
              };
            } else {
              nextBasket.push(picked);
            }
            return {
              ...c,
              basket: nextBasket,
              budget: Math.max(0, c.budget - picked.unitPrice * picked.count),
              speechBubble: `🧺 Đã bỏ ${picked.item.name} vào giỏ!`,
            };
          })
        );

        manager.syncAllShelves(result.updatedState.inventory, result.updatedState.unlockedShelves);
        manager.syncShowcaseCards(result.updatedState.showcaseCards);
        manager.syncShelfCards(result.updatedState.shelfCards || [], result.updatedState.unlockedShelves);
      }

      return { picked: result.picked, reason: result.reason };
    };

    // Initial sync
    manager.setDeliveryParcelsCount(
      shopState.pendingDeliveries.length,
      shopState.pendingDeliveries[0]?.name,
      shopState.pendingDeliveries[0]?.productId,
      true
    );
    manager.setDayNightMode(shopState.isShopOpen, shopState.inGameHour, shopState.inGameMinute);
    if (shopState.carriedParcel) {
      manager.setCarriedParcel(shopState.carriedParcel, shopState.isCarriedBoxOpen);
    }

    // Synchronize 3D lock panels & LEDs across all shelves
    manager.syncUnlockedShelves(shopState.unlockedShelves || STARTER_UNLOCKED_SHELVES);
    // Synchronize 10 real cards on the 3D table with real artworks and price tags
    manager.syncShowcaseCards(shopState.showcaseCards);
    // Synchronize 18 real cards on the 3D wall shelves with real artworks and price tags
    manager.syncShelfCards(shopState.shelfCards || [], shopState.unlockedShelves);
    // Synchronize Floor 2 One Piece showcase & display shelves
    manager.syncOpShowcaseCards(shopState.opShowcaseCards || []);
    manager.syncOpShelfCards(shopState.opShelfCards || [], shopState.unlockedShelves);
    // Synchronize ALL retail, VIP collector, GameStop, and Gacha shelves cleanly from inventory
    manager.syncAllShelves(shopState.inventory, shopState.unlockedShelves);
    // Synchronize hired staff & Level 25 Grading Lab lock barrier, staff & Auction Showroom
    manager.syncHiredStaff(shopState.hiredStaff || { cashier: 1, restocker: 0 });
    manager.syncLiveStudioState({
      unlocked: Boolean(shopState.liveStudioUnlocked),
      streamerHired: (shopState.hiredStaff?.liveStreamer || 0) > 0,
      isOnAir: false,
    });
    manager.syncSecurityState({
      securityLevel: shopState.securityLevel || 0,
      activeAlert: shopState.activeSecurityAlert || null,
      isShopOpen: shopState.isShopOpen,
    });
    manager.syncGradingShopState({
      unlocked: shopState.storeLevel >= GRADING_SHOP_UNLOCK_LEVEL,
      receptionistCount: shopState.hiredStaff?.gradingReceptionist || 0,
      specialistsCount: shopState.hiredStaff?.gradingSpecialists || 0,
      auctioneerCount: shopState.hiredStaff?.auctioneer || 0,
      auctionHostCount: shopState.hiredStaff?.auctionHost || 0,
      isGradingActive: (shopState.gradingJobs || []).some((j) => j.status === 'grading'),
      isAuctionLive: (shopState.slabAuctions || []).some((l) => l.status === 'live'),
    });
    const initFeaturedLot =
      (shopState.slabAuctions || []).find((l) => l.status === 'live') ||
      (shopState.slabAuctions || [])[0] ||
      null;
    manager.syncGradingAuctionBoard(
      initFeaturedLot,
      shopState.activeMarketTrend || pickDailyMarketTrend(shopState.currentDay || 1)
    );

    // Table fee loop callback ($5/hour per seated player) -> 3 XP per match + Trophy bonus
    manager.onTableFeePaid = (amount: number, playersCount: number) => {
      if (soundManager.isShopWorldAudioAllowed()) soundManager.playQuarterDrop();
      setShopState((prev) => {
        const trophyBuffs = getTrophyBuffs(prev.trophyCollection || []);
        const effectiveAmount = Number((amount * (1 + trophyBuffs.tableRentalBonusPct / 100)).toFixed(2));
        const expRes = applyExpGain(prev.storeExp, prev.storeLevel, 3);
        if (expRes.didLevelUp) {
          if (soundManager.isShopWorldAudioAllowed()) soundManager.playLevelUpFanfare();
          confetti({ particleCount: 90, spread: 70, origin: { y: 0.5 } });
        }
        return {
          ...prev,
          cash: prev.cash + effectiveAmount,
          totalRevenue: prev.totalRevenue + effectiveAmount,
          totalTableRentalEarnings: (prev.totalTableRentalEarnings || 0) + effectiveAmount,
          storeExp: expRes.newExp,
          storeLevel: expRes.newLevel,
          storeExpToNext: expRes.newExpToNext,
          unlockedSets: expRes.didLevelUp ? getUnlockedSetsForLevel(expRes.newLevel) : prev.unlockedSets,
        };
      });
    };

    manager.onToxicZoneChanged = (inZone: boolean) => {
      setInToxicZone(inZone);
    };
    manager.onKhoiZoneChanged = (inZone: boolean) => {
      setInKhoiZone(inZone);
    };
    manager.onFourUZoneChanged = (inZone: boolean) => {
      setInFourUZone(inZone);
    };
    manager.onNewDtvZoneChanged = (inZone: boolean) => {
      setInNewDtvZone(inZone);
    };

    // Customer depart & queue callbacks
    manager.onCustomerDeparted = (departedId: string) => {
      const departingCust = customersRef.current.find((c) => c.id === departedId);
      if (departingCust && departingCust.basket.length > 0 && !paidCustomerIdsRef.current.has(departedId)) {
        setShopState((prev) => {
          const restored = releaseCustomerReservedItems(prev, departingCust);
          manager.syncAllShelves(restored.inventory, restored.unlockedShelves);
          manager.syncShowcaseCards(restored.showcaseCards);
          manager.syncShelfCards(restored.shelfCards || [], restored.unlockedShelves);
          return restored;
        });
      }
      paidCustomerIdsRef.current.delete(departedId);
      setCustomers((prev) => prev.filter((c) => c.id !== departedId));
    };

    manager.onCustomerQueueUpdated = (frontCustomerId: string | null) => {
      if (!frontCustomerId) {
        if (queuingCustomerRef.current !== null) {
          queuingCustomerRef.current = null;
          setQueuingCustomer(null);
        }
        return;
      }
      const prev = customersRef.current;
      const front = prev.find(
        (c) => c.id === frontCustomerId && c.status !== 'leaving' && c.basket && c.basket.length > 0
      );
      if (front) {
        if (front.status !== 'queuing') {
          const queuing = { ...front, status: 'queuing' as const };
          queuingCustomerRef.current = queuing;
          setQueuingCustomer(queuing);
          setCustomers((curr) => curr.map((c) => (c.id === frontCustomerId ? queuing : c)));
        } else {
          if (queuingCustomerRef.current?.id !== front.id) {
            queuingCustomerRef.current = front;
            setQueuingCustomer(front);
          }
        }
      } else {
        if (queuingCustomerRef.current !== null) {
          queuingCustomerRef.current = null;
          setQueuingCustomer(null);
        }
      }
    };

    manager.onRestockerUnboxDelivery = () => {
      handleRestockerUnboxDeliveryRef.current?.();
    };

    manager.onCatchSecurityThief = () => {
      handleCatchShoplifterRef.current?.();
    };

    return () => {
      manager.dispose();
      sceneManagerRef.current = null;
    };
  }, []);

  // Sync showcase cards to 3D scene whenever shopState.showcaseCards changes
  useEffect(() => {
    sceneManagerRef.current?.syncShowcaseCards(shopState.showcaseCards);
  }, [shopState.showcaseCards]);

  // Sync 3 display shelves cards to 3D scene whenever shopState.shelfCards changes
  useEffect(() => {
    sceneManagerRef.current?.syncShelfCards(shopState.shelfCards || [], shopState.unlockedShelves);
  }, [shopState.shelfCards]);

  // Sync Floor 2 One Piece showcase & display shelves
  useEffect(() => {
    sceneManagerRef.current?.syncOpShowcaseCards(shopState.opShowcaseCards || []);
  }, [shopState.opShowcaseCards]);

  useEffect(() => {
    sceneManagerRef.current?.syncOpShelfCards(shopState.opShelfCards || [], shopState.unlockedShelves);
  }, [shopState.opShelfCards]);

  // Sync shelves whenever shopState.inventory changes
  useEffect(() => {
    sceneManagerRef.current?.syncAllShelves(shopState.inventory, shopState.unlockedShelves);
  }, [shopState.inventory]);

  // Sync 3D lock panels & shelf visibility whenever shopState.unlockedShelves changes
  useEffect(() => {
    sceneManagerRef.current?.syncUnlockedShelves(shopState.unlockedShelves || STARTER_UNLOCKED_SHELVES);
    sceneManagerRef.current?.syncAllShelves(shopState.inventory, shopState.unlockedShelves);
    sceneManagerRef.current?.syncShelfCards(shopState.shelfCards || [], shopState.unlockedShelves);
    sceneManagerRef.current?.syncOpShelfCards(shopState.opShelfCards || [], shopState.unlockedShelves);
  }, [shopState.unlockedShelves]);

  // Sync hired cashier, restocker, live streamer, and grading lab staff visibility
  useEffect(() => {
    sceneManagerRef.current?.syncHiredStaff(shopState.hiredStaff || { cashier: 1, restocker: 0 });
  }, [shopState.hiredStaff]);

  useEffect(() => {
    sceneManagerRef.current?.syncLiveStudioState({
      unlocked: Boolean(shopState.liveStudioUnlocked),
      streamerHired: (shopState.hiredStaff?.liveStreamer || 0) > 0,
      isOnAir: isLiveStudioOnAir,
    });
  }, [shopState.liveStudioUnlocked, shopState.hiredStaff?.liveStreamer, isLiveStudioOnAir]);

  // Sync 3D Security Gates, CCTV Cameras, Guard NPC & Shoplifter NPC
  useEffect(() => {
    sceneManagerRef.current?.syncSecurityState({
      securityLevel: shopState.securityLevel || 0,
      activeAlert: shopState.activeSecurityAlert || null,
      isShopOpen: shopState.isShopOpen,
    });
  }, [shopState.securityLevel, shopState.activeSecurityAlert, shopState.isShopOpen]);

  // Sync Level 25 Grading Lab lock barrier, NPCs, Auction Showroom & Hall of Grails
  const hasActiveGradingJob =
    (shopState.gradingJobs || []).some((j) => j.status === 'grading') ||
    (shopState.customerGradingOrders || []).some((o) => o.status === 'grading');
  const hasLiveSlabAuction = (shopState.slabAuctions || []).some((l) => l.status === 'live');
  useEffect(() => {
    sceneManagerRef.current?.syncGradingShopState({
      unlocked: shopState.storeLevel >= GRADING_SHOP_UNLOCK_LEVEL,
      receptionistCount: shopState.hiredStaff?.gradingReceptionist || 0,
      specialistsCount: shopState.hiredStaff?.gradingSpecialists || 0,
      auctioneerCount: shopState.hiredStaff?.auctioneer || 0,
      auctionHostCount: shopState.hiredStaff?.auctionHost || 0,
      isGradingActive: hasActiveGradingJob,
      isAuctionLive: hasLiveSlabAuction,
    });
  }, [
    shopState.storeLevel,
    shopState.hiredStaff?.gradingReceptionist,
    shopState.hiredStaff?.gradingSpecialists,
    shopState.hiredStaff?.auctioneer,
    shopState.hiredStaff?.auctionHost,
    hasActiveGradingJob,
    hasLiveSlabAuction,
  ]);

  useEffect(() => {
    const lots = shopState.slabAuctions || [];
    const featuredLot = lots.find((l) => l.status === 'live') || lots[0] || null;
    sceneManagerRef.current?.syncGradingAuctionBoard(
      featuredLot,
      shopState.activeMarketTrend || DAILY_MARKET_TRENDS[0]
    );
  }, [shopState.slabAuctions, shopState.activeMarketTrend]);

  useEffect(() => {
    const combined: Array<{ card: PokemonCard; slab: GradedSlab; value: number }> = [];
    const seenCerts = new Set<string>();
    const pushSlab = (card: PokemonCard, slab: GradedSlab, value: number) => {
      if (seenCerts.has(slab.certNumber)) return;
      seenCerts.add(slab.certNumber);
      combined.push({ card, slab, value });
    };
    (shopState.gradedSlabs || []).forEach((e) => pushSlab(e.card, e.slab, e.gradedPrice));
    (shopState.showcaseCards || []).forEach((s) => {
      if (s && !s.isSold && s.isSlab && s.slab) pushSlab(s.card, s.slab, s.retailPrice);
    });
    (shopState.opShowcaseCards || []).forEach((s) => {
      if (s && !s.isSold && s.isSlab && s.slab) pushSlab(s.card, s.slab, s.retailPrice);
    });
    combined.sort((a, b) => b.value - a.value);
    if (combined.length > 0) {
      sceneManagerRef.current?.syncGradingMuseumSlabs(
        combined.slice(0, 16).map(({ card, slab }) => ({ card, slab }))
      );
    }
  }, [shopState.gradedSlabs, shopState.showcaseCards, shopState.opShowcaseCards]);

  // Sync customers to 3D scene
  useEffect(() => {
    sceneManagerRef.current?.syncCustomers(customers);
  }, [customers]);

  // Reset per-item scan progress whenever front customer changes
  useEffect(() => {
    setPosScannedCounts({});
    setIsPosScanned(false);
  }, [queuingCustomer?.id]);

  // Sync 3D POS monitor, CFD customer display, PIN pad & counter props whenever queue/scan counts change
  useEffect(() => {
    sceneManagerRef.current?.updatePosMonitor(queuingCustomer, isPosScanned, {}, posScannedCounts);
  }, [queuingCustomer, isPosScanned, posScannedCounts]);

  // Sync Delivery Parcels outside on drop zone
  useEffect(() => {
    sceneManagerRef.current?.setDeliveryParcelsCount(
      shopState.pendingDeliveries.length,
      shopState.pendingDeliveries[0]?.productName || shopState.pendingDeliveries[0]?.name,
      shopState.pendingDeliveries[0]?.productId
    );
  }, [shopState.pendingDeliveries]);

  // PokeShip Active Mission & Recipient Sync
  const activeMission = shopState.deliveryState?.activeMission || null;
  const activeDeliveryStop = getActiveDeliveryStop(shopState);

  const minimapExternalWaypoint = useMemo<ActiveWaypoint | null>(() => {
    if (activeDeliveryStop) {
      return {
        id: `pokeship_${activeDeliveryStop.stopId}`,
        name: `${activeDeliveryStop.recipientName} (${activeDeliveryStop.locationName})`,
        x: activeDeliveryStop.x,
        z: activeDeliveryStop.z,
      };
    }
    return empireWaypoint;
  }, [
    activeDeliveryStop?.stopId,
    activeDeliveryStop?.recipientName,
    activeDeliveryStop?.locationName,
    activeDeliveryStop?.x,
    activeDeliveryStop?.z,
    empireWaypoint,
  ]);

  const minimapDeliveryMarker = useMemo(() => {
    if (!activeDeliveryStop) return null;
    return {
      x: activeDeliveryStop.x,
      z: activeDeliveryStop.z,
      label: `${activeDeliveryStop.recipientName} • ${activeDeliveryStop.locationName}`,
      isVip:
        activeMission?.category === 'vip_sniper' ||
        activeMission?.category === 'rush_mystery',
    };
  }, [
    activeDeliveryStop?.x,
    activeDeliveryStop?.z,
    activeDeliveryStop?.recipientName,
    activeDeliveryStop?.locationName,
    activeMission?.category,
  ]);

  const minimapCityHuntMarkers = useMemo(() => {
    return (shopState.cityHuntSpots || [])
      .filter((s) => s.status === 'active')
      .map((s) => ({
        id: s.id,
        x: s.x,
        z: s.z,
        label: `Săn: ${s.card.name} ($${s.askingPrice})`,
      }));
  }, [shopState.cityHuntSpots]);

  useEffect(() => {
    const mgr = sceneManagerRef.current;
    if (!mgr) return;
    if (activeMission && activeDeliveryStop) {
      mgr.setActiveDeliveryTarget({
        x: activeDeliveryStop.x,
        z: activeDeliveryStop.z,
        recipientName: activeDeliveryStop.recipientName,
        locationName: activeDeliveryStop.locationName,
        avatarColor: activeDeliveryStop.recipientAvatarColor,
        category: activeMission.category,
      });
      mgr.setMotorbikeDeliveryCargo(
        true,
        activeMission.category === 'vip_sniper' || activeMission.category === 'multi_route'
      );
    } else {
      mgr.setActiveDeliveryTarget(null);
      mgr.setMotorbikeDeliveryCargo(false, false);
      setNearDeliveryTarget(false);
    }
  }, [
    activeMission?.id,
    activeMission?.currentStopIndex,
    activeMission?.category,
    activeDeliveryStop?.stopId,
  ]);

  useEffect(() => {
    if (!activeMission) return;
    setIncomingOrderNotice(null);
    setDeliveryNowMs(Date.now());
    const timer = window.setInterval(() => {
      setDeliveryNowMs(Date.now());
    }, 1000);
    return () => window.clearInterval(timer);
  }, [activeMission?.id]);

  // Notify top-right when warehouse transitions from empty -> stocked with deliverable items,
  // or on entering play mode with deliverable stock ready (persists until closed/accepted)
  const hasStockForDelivery = hasDeliverableShopStock(shopState);
  useEffect(() => {
    const prevHasStock = hadDeliverableStockRef.current;
    hadDeliverableStockRef.current = hasStockForDelivery;
    if (gameState !== 'playing' || activeMission || !hasStockForDelivery) return;

    if (!prevHasStock) {
      incomingOrderDismissedRef.current = false;
      const freshOrders = generateDeliveryOrders(shopStateRef.current, Math.floor(Math.random() * 1000));
      setShopState((prev) => {
        const prevDelivery = prev.deliveryState || createInitialDeliveryState(prev);
        return {
          ...prev,
          deliveryState: {
            ...prevDelivery,
            availableOrders: freshOrders,
          },
        };
      });
      const firstReady = freshOrders.find((o) => canAcceptDeliveryOrder(shopStateRef.current, o).ok);
      if (firstReady) {
        if (soundManager.isShopWorldAudioAllowed()) soundManager.playDoorChime();
        setIncomingOrderNotice(firstReady);
      }
      return;
    }

    if (!incomingOrderNoticeRef.current && !incomingOrderDismissedRef.current) {
      const curr = shopStateRef.current;
      const existingReady = (curr.deliveryState?.availableOrders || []).find(
        (o) => canAcceptDeliveryOrder(curr, o).ok
      );
      if (existingReady) {
        setIncomingOrderNotice(existingReady);
      } else {
        const freshOrders = generateDeliveryOrders(curr, Math.floor(Math.random() * 1000));
        const freshReady = freshOrders.find((o) => canAcceptDeliveryOrder(curr, o).ok);
        if (freshReady) {
          setShopState((prev) => {
            const prevDelivery = prev.deliveryState || createInitialDeliveryState(prev);
            return {
              ...prev,
              deliveryState: {
                ...prevDelivery,
                availableOrders: freshOrders,
              },
            };
          });
          setIncomingOrderNotice(freshReady);
        }
      }
    }
  }, [hasStockForDelivery, activeMission, gameState]);

  // Clear or refresh incoming order notice if stock changed and it's no longer deliverable
  useEffect(() => {
    if (!incomingOrderNotice) return;
    if (!canAcceptDeliveryOrder(shopState, incomingOrderNotice).ok) {
      setIncomingOrderNotice(null);
    }
  }, [shopState.inventory, shopState.binderCards, shopState.gradedSlabs, incomingOrderNotice]);

  // Live incoming PokeShip order alert every 45s while open & stocked (only replaces if user dismissed/completed previous)
  useEffect(() => {
    if (gameState !== 'playing' || !shopState.isShopOpen || activeMission) return;
    const timer = window.setInterval(() => {
      const curr = shopStateRef.current;
      if (curr.deliveryState?.activeMission || !hasDeliverableShopStock(curr)) return;
      if (incomingOrderNoticeRef.current && canAcceptDeliveryOrder(curr, incomingOrderNoticeRef.current).ok) {
        return;
      }
      const freshOrders = generateDeliveryOrders(curr, Math.floor(Math.random() * 10000));
      const ready = freshOrders.find((o) => canAcceptDeliveryOrder(curr, o).ok);
      if (!ready) return;
      incomingOrderDismissedRef.current = false;
      setShopState((prev) => {
        if (prev.deliveryState?.activeMission) return prev;
        const prevDelivery = prev.deliveryState || createInitialDeliveryState(prev);
        return {
          ...prev,
          deliveryState: {
            ...prevDelivery,
            availableOrders: freshOrders,
          },
        };
      });
      if (soundManager.isShopWorldAudioAllowed()) soundManager.playDoorChime();
      setIncomingOrderNotice(ready);
    }, 45000);
    return () => window.clearInterval(timer);
  }, [gameState, shopState.isShopOpen, activeMission]);

  // Sync Day / Night lighting and outdoor pedestrian cycle
  useEffect(() => {
    sceneManagerRef.current?.setDayNightMode(shopState.isShopOpen, shopState.inGameHour, shopState.inGameMinute);
  }, [shopState.isShopOpen, shopState.inGameHour, shopState.inGameMinute]);

  // Sync Weather Mode (Clear / Rain) with 3D Scene
  useEffect(() => {
    sceneManagerRef.current?.setWeatherMode(
      weatherSchedule.weatherMode,
      weatherSchedule.rainIntensityLevel,
      false
    );
  }, [weatherSchedule.weatherMode, weatherSchedule.rainIntensityLevel]);

  // Customer Spawn Loop (Strictly ONLY spawns during 07:00 AM to 04:00 AM business hours)
  useEffect(() => {
    if (gameState !== 'playing') return;
    const isBusinessHour = shopState.inGameHour >= 7 || shopState.inGameHour < 4;
    if (!shopState.isShopOpen || !isBusinessHour) {
      return;
    }

    const interval = setInterval(() => {
      const hasStock = getStockedStationIds(shopStateRef.current).length > 0;
      const maxInside = hasStock ? 3 : 1;
      setCustomers((prev) => {
        const insideCount = prev.filter((c) => c.status !== 'leaving').length;
        if (insideCount < maxInside) {
          const newCust = generateCustomer(
            shopStateRef.current.inventory,
            shopStateRef.current.showcaseCards,
            shopStateRef.current.shelfCards || [],
            { startEmptyBasket: true }
          );
          if (soundManager.isShopWorldAudioAllowed()) soundManager.playDoorChime();
          return [...prev, newCust];
        }
        return prev;
      });
    }, 7500);

    return () => clearInterval(interval);
  }, [gameState, shopState.isShopOpen, shopState.inGameHour]);

  const activeVenueMusic =
    gameState === 'playing'
      ? inNewDtvZone
        ? 'newdtv'
        : inFourUZone
          ? 'fouru'
          : inKhoiZone
            ? 'khoi'
            : inToxicZone
              ? 'toxic'
              : null
      : null;

  // Automatically swap background BGM to the venue Mixcloud DJ set while stepping into TOXIC, KHÓI, 4U CLUB, or NEW DTV
  useEffect(() => {
    soundManager.setExternalZoneOverride(activeVenueMusic !== null);
    soundManager.stopToxicDjAudio();
    return () => {
      soundManager.setExternalZoneOverride(false);
      soundManager.stopToxicDjAudio();
    };
  }, [activeVenueMusic]);

  // Seed Day-1 Market Pulse news, City Hunt spots, and Satellite Kiosks if empty
  useEffect(() => {
    setShopState((prev) => {
      const needsPulse = !prev.marketPulseNews || prev.marketPulseNews.length === 0;
      const needsHunts = !prev.cityHuntSpots || prev.cityHuntSpots.length === 0;
      const needsKiosks = !prev.satelliteKiosks || Object.keys(prev.satelliteKiosks).length === 0;
      if (!needsPulse && !needsHunts && !needsKiosks) return prev;
      return {
        ...prev,
        marketPulseNews: needsPulse ? rollDailyMarketPulses(prev.currentDay || 1) : prev.marketPulseNews,
        cityHuntSpots: needsHunts ? generateCityHuntSpots(3) : prev.cityHuntSpots,
        satelliteKiosks: needsKiosks ? createInitialKiosksState() : prev.satelliteKiosks,
      };
    });
  }, [activeProfile.id]);

  // In-Game Day/Night Clock Loop (1 real second = 1 in-game minute -> 1000ms = 1 in-game minute) + Satellite Kiosk Passive Tick
  useEffect(() => {
    if (gameState !== 'playing') return;

    const clockInterval = setInterval(() => {
      setShopState((prev) => {
        if (!prev.isShopOpen) return prev; // At 04:00 AM, clock stops and waits for player to click "Qua Ngày Mới"

        let nextMin = prev.inGameMinute + 1;
        let nextHour = prev.inGameHour;
        let nextIsOpen: boolean = prev.isShopOpen;

        if (nextMin >= 60) {
          nextHour += Math.floor(nextMin / 60);
          nextMin = nextMin % 60;
        }

        if (nextHour >= 24) {
          nextHour = nextHour % 24;
        }

        // Close store at 04:00 AM (after operating overnight 07:00 -> 04:00)
        if (prev.inGameHour < 4 && nextHour >= 4) {
          nextHour = 4;
          nextMin = 0;
          nextIsOpen = false;
          if (soundManager.isShopWorldAudioAllowed()) soundManager.playDoorChime();
        }

        const trophyBuffs = getTrophyBuffs(prev.trophyCollection || []);
        const effectiveRep = Math.min(100, (prev.reputation || 50) + trophyBuffs.reputationBonus);
        const kioskTick = tickSatelliteKiosks(prev.satelliteKiosks, 1 / 60, effectiveRep);

        // Advance random day/night rain scheduler by 1 in-game minute
        const weatherStep = advanceWeatherScheduleMinute(weatherScheduleRef.current, nextHour);
        if (weatherStep.nextState !== weatherScheduleRef.current) {
          weatherScheduleRef.current = weatherStep.nextState;
          setWeatherSchedule(weatherStep.nextState);
          if (weatherStep.changed) {
            const isNightHour = nextHour >= 18 || nextHour < 6;
            setToastNotification({
              type: 'info',
              message:
                weatherStep.nextState.weatherMode === 'rain'
                  ? isNightHour
                    ? '🌧️ Đêm đổ mưa lớn cả đêm! Phố lên đèn lung linh trên mặt đường ướt.'
                    : '🌧️ Trời đổ mưa lớn nguyên ban ngày! Người đi bộ đã bung dù khắp phố.'
                  : '🌤️ Trời đã tạnh mưa, bầu trời quang đãng trở lại.',
            });
          }
        }

        return {
          ...prev,
          inGameHour: nextHour,
          inGameMinute: nextMin,
          isShopOpen: nextIsOpen,
          satelliteKiosks: kioskTick.nextKiosks,
        };
      });
    }, 1000);

    return () => clearInterval(clockInterval);
  }, [gameState]);

  const handleToggleRideMotorbike = useCallback(() => {
    const res = sceneManagerRef.current?.toggleRideMotorbike();
    if (!res) return;
    if (res.action === 'blocked' && res.reason === 'carrying_parcel') {
      setToastNotification({
        type: 'warning',
        message: '⚠️ Hãy đặt thùng hàng xuống [G] trước khi lên xe máy!',
      });
    } else if (res.action === 'mounted') {
      setToastNotification({
        type: 'info',
        message: '🏍️ Đã nổ máy! W/S ga & phanh • A/D lái • Shift tăng tốc • Space còi • C góc nhìn • F xuống xe',
      });
    }
  }, []);

  // Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTyping = !!(
        target &&
        (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable)
      );

      if (settingsModalOpen) {
        if (e.code === 'Escape') {
          e.preventDefault();
          soundManager.playSelectSound();
          setSettingsModalOpen(false);
        }
        return;
      }

      if (showDaySummary) {
        if (e.code === 'Escape' || e.code === 'KeyN') {
          e.preventDefault();
          soundManager.playSelectSound();
          setShowDaySummary(false);
          return;
        }
      }

      if (isTyping) {
        if (isFullMapOpen && e.code === 'Escape') {
          e.preventDefault();
          soundManager.playSelectSound();
          setIsFullMapOpen(false);
        }
        return;
      }

      if (isFullMapOpen) {
        if (e.code === 'Escape' || e.code === 'KeyZ') {
          e.preventDefault();
          soundManager.playSelectSound();
          setIsFullMapOpen(false);
        }
        return;
      }

      if (pokeLiveOpen) {
        return;
      }

      if (cityEmpireOpen) {
        if (e.code === 'Escape' || e.code === 'KeyK') {
          e.preventDefault();
          soundManager.playSelectSound();
          setCityEmpireOpen(false);
        }
        return;
      }

      if (battleArenaOpen) {
        if (e.code === 'Escape') {
          e.preventDefault();
          soundManager.playSelectSound();
          setBattleArenaOpen(false);
        }
        return;
      }

      // TAB key directly toggles the Handheld Tablet
      if (e.code === 'Tab') {
        e.preventDefault();
        soundManager.playSelectSound();
        setTabletInitialApp('home');
        setTabletInitialItemsSubTab('cardpack');
        setOpenModal((prev) => (prev === 'pc_ordering' ? null : 'pc_ordering'));
        return;
      }

      if (openModal) {
        if (
          e.code === 'Escape' ||
          (openModal === 'inventory' && e.code === 'KeyB') ||
          ((openModal === 'binder' || openModal === 'op_binder') && e.code === 'KeyV') ||
          (openModal === 'character_select' && e.code === 'KeyU')
        ) {
          e.preventDefault();
          soundManager.playSelectSound();
          setOpenModal(null);
          return;
        }
        // Direct key shortcuts to switch between primary modals while a modal is already open
        if (e.code === 'KeyB') {
          e.preventDefault();
          soundManager.playSelectSound();
          setOpenModal('inventory');
          return;
        }
        if (e.code === 'KeyV') {
          e.preventDefault();
          soundManager.playSelectSound();
          setOpenModal('binder');
          return;
        }
        if (e.code === 'KeyU') {
          e.preventDefault();
          soundManager.playSelectSound();
          setOpenModal('character_select');
          return;
        }
        if (e.code === 'KeyN') {
          e.preventDefault();
          soundManager.playSelectSound();
          setOpenModal(null);
          setShowDaySummary(true);
          return;
        }
        return;
      }

      // If shelf picker menu is open: pressing E or Escape closes it
      if (shelfMenuOpen) {
        if (e.code === 'Escape' || e.code === 'KeyE') {
          e.preventDefault();
          soundManager.playSelectSound();
          setShelfMenuOpen(null);
          return;
        }
      }

      // If holding a pack: Enter rips, Q/Esc puts it back
      if (heldPack) {
        if (e.code === 'Enter') {
          e.preventDefault();
          handleRipHeldPack();
          return;
        }
        if (e.code === 'KeyQ' || e.code === 'Escape') {
          e.preventDefault();
          handleCancelHeldPack();
          return;
        }
      }

      // If holding a delivery parcel in hands (Image 2 & 3 Replica)
      if (shopState.carriedParcel) {
        if (e.code === 'Enter') {
          e.preventDefault();
          if (!shopState.isCarriedBoxOpen) {
            handleOpenCarriedBox();
          } else {
            handleStockItemToShelf();
          }
          return;
        }
        if (e.code === 'KeyG') {
          e.preventDefault();
          handleDropCarriedParcel();
          return;
        }
        if (e.code === 'KeyX' && shopState.carriedParcel.type === 'pack') {
          e.preventDefault();
          handleRipPackFromCarriedParcel();
          return;
        }
      }

      // If holding a box: Enter opens box unsealing modal, Q/Esc puts it back
      if (heldBox) {
        if (e.code === 'Enter') {
          e.preventDefault();
          handleOpenHeldBox();
          return;
        }
        if (e.code === 'KeyQ' || e.code === 'Escape') {
          e.preventDefault();
          handleCancelHeldBox();
          return;
        }
      }

      if (gameState === 'playing') {
        // Direct cashier quick keys (SPACE scans 1 item at a time; once all scanned, SPACE/ENTER finishes checkout)
        if (activeStation?.id === 'register' && queuingCustomer) {
          if (e.code === 'Space') {
            e.preventDefault();
            if (!isPosScanned) {
              handleScanOneCounterItemRef.current?.();
            } else {
              handleDirectCheckout();
            }
            return;
          }
          if (e.code === 'Enter') {
            e.preventDefault();
            if (isPosScanned) {
              handleDirectCheckout();
            } else {
              handleScanAllCounterItems();
            }
            return;
          }
        }

        // [E] Key: Bàn Giao Đơn PokeShip / Mua hàng / Tương tác quầy (hỗ trợ cả Tầng 1 và Tầng 2)
        if (e.code === 'KeyE') {
          e.preventDefault();
          if (nearDeliveryTargetRef.current && shopStateRef.current.deliveryState?.activeMission) {
            handleCompleteDeliveryHandoffRef.current();
            return;
          }
          if (!activeStation && nearPoiPromptRef.current) {
            soundManager.playSelectSound();
            const promptNow = nearPoiPromptRef.current;
            if (promptNow.kind === 'catch_thief') {
              handleCatchShoplifterRef.current?.();
            } else if (promptNow.kind === 'kiosk_collect' && promptNow.kioskId) {
              handleCollectKioskCash(promptNow.kioskId);
            } else if (promptNow.kind === 'hunt') {
              setTabletInitialApp('card_social');
              setOpenModal('pc_ordering');
            } else {
              setCityEmpireInitialTab('luxury_kiosk');
              setCityEmpireOpen(true);
            }
            return;
          }
          soundManager.playSelectSound();
          if (activeStation) {
            if (activeStation.id === 'delivery_drop') {
              handlePickupDeliveryParcel();
              return;
            }
            if ([
              'gacha',
              'collector_shelves',
              'gamestop_shelf',
              'shelves',
              'op_shelves',
              'op_collector_shelves',
              'op_bounty_shelf',
              'op_gacha',
            ].includes(activeStation.id)) {
              setShelfMenuOpen((prev) => (prev ? null : (activeStation.id as any)));
            } else if (activeStation.id === 'battle_tables' || activeStation.id === 'op_battle_tables') {
              setBattleArenaOpen(true);
            } else if (activeStation.id === 'pc_ordering') {
              setTabletInitialApp('home');
              setTabletInitialItemsSubTab('cardpack');
              setOpenModal('pc_ordering');
            } else if (activeStation.id === 'shipping_station') {
              setTabletInitialApp('pokeship');
              setOpenModal('pc_ordering');
            } else if (activeStation.id === 'live_studio') {
              setPokeLiveOpen(true);
            } else if (activeStation.id === 'grading_entrance') {
              if (shopState.storeLevel < GRADING_SHOP_UNLOCK_LEVEL) {
                soundManager.playWrongBuzzer();
                setToastNotification({
                  type: 'warning',
                  message: `🔒 Trung Tâm Thẩm Định PSA · CGC · BGS & Đấu Giá mở khóa tại Cấp ${GRADING_SHOP_UNLOCK_LEVEL} (Hiện tại: Cấp ${shopState.storeLevel})!`,
                });
              } else {
                setGradingModalInitialTab('submit');
                setOpenModal('grading_shop');
              }
            } else if (activeStation.id === 'grading_counter') {
              setGradingModalInitialTab('submit');
              setOpenModal('grading_shop');
            } else if (activeStation.id === 'grading_lab_terminal') {
              setGradingModalInitialTab('vault');
              setOpenModal('grading_shop');
            } else if (activeStation.id === 'grading_auction_podium') {
              if (shopState.storeLevel < GRADING_SHOP_UNLOCK_LEVEL) {
                soundManager.playWrongBuzzer();
                setToastNotification({
                  type: 'warning',
                  message: `🔒 Sàn Đấu Giá VIP mở khóa tại Cấp ${GRADING_SHOP_UNLOCK_LEVEL}!`,
                });
              } else {
                setGradingModalInitialTab('auction');
                setOpenModal('grading_shop');
              }
            } else if (
              activeStation.id === 'showcase' ||
              activeStation.id === 'shelf_1' ||
              activeStation.id === 'shelf_2' ||
              activeStation.id === 'shelf_3' ||
              activeStation.id === 'op_showcase' ||
              activeStation.id === 'op_shelf_1' ||
              activeStation.id === 'op_shelf_2' ||
              activeStation.id === 'op_shelf_3'
            ) {
              setOpenModal(activeStation.id);
            } else if (activeStation.id === 'binder' || activeStation.id === 'op_binder') {
              setOpenModal('binder');
            } else {
              setOpenModal(activeStation.id);
            }
          }
        } else if (e.code === 'KeyB') {
          // [B] Key: Túi Đồ (Kho hàng balo)
          e.preventDefault();
          soundManager.playSelectSound();
          setOpenModal((prev) => (prev === 'inventory' ? null : 'inventory'));
        } else if (e.code === 'KeyV') {
          // [V] Key: Sổ Thẻ Binder Sưu Tập
          e.preventDefault();
          soundManager.playSelectSound();
          setOpenModal((prev) => (prev === 'binder' ? null : 'binder'));
        } else if (e.code === 'KeyU') {
          // [U] Key: Đổi Nhân Vật 3D
          e.preventDefault();
          soundManager.playSelectSound();
          setOpenModal((prev) => (prev === 'character_select' ? null : 'character_select'));
        } else if (e.code === 'KeyN') {
          // [N] Key: Xem Tổng Kết & Qua Ngày Mới
          e.preventDefault();
          soundManager.playSelectSound();
          setShowDaySummary((prev) => !prev);
        } else if (e.code === 'KeyK') {
          // [K] Key: Trung Tâm Đế Chế TCG & Thành Phố 3D
          e.preventDefault();
          soundManager.playSelectSound();
          setCityEmpireOpen((prev) => !prev);
        } else if (e.code === 'KeyF') {
          if (motorbikeState?.isRiding || motorbikeState?.nearBike) {
            e.preventDefault();
            handleToggleRideMotorbike();
          }
        } else if (e.code === 'KeyM') {
          e.preventDefault();
          handleToggleMute();
        } else if (e.code === 'KeyZ') {
          e.preventDefault();
          soundManager.playSelectSound();
          setIsFullMapOpen((prev) => !prev);
        } else if (e.code === 'Escape' || e.code === 'KeyP') {
          e.preventDefault();
          setGameState('paused');
        }
      } else if (gameState === 'paused') {
        if (e.code === 'Escape' || e.code === 'KeyP') {
          e.preventDefault();
          setGameState('playing');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    gameState,
    activeStation,
    openModal,
    settingsModalOpen,
    cityEmpireOpen,
    pokeLiveOpen,
    battleArenaOpen,
    isFullMapOpen,
    heldPack,
    heldBox,
    queuingCustomer,
    isPosScanned,
    shopState.cash,
    showDaySummary,
    shelfMenuOpen,
    motorbikeState?.isRiding,
    motorbikeState?.nearBike,
    handleToggleRideMotorbike,
  ]);

  const handleOpenSettingsModal = (tab: 'profile' | 'switch' | 'history' | 'audio' = 'profile') => {
    soundManager.playSelectSound();
    setSettingsInitialTab(tab);
    setSettingsModalOpen(true);
  };

  const handleProfileChanged = (
    profile: ShopPlayerProfile,
    options?: { switchedAccount?: boolean }
  ) => {
    setActiveProfile(profile);
    if (options?.switchedAccount) {
      const nextState = profile.shopState;
      shopStateRef.current = nextState;
      setShopState(nextState);
      setCustomers([]);
      setQueuingCustomer(null);
      paidCustomerIdsRef.current.clear();
      setHeldPack(null);
      setHeldBox(null);
      setIsPosScanned(false);
      setOpenModal(null);
      setPokeLiveOpen(false);
      setPokeLiveViewingTikTok(false);
      if (liveAutoBeginTimerRef.current) {
        window.clearTimeout(liveAutoBeginTimerRef.current);
        liveAutoBeginTimerRef.current = null;
      }
      if (liveFinalizeTimerRef.current) {
        window.clearTimeout(liveFinalizeTimerRef.current);
        liveFinalizeTimerRef.current = null;
      }
      setLiveRuntime(createInitialLiveStreamRuntime(true));

      const mgr = sceneManagerRef.current;
      if (mgr) {
        mgr.syncCustomers([]);
        mgr.syncUnlockedShelves(nextState.unlockedShelves || STARTER_UNLOCKED_SHELVES);
        mgr.syncAllShelves(nextState.inventory, nextState.unlockedShelves);
        mgr.syncShowcaseCards(nextState.showcaseCards);
        mgr.syncShelfCards(nextState.shelfCards || [], nextState.unlockedShelves);
        mgr.syncOpShowcaseCards(nextState.opShowcaseCards || []);
        mgr.syncOpShelfCards(nextState.opShelfCards || [], nextState.unlockedShelves);
        mgr.syncHiredStaff(nextState.hiredStaff || { cashier: 0, restocker: 0 });
        mgr.syncLiveStudioState({
          unlocked: Boolean(nextState.liveStudioUnlocked),
          streamerHired: (nextState.hiredStaff?.liveStreamer || 0) > 0,
          isOnAir: false,
        });
        mgr.syncSecurityState({
          securityLevel: nextState.securityLevel || 0,
          activeAlert: nextState.activeSecurityAlert || null,
          isShopOpen: nextState.isShopOpen,
        });
        mgr.syncGradingShopState({
          unlocked: nextState.storeLevel >= GRADING_SHOP_UNLOCK_LEVEL,
          receptionistCount: nextState.hiredStaff?.gradingReceptionist || 0,
          specialistsCount: nextState.hiredStaff?.gradingSpecialists || 0,
          auctioneerCount: nextState.hiredStaff?.auctioneer || 0,
          auctionHostCount: nextState.hiredStaff?.auctionHost || 0,
          isGradingActive: (nextState.gradingJobs || []).some((j) => j.status === 'grading'),
          isAuctionLive: (nextState.slabAuctions || []).some((l) => l.status === 'live'),
        });
        const switchedFeaturedLot =
          (nextState.slabAuctions || []).find((l) => l.status === 'live') ||
          (nextState.slabAuctions || [])[0] ||
          null;
        mgr.syncGradingAuctionBoard(
          switchedFeaturedLot,
          nextState.activeMarketTrend || pickDailyMarketTrend(nextState.currentDay || 1)
        );
        mgr.setDayNightMode(nextState.isShopOpen, nextState.inGameHour, nextState.inGameMinute);
        mgr.setDeliveryParcelsCount(
          nextState.pendingDeliveries.length,
          nextState.pendingDeliveries[0]?.name,
          nextState.pendingDeliveries[0]?.productId,
          true
        );
        mgr.setCarriedParcel(null, false);
        const switchedStop = getActiveDeliveryStop(nextState);
        if (nextState.deliveryState?.activeMission && switchedStop) {
          mgr.setActiveDeliveryTarget({
            x: switchedStop.x,
            z: switchedStop.z,
            recipientName: switchedStop.recipientName,
            locationName: switchedStop.locationName,
            avatarColor: switchedStop.recipientAvatarColor,
            category: nextState.deliveryState.activeMission.category,
          });
          mgr.setMotorbikeDeliveryCargo(
            true,
            nextState.deliveryState.activeMission.category === 'vip_sniper' ||
              nextState.deliveryState.activeMission.category === 'multi_route'
          );
        } else {
          mgr.setActiveDeliveryTarget(null);
          mgr.setMotorbikeDeliveryCargo(false, false);
        }
        setNearDeliveryTarget(false);
      }

      setToastNotification({
        type: 'save',
        message: `👤 Đã chuyển sang tài khoản ${profile.name} (${nextState.shopName})!`,
      });
    } else {
      setShopState((prev) => ({
        ...prev,
        shopName: profile.shopState.shopName,
      }));
      setToastNotification({
        type: 'save',
        message: `✅ Đã cập nhật hồ sơ & mật khẩu cho ${profile.name}!`,
      });
    }
  };

  const handleStartGame = () => {
    setGameState('playing');
  };

  const handleToggleCamera = () => {
    if (!sceneManagerRef.current) return;
    soundManager.playSelectSound();
    const next = sceneManagerRef.current.toggleCameraView();
    setCameraMode(next);
  };

  const handleSelectPlayerCharacter = (id: PlayerCharacterId) => {
    setPlayerCharacterId(id);
    savePlayerCharacterId(id);
    sceneManagerRef.current?.setPlayerCharacter(id);
    const charDef = getPlayerCharacterDef(id);
    if (id !== 'default' && !motorbikeState?.isRiding && cameraMode === 'first') {
      sceneManagerRef.current?.setCameraMode('third');
      setCameraMode('third');
    }
    setOpenModal(null);
    setToastNotification({
      type: 'save',
      message:
        id === 'gojo'
          ? `✨ Đã chọn ${charDef.name} (đứng nghiêm không nhảy • [C] đổi góc nhìn)`
          : `✨ Đã chuyển nhân vật sang ${charDef.name} ([C] đổi góc nhìn 1/3)`,
    });
  };

  const handleCycleGraphicsQuality = useCallback(() => {
    soundManager.playSelectSound();
    setGraphicsQuality((prev) => {
      const next: GraphicsQualityPreset =
        prev === 'balanced' ? 'fast' : prev === 'fast' ? 'high' : 'balanced';
      sceneManagerRef.current?.setGraphicsQuality(next);
      const desc =
        next === 'fast'
          ? '⚡ Đồ họa: SIÊU MƯỢT (Tắt bóng • Giảm độ phân giải & tầm nhìn • Tối đa FPS)'
          : next === 'balanced'
            ? '✨ Đồ họa: CÂN BẰNG (Đẹp & mượt • Tối ưu bóng và NPC 3D)'
            : '🌟 Đồ họa: CAO (Độ nét tối đa • Tầm nhìn xa • Nhiều NPC 3D)';
      setToastNotification({ type: 'save', message: desc });
      return next;
    });
  }, []);

  const handleToggleMute = () => {
    const muted = soundManager.toggleMuted();
    setIsMuted(muted);
  };

  const handleJoystickMove = (vector: { x: number; y: number }) => {
    if (!sceneManagerRef.current) return;
    sceneManagerRef.current.joystickVector = vector;
  };

  // Pack rip callbacks
  const handlePackConsumed = (setId: string, pulledCards?: PokemonCard[]) => {
    const xpCalc = calculatePackOpenExp(pulledCards || []);
    setShopState((prev) => {
      const packId = `${setId}_pack`;
      const updatedInv = prev.inventory.map((item) => {
        if (item.productId === packId || item.id.includes(setId)) {
          const newQty = Math.max(0, item.quantity - 1);
          return {
            ...item,
            quantity: newQty,
            shelvedQuantity: Math.min(newQty, item.shelvedQuantity || 0),
          };
        }
        return item;
      });

      const expRes = applyExpGain(prev.storeExp, prev.storeLevel, xpCalc.totalExp);
      if (expRes.didLevelUp) {
        soundManager.playLevelUpFanfare();
        confetti({ particleCount: 120, spread: 90, origin: { y: 0.5 } });
      }

      return {
        ...prev,
        inventory: updatedInv,
        packsOpenedCount: prev.packsOpenedCount + 1,
        storeExp: expRes.newExp,
        storeLevel: expRes.newLevel,
        storeExpToNext: expRes.newExpToNext,
        unlockedSets: expRes.didLevelUp ? getUnlockedSetsForLevel(expRes.newLevel) : prev.unlockedSets,
      };
    });
  };

  const handleBoxConsumed = (setId: string) => {
    const setMeta = getBoosterSet(setId);
    const consumedPacksCount = setMeta?.packsPerBox || 9;
    const targetProductId = setId.endsWith('_box') ? setId : `${setId}_box`;

    setShopState((prev) => {
      let targetIdx = prev.inventory.findIndex(
        (item) =>
          item.type === 'box' &&
          item.quantity > 0 &&
          (item.productId === targetProductId ||
            item.productId === setId ||
            item.id.includes(setId))
      );
      if (targetIdx === -1) {
        targetIdx = prev.inventory.findIndex((item) => item.type === 'box' && item.quantity > 0);
      }

      const updatedInv = prev.inventory.map((item, idx) => {
        if (idx === targetIdx) {
          const newQty = Math.max(0, item.quantity - 1);
          return {
            ...item,
            quantity: newQty,
            shelvedQuantity: Math.min(newQty, item.shelvedQuantity || 0),
          };
        }
        return item;
      });

      const expRes = applyExpGain(prev.storeExp, prev.storeLevel, 15);
      if (expRes.didLevelUp) {
        soundManager.playLevelUpFanfare();
        confetti({ particleCount: 120, spread: 90, origin: { y: 0.5 } });
      }

      return {
        ...prev,
        inventory: updatedInv,
        packsOpenedCount: prev.packsOpenedCount + consumedPacksCount,
        storeExp: expRes.newExp,
        storeLevel: expRes.newLevel,
        storeExpToNext: expRes.newExpToNext,
        unlockedSets: expRes.didLevelUp ? getUnlockedSetsForLevel(expRes.newLevel) : prev.unlockedSets,
      };
    });
  };

  const handleCardKeptInShowcase = (
    card: PokemonCard,
    price: number,
    slabMeta?: { isSlab?: boolean; slab?: GradedSlab }
  ) => {
    setShopState((prev) => {
      if (card.universe === 'onepiece') {
        const placedOp = placeOpCardInDisplaySlots(
          prev.opShowcaseCards || [],
          prev.opShelfCards || [],
          {
            card,
            retailPrice: price,
            isSold: false,
            isSlab: slabMeta?.isSlab,
            slab: slabMeta?.slab,
          },
          prev.unlockedShelves
        );
        return {
          ...prev,
          opShowcaseCards: placedOp.showcaseCards,
          opShelfCards: placedOp.shelfCards,
        };
      }

      const placed = placeCardInDisplaySlots(
        prev.showcaseCards,
        prev.shelfCards || [],
        {
          card,
          retailPrice: price,
          isSold: false,
          isSlab: slabMeta?.isSlab,
          slab: slabMeta?.slab,
        },
        prev.unlockedShelves
      );
      return {
        ...prev,
        showcaseCards: placed.showcaseCards,
        shelfCards: placed.shelfCards,
      };
    });
  };

  const handleCardAddedToBinder = (card: PokemonCard) => {
    setShopState((prev) => ({
      ...prev,
      binderCards: {
        ...prev.binderCards,
        [card.id]: (prev.binderCards[card.id] || 0) + 1,
      },
    }));
  };

  const handleCardQuickSold = (card: PokemonCard, cashReceived: number) => {
    soundManager.playCashRegister();
    const { multiplier, matchedPulse } = getMarketPulseMultiplierForCard(
      card,
      shopStateRef.current.marketPulseNews
    );
    const adjustedCash = Number((cashReceived * multiplier).toFixed(2));
    setShopState((prev) => ({
      ...prev,
      cash: prev.cash + adjustedCash,
      totalRevenue: prev.totalRevenue + adjustedCash,
    }));
    if (matchedPulse && multiplier !== 1) {
      setToastNotification({
        type: multiplier > 1 ? 'success' : 'info',
        message: `📰 Market Pulse (${matchedPulse.badge}): Bán nhanh ${card.name} thu $${adjustedCash.toFixed(2)}!`,
      });
    }
  };

  // Checkout complete callback
  const handleCheckoutComplete = (customer: ShopCustomer, totalRevenue: number) => {
    if (!customer || !customer.basket || customer.basket.length === 0) return;
    paidCustomerIdsRef.current.add(customer.id);
    if (soundManager.isShopWorldAudioAllowed()) soundManager.playCashRegister();

    setShopState((prev) => {
      // Deduct final stock quantities (shelvedQuantity/isReserved was already updated when NPC picked from shelf)
      let updatedInv = [...prev.inventory];
      let updatedShowcase = [...prev.showcaseCards];
      let updatedShelf = [...(prev.shelfCards || [])];

      let wholesaleTotal = 0;
      let soldItemsCount = 0;

      customer.basket.forEach((bItem) => {
        const count = bItem.count || 1;
        soldItemsCount += count;
        wholesaleTotal += (bItem.item.wholesaleCost || 0) * count;

        if (bItem.item.type === 'single') {
          if (bItem.item.id.startsWith('shelf_')) {
            const parts = bItem.item.id.split('_');
            const slotIdx = parseInt(parts[parts.length - 1], 10);
            if (!isNaN(slotIdx) && updatedShelf[slotIdx]) {
              updatedShelf[slotIdx] = { ...updatedShelf[slotIdx], isSold: true, isReserved: false };
            } else {
              const fIdx = updatedShelf.findIndex(
                (s) => s.card.id === bItem.item.productId && !s.isSold
              );
              if (fIdx !== -1) updatedShelf[fIdx] = { ...updatedShelf[fIdx], isSold: true, isReserved: false };
            }
          } else {
            const parts = bItem.item.id.split('_');
            const slotIdx = parseInt(parts[parts.length - 1], 10);
            if (!isNaN(slotIdx) && updatedShowcase[slotIdx]) {
              updatedShowcase[slotIdx] = { ...updatedShowcase[slotIdx], isSold: true, isReserved: false };
            } else {
              updatedShowcase = updatedShowcase.filter((s) => s.card.id !== bItem.item.productId);
            }
          }
        } else {
          updatedInv = updatedInv.map((inv) => {
            if (inv.id === bItem.item.id || inv.productId === bItem.item.productId) {
              const newQty = Math.max(0, (inv.quantity || 0) - count);
              return {
                ...inv,
                quantity: newQty,
                shelvedQuantity: Math.min(newQty, inv.shelvedQuantity || 0),
              };
            }
            return inv;
          });
        }
      });

      // Synchronize all 3D shelves & displays in real-time
      sceneManagerRef.current?.syncAllShelves(updatedInv, prev.unlockedShelves);
      sceneManagerRef.current?.syncShowcaseCards(updatedShowcase);
      sceneManagerRef.current?.syncShelfCards(updatedShelf, prev.unlockedShelves);

      // Customer Checkout XP:
      // Floor 1 (Pokemon): Pack 5 XP, Box 12 XP, Single 5 XP
      // Floor 2 (One Piece): Pack 4 XP, Box 70 XP
      let expEarned = 0;
      customer.basket.forEach((bItem) => {
        const count = bItem.count || 1;
        const prodId = bItem.item.productId || bItem.item.id || '';
        const isOp =
          bItem.item.cardData?.universe === 'onepiece' ||
          isOnePieceProductId(prodId) ||
          prodId.startsWith('op') ||
          prodId.startsWith('eb') ||
          prodId.startsWith('prb');

        if (isOp) {
          if (bItem.item.type === 'box') {
            expEarned += count * 70;
          } else {
            expEarned += count * 4;
          }
        } else {
          if (bItem.item.type === 'box') {
            expEarned += count * 12;
          } else {
            expEarned += count * 5;
          }
        }
      });

      const expRes = applyExpGain(prev.storeExp, prev.storeLevel, expEarned);
      if (expRes.didLevelUp) {
        if (soundManager.isShopWorldAudioAllowed()) soundManager.playLevelUpFanfare();
        confetti({ particleCount: 150, spread: 100, origin: { y: 0.5 } });
        setToastNotification({
          type: 'save',
          message: `🎉 CHÚC MỪNG! Tiệm của bạn đã đạt CẤP ${expRes.newLevel}! Mở khóa thêm sản phẩm mới.`,
        });
      }

      const prevToday = prev.todayStats || { revenue: 0, profit: 0, customersServed: 0, itemsSold: 0 };
      const netProfit = Math.max(0, totalRevenue - wholesaleTotal);

      return {
        ...prev,
        cash: prev.cash + totalRevenue,
        totalRevenue: prev.totalRevenue + totalRevenue,
        customersServedCount: prev.customersServedCount + 1,
        todayStats: {
          revenue: prevToday.revenue + totalRevenue,
          profit: prevToday.profit + netProfit,
          customersServed: prevToday.customersServed + 1,
          itemsSold: prevToday.itemsSold + soldItemsCount,
        },
        storeExp: expRes.newExp,
        storeLevel: expRes.newLevel,
        storeExpToNext: expRes.newExpToNext,
        unlockedSets: expRes.didLevelUp ? getUnlockedSetsForLevel(expRes.newLevel) : prev.unlockedSets,
        inventory: updatedInv,
        showcaseCards: updatedShowcase,
        shelfCards: updatedShelf,
      };
    });

    const soldSummary = customer.basket
      .map((b) => `${b.count}x ${b.item.name}`)
      .slice(0, 3)
      .join(', ');
    shopProfileManager.recordHistory({
      category: 'sale',
      title: `Thu Ngân POS: ${customer.name}`,
      amount: totalRevenue,
      detail: soldSummary || `Thanh toán ${customer.basket.length} món hàng`,
      isIncome: true,
    });

    paidCustomerIdsRef.current.add(customer.id);
    sceneManagerRef.current?.checkoutCustomer(customer.id);
    setPosScannedCounts({});
    setIsPosScanned(false);

    // Customer walks out of the shop with items visibly inside their blue basket
    setCustomers((prev) => {
      const nextInLine = prev.find(
        (c) => c.status === 'queuing' && c.id !== customer.id && c.basket && c.basket.length > 0
      );
      queuingCustomerRef.current = nextInLine || null;
      setQueuingCustomer(nextInLine || null);
      return prev.map((c) =>
        c.id === customer.id
          ? { ...c, status: 'leaving' as const, speechBubble: '🛍️ Cảm ơn shop nhé!' }
          : c
      );
    });
    setOpenModal(null);
  };

  // Scan 1 physical unit on the checkout counter (synced across 3D Staging Mat, POS, CFD & Modal)
  const handleScanOneCounterItem = (itemId?: string, customerOverride?: ShopCustomer | null) => {
    const targetCust = customerOverride ?? queuingCustomerRef.current;
    if (!targetCust || targetCust.status === 'leaving' || !targetCust.basket?.length) return;

    const currentCounts = posScannedCountsRef.current;
    const targetRow = itemId
      ? targetCust.basket.find(
          (b) => b.item.id === itemId && (currentCounts[b.item.id] || 0) < Math.max(1, b.count || 1)
        )
      : targetCust.basket.find(
          (b) => (currentCounts[b.item.id] || 0) < Math.max(1, b.count || 1)
        );
    if (!targetRow) return;

    if (soundManager.isShopWorldAudioAllowed()) soundManager.playBarcodeBeep();
    const maxCount = Math.max(1, targetRow.count || 1);
    const nextCounts = {
      ...currentCounts,
      [targetRow.item.id]: Math.min(maxCount, (currentCounts[targetRow.item.id] || 0) + 1),
    };
    posScannedCountsRef.current = nextCounts;
    setPosScannedCounts(nextCounts);

    const allDone = targetCust.basket.every(
      (b) => (nextCounts[b.item.id] || 0) >= Math.max(1, b.count || 1)
    );
    if (allDone) {
      setIsPosScanned(true);
    }
  };
  handleScanOneCounterItemRef.current = handleScanOneCounterItem;

  const handleScanAllCounterItems = () => {
    const targetCust = queuingCustomerRef.current;
    if (!targetCust || !targetCust.basket?.length) return;
    soundManager.playBarcodeBeep();
    const allCounts: Record<string, number> = {};
    targetCust.basket.forEach((b) => {
      allCounts[b.item.id] = Math.max(1, b.count || 1);
    });
    posScannedCountsRef.current = allCounts;
    setPosScannedCounts(allCounts);
    setIsPosScanned(true);
  };

  // Direct Cashier Checkout (from POS screen directly without modal)
  const handleDirectCheckout = () => {
    if (!queuingCustomer || queuingCustomer.status === 'leaving' || !queuingCustomer.basket || queuingCustomer.basket.length === 0) return;
    const totalRev = queuingCustomer.basket.reduce(
      (sum, b) => sum + b.unitPrice * b.count,
      0
    );
    handleCheckoutComplete(queuingCustomer, totalRev);
    setPosScannedCounts({});
    setIsPosScanned(false);
  };

  // Cancel holding pack and return it to the shelf
  const handleCancelHeldPack = () => {
    if (!heldPack) return;
    soundManager.playSelectSound();
    setShopState((prev) => {
      const inv = prev.inventory.map((item) => {
        const isMatch = heldPack.type === 'gacha'
          ? (item.productId === `gacha_${heldPack.id}` || item.productId === heldPack.id)
          : (item.productId === `${heldPack.id}_pack` || item.productId === heldPack.id);
        return isMatch ? { ...item, shelvedQuantity: (item.shelvedQuantity || 0) + 1 } : item;
      });
      sceneManagerRef.current?.syncAllShelves(inv);
      return { ...prev, inventory: inv };
    });
    setHeldPack(null);
  };

  // Cancel holding box and return it to the shelf
  const handleCancelHeldBox = () => {
    if (!heldBox) return;
    soundManager.playSelectSound();
    setShopState((prev) => {
      const inv = prev.inventory.map((item) => {
        const isMatch = item.productId === `${heldBox.id}_box` || item.productId === heldBox.id;
        return isMatch ? { ...item, shelvedQuantity: (item.shelvedQuantity || 0) + 1 } : item;
      });
      sceneManagerRef.current?.syncAllShelves(inv);
      return { ...prev, inventory: inv };
    });
    setHeldBox(null);
  };

  // Open / Rip Held Pack in Hands (TCG Card Shop Simulator style)
  const handleRipHeldPack = () => {
    if (!heldPack) return;
    if (heldPack.type === 'gacha') {
      soundManager.playPackRip();
      const result = rollGachaPack(heldPack.id);
      const tier = (GACHA_PACK_TIERS as Record<string, any>)[heldPack.id] || Object.values(GACHA_PACK_TIERS)[0];
      const payoutVal = result.payoutValue;
      const roi = Math.round((result.multiplier - 1) * 100);

      // Deduct 1 from total store quantity (shelved was already deducted on pickup)
      setShopState((prev) => {
        const updated = prev.inventory.map((item) =>
          item.productId === `gacha_${heldPack.id}` || item.productId === heldPack.id
            ? { ...item, quantity: Math.max(0, item.quantity - 1) }
            : item
        );
        const expRes = applyExpGain(prev.storeExp, prev.storeLevel, 2);
        return {
          ...prev,
          inventory: updated,
          packsOpenedCount: prev.packsOpenedCount + 1,
          storeExp: expRes.newExp,
          storeLevel: expRes.newLevel,
          storeExpToNext: expRes.newExpToNext,
          unlockedSets: expRes.didLevelUp ? getUnlockedSetsForLevel(expRes.newLevel) : prev.unlockedSets,
        };
      });

      setGachaRevealResult({
        packTier: tier,
        card: result.card,
        payout: payoutVal,
        roiPct: roi,
        isSlab: result.isSlab,
        slab: result.slab,
        rawPrice: result.rawPrice,
        gradeMultiplier: result.gradeMultiplier,
      });
      if (result.multiplier >= 1.5 || payoutVal >= 1000) {
        confetti({ particleCount: 75, spread: 80, origin: { y: 0.6 } });
      }
      setHeldPack(null);
    } else {
      setSelectedOpeningSetId(heldPack.id);
      soundManager.playPackRip();
      setOpenModal('rip_packs');
      setHeldPack(null);
    }
  };

  // Open / Unbox Held Booster Box in Hands (TCG Card Shop Simulator style)
  const handleOpenHeldBox = () => {
    if (!heldBox) return;
    soundManager.playBoxOpen();

    if (isGameStopMysteryProduct(heldBox.id)) {
      const res = rollGameStopMysteryBox(heldBox.id);
      // Consume 1 mystery box from inventory and add the 2 packs to inventory
      setShopState((prev) => {
        const inv = [...prev.inventory];
        const boxProdId = heldBox.id.endsWith('_box') ? heldBox.id : `${heldBox.id}_box`;
        const boxItem = inv.find((i) => i.productId === boxProdId || i.productId === heldBox.id);
        if (boxItem) {
          boxItem.quantity = Math.max(0, boxItem.quantity - 1);
          boxItem.shelvedQuantity = Math.max(0, Math.min(boxItem.shelvedQuantity, boxItem.quantity));
        }
        res.packs.forEach((p) => {
          const packProdId = `${p.setId}_pack`;
          const existingPack = inv.find((i) => i.productId === packProdId || i.productId === p.setId);
          if (existingPack) {
            existingPack.quantity += 1;
            existingPack.shelvedQuantity += 1;
          } else {
            inv.push({
              id: 'inv_pack_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 3),
              productId: packProdId,
              name: `${p.setName} Pack`,
              type: 'pack',
              setName: p.setName,
              wholesaleCost: 3.5,
              retailPrice: 7.0,
              quantity: 1,
              shelvedQuantity: 1,
            });
          }
        });
        sceneManagerRef.current?.syncAllShelves(inv);
        return { ...prev, inventory: inv };
      });
      setGameStopMysteryResult(res);
      setOpenModal('gamestop_mystery' as any);
      setHeldBox(null);
      return;
    }

    // Deduct 1 from total inventory quantity for regular or collector box
    setShopState((prev) => {
      const inv = prev.inventory.map((item) => {
        const isMatch = item.productId === `${heldBox.id}_box` || item.productId === heldBox.id;
        return isMatch ? { ...item, quantity: Math.max(0, item.quantity - 1) } : item;
      });
      sceneManagerRef.current?.syncAllShelves(inv);
      return { ...prev, inventory: inv };
    });

    setSelectedOpeningSetId(heldBox.id);
    setOpenModal('box_opening');
    setHeldBox(null);
  };

  // Wholesale stock ordering -> Generates delivery parcels outside shop (Image 1 replica)
  const handleOrderStock = (
    orderedItems: Array<{ item: Partial<InventoryItem>; count: number; totalCost: number }>
  ) => {
    soundManager.playDoorChime();
    confetti({ particleCount: 30, spread: 50 });

    setShopState((prev) => {
      let totalExpense = 0;
      const newParcels: DeliveryParcel[] = [];

      orderedItems.forEach((ord) => {
        totalExpense += ord.totalCost;
        const pId = ord.item.productId || 'custom_product';
        const pName = ord.item.name || 'Kiện Hàng Pokémon';
        const pType: 'pack' | 'box' = ord.item.type === 'box' ? 'box' : 'pack';
        const pSet = ord.item.setName || '';
        const pCost = ord.item.wholesaleCost || 5.0;
        const pRetail = ord.item.retailPrice || 10.0;

        const cleanSetId = pId.replace('_pack', '').replace('_box', '');
        const bSet = getBoosterSet(cleanSetId);
        const resolvedImg = ord.item.imageUrl || (pType === 'box' ? bSet.boxImageUrl : bSet.packImageUrl);
        const resolvedColor = bSet.themeColor || (pType === 'box' ? '#f59e0b' : '#0284c7');

        newParcels.push({
          id: 'parcel_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 4),
          orderTime: Date.now(),
          productId: pId,
          name: pName,
          productName: pName,
          type: pType,
          itemType: pType,
          setName: pSet,
          totalItems: ord.count,
          remainingItems: ord.count,
          wholesaleCost: pCost,
          retailPrice: pRetail,
          imageUrl: resolvedImg,
          themeColor: resolvedColor,
        });
      });

      const updatedPending = [...prev.pendingDeliveries, ...newParcels];
      sceneManagerRef.current?.setDeliveryParcelsCount(
        updatedPending.length,
        updatedPending[0]?.name,
        updatedPending[0]?.productId
      );

      return {
        ...prev,
        cash: Math.max(0, prev.cash - totalExpense),
        pendingDeliveries: updatedPending,
        storeExp: prev.storeExp, // 0 XP on stock wholesale order (anti-abuse rule)
      };
    });

    const orderExpense = orderedItems.reduce((sum, ord) => sum + ord.totalCost, 0);
    const masterSetDiscPct = Math.round(
      getMasterSetWholesaleDiscount(shopStateRef.current.claimedMasterSetMilestones || []) * 100
    );
    shopProfileManager.recordHistory({
      category: 'order',
      title: `Nhập Hàng Tablet (${orderedItems.length} kiện${masterSetDiscPct > 0 ? ` · -${masterSetDiscPct}% Master Set` : ''})`,
      amount: orderExpense,
      detail: orderedItems.map((o) => `${o.count}x ${o.item.name || 'Sản phẩm'}`).slice(0, 2).join(', '),
      isIncome: false,
    });

    setToastNotification({
      type: 'delivery',
      message: `📦 Đã giao ${orderedItems.length} kiện hàng${masterSetDiscPct > 0 ? ` (Giảm -${masterSetDiscPct}% Master Set)` : ''} đến trước cửa shop! Hãy ra cửa bưng vào tiệm.`,
    });
  };

  // Pick up top Delivery Parcel from exterior drop zone (Image 1 -> Image 2)
  const handlePickupDeliveryParcel = () => {
    if (shopState.pendingDeliveries.length === 0 || shopState.carriedParcel) return;
    const [top, ...rest] = shopState.pendingDeliveries;
    soundManager.playSelectSound();
    setShopState((prev) => ({
      ...prev,
      pendingDeliveries: rest,
      carriedParcel: top,
      isCarriedBoxOpen: false,
    }));
    sceneManagerRef.current?.setCarriedParcel(top, false);
    sceneManagerRef.current?.setDeliveryParcelsCount(rest.length, rest[0]?.name, rest[0]?.productId);
    setToastNotification({
      message: `📦 Đang bưng: ${top.name} (${top.remainingItems} món). Hãy đến kệ và nhấn ENTER để mở!`,
    });
  };

  // Open the Carried Box lid (Image 2 -> Image 3)
  const handleOpenCarriedBox = () => {
    if (!shopState.carriedParcel) return;
    soundManager.playPackTear();
    setShopState((prev) => ({
      ...prev,
      isCarriedBoxOpen: true,
    }));
    sceneManagerRef.current?.setCarriedParcel(shopState.carriedParcel, true);
    setToastNotification({
      message: `🔓 Đã mở nắp thùng! Nhấn ENTER hoặc Click để xếp từng món lên kệ.`,
    });
  };

  // Stock 1 item from Carried Box directly onto shelf (Image 3 -> Shelf)
  const handleStockItemToShelf = () => {
    if (!shopState.carriedParcel) return;
    if (!shopState.isCarriedBoxOpen) {
      handleOpenCarriedBox();
      return;
    }

    const parcel = shopState.carriedParcel;
    if (parcel.remainingItems <= 0) return;

    const stockCheck = canStockProductOnUnlockedShelves(
      shopStateRef.current.inventory,
      parcel.productId,
      shopStateRef.current.unlockedShelves,
      { isFromParcel: true }
    );
    if (!stockCheck.allowed) {
      soundManager.playWrongBuzzer();
      setToastNotification({
        type: 'warning',
        message: `🔒 ${stockCheck.reason} Mở Tablet [TAB] → Mở Khóa Kệ hoặc nhấn [G] đặt thùng xuống.`,
      });
      return;
    }

    soundManager.playCardSlide();
    sceneManagerRef.current?.playPlaceItemAnimation();

    setShopState((prev) => {
      const updatedInv = [...prev.inventory];
      const existing = updatedInv.find((i) => i.productId === parcel.productId);
      if (existing) {
        existing.quantity += 1;
        existing.shelvedQuantity += 1;
      } else {
        updatedInv.push({
          id: 'inv_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 3),
          productId: parcel.productId,
          name: parcel.name,
          type: parcel.type,
          setName: parcel.setName,
          wholesaleCost: parcel.wholesaleCost,
          retailPrice: parcel.retailPrice,
          quantity: 1,
          shelvedQuantity: 1,
        });
      }

      const nextRemaining = parcel.remainingItems - 1;
      const updatedParcel = nextRemaining > 0 ? { ...parcel, remainingItems: nextRemaining } : null;

      sceneManagerRef.current?.syncAllShelves(updatedInv);
      sceneManagerRef.current?.setCarriedParcel(updatedParcel, nextRemaining > 0);

      if (nextRemaining <= 0) {
        soundManager.playWinChime();
        confetti({ particleCount: 35, spread: 60 });
        setToastNotification({
          message: `✅ Đã xếp xong toàn bộ ${parcel.name} lên kệ! Thùng rỗng đã được dọn sạch.`,
        });
      }

      return {
        ...prev,
        inventory: updatedInv,
        carriedParcel: updatedParcel,
        isCarriedBoxOpen: nextRemaining > 0,
      };
    });
  };

  // Drop Carried Parcel back onto the ground outside (Key G)
  const handleDropCarriedParcel = () => {
    if (!shopState.carriedParcel) return;
    soundManager.playSelectSound();
    const parcelToDrop = shopState.carriedParcel;
    setShopState((prev) => {
      const updatedPending = [parcelToDrop, ...prev.pendingDeliveries];
      sceneManagerRef.current?.setCarriedParcel(null, false);
      sceneManagerRef.current?.setDeliveryParcelsCount(
        updatedPending.length,
        updatedPending[0]?.name,
        updatedPending[0]?.productId
      );
      return {
        ...prev,
        pendingDeliveries: updatedPending,
        carriedParcel: null,
        isCarriedBoxOpen: false,
      };
    });
    setToastNotification({
      message: `📦 Đã đặt kiện hàng ${parcelToDrop.name} xuống vị trí giao hàng.`,
    });
  };

  // Rip 1 pack directly from the carried box
  const handleRipPackFromCarriedParcel = () => {
    if (!shopState.carriedParcel || shopState.carriedParcel.type !== 'pack') return;
    const parcel = shopState.carriedParcel;
    if (parcel.remainingItems <= 0) return;

    soundManager.playPackRip();
    // Reduce remaining in parcel by 1
    setShopState((prev) => {
      const nextRemaining = parcel.remainingItems - 1;
      const updatedParcel = nextRemaining > 0 ? { ...parcel, remainingItems: nextRemaining } : null;
      sceneManagerRef.current?.setCarriedParcel(updatedParcel, prev.isCarriedBoxOpen);
      return {
        ...prev,
        carriedParcel: updatedParcel,
        packsOpenedCount: prev.packsOpenedCount + 1,
      };
    });

    // Open pack modal
    setSelectedOpeningSetId(parcel.productId.replace('_pack', ''));
    setOpenModal('rip_packs');
  };

  // Advance to next day at 07:00 AM sharp (Day & Night loop transition)
  const handleAdvanceToNextDay = () => {
    soundManager.playWinChime();
    confetti({ particleCount: 55, spread: 70 });

    const prevPassive = getLuxuryAssetBuffs(shopStateRef.current.ownedLuxuryAssets || []).dailyPassiveBonusCash;
    const prevDayNum = shopStateRef.current.currentDay || 1;

    setShopState((prev) => {
      const newDay = (prev.currentDay || 1) + 1;
      const dayReport = {
        day: prev.currentDay,
        revenue: prev.todayStats?.revenue || 0,
        profit: prev.todayStats?.profit || 0,
        itemsSold: prev.todayStats?.itemsSold || 0,
      };

      sceneManagerRef.current?.setDayNightMode(true, 7, 0);

      const prevDelivery = prev.deliveryState || createInitialDeliveryState(prev);
      const nextDeliveryState = {
        ...prevDelivery,
        lastBoardRefreshDay: newDay,
        dailyStats: createInitialDailyStats(newDay),
        availableOrders: prevDelivery.activeMission
          ? prevDelivery.availableOrders
          : generateDeliveryOrders({ ...prev, currentDay: newDay }, newDay),
      };

      const luxuryBuffs = getLuxuryAssetBuffs(prev.ownedLuxuryAssets || []);
      const passiveIncome = luxuryBuffs.dailyPassiveBonusCash || 0;

      return {
        ...prev,
        currentDay: newDay,
        inGameHour: 7, // 07:00 AM Morning Sun
        inGameMinute: 0,
        isShopOpen: true,
        cash: prev.cash + passiveIncome,
        totalRevenue: prev.totalRevenue + passiveIncome,
        dailySalesHistory: [dayReport, ...(prev.dailySalesHistory || [])],
        todayStats: {
          revenue: 0,
          profit: 0,
          customersServed: 0,
          itemsSold: 0,
        },
        deliveryState: nextDeliveryState,
        activeMarketTrend: pickDailyMarketTrend(newDay),
        marketPulseNews: rollDailyMarketPulses(newDay),
        cityHuntSpots: generateCityHuntSpots(3),
        activeSecurityAlert: null,
      };
    });

    if (prevPassive > 0) {
      shopProfileManager.recordHistory({
        category: 'sale',
        title: `Thu Nhập Tài Sản Xa Xỉ Ngày ${prevDayNum + 1}`,
        amount: prevPassive,
        detail: 'Doanh thu thụ động từ Penthouse Vinhomes / VinFast VF9',
        isIncome: true,
      });
    }

    setWeatherSchedule((prevW) => rollNewDayWeatherSchedule(prevW));

    setShowDaySummary(false);
    setToastNotification({
      message: `☀️ NGÀY ${prevDayNum + 1}! Tin thị trường TCG & 3 điểm Săn Hàng Hiếm đã cập nhật.${
        prevPassive > 0 ? ` (+$${prevPassive} thu nhập tài sản)` : ''
      }`,
    });
  };

  // =========================================================================
  // POKÉSHIP EXPRESS DELIVERY & DAILY TASK HANDLERS
  // =========================================================================
  const handleAcceptDeliveryOrder = useCallback((order: DeliveryOrder) => {
    const res = acceptDeliveryOrder(shopStateRef.current, order, Date.now());
    if (!res.accepted) {
      soundManager.playWrongBuzzer();
      setToastNotification({
        type: 'warning',
        message: `⚠️ ${res.reason || 'Không thể nhận đơn giao hàng này!'}`,
      });
      return;
    }

    shopStateRef.current = res.nextState;
    setShopState(res.nextState);
    sceneManagerRef.current?.syncAllShelves(res.nextState.inventory, res.nextState.unlockedShelves);
    setOpenModal(null);
    soundManager.playDoorChime();

    const firstStop = order.stops[0];
    setToastNotification({
      type: 'success',
      message: `🛵 Đã nhận đơn ${order.code}! Lên xe máy [F] và chạy theo GPS tới ${firstStop?.locationName}.`,
    });
  }, []);

  const handleCancelDeliveryMission = useCallback(() => {
    const res = cancelActiveDeliveryMission(shopStateRef.current);
    shopStateRef.current = res.nextState;
    setShopState(res.nextState);
    sceneManagerRef.current?.syncAllShelves(res.nextState.inventory, res.nextState.unlockedShelves);
    setNearDeliveryTarget(false);
    setToastNotification({
      type: 'info',
      message:
        res.refundedCount > 0
          ? `↩️ Đã hủy đơn PokeShip & hoàn ${res.refundedCount} món về kho cửa hàng.`
          : '↩️ Đã hủy đơn PokeShip hiện tại.',
    });
  }, []);

  const handleRefreshDeliveryBoard = useCallback(() => {
    setShopState((prev) => {
      const prevDelivery = prev.deliveryState || createInitialDeliveryState(prev);
      return {
        ...prev,
        deliveryState: {
          ...prevDelivery,
          availableOrders: generateDeliveryOrders(prev, Math.floor(Math.random() * 1000)),
        },
      };
    });
  }, []);

  const handleCompleteDeliveryHandoff = useCallback(() => {
    const summary = completeCurrentDeliveryStop(shopStateRef.current, Date.now());
    if (!summary.stopCompleted) return;

    const luxuryBuffs = getLuxuryAssetBuffs(summary.nextState.ownedLuxuryAssets || []);
    const tipBonusPct = luxuryBuffs.pokeshipTipBonusPct || 0;
    const extraTipCash =
      tipBonusPct > 0
        ? Number((((summary.tipEarned + summary.bonusEarned + 12) * tipBonusPct) / 100).toFixed(2))
        : 0;
    const finalState =
      extraTipCash > 0
        ? {
            ...summary.nextState,
            cash: summary.nextState.cash + extraTipCash,
            totalRevenue: summary.nextState.totalRevenue + extraTipCash,
          }
        : summary.nextState;

    shopStateRef.current = finalState;
    setShopState(finalState);

    const stop = summary.stopCompleted;
    const totalCashEarned = summary.cashEarned + extraTipCash;
    shopProfileManager.recordHistory({
      category: 'delivery',
      title: `PokeShip: ${stop.recipientName} (${stop.locationName})`,
      detail: `${stop.cargo.label} • Tip +$${(summary.tipEarned + extraTipCash).toFixed(2)}${
        summary.bonusEarned > 0 ? ` • Thưởng +$${summary.bonusEarned.toFixed(2)}` : ''
      }${tipBonusPct > 0 ? ` (Siêu Xe +${tipBonusPct}%)` : ''}`,
      amount: totalCashEarned,
      isIncome: true,
    });

    soundManager.playCashRegister();
    if (summary.didLevelUp) {
      soundManager.playWinChime();
    }
    confetti({
      particleCount: summary.missionFinished ? 90 : 40,
      spread: summary.missionFinished ? 85 : 55,
      origin: { y: 0.65 },
    });

    const nextStop = getActiveDeliveryStop(finalState);
    if (summary.missionFinished) {
      setToastNotification({
        type: 'success',
        message: `✅ Giao hoàn tất cho ${stop.recipientName}! Nhận +$${totalCashEarned.toFixed(
          2
        )} & +${summary.expEarned} XP${
          tipBonusPct > 0 ? ` (Đã cộng Tip Xe Sang +${tipBonusPct}%)` : ''
        }${summary.didLevelUp ? ` • 🎉 LÊN CẤP ${summary.newLevel}!` : ''}`,
      });
    } else if (nextStop) {
      setToastNotification({
        type: 'success',
        message: `📦 Đã giao điểm vừa rồi (+$${totalCashEarned.toFixed(
          2
        )})! Điểm tiếp theo: ${nextStop.recipientName} (${nextStop.locationName}).`,
      });
    }
  }, []);

  const handleCompleteDeliveryHandoffRef = useRef<() => void>(() => {});
  handleCompleteDeliveryHandoffRef.current = handleCompleteDeliveryHandoff;

  const handleClaimDailyTask = useCallback((taskId: string) => {
    const res = claimDailyTaskReward(shopStateRef.current, taskId);
    if (!res.claimed) return;

    const luxuryBuffs = getLuxuryAssetBuffs(res.nextState.ownedLuxuryAssets || []);
    const dailyBonusPct = luxuryBuffs.dailyTaskBonusPct || 0;
    const extraTaskCash =
      dailyBonusPct > 0 ? Number(((res.rewardCash * dailyBonusPct) / 100).toFixed(2)) : 0;
    const finalState =
      extraTaskCash > 0
        ? {
            ...res.nextState,
            cash: res.nextState.cash + extraTaskCash,
            totalRevenue: res.nextState.totalRevenue + extraTaskCash,
          }
        : res.nextState;

    shopStateRef.current = finalState;
    setShopState(finalState);

    const totalCash = res.rewardCash + extraTaskCash;
    shopProfileManager.recordHistory({
      category: 'delivery',
      title: 'Thưởng Nhiệm Vụ Ngày',
      detail: `Hoàn thành nhiệm vụ ngày • +${res.rewardExp} XP${
        dailyBonusPct > 0 ? ` (VinFast +${dailyBonusPct}%)` : ''
      }`,
      amount: totalCash,
      isIncome: true,
    });

    soundManager.playWinChime();
    confetti({ particleCount: 65, spread: 75, origin: { y: 0.6 } });
    setToastNotification({
      type: 'success',
      message: `🎁 Đã nhận thưởng Nhiệm Vụ Ngày: +$${totalCash.toFixed(2)} & +${res.rewardExp} XP!`,
    });
  }, []);

  const handleUpdatePrices = (updatedInventory: InventoryItem[]) => {
    setShopState((prev) => ({
      ...prev,
      inventory: updatedInventory,
    }));
  };

  const handlePurchaseUpgrade = (upgradeId: string, cost: number) => {
    soundManager.playWinChime();
    confetti({ particleCount: 40, spread: 60 });
    setShopState((prev) => {
      const expRes = applyExpGain(prev.storeExp, prev.storeLevel, 10);
      return {
        ...prev,
        cash: Math.max(0, prev.cash - cost),
        reputation: Math.min(100, prev.reputation + 10),
        storeExp: expRes.newExp,
        storeLevel: expRes.newLevel,
        storeExpToNext: expRes.newExpToNext,
        unlockedSets: expRes.didLevelUp ? getUnlockedSetsForLevel(expRes.newLevel) : prev.unlockedSets,
      };
    });
  };

  const handlePurchaseLicense = (licenseId: string, fee: number) => {
    const lic = PRODUCT_LICENSES.find((p) => p.id === licenseId);
    if (!lic) return;

    if (hasProductLicense(shopState.purchasedLicenses, licenseId)) {
      setToastNotification({
        type: 'save',
        message: `ℹ️ Bạn đã sở hữu Giấy phép "${lic.name}" rồi!`,
      });
      return;
    }

    if (shopState.cash < fee) {
      soundManager.playWrongBuzzer();
      setToastNotification({
        type: 'save',
        message: `❌ Quỹ tiệm không đủ $${fee.toFixed(2)} để mua giấy phép này!`,
      });
      return;
    }

    soundManager.playCashRegister();
    confetti({ particleCount: 70, spread: 80, origin: { y: 0.6 } });

    setShopState((prev) => {
      const updatedLicenses = Array.from(new Set([...(prev.purchasedLicenses || []), licenseId, lic.productId]));
      const cleanSetId = lic.productId.replace('_pack', '').replace('_box', '');
      const updatedUnlockedSets = Array.from(new Set([...prev.unlockedSets, cleanSetId]));

      return {
        ...prev,
        cash: Math.max(0, prev.cash - fee),
        purchasedLicenses: updatedLicenses,
        unlockedSets: updatedUnlockedSets,
      };
    });

    shopProfileManager.recordHistory({
      category: 'upgrade',
      title: `Mua Giấy Phép: ${lic.name}`,
      amount: fee,
      detail: `Mở khóa nhập hàng & bán sản phẩm "${lic.name}"`,
      isIncome: false,
    });

    setToastNotification({
      type: 'save',
      message: `📜 Mở khóa thành công: "${lic.name}"! Bạn có thể nhập hàng ngay.`,
    });
  };

  const openTabletShelfUnlocks = () => {
    setShelfMenuOpen(null);
    setTabletInitialApp('supply');
    setTabletInitialItemsSubTab('shelf_unlocks');
    setOpenModal('pc_ordering');
  };

  const handlePurchaseShelfUnlock = (shelfId: string, fee: number) => {
    const def = SHELF_UNLOCKS.find((s) => s.id === shelfId);
    if (!def) return;

    if (isShelfUnlocked(shopState.unlockedShelves, shelfId)) {
      setToastNotification({
        type: 'save',
        message: `ℹ️ Kệ "${def.shortName}" đã được mở khóa từ trước!`,
      });
      return;
    }

    if (shopState.storeLevel < def.level) {
      soundManager.playWrongBuzzer();
      setToastNotification({
        type: 'warning',
        message: `🔒 Cần đạt Cấp Cửa Hàng ${def.level} mới có thể mở "${def.shortName}" (Hiện tại: Cấp ${shopState.storeLevel})!`,
      });
      return;
    }

    if (shopState.cash < fee) {
      soundManager.playWrongBuzzer();
      setToastNotification({
        type: 'warning',
        message: `❌ Quỹ tiệm không đủ $${fee.toLocaleString()} để mở khóa "${def.shortName}"!`,
      });
      return;
    }

    soundManager.playCashRegister();
    confetti({ particleCount: 80, spread: 85, origin: { y: 0.6 } });

    setShopState((prev) => {
      const nextUnlocked = Array.from(
        new Set([...(prev.unlockedShelves || STARTER_UNLOCKED_SHELVES), shelfId])
      );
      sceneManagerRef.current?.syncUnlockedShelves(nextUnlocked);
      sceneManagerRef.current?.syncAllShelves(prev.inventory, nextUnlocked);
      sceneManagerRef.current?.syncShelfCards(prev.shelfCards || [], nextUnlocked);
      return {
        ...prev,
        cash: Math.max(0, prev.cash - fee),
        unlockedShelves: nextUnlocked,
      };
    });

    shopProfileManager.recordHistory({
      category: 'upgrade',
      title: `Mở Khóa Kệ: ${def.name}`,
      amount: fee,
      detail: `Mở khóa ${def.name} (${def.capacityText})`,
      isIncome: false,
    });

    setToastNotification({
      type: 'save',
      message: `🪜 Đã mở khóa "${def.name}" thành công! Bây giờ bạn có thể xếp thêm hàng lên kệ.`,
    });
  };

  const handleHireStaff = (
    role: StaffRole,
    action: 'hire' | 'fire'
  ) => {
    const reqLevel = getStaffUnlockLevel(role);
    if (action === 'hire' && shopState.storeLevel < reqLevel) {
      soundManager.playWrongBuzzer();
      const roleLabels: Record<StaffRole, string> = {
        cashier: 'Nhân Viên Thu Ngân',
        restocker: 'Nhân Viên Bê Hàng',
        officeStaff: 'Nhân Viên Văn Phòng',
        liveStreamer: 'Nhân Viên Livestream (PokeLive)',
        gradingReceptionist: 'Nhân Viên Nhận Hàng PSA / CGC',
        gradingSpecialists: 'Chuyên Gia Thẩm Định',
        auctioneer: 'Chủ Tọa Đấu Giá (Auctioneer)',
        auctionHost: 'MC Kéo Khách & Ký Gửi VIP',
      };
      setToastNotification({
        type: 'warning',
        message: `🔒 Cần đạt Cấp Cửa Hàng ${reqLevel} mới mở khóa thuê ${roleLabels[role]} (Hiện tại: Cấp ${shopState.storeLevel})!`,
      });
      return;
    }

    soundManager.playSelectSound();
    setShopState((prev) => {
      const current = prev.hiredStaff || {
        cashier: 0,
        restocker: 0,
        officeStaff: 0,
        liveStreamer: 0,
        gradingReceptionist: 0,
        gradingSpecialists: 0,
        auctioneer: 0,
        auctionHost: 0,
      };
      const change = action === 'hire' ? 1 : -1;
      const rawNext = Math.max(0, (current[role] || 0) + change);
      const clampedNext =
        role === 'gradingReceptionist' ||
        role === 'officeStaff' ||
        role === 'liveStreamer' ||
        role === 'auctioneer' ||
        role === 'auctionHost'
          ? Math.min(1, rawNext)
          : role === 'gradingSpecialists'
          ? Math.min(MAX_GRADING_SPECIALISTS, rawNext)
          : rawNext;
      const nextHiredStaff = {
        ...current,
        [role]: clampedNext,
      };
      let nextOffers = prev.auctionConsignmentOffers || [];
      if (
        action === 'hire' &&
        (role === 'auctioneer' || role === 'auctionHost') &&
        nextOffers.length === 0
      ) {
        const sched = getAuctionShowroomSchedule(prev.inGameHour, prev.inGameMinute);
        if (sched.isOpen) {
          nextOffers = [
            generateAuctionConsignmentOffer({
              activeTrend: prev.activeMarketTrend,
              auctionHostCount: nextHiredStaff.auctionHost || 0,
              isPrimeTime: sched.isPrimeTime,
            }),
          ];
        }
      }
      return {
        ...prev,
        hiredStaff: nextHiredStaff,
        auctionConsignmentOffers: nextOffers,
      };
    });

    if (action === 'hire' && role === 'liveStreamer') {
      setToastNotification({
        type: 'success',
        message: '🎥 Nhân Viên Livestream đã nhận việc! Nếu Phòng Live đã xây, có thể mở PokeLive lên sóng.',
      });
    } else if (action === 'hire' && role === 'auctioneer') {
      setToastNotification({
        type: 'success',
        message: '🔨 Chủ Tọa Đấu Giá đã lên bục sân khấu VIP Showroom!',
      });
    } else if (action === 'hire' && role === 'auctionHost') {
      setToastNotification({
        type: 'success',
        message: '🎤 MC Kéo Khách & Ký Gửi VIP đã lên sân khấu Showroom!',
      });
    }
  };

  // Submit RAW Pokémon & One Piece cards for PSA / CGC grading with service tiers & optional ultrasonic UV cleaning
  const handleSubmitGrading = (
    items: Array<{
      card: PokemonCard;
      sourceType: RawCardCandidate['sourceType'];
      slotIndex?: number;
      preGradeBonus?: number;
    }>,
    company: GradingCompany,
    options?: {
      tier: GradingServiceTierId;
      cleanSurface: boolean;
    }
  ) => {
    if (shopState.storeLevel < GRADING_SHOP_UNLOCK_LEVEL) {
      soundManager.playWrongBuzzer();
      setToastNotification({
        type: 'warning',
        message: `🔒 Trung Tâm Thẩm Định mở khóa tại Cấp ${GRADING_SHOP_UNLOCK_LEVEL}!`,
      });
      return;
    }

    if (!isStaffWorkingHours(shopState.inGameHour, shopState.inGameMinute)) {
      soundManager.playWrongBuzzer();
      setToastNotification({
        type: 'warning',
        message: '🌙 Nhân viên thẩm định đã tan ca! Giờ làm việc của nhân viên: 07:00 sáng – 22:00 tối.',
      });
      return;
    }

    const receptionistCount = shopState.hiredStaff?.gradingReceptionist || 0;
    const specialistsCount = shopState.hiredStaff?.gradingSpecialists || 0;
    if (receptionistCount < 1 || specialistsCount < 1) {
      soundManager.playWrongBuzzer();
      setToastNotification({
        type: 'warning',
        message: '⚠️ Hãy thuê đủ 1 Nhân viên nhận hàng và ít nhất 1 Chuyên gia thẩm định trước khi gửi thẻ!',
      });
      return;
    }

    if (!items || items.length === 0) return;

    const tierId: GradingServiceTierId = options?.tier || 'standard';
    const tierInfo = GRADING_SERVICE_TIERS[tierId] || GRADING_SERVICE_TIERS.standard;
    const cleanSurface = Boolean(options?.cleanSurface);
    const unitFee = tierInfo.fee + (cleanSurface ? GRADING_CLEANING_FEE : 0);
    const totalFee = items.length * unitFee;

    if (shopState.cash < totalFee) {
      soundManager.playWrongBuzzer();
      setToastNotification({
        type: 'warning',
        message: `❌ Không đủ tiền! Cần $${totalFee.toLocaleString()} để chấm ${items.length} thẻ ($${unitFee}/thẻ).`,
      });
      return;
    }

    const speedStats = getGradingSpeedStats(specialistsCount);
    const activeOrQueuedCount = (shopState.gradingJobs || []).filter((j) => j.status !== 'completed').length;
    if (activeOrQueuedCount + items.length > speedStats.maxQueue) {
      soundManager.playWrongBuzzer();
      setToastNotification({
        type: 'warning',
        message: `⚠️ Hàng đợi thẩm định tối đa ${speedStats.maxQueue} thẻ (${specialistsCount} chuyên gia). Hãy thuê thêm chuyên gia để chấm nhiều hơn!`,
      });
      return;
    }

    const luxurySpeedPct = getLuxuryAssetBuffs(shopState.ownedLuxuryAssets || []).gradingSpeedBonusPct || 0;
    const jobDurationMs = Math.max(
      1500,
      Math.round((speedStats.secondsPerCard * 1000) / (tierInfo.speedMultiplier * (1 + luxurySpeedPct / 100)))
    );
    soundManager.playCashRegister();

    setShopState((prev) => {
      const nextBinder = { ...prev.binderCards };
      const nextShowcase = [...prev.showcaseCards];
      const nextShelf = [...(prev.shelfCards || [])];
      const nextOpShowcase = [...(prev.opShowcaseCards || [])];
      const nextOpShelf = [...(prev.opShelfCards || [])];

      const newJobs: GradingJob[] = [];
      const now = Date.now();

      items.forEach((entry, idx) => {
        if (entry.sourceType === 'binder') {
          const curQty = nextBinder[entry.card.id] || 0;
          if (curQty <= 0) return;
          if (curQty === 1) {
            delete nextBinder[entry.card.id];
          } else {
            nextBinder[entry.card.id] = curQty - 1;
          }
        } else if (entry.sourceType === 'showcase' && entry.slotIndex !== undefined && nextShowcase[entry.slotIndex]) {
          nextShowcase[entry.slotIndex] = { ...nextShowcase[entry.slotIndex], isSold: true, isReserved: false };
        } else if (entry.sourceType === 'shelf' && entry.slotIndex !== undefined && nextShelf[entry.slotIndex]) {
          nextShelf[entry.slotIndex] = { ...nextShelf[entry.slotIndex], isSold: true, isReserved: false };
        } else if (entry.sourceType === 'op_showcase' && entry.slotIndex !== undefined && nextOpShowcase[entry.slotIndex]) {
          nextOpShowcase[entry.slotIndex] = { ...nextOpShowcase[entry.slotIndex], isSold: true, isReserved: false };
        } else if (entry.sourceType === 'op_shelf' && entry.slotIndex !== undefined && nextOpShelf[entry.slotIndex]) {
          nextOpShelf[entry.slotIndex] = { ...nextOpShelf[entry.slotIndex], isSold: true, isReserved: false };
        }

        const restoredBonus =
          entry.sourceType === 'binder' ? restoredBuybackBonusRef.current[entry.card.id] || 0 : 0;
        if (restoredBonus > 0) {
          delete restoredBuybackBonusRef.current[entry.card.id];
        }

        newJobs.push({
          id: `grade_${now}_${idx}_${Math.random().toString(36).slice(2, 7)}`,
          card: entry.card,
          sourceType: entry.sourceType,
          company,
          tier: tierId,
          cleaned: cleanSurface,
          preGradeBonus: entry.preGradeBonus || restoredBonus,
          feePaid: unitFee,
          submittedAt: now,
          durationMs: jobDurationMs,
          elapsedMs: 0,
          status: 'queued',
          rawPrice: Math.max(0.5, entry.card.marketPrice || 1),
        });
      });

      const actualFee = newJobs.length * unitFee;
      if (newJobs.length === 0) return prev;

      const combinedJobs = [...(prev.gradingJobs || []), ...newJobs];
      const advanced = advanceGradingQueue(combinedJobs, 0, specialistsCount);

      return {
        ...prev,
        cash: Math.max(0, prev.cash - actualFee),
        binderCards: nextBinder,
        showcaseCards: nextShowcase,
        shelfCards: nextShelf,
        opShowcaseCards: nextOpShowcase,
        opShelfCards: nextOpShelf,
        gradingJobs: advanced.nextJobs,
      };
    });

    shopProfileManager.recordHistory({
      category: 'upgrade',
      title: `Gửi Chấm ${company} (${tierInfo.name}): ${items.length} Thẻ`,
      amount: totalFee,
      detail: `Phí $${unitFee}/thẻ${cleanSurface ? ' (gồm Vệ sinh UV +$15)' : ''} (${items.map((i) => i.card.name).slice(0, 2).join(', ')})`,
      isIncome: false,
    });

    setToastNotification({
      type: 'info',
      message: `🔬 Đã nhận ${items.length} thẻ chấm ${company} [${tierInfo.badge}]${cleanSurface ? ' + Vệ sinh UV' : ''} (-$${totalFee}).`,
    });
  };

  // Claim a completed graded slab from the Grading Lab queue
  const handleClaimCompletedGradingJob = (
    jobId: string,
    destination: 'vault' | 'showcase' | 'sell'
  ) => {
    const job = (shopState.gradingJobs || []).find((j) => j.id === jobId);
    if (!job || job.status !== 'completed' || !job.resultSlab) return;

    const slab = job.resultSlab;
    const baseSlabValue = job.gradedPrice || job.rawPrice;
    const pulseInfo = getMarketPulseMultiplierForCard(job.card, shopState.marketPulseNews, slab);
    const grailBonusPct = getLuxuryAssetBuffs(shopState.ownedLuxuryAssets || []).grailValuationBonusPct;
    const slabValue =
      destination === 'sell'
        ? getSlabMarketValuation(job.card, slab, baseSlabValue, shopState.activeMarketTrend, {
            marketPulseMultiplier: pulseInfo.multiplier,
            grailBonusPct,
          }).effectiveValue
        : baseSlabValue;
    const listPrice = Math.round(slabValue * 1.15);

    setShopState((prev) => {
      const remainingJobs = (prev.gradingJobs || []).filter((j) => j.id !== jobId);

      if (destination === 'vault') {
        const entry: OwnedGradedSlabEntry = {
          id: `slab_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          card: job.card,
          slab,
          rawPrice: job.rawPrice,
          gradedPrice: slabValue,
          gradedAt: Date.now(),
        };
        return {
          ...prev,
          gradingJobs: remainingJobs,
          gradedSlabs: [entry, ...(prev.gradedSlabs || [])],
        };
      }

      if (destination === 'sell') {
        const prevToday = prev.todayStats || { customersServed: 0, itemsSold: 0, revenue: 0, profit: 0 };
        return {
          ...prev,
          cash: prev.cash + slabValue,
          totalRevenue: prev.totalRevenue + slabValue,
          todayStats: {
            customersServed: prevToday.customersServed,
            revenue: prevToday.revenue + slabValue,
            profit: prevToday.profit + (slabValue - (job.feePaid || GRADING_FEE_PER_CARD)),
            itemsSold: prevToday.itemsSold + 1,
          },
          gradingJobs: remainingJobs,
        };
      }

      // destination === 'showcase' -> Floor 2 for One Piece, Floor 1 for Pokémon
      if (job.card.universe === 'onepiece') {
        const placedOp = placeOpCardInDisplaySlots(
          prev.opShowcaseCards || [],
          prev.opShelfCards || [],
          {
            card: job.card,
            retailPrice: listPrice,
            isSold: false,
            isSlab: true,
            slab,
          },
          prev.unlockedShelves
        );
        return {
          ...prev,
          gradingJobs: remainingJobs,
          opShowcaseCards: placedOp.showcaseCards,
          opShelfCards: placedOp.shelfCards,
        };
      }

      const placed = placeCardInDisplaySlots(
        prev.showcaseCards,
        prev.shelfCards || [],
        {
          card: job.card,
          retailPrice: listPrice,
          isSold: false,
          isSlab: true,
          slab,
        },
        prev.unlockedShelves
      );
      return {
        ...prev,
        gradingJobs: remainingJobs,
        showcaseCards: placed.showcaseCards,
        shelfCards: placed.shelfCards,
      };
    });

    if (destination === 'sell') {
      soundManager.playCashRegister();
      shopProfileManager.recordHistory({
        category: 'sale',
        title: `Bán Slab ${slab.company} ${slab.grade}: ${job.card.name}`,
        amount: slabValue,
        detail: `${slab.company} ${slab.gradeLabel} (#${slab.certNumber})`,
        isIncome: true,
      });
      setToastNotification({
        type: 'success',
        message: `💰 Đã bán ${job.card.name} (${slab.company} ${slab.grade}) thu về +$${slabValue.toLocaleString()}!`,
      });
    } else if (destination === 'showcase') {
      soundManager.playWinChime();
      setToastNotification({
        type: 'success',
        message: `✨ Đã trưng bày ${job.card.name} (${slab.company} ${slab.grade}) lên kệ ${
          job.card.universe === 'onepiece' ? 'Tầng 2 One Piece' : 'Tầng 1 Pokémon'
        } giá $${listPrice.toLocaleString()}!`,
      });
    } else {
      soundManager.playSelectSound();
      setToastNotification({
        type: 'save',
        message: `📦 Đã cất ${job.card.name} (${slab.company} ${slab.grade}) vào Kho Slab!`,
      });
    }
  };

  // Batch claim all completed graded slabs to Owned Vault or Display Shelves
  const handleClaimAllCompletedGradingJobs = (destination: 'vault' | 'showcase') => {
    const completed = (shopState.gradingJobs || []).filter((j) => j.status === 'completed' && j.resultSlab);
    if (completed.length === 0) return;

    setShopState((prev) => {
      const doneJobs = (prev.gradingJobs || []).filter((j) => j.status === 'completed' && j.resultSlab);
      if (doneJobs.length === 0) return prev;
      const remainingJobs = (prev.gradingJobs || []).filter((j) => !(j.status === 'completed' && j.resultSlab));

      if (destination === 'vault') {
        const now = Date.now();
        const newEntries: OwnedGradedSlabEntry[] = doneJobs.map((job, idx) => ({
          id: `slab_${now}_${idx}_${Math.random().toString(36).slice(2, 7)}`,
          card: job.card,
          slab: job.resultSlab!,
          rawPrice: job.rawPrice,
          gradedPrice: job.gradedPrice || job.rawPrice,
          gradedAt: now,
        }));
        return {
          ...prev,
          gradingJobs: remainingJobs,
          gradedSlabs: [...newEntries, ...(prev.gradedSlabs || [])],
        };
      }

      let nextShowcase = [...prev.showcaseCards];
      let nextShelf = [...(prev.shelfCards || [])];
      let nextOpShowcase = [...(prev.opShowcaseCards || [])];
      let nextOpShelf = [...(prev.opShelfCards || [])];

      doneJobs.forEach((job) => {
        const slab = job.resultSlab!;
        const listPrice = Math.round((job.gradedPrice || job.rawPrice) * 1.15);
        if (job.card.universe === 'onepiece') {
          const placed = placeOpCardInDisplaySlots(
            nextOpShowcase,
            nextOpShelf,
            { card: job.card, retailPrice: listPrice, isSold: false, isSlab: true, slab },
            prev.unlockedShelves
          );
          nextOpShowcase = placed.showcaseCards;
          nextOpShelf = placed.shelfCards;
        } else {
          const placed = placeCardInDisplaySlots(
            nextShowcase,
            nextShelf,
            { card: job.card, retailPrice: listPrice, isSold: false, isSlab: true, slab },
            prev.unlockedShelves
          );
          nextShowcase = placed.showcaseCards;
          nextShelf = placed.shelfCards;
        }
      });

      return {
        ...prev,
        gradingJobs: remainingJobs,
        showcaseCards: nextShowcase,
        shelfCards: nextShelf,
        opShowcaseCards: nextOpShowcase,
        opShelfCards: nextOpShelf,
      };
    });

    soundManager.playWinChime();
    setToastNotification({
      type: 'success',
      message:
        destination === 'vault'
          ? `📦 Đã chuyển nhanh ${completed.length} Slab hoàn tất vào Kho Bảo Quản!`
          : `✨ Đã bày nhanh ${completed.length} Slab hoàn tất lên kệ trưng bày Shop!`,
    });
  };

  // Approve a walk-in Customer Grading Commission at the Lab counter
  const handleApproveCustomerGradingOrder = (orderId: string) => {
    if (!isStaffWorkingHours(shopState.inGameHour, shopState.inGameMinute)) {
      soundManager.playWrongBuzzer();
      setToastNotification({
        type: 'warning',
        message: '🌙 Nhân viên đã tan ca (07:00 – 22:00)! Vui lòng tiếp nhận đơn vào ban ngày.',
      });
      return;
    }
    const specialistsCount = shopState.hiredStaff?.gradingSpecialists || 0;
    if (specialistsCount < 1) {
      soundManager.playWrongBuzzer();
      setToastNotification({
        type: 'warning',
        message: '⚠️ Cần thuê ít nhất 1 Chuyên gia thẩm định để nhận đơn gia công của khách!',
      });
      return;
    }

    const order = (shopState.customerGradingOrders || []).find((o) => o.id === orderId);
    if (!order || order.status !== 'waiting_approval') return;

    if (shopState.cash < order.labCost) {
      soundManager.playWrongBuzzer();
      setToastNotification({
        type: 'warning',
        message: `❌ Không đủ tiền ứng vật tư hộp Slab ($${order.labCost}) để nhận đơn của ${order.customerName}!`,
      });
      return;
    }

    soundManager.playCashRegister();
    setShopState((prev) => ({
      ...prev,
      cash: Math.max(0, prev.cash - order.labCost),
      customerGradingOrders: (prev.customerGradingOrders || []).map((o) =>
        o.id === orderId ? { ...o, status: 'grading' as const } : o
      ),
    }));

    setToastNotification({
      type: 'info',
      message: `🔬 Đã nhận đơn khách ${order.customerName} (${order.card.name} • ${order.company}). Chi vật tư -$${order.labCost}.`,
    });
  };

  // Hand completed Slab back to customer & collect full service fee
  const handleCompleteCustomerGradingOrder = (orderId: string) => {
    const order = (shopState.customerGradingOrders || []).find((o) => o.id === orderId);
    if (!order || order.status !== 'ready_pickup') return;

    soundManager.playCashRegister();
    setShopState((prev) => {
      const target = (prev.customerGradingOrders || []).find((o) => o.id === orderId);
      if (!target || target.status !== 'ready_pickup') return prev;
      const remaining = (prev.customerGradingOrders || []).filter((o) => o.id !== orderId);
      const prevToday = prev.todayStats || { customersServed: 0, itemsSold: 0, revenue: 0, profit: 0 };
      const expRes = applyExpGain(prev.storeExp, prev.storeLevel, 35);
      const prevStats = prev.gradingLabStats || {
        totalGraded: 0,
        psaCount: 0,
        cgcCount: 0,
        grade10Count: 0,
        pristine10Count: 0,
        totalFeesSpent: 0,
        totalSlabValueCreated: 0,
        customerOrdersCompleted: 0,
        customerServiceProfit: 0,
      };
      return {
        ...prev,
        cash: prev.cash + target.customerPaysFee,
        totalRevenue: prev.totalRevenue + target.customerPaysFee,
        reputation: Math.min(100, (prev.reputation || 0) + 1),
        storeExp: expRes.newExp,
        storeLevel: expRes.newLevel,
        storeExpToNext: expRes.newExpToNext,
        unlockedSets: expRes.didLevelUp ? getUnlockedSetsForLevel(expRes.newLevel) : prev.unlockedSets,
        todayStats: {
          customersServed: prevToday.customersServed + 1,
          itemsSold: prevToday.itemsSold + 1,
          revenue: prevToday.revenue + target.customerPaysFee,
          profit: prevToday.profit + target.netProfit,
        },
        gradingLabStats: {
          ...prevStats,
          customerOrdersCompleted: (prevStats.customerOrdersCompleted || 0) + 1,
          customerServiceProfit: (prevStats.customerServiceProfit || 0) + target.netProfit,
        },
        customerGradingOrders: remaining,
      };
    });

    shopProfileManager.recordHistory({
      category: 'sale',
      title: `Dịch Vụ Chấm Thẻ Khách: ${order.customerName}`,
      amount: order.customerPaysFee,
      detail: `${order.card.name} • ${order.company} ${order.resultSlab?.gradeLabel || ''} (Lãi ròng +$${order.netProfit})`,
      isIncome: true,
    });

    setToastNotification({
      type: 'success',
      message: `💰 Trả Slab cho ${order.customerName} (${order.resultSlab?.company} ${order.resultSlab?.gradeLabel}) thu +$${order.customerPaysFee} (Lãi +$${order.netProfit})!`,
    });
  };

  // Showcase or Sell an already-claimed slab from the Owned Slab Vault
  const handleActionOwnedSlab = (slabEntryId: string, action: 'showcase' | 'sell') => {
    const entry = (shopState.gradedSlabs || []).find((s) => s.id === slabEntryId);
    if (!entry) return;

    const pulseInfo = getMarketPulseMultiplierForCard(
      entry.card,
      shopState.marketPulseNews,
      entry.slab
    );
    const grailBonusPct = getLuxuryAssetBuffs(shopState.ownedLuxuryAssets || []).grailValuationBonusPct;
    const effectiveSellValue = getSlabMarketValuation(
      entry.card,
      entry.slab,
      entry.gradedPrice,
      shopState.activeMarketTrend,
      { marketPulseMultiplier: pulseInfo.multiplier, grailBonusPct }
    ).effectiveValue;
    const listPrice = Math.round(entry.gradedPrice * 1.15);

    setShopState((prev) => {
      const remainingSlabs = (prev.gradedSlabs || []).filter((s) => s.id !== slabEntryId);

      if (action === 'sell') {
        const prevToday = prev.todayStats || { customersServed: 0, itemsSold: 0, revenue: 0, profit: 0 };
        return {
          ...prev,
          cash: prev.cash + effectiveSellValue,
          totalRevenue: prev.totalRevenue + effectiveSellValue,
          todayStats: {
            customersServed: prevToday.customersServed,
            revenue: prevToday.revenue + effectiveSellValue,
            profit: prevToday.profit + effectiveSellValue,
            itemsSold: prevToday.itemsSold + 1,
          },
          gradedSlabs: remainingSlabs,
        };
      }

      if (entry.card.universe === 'onepiece') {
        const placedOp = placeOpCardInDisplaySlots(
          prev.opShowcaseCards || [],
          prev.opShelfCards || [],
          {
            card: entry.card,
            retailPrice: listPrice,
            isSold: false,
            isSlab: true,
            slab: entry.slab,
          },
          prev.unlockedShelves
        );
        return {
          ...prev,
          gradedSlabs: remainingSlabs,
          opShowcaseCards: placedOp.showcaseCards,
          opShelfCards: placedOp.shelfCards,
        };
      }

      const placed = placeCardInDisplaySlots(
        prev.showcaseCards,
        prev.shelfCards || [],
        {
          card: entry.card,
          retailPrice: listPrice,
          isSold: false,
          isSlab: true,
          slab: entry.slab,
        },
        prev.unlockedShelves
      );
      return {
        ...prev,
        gradedSlabs: remainingSlabs,
        showcaseCards: placed.showcaseCards,
        shelfCards: placed.shelfCards,
      };
    });

    if (action === 'sell') {
      soundManager.playCashRegister();
      shopProfileManager.recordHistory({
        category: 'sale',
        title: `Bán Slab ${entry.slab.company} ${entry.slab.grade}: ${entry.card.name}`,
        amount: effectiveSellValue,
        detail: `Xuất bán từ Kho Slab (#${entry.slab.certNumber})`,
        isIncome: true,
      });
      setToastNotification({
        type: 'success',
        message: `💰 Đã bán ${entry.card.name} (${entry.slab.company} ${entry.slab.grade}) +$${effectiveSellValue.toLocaleString()}!`,
      });
    } else {
      soundManager.playWinChime();
      setToastNotification({
        type: 'success',
        message: `✨ Đã trưng bày ${entry.card.name} (${entry.slab.company} ${entry.slab.grade}) lên kệ bán giá $${listPrice.toLocaleString()}!`,
      });
    }
  };

  // Start a Live VIP Auction in the Showroom from a Slab in Vault
  const handleStartSlabAuction = (
    slabEntryId: string,
    startPrice: number,
    reservePrice: number,
    durationMs: number = 28000
  ) => {
    const currentLots = shopStateRef.current.slabAuctions || [];
    if (currentLots.length >= 2) {
      soundManager.playWrongBuzzer();
      setToastNotification({
        type: 'warning',
        message: '⚠️ Sàn đấu giá đang chạy tối đa 2 lô cùng lúc! Hãy chốt phiên xong trước khi gửi thêm.',
      });
      return;
    }

    const entry = (shopStateRef.current.gradedSlabs || []).find((s) => s.id === slabEntryId);
    if (!entry) return;

    const latest = shopStateRef.current;
    const schedule = getAuctionShowroomSchedule(latest.inGameHour, latest.inGameMinute);
    const lot = startSlabAuction({
      entry,
      startPrice,
      reservePrice,
      durationMs,
      storeLevel: latest.storeLevel,
      reputation: latest.reputation,
      activeTrend: latest.activeMarketTrend,
      auctioneerCount: latest.hiredStaff?.auctioneer || 0,
      auctionHostCount: latest.hiredStaff?.auctionHost || 0,
      isPrimeTime: schedule.isPrimeTime,
    });

    soundManager.playWinChime();
    setShopState((prev) => ({
      ...prev,
      gradedSlabs: (prev.gradedSlabs || []).filter((s) => s.id !== slabEntryId),
      slabAuctions: [lot, ...(prev.slabAuctions || [])],
    }));

    setToastNotification({
      type: 'success',
      message: `🔨 Đã đưa ${entry.card.name} (${entry.slab.company} ${entry.slab.gradeLabel}) lên Bục Đấu Giá VIP! Giá khởi điểm $${lot.startPrice.toLocaleString()}.`,
    });
  };

  // Start a VIP Consignment Auction Lot (requires hired Auctioneer during 09:00-22:00)
  const handleStartConsignmentAuction = () => {
    const latest = shopStateRef.current;
    const auctioneerCount = latest.hiredStaff?.auctioneer || 0;
    const auctionHostCount = latest.hiredStaff?.auctionHost || 0;
    if (auctioneerCount < 1) {
      soundManager.playWrongBuzzer();
      setToastNotification({
        type: 'warning',
        message: '⚠️ Cần thuê Chủ Tọa Đấu Giá (Auctioneer) trước khi nhận lô Ký Gửi VIP!',
      });
      return;
    }
    const schedule = getAuctionShowroomSchedule(latest.inGameHour, latest.inGameMinute);
    if (!schedule.isOpen) {
      soundManager.playWrongBuzzer();
      setToastNotification({
        type: 'warning',
        message: '🌙 Sàn Đấu Giá VIP chỉ mở cửa nhận Ký Gửi từ 09:00 – 22:00!',
      });
      return;
    }
    if ((latest.slabAuctions || []).length >= 2) {
      soundManager.playWrongBuzzer();
      setToastNotification({
        type: 'warning',
        message: '⚠️ Sàn đấu giá đang chạy tối đa 2 lô cùng lúc!',
      });
      return;
    }

    const lot = createConsignmentAuctionLot({
      storeLevel: latest.storeLevel,
      reputation: latest.reputation,
      activeTrend: latest.activeMarketTrend,
      auctioneerCount,
      auctionHostCount,
      isPrimeTime: schedule.isPrimeTime,
      durationMs: 24000,
    });

    soundManager.playWinChime();
    setShopState((prev) => ({
      ...prev,
      slabAuctions: [lot, ...(prev.slabAuctions || [])],
    }));
    setToastNotification({
      type: 'success',
      message: `👑 Nhận ký gửi VIP từ ${lot.consignorName}: ${lot.entry.card.name} (${lot.entry.slab.company} ${lot.entry.slab.gradeLabel})!`,
    });
  };

  // Invite a new NPC Collector to submit a card into the Consignment Queue
  const handleInviteConsignmentOffer = () => {
    const latest = shopStateRef.current;
    const auctioneerCount = latest.hiredStaff?.auctioneer || 0;
    const auctionHostCount = latest.hiredStaff?.auctionHost || 0;
    if (auctioneerCount < 1 && auctionHostCount < 1) {
      soundManager.playWrongBuzzer();
      setToastNotification({
        type: 'warning',
        message: '⚠️ Cần thuê Chủ Tọa Đấu Giá hoặc MC Kéo Khách VIP để mời nhà sưu tầm ký gửi thẻ!',
      });
      return;
    }
    const schedule = getAuctionShowroomSchedule(latest.inGameHour, latest.inGameMinute);
    if (!schedule.isOpen) {
      soundManager.playWrongBuzzer();
      setToastNotification({
        type: 'warning',
        message: '🌙 Sàn Đấu Giá VIP chỉ nhận thẻ ký gửi trong khung giờ 09:00 – 22:00!',
      });
      return;
    }
    const existing = latest.auctionConsignmentOffers || [];
    if (existing.length >= 4) {
      soundManager.playWrongBuzzer();
      setToastNotification({
        type: 'warning',
        message: '📋 Hàng chờ Ký Gửi NPC đã đầy (tối đa 4 thẻ). Hãy duyệt đưa lên sàn hoặc từ chối bớt!',
      });
      return;
    }

    const offer: AuctionConsignmentOffer = generateAuctionConsignmentOffer({
      activeTrend: latest.activeMarketTrend,
      auctionHostCount,
      isPrimeTime: schedule.isPrimeTime,
    });
    soundManager.playSelectSound();
    setShopState((prev) => ({
      ...prev,
      auctionConsignmentOffers: [offer, ...(prev.auctionConsignmentOffers || [])].slice(0, 4),
    }));
    setToastNotification({
      type: 'info',
      message: `📩 ${offer.consignorName} vừa gửi ${offer.entry.card.name} (${offer.entry.slab.company} ${offer.entry.slab.gradeLabel}) xin ký gửi lên sàn (HH ${Math.round(offer.commissionRate * 100)}%)!`,
    });
  };

  // Approve an NPC Consignment Offer and put it live on the VIP Auction Stage
  const handleAcceptConsignmentOffer = (offerId: string) => {
    const latest = shopStateRef.current;
    const auctioneerCount = latest.hiredStaff?.auctioneer || 0;
    const auctionHostCount = latest.hiredStaff?.auctionHost || 0;
    if (auctioneerCount < 1) {
      soundManager.playWrongBuzzer();
      setToastNotification({
        type: 'warning',
        message: '⚠️ Cần thuê Chủ Tọa Đấu Giá (Auctioneer) để khai sàn cho thẻ ký gửi NPC!',
      });
      return;
    }
    const schedule = getAuctionShowroomSchedule(latest.inGameHour, latest.inGameMinute);
    if (!schedule.isOpen) {
      soundManager.playWrongBuzzer();
      setToastNotification({
        type: 'warning',
        message: '🌙 Sàn Đấu Giá VIP đang đóng cửa (Mở 09:00 – 22:00)!',
      });
      return;
    }
    if ((latest.slabAuctions || []).length >= 2) {
      soundManager.playWrongBuzzer();
      setToastNotification({
        type: 'warning',
        message: '⚠️ Sàn đang chạy tối đa 2 lô cùng lúc! Hãy chốt xong 1 lô trước khi đưa thêm thẻ ký gửi.',
      });
      return;
    }
    const offer = (latest.auctionConsignmentOffers || []).find((o) => o.id === offerId);
    if (!offer) return;

    const lot = startAuctionFromConsignmentOffer({
      offer,
      storeLevel: latest.storeLevel,
      reputation: latest.reputation,
      activeTrend: latest.activeMarketTrend,
      auctioneerCount,
      auctionHostCount,
      isPrimeTime: schedule.isPrimeTime,
      durationMs: 26000,
    });

    soundManager.playWinChime();
    setShopState((prev) => ({
      ...prev,
      auctionConsignmentOffers: (prev.auctionConsignmentOffers || []).filter((o) => o.id !== offerId),
      slabAuctions: [lot, ...(prev.slabAuctions || [])],
    }));
    setToastNotification({
      type: 'success',
      message: `👑 Đã đưa thẻ ký gửi của ${offer.consignorName}: ${offer.entry.card.name} lên sàn! Hoa hồng: ${Math.round(offer.commissionRate * 100)}%.`,
    });
  };

  // Decline an NPC Consignment Offer
  const handleDeclineConsignmentOffer = (offerId: string) => {
    soundManager.playSelectSound();
    setShopState((prev) => ({
      ...prev,
      auctionConsignmentOffers: (prev.auctionConsignmentOffers || []).filter((o) => o.id !== offerId),
    }));
  };

  // Allow User (Shop Owner) to place a live bid on an NPC Consignment lot to acquire the Slab
  const handlePlaceUserBidOnAuction = (lotId: string, stepPct: number = 0.06) => {
    const latest = shopStateRef.current;
    const lot = (latest.slabAuctions || []).find((l) => l.id === lotId);
    if (!lot || lot.status !== 'live' || !lot.isConsignment) return;

    if (lot.highestBidderIsPlayer) {
      soundManager.playSelectSound();
      setToastNotification({
        type: 'info',
        message: '💎 Bạn đang là người dẫn đầu giá cho lô này rồi!',
      });
      return;
    }

    const bidRes = placeUserBidOnAuctionLot(lot, stepPct);
    if (!bidRes) return;

    if (latest.cash < bidRes.netPayableIfWin) {
      soundManager.playWrongBuzzer();
      setToastNotification({
        type: 'warning',
        message: `💸 Không đủ tiền mặt! Cần tối thiểu $${bidRes.netPayableIfWin.toLocaleString()} (đã trừ hoa hồng của bạn).`,
      });
      return;
    }

    soundManager.playQuarterDrop();
    setShopState((prev) => ({
      ...prev,
      slabAuctions: (prev.slabAuctions || []).map((l) => (l.id === lotId ? bidRes.nextLot : l)),
    }));
  };

  // Settle an ended Live Auction (collect commission/payout if reserve met, handle player win, else return slab)
  const handleSettleSlabAuction = (lotId: string) => {
    const latest = shopStateRef.current;
    const lot = (latest.slabAuctions || []).find((l) => l.id === lotId);
    if (!lot) return;

    const bonusCommissionPct = getLuxuryAssetBuffs(latest.ownedLuxuryAssets || []).commissionBonusPct;
    const res = settleSlabAuction(lot, bonusCommissionPct);

    // If the user won the NPC consignment lot, make sure they have enough cash for netCostToPlayer
    if (res.sold && res.wonByPlayer && latest.cash < res.netCostToPlayer) {
      soundManager.playWrongBuzzer();
      setShopState((prev) => ({
        ...prev,
        slabAuctions: (prev.slabAuctions || []).filter((l) => l.id !== lotId),
      }));
      setToastNotification({
        type: 'warning',
        message: `⚠️ Không đủ $${res.netCostToPlayer.toLocaleString()} để thanh toán cho ${lot.consignorName || 'chủ thẻ'}. Thẻ ký gửi đã được hoàn trả chủ cũ!`,
      });
      return;
    }

    setShopState((prev) => {
      const remainingLots = (prev.slabAuctions || []).filter((l) => l.id !== lotId);
      const nextHistory = [res.record, ...(prev.auctionHistory || [])].slice(0, 20);
      const expRes = applyExpGain(prev.storeExp, prev.storeLevel, res.xpBonus);
      const prevToday = prev.todayStats || { customersServed: 0, itemsSold: 0, revenue: 0, profit: 0 };
      const prevStats = prev.gradingLabStats;

      if (!res.sold) {
        return {
          ...prev,
          slabAuctions: remainingLots,
          auctionHistory: nextHistory,
          gradedSlabs: res.isConsignment
            ? prev.gradedSlabs || []
            : [lot.entry, ...(prev.gradedSlabs || [])],
          storeExp: expRes.newExp,
          storeLevel: expRes.newLevel,
          storeExpToNext: expRes.newExpToNext,
          unlockedSets: expRes.didLevelUp ? getUnlockedSetsForLevel(expRes.newLevel) : prev.unlockedSets,
        };
      }

      if (res.wonByPlayer) {
        return {
          ...prev,
          cash: prev.cash - res.netCostToPlayer,
          reputation: Math.min(100, (prev.reputation || 0) + res.repBonus),
          storeExp: expRes.newExp,
          storeLevel: expRes.newLevel,
          storeExpToNext: expRes.newExpToNext,
          unlockedSets: expRes.didLevelUp ? getUnlockedSetsForLevel(expRes.newLevel) : prev.unlockedSets,
          gradedSlabs: [lot.entry, ...(prev.gradedSlabs || [])],
          gradingLabStats: prevStats
            ? {
                ...prevStats,
                auctionsCompleted: (prevStats.auctionsCompleted || 0) + 1,
                consignmentLotsCompleted: (prevStats.consignmentLotsCompleted || 0) + 1,
                consignmentCommissionEarned:
                  (prevStats.consignmentCommissionEarned || 0) + res.commissionEarned,
              }
            : undefined,
          slabAuctions: remainingLots,
          auctionHistory: nextHistory,
        };
      }

      return {
        ...prev,
        cash: prev.cash + res.payoutToPlayer,
        totalRevenue: prev.totalRevenue + res.payoutToPlayer,
        reputation: Math.min(100, (prev.reputation || 0) + res.repBonus),
        storeExp: expRes.newExp,
        storeLevel: expRes.newLevel,
        storeExpToNext: expRes.newExpToNext,
        unlockedSets: expRes.didLevelUp ? getUnlockedSetsForLevel(expRes.newLevel) : prev.unlockedSets,
        todayStats: {
          customersServed: prevToday.customersServed + 1,
          itemsSold: prevToday.itemsSold + 1,
          revenue: prevToday.revenue + res.payoutToPlayer,
          profit: prevToday.profit + res.netProfit,
        },
        gradingLabStats: prevStats
          ? {
              ...prevStats,
              auctionsCompleted: (prevStats.auctionsCompleted || 0) + 1,
              auctionProfit: (prevStats.auctionProfit || 0) + res.netProfit,
              consignmentLotsCompleted:
                (prevStats.consignmentLotsCompleted || 0) + (res.isConsignment ? 1 : 0),
              consignmentCommissionEarned:
                (prevStats.consignmentCommissionEarned || 0) + res.commissionEarned,
            }
          : undefined,
        slabAuctions: remainingLots,
        auctionHistory: nextHistory,
      };
    });

    if (res.sold) {
      soundManager.playCashRegister();
      if (res.finalPrice >= 1000) {
        soundManager.playRarePullFanfare();
        confetti({
          particleCount: 150,
          spread: 90,
          origin: { y: 0.5 },
          colors: ['#fbbf24', '#ef4444', '#38bdf8', '#ffffff'],
        });
      }
      const commPct = Math.round((lot.commissionRate ?? AUCTION_BROKER_COMMISSION_RATE) * 100);
      shopProfileManager.recordHistory({
        category: res.wonByPlayer ? 'order' : 'sale',
        title: res.wonByPlayer
          ? `Thắng Đấu Giá Ký Gửi: ${lot.entry.card.name}`
          : res.isConsignment
          ? `Hoa Hồng Ký Gửi (${commPct}%): ${lot.entry.card.name}`
          : `Gõ Búa Đấu Giá Thẻ Shop: ${lot.entry.card.name}`,
        amount: res.wonByPlayer ? res.netCostToPlayer : res.payoutToPlayer,
        detail: res.wonByPlayer
          ? `Thắng búa $${res.finalPrice.toLocaleString()} · Trả chủ thẻ -$${res.netCostToPlayer.toLocaleString()} (đã trừ ${commPct}% HH) & nhập Kho Slab`
          : res.isConsignment
          ? `Bán $${res.finalPrice.toLocaleString()} cho ${lot.highestBidderName || 'VIP'} · Nhận ${commPct}% HH (+$${res.commissionEarned.toLocaleString()})`
          : `${lot.entry.slab.company} ${lot.entry.slab.gradeLabel} bán cho ${lot.highestBidderName || 'VIP'} (+$${res.netProfit.toLocaleString()} lãi)`,
        isIncome: !res.wonByPlayer,
      });
      setToastNotification({
        type: 'success',
        message: res.wonByPlayer
          ? `🏆 Bạn thắng đấu giá ${lot.entry.card.name}! Trả $${res.netCostToPlayer.toLocaleString()} (đã khấu trừ ${commPct}% HH) & cất Slab vào Kho!`
          : res.isConsignment
          ? `👑 SOLD Ký Gửi! ${lot.entry.card.name} gõ búa $${res.finalPrice.toLocaleString()} → Nhận +$${res.commissionEarned.toLocaleString()} (${commPct}% HH)!`
          : `🔨 SOLD! ${lot.entry.card.name} gõ búa $${res.finalPrice.toLocaleString()} cho ${lot.highestBidderName}! (+${res.xpBonus} XP)`,
      });
    } else {
      soundManager.playSelectSound();
      setToastNotification({
        type: 'warning',
        message: res.isConsignment
          ? `ℹ️ Lô ký gửi chưa chạm giá sàn $${lot.reservePrice.toLocaleString()}. Đã hoàn trả thẻ cho ${lot.consignorName || 'chủ thẻ'}.`
          : `ℹ️ Chưa chạm giá sàn $${lot.reservePrice.toLocaleString()}. Đã hoàn trả ${lot.entry.card.name} về Kho Slab!`,
      });
    }
  };

  // Crack an existing Slab & Crossover / Re-Grade with target company
  const handleCrackAndRegradeSlab = (slabEntryId: string, targetCompany: GradingCompany) => {
    if (!isStaffWorkingHours(shopState.inGameHour, shopState.inGameMinute)) {
      soundManager.playWrongBuzzer();
      setToastNotification({
        type: 'warning',
        message: '🌙 Nhân viên đã tan ca (07:00 – 22:00)! Quay lại vào ban ngày để đập hộp chấm lại.',
      });
      return;
    }
    const specialistsCount = shopState.hiredStaff?.gradingSpecialists || 0;
    if (specialistsCount < 1) {
      soundManager.playWrongBuzzer();
      setToastNotification({
        type: 'warning',
        message: '⚠️ Cần thuê ít nhất 1 Chuyên gia thẩm định để thao tác đập vỏ siêu âm!',
      });
      return;
    }

    const entry = (shopStateRef.current.gradedSlabs || []).find((s) => s.id === slabEntryId);
    if (!entry) return;

    const totalCost = CRACK_REGRADE_FEE + GRADING_SERVICE_TIERS.standard.fee + GRADING_CLEANING_FEE;
    if (shopStateRef.current.cash < totalCost) {
      soundManager.playWrongBuzzer();
      setToastNotification({
        type: 'warning',
        message: `❌ Không đủ tiền đập hộp & chấm lại (Cần $${totalCost})!`,
      });
      return;
    }

    const riskReductionPct = getLuxuryAssetBuffs(
      shopStateRef.current.ownedLuxuryAssets || []
    ).crossoverRiskReductionPct;
    const res = crackAndRegradeSlab({
      entry,
      targetCompany,
      tier: 'standard',
      cleanSurface: true,
      specialistsCount,
      riskReductionPct,
    });

    setShopState((prev) => {
      const updatedStats = recordGradedSlabIntoStats(
        prev.gradingLabStats,
        prev.gradingPopReport,
        res.newEntry.card,
        res.newEntry.slab,
        res.newEntry.gradedPrice,
        res.feePaid
      );
      return {
        ...prev,
        cash: Math.max(0, prev.cash - res.feePaid),
        gradedSlabs: (prev.gradedSlabs || []).map((s) => (s.id === slabEntryId ? res.newEntry : s)),
        gradingLabStats: updatedStats.nextStats,
        gradingPopReport: updatedStats.nextPop,
      };
    });

    shopProfileManager.recordHistory({
      category: 'order',
      title: `Crossover Đập Hộp → ${targetCompany}`,
      amount: res.feePaid,
      detail: `${entry.card.name} (${entry.slab.company} ${entry.slab.grade} → ${targetCompany} ${res.newEntry.slab.gradeLabel})`,
      isIncome: false,
    });

    if (res.newEntry.slab.gradeLabel.includes('BLACK LABEL') || res.gradeImproved) {
      soundManager.playRarePullFanfare();
      confetti({
        particleCount: 140,
        spread: 85,
        origin: { y: 0.5 },
        colors: ['#fbbf24', '#18181b', '#f59e0b', '#ffffff'],
      });
    } else if (res.didDamage) {
      soundManager.playWrongBuzzer();
    } else {
      soundManager.playWinChime();
    }

    setToastNotification({
      type: res.didDamage ? 'warning' : 'success',
      message: res.summary,
    });
  };

  // Equip protective anodized Slab Guard bumper ($12)
  const handleEquipSlabGuard = (slabEntryId: string, guardColor: SlabGuardColor) => {
    const entry = (shopStateRef.current.gradedSlabs || []).find((s) => s.id === slabEntryId);
    if (!entry) return;
    if (entry.slab.slabGuardColor === guardColor) return;

    if (guardColor !== 'none' && shopStateRef.current.cash < SLAB_GUARD_FEE) {
      soundManager.playWrongBuzzer();
      setToastNotification({
        type: 'warning',
        message: `❌ Cần $${SLAB_GUARD_FEE} để gắn ốp bảo vệ Slab Guard!`,
      });
      return;
    }

    soundManager.playSelectSound();
    setShopState((prev) => ({
      ...prev,
      cash: guardColor !== 'none' ? Math.max(0, prev.cash - SLAB_GUARD_FEE) : prev.cash,
      gradedSlabs: (prev.gradedSlabs || []).map((s) =>
        s.id === slabEntryId ? { ...s, slab: { ...s.slab, slabGuardColor: guardColor } } : s
      ),
    }));

    setToastNotification({
      type: 'success',
      message: `🛡️ Đã gắn Slab Guard cho ${entry.card.name} (+5% giá trị sưu tầm & trần đấu giá)!`,
    });
  };

  // Inspect Walk-In Buyback Seller's Raw Card with 10x Loupe (free)
  const handleInspectBuybackOffer = (offerId: string) => {
    soundManager.playSelectSound();
    setShopState((prev) => ({
      ...prev,
      buybackOffers: (prev.buybackOffers || []).map((o) =>
        o.id === offerId ? { ...o, inspected: true } : o
      ),
    }));
  };

  // Scan Walk-In Buyback Card under UV & Holo Loupe ($8) to detect Counterfeit Proxies
  const handleScanBuybackAuthenticity = (offerId: string) => {
    const offer = (shopStateRef.current.buybackOffers || []).find((o) => o.id === offerId);
    if (!offer || offer.scannedAuthenticity) return;
    if (shopStateRef.current.cash < COUNTERFEIT_SCAN_FEE) {
      soundManager.playWrongBuzzer();
      setToastNotification({
        type: 'warning',
        message: `❌ Cần $${COUNTERFEIT_SCAN_FEE} để chạy máy soi UV kiểm định thật/giả!`,
      });
      return;
    }

    const scanRes = scanCardCounterfeitCheck({ isCounterfeit: Boolean(offer.isCounterfeit) });
    if (scanRes.isFake) {
      soundManager.playWrongBuzzer();
    } else {
      soundManager.playWinChime();
    }

    setShopState((prev) => ({
      ...prev,
      cash: Math.max(0, prev.cash - scanRes.feePaid),
      buybackOffers: (prev.buybackOffers || []).map((o) =>
        o.id === offerId
          ? {
              ...o,
              scannedAuthenticity: true,
              detectedFake: scanRes.isFake,
              inspected: true,
            }
          : o
      ),
    }));

    setToastNotification({
      type: scanRes.isFake ? 'warning' : 'success',
      message: scanRes.reportMessage,
    });
  };

  // Press & UV Restore Walk-In Buyback Card ($18) to upgrade Condition + Raw Value + +4% Grade 10 Odds
  const handleRestoreBuybackCard = (offerId: string) => {
    const offer = (shopStateRef.current.buybackOffers || []).find((o) => o.id === offerId);
    if (!offer || offer.restored || offer.detectedFake) return;
    if (shopStateRef.current.cash < RESTORE_CARD_FEE) {
      soundManager.playWrongBuzzer();
      setToastNotification({
        type: 'warning',
        message: `❌ Cần $${RESTORE_CARD_FEE} cho dung dịch ép phẳng & khử ẩm UV!`,
      });
      return;
    }

    const res = restoreCardCondition({
      card: offer.card,
      currentCondition: offer.condition || 'LP',
      currentRawPrice: offer.rawMarketPrice,
      preGradeBonus: offer.preGradeBonus || 0,
    });

    soundManager.playWinChime();
    setShopState((prev) => ({
      ...prev,
      cash: Math.max(0, prev.cash - res.feePaid),
      buybackOffers: (prev.buybackOffers || []).map((o) =>
        o.id === offerId
          ? {
              ...o,
              condition: res.nextCondition,
              rawMarketPrice: res.nextRawPrice,
              preGradeBonus: res.nextPreGradeBonus,
              restored: true,
            }
          : o
      ),
    }));

    setToastNotification({
      type: 'success',
      message: res.message,
    });
  };

  // Report detected Fake Proxy to Police (+$30 bounty + +2 Reputation)
  const handleReportFakeBuyback = (offerId: string) => {
    const offer = (shopStateRef.current.buybackOffers || []).find((o) => o.id === offerId);
    if (!offer || !offer.detectedFake) return;

    soundManager.playCashRegister();
    soundManager.playWinChime();
    setShopState((prev) => ({
      ...prev,
      cash: prev.cash + FAKE_REPORT_BOUNTY,
      totalRevenue: prev.totalRevenue + FAKE_REPORT_BOUNTY,
      reputation: Math.min(100, (prev.reputation || 0) + 2),
      buybackOffers: (prev.buybackOffers || []).filter((o) => o.id !== offerId),
    }));

    shopProfileManager.recordHistory({
      category: 'sale',
      title: `Tố Cáo Thẻ Giả: ${offer.card.name}`,
      amount: FAKE_REPORT_BOUNTY,
      detail: `Thu giữ thẻ Fake Proxy từ ${offer.sellerName} (+2 Uy Tín)`,
      isIncome: true,
    });

    setToastNotification({
      type: 'success',
      message: `🚓 Đã báo Công An tịch thu thẻ giả của ${offer.sellerName}! Nhận thưởng +$${FAKE_REPORT_BOUNTY} & +2 Uy Tín!`,
    });
  };

  // Purchase Walk-In Buyback Card into Binder
  const handleAcceptBuybackOffer = (offerId: string) => {
    const offer = (shopStateRef.current.buybackOffers || []).find((o) => o.id === offerId);
    if (!offer) return;
    if (shopStateRef.current.cash < offer.askingPrice) {
      soundManager.playWrongBuzzer();
      setToastNotification({
        type: 'warning',
        message: `❌ Không đủ tiền thu mua ${offer.card.name} (Cần $${offer.askingPrice.toLocaleString()})!`,
      });
      return;
    }

    // Buying an unscanned counterfeit card loses cash and gets confiscated as fake!
    if (offer.isCounterfeit) {
      soundManager.playWrongBuzzer();
      setShopState((prev) => ({
        ...prev,
        cash: Math.max(0, prev.cash - offer.askingPrice),
        reputation: Math.max(0, (prev.reputation || 50) - 2),
        buybackOffers: (prev.buybackOffers || []).filter((o) => o.id !== offerId),
      }));
      setToastNotification({
        type: 'warning',
        message: `💀 DÍNH BẪY THẺ GIẢ! Bạn mua phải ${offer.card.name} Fake Proxy của ${offer.sellerName} (-$${offer.askingPrice.toLocaleString()}). Lần sau nhớ dùng Đèn UV Soi trước!`,
      });
      return;
    }

    if ((offer.preGradeBonus || 0) > 0) {
      restoredBuybackBonusRef.current[offer.card.id] = Math.max(
        restoredBuybackBonusRef.current[offer.card.id] || 0,
        offer.preGradeBonus || 0
      );
    }

    soundManager.playCashRegister();
    setShopState((prev) => {
      const target = (prev.buybackOffers || []).find((o) => o.id === offerId);
      if (!target) return prev;
      const prevStats = prev.gradingLabStats;
      return {
        ...prev,
        cash: Math.max(0, prev.cash - target.askingPrice),
        binderCards: {
          ...prev.binderCards,
          [target.card.id]: (prev.binderCards?.[target.card.id] || 0) + 1,
        },
        buybackOffers: (prev.buybackOffers || []).filter((o) => o.id !== offerId),
        gradingLabStats: prevStats
          ? {
              ...prevStats,
              buybackSnipes: (prevStats.buybackSnipes || 0) + 1,
            }
          : undefined,
      };
    });

    shopProfileManager.recordHistory({
      category: 'order',
      title: `Thu Mua Thẻ Lẻ: ${offer.card.name}`,
      amount: offer.askingPrice,
      detail: `Mua từ ${offer.sellerName} (Rẻ hơn Raw ${offer.discountPct}% — Đã cất vào Binder)`,
      isIncome: false,
    });

    setToastNotification({
      type: 'success',
      message: `🔎 Đã thu mua ${offer.card.name} giá $${offer.askingPrice.toLocaleString()} (-${offer.discountPct}% thị trường)! Đã thêm vào Sổ Thẻ để soi gửi chấm.`,
    });
  };

  const handleDeclineBuybackOffer = (offerId: string) => {
    soundManager.playSelectSound();
    setShopState((prev) => ({
      ...prev,
      buybackOffers: (prev.buybackOffers || []).filter((o) => o.id !== offerId),
    }));
  };

  // Fulfill High-Roller VIP Landmark Contract using a matching Slab in Vault
  const handleFulfillVipOrder = (vipOrderId: string, slabEntryId: string) => {
    const vip = (shopStateRef.current.vipSlabOrders || []).find((v) => v.id === vipOrderId);
    const entry = (shopStateRef.current.gradedSlabs || []).find((s) => s.id === slabEntryId);
    if (!vip || !entry) return;

    const pulseInfo = getMarketPulseMultiplierForCard(
      entry.card,
      shopStateRef.current.marketPulseNews,
      entry.slab
    );
    const grailBonusPct = getLuxuryAssetBuffs(
      shopStateRef.current.ownedLuxuryAssets || []
    ).grailValuationBonusPct;
    const baseValuation = getSlabMarketValuation(
      entry.card,
      entry.slab,
      entry.gradedPrice,
      shopStateRef.current.activeMarketTrend,
      { marketPulseMultiplier: pulseInfo.multiplier, grailBonusPct }
    ).effectiveValue;

    const payout = Math.round(baseValuation * vip.bonusMultiplier);
    const netProfit = Math.round(payout - entry.rawPrice);

    soundManager.playCashRegister();
    soundManager.playWinChime();

    setShopState((prev) => {
      const expRes = applyExpGain(prev.storeExp, prev.storeLevel, vip.xpReward);
      const prevToday = prev.todayStats || { customersServed: 0, itemsSold: 0, revenue: 0, profit: 0 };
      return {
        ...prev,
        cash: prev.cash + payout,
        totalRevenue: prev.totalRevenue + payout,
        reputation: Math.min(100, (prev.reputation || 0) + vip.repReward),
        storeExp: expRes.newExp,
        storeLevel: expRes.newLevel,
        storeExpToNext: expRes.newExpToNext,
        unlockedSets: expRes.didLevelUp ? getUnlockedSetsForLevel(expRes.newLevel) : prev.unlockedSets,
        todayStats: {
          customersServed: prevToday.customersServed + 1,
          itemsSold: prevToday.itemsSold + 1,
          revenue: prevToday.revenue + payout,
          profit: prevToday.profit + netProfit,
        },
        gradedSlabs: (prev.gradedSlabs || []).filter((s) => s.id !== slabEntryId),
        vipSlabOrders: (prev.vipSlabOrders || []).filter((v) => v.id !== vipOrderId),
      };
    });

    shopProfileManager.recordHistory({
      category: 'sale',
      title: `Hợp Đồng VIP: ${vip.landmark}`,
      amount: payout,
      detail: `Giao ${entry.card.name} (${entry.slab.company} ${entry.slab.gradeLabel}) cho ${vip.vipName} (x${vip.bonusMultiplier})`,
      isIncome: true,
    });

    setToastNotification({
      type: 'success',
      message: `💼 Đã giao hợp đồng ${vip.landmark}! Thu +$${payout.toLocaleString()} (x${vip.bonusMultiplier}) & +${vip.xpReward} XP.`,
    });
  };

  // =========================================================================
  // 9 EXPANSION SYSTEMS HANDLERS (TOURNAMENT, MARKET PULSE, BOX BREAK, HUNTS, LUXURY, KIOSKS, MASTER SET, SECURITY)
  // =========================================================================
  const handleStartTournamentBracket = (
    format: TournamentFormat,
    tier: TournamentTierId,
    selectedCards: Array<{ card: PokemonCard; slabGrade?: number }>
  ) => {
    const cfg = TOURNAMENT_TIERS[tier];
    if (shopStateRef.current.cash < cfg.entryFee) {
      soundManager.playWrongBuzzer();
      setToastNotification({
        type: 'warning',
        message: `❌ Không đủ $${cfg.entryFee} lệ phí để mở giải đấu ${cfg.name}!`,
      });
      return;
    }

    soundManager.playWinChime();
    const bracket = createTournamentBracket({ format, tier, playerDeckCards: selectedCards });
    setShopState((prev) => ({
      ...prev,
      cash: Math.max(0, prev.cash - cfg.entryFee),
      activeTournament: bracket,
    }));
    setToastNotification({
      type: 'info',
      message: `⚔️ Đã khai mạc giải ${cfg.name}! Bấm "Đấu Vòng Tiếp Theo" để tranh Cúp & Pack VIP.`,
    });
  };

  const handleAdvanceTournamentRound = () => {
    const bracket = shopStateRef.current.activeTournament;
    if (!bracket) return;

    const roundRes = advanceTournamentRound(bracket);
    const cfg = TOURNAMENT_TIERS[bracket.tier];

    if (!roundRes.completed) {
      soundManager.playSelectSound();
      setShopState((prev) => ({
        ...prev,
        activeTournament: roundRes.nextBracket,
      }));
      setToastNotification({
        type: roundRes.playerWonMatch ? 'success' : 'warning',
        message: roundRes.playerWonMatch
          ? '🔥 Đội Shop đã thắng trận và tiến vào vòng trong!'
          : '⚠️ Đội Shop đã dừng bước ở vòng vừa rồi, các đội còn lại đang tranh cúp.',
      });
      return;
    }

    const bonusReward = roundRes.playerIsChampion
      ? rollTournamentBonusReward({ format: bracket.format, tier: bracket.tier })
      : null;

    if (roundRes.playerIsChampion) {
      soundManager.playRarePullFanfare();
      confetti({ particleCount: 180, spread: 100, origin: { y: 0.5 } });
    } else if (roundRes.payout > 0) {
      soundManager.playCashRegister();
    } else {
      soundManager.playSelectSound();
    }

    const totalCashPrize = roundRes.payout + (bonusReward?.bonusCash || 0);

    setShopState((prev) => {
      const expGain = roundRes.playerIsChampion ? cfg.xpReward : 30;
      const expRes = applyExpGain(prev.storeExp, prev.storeLevel, expGain);

      let nextInventory = prev.inventory;
      if (bonusReward && bonusReward.bonusPackCount > 0) {
        const exists = prev.inventory.some((i) => i.productId === bonusReward.bonusPackProductId);
        if (exists) {
          nextInventory = prev.inventory.map((i) =>
            i.productId === bonusReward.bonusPackProductId
              ? { ...i, quantity: i.quantity + bonusReward.bonusPackCount }
              : i
          );
        } else {
          const cleanId = bonusReward.bonusPackProductId.replace('_pack', '');
          const bSet = getBoosterSet(cleanId);
          nextInventory = [
            ...prev.inventory,
            {
              id: `inv_tour_${Date.now()}`,
              productId: bonusReward.bonusPackProductId,
              name: `${bSet.name} Pack`,
              type: 'pack',
              setName: bSet.name,
              wholesaleCost: bSet.packWholesalePrice || 2.5,
              retailPrice: bSet.packRetailPrice || 5,
              quantity: bonusReward.bonusPackCount,
              shelvedQuantity: 0,
            },
          ];
        }
      }

      return {
        ...prev,
        cash: prev.cash + totalCashPrize,
        totalRevenue: prev.totalRevenue + totalCashPrize,
        reputation: Math.min(100, (prev.reputation || 50) + (roundRes.playerIsChampion ? cfg.repReward : 1)),
        storeExp: expRes.newExp,
        storeLevel: expRes.newLevel,
        storeExpToNext: expRes.newExpToNext,
        unlockedSets: expRes.didLevelUp ? getUnlockedSetsForLevel(expRes.newLevel) : prev.unlockedSets,
        activeTournament: roundRes.nextBracket,
        trophyCollection: roundRes.trophy
          ? [roundRes.trophy, ...(prev.trophyCollection || [])]
          : prev.trophyCollection,
        inventory: nextInventory,
        gradedSlabs: bonusReward?.bonusSlab
          ? [bonusReward.bonusSlab, ...(prev.gradedSlabs || [])]
          : prev.gradedSlabs,
      };
    });

    if (totalCashPrize > 0) {
      shopProfileManager.recordHistory({
        category: 'sale',
        title: roundRes.playerIsChampion ? `Vô Địch ${cfg.name}` : `Á Quân ${cfg.name}`,
        amount: totalCashPrize,
        detail: bonusReward ? bonusReward.summaryText : 'Tiền thưởng giải đấu TCG',
        isIncome: true,
      });
    }

    setToastNotification({
      type: roundRes.playerIsChampion ? 'success' : 'info',
      message: roundRes.playerIsChampion
        ? `🏆 VÔ ĐỊCH ${cfg.name}! Nhận +$${totalCashPrize}, Cúp Trưng Bày & ${bonusReward?.summaryText}!`
        : totalCashPrize > 0
        ? `🥈 Á Quân giải đấu! Nhận +$${totalCashPrize} tiền thưởng.`
        : `🏁 Giải đấu kết thúc! Nhà vô địch: ${roundRes.nextBracket.championName}.`,
    });
  };

  const handleRefreshMarketPulses = () => {
    const fee = 15;
    if (shopStateRef.current.cash < fee) {
      soundManager.playWrongBuzzer();
      setToastNotification({
        type: 'warning',
        message: `❌ Cần $${fee} để cập nhật bản tin thị trường TCG nóng hổi!`,
      });
      return;
    }
    soundManager.playSelectSound();
    const freshPulses = rollDailyMarketPulses(shopStateRef.current.currentDay || 1, Math.random);
    setShopState((prev) => ({
      ...prev,
      cash: Math.max(0, prev.cash - fee),
      marketPulseNews: freshPulses,
    }));
    setToastNotification({
      type: 'info',
      message: `📰 Đã cập nhật 2 tin nóng thị trường TCG mới: ${freshPulses.map((p) => p.badge).join(' & ')}`,
    });
  };

  const handleBuildLiveStudio = () => {
    if (shopStateRef.current.liveStudioUnlocked) return;
    if (shopStateRef.current.storeLevel < LIVE_STUDIO_BUILD_LEVEL) {
      soundManager.playWrongBuzzer();
      setToastNotification({
        type: 'warning',
        message: `🔒 Cần Cấp Cửa Hàng ${LIVE_STUDIO_BUILD_LEVEL} mới mở khóa xây Phòng Live Studio!`,
      });
      return;
    }
    if (shopStateRef.current.cash < LIVE_STUDIO_BUILD_COST) {
      soundManager.playWrongBuzzer();
      setToastNotification({
        type: 'warning',
        message: `❌ Cần $${LIVE_STUDIO_BUILD_COST} để xây dựng Phòng Live Studio 3D tại Shop!`,
      });
      return;
    }
    soundManager.playLevelUpFanfare();
    confetti({ particleCount: 70, spread: 65, origin: { y: 0.6 } });
    setShopState((prev) => ({
      ...prev,
      cash: Math.max(0, prev.cash - LIVE_STUDIO_BUILD_COST),
      liveStudioUnlocked: true,
    }));
    shopProfileManager.recordHistory({
      category: 'upgrade',
      title: 'Xây dựng Phòng Live Studio 3D (PokeLive)',
      amount: LIVE_STUDIO_BUILD_COST,
      detail: 'Mở khóa phòng thu góc sau bên phải Tầng 1 kèm Ring Light & Camera 4K',
      isIncome: false,
    });
    setToastNotification({
      type: 'success',
      message: '🎥 Đã xây xong Phòng Live Studio tại góc sau bên phải Shop 3D!',
    });
  };

  const handleConsumeBoxForLive = (
    productId: string,
    setName: string
  ): { consumed: boolean; deductedFromShelf: boolean; remainingShelved: number; remainingTotal: number } => {
    const preCheck = consumeLiveBoxFromInventory(shopStateRef.current.inventory, productId);
    if (!preCheck.consumed) {
      return preCheck;
    }
    setShopState((prev) => {
      const res = consumeLiveBoxFromInventory(prev.inventory, productId);
      if (!res.consumed) return prev;
      sceneManagerRef.current?.syncAllShelves(res.updatedInventory, prev.unlockedShelves);
      return {
        ...prev,
        inventory: res.updatedInventory,
      };
    });
    setToastNotification({
      type: 'info',
      message: preCheck.deductedFromShelf
        ? `📦 Đã lấy 1x ${setName} từ KỆ HÀNG lên bàn quay PokeLive (Kệ còn: ${preCheck.remainingShelved} · Kho: ${preCheck.remainingTotal})!`
        : `📦 Đã lấy 1x ${setName} từ kho lên bàn quay PokeLive (Tổng tồn còn: ${preCheck.remainingTotal})!`,
    });
    return preCheck;
  };

  const handleCompleteLiveSession = (payload: LiveSessionCompletionPayload) => {
    soundManager.playRarePullFanfare();
    confetti({ particleCount: 95, spread: 80, origin: { y: 0.55 } });

    setShopState((prev) => {
      const nextBinder = { ...prev.binderCards };
      for (const c of payload.shopKeptCards) {
        nextBinder[c.id] = (nextBinder[c.id] || 0) + 1;
      }
      const prevStats = prev.liveBreakStats || {
        breaksHosted: 0,
        slotsSold: 0,
        totalRevenue: 0,
        viralFollowers: 50,
      };
      const expRes = applyExpGain(prev.storeExp, prev.storeLevel, payload.xpGain);
      const prevToday = prev.todayStats || {
        customersServed: 0,
        itemsSold: 0,
        revenue: 0,
        profit: 0,
      };
      const netProfit = Math.round(payload.slotRevenue - payload.boxWholesaleCost);

      return {
        ...prev,
        cash: Math.max(0, prev.cash + payload.slotRevenue),
        totalRevenue: prev.totalRevenue + payload.slotRevenue,
        reputation: Math.min(100, (prev.reputation || 50) + 1),
        packsOpenedCount: prev.packsOpenedCount + 9,
        storeExp: expRes.newExp,
        storeLevel: expRes.newLevel,
        storeExpToNext: expRes.newExpToNext,
        unlockedSets: expRes.didLevelUp ? getUnlockedSetsForLevel(expRes.newLevel) : prev.unlockedSets,
        todayStats: {
          ...prevToday,
          revenue: prevToday.revenue + payload.slotRevenue,
          profit: prevToday.profit + netProfit,
          itemsSold: prevToday.itemsSold + payload.slotsSoldCount,
        },
        binderCards: nextBinder,
        liveBreakStats: {
          breaksHosted: prevStats.breaksHosted + 1,
          slotsSold: prevStats.slotsSold + payload.slotsSoldCount,
          totalRevenue: prevStats.totalRevenue + payload.slotRevenue,
          viralFollowers: prevStats.viralFollowers + payload.viralFollowersGain,
        },
      };
    });

    shopProfileManager.recordHistory({
      category: 'sale',
      title: `PokeLive Box Break: ${payload.setName}`,
      amount: payload.slotRevenue,
      detail: `Bán ${payload.slotsSoldCount}/6 slot · Giao ${payload.shippedCardsCount} thẻ · Giữ ${payload.shopKeptCards.length} thẻ vào Binder`,
      isIncome: true,
    });

    setToastNotification({
      type: 'success',
      message: `🎥 Kết thúc PokeLive ${payload.setName}: Bán ${payload.slotsSoldCount}/6 slot thu +$${payload.slotRevenue}! Giữ ${payload.shopKeptCards.length} thẻ vào Binder (+${payload.viralFollowersGain} Fans)!`,
    });
  };

  const handleToggleAutoLive = () => {
    setLiveRuntime((prev) => ({
      ...prev,
      autoLiveEnabled: !prev.autoLiveEnabled,
    }));
  };

  const handleStartLiveBroadcast = useCallback(
    (box: OwnedLiveBoosterBox, slotPrice: number, _openTikTokView = false, isAutoHourly = false) => {
      const latestPrereqs = checkLiveBreakPrerequisites(shopStateRef.current);
      const hasStockedBox = shopStateRef.current.inventory.some(
        (i) => i.productId === box.productId && i.type === 'box' && (i.quantity || 0) >= 1
      );
      if (!latestPrereqs.canGoLive || !hasStockedBox) {
        if (pokeLiveOpenRef.current) soundManager.playWrongBuzzer();
        return;
      }
      if (liveAutoBeginTimerRef.current) {
        window.clearTimeout(liveAutoBeginTimerRef.current);
        liveAutoBeginTimerRef.current = null;
      }
      if (liveFinalizeTimerRef.current) {
        window.clearTimeout(liveFinalizeTimerRef.current);
        liveFinalizeTimerRef.current = null;
      }
      if (pokeLiveOpenRef.current && !isAutoHourly) {
        soundManager.playSelectSound();
      }
      const hourStr = `${String(shopStateRef.current.inGameHour).padStart(2, '0')}:00`;
      setLiveRuntime((prev) => ({
        ...prev,
        phase: 'streaming_selling',
        activeLiveBox: {
          productId: box.productId,
          setId: box.setId,
          setName: box.setName,
          packsPerBox: box.packsPerBox || 9,
          boxWholesalePrice: box.boxWholesalePrice,
          boxRetailPrice: box.boxRetailPrice,
          packRetailPrice: box.packRetailPrice,
          imageUrl: box.imageUrl,
          consumedFromShelf: false,
        },
        slots: createLiveStreamSlots(slotPrice),
        slotPrice,
        viewers: 0,
        likesCount: 0,
        elapsedSec: 0,
        tickIndex: 0,
        hypeUntilMs: 0,
        sealShownCooldownUntil: 0,
        flashSaleUsed: false,
        currentPackNum: 0,
        currentPackOutcomes: [],
        allOutcomes: [],
        autoRipActive: false,
        summaryPayload: null,
        scheduledHourLabel: isAutoHourly ? hourStr : null,
        chatMessages: [
          {
            id: `init_${Date.now()}`,
            sender: 'Nhân Viên Studio',
            text: isAutoHourly
              ? `🎥 [${hourStr}] Tự động lên sóng bộ ${box.setName} (${box.packsPerBox || 9} Packs) giá $${slotPrice}/slot! Anh em vào chốt Slot ngay nhé!`
              : `Xin chào cả nhà! Hôm nay mình lên sóng bộ ${box.setName} (${box.packsPerBox || 9} Packs) giá $${slotPrice}/slot. Ai vào live cho xin 1 tim nhé!`,
            kind: 'system',
            timestamp: Date.now(),
          },
        ],
      }));
      if (isAutoHourly && !pokeLiveOpenRef.current) {
        setToastNotification({
          type: 'info',
          message: `🎥 [${hourStr}] Nhân Viên Studio tự lên live ${box.setName} ($${slotPrice}/slot)!`,
        });
      }
    },
    []
  );

  const finalizeLiveRuntimeSession = useCallback((finalOutcomes: LivePackCardOutcome[]) => {
    const rt = liveRuntimeRef.current;
    if (!rt.activeLiveBox) return;
    const soldSlots = rt.slots.filter((s) => s.status === 'sold');
    const slotRevenue = soldSlots.reduce((sum, s) => sum + s.price, 0);
    const shippedCardsCount = finalOutcomes.filter((o) => o.disposition === 'shipped').length;
    const shopKeptCards = finalOutcomes
      .filter((o) => o.disposition === 'shop_kept')
      .map((o) => o.card);
    const shopKeptValue = Math.round(
      shopKeptCards.reduce((sum, c) => sum + (c.marketPrice || 0), 0)
    );
    const hitCount = finalOutcomes.filter((o) => o.isHit).length;
    const viralFollowersGain = 15 + Math.min(40, hitCount * 4) + (soldSlots.length >= 4 ? 10 : 0);
    const xpGain = 35 + soldSlots.length * 8 + rt.activeLiveBox.packsPerBox * 3;

    const payload: LiveSessionCompletionPayload = {
      productId: rt.activeLiveBox.productId,
      setId: rt.activeLiveBox.setId,
      setName: rt.activeLiveBox.setName,
      boxWholesaleCost: rt.activeLiveBox.boxWholesalePrice,
      slotsSoldCount: soldSlots.length,
      slotRevenue,
      shippedCardsCount,
      shopKeptCards,
      shopKeptValue,
      viralFollowersGain,
      xpGain,
    };

    const currentHour = shopStateRef.current.inGameHour;
    setLiveRuntime((prev) => ({
      ...prev,
      phase: 'summary',
      autoRipActive: false,
      summaryPayload: payload,
      lastCompletedHour: currentHour,
      nextAutoStartAfterMs: Date.now() + 7000,
    }));
    handleCompleteLiveSession(payload);
  }, []);

  const handleBeginLiveRipping = useCallback(() => {
    const rt = liveRuntimeRef.current;
    if (!rt.activeLiveBox || rt.phase === 'ripping') return;
    if (liveAutoBeginTimerRef.current) {
      window.clearTimeout(liveAutoBeginTimerRef.current);
      liveAutoBeginTimerRef.current = null;
    }
    const consumeRes = handleConsumeBoxForLive(
      rt.activeLiveBox.productId,
      rt.activeLiveBox.setName
    );
    if (!consumeRes.consumed) {
      if (pokeLiveOpenRef.current) soundManager.playWrongBuzzer();
      setLiveRuntime((prev) => ({
        ...prev,
        phase: 'setup',
        activeLiveBox: null,
        chatMessages: [
          ...prev.chatMessages.slice(-45),
          {
            id: `sys_nobox_${Date.now()}`,
            sender: 'Hệ Thống',
            text: 'Kho đã hết Booster Box thật này! Nhân viên tạm dừng phiên để chờ nhập hàng.',
            kind: 'system',
            timestamp: Date.now(),
          },
        ],
      }));
      return;
    }
    if (pokeLiveOpenRef.current) soundManager.playRarePullFanfare();
    setLiveRuntime((prev) => ({
      ...prev,
      phase: 'ripping',
      activeLiveBox: prev.activeLiveBox
        ? { ...prev.activeLiveBox, consumedFromShelf: consumeRes.deductedFromShelf }
        : null,
      currentPackNum: 0,
      currentPackOutcomes: [],
      allOutcomes: [],
      autoRipActive: true,
      chatMessages: [
        ...prev.chatMessages.slice(-45),
        {
          id: `rip_start_${Date.now()}`,
          sender: 'Nhân Viên Studio',
          text: consumeRes.deductedFromShelf
            ? `ĐÃ LẤY 1 BOX TỪ KỆ & XÉ SEAL ${rt.activeLiveBox!.setName} (Trên kệ còn ${consumeRes.remainingShelved} Box)! Bắt đầu unbox từng Pack cho khách!`
            : `ĐÃ XÉ SEAL ${rt.activeLiveBox!.setName} (Kho còn ${consumeRes.remainingTotal} Box)! Bắt đầu unbox từng Pack trực tiếp cho khách ngay!`,
          kind: 'system',
          timestamp: Date.now(),
        },
      ],
    }));
  }, []);

  const handleRipNextLivePack = useCallback(() => {
    const rt = liveRuntimeRef.current;
    if (!rt.activeLiveBox || rt.phase !== 'ripping') return;
    if (rt.currentPackNum >= rt.activeLiveBox.packsPerBox) {
      finalizeLiveRuntimeSession(rt.allOutcomes);
      return;
    }
    const nextPack = rt.currentPackNum + 1;
    const assignedSlot =
      rt.slots.length > 0 ? rt.slots[(nextPack - 1) % rt.slots.length] : undefined;
    const packBuyerName =
      assignedSlot && assignedSlot.status === 'sold' ? assignedSlot.buyerName : undefined;
    const packResult = executeSinglePackLiveRip({
      setId: rt.activeLiveBox.setId,
      slots: rt.slots,
      packNumber: nextPack,
      packBuyerName,
      packSlotLabel: assignedSlot?.label,
      setName: rt.activeLiveBox.setName,
    });
    const nextAll = [...rt.allOutcomes, ...packResult.cards];
    const hasHit = packResult.cards.some((c) => c.isHit);

    if (pokeLiveOpenRef.current) {
      if (!hasHit) soundManager.playSelectSound();
    }

    setLiveRuntime((prev) => ({
      ...prev,
      currentPackNum: nextPack,
      currentPackOutcomes: packResult.cards,
      allOutcomes: nextAll,
      likesCount: prev.likesCount + (hasHit ? 25 : 4),
      autoRipActive: nextPack >= rt.activeLiveBox!.packsPerBox ? false : prev.autoRipActive,
      chatMessages:
        packResult.packChatMessages.length > 0
          ? [...prev.chatMessages.slice(-45), ...packResult.packChatMessages]
          : prev.chatMessages,
    }));

    if (nextPack >= rt.activeLiveBox.packsPerBox) {
      if (liveFinalizeTimerRef.current) {
        window.clearTimeout(liveFinalizeTimerRef.current);
      }
      const finishDelay =
        pokeLiveOpenRef.current && pokeLiveViewingTikTokRef.current ? 3000 : 950;
      liveFinalizeTimerRef.current = window.setTimeout(() => {
        liveFinalizeTimerRef.current = null;
        finalizeLiveRuntimeSession(nextAll);
      }, finishDelay);
    }
  }, [finalizeLiveRuntimeSession]);

  const handleCancelLiveBeforeRip = () => {
    if (liveAutoBeginTimerRef.current) {
      window.clearTimeout(liveAutoBeginTimerRef.current);
      liveAutoBeginTimerRef.current = null;
    }
    soundManager.playSelectSound();
    setLiveRuntime((prev) => ({
      ...prev,
      phase: 'setup',
      activeLiveBox: null,
      viewers: 0,
      elapsedSec: 0,
      autoLiveEnabled: false,
    }));
  };

  const handleShowSealOnLive = () => {
    const now = Date.now();
    if (now < liveRuntimeRef.current.sealShownCooldownUntil) return;
    soundManager.playSelectSound();
    setLiveRuntime((prev) => ({
      ...prev,
      sealShownCooldownUntil: now + 8000,
      sealGlintKey: prev.sealGlintKey + 1,
      viewers: prev.viewers + 3,
      likesCount: prev.likesCount + 8,
      chatMessages: [
        ...prev.chatMessages.slice(-45),
        {
          id: `seal_${now}`,
          sender: 'Nhân Viên Studio',
          text: 'Đưa nguyên seal Booster Box lên sát camera 4K cho anh em kiểm tra hàng chính hãng 100%!',
          kind: 'hype',
          timestamp: now,
        },
      ],
    }));
  };

  const handleHypeShoutoutOnLive = () => {
    const now = Date.now();
    if (now < liveRuntimeRef.current.hypeUntilMs) return;
    soundManager.playSelectSound();
    setLiveRuntime((prev) => ({
      ...prev,
      hypeUntilMs: now + 9000,
      viewers: prev.viewers + 5,
      likesCount: prev.likesCount + 10,
      chatMessages: [
        ...prev.chatMessages.slice(-45),
        {
          id: `hype_${now}`,
          sender: 'Nhân Viên Studio',
          text: 'Chỉ còn vài Slot đẹp cuối cùng! Chốt đơn ngay để chuẩn bị kéo Pack săn Grail anh em ơi!',
          kind: 'hype',
          timestamp: now,
        },
      ],
    }));
  };

  const handleFlashSaleOnLive = () => {
    if (liveRuntimeRef.current.flashSaleUsed) return;
    soundManager.playSelectSound();
    const now = Date.now();
    setLiveRuntime((prev) => ({
      ...prev,
      flashSaleUsed: true,
      slots: prev.slots.map((s) =>
        s.status === 'available' ? { ...s, price: Math.max(3, Math.round(s.price * 0.85)) } : s
      ),
      chatMessages: [
        ...prev.chatMessages.slice(-45),
        {
          id: `flash_${now}`,
          sender: 'Nhân Viên Studio',
          text: 'FLASH SALE -15% cho toàn bộ các Slot còn trống ngay lúc này! Nhanh tay chốt kèo anh em!',
          kind: 'hype',
          timestamp: now,
        },
      ],
    }));
  };

  const handleSendHostCommentOnLive = (text: string) => {
    const now = Date.now();
    setLiveRuntime((prev) => ({
      ...prev,
      chatMessages: [
        ...prev.chatMessages.slice(-45),
        {
          id: `host_${now}_${Math.random()}`,
          sender: `Chủ Shop (${shopStateRef.current.shopName})`,
          text,
          kind: 'hype',
          timestamp: now,
        },
      ],
    }));
  };

  const handleTapHeartOnLive = () => {
    setLiveRuntime((prev) => ({ ...prev, likesCount: prev.likesCount + 1 }));
  };

  const handleToggleAutoRipLive = () => {
    setLiveRuntime((prev) => ({ ...prev, autoRipActive: !prev.autoRipActive }));
  };

  const handleResetLiveToSetup = () => {
    setLiveRuntime((prev) => ({
      ...prev,
      phase: 'setup',
      summaryPayload: null,
      nextAutoStartAfterMs: 0,
      lastCompletedHour: null,
    }));
  };

  const handleHaggleCityHunt = (spotId: string, discountPct: number) => {
    const spot = (shopStateRef.current.cityHuntSpots || []).find((s) => s.id === spotId);
    if (!spot) return;

    const haggleBonusPct = getLuxuryAssetBuffs(
      shopStateRef.current.ownedLuxuryAssets || []
    ).haggleBonusPct;
    const res = attemptCityHuntHaggle({
      spot,
      discountTargetPct: discountPct,
      luxuryHaggleBonusPct: haggleBonusPct,
    });

    if (res.succeeded) {
      soundManager.playWinChime();
    } else if (res.walkedAway) {
      soundManager.playWrongBuzzer();
    } else {
      soundManager.playSelectSound();
    }

    setShopState((prev) => ({
      ...prev,
      cityHuntSpots: (prev.cityHuntSpots || []).map((s) => (s.id === spotId ? res.nextSpot : s)),
    }));
    setToastNotification({
      type: res.succeeded ? 'success' : res.walkedAway ? 'warning' : 'info',
      message: res.message,
    });
  };

  const handleBuyCityHunt = (spotId: string) => {
    const spot = (shopStateRef.current.cityHuntSpots || []).find((s) => s.id === spotId);
    if (!spot || spot.status !== 'active') return;
    if (shopStateRef.current.cash < spot.askingPrice) {
      soundManager.playWrongBuzzer();
      setToastNotification({
        type: 'warning',
        message: `❌ Không đủ $${spot.askingPrice.toLocaleString()} để chốt mua ${spot.card.name}!`,
      });
      return;
    }

    soundManager.playCashRegister();
    confetti({ particleCount: 55, spread: 65, origin: { y: 0.6 } });

    setShopState((prev) => {
      const expRes = applyExpGain(prev.storeExp, prev.storeLevel, 35);
      return {
        ...prev,
        cash: Math.max(0, prev.cash - spot.askingPrice),
        storeExp: expRes.newExp,
        storeLevel: expRes.newLevel,
        storeExpToNext: expRes.newExpToNext,
        unlockedSets: expRes.didLevelUp ? getUnlockedSetsForLevel(expRes.newLevel) : prev.unlockedSets,
        binderCards: {
          ...prev.binderCards,
          [spot.card.id]: (prev.binderCards?.[spot.card.id] || 0) + 1,
        },
        cityHuntSpots: (prev.cityHuntSpots || []).map((s) =>
          s.id === spotId ? { ...s, status: 'sold' as const } : s
        ),
      };
    });

    shopProfileManager.recordHistory({
      category: 'order',
      title: `Săn Hàng Hiếm: ${spot.card.name}`,
      amount: spot.askingPrice,
      detail: `Chốt tại ${spot.locationName} (Giá trị $${spot.marketValue.toLocaleString()})`,
      isIncome: false,
    });

    setToastNotification({
      type: 'success',
      message: `🎯 Đã săn thành công ${spot.card.name} giá $${spot.askingPrice.toLocaleString()} tại ${spot.locationName}! Đã cất vào Sổ Thẻ.`,
    });
  };

  const handleRefreshCityHunts = () => {
    const fee = 20;
    if (shopStateRef.current.cash < fee) {
      soundManager.playWrongBuzzer();
      setToastNotification({
        type: 'warning',
        message: `❌ Cần $${fee} thuê thám tử quét điểm Săn Hàng Hiếm mới!`,
      });
      return;
    }
    soundManager.playSelectSound();
    setShopState((prev) => ({
      ...prev,
      cash: Math.max(0, prev.cash - fee),
      cityHuntSpots: generateCityHuntSpots(3),
    }));
    setToastNotification({
      type: 'info',
      message: '🕵️ Đã quét 3 điểm Săn Hàng Hiếm mới trên bản đồ thành phố!',
    });
  };

  const handleNavigateToPoi = (poiId: string, name: string, x: number, z: number) => {
    soundManager.playSelectSound();
    setEmpireWaypoint({ id: poiId, name, x, z });
    setCityEmpireOpen(false);
    setOpenModal((prev) => (prev === 'pc_ordering' ? null : prev));
    setToastNotification({
      type: 'info',
      message: `🧭 Đã ghim lộ trình GPS tới ${name}! Theo dõi mũi tên trên Radar [Z].`,
    });
  };

  const handleSellBinderCardOnSocial = (cardId: string, cardName: string, price: number) => {
    const ownedQty = shopStateRef.current.binderCards?.[cardId] || 0;
    if (ownedQty <= 0) return;

    confetti({ particleCount: 45, spread: 60, origin: { y: 0.65 } });
    setShopState((prev) => {
      const nextQty = Math.max(0, (prev.binderCards?.[cardId] || 0) - 1);
      const nextBinder = { ...(prev.binderCards || {}) };
      if (nextQty === 0) delete nextBinder[cardId];
      else nextBinder[cardId] = nextQty;
      const expRes = applyExpGain(prev.storeExp, prev.storeLevel, 20);
      return {
        ...prev,
        cash: prev.cash + price,
        binderCards: nextBinder,
        storeExp: expRes.newExp,
        storeLevel: expRes.newLevel,
        storeExpToNext: expRes.newExpToNext,
        unlockedSets: expRes.didLevelUp ? getUnlockedSetsForLevel(expRes.newLevel) : prev.unlockedSets,
      };
    });

    shopProfileManager.recordHistory({
      category: 'sale',
      title: `Bán Thẻ CardX: ${cardName}`,
      amount: price,
      detail: `Chốt đơn trực tiếp trên Chợ Mạng CardX`,
      isIncome: true,
    });

    setToastNotification({
      type: 'success',
      message: `💸 Đã bán thành công ${cardName} trên CardX thu về +$${price.toLocaleString()}!`,
    });
  };

  const handleBuyOverpricedSocialCard = (card: PokemonCard, price: number, sellerName: string) => {
    if (shopStateRef.current.cash < price) {
      soundManager.playWrongBuzzer();
      setToastNotification({
        type: 'warning',
        message: `❌ Cần $${price.toLocaleString()} để chốt thẻ ${card.name} từ ${sellerName}!`,
      });
      return;
    }

    soundManager.playCashRegister();
    confetti({ particleCount: 40, spread: 55, origin: { y: 0.65 } });
    setShopState((prev) => {
      const nextBinder = {
        ...(prev.binderCards || {}),
        [card.id]: ((prev.binderCards || {})[card.id] || 0) + 1,
      };
      const expRes = applyExpGain(prev.storeExp, prev.storeLevel, 15);
      return {
        ...prev,
        cash: Math.max(0, prev.cash - price),
        binderCards: nextBinder,
        storeExp: expRes.newExp,
        storeLevel: expRes.newLevel,
        storeExpToNext: expRes.newExpToNext,
        unlockedSets: expRes.didLevelUp ? getUnlockedSetsForLevel(expRes.newLevel) : prev.unlockedSets,
      };
    });

    shopProfileManager.recordHistory({
      category: 'order',
      title: `Chốt CardX: ${card.name}`,
      amount: price,
      detail: `Mua từ ${sellerName} trên chợ mạng CardX`,
      isIncome: false,
    });

    setToastNotification({
      type: 'success',
      message: `🃏 Đã mua ${card.name} từ ${sellerName} với giá $${price.toLocaleString()} (đã cất vào Sổ Thẻ)!`,
    });
  };

  const handleBuyLuxuryAsset = (assetId: string) => {
    const asset = LUXURY_ASSETS_CATALOG.find((a) => a.id === assetId);
    if (!asset) return;
    if ((shopStateRef.current.ownedLuxuryAssets || []).includes(assetId)) return;
    if (shopStateRef.current.cash < asset.price) {
      soundManager.playWrongBuzzer();
      setToastNotification({
        type: 'warning',
        message: `❌ Không đủ $${asset.price.toLocaleString()} để sở hữu ${asset.name}!`,
      });
      return;
    }

    soundManager.playRarePullFanfare();
    confetti({ particleCount: 120, spread: 85, origin: { y: 0.5 } });

    setShopState((prev) => {
      const expRes = applyExpGain(prev.storeExp, prev.storeLevel, 80);
      return {
        ...prev,
        cash: Math.max(0, prev.cash - asset.price),
        reputation: Math.min(100, (prev.reputation || 50) + 4),
        storeExp: expRes.newExp,
        storeLevel: expRes.newLevel,
        storeExpToNext: expRes.newExpToNext,
        unlockedSets: expRes.didLevelUp ? getUnlockedSetsForLevel(expRes.newLevel) : prev.unlockedSets,
        ownedLuxuryAssets: [...(prev.ownedLuxuryAssets || []), assetId],
      };
    });

    shopProfileManager.recordHistory({
      category: 'upgrade',
      title: `Mua Tài Sản: ${asset.name}`,
      amount: asset.price,
      detail: asset.buffSummary,
      isIncome: false,
    });

    setToastNotification({
      type: 'success',
      message: `${asset.icon} Đã sở hữu ${asset.name}! Kích hoạt buff vĩnh viễn: ${asset.buffSummary}`,
    });
  };

  const handleUnlockOrUpgradeKiosk = (kioskId: 'aeon_kiosk' | 'landmark_kiosk') => {
    const cfg = SATELLITE_KIOSK_CATALOG.find((k) => k.id === kioskId);
    if (!cfg) return;
    const latest = shopStateRef.current;
    const cur = latest.satelliteKiosks?.[kioskId] || {
      id: kioskId,
      unlocked: false,
      tier: 1,
      uncollectedCash: 0,
      totalEarned: 0,
      itemsSold: 0,
    };

    if (!cur.unlocked) {
      if (latest.storeLevel < cfg.unlockLevel) {
        soundManager.playWrongBuzzer();
        setToastNotification({
          type: 'warning',
          message: `🔒 Cần đạt Cấp Cửa Hàng ${cfg.unlockLevel} để mở ${cfg.name}!`,
        });
        return;
      }
      if (latest.cash < cfg.unlockCost) {
        soundManager.playWrongBuzzer();
        setToastNotification({
          type: 'warning',
          message: `❌ Cần $${cfg.unlockCost.toLocaleString()} để thuê mặt bằng ${cfg.name}!`,
        });
        return;
      }
      soundManager.playCashRegister();
      confetti({ particleCount: 75, spread: 70 });
      setShopState((prev) => ({
        ...prev,
        cash: Math.max(0, prev.cash - cfg.unlockCost),
        satelliteKiosks: {
          ...(prev.satelliteKiosks || createInitialKiosksState()),
          [kioskId]: { ...cur, unlocked: true, tier: 1 },
        },
      }));
      shopProfileManager.recordHistory({
        category: 'upgrade',
        title: `Mở Chi Nhánh: ${cfg.name}`,
        amount: cfg.unlockCost,
        detail: `Quầy tự động bán hàng kiếm thu nhập thụ động ($${cfg.baseHourlyRevenue}/giờ)`,
        isIncome: false,
      });
      setToastNotification({
        type: 'success',
        message: `🏪 Đã khai trương ${cfg.name}! Quầy sẽ tự sinh tiền thụ động khi shop mở cửa.`,
      });
      return;
    }

    if (cur.tier >= 3) return;
    const upgCost = cfg.upgradeCostBase * cur.tier;
    if (latest.cash < upgCost) {
      soundManager.playWrongBuzzer();
      setToastNotification({
        type: 'warning',
        message: `❌ Cần $${upgCost.toLocaleString()} để nâng cấp ${cfg.name} lên Tier ${cur.tier + 1}!`,
      });
      return;
    }

    soundManager.playWinChime();
    setShopState((prev) => ({
      ...prev,
      cash: Math.max(0, prev.cash - upgCost),
      satelliteKiosks: {
        ...(prev.satelliteKiosks || createInitialKiosksState()),
        [kioskId]: { ...cur, tier: cur.tier + 1 },
      },
    }));
    setToastNotification({
      type: 'success',
      message: `⬆️ Đã nâng cấp ${cfg.name} lên Tier ${cur.tier + 1} (+55% doanh thu thụ động)!`,
    });
  };

  const handleCollectKioskCash = (kioskId: 'aeon_kiosk' | 'landmark_kiosk') => {
    const cur = shopStateRef.current.satelliteKiosks?.[kioskId];
    const cfg = SATELLITE_KIOSK_CATALOG.find((k) => k.id === kioskId);
    if (!cur || !cfg || cur.uncollectedCash <= 0) return;

    const collected = Number(cur.uncollectedCash.toFixed(2));
    soundManager.playCashRegister();
    setShopState((prev) => {
      const latestCur = prev.satelliteKiosks?.[kioskId];
      if (!latestCur || latestCur.uncollectedCash <= 0) return prev;
      const prevToday = prev.todayStats || { customersServed: 0, itemsSold: 0, revenue: 0, profit: 0 };
      return {
        ...prev,
        cash: prev.cash + collected,
        totalRevenue: prev.totalRevenue + collected,
        todayStats: {
          ...prevToday,
          revenue: prevToday.revenue + collected,
          profit: prevToday.profit + collected,
        },
        satelliteKiosks: {
          ...(prev.satelliteKiosks || {}),
          [kioskId]: { ...latestCur, uncollectedCash: 0 },
        },
      };
    });

    shopProfileManager.recordHistory({
      category: 'sale',
      title: `Thu Doanh Thu ${cfg.name}`,
      amount: collected,
      detail: `Tiền lãi thụ động từ Kiosk chi nhánh Tier ${cur.tier}`,
      isIncome: true,
    });
    setToastNotification({
      type: 'success',
      message: `💰 Đã thu +$${collected.toLocaleString()} doanh thu từ ${cfg.name}!`,
    });
  };

  const handleClaimMasterSetMilestone = (setId: string, pct: 50 | 80 | 100) => {
    const key = getMasterSetMilestoneKey(setId, pct);
    if ((shopStateRef.current.claimedMasterSetMilestones || []).includes(key)) return;

    const allSets: BoosterSetInfo[] = [...ALL_UNIQUE_BOOSTER_SETS, ...ALL_ONEPIECE_BOOSTER_SETS];
    const setInfo = allSets.find((s) => s.id === setId) || ALL_UNIQUE_BOOSTER_SETS[0];
    const reward = getMasterSetMilestoneReward(setInfo, pct);

    soundManager.playRarePullFanfare();
    confetti({ particleCount: pct === 100 ? 150 : 75, spread: 80, origin: { y: 0.55 } });

    setShopState((prev) => {
      const expRes = applyExpGain(prev.storeExp, prev.storeLevel, reward.xp);
      return {
        ...prev,
        cash: prev.cash + reward.cash,
        totalRevenue: prev.totalRevenue + reward.cash,
        reputation: Math.min(100, (prev.reputation || 50) + reward.rep),
        storeExp: expRes.newExp,
        storeLevel: expRes.newLevel,
        storeExpToNext: expRes.newExpToNext,
        unlockedSets: expRes.didLevelUp ? getUnlockedSetsForLevel(expRes.newLevel) : prev.unlockedSets,
        claimedMasterSetMilestones: [...(prev.claimedMasterSetMilestones || []), key],
      };
    });

    shopProfileManager.recordHistory({
      category: 'sale',
      title: `Thưởng Master Set ${setInfo.name} (${pct}%)`,
      amount: reward.cash,
      detail: `${reward.discountLabel} • +${reward.xp} XP & +${reward.rep} Uy Tín`,
      isIncome: true,
    });

    setToastNotification({
      type: 'success',
      message: `🏆 Hoàn thành ${pct}% bộ ${setInfo.name}! Nhận +$${reward.cash}, +${reward.xp} XP${
        pct === 100 ? ' & -2% giá nhập sỉ vĩnh viễn!' : '!'
      }`,
    });
  };

  const handleUpgradeSecurity = () => {
    const curLvl = shopStateRef.current.securityLevel || 0;
    const nextTier = SHOP_SECURITY_TIERS[curLvl + 1];
    if (!nextTier) return;
    if (shopStateRef.current.cash < nextTier.cost) {
      soundManager.playWrongBuzzer();
      setToastNotification({
        type: 'warning',
        message: `❌ Cần $${nextTier.cost.toLocaleString()} để lắp đặt ${nextTier.name}!`,
      });
      return;
    }

    soundManager.playWinChime();
    confetti({ particleCount: 70, spread: 70 });
    setShopState((prev) => ({
      ...prev,
      cash: Math.max(0, prev.cash - nextTier.cost),
      reputation: Math.min(100, (prev.reputation || 50) + 3),
      securityLevel: nextTier.level,
    }));
    shopProfileManager.recordHistory({
      category: 'upgrade',
      title: `Nâng Cấp An Ninh: ${nextTier.name}`,
      amount: nextTier.cost,
      detail: `Tự động bắt trộm ${Math.round(nextTier.autoCatchChance * 100)}% • Cảnh báo sớm`,
      isIncome: false,
    });
    setToastNotification({
      type: 'success',
      message: `🛡️ Đã lắp đặt ${nextTier.name}! Bảo vệ kệ Pack & Slab an toàn hơn.`,
    });
  };

  const handleCatchShoplifter = () => {
    const alert = shopStateRef.current.activeSecurityAlert;
    if (!alert) return;

    soundManager.playCashRegister();
    soundManager.playWinChime();
    sceneManagerRef.current?.notifySecurityThiefCaught(alert.incidentType);
    setShopState((prev) => {
      if (!prev.activeSecurityAlert) return prev;
      const prevSec = prev.securityStats || { theftsPrevented: 0, totalLosses: 0, bountiesEarned: 0 };
      return {
        ...prev,
        cash: prev.cash + prev.activeSecurityAlert.bountyReward,
        totalRevenue: prev.totalRevenue + prev.activeSecurityAlert.bountyReward,
        reputation: Math.min(100, (prev.reputation || 50) + 2),
        activeSecurityAlert: null,
        securityStats: {
          theftsPrevented: prevSec.theftsPrevented + 1,
          totalLosses: prevSec.totalLosses,
          bountiesEarned: prevSec.bountiesEarned + prev.activeSecurityAlert.bountyReward,
        },
      };
    });
    shopProfileManager.recordHistory({
      category: 'sale',
      title: `Bắt Quả Tang Kẻ Trộm: ${alert.suspectName}`,
      amount: alert.bountyReward,
      detail: `Bảo vệ thành công ${alert.targetItemName} (+2 Uy Tín)`,
      isIncome: true,
    });
    setToastNotification({
      type: 'success',
      message: `🚔 Đã tóm gọn ${alert.suspectName}! Bảo vệ ${alert.targetItemName} & nhận thưởng +$${alert.bountyReward}!`,
    });
  };
  handleCatchShoplifterRef.current = handleCatchShoplifter;

  const handleDeductCash = (amount: number) => {
    setShopState((prev) => ({
      ...prev,
      cash: Math.max(0, prev.cash - amount),
    }));
  };

  const handleAddCash = (amount: number) => {
    setShopState((prev) => ({
      ...prev,
      cash: prev.cash + amount,
      totalRevenue: prev.totalRevenue + amount,
    }));
  };

  // Automated Delivery Restocker Unboxing
  const handleRestockerUnboxDelivery = useCallback(() => {
    if (!isStaffWorkingHours(shopStateRef.current.inGameHour, shopStateRef.current.inGameMinute)) {
      return;
    }
    setShopState((prev) => {
      if (!prev.pendingDeliveries || prev.pendingDeliveries.length === 0) return prev;
      const [parcel, ...remainingDeliveries] = prev.pendingDeliveries;
      const itemsToAdd = parcel.remainingItems || parcel.totalItems || 10;

      const workingInv = prev.inventory.map((it) => ({ ...it }));
      const matchIdx = workingInv.findIndex(
        (i) =>
          i.productId === parcel.productId ||
          i.productId === `${parcel.productId}_pack` ||
          i.productId === `${parcel.productId}_box`
      );

      if (matchIdx !== -1) {
        const prodId = workingInv[matchIdx].productId;
        workingInv[matchIdx].quantity += itemsToAdd;
        const isCol = isCollectorBoxProduct(prodId) || isOnePieceCollectorProduct(prodId);
        const shelfTargetCap = isCol
          ? COLLECTOR_MAX_BOXES_PER_SHELF
          : workingInv[matchIdx].type === 'pack' && !prodId.startsWith('gacha_')
          ? 8
          : 6;
        // Auto-stock onto matching shelves if allowed
        const canStock = canStockProductOnUnlockedShelves(workingInv, prodId, prev.unlockedShelves);
        if (canStock.allowed && workingInv[matchIdx].shelvedQuantity < shelfTargetCap) {
          const space = shelfTargetCap - workingInv[matchIdx].shelvedQuantity;
          workingInv[matchIdx].shelvedQuantity += Math.min(space, itemsToAdd);
        }
      }

      if (soundManager.isShopWorldAudioAllowed()) soundManager.playBoxOpen();
      sceneManagerRef.current?.syncAllShelves(workingInv, prev.unlockedShelves);
      sceneManagerRef.current?.setDeliveryParcelsCount(
        remainingDeliveries.length,
        remainingDeliveries[0]?.productName || remainingDeliveries[0]?.name,
        remainingDeliveries[0]?.productId
      );

      // (Toast notification removed per user request: "xóa cái này")

      return {
        ...prev,
        inventory: workingInv,
        pendingDeliveries: remainingDeliveries,
      };
    });
  }, []);

  useEffect(() => {
    handleRestockerUnboxDeliveryRef.current = handleRestockerUnboxDelivery;
  }, [handleRestockerUnboxDelivery]);

  useEffect(() => {
    handleCheckoutCompleteRef.current = handleCheckoutComplete;
  }, [handleCheckoutComplete]);

  // Automated Staff Loop (Cashier, Restocker, Hourly Wages — strictly 07:00 AM to 22:00 PM)
  const isStaffOnShift = isStaffWorkingHours(shopState.inGameHour, shopState.inGameMinute);
  useEffect(() => {
    if (gameState !== 'playing' || !isStaffOnShift) return;

    // 1. Auto-Cashier ($18/hr) - Waits for customer to unload items onto counter mat, then scans each item one-by-one!
    const cashierCount = shopState.hiredStaff?.cashier || 0;
    let cashierTimer: any = null;
    if (cashierCount > 0) {
      cashierTimer = setInterval(() => {
        const sceneMgr = sceneManagerRef.current;
        if (sceneMgr && !sceneMgr.isCashierAtCounter()) {
          return;
        }
        const targetCust = queuingCustomerRef.current;
        if (
          !targetCust ||
          targetCust.status === 'leaving' ||
          !targetCust.basket ||
          targetCust.basket.length === 0 ||
          paidCustomerIdsRef.current.has(targetCust.id)
        ) {
          return;
        }

        // Wait until customer finishes placing items onto the mat and any current item finishes crossing the scanner
        if (sceneMgr && !sceneMgr.isCounterReadyForNextAutoScan(targetCust.id)) {
          return;
        }

        const currentCounts = posScannedCountsRef.current;
        const nextUnscanned = targetCust.basket.find(
          (b) => (currentCounts[b.item.id] || 0) < Math.max(1, b.count || 1)
        );
        if (nextUnscanned) {
          handleScanOneCounterItemRef.current?.(nextUnscanned.item.id, targetCust);
          return;
        }

        // Wait for the final scanned item to finish dropping into the PokéCard bag before ringing up!
        if (sceneMgr && sceneMgr.isCounterBusyAnimating()) {
          return;
        }

        const totalRev = targetCust.basket.reduce((sum, item) => sum + item.unitPrice * item.count, 0);
        if (soundManager.isShopWorldAudioAllowed()) soundManager.playCashRegister();
        handleCheckoutCompleteRef.current?.(targetCust, totalRev);
        setToastNotification({
          message: `Thu Ngân tính tiền ${targetCust.name} (+$${totalRev.toFixed(2)})`,
          type: 'success',
        });
      }, Math.max(180, Math.round(280 / cashierCount)));
    }

    // 2. Auto-Restocker ($15/hr) - The 3D NPC physically walks outside to pallet, carries boxes in,
    // and stocks them one by one. This background loop only calmly tops up low shelves from stock.
    const restockerCount = shopState.hiredStaff?.restocker || 0;
    let restockerTimer: any = null;
    if (restockerCount > 0) {
      restockerTimer = setInterval(() => {
        // If deliveries are pending, let the 3D NPC walk and unbox them physically
        if (shopStateRef.current.pendingDeliveries.length > 0) {
          return;
        }

        // Refill low shelves from existing warehouse stock - 2x productivity (every 3.5s)
        setShopState((prev) => {
          let updated = false;
          const workingInv = prev.inventory.map((it) => ({ ...it }));
          for (let idx = 0; idx < workingInv.length; idx++) {
            const item = workingInv[idx];
            const isCol = isCollectorBoxProduct(item.productId) || isOnePieceCollectorProduct(item.productId);
            const shelfCap = isCol
              ? COLLECTOR_MAX_BOXES_PER_SHELF
              : item.type === 'pack' && !item.productId.startsWith('gacha_')
              ? 8
              : 6;
            if (item.quantity > item.shelvedQuantity && item.shelvedQuantity < shelfCap) {
              if (canStockProductOnUnlockedShelves(workingInv, item.productId, prev.unlockedShelves).allowed) {
                workingInv[idx].shelvedQuantity += 1;
                updated = true;
                break; // One item / one shelf at a time
              }
            }
          }
          if (updated) {
            sceneManagerRef.current?.syncAllShelves(workingInv, prev.unlockedShelves);
            return { ...prev, inventory: workingInv };
          }
          return prev;
        });
      }, 3500 / restockerCount);
    }

    // 3. Auto-Office Staff (Nhân viên văn phòng, $22/hr): uses player's cash to order low-stock items to fill shelves,
    // generating delivery parcels outside for the Restocker NPC to carry in and place onto shelves gradually
    const officeStaffCount = shopState.hiredStaff?.officeStaff || 0;
    let officeTimer: any = null;
    if (officeStaffCount > 0) {
      officeTimer = setInterval(() => {
        const latest = shopStateRef.current;
        if ((latest.hiredStaff?.officeStaff || 0) <= 0) return;

        const selection = pickNextAutoWholesaleOrder(latest);
        if (!selection) return;

        const currentPending = latest.pendingDeliveries || [];
        if (currentPending.length >= 6 || (latest.cash || 0) < selection.totalCost) return;

        const nextPendingPreview = [...currentPending, selection.parcel];
        const nextCashPreview = Math.max(0, Number(((latest.cash || 0) - selection.totalCost).toFixed(2)));

        setShopState((prev) => {
          if ((prev.hiredStaff?.officeStaff || 0) <= 0) return prev;
          const prevPending = prev.pendingDeliveries || [];
          if (prevPending.length >= 6 || prev.cash < selection.totalCost) return prev;
          return {
            ...prev,
            cash: Math.max(0, Number((prev.cash - selection.totalCost).toFixed(2))),
            pendingDeliveries: [...prevPending, selection.parcel],
          };
        });

        if (soundManager.isShopWorldAudioAllowed()) soundManager.playDoorChime();
        sceneManagerRef.current?.setDeliveryParcelsCount(
          nextPendingPreview.length,
          nextPendingPreview[0]?.productName || nextPendingPreview[0]?.name,
          nextPendingPreview[0]?.productId
        );
        shopProfileManager.recordHistory({
          category: 'order',
          title: `NV Văn Phòng Đặt Sỉ (${selection.orderCount}x)`,
          amount: selection.totalCost,
          detail: `${selection.orderCount}x ${selection.item.name} — Trừ $${selection.totalCost.toFixed(2)} (Còn $${nextCashPreview.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`,
          isIncome: false,
        });
        setToastNotification({
          type: 'delivery',
          message: `NV đặt sỉ ${selection.orderCount}x ${selection.item.type === 'box' ? 'Box' : 'Pack'} (-$${selection.totalCost.toFixed(2)})`,
        });
      }, 8000);
    }

    // 4. Hourly wages deduction (every 60s, only while staff are on shift 07:00-22:00)
    const wageTimer = setInterval(() => {
      const cCount = shopState.hiredStaff?.cashier || 0;
      const rCount = shopState.hiredStaff?.restocker || 0;
      const oCount = shopState.hiredStaff?.officeStaff || 0;
      const liveCount = shopState.hiredStaff?.liveStreamer || 0;
      const grRec = shopState.hiredStaff?.gradingReceptionist || 0;
      const grSpec = shopState.hiredStaff?.gradingSpecialists || 0;
      const aucCount = shopState.hiredStaff?.auctioneer || 0;
      const hostCount = shopState.hiredStaff?.auctionHost || 0;
      const wage =
        cCount * 18 +
        rCount * 15 +
        oCount * OFFICE_STAFF_WAGE +
        liveCount * LIVE_STREAMER_WAGE +
        grRec * GRADING_RECEPTIONIST_WAGE +
        grSpec * GRADING_SPECIALIST_WAGE +
        aucCount * AUCTIONEER_WAGE +
        hostCount * AUCTION_HOST_WAGE;
      if (wage > 0) {
        setShopState((prev) => ({
          ...prev,
          cash: Math.max(0, prev.cash - wage),
        }));
      }
    }, 60000);

    return () => {
      if (cashierTimer) clearInterval(cashierTimer);
      if (restockerTimer) clearInterval(restockerTimer);
      if (officeTimer) clearInterval(officeTimer);
      clearInterval(wageTimer);
    };
  }, [
    gameState,
    isStaffOnShift,
    shopState.hiredStaff?.cashier,
    shopState.hiredStaff?.restocker,
    shopState.hiredStaff?.officeStaff,
    shopState.hiredStaff?.liveStreamer,
    shopState.hiredStaff?.gradingReceptionist,
    shopState.hiredStaff?.gradingSpecialists,
    shopState.hiredStaff?.auctioneer,
    shopState.hiredStaff?.auctionHost,
  ]);

  // Live VIP Slab Auctions Loop (runs 24/7 while playing so active showroom auctions never stall)
  const hasAnyLiveAuction = (shopState.slabAuctions || []).some((l) => l.status === 'live');
  useEffect(() => {
    if (gameState !== 'playing' || !hasAnyLiveAuction) return;
    const auctionTimer = setInterval(() => {
      setShopState((prev) => {
        if (!(prev.slabAuctions || []).some((l) => l.status === 'live')) return prev;
        const schedule = getAuctionShowroomSchedule(prev.inGameHour, prev.inGameMinute);
        const res = advanceSlabAuctions(prev.slabAuctions || [], 500, prev.activeMarketTrend, Math.random, {
          auctionHostCount: prev.hiredStaff?.auctionHost || 0,
          isPrimeTime: schedule.isPrimeTime,
        });
        if (!res.changed) return prev;
        if (res.newBids.length > 0 && soundManager.isShopWorldAudioAllowed()) {
          soundManager.playQuarterDrop();
        }
        return {
          ...prev,
          slabAuctions: res.nextLots,
        };
      });
    }, 500);
    return () => clearInterval(auctionTimer);
  }, [gameState, hasAnyLiveAuction]);

  // Grading Lab Queue, Customer Commissions, Buyback Sellers, VIP Contracts & Pop Report Loop (500ms tick during 07:00-22:00 shift)
  const gradingSpecialistsCount = shopState.hiredStaff?.gradingSpecialists || 0;
  const gradingReceptionistCount = shopState.hiredStaff?.gradingReceptionist || 0;
  const isGradingLabUnlocked = shopState.storeLevel >= GRADING_SHOP_UNLOCK_LEVEL;

  useEffect(() => {
    if (gameState !== 'playing' || !isStaffOnShift || !isGradingLabUnlocked) {
      return;
    }

    const gradingTimer = setInterval(() => {
      gradingCustomerSpawnMsRef.current += 500;
      gradingBuybackSpawnMsRef.current += 500;
      gradingVipOrderSpawnMsRef.current += 500;
      gradingConsignmentSpawnMsRef.current += 500;

      const shouldTrySpawnCustomer = gradingCustomerSpawnMsRef.current >= 24000;
      if (shouldTrySpawnCustomer) gradingCustomerSpawnMsRef.current = 0;

      const shouldTrySpawnBuyback = gradingBuybackSpawnMsRef.current >= 30000;
      if (shouldTrySpawnBuyback) gradingBuybackSpawnMsRef.current = 0;

      const shouldTrySpawnVip = gradingVipOrderSpawnMsRef.current >= 42000;
      if (shouldTrySpawnVip) gradingVipOrderSpawnMsRef.current = 0;

      const hostCountNow = shopStateRef.current.hiredStaff?.auctionHost || 0;
      const consignmentIntervalMs = hostCountNow >= 1 ? 14000 : 22000;
      const shouldTrySpawnConsignment = gradingConsignmentSpawnMsRef.current >= consignmentIntervalMs;
      if (shouldTrySpawnConsignment) gradingConsignmentSpawnMsRef.current = 0;

      setShopState((prev) => {
        const specs = prev.hiredStaff?.gradingSpecialists || 0;
        const recs = prev.hiredStaff?.gradingReceptionist || 0;
        const auctioneers = prev.hiredStaff?.auctioneer || 0;
        const hosts = prev.hiredStaff?.auctionHost || 0;

        let nextJobs = prev.gradingJobs || [];
        let nextOrders = prev.customerGradingOrders || [];
        let nextBuybacks = prev.buybackOffers || [];
        let nextVipOrders = prev.vipSlabOrders || [];
        let nextConsignmentOffers = prev.auctionConsignmentOffers || [];
        let nextStats = prev.gradingLabStats;
        let nextPop = prev.gradingPopReport;
        let nextExp = prev.storeExp;
        let nextLevel = prev.storeLevel;
        let nextExpToNext = prev.storeExpToNext;
        let nextUnlockedSets = prev.unlockedSets;
        let nextRep = prev.reputation || 0;
        let anyChanged = false;

        if (specs > 0 && nextJobs.some((j) => j.status === 'queued' || j.status === 'grading')) {
          const speedBonusPct = getLuxuryAssetBuffs(prev.ownedLuxuryAssets || []).gradingSpeedBonusPct;
          const jobRes = advanceGradingQueue(nextJobs, 500, specs, Math.random, speedBonusPct);
          if (jobRes.changed) {
            nextJobs = jobRes.nextJobs;
            anyChanged = true;
            for (const done of jobRes.newlyCompleted) {
              if (done.resultSlab) {
                const updated = recordGradedSlabIntoStats(
                  nextStats,
                  nextPop,
                  done.card,
                  done.resultSlab,
                  done.gradedPrice || done.rawPrice,
                  done.feePaid || GRADING_FEE_PER_CARD
                );
                nextStats = updated.nextStats;
                nextPop = updated.nextPop;
              }
              const tierInfo = GRADING_SERVICE_TIERS[done.tier || 'standard'];
              const expRes = applyExpGain(nextExp, nextLevel, tierInfo.xpBonus);
              nextExp = expRes.newExp;
              nextLevel = expRes.newLevel;
              nextExpToNext = expRes.newExpToNext;
              if (expRes.didLevelUp) {
                nextUnlockedSets = getUnlockedSetsForLevel(expRes.newLevel);
              }
              if (tierInfo.reputationBonus > 0) {
                nextRep = Math.min(100, nextRep + tierInfo.reputationBonus);
              }
            }
          }
        }

        if (specs > 0 && nextOrders.some((o) => o.status === 'grading')) {
          const orderRes = advanceCustomerGradingOrders(nextOrders, 500, specs);
          if (orderRes.changed) {
            nextOrders = orderRes.nextOrders;
            anyChanged = true;
            for (const ready of orderRes.newlyReady) {
              if (ready.resultSlab) {
                const updated = recordGradedSlabIntoStats(
                  nextStats,
                  nextPop,
                  ready.card,
                  ready.resultSlab,
                  ready.gradedPrice || ready.card.marketPrice,
                  ready.labCost
                );
                nextStats = updated.nextStats;
                nextPop = updated.nextPop;
              }
            }
          }
        }

        if (shouldTrySpawnCustomer && recs >= 1 && nextOrders.length < 3) {
          const newOrder = generateCustomerGradingOrder(prev.storeLevel);
          nextOrders = [...nextOrders, newOrder];
          anyChanged = true;
        }

        if (shouldTrySpawnBuyback && recs >= 1 && nextBuybacks.length < 3) {
          const newOffer = generateWalkInBuybackOffer(prev.storeLevel);
          nextBuybacks = [...nextBuybacks, newOffer];
          anyChanged = true;
        }

        if (shouldTrySpawnVip && recs >= 1 && nextVipOrders.length < 2) {
          const newVip = generateVipSlabOrder(prev.storeLevel);
          nextVipOrders = [...nextVipOrders, newVip];
          anyChanged = true;
        }

        if (shouldTrySpawnConsignment && (auctioneers >= 1 || hosts >= 1) && nextConsignmentOffers.length < 4) {
          const sched = getAuctionShowroomSchedule(prev.inGameHour, prev.inGameMinute);
          if (sched.isOpen) {
            const newConsign = generateAuctionConsignmentOffer({
              activeTrend: prev.activeMarketTrend,
              auctionHostCount: hosts,
              isPrimeTime: sched.isPrimeTime,
            });
            nextConsignmentOffers = [...nextConsignmentOffers, newConsign];
            anyChanged = true;
          }
        }

        if (!anyChanged) return prev;
        return {
          ...prev,
          gradingJobs: nextJobs,
          customerGradingOrders: nextOrders,
          buybackOffers: nextBuybacks,
          vipSlabOrders: nextVipOrders,
          auctionConsignmentOffers: nextConsignmentOffers,
          gradingLabStats: nextStats,
          gradingPopReport: nextPop,
          storeExp: nextExp,
          storeLevel: nextLevel,
          storeExpToNext: nextExpToNext,
          unlockedSets: nextUnlockedSets,
          reputation: nextRep,
        };
      });
    }, 500);

    return () => clearInterval(gradingTimer);
  }, [gameState, isStaffOnShift, isGradingLabUnlocked, gradingSpecialistsCount, gradingReceptionistCount]);

  // Autonomous Hourly PokeLive Studio Driver (runs independently in background when hired & stocked)
  useEffect(() => {
    if (gameState !== 'playing') return;

    // 1. Every 1s: check hourly auto-live schedule & update live timer/likes
    const secTimer = window.setInterval(() => {
      const rt = liveRuntimeRef.current;
      const latest = shopStateRef.current;
      const now = Date.now();

      if (rt.phase === 'streaming_selling' || rt.phase === 'ripping') {
        setLiveRuntime((prev) => ({
          ...prev,
          elapsedSec: prev.elapsedSec + 1,
          likesCount:
            Math.random() < 0.55
              ? prev.likesCount + Math.floor(1 + Math.random() * 4)
              : prev.likesCount,
        }));
      } else if (
        shouldAutoStartHourlyLiveSession({
          runtime: rt,
          shopState: latest,
          nowMs: now,
        })
      ) {
        const pickedBox = pickAutoLiveBoosterBox(latest.inventory);
        if (pickedBox) {
          const autoPrice = getLiveBreakSlotPriceBounds(
            pickedBox.boxRetailPrice,
            pickedBox.boxWholesalePrice
          ).recommendedSlotPrice;
          handleStartLiveBroadcast(pickedBox, autoPrice, false, true);
        }
      }
    }, 1000);

    // 2. Every 1.3s: advance staggered buyer waiting room during streaming_selling
    const sellTimer = window.setInterval(() => {
      const rt = liveRuntimeRef.current;
      const latest = shopStateRef.current;
      if (rt.phase !== 'streaming_selling' || !rt.activeLiveBox) return;

      // Guarantee the product being sold on live STILL exists in real shop stock
      const stillInStock = latest.inventory.some(
        (i) =>
          i.productId === rt.activeLiveBox!.productId &&
          i.type === 'box' &&
          (i.quantity || 0) >= 1
      );
      if (!stillInStock) {
        if (liveAutoBeginTimerRef.current) {
          window.clearTimeout(liveAutoBeginTimerRef.current);
          liveAutoBeginTimerRef.current = null;
        }
        setLiveRuntime((prev) => ({
          ...prev,
          phase: 'setup',
          activeLiveBox: null,
          chatMessages: [
            ...prev.chatMessages.slice(-45),
            {
              id: `out_stock_${Date.now()}`,
              sender: 'Hệ Thống',
              text: `Mặt hàng ${rt.activeLiveBox!.setName} vừa hết tồn kho tại shop! Nhân viên dừng phiên để đổi sang hàng có sẵn.`,
              kind: 'system',
              timestamp: Date.now(),
            },
          ],
        }));
        return;
      }

      const now = Date.now();
      const hypeActive = now < rt.hypeUntilMs;
      const breakStats = latest.liveBreakStats || {
        breaksHosted: 0,
        slotsSold: 0,
        totalRevenue: 0,
        viralFollowers: 50,
      };
      const res = tickLiveWaitingRoom({
        tickIndex: rt.tickIndex,
        currentViewers: rt.viewers,
        slots: rt.slots,
        boxWholesalePrice: rt.activeLiveBox.boxWholesalePrice,
        boxRetailPrice: rt.activeLiveBox.boxRetailPrice,
        viralFollowers: breakStats.viralFollowers,
        reputation: latest.reputation,
        boxSetName: rt.activeLiveBox.setName,
        packsPerBox: rt.activeLiveBox.packsPerBox,
        hypeBoostActive: hypeActive,
      });

      if (res.soldSlot && pokeLiveOpenRef.current) {
        soundManager.playCashRegister();
      }

      const soldCount = res.nextSlots.filter((s) => s.status === 'sold').length;
      const nextTick = rt.tickIndex + 1;
      const readyToAutoRip =
        (soldCount === 6 || (nextTick >= 22 && soldCount >= 1)) &&
        liveAutoBeginTimerRef.current === null;

      setLiveRuntime((prev) => ({
        ...prev,
        tickIndex: nextTick,
        viewers: res.nextViewers,
        slots: res.nextSlots,
        likesCount: prev.likesCount + (res.soldSlot ? 12 : 0),
        chatMessages:
          res.newMessages.length > 0
            ? [...prev.chatMessages.slice(-45), ...res.newMessages]
            : prev.chatMessages,
      }));

      if (readyToAutoRip) {
        setLiveRuntime((prev) => ({
          ...prev,
          chatMessages: [
            ...prev.chatMessages.slice(-45),
            {
              id: `autolock_${now}`,
              sender: 'Nhân Viên Studio',
              text:
                soldCount === 6
                  ? `🔥 Đủ 6/6 khách chốt đơn rồi! Chuẩn bị xé seal khui ${rt.activeLiveBox!.packsPerBox} Pack trực tiếp cho mọi người nha!`
                  : `⏰ Khóa bảng ${soldCount}/6 Slot! Bắt đầu xé seal khui hộp ngay (các Slot trống Shop giữ)!`,
              kind: 'system',
              timestamp: now,
            },
          ],
        }));
        liveAutoBeginTimerRef.current = window.setTimeout(() => {
          liveAutoBeginTimerRef.current = null;
          handleBeginLiveRipping();
        }, 1600);
      }
    }, 1300);

    return () => {
      window.clearInterval(secTimer);
      window.clearInterval(sellTimer);
    };
  }, [gameState, handleStartLiveBroadcast, handleBeginLiveRipping]);

  // Autonomous Pack-by-Pack Ripping Stepper (paces smoothly both in background and in TikTok Watch Live)
  useEffect(() => {
    if (gameState !== 'playing') return;
    if (liveRuntime.phase !== 'ripping' || !liveRuntime.autoRipActive || !liveRuntime.activeLiveBox) {
      return;
    }
    if (liveRuntime.currentPackNum >= liveRuntime.activeLiveBox.packsPerBox) return;

    const delayMs =
      liveRuntime.currentPackNum === 0
        ? 500
        : pokeLiveOpen && pokeLiveViewingTikTok
        ? 3250
        : 1650;

    const t = window.setTimeout(() => {
      handleRipNextLivePack();
    }, delayMs);

    return () => window.clearTimeout(t);
  }, [
    gameState,
    liveRuntime.phase,
    liveRuntime.autoRipActive,
    liveRuntime.currentPackNum,
    liveRuntime.activeLiveBox,
    pokeLiveOpen,
    pokeLiveViewingTikTok,
    handleRipNextLivePack,
  ]);

  // Shop Security CCTV & Shoplifter Alert Loop (500ms tick while shop is open)
  useEffect(() => {
    if (gameState !== 'playing' || !shopState.isShopOpen) return;

    const secTimer = setInterval(() => {
      const latest = shopStateRef.current;
      if (latest.activeSecurityAlert) {
        const nextRemaining = latest.activeSecurityAlert.remainingMs - 500;
        if (nextRemaining <= 0) {
          const escaped = latest.activeSecurityAlert;
          if (soundManager.isShopWorldAudioAllowed()) soundManager.playWrongBuzzer();
          sceneManagerRef.current?.notifySecurityThiefEscaped();
          setShopState((prev) => {
            const prevSec = prev.securityStats || { theftsPrevented: 0, totalLosses: 0, bountiesEarned: 0 };
            return {
              ...prev,
              cash: Math.max(0, prev.cash - escaped.riskAmount),
              reputation: Math.max(0, (prev.reputation || 50) - 1),
              activeSecurityAlert: null,
              securityStats: {
                theftsPrevented: prevSec.theftsPrevented,
                totalLosses: prevSec.totalLosses + escaped.riskAmount,
                bountiesEarned: prevSec.bountiesEarned,
              },
            };
          });
          setToastNotification({
            type: 'warning',
            message: `🚨 TRỘM TẨU THOÁT! ${escaped.suspectName} lấy mất ${escaped.targetItemName} (-$${escaped.riskAmount}). Hãy nâng cấp An Ninh trong [K]!`,
          });
        } else {
          setShopState((prev) =>
            prev.activeSecurityAlert
              ? {
                  ...prev,
                  activeSecurityAlert: {
                    ...prev.activeSecurityAlert,
                    remainingMs: nextRemaining,
                  },
                }
              : prev
          );
        }
        return;
      }

      securitySpawnMsRef.current += 500;
      if (securitySpawnMsRef.current < 48000) return;
      securitySpawnMsRef.current = 0;

      // Only trigger shoplifters once store reaches Level 2+
      if (latest.storeLevel < 2) return;

      const secRes = rollSecurityAlertEvent({ securityLevel: latest.securityLevel || 0 });
      if (secRes.autoCaught) {
        if (soundManager.isShopWorldAudioAllowed()) soundManager.playWinChime();
        sceneManagerRef.current?.triggerAutoCatchSecurityDemo(secRes.incidentType);
        setShopState((prev) => {
          const prevSec = prev.securityStats || { theftsPrevented: 0, totalLosses: 0, bountiesEarned: 0 };
          return {
            ...prev,
            cash: prev.cash + secRes.autoBounty,
            totalRevenue: prev.totalRevenue + secRes.autoBounty,
            securityStats: {
              theftsPrevented: prevSec.theftsPrevented + 1,
              totalLosses: prevSec.totalLosses,
              bountiesEarned: prevSec.bountiesEarned + secRes.autoBounty,
            },
          };
        });
        setToastNotification({
          type: 'success',
          message: `🛡️ Bảo vệ & Cổng từ tự tóm gọn ${secRes.suspectName}! Nhận thưởng +$${secRes.autoBounty}.`,
        });
      } else if (secRes.alert) {
        if (soundManager.isShopWorldAudioAllowed()) soundManager.playWrongBuzzer();
        setShopState((prev) => ({
          ...prev,
          activeSecurityAlert: secRes.alert,
        }));
      }
    }, 500);

    return () => clearInterval(secTimer);
  }, [gameState, shopState.isShopOpen]);

  // 3D City POI Proximity Check for Rare Hunts, Unowned Luxury Showrooms & Satellite Kiosk Collection
  useEffect(() => {
    if (gameState !== 'playing') {
      if (nearPoiPromptRef.current) setNearPoiPrompt(null);
      return;
    }

    const proxTimer = setInterval(() => {
      const pose = minimapPoseRef.current;
      const latest = shopStateRef.current;

      // Clear GPS empire waypoint if arrived
      if (empireWaypoint && Math.hypot(empireWaypoint.x - pose.x, empireWaypoint.z - pose.z) <= 16) {
        setEmpireWaypoint(null);
      }

      let found: typeof nearPoiPrompt = null;

      // 0. Nearby 3D Shoplifter / Slab Swapper NPC inside shop (within 4.8m)
      const thiefDist = sceneManagerRef.current?.getThiefDistanceToPlayer();
      if (latest.activeSecurityAlert && thiefDist !== null && thiefDist !== undefined && thiefDist <= 4.8) {
        found = {
          id: `thief_${latest.activeSecurityAlert.id}`,
          kind: 'catch_thief',
          badgeLabel: 'Bắt Quả Tang',
          priceLabel: `+$${latest.activeSecurityAlert.bountyReward}`,
          title: latest.activeSecurityAlert.suspectName,
          subtitle: 'Click trực tiếp kẻ trộm 3D hoặc bấm Bắt Trộm',
        };
      }

      // 1. Nearby active City Hunt Spot (within 14m)
      if (!found) {
        for (const spot of latest.cityHuntSpots || []) {
          if (spot.status !== 'active') continue;
          if (Math.hypot(spot.x - pose.x, spot.z - pose.z) <= 14) {
            found = {
              id: `hunt_${spot.id}`,
              kind: 'hunt',
              badgeLabel: 'Săn Thẻ Hiếm',
              priceLabel: `$${spot.askingPrice}`,
              title: spot.card.name,
              subtitle: `${spot.sellerName} · ${spot.locationName}`,
              spotId: spot.id,
            };
            break;
          }
        }
      }

      // 2. Nearby Satellite Kiosk with uncollected cash (within 18m)
      if (!found) {
        for (const kCfg of SATELLITE_KIOSK_CATALOG) {
          const kState = latest.satelliteKiosks?.[kCfg.id];
          if (!kState?.unlocked || kState.uncollectedCash < 1) continue;
          const poi = CITY_POIS.find((p) => p.id === kCfg.poiId);
          if (!poi) continue;
          if (Math.hypot(poi.x - pose.x, poi.z - pose.z) <= 18) {
            found = {
              id: `kiosk_${kCfg.id}`,
              kind: 'kiosk_collect',
              badgeLabel: 'Thu Tiền Kiosk',
              priceLabel: `+$${kState.uncollectedCash.toFixed(0)}`,
              title: kCfg.name,
              subtitle: `Tier ${kState.tier} · Thu hoạch doanh thu thụ động`,
              kioskId: kCfg.id,
            };
            break;
          }
        }
      }

      // 3. Nearby Unowned Luxury Store Showroom (within 15m)
      if (!found) {
        const owned = new Set(latest.ownedLuxuryAssets || []);
        for (const asset of LUXURY_ASSETS_CATALOG) {
          if (owned.has(asset.id)) continue;
          const poi = CITY_POIS.find((p) => p.id === asset.poiId);
          if (!poi) continue;
          if (Math.hypot(poi.x - pose.x, poi.z - pose.z) <= 15) {
            found = {
              id: `lux_${asset.id}`,
              kind: 'luxury',
              badgeLabel: 'Showroom Luxury',
              priceLabel: `$${asset.price.toLocaleString()}`,
              title: asset.storeName,
              subtitle: asset.name,
            };
            break;
          }
        }
      }

      const prevNow = nearPoiPromptRef.current;
      if ((prevNow?.id || null) !== (found?.id || null)) {
        setDismissedPoiPromptId(null);
      }
      if (
        (prevNow?.id || null) !== (found?.id || null) ||
        (prevNow?.title || null) !== (found?.title || null) ||
        (prevNow?.priceLabel || null) !== (found?.priceLabel || null)
      ) {
        setNearPoiPrompt(found);
      }
    }, 450);

    return () => clearInterval(proxTimer);
  }, [gameState, empireWaypoint]);

  // React 18-safe Grading Lab & Auction Notifications Watcher
  useEffect(() => {
    const currJobs = shopState.gradingJobs || [];
    const currOrders = shopState.customerGradingOrders || [];
    const currAuctions = shopState.slabAuctions || [];

    if (gradingEffectProfileIdRef.current !== activeProfile.id || gameState !== 'playing') {
      gradingEffectProfileIdRef.current = activeProfile.id;
      const nextJobMap: Record<string, GradingJob['status']> = {};
      currJobs.forEach((j) => {
        nextJobMap[j.id] = j.status;
      });
      prevGradingJobStatusRef.current = nextJobMap;

      const nextOrderMap: Record<string, CustomerGradingOrder['status']> = {};
      currOrders.forEach((o) => {
        nextOrderMap[o.id] = o.status;
      });
      prevCustomerOrderStatusRef.current = nextOrderMap;

      const nextAuctionMap: Record<string, SlabAuctionLot['status']> = {};
      currAuctions.forEach((l) => {
        nextAuctionMap[l.id] = l.status;
      });
      prevAuctionStatusRef.current = nextAuctionMap;
      return;
    }

    const newlyCompletedJobs = currJobs.filter((j) => {
      const prevStatus = prevGradingJobStatusRef.current[j.id];
      return j.status === 'completed' && (prevStatus === 'queued' || prevStatus === 'grading');
    });

    const newlyArrivedOrders = currOrders.filter(
      (o) => !prevCustomerOrderStatusRef.current[o.id] && o.status === 'waiting_approval'
    );

    const newlyReadyOrders = currOrders.filter(
      (o) => prevCustomerOrderStatusRef.current[o.id] === 'grading' && o.status === 'ready_pickup'
    );

    const newlyEndedAuctions = currAuctions.filter(
      (l) => prevAuctionStatusRef.current[l.id] === 'live' && l.status === 'ended'
    );

    const nextJobMap: Record<string, GradingJob['status']> = {};
    currJobs.forEach((j) => {
      nextJobMap[j.id] = j.status;
    });
    prevGradingJobStatusRef.current = nextJobMap;

    const nextOrderMap: Record<string, CustomerGradingOrder['status']> = {};
    currOrders.forEach((o) => {
      nextOrderMap[o.id] = o.status;
    });
    prevCustomerOrderStatusRef.current = nextOrderMap;

    const nextAuctionMap: Record<string, SlabAuctionLot['status']> = {};
    currAuctions.forEach((l) => {
      nextAuctionMap[l.id] = l.status;
    });
    prevAuctionStatusRef.current = nextAuctionMap;

    if (newlyCompletedJobs.length > 0) {
      const blackLabel10 = newlyCompletedJobs.find(
        (j) =>
          j.resultSlab?.company === 'BGS' &&
          j.resultSlab?.grade === 10 &&
          j.resultSlab?.gradeLabel.includes('BLACK LABEL')
      );
      const pristine10 = newlyCompletedJobs.find(
        (j) => j.resultSlab?.grade === 10 && j.resultSlab?.gradeLabel.includes('PRISTINE')
      );
      const anyGrade10 = newlyCompletedJobs.find((j) => j.resultSlab?.grade === 10);

      if (blackLabel10) {
        soundManager.playRarePullFanfare();
        confetti({
          particleCount: 240,
          spread: 110,
          origin: { y: 0.45 },
          colors: ['#fbbf24', '#18181b', '#d97706', '#ffffff'],
        });
        setToastNotification({
          type: 'success',
          message: `🖤 BGS BLACK LABEL 10 (10/10/10/10) HUYỀN THOẠI! ${blackLabel10.card.name} đạt x5.2 giá ($${(
            blackLabel10.gradedPrice || 0
          ).toLocaleString()})!`,
        });
      } else if (pristine10) {
        soundManager.playRarePullFanfare();
        confetti({
          particleCount: 180,
          spread: 95,
          origin: { y: 0.5 },
          colors: ['#fbbf24', '#f59e0b', '#18181b', '#ffffff'],
        });
        setToastNotification({
          type: 'success',
          message: `👑 ${pristine10.resultSlab?.company} PRISTINE 10 ĐEN-VÀNG HIẾM! ${pristine10.card.name} đạt giá $${(
            pristine10.gradedPrice || 0
          ).toLocaleString()}!`,
        });
      } else if (anyGrade10) {
        soundManager.playRarePullFanfare();
        confetti({
          particleCount: 140,
          spread: 85,
          origin: { y: 0.5 },
          colors: ['#ffd700', '#38bdf8', '#ef4444', '#ffffff'],
        });
        setToastNotification({
          type: 'success',
          message: `🏆 SIÊU PHẨM GRADE 10! ${anyGrade10.card.name} đạt ${anyGrade10.resultSlab?.company} ${anyGrade10.resultSlab?.gradeLabel} ($${(
            anyGrade10.gradedPrice || 0
          ).toLocaleString()})!`,
        });
      } else {
        soundManager.playWinChime();
        const first = newlyCompletedJobs[0];
        const roiLoss =
          (first.resultSlab?.grade || 10) <= 7 &&
          (first.gradedPrice || 0) < first.rawPrice + (first.feePaid || GRADING_FEE_PER_CARD);
        setToastNotification({
          type: roiLoss ? 'warning' : 'info',
          message: roiLoss
            ? `📉 ${first.card.name} chỉ đạt ${first.resultSlab?.company} ${first.resultSlab?.grade} ($${first.gradedPrice})! Mẹo: Kiểm tra bộ tính Hòa Vốn (+EV) & soi Kính Lúp 10x trước khi gửi.`
            : `✅ Chấm xong ${first.card.name}: ${first.resultSlab?.company} ${first.resultSlab?.grade}! Mở quầy Thẩm Định để nhận Slab.`,
        });
      }
    } else if (newlyEndedAuctions.length > 0) {
      const ended = newlyEndedAuctions[0];
      soundManager.playWinChime();
      setToastNotification({
        type: 'success',
        message: `🔨 Phiên đấu giá ${ended.entry.card.name} đã đóng sổ ở mức $${ended.currentBid.toLocaleString()}! Vào Sàn Đấu Giá VIP để chốt nhận tiền.`,
      });
    } else if (newlyReadyOrders.length > 0) {
      soundManager.playWinChime();
      const firstReady = newlyReadyOrders[0];
      setToastNotification({
        type: 'success',
        message: `✅ Đơn của ${firstReady.customerName} đã xong (${firstReady.resultSlab?.company} ${firstReady.resultSlab?.gradeLabel})! Vào Tab Thu Mua & Đơn Khách để trả Slab & thu +$${firstReady.customerPaysFee}.`,
      });
    } else if (newlyArrivedOrders.length > 0) {
      soundManager.playSelectSound();
      const arrived = newlyArrivedOrders[0];
      setToastNotification({
        type: 'info',
        message: `📋 Khách ${arrived.customerName} (${arrived.customerRole}) vừa mang ${arrived.card.name} tới Quầy Thẩm Định chấm ${arrived.company} (Lãi +$${arrived.netProfit})!`,
      });
    }
  }, [shopState.gradingJobs, shopState.customerGradingOrders, shopState.slabAuctions, activeProfile.id, gameState]);

  // Count available packs & boxes in inventory
  const totalPacksInStock = shopState.inventory
    .filter((i) => i.type === 'pack')
    .reduce((sum, i) => sum + i.quantity, 0);

  const totalBoxesInStock = shopState.inventory
    .filter((i) => i.type === 'box')
    .reduce((sum, i) => sum + i.quantity, 0);

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-zinc-950 select-none font-sans text-white">
      {/* 3D WebGL Canvas Container */}
      <div
        ref={canvasMountRef}
        data-testid="shop-canvas-mount"
        className="absolute inset-0 h-full w-full"
      />

      {/* Title Screen Overlay */}
      {gameState === 'title' && (
        <ShopTitleScreen
          activeProfile={activeProfile}
          isAccountModalOpen={settingsModalOpen}
          onOpenAccountModal={(tab) => handleOpenSettingsModal(tab || 'switch')}
          onSwitchToTestAccount={() => {
            const vip = shopProfileManager.switchToTestVipProfile();
            handleProfileChanged(vip, { switchedAccount: true });
            soundManager.playWinChime();
          }}
          onStart={handleStartGame}
        />
      )}

      {/* Active Playing HUD (Steam TCG Shop Simulator Style - Images 1, 2, 3, 4) */}
      {gameState === 'playing' && (
        <div className="pointer-events-none absolute inset-0 z-30 flex flex-col justify-between p-3 sm:p-5">
          {/* TOP BAR: Day/Time (Top Left) & Shop Level / Cash (Top Right) */}
          <div className="flex items-start justify-between flex-wrap gap-2">
            {/* Top Left: Authentic "Day 1 07:00AM" Clock Badge & Customer Queue Alert */}
            <div className="flex items-center flex-wrap gap-2 sm:gap-2.5">
              {/* Day & Time Counter + Live FPS / Graphics Quality Toggle */}
              <div className="pointer-events-auto flex items-center gap-2 rounded-2xl border border-zinc-800 bg-black/90 px-3 py-1.5 shadow-2xl">
                <button
                  type="button"
                  onClick={() => {
                    soundManager.playSelectSound();
                    setShopState((prev) => {
                      const isCurrentlyClosedNight =
                        !prev.isShopOpen || (prev.inGameHour >= 4 && prev.inGameHour < 7);
                      const isCurrentlyActiveNight =
                        prev.isShopOpen && (prev.inGameHour >= 18 || prev.inGameHour < 4);
                      let nextHour = 21;
                      let nextOpen = true;
                      if (isCurrentlyClosedNight) {
                        nextHour = 12;
                        nextOpen = true;
                      } else if (isCurrentlyActiveNight) {
                        nextHour = 4;
                        nextOpen = false;
                      } else {
                        nextHour = 21;
                        nextOpen = true;
                      }
                      return {
                        ...prev,
                        inGameHour: nextHour,
                        inGameMinute: 0,
                        isShopOpen: nextOpen,
                      };
                    });
                  }}
                  title="Bấm để chuyển nhanh: Ban ngày (12:00 PM) → Buổi tối mở cửa (09:00 PM) → Đóng cửa (04:00 AM)"
                  className="flex items-center gap-2 rounded-xl px-1 py-0.5 hover:bg-zinc-900/90 cursor-pointer transition text-left group"
                >
                  <span className="text-xs sm:text-sm font-black text-white tracking-wide group-hover:text-amber-200">
                    Day {shopState.currentDay || 1}
                  </span>
                  <span className="text-xs sm:text-sm font-black text-amber-300 font-mono">
                    {(() => {
                      const h = shopState.inGameHour ?? 7;
                      const m = shopState.inGameMinute ?? 0;
                      const period = h >= 12 ? 'PM' : 'AM';
                      const displayHour = h % 12 === 0 ? 12 : h % 12;
                      const displayMin = m.toString().padStart(2, '0');
                      const padHour = displayHour.toString().padStart(2, '0');
                      return `${padHour}:${displayMin} ${period}`;
                    })()}
                  </span>
                </button>
                <FpsBadge
                  quality={graphicsQuality}
                  onCycleQuality={handleCycleGraphicsQuality}
                />
              </div>

              {/* Queuing Customer Alert Badge */}
              {queuingCustomer && (
                <button
                  onClick={() => {
                    soundManager.playSelectSound();
                    setOpenModal('register');
                  }}
                  className="pointer-events-auto flex items-center gap-2 rounded-2xl border-2 border-emerald-400 bg-emerald-950/90 px-3 py-1.5 text-left shadow-[0_0_20px_rgba(16,185,129,0.5)] hover:border-emerald-300 cursor-pointer transition"
                >
                  <CreditCard className="h-4 w-4 text-emerald-300" />
                  <div>
                    <div className="text-[9px] font-black text-emerald-300 uppercase">
                      1 Khách Chờ Thu Ngân!
                    </div>
                    <div className="text-xs font-bold text-white">
                      {queuingCustomer.name} ({queuingCustomer.basket.length} món)
                    </div>
                  </div>
                </button>
              )}

              {/* Live Security Shoplifter Alert Banner */}
              {shopState.activeSecurityAlert && (
                <button
                  type="button"
                  onClick={handleCatchShoplifter}
                  className="pointer-events-auto flex items-center gap-2.5 rounded-2xl border-2 border-rose-500 bg-rose-950/95 px-3 py-1.5 text-left shadow-[0_0_24px_rgba(244,63,94,0.55)] hover:bg-rose-900 cursor-pointer transition"
                >
                  <ShieldAlert className="h-4 w-4 text-rose-300 shrink-0" />
                  <div>
                    <div className="text-[9px] font-black text-rose-300 uppercase flex items-center gap-1.5">
                      <span>🚨 KẺ GIAN ĐANG TRÀ TRỘN TRONG SHOP</span>
                      <span className="font-mono text-amber-300">
                        {Math.ceil(shopState.activeSecurityAlert.remainingMs / 1000)}s
                      </span>
                    </div>
                    <div className="text-xs font-bold text-white">
                      {shopState.activeSecurityAlert.suspectName} · Click 3D / Nhấn để Bắt (+${shopState.activeSecurityAlert.bountyReward})
                    </div>
                  </div>
                </button>
              )}

              {/* Active PokeShip Delivery Mission HUD Card */}
              {activeMission && activeDeliveryStop && !openModal && (() => {
                const snapNow = minimapPoseRef.current;
                const distMeters = Math.round(
                  Math.hypot(activeDeliveryStop.x - snapNow.x, activeDeliveryStop.z - snapNow.z)
                );
                const rushSecLeft =
                  activeMission.deadlineAtMs != null
                    ? Math.ceil((activeMission.deadlineAtMs - deliveryNowMs) / 1000)
                    : null;
                return (
                  <div className="pointer-events-auto flex items-center gap-2.5 rounded-2xl border border-emerald-400/70 bg-slate-950/95 px-3 py-1.5 shadow-[0_4px_24px_rgba(16,185,129,0.28)]">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white ring-1 ring-emerald-400/70 p-0.5 shadow">
                      <img
                        src="/assets/aistudio/image_4ef28ede.png"
                        alt="PokéShip"
                        className="h-full w-full rounded-full object-contain"
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-sky-300">
                        <span>{activeMission.code}</span>
                        {activeMission.stops.length > 1 && (
                          <span className="rounded bg-emerald-500/20 px-1 text-emerald-300">
                            Điểm {activeMission.currentStopIndex + 1}/{activeMission.stops.length}
                          </span>
                        )}
                        <span className="text-amber-300 font-mono">{distMeters}m</span>
                        {rushSecLeft !== null && (
                          <span
                            className={`flex items-center gap-0.5 rounded px-1 font-mono ${
                              rushSecLeft > 0
                                ? 'bg-orange-500/20 text-orange-300'
                                : 'bg-rose-500/20 text-rose-300'
                            }`}
                          >
                            <Timer className="h-2.5 w-2.5" />
                            {rushSecLeft > 0 ? `${rushSecLeft}s` : 'HẾT HẠN'}
                          </span>
                        )}
                      </div>
                      <div className="text-xs font-bold text-white truncate max-w-[230px]">
                        {activeDeliveryStop.recipientName} • {activeDeliveryStop.locationName}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        soundManager.playSelectSound();
                        setIsFullMapOpen(true);
                      }}
                      title="Xem bản đồ GPS [Z]"
                      className="rounded-lg border border-sky-500/40 bg-sky-500/15 px-2 py-1 text-[10px] font-black text-sky-200 hover:bg-sky-500/30 cursor-pointer"
                    >
                      GPS
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        soundManager.playSelectSound();
                        setTabletInitialApp('pokeship');
                        setOpenModal('pc_ordering');
                      }}
                      title="Mở app PokeShip trên Tablet"
                      className="rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1 text-[10px] font-bold text-zinc-300 hover:text-white cursor-pointer"
                    >
                      Chi Tiết
                    </button>
                  </div>
                );
              })()}
            </div>

            {/* Top Right: Consolidated Master HUD (Cash + Level/XP + Profile) & Pause + Compact Incoming Order */}
            <div className="flex flex-col items-end gap-2">
              <div className="flex items-center gap-2">
                {/* Single Sleek Master Capsule merging Cash, Level/XP, and Profile */}
                <div className="pointer-events-auto flex items-center rounded-2xl border border-zinc-800/90 bg-black/90 p-1 sm:p-1.5 shadow-2xl transition hover:border-zinc-700">
                  {/* 1. Cash Balance */}
                  <button
                    onClick={() => {
                      soundManager.playSelectSound();
                      setOpenModal('pc_ordering');
                    }}
                    title="Quỹ tiền cửa hàng - Bấm để mở Tablet Quản Lý Tiệm"
                    className="flex items-center gap-2 rounded-xl px-2.5 py-1 hover:bg-white/5 transition cursor-pointer focus:outline-none"
                  >
                    <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 font-black text-xs">
                      $
                    </div>
                    <span className="text-sm sm:text-base font-black tabular-nums text-emerald-400 drop-shadow-[0_1px_6px_rgba(52,211,153,0.35)]">
                      ${shopState.cash.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </button>

                  {/* Divider */}
                  <div className="h-6 w-px bg-zinc-800 mx-1" />

                  {/* 2. Shop Level & XP Progress */}
                  <div
                    onClick={() => {
                      soundManager.playSelectSound();
                      setOpenModal('pc_ordering');
                    }}
                    title={`Cấp cửa hàng: Level ${shopState.storeLevel} (${shopState.storeExp}/${shopState.storeExpToNext} XP) - Bấm để mở Tablet`}
                    className="flex items-center gap-2 rounded-xl px-2.5 py-1 hover:bg-white/5 transition cursor-pointer"
                  >
                    <div className="flex flex-col items-start leading-none">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-[11px] font-black text-zinc-200">
                          Lv.{shopState.storeLevel}
                        </span>
                        <span className="text-[9px] font-mono font-semibold text-zinc-400">
                          {shopState.storeExp}/{shopState.storeExpToNext} XP
                        </span>
                      </div>
                      <div className="w-16 sm:w-24 h-1.5 bg-zinc-800 rounded-full overflow-hidden border border-zinc-700/60">
                        <div
                          className="h-full bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full transition-all duration-300"
                          style={{
                            width: `${Math.min(100, Math.max(3, (shopState.storeExp / Math.max(1, shopState.storeExpToNext)) * 100))}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="h-6 w-px bg-zinc-800 mx-1" />

                  {/* 3. Player Profile & Settings */}
                  <button
                    onClick={() => handleOpenSettingsModal('profile')}
                    title={`Tài khoản: ${activeProfile.name} (${shopState.shopName}) — Bấm để đổi thông tin, mật khẩu hoặc đổi người chơi`}
                    className="flex items-center gap-2 rounded-xl px-2 py-1 hover:bg-white/5 transition cursor-pointer focus:outline-none"
                  >
                    <div
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-black font-black text-xs border border-white/20 shadow-sm"
                      style={{ backgroundColor: activeProfile.avatarColor || '#f59e0b' }}
                    >
                      {activeProfile.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="hidden sm:block text-left leading-tight">
                      <div className="text-[11px] font-black text-amber-300 max-w-[95px] truncate">
                        {activeProfile.name}
                      </div>
                    </div>
                    <UserCog className="h-3.5 w-3.5 text-zinc-400 hover:text-white transition" />
                  </button>
                </div>

                {/* Pause (Esc/P) */}
                <button
                  onClick={() => setGameState('paused')}
                  title="Tạm dừng game (Esc/P)"
                  aria-label="Tạm dừng game"
                  className="pointer-events-auto flex h-9 w-9 items-center justify-center rounded-2xl border border-zinc-800 bg-black/90 text-zinc-200 hover:border-amber-400 hover:text-white cursor-pointer transition shadow-xl"
                >
                  <Pause className="h-4 w-4" />
                </button>
              </div>

              {/* Ultra-Compact Top-Right Incoming PokeShip Order Pill (persists until closed/accepted) */}
              {incomingOrderNotice && !activeMission && !openModal && (() => {
                const stop0 = incomingOrderNotice.stops[0];
                const payout =
                  incomingOrderNotice.itemPayout +
                  incomingOrderNotice.baseFee +
                  incomingOrderNotice.tipBonus +
                  incomingOrderNotice.rushBonusFee;

                return (
                  <div className="pointer-events-auto w-[276px] rounded-2xl border border-white/15 bg-zinc-950/95 px-3 py-2 shadow-[0_10px_30px_rgba(0,0,0,0.65)] animate-in fade-in slide-in-from-right-3 duration-200">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white ring-1 ring-emerald-400/70 p-0.5 overflow-hidden">
                          <img
                            src="/assets/aistudio/image_4ef28ede.png"
                            alt="PokéShip"
                            className="h-full w-full rounded-full object-contain"
                          />
                        </span>
                        <span className="text-[11px] font-bold text-white whitespace-nowrap">
                          Đơn mới
                        </span>
                        <span className="font-mono text-[10px] text-zinc-400 whitespace-nowrap">
                          #{incomingOrderNotice.code}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="font-mono text-xs font-bold text-emerald-400 tabular-nums">
                          +${payout.toFixed(0)}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            soundManager.playSelectSound();
                            incomingOrderDismissedRef.current = true;
                            setIncomingOrderNotice(null);
                          }}
                          title="Đóng"
                          aria-label="Đóng thông báo đơn"
                          className="flex h-4 w-4 items-center justify-center rounded text-zinc-400 hover:bg-white/10 hover:text-white transition cursor-pointer text-xs leading-none"
                        >
                          ×
                        </button>
                      </div>
                    </div>

                    <div className="mt-1.5 flex items-center justify-between gap-2">
                      <div className="min-w-0 text-[10px] text-zinc-400 truncate">
                        {stop0?.locationName} · {incomingOrderNotice.totalDistanceMeters}m
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            soundManager.playSelectSound();
                            setIncomingOrderNotice(null);
                            setTabletInitialApp('pokeship');
                            setOpenModal('pc_ordering');
                          }}
                          className="rounded-md border border-white/12 bg-white/5 hover:bg-white/10 px-2 py-0.5 text-[10px] font-medium text-zinc-200 transition cursor-pointer whitespace-nowrap"
                        >
                          Xem
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            handleAcceptDeliveryOrder(incomingOrderNotice);
                          }}
                          className="rounded-md bg-emerald-500 hover:bg-emerald-400 px-2.5 py-0.5 text-[10px] font-bold text-zinc-950 transition cursor-pointer whitespace-nowrap"
                        >
                          Nhận
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Top-Right Compact Proximity Action Card (Săn Thẻ Hiếm / Kiosk / Luxury / Bắt Trộm - Click directly, no [E] needed) */}
              {!nearDeliveryTarget &&
                !activeStation &&
                nearPoiPrompt &&
                dismissedPoiPromptId !== nearPoiPrompt.id &&
                !openModal &&
                !cityEmpireOpen && (() => {
                  const isHunt = nearPoiPrompt.kind === 'hunt';
                  const isKiosk = nearPoiPrompt.kind === 'kiosk_collect';
                  const isThief = nearPoiPrompt.kind === 'catch_thief';
                  const borderClass = isThief
                    ? 'border-rose-400/55'
                    : isKiosk
                      ? 'border-emerald-400/50'
                      : 'border-amber-400/50';
                  const iconBoxClass = isThief
                    ? 'bg-rose-500/20 border-rose-400/50 text-rose-300'
                    : isKiosk
                      ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-300'
                      : 'bg-amber-400/20 border-amber-400/50 text-amber-300';
                  const priceClass = isThief
                    ? 'text-rose-300'
                    : isKiosk
                      ? 'text-emerald-400'
                      : 'text-amber-300';
                  const btnClass = isThief
                    ? 'bg-rose-500 hover:bg-rose-400 text-white'
                    : isKiosk
                      ? 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950'
                      : 'bg-amber-400 hover:bg-amber-300 text-zinc-950';
                  const ctaLabel = isThief
                    ? 'Bắt Trộm'
                    : isKiosk
                      ? 'Thu Tiền'
                      : isHunt
                        ? 'Thương Lượng'
                        : 'Xem';

                  const handleTriggerPoiPrompt = () => {
                    soundManager.playSelectSound();
                    if (nearPoiPrompt.kind === 'catch_thief') {
                      handleCatchShoplifterRef.current?.();
                    } else if (nearPoiPrompt.kind === 'kiosk_collect' && nearPoiPrompt.kioskId) {
                      handleCollectKioskCash(nearPoiPrompt.kioskId);
                    } else if (nearPoiPrompt.kind === 'hunt') {
                      setTabletInitialApp('card_social');
                      setOpenModal('pc_ordering');
                    } else {
                      setCityEmpireInitialTab('luxury_kiosk');
                      setCityEmpireOpen(true);
                    }
                  };

                  return (
                    <div
                      className={`pointer-events-auto w-[276px] rounded-2xl border ${borderClass} bg-zinc-950/95 px-3 py-2 shadow-[0_10px_30px_rgba(0,0,0,0.65)] animate-in fade-in slide-in-from-right-3 duration-200`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span
                            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${iconBoxClass}`}
                          >
                            {isThief ? (
                              <ShieldAlert className="h-3 w-3" />
                            ) : isKiosk ? (
                              <Store className="h-3 w-3" />
                            ) : (
                              <Crown className="h-3 w-3" />
                            )}
                          </span>
                          <span className="text-[11px] font-bold text-white whitespace-nowrap">
                            {nearPoiPrompt.badgeLabel || 'Cơ Hội Gần Bạn'}
                          </span>
                          <span className="text-[10px] font-semibold text-amber-200/90 truncate">
                            {nearPoiPrompt.title}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {nearPoiPrompt.priceLabel && (
                            <span className={`font-mono text-xs font-bold tabular-nums ${priceClass}`}>
                              {nearPoiPrompt.priceLabel}
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              soundManager.playSelectSound();
                              setDismissedPoiPromptId(nearPoiPrompt.id);
                            }}
                            title="Đóng"
                            aria-label="Đóng thông báo gần"
                            className="flex h-4 w-4 items-center justify-center rounded text-zinc-400 hover:bg-white/10 hover:text-white transition cursor-pointer text-xs leading-none"
                          >
                            ×
                          </button>
                        </div>
                      </div>

                      <div className="mt-1.5 flex items-center justify-between gap-2">
                        <div className="min-w-0 text-[10px] text-zinc-400 truncate">
                          {nearPoiPrompt.subtitle}
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={handleTriggerPoiPrompt}
                            className={`rounded-md px-2.5 py-0.5 text-[10px] font-bold transition cursor-pointer whitespace-nowrap ${btnClass}`}
                          >
                            {ctaLabel}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })()}
            </div>
          </div>

          {/* Cashier Register Bottom-Right HUD (Item-by-Item Scan & Bagging Progress) */}
          {activeStation?.id === 'register' && !openModal && (
            <div className="pointer-events-auto absolute bottom-24 sm:bottom-6 right-6 z-30 flex flex-col items-end gap-2 text-white">
              {queuingCustomer ? (() => {
                const posTotalUnits = queuingCustomer.basket.reduce(
                  (sum, b) => sum + Math.max(1, b.count || 1),
                  0
                );
                const posScannedUnits = queuingCustomer.basket.reduce(
                  (sum, b) => sum + Math.min(Math.max(1, b.count || 1), posScannedCounts[b.item.id] || 0),
                  0
                );
                return (
                  <>
                    <div className="flex items-center gap-2 rounded-xl bg-zinc-950/90 border border-amber-400/35 px-3 py-1.5 text-xs shadow-lg">
                      <span className="text-zinc-300">Khách tại quầy:</span>
                      <span className="font-bold text-amber-300">{queuingCustomer.name}</span>
                      <span className="rounded bg-zinc-800 px-1.5 py-0.5 font-mono font-bold text-emerald-300">
                        {posScannedUnits}/{posTotalUnits} món
                      </span>
                    </div>

                    {!isPosScanned ? (
                      <button
                        onClick={() => handleScanOneCounterItem()}
                        className="flex items-center gap-2.5 px-4 py-2 rounded-xl transition-all cursor-pointer font-bold shadow-2xl bg-emerald-600/95 hover:bg-emerald-500 border border-emerald-400 text-white"
                      >
                        <span className="text-sm">
                          Quét Món Tiếp Theo ({posScannedUnits}/{posTotalUnits})
                        </span>
                        <span className="px-2 py-0.5 rounded bg-black/60 border border-white/20 text-xs font-mono font-black text-amber-300">
                          SPACE
                        </span>
                      </button>
                    ) : (
                      <button
                        onClick={handleDirectCheckout}
                        className="flex items-center gap-2.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black font-black text-sm shadow-2xl cursor-pointer transition-all"
                      >
                        <span>Thu Tiền & Đóng Túi ✓</span>
                        <span className="px-2 py-0.5 rounded bg-black/80 text-xs font-mono font-black text-amber-400">
                          SPACE / ENTER
                        </span>
                      </button>
                    )}

                    <button
                      onClick={() => {
                        soundManager.playSelectSound();
                        setOpenModal('register');
                      }}
                      className="flex items-center gap-2 px-3 py-1 rounded-lg bg-zinc-900/90 hover:bg-zinc-800 border border-white/15 text-[11px] font-bold text-sky-300 cursor-pointer"
                    >
                      <span>Mở Màn Hình POS Chi Tiết</span>
                      <span className="px-1.5 py-0.5 rounded bg-black/60 font-mono text-white">E</span>
                    </button>
                  </>
                );
              })() : (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/85 border border-white/10 text-xs text-zinc-300">
                  <div className="h-2 w-2 rounded-full bg-emerald-400 mr-1" />
                  <span>Quầy POS đang chờ khách đặt hàng...</span>
                </div>
              )}

              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/85 border border-white/10 text-xs text-zinc-300 font-medium">
                <span>Rời Quầy</span>
                <div className="flex gap-1">
                  <span className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-[10px] font-mono font-bold text-zinc-200">W</span>
                  <span className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-[10px] font-mono font-bold text-zinc-200">A</span>
                  <span className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-[10px] font-mono font-bold text-zinc-200">S</span>
                  <span className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-[10px] font-mono font-bold text-zinc-200">D</span>
                </div>
              </div>
            </div>
          )}


          {/* Quick Pack Picker Bar when near Gacha Shelf */}
          {activeStation?.id === 'gacha' && shelfMenuOpen === 'gacha' && !heldPack && !openModal && (
            <div className="pointer-events-auto mx-auto mb-20 flex flex-col items-center animate-in fade-in zoom-in-95 duration-200">
              <div className="rounded-2xl border-2 border-amber-400/80 bg-zinc-950/95 p-3 sm:px-5 sm:py-3.5 shadow-[0_0_35px_rgba(245,158,11,0.35)] max-w-4xl">
                <div className="flex items-center justify-between mb-2.5 gap-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-amber-400" />
                    <span className="text-xs sm:text-sm font-black text-amber-300">
                      KỆ GONDOLA 8 GÓI GACHA MYSTERY · CHỈ LẤY ĐƯỢC KHI ĐÃ XẾP LÊN KỆ
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        soundManager.playSelectSound();
                        setOpenModal('gacha');
                      }}
                      className="text-[11px] font-bold text-amber-400 hover:underline cursor-pointer"
                    >
                      Mở Modal Gacha 🎲
                    </button>
                    <button
                      onClick={() => setShelfMenuOpen(null)}
                      className="px-2 py-0.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold transition cursor-pointer"
                      title="Đóng menu [E]"
                    >
                      ✕ Đóng [E]
                    </button>
                  </div>
                </div>

                {(() => {
                  const gachaUnlocked = isShelfUnlocked(shopState.unlockedShelves, 'shelf_gacha_gondola');
                  if (!gachaUnlocked) {
                    const gachaDef = SHELF_UNLOCKS.find((s) => s.id === 'shelf_gacha_gondola')!;
                    return (
                      <div className="flex flex-col items-center justify-center p-4 bg-zinc-900/90 rounded-xl border border-dashed border-amber-400/50 text-center space-y-2">
                        <span className="text-xs sm:text-sm font-black text-amber-300">
                          🔒 {gachaDef.name} đang bị khóa!
                        </span>
                        <p className="text-[11px] text-zinc-400 max-w-md">
                          Yêu cầu Cấp Cửa Hàng <strong className="text-white">{gachaDef.level}</strong> (Hiện tại: Cấp {shopState.storeLevel}) · Phí mở khóa <strong className="text-emerald-400">${gachaDef.fee}</strong>.
                        </p>
                        <button
                          onClick={openTabletShelfUnlocks}
                          className="mt-1 px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-black text-xs cursor-pointer shadow"
                        >
                          🪜 Mở Tablet Mở Khóa Kệ
                        </button>
                      </div>
                    );
                  }

                  const totalGachaOnShelf = Object.values(GACHA_PACK_TIERS).reduce((sum, tier) => {
                    const inv = shopState.inventory.find(
                      (i) => i.productId === `gacha_${tier.id}` || i.productId === tier.id
                    );
                    return sum + (inv ? Math.max(0, inv.shelvedQuantity || 0) : 0);
                  }, 0);

                  if (totalGachaOnShelf === 0) {
                    return (
                      <div className="flex flex-col items-center justify-center p-4 bg-zinc-900/80 rounded-xl border border-dashed border-amber-400/40 text-center space-y-2">
                        <span className="text-xs sm:text-sm font-bold text-amber-300">
                          ⚠️ Kệ Gondola hiện đang trống trơn! (0 gói)
                        </span>
                        <p className="text-[11px] text-zinc-400 max-w-md">
                          Chưa có gói Mystery Pack nào được xếp lên kệ. Hãy mở <strong>Tablet [TAB]</strong> &rarr; <strong>Supply (Nhập hàng)</strong> để đặt các gói Gacha về vỉa hè và bưng lên kệ!
                        </p>
                        <button
                          onClick={() => {
                            setOpenModal('pc_ordering');
                            setShelfMenuOpen(null);
                          }}
                          className="mt-1 px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-black text-xs cursor-pointer shadow"
                        >
                          Mở Tablet Đặt Mystery Pack Ngay
                        </button>
                      </div>
                    );
                  }

                  return (
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-[85vw]">
                      {Object.values(GACHA_PACK_TIERS).map((tier: any) => {
                        const inv = shopState.inventory.find(
                          (i) => i.productId === `gacha_${tier.id}` || i.productId === tier.id
                        );
                        const stock = inv ? Math.max(0, inv.shelvedQuantity || 0) : 0;
                        const inStock = stock > 0;

                        return (
                          <button
                            key={tier.id}
                            disabled={!inStock}
                            onClick={() => {
                              if (!inStock) return;
                              soundManager.playSelectSound();
                              setShopState((prev) => {
                                const updated = prev.inventory.map((item) =>
                                  item.productId === `gacha_${tier.id}` || item.productId === tier.id
                                    ? { ...item, shelvedQuantity: Math.max(0, (item.shelvedQuantity || 0) - 1) }
                                    : item
                                );
                                sceneManagerRef.current?.syncAllShelves(updated);
                                return { ...prev, inventory: updated };
                              });
                              setHeldPack({
                                id: tier.id,
                                name: tier.name,
                                type: 'gacha',
                                price: tier.price,
                                imageUrl: tier.imageUrl,
                                themeColor: tier.themeColor,
                              });
                            }}
                            className={`group flex flex-col items-center shrink-0 w-20 rounded-xl border p-2 transition-all ${
                              inStock
                                ? 'bg-zinc-900 border-zinc-800 hover:border-amber-400 hover:bg-zinc-800 cursor-pointer hover:scale-105'
                                : 'bg-zinc-950/60 border-zinc-900 opacity-40 cursor-not-allowed'
                            }`}
                          >
                            <div className="relative">
                              <img
                                src={tier.imageUrl}
                                alt={tier.name}
                                className={`h-16 w-12 object-contain rounded drop-shadow ${inStock ? 'group-hover:scale-110' : 'grayscale'} transition-transform`}
                              />
                              <span className={`absolute -top-1 -right-1 text-[8px] font-black px-1 rounded ${inStock ? 'bg-emerald-600 text-white' : 'bg-zinc-800 text-zinc-400'}`}>
                                {stock}
                              </span>
                            </div>
                            <div className="mt-1 text-[10px] font-bold text-zinc-300 truncate w-full text-center">
                              {tier.name.replace('Pack ', '').replace(' Pack', '')}
                            </div>
                            <div className="text-[10px] font-black text-amber-400">
                              ${tier.price >= 1000 ? `${(tier.price / 1000).toFixed(1)}k` : tier.price}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* Quick Pack / Box Picker Bar when near Retail Shelf */}
          {activeStation?.id === 'shelves' && shelfMenuOpen === 'shelves' && !heldPack && !heldBox && !openModal && (
            <div className="pointer-events-auto mx-auto mb-20 flex flex-col items-center animate-in fade-in zoom-in-95 duration-200">
              <div className="rounded-2xl border-2 border-sky-400/80 bg-zinc-950/95 p-3 sm:px-5 sm:py-3.5 shadow-[0_0_35px_rgba(56,189,248,0.35)] max-w-4xl">
                <div className="flex items-center justify-between mb-2.5 gap-3 flex-wrap">
                  {/* Left: Tab Switcher between Packs and Boxes */}
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-sky-400 shrink-0" />
                    <div className="flex items-center rounded-xl bg-zinc-900 border border-zinc-800 p-0.5">
                      <button
                        onClick={() => {
                          soundManager.playSelectSound();
                          setShelfPickerTab('packs');
                        }}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                          shelfPickerTab === 'packs'
                            ? 'bg-sky-500 text-white shadow-md'
                            : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        <span>🎴</span>
                        <span>Gói Lẻ (Packs)</span>
                      </button>
                      <button
                        onClick={() => {
                          soundManager.playSelectSound();
                          setShelfPickerTab('boxes');
                        }}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                          shelfPickerTab === 'boxes'
                            ? 'bg-rose-500 text-white shadow-md'
                            : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        <span>📦</span>
                        <span>Hộp Box (10 Packs)</span>
                      </button>
                    </div>
                  </div>

                  {/* Right: Quick Action to Open Shelf Pricing Modal & Close Button */}
                  <div className="flex items-center gap-2 ml-auto">
                    <button
                      onClick={() => setOpenModal('shelves')}
                      className="text-[11px] font-bold text-amber-400 hover:underline cursor-pointer"
                    >
                      Chỉnh giá bán ⚙️
                    </button>
                    <button
                      onClick={() => setShelfMenuOpen(null)}
                      className="px-2 py-0.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold transition cursor-pointer"
                      title="Đóng menu [E]"
                    >
                      ✕ Đóng [E]
                    </button>
                  </div>
                </div>

                {/* Content according to selected tab */}
                {(() => {
                  const itemsList = ALL_UNIQUE_BOOSTER_SETS.map((set) => {
                    const prodId = shelfPickerTab === 'packs' ? `${set.id}_pack` : `${set.id}_box`;
                    const inv = shopState.inventory.find(
                      (i) => i.productId === prodId || i.productId === set.id
                    );
                    const stock = inv ? Math.max(0, inv.shelvedQuantity || 0) : 0;
                    return { set, inv, stock, inStock: stock > 0 };
                  });

                  const totalShelvedInTab = itemsList.reduce((sum, item) => sum + item.stock, 0);

                  if (totalShelvedInTab === 0) {
                    return (
                      <div className="flex flex-col items-center justify-center p-4 bg-zinc-900/80 rounded-xl border border-dashed border-sky-400/40 text-center space-y-2">
                        <span className="text-xs sm:text-sm font-bold text-sky-300">
                          ⚠️ Kệ hàng bán lẻ ({shelfPickerTab === 'packs' ? 'Gói Lẻ' : 'Hộp Box'}) hiện đang trống! (0 món)
                        </span>
                        <p className="text-[11px] text-zinc-400 max-w-md">
                          Chưa có sản phẩm nào được xếp lên kệ này. Mở <strong>Tablet [TAB]</strong> &rarr; <strong>Supply</strong> để đặt hàng về và xếp lên kệ!
                        </p>
                        <button
                          onClick={() => {
                            setOpenModal('pc_ordering');
                            setShelfMenuOpen(null);
                          }}
                          className="mt-1 px-4 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-black font-black text-xs cursor-pointer shadow"
                        >
                          Mở Tablet Đặt Hàng Về Ngay
                        </button>
                      </div>
                    );
                  }

                  return shelfPickerTab === 'packs' ? (
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-[85vw]">
                      {itemsList.map(({ set, stock, inStock }) => (
                        <button
                          key={set.id}
                          disabled={!inStock}
                          onClick={() => {
                            if (!inStock) return;
                            soundManager.playSelectSound();
                            setShopState((prev) => {
                              const updated = prev.inventory.map((item) =>
                                item.productId === `${set.id}_pack` || item.productId === set.id
                                  ? { ...item, shelvedQuantity: Math.max(0, (item.shelvedQuantity || 0) - 1) }
                                  : item
                              );
                              sceneManagerRef.current?.syncAllShelves(updated);
                              return { ...prev, inventory: updated };
                            });
                            setHeldPack({
                              id: set.id,
                              name: set.name,
                              type: 'booster',
                              price: set.packRetailPrice,
                              imageUrl: set.packImageUrl,
                              themeColor: set.themeColor,
                            });
                          }}
                          className={`group flex flex-col items-center shrink-0 w-20 rounded-xl border p-2 transition-all ${
                            inStock
                              ? 'bg-zinc-900 border-zinc-800 hover:border-sky-400 hover:bg-zinc-800 cursor-pointer hover:scale-105'
                              : 'bg-zinc-950/60 border-zinc-900 opacity-40 cursor-not-allowed'
                          }`}
                        >
                          <div className="relative">
                            <img
                              src={set.packImageUrl}
                              alt={set.name}
                              className={`h-16 w-12 object-contain rounded drop-shadow ${inStock ? 'group-hover:scale-110' : 'grayscale'} transition-transform`}
                            />
                            <span className={`absolute -top-1 -right-1 text-[8px] font-black px-1 rounded ${inStock ? 'bg-emerald-600 text-white' : 'bg-zinc-800 text-zinc-400'}`}>
                              {stock}
                            </span>
                          </div>
                          <div className="mt-1 text-[10px] font-bold text-zinc-300 truncate w-full text-center">
                            {set.name}
                          </div>
                          <div className="text-[10px] font-black text-sky-400">
                            ${set.packRetailPrice.toFixed(2)}
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-[85vw]">
                      {itemsList.map(({ set, stock, inStock }) => (
                        <button
                          key={set.id}
                          disabled={!inStock}
                          onClick={() => {
                            if (!inStock) return;
                            soundManager.playSelectSound();
                            setShopState((prev) => {
                              const updated = prev.inventory.map((item) =>
                                item.productId === `${set.id}_box` || item.productId === set.id
                                  ? { ...item, shelvedQuantity: Math.max(0, (item.shelvedQuantity || 0) - 1) }
                                  : item
                              );
                              sceneManagerRef.current?.syncAllShelves(updated);
                              return { ...prev, inventory: updated };
                            });
                            setHeldBox({
                              id: set.id,
                              name: `${set.name} Box`,
                              price: set.boxRetailPrice,
                              imageUrl: set.boxImageUrl,
                              themeColor: set.themeColor,
                              packsCount: set.packsPerBox || 10,
                            });
                          }}
                          className={`group flex flex-col items-center shrink-0 w-24 rounded-xl border p-2 transition-all ${
                            inStock
                              ? 'bg-zinc-900 border-zinc-800 hover:border-rose-400 hover:bg-zinc-800 cursor-pointer hover:scale-105'
                              : 'bg-zinc-950/60 border-zinc-900 opacity-40 cursor-not-allowed'
                          }`}
                        >
                          <div className="relative">
                            <img
                              src={set.boxImageUrl}
                              alt={set.name}
                              className={`h-16 w-20 object-contain rounded drop-shadow ${inStock ? 'group-hover:scale-110' : 'grayscale'} transition-transform`}
                            />
                            <span className={`absolute -top-1 -right-1 text-[8px] font-black px-1 rounded ${inStock ? 'bg-emerald-600 text-white' : 'bg-zinc-800 text-zinc-400'}`}>
                              {stock}
                            </span>
                          </div>
                          <div className="mt-1 text-[10px] font-bold text-zinc-300 truncate w-full text-center">
                            {set.name}
                          </div>
                          <div className="text-[10px] font-black text-rose-400">
                            ${set.boxRetailPrice.toFixed(0)}
                          </div>
                        </button>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* Quick VIP Collector Box Picker Bar when near Left-Wall Collector Shelves */}
          {activeStation?.id === 'collector_shelves' && shelfMenuOpen === 'collector_shelves' && !heldPack && !heldBox && !openModal && (
            <div className="pointer-events-auto mx-auto mb-20 flex flex-col items-center animate-in fade-in zoom-in-95 duration-200">
              <div className="rounded-2xl border-2 border-amber-400/90 bg-zinc-950/95 p-3 sm:px-5 sm:py-3.5 shadow-[0_0_40px_rgba(245,158,11,0.4)] max-w-4xl">
                <div className="flex items-center justify-between mb-2.5 gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-amber-400 shrink-0" />
                    <span className="text-xs sm:text-sm font-black text-amber-300">
                      👑 KỆ VIP TƯỜNG TRÁI · COLLECTOR BOXES (MAX {COLLECTOR_MAX_BOXES_PER_SHELF} BOX 1×1 / KỆ)
                    </span>
                  </div>
                  <div className="flex items-center gap-2 ml-auto">
                    <button
                      onClick={() => {
                        soundManager.playSelectSound();
                        setOpenModal('shelves');
                      }}
                      className="text-[11px] font-bold text-amber-400 hover:underline cursor-pointer"
                    >
                      Chỉnh giá Kệ VIP ⚙️
                    </button>
                    <button
                      onClick={() => setShelfMenuOpen(null)}
                      className="px-2 py-0.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold transition cursor-pointer"
                      title="Đóng menu [E]"
                    >
                      ✕ Đóng [E]
                    </button>
                  </div>
                </div>

                {(() => {
                  const anyCollectorUnlocked = ['shelf_collector_1', 'shelf_collector_2', 'shelf_collector_3', 'shelf_collector_4'].some(
                    (id) => isShelfUnlocked(shopState.unlockedShelves, id)
                  );
                  if (!anyCollectorUnlocked) {
                    return (
                      <div className="flex flex-col items-center justify-center p-4 bg-zinc-900/90 rounded-xl border border-dashed border-amber-400/50 text-center space-y-2">
                        <span className="text-xs sm:text-sm font-black text-amber-300">
                          🔒 Dãy Tủ VIP Collector Tường Trái đang bị khóa!
                        </span>
                        <p className="text-[11px] text-zinc-400 max-w-md">
                          Mở khóa từng khoang tủ VIP từ <strong className="text-white">Cấp 9</strong> (Phí từ <strong className="text-emerald-400">$500</strong>) trong Tablet để trưng bày các rương UPC/SPC.
                        </p>
                        <button
                          onClick={openTabletShelfUnlocks}
                          className="mt-1 px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-black text-xs cursor-pointer shadow"
                        >
                          🪜 Mở Tablet Mở Khóa Kệ
                        </button>
                      </div>
                    );
                  }

                  const collectorItems = ALL_COLLECTOR_BOXES.map((set) => {
                    const invItem = shopState.inventory.find(
                      (i) => i.productId === `${set.id}_box` || i.productId === set.id
                    );
                    const stock = invItem ? Math.max(0, invItem.shelvedQuantity || 0) : 0;
                    const livePrice = invItem ? invItem.retailPrice : set.boxRetailPrice;
                    return { set, stock, inStock: stock > 0, livePrice };
                  });

                  const totalOnShelf = collectorItems.reduce((sum, item) => sum + item.stock, 0);

                  if (totalOnShelf === 0) {
                    return (
                      <div className="flex flex-col items-center justify-center p-4 bg-zinc-900/80 rounded-xl border border-dashed border-amber-400/40 text-center space-y-2">
                        <span className="text-xs sm:text-sm font-bold text-amber-300">
                          ⚠️ Kệ VIP Tường Trái hiện đang trống! (0 hộp)
                        </span>
                        <p className="text-[11px] text-zinc-400 max-w-md">
                          Chưa có hộp VIP UPC / SPC nào được xếp lên kệ. Mở <strong>Tablet [TAB]</strong> &rarr; <strong>Supply</strong> để đặt các hộp VIP về chưng bày!
                        </p>
                        <button
                          onClick={() => {
                            setOpenModal('pc_ordering');
                            setShelfMenuOpen(null);
                          }}
                          className="mt-1 px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-black text-xs cursor-pointer shadow"
                        >
                          Mở Tablet Đặt Box VIP Ngay
                        </button>
                      </div>
                    );
                  }

                  return (
                    <div className="flex items-center gap-2.5 overflow-x-auto pb-1 max-w-[85vw]">
                      {collectorItems.map(({ set, stock, inStock, livePrice }) => (
                        <button
                          key={set.id}
                          disabled={!inStock}
                          onClick={() => {
                            if (!inStock) return;
                            soundManager.playSelectSound();
                            setShopState((prev) => {
                              const updated = prev.inventory.map((item) =>
                                item.productId === `${set.id}_box` || item.productId === set.id
                                  ? { ...item, shelvedQuantity: Math.max(0, (item.shelvedQuantity || 0) - 1) }
                                  : item
                              );
                              sceneManagerRef.current?.syncAllShelves(updated);
                              return { ...prev, inventory: updated };
                            });
                            setHeldBox({
                              id: set.id,
                              name: set.name,
                              price: livePrice,
                              imageUrl: set.boxImageUrl,
                              themeColor: set.themeColor,
                              packsCount: set.packsPerBox,
                            });
                          }}
                          className={`group flex flex-col items-center shrink-0 w-36 rounded-xl border p-2.5 transition-all ${
                            inStock
                              ? 'bg-zinc-900 border-amber-500/40 hover:border-amber-300 hover:bg-zinc-800 cursor-pointer hover:scale-105'
                              : 'bg-zinc-950/60 border-zinc-900 opacity-40 cursor-not-allowed'
                          }`}
                        >
                          <div className="relative w-full h-16 flex items-center justify-center bg-white/95 rounded-lg p-1 overflow-hidden">
                            <img
                              src={set.boxImageUrl}
                              alt={set.name}
                              className={`h-full w-full object-contain drop-shadow ${inStock ? 'group-hover:scale-105' : 'grayscale'} transition-transform`}
                            />
                            <span className="absolute top-1 right-1 rounded bg-amber-500 px-1.5 py-0.5 text-[9px] font-black text-black">
                              {set.packsPerBox}P
                            </span>
                            <span className={`absolute bottom-1 left-1 rounded px-1.5 py-0.5 text-[9px] font-black ${inStock ? 'bg-emerald-600 text-white' : 'bg-zinc-800 text-zinc-400'}`}>
                              Kệ: {stock}
                            </span>
                          </div>
                          <div className="mt-1.5 text-[10px] font-bold text-zinc-200 truncate w-full text-center">
                            {set.name}
                          </div>
                          <div className="flex items-center justify-center w-full mt-0.5 px-1">
                            <span className="text-[11px] font-black text-emerald-400">
                              ${livePrice.toLocaleString()}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* Quick GameStop Mystery Box Picker Bar when near GameStop Shelf (Next to Cashier) */}
          {activeStation?.id === 'gamestop_shelf' && shelfMenuOpen === 'gamestop_shelf' && !heldPack && !heldBox && !openModal && (
            <div className="pointer-events-auto mx-auto mb-20 flex flex-col items-center animate-in fade-in zoom-in-95 duration-200">
              <div className="rounded-2xl border-2 border-red-600/90 bg-zinc-950/95 p-3 sm:px-5 sm:py-3.5 shadow-[0_0_40px_rgba(229,27,36,0.4)] max-w-4xl">
                <div className="flex items-center justify-between mb-2.5 gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <img
                      src="/boxes/gamestop_gamestopLogo.png"
                      alt="GameStop"
                      className="h-5 w-auto object-contain"
                    />
                    <span className="text-xs sm:text-sm font-black text-red-400">
                      HỘP BÍ ẨN GAMESTOP (1 SLAB PSA/CGC 10 + 2 PACKS)
                    </span>
                  </div>
                  <div className="flex items-center gap-2 ml-auto">
                    <button
                      onClick={() => {
                        soundManager.playSelectSound();
                        setOpenModal('shelves');
                      }}
                      className="text-[11px] font-bold text-red-400 hover:underline cursor-pointer"
                    >
                      Chỉnh giá Kệ GameStop ⚙️
                    </button>
                    <button
                      onClick={() => setShelfMenuOpen(null)}
                      className="px-2 py-0.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold transition cursor-pointer"
                      title="Đóng menu [E]"
                    >
                      ✕ Đóng [E]
                    </button>
                  </div>
                </div>

                {(() => {
                  const gsUnlocked = isShelfUnlocked(shopState.unlockedShelves, 'shelf_gamestop_mystery');
                  if (!gsUnlocked) {
                    const gsDef = SHELF_UNLOCKS.find((s) => s.id === 'shelf_gamestop_mystery')!;
                    return (
                      <div className="flex flex-col items-center justify-center p-4 bg-zinc-900/90 rounded-xl border border-dashed border-red-500/50 text-center space-y-2">
                        <span className="text-xs sm:text-sm font-black text-red-400">
                          🔒 {gsDef.name} đang bị khóa!
                        </span>
                        <p className="text-[11px] text-zinc-400 max-w-md">
                          Yêu cầu Cấp Cửa Hàng <strong className="text-white">{gsDef.level}</strong> (Hiện tại: Cấp {shopState.storeLevel}) · Phí mở khóa <strong className="text-emerald-400">${gsDef.fee}</strong>.
                        </p>
                        <button
                          onClick={openTabletShelfUnlocks}
                          className="mt-1 px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-black text-xs cursor-pointer shadow"
                        >
                          🪜 Mở Tablet Mở Khóa Kệ
                        </button>
                      </div>
                    );
                  }

                  const gsItems = ALL_GAMESTOP_MYSTERY_SETS.map((set: BoosterSetInfo) => {
                    const invItem = shopState.inventory.find(
                      (i) => i.productId === `${set.id}_box` || i.productId === set.id
                    );
                    const stock = invItem ? Math.max(0, invItem.shelvedQuantity || 0) : 0;
                    const livePrice = invItem ? invItem.retailPrice : set.boxRetailPrice;
                    return { set, stock, inStock: stock > 0, livePrice };
                  });

                  const totalOnShelf = gsItems.reduce((sum, item) => sum + item.stock, 0);

                  if (totalOnShelf === 0) {
                    return (
                      <div className="flex flex-col items-center justify-center p-4 bg-zinc-900/80 rounded-xl border border-dashed border-red-500/40 text-center space-y-2">
                        <span className="text-xs sm:text-sm font-bold text-red-400">
                          ⚠️ Kệ GameStop Mystery hiện đang trống! (0 hộp)
                        </span>
                        <p className="text-[11px] text-zinc-400 max-w-md">
                          Chưa có hộp bí ẩn GameStop nào trên kệ. Mở <strong>Tablet [TAB]</strong> &rarr; <strong>Supply</strong> để đặt các hộp GameStop Mystery Box về!
                        </p>
                        <button
                          onClick={() => {
                            setOpenModal('pc_ordering');
                            setShelfMenuOpen(null);
                          }}
                          className="mt-1 px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-black text-xs cursor-pointer shadow"
                        >
                          Mở Tablet Đặt GameStop Mystery Ngay
                        </button>
                      </div>
                    );
                  }

                  return (
                    <div className="flex items-center gap-3 overflow-x-auto pb-1 max-w-[85vw]">
                      {gsItems.map(({ set, stock, inStock, livePrice }) => (
                        <button
                          key={set.id}
                          disabled={!inStock}
                          onClick={() => {
                            if (!inStock) return;
                            soundManager.playSelectSound();
                            setShopState((prev) => {
                              const updated = prev.inventory.map((item) =>
                                item.productId === `${set.id}_box` || item.productId === set.id
                                  ? { ...item, shelvedQuantity: Math.max(0, (item.shelvedQuantity || 0) - 1) }
                                  : item
                              );
                              sceneManagerRef.current?.syncAllShelves(updated);
                              return { ...prev, inventory: updated };
                            });
                            setHeldBox({
                              id: set.id,
                              name: set.name,
                              price: livePrice,
                              imageUrl: set.boxImageUrl,
                              themeColor: set.themeColor,
                              packsCount: 2,
                            });
                          }}
                          className={`group flex flex-col items-center shrink-0 w-44 rounded-xl border p-2.5 transition-all ${
                            inStock
                              ? 'bg-zinc-950 border-red-600/50 hover:border-red-400 hover:bg-zinc-900 cursor-pointer hover:scale-105'
                              : 'bg-zinc-950/60 border-zinc-900 opacity-40 cursor-not-allowed'
                          }`}
                        >
                          <div className="relative w-full h-24 flex items-center justify-center bg-black/90 rounded-lg p-1 overflow-hidden">
                            <img
                              src={set.boxImageUrl}
                              alt={set.name}
                              className={`h-full w-full object-contain drop-shadow ${inStock ? 'group-hover:scale-105' : 'grayscale'} transition-transform`}
                            />
                            <span className="absolute top-1 right-1 rounded bg-red-600 px-1.5 py-0.5 text-[9px] font-black text-white shadow">
                              PSA 10
                            </span>
                            <span className={`absolute bottom-1 left-1 rounded px-1.5 py-0.5 text-[9px] font-black ${inStock ? 'bg-emerald-600 text-white' : 'bg-zinc-800 text-zinc-400'}`}>
                              Kệ: {stock}
                            </span>
                          </div>
                          <div className="mt-1.5 text-[10px] font-bold text-white truncate w-full text-center">
                            {set.name}
                          </div>
                          <div className="flex items-center justify-center w-full mt-0.5 px-1">
                            <span className="text-[11px] font-black text-emerald-400">
                              ${livePrice.toLocaleString()}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* Floor 2: Quick One Piece Booster Box & Pack Shelf Picker */}
          {activeStation?.id === 'op_shelves' && shelfMenuOpen === 'op_shelves' && !heldPack && !heldBox && !openModal && (
            <div className="pointer-events-auto mx-auto mb-20 flex flex-col items-center animate-in fade-in zoom-in-95 duration-200">
              <div className="rounded-2xl border-2 border-amber-500/80 bg-zinc-950/95 p-3 sm:px-5 sm:py-3.5 shadow-[0_0_35px_rgba(245,158,11,0.35)] max-w-4xl">
                <div className="flex items-center justify-between mb-2.5 gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-amber-400 shrink-0" />
                    <div className="flex items-center rounded-xl bg-zinc-900 border border-zinc-800 p-0.5">
                      <button
                        onClick={() => {
                          soundManager.playSelectSound();
                          setShelfPickerTab('packs');
                        }}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                          shelfPickerTab === 'packs'
                            ? 'bg-amber-500 text-black shadow-md'
                            : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        <span>🏴‍☠️</span>
                        <span>Gói Lẻ One Piece</span>
                      </button>
                      <button
                        onClick={() => {
                          soundManager.playSelectSound();
                          setShelfPickerTab('boxes');
                        }}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                          shelfPickerTab === 'boxes'
                            ? 'bg-red-600 text-white shadow-md'
                            : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        <span>📦</span>
                        <span>Hộp Box OP (9 Packs)</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-auto">
                    <button
                      onClick={() => setOpenModal('op_shelves')}
                      className="text-[11px] font-bold text-amber-400 hover:underline cursor-pointer"
                    >
                      Chỉnh giá Kệ One Piece ⚙️
                    </button>
                    <button
                      onClick={() => setShelfMenuOpen(null)}
                      className="px-2 py-0.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold transition cursor-pointer"
                      title="Đóng menu [E]"
                    >
                      ✕ Đóng [E]
                    </button>
                  </div>
                </div>

                {(() => {
                  const itemsList = ALL_ONEPIECE_BOOSTER_SETS.map((set) => {
                    const prodId = shelfPickerTab === 'packs' ? `${set.id}_pack` : `${set.id}_box`;
                    const inv = shopState.inventory.find(
                      (i) => i.productId === prodId || i.productId === set.id
                    );
                    const stock = inv ? Math.max(0, inv.shelvedQuantity || 0) : 0;
                    return { set, inv, stock, inStock: stock > 0 };
                  });

                  const totalShelvedInTab = itemsList.reduce((sum, item) => sum + item.stock, 0);

                  if (totalShelvedInTab === 0) {
                    return (
                      <div className="flex flex-col items-center justify-center p-4 bg-zinc-900/80 rounded-xl border border-dashed border-amber-500/40 text-center space-y-2">
                        <span className="text-xs sm:text-sm font-bold text-amber-300">
                          ⚠️ Kệ hàng One Piece ({shelfPickerTab === 'packs' ? 'Gói Lẻ' : 'Hộp Box'}) hiện đang trống! (0 món)
                        </span>
                        <p className="text-[11px] text-zinc-400 max-w-md">
                          Chưa có sản phẩm One Piece nào được xếp lên kệ này. Mở <strong>Tablet [TAB]</strong> &rarr; <strong>Supply</strong> để đặt hàng One Piece về và xếp lên kệ!
                        </p>
                        <button
                          onClick={() => {
                            setOpenModal('pc_ordering');
                            setShelfMenuOpen(null);
                          }}
                          className="mt-1 px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-black text-xs cursor-pointer shadow"
                        >
                          Mở Tablet Đặt Hàng One Piece Ngay
                        </button>
                      </div>
                    );
                  }

                  return shelfPickerTab === 'packs' ? (
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-[85vw]">
                      {itemsList.map(({ set, stock, inStock }) => (
                        <button
                          key={set.id}
                          disabled={!inStock}
                          onClick={() => {
                            if (!inStock) return;
                            soundManager.playSelectSound();
                            setShopState((prev) => {
                              const updated = prev.inventory.map((item) =>
                                item.productId === `${set.id}_pack` || item.productId === set.id
                                  ? { ...item, shelvedQuantity: Math.max(0, (item.shelvedQuantity || 0) - 1) }
                                  : item
                              );
                              sceneManagerRef.current?.syncAllShelves(updated);
                              return { ...prev, inventory: updated };
                            });
                            setHeldPack({
                              id: set.id,
                              name: `${set.name} Pack`,
                              type: 'booster',
                              price: set.packRetailPrice,
                              imageUrl: set.packImageUrl,
                              themeColor: set.themeColor,
                            });
                          }}
                          className={`group flex flex-col items-center shrink-0 w-28 rounded-xl border p-2 transition-all ${
                            inStock
                              ? 'bg-zinc-900 border-zinc-800 hover:border-amber-400 hover:bg-zinc-800 cursor-pointer hover:scale-105'
                              : 'bg-zinc-950/60 border-zinc-900 opacity-40 cursor-not-allowed'
                          }`}
                        >
                          <div className="relative">
                            <img
                              src={set.packImageUrl}
                              alt={set.name}
                              className={`h-28 w-20 object-contain drop-shadow ${inStock ? 'group-hover:scale-105' : 'grayscale'} transition-transform`}
                            />
                            <span className={`absolute -bottom-1 -right-1 rounded-full px-1.5 py-0.2 text-[9px] font-black ${inStock ? 'bg-amber-500 text-black' : 'bg-zinc-700 text-zinc-300'}`}>
                              {stock}
                            </span>
                          </div>
                          <span className="mt-1 text-[10px] font-bold text-zinc-200 truncate w-full text-center">
                            {set.name}
                          </span>
                          <span className="text-[11px] font-black text-amber-400">
                            ${set.packRetailPrice.toFixed(2)}
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-[85vw]">
                      {itemsList.map(({ set, stock, inStock }) => (
                        <button
                          key={set.id}
                          disabled={!inStock}
                          onClick={() => {
                            if (!inStock) return;
                            soundManager.playSelectSound();
                            setShopState((prev) => {
                              const updated = prev.inventory.map((item) =>
                                item.productId === `${set.id}_box` || item.productId === set.id
                                  ? { ...item, shelvedQuantity: Math.max(0, (item.shelvedQuantity || 0) - 1) }
                                  : item
                              );
                              sceneManagerRef.current?.syncAllShelves(updated);
                              return { ...prev, inventory: updated };
                            });
                            setHeldBox({
                              id: set.id,
                              name: `${set.name} Box`,
                              price: set.boxRetailPrice,
                              imageUrl: set.boxImageUrl,
                              themeColor: set.themeColor,
                              packsCount: set.packsPerBox || 9,
                            });
                          }}
                          className={`group flex flex-col items-center shrink-0 w-32 rounded-xl border p-2 transition-all ${
                            inStock
                              ? 'bg-zinc-900 border-zinc-800 hover:border-red-500 hover:bg-zinc-800 cursor-pointer hover:scale-105'
                              : 'bg-zinc-950/60 border-zinc-900 opacity-40 cursor-not-allowed'
                          }`}
                        >
                          <div className="relative">
                            <img
                              src={set.boxImageUrl}
                              alt={set.name}
                              className={`h-24 w-24 object-contain drop-shadow ${inStock ? 'group-hover:scale-105' : 'grayscale'} transition-transform`}
                            />
                            <span className={`absolute -bottom-1 -right-1 rounded-full px-1.5 py-0.2 text-[9px] font-black ${inStock ? 'bg-red-600 text-white' : 'bg-zinc-700 text-zinc-300'}`}>
                              {stock}
                            </span>
                          </div>
                          <span className="mt-1 text-[10px] font-bold text-zinc-200 truncate w-full text-center">
                            {set.name}
                          </span>
                          <span className="text-[11px] font-black text-emerald-400">
                            ${set.boxRetailPrice.toFixed(2)}
                          </span>
                        </button>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* Floor 2: Quick One Piece VIP Collector Chest Shelf Picker */}
          {activeStation?.id === 'op_collector_shelves' && shelfMenuOpen === 'op_collector_shelves' && !heldPack && !heldBox && !openModal && (
            <div className="pointer-events-auto mx-auto mb-20 flex flex-col items-center animate-in fade-in zoom-in-95 duration-200">
              <div className="rounded-2xl border-2 border-yellow-500/80 bg-zinc-950/95 p-3 sm:px-5 sm:py-3.5 shadow-[0_0_35px_rgba(234,179,8,0.35)] max-w-4xl">
                <div className="flex items-center justify-between mb-2.5 gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Store className="h-4 w-4 text-yellow-400 shrink-0" />
                    <span className="text-xs sm:text-sm font-black text-yellow-300">
                      RƯƠNG HẢI TẶC VIP ONE PIECE (TẦNG 2) · CLICK ĐỂ CẦM TRÊN TAY
                    </span>
                  </div>
                  <div className="flex items-center gap-2 ml-auto">
                    <button
                      onClick={() => setOpenModal('op_collector_shelves')}
                      className="text-[11px] font-bold text-yellow-400 hover:underline cursor-pointer"
                    >
                      Chỉnh giá Rương VIP ⚙️
                    </button>
                    <button
                      onClick={() => setShelfMenuOpen(null)}
                      className="px-2 py-0.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold transition cursor-pointer"
                      title="Đóng menu [E]"
                    >
                      ✕ Đóng [E]
                    </button>
                  </div>
                </div>

                {(() => {
                  const itemsList = ALL_ONEPIECE_COLLECTOR_BOXES.map((set) => {
                    const inv = shopState.inventory.find(
                      (i) => i.productId === `${set.id}_box` || i.productId === set.id
                    );
                    const stock = inv ? Math.max(0, inv.shelvedQuantity || 0) : 0;
                    return { set, inv, stock, inStock: stock > 0 };
                  });

                  const totalShelved = itemsList.reduce((sum, item) => sum + item.stock, 0);

                  if (totalShelved === 0) {
                    return (
                      <div className="flex flex-col items-center justify-center p-4 bg-zinc-900/80 rounded-xl border border-dashed border-yellow-500/40 text-center space-y-2">
                        <span className="text-xs sm:text-sm font-bold text-yellow-300">
                          ⚠️ Kệ Rương Hải Tặc VIP hiện đang trống! (0 hộp)
                        </span>
                        <p className="text-[11px] text-zinc-400 max-w-md">
                          Chưa có Rương VIP One Piece nào trên kệ. Mở <strong>Tablet [TAB]</strong> &rarr; <strong>Supply</strong> để đặt các Rương Hải Tặc VIP về trưng bày!
                        </p>
                        <button
                          onClick={() => {
                            setOpenModal('pc_ordering');
                            setShelfMenuOpen(null);
                          }}
                          className="mt-1 px-4 py-1.5 rounded-lg bg-yellow-500 hover:bg-yellow-400 text-black font-black text-xs cursor-pointer shadow"
                        >
                          Mở Tablet Đặt Rương VIP Ngay
                        </button>
                      </div>
                    );
                  }

                  return (
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-[85vw]">
                      {itemsList.map(({ set, stock, inStock }) => (
                        <button
                          key={set.id}
                          disabled={!inStock}
                          onClick={() => {
                            if (!inStock) return;
                            soundManager.playSelectSound();
                            setShopState((prev) => {
                              const updated = prev.inventory.map((item) =>
                                item.productId === `${set.id}_box` || item.productId === set.id
                                  ? { ...item, shelvedQuantity: Math.max(0, (item.shelvedQuantity || 0) - 1) }
                                  : item
                              );
                              sceneManagerRef.current?.syncAllShelves(updated);
                              return { ...prev, inventory: updated };
                            });
                            setHeldBox({
                              id: set.id,
                              name: set.name,
                              price: set.boxRetailPrice,
                              imageUrl: set.boxImageUrl,
                              themeColor: set.themeColor,
                              packsCount: set.packsPerBox || 10,
                            });
                          }}
                          className={`group flex flex-col items-center shrink-0 w-36 rounded-xl border p-2.5 transition-all ${
                            inStock
                              ? 'bg-zinc-900 border-zinc-800 hover:border-yellow-400 hover:bg-zinc-800 cursor-pointer hover:scale-105'
                              : 'bg-zinc-950/60 border-zinc-900 opacity-40 cursor-not-allowed'
                          }`}
                        >
                          <div className="relative">
                            <img
                              src={set.boxImageUrl}
                              alt={set.name}
                              className={`h-24 w-28 object-contain drop-shadow ${inStock ? 'group-hover:scale-105' : 'grayscale'} transition-transform`}
                            />
                            <span className={`absolute -bottom-1 -right-1 rounded-full px-1.5 py-0.2 text-[9px] font-black ${inStock ? 'bg-yellow-400 text-black' : 'bg-zinc-700 text-zinc-300'}`}>
                              {stock}
                            </span>
                          </div>
                          <span className="mt-1.5 text-[10px] font-bold text-zinc-200 truncate w-full text-center">
                            {set.name}
                          </span>
                          <span className="text-[11px] font-black text-amber-400">
                            ${set.boxRetailPrice.toFixed(2)}
                          </span>
                        </button>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* Floor 2: Quick One Piece Bounty Mystery Box Picker */}
          {activeStation?.id === 'op_bounty_shelf' && shelfMenuOpen === 'op_bounty_shelf' && !heldPack && !heldBox && !openModal && (
            <div className="pointer-events-auto mx-auto mb-20 flex flex-col items-center animate-in fade-in zoom-in-95 duration-200">
              <div className="rounded-2xl border-2 border-orange-500/80 bg-zinc-950/95 p-3 sm:px-5 sm:py-3.5 shadow-[0_0_35px_rgba(249,115,22,0.35)] max-w-4xl">
                <div className="flex items-center justify-between mb-2.5 gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-orange-400 shrink-0" />
                    <span className="text-xs sm:text-sm font-black text-orange-300">
                      HỘP TRUY NÃ BOUNTY MYSTERY BOX (1 SLAB PSA 10 + 2 PACKS OP)
                    </span>
                  </div>
                  <div className="flex items-center gap-2 ml-auto">
                    <button
                      onClick={() => setOpenModal('op_bounty_shelf')}
                      className="text-[11px] font-bold text-orange-400 hover:underline cursor-pointer"
                    >
                      Chỉnh giá Kệ Bounty ⚙️
                    </button>
                    <button
                      onClick={() => setShelfMenuOpen(null)}
                      className="px-2 py-0.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold transition cursor-pointer"
                      title="Đóng menu [E]"
                    >
                      ✕ Đóng [E]
                    </button>
                  </div>
                </div>

                {(() => {
                  const itemsList = ALL_ONEPIECE_BOUNTY_SETS.map((set) => {
                    const inv = shopState.inventory.find(
                      (i) => i.productId === `${set.id}_box` || i.productId === set.id
                    );
                    const stock = inv ? Math.max(0, inv.shelvedQuantity || 0) : 0;
                    return { set, inv, stock, inStock: stock > 0 };
                  });

                  const totalShelved = itemsList.reduce((sum, item) => sum + item.stock, 0);

                  if (totalShelved === 0) {
                    return (
                      <div className="flex flex-col items-center justify-center p-4 bg-zinc-900/80 rounded-xl border border-dashed border-orange-500/40 text-center space-y-2">
                        <span className="text-xs sm:text-sm font-bold text-orange-300">
                          ⚠️ Kệ Bounty Mystery Box hiện đang trống! (0 hộp)
                        </span>
                        <p className="text-[11px] text-zinc-400 max-w-md">
                          Chưa có hộp Bounty Mystery Box nào trên kệ. Mở <strong>Tablet [TAB]</strong> &rarr; <strong>Supply</strong> để đặt các hộp Bounty Box về xếp kệ!
                        </p>
                        <button
                          onClick={() => {
                            setOpenModal('pc_ordering');
                            setShelfMenuOpen(null);
                          }}
                          className="mt-1 px-4 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-400 text-black font-black text-xs cursor-pointer shadow"
                        >
                          Mở Tablet Đặt Bounty Box Ngay
                        </button>
                      </div>
                    );
                  }

                  return (
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-[85vw]">
                      {itemsList.map(({ set, stock, inStock }) => (
                        <button
                          key={set.id}
                          disabled={!inStock}
                          onClick={() => {
                            if (!inStock) return;
                            soundManager.playSelectSound();
                            setShopState((prev) => {
                              const updated = prev.inventory.map((item) =>
                                item.productId === `${set.id}_box` || item.productId === set.id
                                  ? { ...item, shelvedQuantity: Math.max(0, (item.shelvedQuantity || 0) - 1) }
                                  : item
                              );
                              sceneManagerRef.current?.syncAllShelves(updated);
                              return { ...prev, inventory: updated };
                            });
                            setHeldBox({
                              id: set.id,
                              name: set.name,
                              price: set.boxRetailPrice,
                              imageUrl: set.boxImageUrl,
                              themeColor: set.themeColor,
                              packsCount: 2,
                            });
                          }}
                          className={`group flex flex-col items-center shrink-0 w-36 rounded-xl border p-2.5 transition-all ${
                            inStock
                              ? 'bg-zinc-900 border-zinc-800 hover:border-orange-400 hover:bg-zinc-800 cursor-pointer hover:scale-105'
                              : 'bg-zinc-950/60 border-zinc-900 opacity-40 cursor-not-allowed'
                          }`}
                        >
                          <div className="relative">
                            <img
                              src={set.boxImageUrl}
                              alt={set.name}
                              className={`h-24 w-28 object-contain drop-shadow ${inStock ? 'group-hover:scale-105' : 'grayscale'} transition-transform`}
                            />
                            <span className={`absolute -bottom-1 -right-1 rounded-full px-1.5 py-0.2 text-[9px] font-black ${inStock ? 'bg-orange-500 text-black' : 'bg-zinc-700 text-zinc-300'}`}>
                              {stock}
                            </span>
                          </div>
                          <span className="mt-1.5 text-[10px] font-bold text-zinc-200 truncate w-full text-center">
                            {set.name}
                          </span>
                          <span className="text-[11px] font-black text-amber-400">
                            ${set.boxRetailPrice.toFixed(2)}
                          </span>
                        </button>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* Floor 2: Quick Devil Fruit Gacha Pack Picker */}
          {activeStation?.id === 'op_gacha' && shelfMenuOpen === 'op_gacha' && !heldPack && !openModal && (
            <div className="pointer-events-auto mx-auto mb-20 flex flex-col items-center animate-in fade-in zoom-in-95 duration-200">
              <div className="rounded-2xl border-2 border-purple-500/80 bg-zinc-950/95 p-3 sm:px-5 sm:py-3.5 shadow-[0_0_35px_rgba(168,85,247,0.35)] max-w-4xl">
                <div className="flex items-center justify-between mb-2.5 gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-purple-400 shrink-0" />
                    <span className="text-xs sm:text-sm font-black text-purple-300">
                      ĐẢO GACHA TRÁI ÁC QUỶ (TẦNG 2) · CLICK ĐỂ CẦM GÓI TRÊN TAY
                    </span>
                  </div>
                  <div className="flex items-center gap-2 ml-auto">
                    <button
                      onClick={() => setOpenModal('op_gacha')}
                      className="text-[11px] font-bold text-purple-400 hover:underline cursor-pointer"
                    >
                      Bảng Quay Gacha 🎲
                    </button>
                    <button
                      onClick={() => setShelfMenuOpen(null)}
                      className="px-2 py-0.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold transition cursor-pointer"
                      title="Đóng menu [E]"
                    >
                      ✕ Đóng [E]
                    </button>
                  </div>
                </div>

                {(() => {
                  const tiers = Object.values(OP_GACHA_PACK_TIERS);
                  const itemsList = tiers.map((tier: any) => {
                    const inv = shopState.inventory.find(
                      (i) => i.productId === `gacha_${tier.id}` || i.productId === tier.id
                    );
                    const stock = inv ? Math.max(0, inv.shelvedQuantity || 0) : 0;
                    return { tier, inv, stock, inStock: stock > 0 };
                  });

                  const totalShelved = itemsList.reduce((sum, item) => sum + item.stock, 0);

                  if (totalShelved === 0) {
                    return (
                      <div className="flex flex-col items-center justify-center p-4 bg-zinc-900/80 rounded-xl border border-dashed border-purple-500/40 text-center space-y-2">
                        <span className="text-xs sm:text-sm font-bold text-purple-300">
                          ⚠️ Kệ Gacha Trái Ác Quỷ hiện đang trống! (0 gói)
                        </span>
                        <p className="text-[11px] text-zinc-400 max-w-md">
                          Chưa có gói Gacha Trái Ác Quỷ nào trên kệ. Mở <strong>Tablet [TAB]</strong> &rarr; <strong>Supply</strong> để đặt các gói Gacha về và xếp lên kệ!
                        </p>
                        <button
                          onClick={() => {
                            setOpenModal('pc_ordering');
                            setShelfMenuOpen(null);
                          }}
                          className="mt-1 px-4 py-1.5 rounded-lg bg-purple-500 hover:bg-purple-400 text-white font-black text-xs cursor-pointer shadow"
                        >
                          Mở Tablet Đặt Gói Gacha Ngay
                        </button>
                      </div>
                    );
                  }

                  return (
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-[85vw]">
                      {itemsList.map(({ tier, stock, inStock }) => (
                        <button
                          key={tier.id}
                          disabled={!inStock}
                          onClick={() => {
                            if (!inStock) return;
                            soundManager.playSelectSound();
                            setShopState((prev) => {
                              const updated = prev.inventory.map((item) =>
                                item.productId === `gacha_${tier.id}` || item.productId === tier.id
                                  ? { ...item, shelvedQuantity: Math.max(0, (item.shelvedQuantity || 0) - 1) }
                                  : item
                              );
                              sceneManagerRef.current?.syncAllShelves(updated);
                              return { ...prev, inventory: updated };
                            });
                            setHeldPack({
                              id: tier.id,
                              name: tier.name,
                              type: 'gacha',
                              price: tier.price,
                              imageUrl: tier.imageUrl,
                              themeColor: tier.color || '#a855f7',
                            });
                          }}
                          className={`group flex flex-col items-center shrink-0 w-28 rounded-xl border p-2 transition-all ${
                            inStock
                              ? 'bg-zinc-900 border-zinc-800 hover:border-purple-400 hover:bg-zinc-800 cursor-pointer hover:scale-105'
                              : 'bg-zinc-950/60 border-zinc-900 opacity-40 cursor-not-allowed'
                          }`}
                        >
                          <div className="relative">
                            <img
                              src={tier.imageUrl}
                              alt={tier.name}
                              className={`h-28 w-20 object-contain drop-shadow ${inStock ? 'group-hover:scale-105' : 'grayscale'} transition-transform`}
                            />
                            <span className={`absolute -bottom-1 -right-1 rounded-full px-1.5 py-0.2 text-[9px] font-black ${inStock ? 'bg-purple-500 text-white' : 'bg-zinc-700 text-zinc-300'}`}>
                              {stock}
                            </span>
                          </div>
                          <span className="mt-1 text-[10px] font-bold text-zinc-200 truncate w-full text-center">
                            {tier.name}
                          </span>
                          <span className="text-[11px] font-black text-amber-400">
                            ${tier.price.toLocaleString()}
                          </span>
                        </button>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* TCG Card Shop Simulator First-Person Held Pack Viewmodel (Full Pack Display) */}
          {heldPack && !openModal && (
            <div className="pointer-events-auto absolute bottom-2 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center select-none animate-in fade-in slide-in-from-bottom duration-300">
              {/* Held Pack Full Artwork - Zero Cropping, Full Top & Bottom Seals */}
              <div
                onClick={handleRipHeldPack}
                className="relative group cursor-pointer transition-transform hover:scale-105 flex flex-col items-center"
                title="Click hoặc bấm ENTER để xé mở pack!"
              >
                <img
                  src={heldPack.imageUrl}
                  alt={heldPack.name}
                  className="max-h-[48vh] sm:max-h-[55vh] w-auto object-contain drop-shadow-[0_20px_45px_rgba(0,0,0,0.95)] drop-shadow-[0_0_30px_rgba(245,158,11,0.35)] pointer-events-none select-none transition-transform duration-200"
                />
              </div>

              {/* Clean Action Prompt with Pack Info & Controls */}
              <div className="mt-2.5 flex flex-col items-center gap-2 rounded-2xl border-2 border-amber-400/90 bg-zinc-950/95 px-6 py-2.5 shadow-[0_0_35px_rgba(245,158,11,0.45)]">
                <div className="flex items-center gap-2 text-xs sm:text-sm font-black text-white">
                  <span className="text-amber-300">{heldPack.name}</span>
                  <span className="text-zinc-500">•</span>
                  <span className="text-emerald-400 font-mono text-sm sm:text-base">${heldPack.price.toLocaleString()}</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleRipHeldPack}
                    className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-600 px-5 py-2 font-black text-black hover:from-amber-300 hover:to-amber-500 cursor-pointer shadow-lg transition-transform hover:scale-105"
                  >
                    <span className="rounded bg-black/25 px-1.5 py-0.5 text-xs text-black border border-black/30 font-mono font-black">
                      ENTER
                    </span>
                    <span>XÉ MỞ PACK</span>
                  </button>

                  <button
                    onClick={handleCancelHeldPack}
                    className="flex items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2 text-xs font-bold text-zinc-300 hover:bg-zinc-800 cursor-pointer transition-colors"
                  >
                    <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-400 border border-zinc-700 font-mono">
                      Q / ESC
                    </span>
                    <span>Cất Lại</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Quick Box Picker Bar when near Box Opening Table or Rip Workbench */}
          {(activeStation?.id === 'box_opening' || activeStation?.id === 'rip_packs') && !heldPack && !heldBox && !openModal && (
            <div className="pointer-events-auto mx-auto mb-20 flex flex-col items-center">
              <div className="rounded-2xl border-2 border-rose-500/80 bg-zinc-950/95 p-3 sm:px-5 sm:py-3.5 shadow-[0_0_35px_rgba(244,63,94,0.35)] max-w-4xl">
                <div className="flex items-center justify-between mb-2 gap-4">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-rose-400" />
                    <span className="text-xs sm:text-sm font-black text-rose-300">
                      HỘP BOOSTER BOX & VIP COLLECTOR · CLICK ĐỂ LẤY BOX CẦM TRÊN TAY
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      soundManager.playSelectSound();
                      setOpenModal('box_opening');
                    }}
                    className="text-[11px] font-bold text-amber-400 hover:underline cursor-pointer"
                  >
                    Mở thẳng bàn khui 📦
                  </button>
                </div>
                {(() => {
                  const ownedBoxes = [...ALL_UNIQUE_BOOSTER_SETS, ...ALL_COLLECTOR_BOXES].map((set) => {
                    const inv = shopState.inventory.find(
                      (i) => i.productId === `${set.id}_box` || i.productId === set.id
                    );
                    const qty = inv ? inv.quantity : 0;
                    return { set, qty, inStock: qty > 0 };
                  });

                  const totalOwned = ownedBoxes.reduce((sum, b) => sum + b.qty, 0);

                  if (totalOwned === 0) {
                    return (
                      <div className="flex flex-col items-center justify-center p-3.5 bg-zinc-900/80 rounded-xl border border-dashed border-rose-500/40 text-center space-y-2">
                        <span className="text-xs sm:text-sm font-bold text-rose-300">
                          ⚠️ Tiệm hiện chưa có hộp Booster Box nào! (Kho: 0 hộp)
                        </span>
                        <p className="text-[11px] text-zinc-400 max-w-md">
                          Hãy mở <strong>Tablet [TAB]</strong> &rarr; <strong>Supply</strong> để đặt các hộp Box hoặc Collector UPC về trước khi khui!
                        </p>
                        <button
                          onClick={() => setOpenModal('pc_ordering')}
                          className="mt-1 px-4 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-400 text-white font-black text-xs cursor-pointer shadow"
                        >
                          Mở Tablet Đặt Box Ngay
                        </button>
                      </div>
                    );
                  }

                  return (
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-[85vw]">
                      {ownedBoxes.map(({ set, qty, inStock }) => (
                        <button
                          key={set.id}
                          disabled={!inStock}
                          onClick={() => {
                            if (!inStock) return;
                            soundManager.playSelectSound();
                            setHeldBox({
                              id: set.id,
                              name: set.id.startsWith('collector_') ? set.name : `${set.name} Box`,
                              price: set.boxRetailPrice,
                              imageUrl: set.boxImageUrl,
                              themeColor: set.themeColor,
                              packsCount: set.packsPerBox || 10,
                            });
                          }}
                          className={`group flex flex-col items-center shrink-0 w-24 rounded-xl border p-2 transition-all ${
                            inStock
                              ? 'bg-zinc-900 border-zinc-800 hover:border-rose-400 hover:bg-zinc-800 cursor-pointer hover:scale-105'
                              : 'bg-zinc-950/60 border-zinc-900 opacity-40 cursor-not-allowed'
                          }`}
                        >
                          <div className="relative">
                            <img
                              src={set.boxImageUrl}
                              alt={set.name}
                              className={`h-16 w-20 object-contain rounded drop-shadow ${inStock ? 'group-hover:scale-110' : 'grayscale'} transition-transform`}
                            />
                            <span className="absolute -top-1 -right-1 rounded bg-rose-600/90 px-1 text-[9px] font-black text-white">
                              {set.packsPerBox || 10}P
                            </span>
                            <span className={`absolute -bottom-1 -left-1 rounded px-1 text-[9px] font-black ${inStock ? 'bg-emerald-600 text-white' : 'bg-zinc-800 text-zinc-400'}`}>
                              Kho: {qty}
                            </span>
                          </div>
                          <div className="mt-1 text-[10px] font-bold text-zinc-300 truncate w-full text-center">
                            {set.name}
                          </div>
                          <div className="text-[10px] font-black text-rose-400">
                            ${set.boxRetailPrice.toFixed(0)}
                          </div>
                        </button>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* TCG Card Shop Simulator First-Person Held Box Viewmodel */}
          {heldBox && !openModal && (() => {
            const boxSetInfo = getBoosterSet(heldBox.id);
            const packsCount = heldBox.packsCount || boxSetInfo?.packsPerBox || 10;
            const isPaldeanOrSparks = heldBox.id === 'paldeanFates' || heldBox.id === 'surgingSparks' || heldBox.name.includes('Surging Sparks');
            const boxName = isPaldeanOrSparks
              ? 'Scarlet & Violet: Paldean Fates Box'
              : (boxSetInfo ? (boxSetInfo.id.startsWith('collector_') ? boxSetInfo.name : `${boxSetInfo.name} Box`) : heldBox.name);
            const boxImage = isPaldeanOrSparks
              ? (boxSetInfo?.boxImageUrl || 'https://acgamesonline.com/cdn/shop/files/raw--17_1200x1200.png?v=1711036389')
              : (heldBox.imageUrl || boxSetInfo?.boxImageUrl);

            return (
              <div className="pointer-events-auto absolute bottom-2 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center select-none animate-in fade-in slide-in-from-bottom duration-300">
                {/* Held Box Full Artwork */}
                <div
                  onClick={handleOpenHeldBox}
                  className="relative group cursor-pointer transition-transform hover:scale-105 flex flex-col items-center"
                  title={`Click hoặc bấm ENTER để mở Booster Box (${packsCount} Packs)!`}
                >
                  <div className="relative">
                    <div
                      className="absolute -inset-4 opacity-55 rounded-3xl -z-10 pointer-events-none"
                      style={{
                        background: `radial-gradient(circle, ${heldBox.themeColor || '#f43f5e'}73 0%, transparent 70%)`,
                      }}
                    />
                    <img
                      src={boxImage}
                      alt={boxName}
                      className="max-h-[46vh] sm:max-h-[54vh] w-auto object-contain drop-shadow-[0_25px_50px_rgba(0,0,0,0.95)] drop-shadow-[0_0_35px_rgba(244,63,94,0.45)] pointer-events-none select-none transition-transform duration-200"
                    />
                    <span className="absolute top-2 right-2 rounded-lg bg-rose-600/90 border border-rose-400 px-2.5 py-1 text-[11px] font-black text-white shadow-lg">
                      📦 {packsCount} PACKS
                    </span>
                  </div>
                </div>

                {/* Clean Action Prompt with Box Info & Controls */}
                <div className="mt-2.5 flex flex-col items-center gap-2 rounded-2xl border-2 border-rose-400/90 bg-zinc-950/95 px-6 py-2.5 shadow-[0_0_35px_rgba(244,63,94,0.45)]">
                  <div className="flex items-center gap-2 text-xs sm:text-sm font-black text-white">
                    <span className="text-rose-400">📦 {boxName}</span>
                    <span className="text-zinc-500">•</span>
                    <span className="text-zinc-300 text-xs font-semibold">Hộp nguyên seal {packsCount} Packs</span>
                    <span className="text-zinc-500">•</span>
                    <span className="text-emerald-400 font-mono text-sm sm:text-base">${heldBox.price.toLocaleString()}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleOpenHeldBox}
                      className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-500 via-rose-600 to-amber-500 px-5 py-2 font-black text-white hover:from-rose-400 hover:to-amber-400 cursor-pointer shadow-lg transition-transform hover:scale-105"
                    >
                      <span className="rounded bg-black/30 px-1.5 py-0.5 text-xs text-white border border-white/20 font-mono font-black">
                        ENTER
                      </span>
                      <span>MỞ BOOSTER BOX</span>
                    </button>

                    <button
                      onClick={handleCancelHeldBox}
                      className="flex items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2 text-xs font-bold text-zinc-300 hover:bg-zinc-800 cursor-pointer transition-colors"
                    >
                      <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-400 border border-zinc-700 font-mono">
                        Q / ESC
                      </span>
                      <span>Cất Lại</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}


          {/* Global Toast Notification */}
          {toastNotification && (
            <div
              className={`pointer-events-none fixed top-14 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 max-w-[90vw] sm:max-w-md rounded-full border px-3.5 py-1.5 text-[11px] font-semibold shadow-lg animate-in fade-in slide-in-from-top-2 duration-200 ${
                toastNotification.type === 'success'
                  ? 'border-emerald-500/40 bg-zinc-950/90 text-emerald-300'
                  : toastNotification.type === 'error' || toastNotification.type === 'warning'
                    ? 'border-rose-500/40 bg-zinc-950/90 text-rose-300'
                    : 'border-white/15 bg-zinc-950/90 text-zinc-100'
              }`}
            >
              <Sparkles
                className={`h-3.5 w-3.5 shrink-0 ${
                  toastNotification.type === 'success'
                    ? 'text-emerald-400'
                    : toastNotification.type === 'error' || toastNotification.type === 'warning'
                      ? 'text-rose-400'
                      : 'text-amber-400'
                }`}
              />
              <span className="truncate">{toastNotification.message}</span>
            </div>
          )}

          {/* Wall Light Switch Hover Prompt */}
          {lightSwitchHover?.hovered && !openModal && (
            <div className="pointer-events-none fixed bottom-24 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 rounded-xl border border-amber-400/80 bg-zinc-950/95 px-4 py-2 text-xs font-bold text-amber-200 shadow-lg">
              <Lightbulb
                className={`h-4 w-4 shrink-0 ${
                  lightSwitchHover.isOn ? 'text-amber-400' : 'text-zinc-400'
                }`}
              />
              <span>
                Click để {lightSwitchHover.isOn ? 'TẮT' : 'BẬT'} Đèn Shop & Bảng Hiệu
              </span>
              <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] font-mono text-zinc-300 border border-zinc-700">
                {lightSwitchHover.isOn ? 'ĐANG BẬT' : 'ĐANG TẮT'}
              </span>
            </div>
          )}

          {/* Exterior Motorbike Mount Prompt (Parked in front of Pokémon Card Shop) */}
          {motorbikeState?.nearBike && !motorbikeState.isRiding && !openModal && !heldPack && !heldBox && (
            <div className="pointer-events-auto absolute bottom-20 sm:bottom-12 left-1/2 -translate-x-1/2 z-40 flex items-center">
              {motorbikeState.canMount ? (
                <button
                  onClick={handleToggleRideMotorbike}
                  className="flex items-center gap-2.5 rounded-full border border-rose-400/90 bg-zinc-950/95 px-4 py-2 shadow-[0_4px_24px_rgba(225,29,72,0.35)] hover:border-rose-300 hover:scale-105 transition cursor-pointer text-xs font-bold"
                >
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 font-mono text-[11px] font-black text-white">
                    F
                  </span>
                  <Bike className="h-4 w-4 text-rose-400 shrink-0" />
                  <span className="text-rose-200 font-black tracking-wide">Lên Xe Máy</span>
                  <span className="text-zinc-600">•</span>
                  <span className="text-amber-300 font-semibold">Poké-Sport 155</span>
                </button>
              ) : (
                <div className="flex items-center gap-2 rounded-full border border-amber-500/70 bg-zinc-950/95 px-4 py-2 text-xs font-bold text-amber-200">
                  <Bike className="h-4 w-4 text-amber-400 shrink-0" />
                  <span>Đặt thùng hàng [G] xuống trước khi lên xe máy [F]</span>
                </div>
              )}
            </div>
          )}

          {/* Active Motorbike Riding HUD Telemetry & Quick Actions */}
          {motorbikeState?.isRiding && !openModal && (
            <div className="pointer-events-auto fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-1.5">
              <div className="flex items-center gap-2 sm:gap-3 rounded-2xl border border-rose-500/75 bg-zinc-950/95 px-3.5 sm:px-4 py-2 shadow-[0_8px_30px_rgba(0,0,0,0.65)]">
                <div className="flex items-center gap-2 pr-2.5 border-r border-zinc-800">
                  <Gauge className="h-4 w-4 text-rose-400 shrink-0" />
                  <div className="flex items-baseline gap-1">
                    <span className="font-mono text-xl sm:text-2xl font-black text-sky-300 tabular-nums leading-none">
                      {motorbikeState.speedKmh}
                    </span>
                    <span className="text-[10px] font-bold text-zinc-400 uppercase">km/h</span>
                  </div>
                  <span
                    className={`rounded-md px-1.5 py-0.5 font-mono text-[11px] font-black border ${
                      motorbikeState.gear === 'S'
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/50'
                        : motorbikeState.gear === 'R'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                          : motorbikeState.gear === 'D'
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                            : 'bg-zinc-800 text-zinc-300 border-zinc-700'
                    }`}
                  >
                    {motorbikeState.gear}
                  </span>
                </div>

                <button
                  onClick={() => sceneManagerRef.current?.toggleMotorbikeCameraView()}
                  className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-[11px] font-bold text-zinc-200 hover:border-sky-400 hover:text-sky-200 transition cursor-pointer"
                >
                  <span className="rounded bg-zinc-800 px-1 font-mono text-[10px] text-sky-300">C</span>
                  <span>{motorbikeState.cameraView === 'cockpit' ? 'Buồng Lái' : 'Toàn Cảnh'}</span>
                </button>

                <button
                  onClick={() => sceneManagerRef.current?.honkMotorbikeHorn()}
                  className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-[11px] font-bold text-zinc-200 hover:border-amber-400 hover:text-amber-200 transition cursor-pointer"
                >
                  <span className="rounded bg-zinc-800 px-1 font-mono text-[10px] text-amber-300">Space</span>
                  <span>Còi</span>
                </button>

                <button
                  onClick={handleToggleRideMotorbike}
                  className="flex items-center gap-1.5 rounded-lg border border-rose-500/60 bg-rose-950/70 px-2.5 py-1 text-[11px] font-black text-rose-200 hover:bg-rose-900 transition cursor-pointer"
                >
                  <span className="rounded bg-rose-500 px-1 font-mono text-[10px] text-white">F</span>
                  <span>Xuống Xe</span>
                </button>
              </div>

              <div className="hidden sm:flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-950/90 px-3 py-1 text-[10px] font-medium text-zinc-400">
                <span>W/S: Ga & Phanh</span>
                <span className="text-zinc-700">•</span>
                <span>A/D: Rẽ</span>
                <span className="text-zinc-700">•</span>
                <span>Shift: Tăng Tốc Sport</span>
                <span className="text-zinc-700">•</span>
                <span>Kéo chuột: Nhìn xung quanh</span>
              </div>
            </div>
          )}

          {/* Exterior Delivery Drop Zone Prompt (Sleek Compact Pill - Rút Gọn) */}
          {activeStation?.id === 'delivery_drop' && !shopState.carriedParcel && !openModal && (
            <div className="pointer-events-auto absolute bottom-20 sm:bottom-12 left-1/2 -translate-x-1/2 z-40 flex items-center animate-in fade-in zoom-in-95 duration-150">
              {shopState.pendingDeliveries.length > 0 ? (
                <button
                  onClick={handlePickupDeliveryParcel}
                  className="flex items-center gap-2 rounded-full border border-emerald-400/90 bg-zinc-950/95 px-4 py-2 shadow-[0_4px_24px_rgba(16,185,129,0.35)] hover:border-emerald-300 hover:scale-105 transition cursor-pointer text-xs font-bold"
                >
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 font-mono text-[11px] font-black text-black">
                    E
                  </span>
                  <span className="text-emerald-300 font-black tracking-wide">Bưng Hàng</span>
                  <span className="text-zinc-600">•</span>
                  <span className="text-zinc-200 truncate max-w-[190px] sm:max-w-xs font-semibold">
                    {shopState.pendingDeliveries[0].productName}
                  </span>
                  <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-mono font-black text-emerald-400 border border-emerald-500/30">
                    {shopState.pendingDeliveries.length} kiện
                  </span>
                </button>
              ) : (
                <div className="flex items-center gap-2 rounded-full border border-zinc-700 bg-zinc-950/95 px-3.5 py-1.5 text-xs text-zinc-400">
                  <Package className="h-4 w-4 text-zinc-500" />
                  <span>Hết kiện hàng chờ nhận</span>
                </div>
              )}
            </div>
          )}

          {/* Manager Office PC Ordering HUD Prompt */}
          {activeStation?.id === 'pc_ordering' && !openModal && (
            <div className="pointer-events-auto absolute bottom-20 sm:bottom-12 left-1/2 -translate-x-1/2 z-40 flex items-center animate-in fade-in zoom-in-95 duration-150">
              <button
                onClick={() => {
                  soundManager.playSelectSound();
                  setTabletInitialApp('home');
                  setTabletInitialItemsSubTab('cardpack');
                  setOpenModal('pc_ordering');
                }}
                className="flex items-center gap-2.5 rounded-full border border-sky-400/90 bg-zinc-950/95 px-5 py-2.5 shadow-[0_4px_24px_rgba(56,189,248,0.35)] hover:border-sky-300 hover:scale-105 transition cursor-pointer text-xs font-bold"
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-sky-400 font-mono text-[11px] font-black text-black">
                  E
                </span>
                <span className="text-sky-300 font-black tracking-wide">Mở Máy Tính Văn Phòng</span>
                <span className="text-zinc-600">•</span>
                <span className="text-zinc-200 font-semibold">
                  Đặt Hàng Sỉ Pack & Box
                </span>
              </button>
            </div>
          )}

          {/* PokeShip Recipient Handoff Prompt (Works both on Bike & on Foot) */}
          {nearDeliveryTarget && activeDeliveryStop && !openModal && (
            <div className="pointer-events-auto absolute bottom-24 sm:bottom-20 left-1/2 -translate-x-1/2 z-40 flex items-center animate-in fade-in zoom-in-95 duration-150">
              <button
                type="button"
                onClick={handleCompleteDeliveryHandoff}
                className="flex items-center gap-2.5 rounded-full border-2 border-sky-400 bg-zinc-950/95 px-5 py-2.5 shadow-[0_4px_28px_rgba(56,189,248,0.5)] hover:border-sky-300 hover:scale-105 transition cursor-pointer text-xs font-bold"
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-sky-400 font-mono text-[11px] font-black text-black">
                  E
                </span>
                <MapPin className="h-4 w-4 text-sky-400 shrink-0" />
                <span className="text-sky-300 font-black tracking-wide">
                  Giao Hàng Cho {activeDeliveryStop.recipientName}
                </span>
                <span className="text-zinc-600">•</span>
                <span className="text-emerald-300 font-semibold truncate max-w-[200px]">
                  {activeDeliveryStop.cargo.label}
                </span>
              </button>
            </div>
          )}

          {/* (Nearby POI / Rare Card Hunt prompt is now displayed as a compact top-right card without requiring [E]) */}

          {/* Manager Office Shipping Station HUD Prompt */}
          {activeStation?.id === 'shipping_station' && !openModal && (
            <div className="pointer-events-auto absolute bottom-20 sm:bottom-12 left-1/2 -translate-x-1/2 z-40 flex items-center animate-in fade-in zoom-in-95 duration-150">
              <button
                onClick={() => {
                  soundManager.playSelectSound();
                  setTabletInitialApp('pokeship');
                  setOpenModal('pc_ordering');
                }}
                className="flex items-center gap-2.5 rounded-full border border-sky-400/90 bg-zinc-950/95 px-5 py-2.5 shadow-[0_4px_24px_rgba(14,165,233,0.4)] hover:border-sky-300 hover:scale-105 transition cursor-pointer text-xs font-bold"
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-sky-400 font-mono text-[11px] font-black text-black">
                  E
                </span>
                <span className="text-sky-300 font-black tracking-wide">Trạm Nhận Đơn PokeShip Express</span>
                <span className="text-zinc-600">•</span>
                <span className="text-zinc-200 font-semibold">
                  {activeMission ? 'Xem lộ trình đang giao' : `${shopState.deliveryState?.availableOrders?.length || 5} đơn chờ giao`}
                </span>
              </button>
            </div>
          )}

          {/* Live Studio Room Prompt */}
          {activeStation?.id === 'live_studio' && !openModal && !pokeLiveOpen && (
            <div className="pointer-events-auto absolute bottom-20 sm:bottom-12 left-1/2 -translate-x-1/2 z-40 flex items-center animate-in fade-in zoom-in-95 duration-150">
              <button
                onClick={() => {
                  soundManager.playSelectSound();
                  setPokeLiveOpen(true);
                }}
                className="flex items-center gap-2.5 rounded-full border border-rose-400/90 bg-zinc-950/95 px-5 py-2.5 shadow-[0_4px_24px_rgba(244,63,94,0.4)] hover:border-rose-300 hover:scale-105 transition cursor-pointer text-xs font-bold"
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 font-mono text-[11px] font-black text-white">
                  E
                </span>
                <span className="text-rose-300 font-black tracking-wide">
                  Phòng Live Studio (PokeLive)
                </span>
                <span className="text-zinc-600">•</span>
                <span className="text-zinc-200 font-semibold">
                  {!shopState.liveStudioUnlocked
                    ? `Chưa xây ($${LIVE_STUDIO_BUILD_COST})`
                    : (shopState.hiredStaff?.liveStreamer || 0) <= 0
                    ? 'Chưa thuê Nhân Viên Live'
                    : isLiveStudioOnAir
                    ? 'Đang ON AIR — Bấm để xem Stream'
                    : 'Mở App PokeLive Studio'}
                </span>
              </button>
            </div>
          )}

          {/* Grading Lab Entrance Prompt */}
          {activeStation?.id === 'grading_entrance' && !openModal && (
            <div className="pointer-events-auto absolute bottom-20 sm:bottom-12 left-1/2 -translate-x-1/2 z-40 flex items-center animate-in fade-in zoom-in-95 duration-150">
              {shopState.storeLevel < GRADING_SHOP_UNLOCK_LEVEL ? (
                <button
                  onClick={() => {
                    setGradingModalInitialTab('submit');
                    setOpenModal('grading_shop');
                  }}
                  className="flex items-center gap-2.5 rounded-full border border-rose-500/80 bg-zinc-950/95 px-5 py-2.5 shadow-[0_4px_24px_rgba(244,63,94,0.35)] hover:border-rose-400 transition cursor-pointer text-xs font-bold"
                >
                  <span className="text-rose-400 font-black">
                    🔒 TRUNG TÂM CHẤM ĐIỂM PSA · CGC · BGS &amp; ĐẤU GIÁ • MỞ KHÓA CẤP {GRADING_SHOP_UNLOCK_LEVEL}
                  </span>
                  <span className="text-zinc-400">(Hiện tại: Lv.{shopState.storeLevel})</span>
                </button>
              ) : (
                <button
                  onClick={() => {
                    setGradingModalInitialTab('submit');
                    setOpenModal('grading_shop');
                  }}
                  className="flex items-center gap-2.5 rounded-full border border-cyan-400/90 bg-zinc-950/95 px-5 py-2.5 shadow-[0_4px_24px_rgba(34,211,238,0.35)] hover:border-cyan-300 hover:scale-105 transition cursor-pointer text-xs font-bold"
                >
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-cyan-400 font-mono text-[11px] font-black text-black">
                    E
                  </span>
                  <span className="text-cyan-300 font-black tracking-wide">
                    PSA · CGC · BGS Grading Lab &amp; VIP Auction
                  </span>
                  <span className="text-zinc-400">• Bước thẳng vào Sàn Đấu Giá • Phòng Chấm Điểm ở cuối nhà</span>
                </button>
              )}
            </div>
          )}

          {/* Grading Lab Reception Counter Prompt */}
          {activeStation?.id === 'grading_counter' && !openModal && (
            <div className="pointer-events-auto absolute bottom-20 sm:bottom-12 left-1/2 -translate-x-1/2 z-40 flex items-center animate-in fade-in zoom-in-95 duration-150">
              <button
                onClick={() => {
                  soundManager.playSelectSound();
                  setGradingModalInitialTab('submit');
                  setOpenModal('grading_shop');
                }}
                className="flex items-center gap-2.5 rounded-full border border-sky-400/90 bg-zinc-950/95 px-5 py-2.5 shadow-[0_4px_24px_rgba(56,189,248,0.4)] hover:border-sky-300 hover:scale-105 transition cursor-pointer text-xs font-bold"
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-sky-400 font-mono text-[11px] font-black text-black">
                  E
                </span>
                <span className="text-sky-300 font-black tracking-wide">Quầy Thẩm Định PSA · CGC · BGS</span>
                <span className="text-zinc-600">•</span>
                <span className="text-amber-300 font-bold">Từ $80 / Thẻ • Soi Kính Lúp 10x &amp; Thu Mua</span>
              </button>
            </div>
          )}

          {/* Grading Lab Ultrasonic Terminal Prompt */}
          {activeStation?.id === 'grading_lab_terminal' && !openModal && (
            <div className="pointer-events-auto absolute bottom-20 sm:bottom-12 left-1/2 -translate-x-1/2 z-40 flex items-center animate-in fade-in zoom-in-95 duration-150">
              <button
                onClick={() => {
                  soundManager.playSelectSound();
                  setGradingModalInitialTab('vault');
                  setOpenModal('grading_shop');
                }}
                className="flex items-center gap-2.5 rounded-full border border-amber-400/90 bg-zinc-950/95 px-5 py-2.5 shadow-[0_4px_24px_rgba(245,158,11,0.35)] hover:border-amber-300 hover:scale-105 transition cursor-pointer text-xs font-bold"
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 font-mono text-[11px] font-black text-black">
                  E
                </span>
                <span className="text-amber-300 font-black tracking-wide">
                  Kho Slab · Đập Hộp Crossover &amp; Slab Guard
                </span>
                <span className="text-zinc-600">•</span>
                <span className="text-cyan-300 font-bold">Mở Kho Bảo Quản &amp; Bảo Vệ Thẻ</span>
              </button>
            </div>
          )}

          {/* Grand VIP Auction Showroom Podium Prompt */}
          {activeStation?.id === 'grading_auction_podium' && !openModal && (
            <div className="pointer-events-auto absolute bottom-20 sm:bottom-12 left-1/2 -translate-x-1/2 z-40 flex items-center animate-in fade-in zoom-in-95 duration-150">
              <button
                onClick={() => {
                  soundManager.playSelectSound();
                  setGradingModalInitialTab('auction');
                  setOpenModal('grading_shop');
                }}
                className="flex items-center gap-2.5 rounded-full border border-amber-400 bg-zinc-950/95 px-5 py-2.5 shadow-[0_4px_28px_rgba(251,191,36,0.45)] hover:border-amber-300 hover:scale-105 transition cursor-pointer text-xs font-bold"
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 font-mono text-[11px] font-black text-black">
                  E
                </span>
                <span className="text-amber-300 font-black tracking-wide">
                  Sàn Đấu Giá Showroom VIP (Hall of Grails)
                </span>
                <span className="text-zinc-600">•</span>
                <span className="text-emerald-300 font-bold">
                  {(shopState.slabAuctions || []).some((l) => l.status === 'live')
                    ? `Đang Live: $${(shopState.slabAuctions || [])[0]?.currentBid?.toLocaleString()}`
                    : 'Ký gửi Slab cho Đại Gia Tranh Giá'}
                </span>
              </button>
            </div>
          )}

          {/* First-Person Carried Parcel HUD (TCG Card Shop Simulator - Image 2 & Image 3) */}
          {shopState.carriedParcel && !openModal && (
            <div className="pointer-events-auto absolute bottom-4 sm:bottom-8 right-4 sm:right-8 z-40 flex flex-col items-end gap-2 animate-in fade-in slide-in-from-right-4 duration-200 select-none">
              {/* Box Status Pill & Remaining Counter (Like the yellow circle in Image 3: 5/11) */}
              <div className="flex items-center gap-2.5 rounded-2xl border-2 border-amber-400/80 bg-zinc-950/95 px-4 py-2 shadow-2xl">
                {shopState.carriedParcel.imageUrl && (
                  <img
                    src={shopState.carriedParcel.imageUrl}
                    alt={shopState.carriedParcel.productName}
                    className="h-10 w-7 object-contain drop-shadow shrink-0"
                  />
                )}
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-400 text-black font-black text-xs font-mono shadow shrink-0">
                  {shopState.carriedParcel.remainingItems}/{shopState.carriedParcel.totalItems}
                </div>
                <div>
                  <div className="text-xs font-black text-white flex items-center gap-1.5">
                    <span className="text-amber-300">{shopState.carriedParcel.productName}</span>
                    <span className="text-zinc-500">•</span>
                    <span className="text-[11px] text-zinc-400 font-normal">
                      {shopState.isCarriedBoxOpen ? 'Thùng Đang Mở' : 'Thùng Đang Đóng'}
                    </span>
                  </div>
                  <div className="text-[10px] text-emerald-400 font-bold">
                    Còn {shopState.carriedParcel.remainingItems} {shopState.carriedParcel.itemType === 'box' ? 'hộp' : 'gói'} trong kiện
                  </div>
                </div>
              </div>

              {/* Action Hotkeys Stack (Exact Image 2 & Image 3 Action List) */}
              <div className="flex flex-col gap-1.5 rounded-2xl border border-zinc-800 bg-black/95 p-2 sm:p-2.5 shadow-2xl min-w-[220px]">
                {!shopState.isCarriedBoxOpen ? (
                  /* Image 2: Closed Box Actions */
                  <>
                    <button
                      onClick={handleOpenCarriedBox}
                      className="flex items-center justify-between gap-3 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 px-3.5 py-2 font-black text-xs text-black hover:from-amber-300 hover:to-amber-400 cursor-pointer shadow transition-transform hover:scale-[1.02]"
                    >
                      <span className="font-bold">Mở Kiện Hàng (Open Package)</span>
                      <span className="rounded bg-black/30 px-1.5 py-0.5 text-[10px] text-white border border-black/20 font-mono font-black">
                        ENTER
                      </span>
                    </button>

                    <button
                      onClick={handleDropCarriedParcel}
                      className="flex items-center justify-between gap-3 rounded-xl bg-zinc-900 border border-zinc-700/80 px-3 py-1.5 font-bold text-xs text-zinc-300 hover:bg-zinc-800 hover:text-white cursor-pointer transition"
                    >
                      <span>Thả Thùng Xuống (Drop)</span>
                      <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-400 border border-zinc-700 font-mono font-bold">
                        G
                      </span>
                    </button>

                    <button
                      onClick={handleRipPackFromCarriedParcel}
                      className="flex items-center justify-between gap-3 rounded-xl bg-zinc-900 border border-amber-500/30 px-3 py-1.5 font-bold text-xs text-amber-300 hover:bg-zinc-800 cursor-pointer transition"
                    >
                      <span>Xé Mở 1 Pack từ Thùng</span>
                      <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-amber-400 border border-amber-500/40 font-mono font-bold">
                        X
                      </span>
                    </button>
                  </>
                ) : (
                  /* Image 3: Opened Box Actions (Looking at Shelf) */
                  <>
                    <button
                      onClick={handleStockItemToShelf}
                      className="flex items-center justify-between gap-3 rounded-xl bg-gradient-to-r from-emerald-400 to-emerald-500 px-3.5 py-2 font-black text-xs text-black hover:from-emerald-300 hover:to-emerald-400 cursor-pointer shadow transition-transform hover:scale-[1.02] animate-pulse"
                    >
                      <span className="font-bold">Xếp Lên Kệ (Pack to Shelf)</span>
                      <span className="rounded bg-black/30 px-1.5 py-0.5 text-[10px] text-white border border-black/20 font-mono font-black">
                        ENTER
                      </span>
                    </button>

                    <button
                      onClick={handleDropCarriedParcel}
                      className="flex items-center justify-between gap-3 rounded-xl bg-zinc-900 border border-zinc-700/80 px-3 py-1.5 font-bold text-xs text-zinc-300 hover:bg-zinc-800 hover:text-white cursor-pointer transition"
                    >
                      <span>Thả Thùng Xuống (Drop)</span>
                      <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-400 border border-zinc-700 font-mono font-bold">
                        G
                      </span>
                    </button>

                    <button
                      onClick={handleRipPackFromCarriedParcel}
                      className="flex items-center justify-between gap-3 rounded-xl bg-zinc-900 border border-amber-500/30 px-3 py-1.5 font-bold text-xs text-amber-300 hover:bg-zinc-800 cursor-pointer transition"
                    >
                      <span>Xé Mở 1 Pack từ Thùng</span>
                      <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-amber-400 border border-amber-500/40 font-mono font-bold">
                        X
                      </span>
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Bottom Area: Mobile Touch Joystick (If Touch Device) */}
          {isTouchDevice && (
            <div className="pointer-events-auto ml-2 mb-8">
              <TouchJoystick onMove={handleJoystickMove} />
            </div>
          )}

          {/* Compact Bottom-Right Controls and Guide */}
          {!openModal && (
            <div className="pointer-events-auto fixed bottom-3 right-4 z-40 flex flex-col items-end gap-2">

              {/* Bottom Unified Control Capsule Dock: Gộp gọn nhỏ và thanh lịch */}
              <div className="flex items-center bg-black/90 border border-white/15 p-1 rounded-2xl shadow-2xl gap-0.5">
                {/* Button [B] Túi Đồ */}
                <button
                  onClick={() => {
                    soundManager.playSelectSound();
                    setOpenModal((prev) => (prev === 'inventory' ? null : 'inventory'));
                  }}
                  className="flex items-center gap-1.5 rounded-xl px-2 py-0.5 text-[11px] font-bold text-amber-300 hover:bg-amber-950/60 transition cursor-pointer"
                  title="Mở Túi Đồ [B]"
                >
                  <span className="flex h-4 w-4 items-center justify-center rounded bg-amber-500 font-mono text-[9px] font-black text-black">
                    B
                  </span>
                  <span>Túi ({totalPacksInStock + totalBoxesInStock})</span>
                </button>

                <div className="w-px h-3.5 bg-white/10" />

                {/* Button [V] Sổ Thẻ */}
                <button
                  onClick={() => {
                    soundManager.playSelectSound();
                    setOpenModal((prev) => (prev === 'binder' ? null : 'binder'));
                  }}
                  className="flex items-center gap-1.5 rounded-xl px-2 py-0.5 text-[11px] font-bold text-indigo-300 hover:bg-indigo-950/60 transition cursor-pointer"
                  title="Mở Sổ Thẻ Bài [V]"
                >
                  <span className="flex h-4 w-4 items-center justify-center rounded bg-indigo-500 font-mono text-[9px] font-black text-white">
                    V
                  </span>
                  <span>Sổ Thẻ</span>
                </button>

                <div className="w-px h-3.5 bg-white/10" />

                {/* Button [U] Chọn Nhân Vật 3D */}
                <button
                  onClick={() => {
                    soundManager.playSelectSound();
                    setOpenModal((prev) => (prev === 'character_select' ? null : 'character_select'));
                  }}
                  className="flex items-center gap-1.5 rounded-xl px-2 py-0.5 text-[11px] font-bold text-cyan-300 hover:bg-cyan-950/60 transition cursor-pointer"
                  title="Đổi nhân vật 3D (Naruto, Luffy Gear 5, Gojo, Itachi) [U]"
                >
                  <span className="flex h-4 w-4 items-center justify-center rounded bg-cyan-500 font-mono text-[9px] font-black text-black">
                    U
                  </span>
                  <span>{getPlayerCharacterDef(playerCharacterId).shortName}</span>
                </button>

                <div className="w-px h-3.5 bg-white/10" />

                {/* Button [C] Chuyển Góc Nhìn 1 / 3 */}
                {!motorbikeState?.isRiding && (
                  <>
                    <button
                      onClick={handleToggleCamera}
                      className={`flex items-center gap-1.5 rounded-xl px-2 py-0.5 text-[11px] font-bold transition cursor-pointer ${
                        cameraMode === 'third'
                          ? 'bg-sky-500/20 text-sky-300'
                          : 'text-sky-300 hover:bg-sky-950/60'
                      }`}
                      title="Chuyển Góc Nhìn Thứ 1 (FPS) / Thứ 3 [C]"
                    >
                      <span className="flex h-4 w-4 items-center justify-center rounded bg-sky-500 font-mono text-[9px] font-black text-black">
                        C
                      </span>
                      <span>{cameraMode === 'third' ? 'Góc Nhìn 3' : 'Góc Nhìn 1'}</span>
                    </button>

                    <div className="w-px h-3.5 bg-white/10" />
                  </>
                )}

                {/* Button [N] Qua Ngày Mới */}
                <button
                  onClick={() => {
                    soundManager.playSelectSound();
                    setShowDaySummary(true);
                  }}
                  className={`flex items-center gap-1.5 rounded-xl px-2 py-0.5 text-[11px] font-bold transition cursor-pointer ${
                    !shopState.isShopOpen
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse'
                      : 'text-zinc-300 hover:bg-zinc-800'
                  }`}
                  title="Xem tổng kết & Qua ngày mới [N]"
                >
                  <span className="flex h-4 w-4 items-center justify-center rounded bg-zinc-800 border border-zinc-600 font-mono text-[9px] font-black text-amber-400">
                    N
                  </span>
                  <span>{shopState.isShopOpen ? 'Qua Ngày' : 'Mở Ngày ☀️'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Live GTA-Style City Minimap & Expandable GPS Map ([Z] or click radar) */}
      {gameState === 'playing' && (
        <CityMinimapHud
          poseRef={minimapPoseRef}
          subscribePose={subscribeMinimapPose}
          isTouchDevice={isTouchDevice}
          isHiddenByModal={Boolean(
            openModal ||
              cityEmpireOpen ||
              pokeLiveOpen ||
              battleArenaOpen ||
              settingsModalOpen ||
              showDaySummary ||
              gachaRevealResult ||
              gameStopMysteryResult
          )}
          isFullMapOpen={isFullMapOpen}
          onSetFullMapOpen={setIsFullMapOpen}
          externalWaypoint={minimapExternalWaypoint}
          deliveryMarker={minimapDeliveryMarker}
          cityHuntMarkers={minimapCityHuntMarkers}
        />
      )}

      {/* Day Summary & Next Day Modal (Luxury Executive Closing Report) */}
      {showDaySummary && (() => {
        const rev = shopState.todayStats?.revenue ?? 0;
        const profit = shopState.todayStats?.profit ?? 0;
        const customersServed = shopState.todayStats?.customersServed ?? 0;
        const itemsSold = shopState.todayStats?.itemsSold ?? 0;
        const marginPct = rev > 0 ? Math.round((profit / rev) * 100) : 0;
        const avgTicket = customersServed > 0 ? rev / customersServed : 0;
        const avgBasket = customersServed > 0 ? itemsSold / customersServed : 0;

        const prevDayRecord = (shopState.dailySalesHistory || [])[0];
        const prevRev = prevDayRecord?.revenue ?? 0;
        const revDeltaPct =
          prevDayRecord && prevRev > 0 ? Math.round(((rev - prevRev) / prevRev) * 100) : null;

        const totalShelved = shopState.inventory.reduce((acc, i) => acc + (i.shelvedQuantity || 0), 0);
        const totalWarehouse = shopState.inventory.reduce(
          (acc, i) => acc + Math.max(0, (i.quantity || 0) - (i.shelvedQuantity || 0)),
          0
        );
        const pendingCount = shopState.pendingDeliveries.length;

        const luxuryBuffs = getLuxuryAssetBuffs(shopState.ownedLuxuryAssets || []);
        const passiveIncome = luxuryBuffs.dailyPassiveBonusCash || 0;
        const kioskCashPending = Object.values(shopState.satelliteKiosks || {}).reduce(
          (sum, k) => sum + (k?.uncollectedCash || 0),
          0
        );
        const deliveryCompletedToday = shopState.deliveryState?.dailyStats?.deliveriesCompleted || 0;
        const deliveryEarnedToday = shopState.deliveryState?.dailyStats?.revenueEarned || 0;

        const grade =
          profit >= 1500
            ? { label: 'HẠNG S+ • BÙNG NỔ', cls: 'border-amber-400/70 bg-amber-500/20 text-amber-200' }
            : profit >= 600
            ? { label: 'HẠNG A • XUẤT SẮC', cls: 'border-emerald-400/60 bg-emerald-500/20 text-emerald-200' }
            : profit > 0
            ? { label: 'HẠNG B • ỔN ĐỊNH', cls: 'border-sky-400/50 bg-sky-500/15 text-sky-200' }
            : { label: 'HẠNG C • CẦN TĂNG TỐC', cls: 'border-zinc-700 bg-zinc-800/70 text-zinc-300' };

        const expPct = Math.min(
          100,
          Math.max(4, Math.round(((shopState.storeExp || 0) / Math.max(1, shopState.storeExpToNext || 100)) * 100))
        );

        const chartDays = [
          ...(shopState.dailySalesHistory || []).slice(0, 4).reverse(),
          { day: shopState.currentDay, revenue: rev, profit, itemsSold },
        ];
        const maxChartRev = Math.max(100, ...chartDays.map((d) => d.revenue || 0));

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/92 p-3 sm:p-5 animate-in fade-in duration-200">
            <div className="relative w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-3xl border border-amber-500/50 bg-gradient-to-b from-[#12151f] via-[#0b0e15] to-[#080a10] p-5 sm:p-7 text-white shadow-[0_24px_90px_rgba(0,0,0,0.92),0_0_60px_rgba(245,158,11,0.18)]">
              {/* Top Luxury Accent Bar */}
              <div className="pointer-events-none absolute inset-x-10 top-0 h-[2px] bg-gradient-to-r from-transparent via-amber-400 to-transparent" />

              {/* Header */}
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-zinc-800/90 pb-4 mb-5">
                <div className="flex items-center gap-3.5">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-400/50 bg-gradient-to-br from-amber-400/25 via-amber-500/15 to-amber-600/10 text-amber-300 shadow-lg">
                    <Crown className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg sm:text-2xl font-black tracking-wide bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-200 bg-clip-text text-transparent">
                        BÁO CÁO ĐÓNG CỬA NGÀY {shopState.currentDay}
                      </h2>
                      <span className={`rounded-md border px-2 py-0.5 text-[10px] font-black tracking-wider ${grade.cls}`}>
                        {grade.label}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-zinc-400">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3 text-amber-400/80" /> Ca bán hàng: 07:00 AM — 04:00 AM
                      </span>
                      <span>•</span>
                      <span className="font-semibold text-zinc-300">Cấp Shop {shopState.storeLevel}</span>
                      <span>•</span>
                      <span className="font-semibold text-emerald-300">Quỹ: ${shopState.cash.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setShowDaySummary(false)}
                  className="h-9 w-9 rounded-xl bg-zinc-900/90 border border-zinc-700/80 flex items-center justify-center text-zinc-400 hover:border-amber-400 hover:text-white cursor-pointer transition"
                  title="Đóng [ESC]"
                >
                  ✕
                </button>
              </div>

              {/* Hero KPI Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                <div className="rounded-2xl border border-emerald-500/35 bg-gradient-to-br from-emerald-950/45 to-[#091210] p-4 shadow-inner">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-emerald-400/90 uppercase tracking-wider">
                      Doanh Thu Hôm Nay
                    </span>
                    <TrendingUp className="h-4 w-4 text-emerald-400" />
                  </div>
                  <div className="mt-1.5 text-2xl sm:text-3xl font-black text-emerald-300 font-mono tracking-tight">
                    +${rev.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="mt-1.5 text-[11px] font-semibold text-zinc-400">
                    {revDeltaPct !== null ? (
                      <span className={revDeltaPct >= 0 ? 'text-emerald-300' : 'text-rose-300'}>
                        {revDeltaPct >= 0 ? `▲ +${revDeltaPct}%` : `▼ ${revDeltaPct}%`} so với Ngày {prevDayRecord.day}
                      </span>
                    ) : (
                      <span>Ngày kinh doanh khởi đầu</span>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-amber-500/35 bg-gradient-to-br from-amber-950/40 to-[#141008] p-4 shadow-inner">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-amber-400/90 uppercase tracking-wider">
                      Lợi Nhuận Ròng
                    </span>
                    <Wallet className="h-4 w-4 text-amber-400" />
                  </div>
                  <div className="mt-1.5 text-2xl sm:text-3xl font-black text-amber-300 font-mono tracking-tight">
                    {profit >= 0 ? '+' : '-'}${Math.abs(profit).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="mt-1.5 flex items-center justify-between text-[11px] font-semibold text-zinc-400">
                    <span>Biên lãi: <strong className="text-amber-200">{marginPct}%</strong></span>
                    <span>TB/Khách: <strong className="text-white">${avgTicket.toFixed(0)}</strong></span>
                  </div>
                </div>

                <div className="rounded-2xl border border-sky-500/30 bg-gradient-to-br from-sky-950/35 to-[#090d16] p-4 shadow-inner">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-sky-300/90 uppercase tracking-wider">
                      Khách & Sản Lượng
                    </span>
                    <Users className="h-4 w-4 text-sky-400" />
                  </div>
                  <div className="mt-1.5 flex items-baseline gap-2">
                    <span className="text-2xl sm:text-3xl font-black text-white font-mono">{customersServed}</span>
                    <span className="text-xs font-bold text-zinc-400">khách</span>
                    <span className="text-zinc-600">•</span>
                    <span className="text-xl font-black text-sky-300 font-mono">{itemsSold}</span>
                    <span className="text-xs font-bold text-zinc-400">món</span>
                  </div>
                  <div className="mt-1.5 text-[11px] font-semibold text-zinc-400">
                    Giỏ TB: <strong className="text-sky-200">{avgBasket.toFixed(1)} món/khách</strong>
                  </div>
                </div>
              </div>

              {/* Middle Analytics & Operations Split */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 mb-5">
                {/* Left Column: Inventory, Delivery & Shop Status */}
                <div className="md:col-span-6 rounded-2xl border border-zinc-800/90 bg-zinc-900/45 p-4 space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider text-zinc-300">
                    <span className="flex items-center gap-1.5">
                      <Package className="h-3.5 w-3.5 text-amber-400" /> Vận Hành & Kệ Hàng
                    </span>
                    <span className="text-[10px] font-mono text-zinc-400">Uy tín: {shopState.reputation}/100</span>
                  </div>

                  {totalShelved === 0 ? (
                    <div className="flex items-start gap-2 rounded-xl border border-rose-500/50 bg-rose-950/35 p-2.5 text-[11px] text-rose-200">
                      <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
                      <div>
                        <strong className="text-rose-300 font-bold block">Kệ hàng hiện đang trống!</strong>
                        Hãy xếp hàng lên kệ trước khi mở cửa ngày mới để khách không ra về tay không.
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-xl bg-black/40 border border-zinc-800/80 px-3 py-2">
                        <div className="text-[10px] text-zinc-400 font-bold">Trên Kệ Bán</div>
                        <div className="text-sm font-black text-emerald-300 font-mono">{totalShelved} món</div>
                      </div>
                      <div className="rounded-xl bg-black/40 border border-zinc-800/80 px-3 py-2">
                        <div className="text-[10px] text-zinc-400 font-bold">Trong Kho / Thùng</div>
                        <div className="text-sm font-black text-zinc-200 font-mono">{totalWarehouse} món</div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-1.5 text-[11px]">
                    <div className="flex items-center justify-between rounded-xl bg-black/35 border border-zinc-800/70 px-3 py-1.5">
                      <span className="text-zinc-400">Kiện hàng ngoài vỉa hè:</span>
                      <span className={`font-black font-mono ${pendingCount > 0 ? 'text-amber-300' : 'text-zinc-500'}`}>
                        {pendingCount > 0 ? `${pendingCount} kiện đang chờ` : 'Đã dọn sạch'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-black/35 border border-zinc-800/70 px-3 py-1.5">
                      <span className="text-zinc-400">PokeShip Express hôm nay:</span>
                      <span className="font-black text-sky-300 font-mono">
                        {deliveryCompletedToday} đơn (+${deliveryEarnedToday.toFixed(0)})
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-black/35 border border-zinc-800/70 px-3 py-1.5">
                      <span className="text-zinc-400 flex items-center gap-1">
                        <ShieldCheck className="h-3 w-3 text-emerald-400" /> An ninh cửa hàng:
                      </span>
                      <span className="font-bold text-emerald-300">
                        Bắt {shopState.securityStats?.theftsPrevented || 0} vụ
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right Column: Revenue History Spark-Bars & Next Day Forecast */}
                <div className="md:col-span-6 rounded-2xl border border-zinc-800/90 bg-zinc-900/45 p-4 flex flex-col justify-between gap-3">
                  <div>
                    <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider text-zinc-300 mb-2.5">
                      <span className="flex items-center gap-1.5">
                        <BarChart3 className="h-3.5 w-3.5 text-sky-400" /> Biểu Đồ Doanh Thu Gần Đây
                      </span>
                      <span className="text-[10px] text-zinc-500">{chartDays.length} ngày</span>
                    </div>

                    <div className="grid grid-cols-5 gap-2 items-end h-20 rounded-xl bg-black/40 border border-zinc-800/80 px-3 py-2">
                      {chartDays.map((d) => {
                        const isToday = d.day === shopState.currentDay;
                        const pct = Math.max(12, Math.round(((d.revenue || 0) / maxChartRev) * 100));
                        return (
                          <div key={`chart_d_${d.day}`} className="flex flex-col items-center gap-1 h-full justify-end">
                            <div
                              className={`w-full rounded-t-md transition-all ${
                                isToday
                                  ? 'bg-gradient-to-t from-amber-500 to-yellow-300 shadow-[0_0_10px_rgba(245,158,11,0.5)]'
                                  : 'bg-zinc-700/80'
                              }`}
                              style={{ height: `${pct}%` }}
                              title={`Ngày ${d.day}: $${(d.revenue || 0).toFixed(0)}`}
                            />
                            <span className={`text-[9px] font-mono ${isToday ? 'font-black text-amber-300' : 'text-zinc-500'}`}>
                              N{d.day}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Next Day Morning Bonuses & EXP Progress */}
                  <div className="space-y-2 text-[11px]">
                    <div className="flex items-center justify-between rounded-xl border border-amber-500/25 bg-amber-950/20 px-3 py-1.5">
                      <span className="text-amber-200/90 flex items-center gap-1">
                        <Award className="h-3.5 w-3.5 text-amber-400" /> Thưởng Tài Sản Sáng Mai:
                      </span>
                      <span className="font-black text-amber-300 font-mono">
                        {passiveIncome > 0 ? `+$${passiveIncome.toLocaleString()}` : '$0'}
                      </span>
                    </div>

                    {kioskCashPending >= 1 && (
                      <div className="flex items-center justify-between rounded-xl border border-emerald-500/25 bg-emerald-950/20 px-3 py-1.5">
                        <span className="text-emerald-200/90">Kiosk AEON / Landmark chờ thu:</span>
                        <span className="font-black text-emerald-300 font-mono">
                          +${kioskCashPending.toFixed(0)}
                        </span>
                      </div>
                    )}

                    <div className="pt-0.5">
                      <div className="flex items-center justify-between text-[10px] font-bold text-zinc-400 mb-1">
                        <span>Tiến độ Cấp Shop Lv.{shopState.storeLevel}</span>
                        <span className="font-mono text-zinc-300">
                          {shopState.storeExp}/{shopState.storeExpToNext} EXP
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-amber-400 to-yellow-300 transition-all duration-300"
                          style={{ width: `${expPct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-2.5">
                <button
                  onClick={() => {
                    soundManager.playSelectSound();
                    setShowDaySummary(false);
                  }}
                  className="sm:flex-1 flex items-center justify-center gap-2 rounded-2xl border border-zinc-700/80 bg-zinc-900/90 py-3 px-4 text-xs font-bold text-zinc-200 hover:bg-zinc-800 hover:border-zinc-600 cursor-pointer transition"
                >
                  <Moon className="h-4 w-4 text-indigo-400" />
                  <span>Ở lại ban đêm xếp kệ & đặt hàng</span>
                </button>

                <button
                  onClick={() => {
                    soundManager.playSelectSound();
                    setShowDaySummary(false);
                    handleAdvanceToNextDay();
                  }}
                  className="sm:flex-[1.5] flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-300 via-amber-400 to-amber-500 py-3.5 px-5 font-black text-sm text-black hover:brightness-105 cursor-pointer shadow-[0_0_28px_rgba(245,158,11,0.42)] transition-transform hover:scale-[1.01]"
                >
                  <Sun className="h-5 w-5" />
                  <span>
                    BẮT ĐẦU NGÀY {shopState.currentDay + 1} (07:00 SÁNG)
                    {passiveIncome > 0 ? ` • +$${passiveIncome}` : ''}
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Pause Modal */}
      {gameState === 'paused' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
          <div className="w-full max-w-sm rounded-3xl border-2 border-amber-500/40 bg-zinc-950 p-6 text-center shadow-2xl">
            <h2 className="text-2xl font-black text-amber-400">TẠM DỪNG</h2>
            <p className="mt-1 text-xs text-zinc-400">PokeCard Shop Simulator 3D</p>
            <div className="my-6 space-y-3">
              <button
                onClick={() => setGameState('playing')}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 py-3 font-bold text-black hover:bg-amber-400 cursor-pointer"
              >
                <Play className="h-4 w-4 fill-current" />
                <span>Tiếp tục chơi</span>
              </button>

              <button
                onClick={() => handleOpenSettingsModal('profile')}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 py-2.5 text-xs font-bold text-amber-300 hover:bg-amber-500/20 cursor-pointer transition"
              >
                <UserCog className="h-4 w-4" />
                <span>Tài Khoản, Mật Khẩu & Đổi Người Chơi</span>
              </button>

              <button
                onClick={handleToggleMute}
                className={`flex w-full items-center justify-center gap-2 rounded-xl border py-2.5 text-xs font-semibold cursor-pointer transition ${
                  isMuted
                    ? 'border-red-500/50 bg-red-950/40 text-red-300 hover:bg-red-900/50'
                    : 'border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800'
                }`}
              >
                {isMuted ? (
                  <VolumeX className="h-4 w-4 text-red-400" />
                ) : (
                  <Volume2 className="h-4 w-4 text-emerald-400" />
                )}
                <span>{isMuted ? 'Âm thanh: Đang Tắt' : 'Âm thanh: Đang Bật'}</span>
              </button>

              <button
                onClick={() => setGameState('title')}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950 py-2.5 text-xs font-medium text-zinc-400 hover:text-white cursor-pointer"
              >
                <span>Màn Hình Chính</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: PACK OPENING SIMULATOR */}
      {openModal === 'rip_packs' && (
        <PackOpeningModal
          key={selectedOpeningSetId}
          setId={selectedOpeningSetId}
          onCardKeptInShowcase={handleCardKeptInShowcase}
          onCardAddedToBinder={handleCardAddedToBinder}
          onCardQuickSold={handleCardQuickSold}
          onPackConsumed={handlePackConsumed}
          availablePacksCount={totalPacksInStock}
          inventory={shopState.inventory}
          onOpenTablet={() => setOpenModal('pc_ordering')}
          onClose={() => setOpenModal(null)}
        />
      )}

      {/* MODAL 1.5: BOOSTER BOX OPENING SIMULATOR */}
      {openModal === 'box_opening' && (
        <BoxOpeningModal
          key={selectedOpeningSetId}
          setId={selectedOpeningSetId}
          availableBoxesCount={totalBoxesInStock}
          inventory={shopState.inventory}
          onOpenTablet={() => setOpenModal('pc_ordering')}
          onCardKeptInShowcase={handleCardKeptInShowcase}
          onCardAddedToBinder={handleCardAddedToBinder}
          onCardQuickSold={handleCardQuickSold}
          onBoxConsumed={handleBoxConsumed}
          onClose={() => setOpenModal(null)}
        />
      )}

      {/* MODAL 1.6: GAMESTOP POKÉMON MYSTERY BOX UNBOXING */}
      {openModal === ('gamestop_mystery' as any) && gameStopMysteryResult && (
        <GameStopMysteryModal
          result={gameStopMysteryResult}
          onCardKeptInShowcase={handleCardKeptInShowcase}
          onCardAddedToBinder={handleCardAddedToBinder}
          onCardQuickSold={handleCardQuickSold}
          onClose={() => {
            setOpenModal(null);
            setGameStopMysteryResult(null);
          }}
        />
      )}

      {/* MODAL 1.8: INVENTORY / BACKPACK (Phím [E] & Nút Góc Dưới Phải) */}
      {openModal === 'inventory' && (
        <InventoryModal
          onClose={() => setOpenModal(null)}
          inventory={shopState.inventory}
          onOpenRipPacks={(setId) => {
            if (setId) setSelectedOpeningSetId(setId);
            setOpenModal('rip_packs');
          }}
          onOpenBoxOpening={(setId) => {
            if (setId) setSelectedOpeningSetId(setId);
            setOpenModal('box_opening');
          }}
          onOpenOrdering={() => setOpenModal('pc_ordering')}
          onHoldBox={(set) => {
            soundManager.playSelectSound();
            setHeldBox({
              id: set.id,
              name: `${set.name} Box`,
              price: set.boxRetailPrice,
              imageUrl: set.boxImageUrl,
              themeColor: set.themeColor,
              packsCount: set.packsPerBox || 10,
            });
          }}
          onHoldPack={(set) => {
            soundManager.playSelectSound();
            setHeldPack({
              id: set.id,
              name: set.name,
              type: 'booster',
              price: set.packRetailPrice,
              imageUrl: set.packImageUrl,
              themeColor: set.themeColor,
            });
          }}
        />
      )}

      {/* MODAL 2: CASHIER POS CHECKOUT */}
      {openModal === 'register' && (
        <CashierCheckoutModal
          customer={queuingCustomer}
          queueCount={customers.filter((c) => c.status === 'queuing').length}
          scannedCounts={posScannedCounts}
          onScanOneItem={(itemId) => handleScanOneCounterItem(itemId)}
          onScanAllItems={handleScanAllCounterItems}
          onCheckoutComplete={handleCheckoutComplete}
          onClose={() => setOpenModal(null)}
        />
      )}

      {/* MODAL 3: HANDHELD TABLET (WHOLESALE ORDERING, LICENSES, PRICING, UPGRADES, EMPLOYEES) */}
      {openModal === 'pc_ordering' && (
        <TabletModal
          shopState={shopState}
          initialApp={tabletInitialApp}
          initialItemsSubTab={tabletInitialItemsSubTab}
          activeProfileId={activeProfile.id}
          onUpdateCash={(newCash) => {
            setShopState((prev) => ({ ...prev, cash: newCash }));
          }}
          onOrderStock={handleOrderStock}
          onUpdatePrices={handleUpdatePrices}
          onPurchaseUpgrade={handlePurchaseUpgrade}
          onPurchaseLicense={handlePurchaseLicense}
          onPurchaseShelfUnlock={handlePurchaseShelfUnlock}
          onHireStaff={handleHireStaff}
          onSetTableRentalPrice={(newPrice) => {
            setShopState((prev) => ({ ...prev, tableRentalPricePerHour: newPrice }));
          }}
          onHostTournament={() => {
            setShopState((prev) => {
              const expRes = applyExpGain(prev.storeExp, prev.storeLevel, 25);
              return {
                ...prev,
                cash: Math.max(0, prev.cash - 50),
                storeExp: expRes.newExp,
                storeLevel: expRes.newLevel,
                storeExpToNext: expRes.newExpToNext,
                unlockedSets: expRes.didLevelUp ? getUnlockedSetsForLevel(expRes.newLevel) : prev.unlockedSets,
              };
            });
          }}
          onAcceptDeliveryOrder={handleAcceptDeliveryOrder}
          onCancelDeliveryMission={handleCancelDeliveryMission}
          onRefreshDeliveryBoard={handleRefreshDeliveryBoard}
          onClaimDailyTask={handleClaimDailyTask}
          onFocusDeliveryOnMap={() => {
            setOpenModal(null);
            setIsFullMapOpen(true);
          }}
          onOpenCityEmpire={() => {
            setOpenModal(null);
            setCityEmpireOpen(true);
          }}
          onOpenBattleArena={() => {
            setOpenModal(null);
            setBattleArenaOpen(true);
          }}
          onOpenPokeLive={() => {
            setOpenModal(null);
            setPokeLiveOpen(true);
          }}
          onHaggleCityHunt={handleHaggleCityHunt}
          onBuyCityHunt={handleBuyCityHunt}
          onRefreshCityHunts={handleRefreshCityHunts}
          onRefreshMarketPulses={handleRefreshMarketPulses}
          onNavigateToPoi={handleNavigateToPoi}
          onSellBinderCardOnSocial={handleSellBinderCardOnSocial}
          onBuyOverpricedCard={handleBuyOverpricedSocialCard}
          onClose={() => setOpenModal(null)}
        />
      )}

      {/* MODAL 3.5: RETAIL, VIP COLLECTOR & GAMESTOP & ONE PIECE SHELVES MANAGEMENT */}
      {(openModal === 'shelves' ||
        openModal === 'collector_shelves' ||
        openModal === 'gamestop_shelf' ||
        openModal === 'op_shelves' ||
        openModal === 'op_collector_shelves' ||
        openModal === 'op_bounty_shelf') && (
        <ShelfManagementModal
          shopState={shopState}
          onUpdatePrices={handleUpdatePrices}
          onOpenShelfUnlocks={openTabletShelfUnlocks}
          onClose={() => setOpenModal(null)}
        />
      )}

      {/* MODAL 4: CARD DISPLAY SHELVES & GOLD SHOWCASE VITRINE (POKEMON & ONE PIECE) */}
      {(openModal === 'showcase' ||
        openModal === 'shelf_1' ||
        openModal === 'shelf_2' ||
        openModal === 'shelf_3' ||
        openModal === 'op_showcase' ||
        openModal === 'op_shelf_1' ||
        openModal === 'op_shelf_2' ||
        openModal === 'op_shelf_3') && (
        <ShowcaseModal
          showcaseCards={shopState.showcaseCards}
          shelfCards={shopState.shelfCards || []}
          unlockedShelves={shopState.unlockedShelves}
          initialTab={
            openModal === 'shelf_2' || openModal === 'op_shelf_2'
              ? 'shelf_2'
              : openModal === 'shelf_3' || openModal === 'op_shelf_3'
              ? 'shelf_3'
              : openModal === 'shelf_1' || openModal === 'op_shelf_1'
              ? 'shelf_1'
              : 'showcase'
          }
          onUpdateShowcase={(updated) =>
            setShopState((prev) => ({ ...prev, showcaseCards: updated }))
          }
          onUpdateShelfCards={(updated) =>
            setShopState((prev) => ({ ...prev, shelfCards: updated }))
          }
          onOpenShelfUnlocks={openTabletShelfUnlocks}
          onClose={() => setOpenModal(null)}
        />
      )}

      {/* MODAL 5: CARD BINDER MASTER SET (POKEMON 151 & ONE PIECE GRAND LINE) */}
      {(openModal === 'binder' || openModal === 'op_binder') && (
        <CardBinderModal
          collectedCardIds={shopState.binderCards}
          claimedMasterSetMilestones={shopState.claimedMasterSetMilestones || []}
          onClaimMasterSetMilestone={handleClaimMasterSetMilestone}
          onClose={() => setOpenModal(null)}
          onCardKeptInShowcase={handleCardKeptInShowcase}
        />
      )}

      {/* MODAL 5.5: 3D PLAYER CHARACTER SELECTOR */}
      {openModal === 'character_select' && (
        <CharacterSelectorModal
          selectedId={playerCharacterId}
          cameraMode={cameraMode}
          isRidingBike={Boolean(motorbikeState?.isRiding)}
          onSelect={handleSelectPlayerCharacter}
          onToggleCamera={handleToggleCamera}
          onClose={() => setOpenModal(null)}
        />
      )}

      {/* MODAL 6: GACHA MYSTERY PACKS & DEVIL FRUIT GACHA */}
      {(openModal === 'gacha' || openModal === 'op_gacha') && (
        <GachaModal
          shopState={shopState}
          onDeductCash={handleDeductCash}
          onAddCash={handleAddCash}
          onOpenPackFromShelf={(tierId: string) => {
            setShopState((prev) => {
              const updatedInv = prev.inventory.map((item) => {
                if (item.productId === `gacha_${tierId}` || item.productId === tierId) {
                  return {
                    ...item,
                    quantity: Math.max(0, item.quantity - 1),
                    shelvedQuantity: Math.max(0, (item.shelvedQuantity || 0) - 1),
                  };
                }
                return item;
              });
              sceneManagerRef.current?.syncAllShelves(updatedInv);
              const expRes = applyExpGain(prev.storeExp, prev.storeLevel, 2);
              return {
                ...prev,
                inventory: updatedInv,
                packsOpenedCount: prev.packsOpenedCount + 1,
                storeExp: expRes.newExp,
                storeLevel: expRes.newLevel,
                storeExpToNext: expRes.newExpToNext,
                unlockedSets: expRes.didLevelUp ? getUnlockedSetsForLevel(expRes.newLevel) : prev.unlockedSets,
              };
            });
          }}
          onCardKeptInShowcase={handleCardKeptInShowcase}
          onCardAddedToBinder={handleCardAddedToBinder}
          onClose={() => setOpenModal(null)}
        />
      )}

      {/* MODAL 6.5: WALK-IN PSA · CGC · BGS GRADING LAB & VIP AUCTION SHOWROOM (UNLOCKS LEVEL 25) */}
      {openModal === 'grading_shop' && (
        <GradingShopModal
          shopState={shopState}
          initialTab={gradingModalInitialTab}
          onHireStaff={handleHireStaff}
          onSubmitGrading={handleSubmitGrading}
          onClaimCompletedJob={handleClaimCompletedGradingJob}
          onClaimAllCompleted={handleClaimAllCompletedGradingJobs}
          onActionOwnedSlab={handleActionOwnedSlab}
          onApproveCustomerOrder={handleApproveCustomerGradingOrder}
          onCompleteCustomerOrder={handleCompleteCustomerGradingOrder}
          onStartAuction={handleStartSlabAuction}
          onStartConsignmentAuction={handleStartConsignmentAuction}
          onAcceptConsignmentOffer={handleAcceptConsignmentOffer}
          onDeclineConsignmentOffer={handleDeclineConsignmentOffer}
          onInviteConsignmentOffer={handleInviteConsignmentOffer}
          onPlaceUserBid={handlePlaceUserBidOnAuction}
          onSettleAuction={handleSettleSlabAuction}
          onCrackAndRegrade={handleCrackAndRegradeSlab}
          onEquipSlabGuard={handleEquipSlabGuard}
          onInspectBuyback={handleInspectBuybackOffer}
          onScanBuybackAuthenticity={handleScanBuybackAuthenticity}
          onRestoreBuybackCard={handleRestoreBuybackCard}
          onReportFakeBuyback={handleReportFakeBuyback}
          onAcceptBuyback={handleAcceptBuybackOffer}
          onDeclineBuyback={handleDeclineBuybackOffer}
          onFulfillVipOrder={handleFulfillVipOrder}
          onClose={() => setOpenModal(null)}
        />
      )}

      {/* MODAL 6.8: CITY EMPIRE HUB (LUXURY & KIOSKS, SECURITY & TROPHIES) */}
      {cityEmpireOpen && (
        <CityEmpireModal
          shopState={shopState}
          initialTab={cityEmpireInitialTab}
          onBuyLuxuryAsset={handleBuyLuxuryAsset}
          onUnlockOrUpgradeKiosk={handleUnlockOrUpgradeKiosk}
          onCollectKioskCash={handleCollectKioskCash}
          onUpgradeSecurity={handleUpgradeSecurity}
          onCatchShoplifter={handleCatchShoplifter}
          onOpenTournamentArena={() => {
            setCityEmpireOpen(false);
            setBattleArenaOpen(true);
          }}
          onClose={() => setCityEmpireOpen(false)}
        />
      )}

      {/* MODAL 6.85: STANDALONE POKELIVE STUDIO APP (REAL-TIME TIKTOK STREAM & LIVE BOX BREAK) */}
      {pokeLiveOpen && (
        <PokeLiveAppModal
          shopState={shopState}
          liveRuntime={liveRuntime}
          onToggleAutoLive={handleToggleAutoLive}
          onStartBroadcast={handleStartLiveBroadcast}
          onCancelBeforeRip={handleCancelLiveBeforeRip}
          onShowSeal={handleShowSealOnLive}
          onHypeShoutout={handleHypeShoutoutOnLive}
          onFlashSale={handleFlashSaleOnLive}
          onBeginRipping={handleBeginLiveRipping}
          onRipNextPack={handleRipNextLivePack}
          onToggleAutoRip={handleToggleAutoRipLive}
          onSendHostComment={handleSendHostCommentOnLive}
          onTapHeart={handleTapHeartOnLive}
          onResetToSetup={handleResetLiveToSetup}
          onTikTokViewChange={setPokeLiveViewingTikTok}
          onBuildLiveStudio={handleBuildLiveStudio}
          onGoToHireStreamer={() => {
            setPokeLiveOpen(false);
            setTabletInitialApp('employee');
            setOpenModal('pc_ordering');
          }}
          onGoToSupplyShop={() => {
            setPokeLiveOpen(false);
            setTabletInitialApp('supply');
            setTabletInitialItemsSubTab('cardpack');
            setOpenModal('pc_ordering');
          }}
          onClose={() => setPokeLiveOpen(false)}
        />
      )}

      {/* MODAL 6.9: BATTLE ARENA & LIVE 8-TEAM KNOCKOUT TOURNAMENT CIRCUIT */}
      {battleArenaOpen && (
        <BattleArenaModal
          tableRentalPricePerHour={shopState.tableRentalPricePerHour || 5}
          tablePlayersCount={shopState.tablePlayersCount || 4}
          totalEarnings={shopState.totalTableRentalEarnings || 0}
          storeCash={shopState.cash}
          shopState={shopState}
          onStartTournamentBracket={handleStartTournamentBracket}
          onAdvanceTournamentRound={handleAdvanceTournamentRound}
          onSetRentalPrice={(newPrice) => {
            setShopState((prev) => ({ ...prev, tableRentalPricePerHour: newPrice }));
          }}
          onHostTournament={() => {
            setShopState((prev) => {
              const expRes = applyExpGain(prev.storeExp, prev.storeLevel, 25);
              return {
                ...prev,
                cash: Math.max(0, prev.cash - 50),
                storeExp: expRes.newExp,
                storeLevel: expRes.newLevel,
                storeExpToNext: expRes.newExpToNext,
                unlockedSets: expRes.didLevelUp ? getUnlockedSetsForLevel(expRes.newLevel) : prev.unlockedSets,
              };
            });
          }}
          onClose={() => setBattleArenaOpen(false)}
        />
      )}

      {/* MODAL 7: GACHA REVEAL CELEBRATION (Thẻ to tối đa, thu gọn các phần tử khác) */}
      {gachaRevealResult && (() => {
        const timesMultiplier = gachaRevealResult.payout / gachaRevealResult.packTier.price;
        const formattedTimes = timesMultiplier >= 10 ? Math.round(timesMultiplier) : timesMultiplier.toFixed(1);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-3 sm:p-4 animate-in fade-in duration-200 select-none overflow-y-auto">
            <div className="relative w-full max-w-xl max-h-[96vh] rounded-3xl border border-sky-800/60 bg-[#040814] p-4 sm:p-5 flex flex-col items-center justify-between text-center shadow-[0_0_90px_rgba(30,58,138,0.5)] overflow-hidden my-auto">
              {/* Background Ambient Radial Glow & Rotating Golden Rays */}
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(37,99,235,0.30)_0%,transparent_70%)]" />
              <div className="pointer-events-none absolute -inset-32 bg-[conic-gradient(from_0deg,transparent_0deg,rgba(245,158,11,0.18)_30deg,transparent_60deg,rgba(56,189,248,0.18)_90deg,transparent_120deg,rgba(245,158,11,0.18)_150deg,transparent_180deg,rgba(56,189,248,0.18)_210deg,transparent_240deg,rgba(245,158,11,0.18)_270deg,transparent_300deg,rgba(245,158,11,0.18)_330deg,transparent_360deg)] animate-[spin_30s_linear_infinite]" />

              {/* Ultra-Compact Top Bar: POKÉMON HIT • COLLECTOR + Close (✕) */}
              <div className="relative w-full flex items-center justify-between border-b border-zinc-800/60 pb-2 mb-2 px-1">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-black tracking-[0.25em] text-[#d4af37] uppercase">POKÉMON</span>
                  <span className="text-zinc-600">•</span>
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#0b162c] border border-[#1e3a6a] text-[10px] font-black text-white">
                    <div className="h-2.5 w-2.5 rounded-xs bg-gradient-to-tr from-amber-500 via-rose-500 to-cyan-400 flex items-center justify-center text-[7px] text-black font-black">
                      ◆
                    </div>
                    <span className="tracking-wider">COLLECTOR HIT</span>
                  </div>
                </div>

                <button
                  onClick={() => setGachaRevealResult(null)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-800 cursor-pointer transition-colors"
                  title="Đóng [ESC]"
                >
                  ✕
                </button>
              </div>

              {/* Centered Graded Slab / Magnetic Case - MAXIMUM SIZE CARD */}
              <div className="relative flex flex-col items-center justify-center my-auto w-full">
                {gachaRevealResult.isSlab && gachaRevealResult.slab ? (
                  <GradedSlabCard
                    card={gachaRevealResult.card}
                    slab={gachaRevealResult.slab}
                    cardHeightStyle="clamp(160px, 28vh, 310px)"
                  />
                ) : (
                  <div className="relative rounded-2xl border-2 sm:border-3 border-zinc-700/80 bg-gradient-to-b from-zinc-800/95 via-zinc-900/95 to-zinc-950 p-2 sm:p-2.5 shadow-[0_25px_60px_rgba(0,0,0,0.95)] max-w-[340px] sm:max-w-[380px] w-full">
                    <div className="rounded-lg bg-zinc-900/90 px-3 py-1 text-zinc-100 border border-amber-500/50 mb-1.5 shadow-inner text-left flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-[10px] font-black uppercase text-amber-300 tracking-wide">RAW MINT AUTHENTIC</span>
                      </div>
                      <span className="text-[9px] font-mono font-bold text-zinc-400">UNGRADED</span>
                    </div>
                    <div className="relative rounded-lg overflow-hidden border border-zinc-600/50 bg-black flex items-center justify-center">
                      <img
                        src={gachaRevealResult.card.imageUrl}
                        alt={gachaRevealResult.card.name}
                        className="w-auto h-auto max-h-[48vh] sm:max-h-[54vh] object-contain drop-shadow-[0_15px_35px_rgba(0,0,0,0.9)] hover:scale-[1.02] transition-transform duration-200"
                      />
                    </div>
                  </div>
                )}

                {/* Card Name, Bold Value & Multipliers in one compact row */}
                <div className="relative mt-2 text-center w-full max-w-md">
                  <div className="text-base sm:text-lg font-black text-white tracking-wide truncate">
                    {gachaRevealResult.card.name}
                  </div>
                  <div className="flex items-center justify-center gap-2.5 mt-0.5 flex-wrap">
                    <div className="text-3xl sm:text-4xl font-black text-amber-300 font-sans tracking-tight drop-shadow-[0_2px_15px_rgba(245,158,11,0.5)]">
                      ${gachaRevealResult.payout.toLocaleString()}
                    </div>
                    <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-[#0f1b33] border border-[#facc15] text-[#facc15] shadow-[0_0_15px_rgba(250,204,21,0.25)] text-xs font-black">
                      <span>{formattedTimes}× gói</span>
                      <span className="text-[10px] text-zinc-400 font-normal">(${gachaRevealResult.packTier.price})</span>
                    </div>
                    {gachaRevealResult.isSlab && gachaRevealResult.slab && gachaRevealResult.rawPrice && (
                      <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-950/80 border border-emerald-400/60 text-emerald-300 text-[11px] font-black">
                        <span>
                          {gachaRevealResult.slab.company} {gachaRevealResult.slab.grade}
                        </span>
                        <span className="text-zinc-300 font-normal">
                          (Raw ${gachaRevealResult.rawPrice.toLocaleString()} × {gachaRevealResult.gradeMultiplier?.toFixed(2)})
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Compact Actions Area */}
              <div className="relative space-y-1.5 mt-2 pt-2 border-t border-zinc-800/80 w-full max-w-md">
                <button
                  onClick={() => {
                    soundManager.playSelectSound();
                    handleCardKeptInShowcase(
                      gachaRevealResult.card,
                      Math.round(gachaRevealResult.payout * 1.2),
                      { isSlab: gachaRevealResult.isSlab, slab: gachaRevealResult.slab }
                    );
                    setGachaRevealResult(null);
                  }}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 py-2 font-black text-xs sm:text-sm text-black hover:from-amber-300 hover:to-amber-400 cursor-pointer shadow-lg transition-transform hover:scale-[1.01]"
                >
                  <span>⭐ Giữ Lại Trưng Bày Bán Trên Bàn (${Math.round(gachaRevealResult.payout * 1.2).toLocaleString()})</span>
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      soundManager.playSelectSound();
                      handleCardAddedToBinder(gachaRevealResult.card);
                      setGachaRevealResult(null);
                    }}
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-900 py-1.5 text-xs font-bold text-zinc-200 hover:bg-zinc-800 cursor-pointer"
                  >
                    <BookOpen className="h-3.5 w-3.5 text-sky-400" />
                    <span>Cất Vào Sổ 151</span>
                  </button>

                  <button
                    onClick={() => {
                      soundManager.playCashRegister();
                      handleCardQuickSold(gachaRevealResult.card, gachaRevealResult.payout);
                      setGachaRevealResult(null);
                    }}
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-900 py-1.5 text-xs font-bold text-emerald-400 hover:bg-zinc-800 cursor-pointer"
                  >
                    <DollarSign className="h-3.5 w-3.5" />
                    <span>Bán Lấy Tiền Mặt</span>
                  </button>
                </div>

                <div className="flex items-center justify-between text-[10px] text-zinc-500 pt-0.5 px-1">
                  <span className="text-emerald-400/90 font-medium">🛡️ Bảo hiểm sàn tối thiểu 50%</span>
                  <button
                    onClick={() => setGachaRevealResult(null)}
                    className="text-zinc-400 hover:text-white cursor-pointer underline"
                  >
                    Đóng [ESC]
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      <PhoDiBoMixcloudPlayer activeVenue={activeVenueMusic} />

      {/* MODAL 8: PLAYER ACCOUNT, PASSWORD & MULTI-USER DATABASE SETTINGS */}
      {settingsModalOpen && (
        <ShopSettingsModal
          initialTab={settingsInitialTab}
          onClose={() => setSettingsModalOpen(false)}
          onProfileChanged={handleProfileChanged}
        />
      )}
    </div>
  );
}
