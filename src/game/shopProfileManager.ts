/**
 * PokeCard Shop Simulator 3D - Multi-User Account & Shop Database Manager
 * Inspired by Casino's profileManager.ts:
 * - Supports Player Name + Password/PIN authentication
 * - Persists a multi-account database in localStorage where each player has
 *   their own isolated ShopState, shop name, stats, and transaction history
 * - Automatically migrates any existing single-save shop data into the default profile
 */

import {
  ShopState,
  createInitialShopState,
  createTestVipShopState,
  POKEMON_CARDS_DB,
  ONEPIECE_CARDS_DB,
  getXpToNextLevel,
  STARTER_UNLOCKED_SHELVES,
} from './pokemonShopLogic';
import { createInitialDailyStats, createInitialDeliveryState } from './cardDeliverySystem';

export type ShopHistoryCategory = 'sale' | 'order' | 'pull' | 'upgrade' | 'system' | 'delivery';

export interface ShopHistoryEntry {
  id: string;
  timestamp: number;
  category: ShopHistoryCategory;
  title: string;
  amount: number; // positive = income, negative = expense, 0 = info
  detail: string;
  isIncome: boolean;
}

export interface ShopPlayerProfile {
  id: string;
  name: string;
  pin: string; // Password or 4-20 char security PIN
  avatarColor: string;
  createdAt: number;
  lastPlayedAt: number;
  shopState: ShopState;
  history: ShopHistoryEntry[];
  isTestAccount?: boolean;
}

export const TEST_VIP_PROFILE_ID = 'shop_user_vip_tester';
export const SHOP_PROFILES_DB_KEY = 'pokecard_shop_profiles_db_v1';
export const SHOP_ACTIVE_PROFILE_ID_KEY = 'pokecard_shop_active_profile_id_v1';
export const LEGACY_SHOP_STORAGE_KEY = 'pokecard_shop_simulator_save_v1';
const CASINO_PROFILES_KEY = 'grand_royale_profiles_data';
const CASINO_ACTIVE_ID_KEY = 'grand_royale_active_profile_id';

export function getOrCreateTestVipProfile(existing?: ShopPlayerProfile): ShopPlayerProfile {
  const now = Date.now();
  const vipShop = createTestVipShopState();

  if (existing) {
    return {
      ...existing,
      id: TEST_VIP_PROFILE_ID,
      name: 'Tester VIP (Full Cấp & Tiền)',
      pin: '0000',
      avatarColor: '#8b5cf6',
      isTestAccount: true,
      shopState: {
        ...existing.shopState,
        storeLevel: 27,
        storeExp: 99999,
        storeExpToNext: 100000,
        cash: Math.max(existing.shopState.cash, 1000000.0),
        unlockedSets: vipShop.unlockedSets,
        purchasedLicenses: vipShop.purchasedLicenses,
        unlockedShelves: vipShop.unlockedShelves,
        reputation: 100,
      },
    };
  }

  return {
    id: TEST_VIP_PROFILE_ID,
    name: 'Tester VIP (Full Cấp & Tiền)',
    pin: '0000',
    avatarColor: '#8b5cf6',
    createdAt: now - 86400000,
    lastPlayedAt: now,
    isTestAccount: true,
    shopState: vipShop,
    history: [
      {
        id: 'hist_vip_init',
        timestamp: now,
        category: 'system',
        title: 'Tài Khoản Chuyên Test VIP',
        amount: 1000000,
        detail:
          'Tài khoản chuyên biệt dành cho kiểm thử: Cấp 27 (Max Cấp), $1,000,000 tiền mặt, mở khóa toàn bộ Thẻ, Kệ hàng & Giấy phép kinh doanh.',
        isIncome: true,
      },
    ],
  };
}

export const AVATAR_COLORS = [
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#3b82f6', // Blue
  '#10b981', // Emerald
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#14b8a6', // Teal
];

/**
 * Normalizes and reconciles any raw ShopState object loaded from storage
 * so old saves stay compatible with current game features.
 */
export function reconcileShopState(raw: any): ShopState {
  const initial = createInitialShopState();
  if (!raw || typeof raw !== 'object') {
    return initial;
  }

  const parsed: any = { ...initial, ...raw };
  const removed = ['pokemon151', 'crownZenith', 'shroudedFable', 'temporalForces', 'twilightMasquerade'];

  if (Array.isArray(parsed.inventory)) {
    parsed.inventory = parsed.inventory.filter(
      (item: any) =>
        !removed.some((r) => item.productId?.includes(r) || item.id?.includes(r) || item.setName?.includes('Twilight'))
    );
    parsed.inventory.forEach((item: any) => {
      if (
        item.productId?.includes('surgingSparks') ||
        item.setName?.includes('Surging Sparks') ||
        item.id?.includes('surgingSparks')
      ) {
        item.productId = item.productId.replace('surgingSparks', 'paldeanFates');
        item.setName = 'Scarlet & Violet: Paldean Fates';
        item.name =
          item.type === 'box'
            ? 'Booster Box Scarlet & Violet: Paldean Fates (10 Packs)'
            : 'Pack Scarlet & Violet: Paldean Fates (10 Thẻ)';
      }
      const qty = Math.max(0, Number(item.quantity) || 0);
      item.quantity = qty;
      item.shelvedQuantity = Math.max(0, Math.min(qty, Number(item.shelvedQuantity) || 0));
    });

    // Backfill newly introduced catalog entries (e.g. Floor 2 One Piece inventory) without touching existing quantities/prices
    const existingIds = new Set(parsed.inventory.map((i: any) => i.id));
    const existingProductIds = new Set(parsed.inventory.map((i: any) => i.productId));
    for (const seedItem of initial.inventory) {
      if (!existingIds.has(seedItem.id) && !existingProductIds.has(seedItem.productId)) {
        parsed.inventory.push({ ...seedItem });
      }
    }
  } else {
    parsed.inventory = initial.inventory;
  }

  if (parsed.inGameHour === undefined) parsed.inGameHour = 7;
  if (parsed.inGameMinute === undefined) parsed.inGameMinute = 0;
  if (parsed.isShopOpen === undefined) parsed.isShopOpen = true;
  if (!Array.isArray(parsed.pendingDeliveries)) parsed.pendingDeliveries = [];
  if (!parsed.todayStats) {
    parsed.todayStats = { revenue: 0, profit: 0, customersServed: 0, itemsSold: 0 };
  }
  parsed.carriedParcel = null;
  parsed.isCarriedBoxOpen = false;

  if (Array.isArray(parsed.unlockedSets)) {
    parsed.unlockedSets = parsed.unlockedSets.filter((s: string) => !removed.includes(s));
    if (!parsed.unlockedSets.includes('paldeanFates')) {
      parsed.unlockedSets.unshift('paldeanFates');
    }
    if (!parsed.unlockedSets.includes('pokemon30thCommon')) {
      parsed.unlockedSets.unshift('pokemon30thCommon');
    }
    if (!parsed.unlockedSets.includes('op01RomanceDawn')) {
      parsed.unlockedSets.push('op01RomanceDawn');
    }
    parsed.unlockedSets = Array.from(new Set(parsed.unlockedSets));
  } else {
    parsed.unlockedSets = initial.unlockedSets;
  }

  if (!Array.isArray(parsed.showcaseCards) || parsed.showcaseCards.length === 0) {
    parsed.showcaseCards = initial.showcaseCards;
  } else {
    parsed.showcaseCards = parsed.showcaseCards.slice(0, 10).map((sc: any) => {
      if (!sc || !sc.card) return sc;
      const canonical = POKEMON_CARDS_DB.find((c) => c.id === sc.card.id || c.name === sc.card.name);
      if (canonical) {
        return {
          ...sc,
          isReserved: false,
          card: {
            ...sc.card,
            imageUrl: canonical.imageUrl,
            artUrl: canonical.artUrl,
          },
        };
      }
      return { ...sc, isReserved: false };
    });
  }

  if (!Array.isArray(parsed.shelfCards) || parsed.shelfCards.length === 0) {
    parsed.shelfCards = initial.shelfCards;
  } else {
    parsed.shelfCards = parsed.shelfCards.slice(0, 18).map((sc: any) => {
      if (!sc || !sc.card) return sc;
      const canonical = POKEMON_CARDS_DB.find((c) => c.id === sc.card.id || c.name === sc.card.name);
      if (canonical) {
        return {
          ...sc,
          isReserved: false,
          card: {
            ...sc.card,
            imageUrl: canonical.imageUrl,
            artUrl: canonical.artUrl,
          },
        };
      }
      return { ...sc, isReserved: false };
    });
  }

  // Floor 2 One Piece display cards
  if (!Array.isArray(parsed.opShowcaseCards)) {
    parsed.opShowcaseCards = [];
  } else {
    parsed.opShowcaseCards = parsed.opShowcaseCards.slice(0, 10).map((sc: any) => {
      if (!sc || !sc.card) return sc;
      const canonical = ONEPIECE_CARDS_DB.find((c) => c.id === sc.card.id || c.name === sc.card.name);
      if (canonical) {
        return {
          ...sc,
          isReserved: false,
          card: {
            ...sc.card,
            imageUrl: canonical.imageUrl,
            artUrl: canonical.artUrl,
            universe: 'onepiece' as const,
          },
        };
      }
      return { ...sc, isReserved: false };
    });
  }

  if (!Array.isArray(parsed.opShelfCards)) {
    parsed.opShelfCards = [];
  } else {
    parsed.opShelfCards = parsed.opShelfCards.slice(0, 18).map((sc: any) => {
      if (!sc || !sc.card) return sc;
      const canonical = ONEPIECE_CARDS_DB.find((c) => c.id === sc.card.id || c.name === sc.card.name);
      if (canonical) {
        return {
          ...sc,
          isReserved: false,
          card: {
            ...sc.card,
            imageUrl: canonical.imageUrl,
            artUrl: canonical.artUrl,
            universe: 'onepiece' as const,
          },
        };
      }
      return { ...sc, isReserved: false };
    });
  }

  if (parsed.tableRentalPricePerHour === undefined) parsed.tableRentalPricePerHour = 5;
  if (parsed.tablePlayersCount === undefined) parsed.tablePlayersCount = 4;
  if (parsed.totalTableRentalEarnings === undefined) parsed.totalTableRentalEarnings = 0;

  if (!parsed.hiredStaff) {
    parsed.hiredStaff = {
      cashier: 0,
      restocker: 0,
      officeStaff: 0,
      gradingReceptionist: 0,
      gradingSpecialists: 0,
      auctioneer: 0,
      auctionHost: 0,
    };
  } else {
    if (parsed.hiredStaff.cashier === undefined) parsed.hiredStaff.cashier = 0;
    if (parsed.hiredStaff.restocker === undefined) parsed.hiredStaff.restocker = 0;
    if (parsed.hiredStaff.officeStaff === undefined) parsed.hiredStaff.officeStaff = 0;
    if (parsed.hiredStaff.gradingReceptionist === undefined) parsed.hiredStaff.gradingReceptionist = 0;
    if (parsed.hiredStaff.gradingSpecialists === undefined) parsed.hiredStaff.gradingSpecialists = 0;
    if (parsed.hiredStaff.auctioneer === undefined) parsed.hiredStaff.auctioneer = 0;
    if (parsed.hiredStaff.auctionHost === undefined) parsed.hiredStaff.auctionHost = 0;
  }

  if (!Array.isArray(parsed.gradingJobs)) parsed.gradingJobs = [];
  if (!Array.isArray(parsed.gradedSlabs)) parsed.gradedSlabs = [];
  if (!Array.isArray(parsed.slabAuctions)) parsed.slabAuctions = [];
  if (!Array.isArray(parsed.auctionConsignmentOffers)) parsed.auctionConsignmentOffers = [];
  if (!Array.isArray(parsed.auctionHistory)) parsed.auctionHistory = [];
  if (!Array.isArray(parsed.trophyCollection)) parsed.trophyCollection = [];
  if (!Array.isArray(parsed.marketPulseNews)) parsed.marketPulseNews = [];
  if (!parsed.liveBreakStats || typeof parsed.liveBreakStats !== 'object') {
    parsed.liveBreakStats = { breaksHosted: 0, slotsSold: 0, totalRevenue: 0, viralFollowers: 50 };
  }
  if (!Array.isArray(parsed.cityHuntSpots)) parsed.cityHuntSpots = [];
  if (!Array.isArray(parsed.ownedLuxuryAssets)) parsed.ownedLuxuryAssets = [];
  if (!parsed.satelliteKiosks || typeof parsed.satelliteKiosks !== 'object') {
    parsed.satelliteKiosks = {
      aeon_kiosk: { id: 'aeon_kiosk', unlocked: false, tier: 1, uncollectedCash: 0, totalEarned: 0, itemsSold: 0 },
      landmark_kiosk: { id: 'landmark_kiosk', unlocked: false, tier: 1, uncollectedCash: 0, totalEarned: 0, itemsSold: 0 },
    };
  }
  if (!Array.isArray(parsed.claimedMasterSetMilestones)) parsed.claimedMasterSetMilestones = [];
  if (typeof parsed.securityLevel !== 'number') parsed.securityLevel = 0;
  if (!parsed.securityStats || typeof parsed.securityStats !== 'object') {
    parsed.securityStats = { theftsPrevented: 0, totalLosses: 0, bountiesEarned: 0 };
  }

  if (!Array.isArray(parsed.purchasedLicenses) || parsed.purchasedLicenses.length === 0) {
    parsed.purchasedLicenses = ['lic_30th_pack', 'pokemon30thCommon_pack', 'lic_op01_pack', 'op01RomanceDawn_pack'];
  } else {
    parsed.purchasedLicenses = Array.from(
      new Set([...parsed.purchasedLicenses, 'lic_op01_pack', 'op01RomanceDawn_pack'])
    );
  }

  parsed.unlockedShelves = Array.from(
    new Set([
      ...STARTER_UNLOCKED_SHELVES,
      ...(Array.isArray(parsed.unlockedShelves) ? parsed.unlockedShelves : []),
    ])
  );

  if (typeof parsed.storeExpToNext !== 'number' || parsed.storeExpToNext === 300 || parsed.storeExpToNext === 600) {
    parsed.storeExpToNext = getXpToNextLevel(parsed.storeLevel || 1);
  }

  if (!parsed.deliveryState || typeof parsed.deliveryState !== 'object') {
    parsed.deliveryState = createInitialDeliveryState(parsed as ShopState);
  } else {
    if (!Array.isArray(parsed.deliveryState.availableOrders) || parsed.deliveryState.availableOrders.length === 0) {
      parsed.deliveryState.availableOrders = createInitialDeliveryState(parsed as ShopState).availableOrders;
    }
    if (parsed.deliveryState.activeMission === undefined) parsed.deliveryState.activeMission = null;
    if (typeof parsed.deliveryState.completedCount !== 'number') parsed.deliveryState.completedCount = 0;
    if (typeof parsed.deliveryState.totalEarnings !== 'number') parsed.deliveryState.totalEarnings = 0;
    if (typeof parsed.deliveryState.totalTips !== 'number') parsed.deliveryState.totalTips = 0;
    if (typeof parsed.deliveryState.streak !== 'number') parsed.deliveryState.streak = 0;
    if (typeof parsed.deliveryState.rating !== 'number') parsed.deliveryState.rating = 4.9;
    if (!parsed.deliveryState.dailyStats || parsed.deliveryState.dailyStats.day !== parsed.currentDay) {
      parsed.deliveryState.dailyStats = createInitialDailyStats(parsed.currentDay || 1);
    } else if (!Array.isArray(parsed.deliveryState.dailyStats.claimedTaskIds)) {
      parsed.deliveryState.dailyStats.claimedTaskIds = [];
    }
  }

  return parsed as ShopState;
}

function getSafeStorage(): Storage | null {
  try {
    if (typeof globalThis !== 'undefined' && 'localStorage' in globalThis && globalThis.localStorage) {
      return globalThis.localStorage;
    }
  } catch {}
  return null;
}

function readCasinoSeedIdentity(): { name: string; pin: string; avatarColor: string } {
  const storage = getSafeStorage();
  if (!storage) {
    return { name: 'Phúc Đẹp Trai', pin: '1234', avatarColor: '#f59e0b' };
  }
  try {
    const activeId = storage.getItem(CASINO_ACTIVE_ID_KEY);
    const rawProfiles = storage.getItem(CASINO_PROFILES_KEY);
    if (rawProfiles) {
      const profiles = JSON.parse(rawProfiles);
      const picked = (activeId && profiles[activeId]) || Object.values(profiles)[0];
      if (picked && typeof picked.name === 'string' && typeof picked.pin === 'string') {
        return {
          name: picked.name,
          pin: picked.pin,
          avatarColor: picked.avatarColor || '#f59e0b',
        };
      }
    }
  } catch {}
  return { name: 'Phúc Đẹp Trai', pin: '1234', avatarColor: '#f59e0b' };
}

function createProfileRecord(
  name: string,
  pin: string,
  avatarColor: string = '#f59e0b',
  initialShopState?: ShopState,
  welcomeMessage?: string
): ShopPlayerProfile {
  const now = Date.now();
  const state = initialShopState ? reconcileShopState(initialShopState) : createInitialShopState();
  return {
    id: `shop_user_${now.toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    name: name.trim(),
    pin: pin.trim(),
    avatarColor,
    createdAt: now,
    lastPlayedAt: now,
    shopState: state,
    history: [
      {
        id: `hist_init_${now.toString(36)}`,
        timestamp: now,
        category: 'system',
        title: 'Khởi Tạo Tài Khoản Tiệm Thẻ',
        amount: state.cash,
        detail:
          welcomeMessage ||
          `Chào mừng ${name.trim()} mở tiệm "${state.shopName}" với vốn khởi nghiệp $${state.cash.toLocaleString()}.`,
        isIncome: true,
      },
    ],
  };
}

export function validateProfileCredentials(
  name: string,
  pin: string
): { valid: boolean; error?: string; trimmedName: string; trimmedPin: string } {
  const trimmedName = name.trim();
  const trimmedPin = pin.trim();

  if (trimmedName.length < 2 || trimmedName.length > 24) {
    return {
      valid: false,
      error: 'Tên người chơi phải từ 2 đến 24 ký tự.',
      trimmedName,
      trimmedPin,
    };
  }

  if (trimmedPin.length < 4 || trimmedPin.length > 20 || /\s/.test(trimmedPin)) {
    return {
      valid: false,
      error: 'Mật khẩu / Mã PIN phải từ 4 đến 20 ký tự và không chứa khoảng trắng.',
      trimmedName,
      trimmedPin,
    };
  }

  return { valid: true, trimmedName, trimmedPin };
}

export class ShopProfileManager {
  private activeProfile: ShopPlayerProfile | null = null;
  private listeners: Array<(profile: ShopPlayerProfile) => void> = [];

  constructor() {
    this.loadActiveProfile();
  }

  public subscribe(cb: (profile: ShopPlayerProfile) => void): () => void {
    this.listeners.push(cb);
    if (this.activeProfile) {
      cb(this.activeProfile);
    }
    return () => {
      this.listeners = this.listeners.filter((l) => l !== cb);
    };
  }

  private notify() {
    if (!this.activeProfile) return;
    for (const cb of this.listeners) {
      cb(this.activeProfile);
    }
  }

  public getAllProfilesMap(): Record<string, ShopPlayerProfile> {
    const storage = getSafeStorage();
    let map: Record<string, ShopPlayerProfile> = {};
    if (storage) {
      try {
        const raw = storage.getItem(SHOP_PROFILES_DB_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object') {
            map = parsed;
          }
        }
      } catch {}
    }
    // Always guarantee dedicated VIP Tester account is registered & updated
    map[TEST_VIP_PROFILE_ID] = getOrCreateTestVipProfile(map[TEST_VIP_PROFILE_ID]);
    return map;
  }

  public getAllProfiles(): ShopPlayerProfile[] {
    return Object.values(this.getAllProfilesMap()).sort((a, b) => {
      // Put currently active profile first, then Tester VIP near top
      if (this.activeProfile?.id === a.id) return -1;
      if (this.activeProfile?.id === b.id) return 1;
      return b.lastPlayedAt - a.lastPlayedAt;
    });
  }

  public isTestVipActive(): boolean {
    return this.activeProfile?.id === TEST_VIP_PROFILE_ID;
  }

  public switchToTestVipProfile(): ShopPlayerProfile {
    const map = this.getAllProfilesMap();
    const vip = getOrCreateTestVipProfile(map[TEST_VIP_PROFILE_ID]);
    vip.lastPlayedAt = Date.now();
    map[TEST_VIP_PROFILE_ID] = vip;
    this.writeProfilesMap(map);
    this.activeProfile = vip;
    const storage = getSafeStorage();
    storage?.setItem(SHOP_ACTIVE_PROFILE_ID_KEY, TEST_VIP_PROFILE_ID);
    this.notify();
    return vip;
  }

  public refillTestVipProfile(): ShopPlayerProfile {
    const map = this.getAllProfilesMap();
    const freshVip = getOrCreateTestVipProfile();
    freshVip.shopState.cash = 1000000.0;
    freshVip.shopState.storeLevel = 27;
    freshVip.lastPlayedAt = Date.now();
    map[TEST_VIP_PROFILE_ID] = freshVip;
    this.writeProfilesMap(map);
    if (this.activeProfile?.id === TEST_VIP_PROFILE_ID) {
      this.activeProfile = freshVip;
    }
    this.notify();
    return freshVip;
  }

  public quickSwitchToProfile(profileId: string): ShopPlayerProfile | null {
    const map = this.getAllProfilesMap();
    const target = map[profileId];
    if (!target) return null;
    target.lastPlayedAt = Date.now();
    map[profileId] = target;
    this.writeProfilesMap(map);
    this.activeProfile = target;
    const storage = getSafeStorage();
    storage?.setItem(SHOP_ACTIVE_PROFILE_ID_KEY, profileId);
    this.notify();
    return target;
  }

  private writeProfilesMap(map: Record<string, ShopPlayerProfile>) {
    const storage = getSafeStorage();
    if (!storage) return;
    try {
      storage.setItem(SHOP_PROFILES_DB_KEY, JSON.stringify(map));
    } catch (e) {
      console.error('Failed to persist shop profiles DB', e);
    }
  }

  public loadActiveProfile(): ShopPlayerProfile {
    const storage = getSafeStorage();
    const allProfiles = this.getAllProfilesMap();
    const activeId = storage?.getItem(SHOP_ACTIVE_PROFILE_ID_KEY);

    if (activeId && allProfiles[activeId]) {
      const prof: ShopPlayerProfile = {
        ...allProfiles[activeId],
        shopState: reconcileShopState(allProfiles[activeId].shopState),
        history: Array.isArray(allProfiles[activeId].history) ? allProfiles[activeId].history : [],
      };
      this.activeProfile = prof;
      return prof;
    }

    // Default to first custom user account if present, otherwise Tester VIP
    const nonTestIds = Object.keys(allProfiles).filter((id) => id !== TEST_VIP_PROFILE_ID);
    if (nonTestIds.length > 0) {
      const first = allProfiles[nonTestIds[0]];
      const prof: ShopPlayerProfile = {
        ...first,
        shopState: reconcileShopState(first.shopState),
        history: Array.isArray(first.history) ? first.history : [],
      };
      this.activeProfile = prof;
      storage?.setItem(SHOP_ACTIVE_PROFILE_ID_KEY, prof.id);
      return prof;
    }

    // First-time bootstrap: migrate legacy single-shop save if present, and seed name/PIN from Casino if available
    const seedIdentity = readCasinoSeedIdentity();
    let migratedShopState: ShopState | undefined;
    let welcomeMsg: string | undefined;

    if (storage) {
      try {
        const legacyRaw = storage.getItem(LEGACY_SHOP_STORAGE_KEY);
        if (legacyRaw) {
          migratedShopState = reconcileShopState(JSON.parse(legacyRaw));
          welcomeMsg = `Đã đồng bộ dữ liệu tiệm "${migratedShopState.shopName}" vào tài khoản ${seedIdentity.name}.`;
        }
      } catch {}
    }

    const defaultProf = createProfileRecord(
      seedIdentity.name,
      seedIdentity.pin,
      seedIdentity.avatarColor,
      migratedShopState,
      welcomeMsg
    );

    this.saveProfile(defaultProf, true);
    this.activeProfile = defaultProf;
    return defaultProf;
  }

  public getActiveProfile(): ShopPlayerProfile {
    if (!this.activeProfile) {
      return this.loadActiveProfile();
    }
    return this.activeProfile;
  }

  public saveProfile(profile: ShopPlayerProfile, setActive: boolean = false) {
    const storage = getSafeStorage();
    const all = this.getAllProfilesMap();
    all[profile.id] = profile;
    this.writeProfilesMap(all);

    if (setActive || this.activeProfile?.id === profile.id) {
      this.activeProfile = profile;
      storage?.setItem(SHOP_ACTIVE_PROFILE_ID_KEY, profile.id);
      try {
        storage?.setItem(LEGACY_SHOP_STORAGE_KEY, JSON.stringify(profile.shopState));
      } catch {}
      this.notify();
    }
  }

  public saveActiveShopState(shopState: ShopState) {
    const prof = this.getActiveProfile();
    const updated: ShopPlayerProfile = {
      ...prof,
      lastPlayedAt: Date.now(),
      shopState,
    };
    this.saveProfile(updated, true);
  }

  public updateCredentials(
    name: string,
    pin: string,
    shopName?: string,
    avatarColor?: string
  ): { success: boolean; error?: string; profile?: ShopPlayerProfile } {
    const check = validateProfileCredentials(name, pin);
    if (!check.valid) {
      return { success: false, error: check.error };
    }

    const prof = this.getActiveProfile();
    const all = this.getAllProfilesMap();
    const duplicate = Object.values(all).find(
      (p) => p.id !== prof.id && p.name.toLowerCase() === check.trimmedName.toLowerCase()
    );
    if (duplicate) {
      return {
        success: false,
        error: `Tên "${check.trimmedName}" đã thuộc về tài khoản khác trong database.`,
      };
    }

    const trimmedShopName = shopName?.trim();
    const updatedShopState =
      trimmedShopName && trimmedShopName.length >= 2
        ? { ...prof.shopState, shopName: trimmedShopName }
        : prof.shopState;

    const updated: ShopPlayerProfile = {
      ...prof,
      name: check.trimmedName,
      pin: check.trimmedPin,
      avatarColor: avatarColor || prof.avatarColor,
      lastPlayedAt: Date.now(),
      shopState: updatedShopState,
    };

    this.saveProfile(updated, true);
    return { success: true, profile: updated };
  }

  public loginOrRegister(
    name: string,
    pin: string,
    mode: 'auto' | 'login' | 'register' = 'auto'
  ): { success: boolean; message: string; isNew?: boolean; profile?: ShopPlayerProfile } {
    const check = validateProfileCredentials(name, pin);
    if (!check.valid) {
      return { success: false, message: check.error || 'Thông tin không hợp lệ.' };
    }

    const all = this.getAllProfilesMap();
    const existing = Object.values(all).find(
      (p) => p.name.toLowerCase() === check.trimmedName.toLowerCase()
    );

    if (existing) {
      if (mode === 'register') {
        return {
          success: false,
          message: `Tên người chơi "${existing.name}" đã tồn tại! Hãy chuyển sang đăng nhập hoặc chọn tên khác.`,
        };
      }
      if (existing.pin !== check.trimmedPin) {
        return {
          success: false,
          message: 'Mật khẩu / Mã PIN không chính xác cho tài khoản này!',
        };
      }

      const hydrated: ShopPlayerProfile = {
        ...existing,
        lastPlayedAt: Date.now(),
        shopState: reconcileShopState(existing.shopState),
        history: Array.isArray(existing.history) ? existing.history : [],
      };
      this.saveProfile(hydrated, true);
      return {
        success: true,
        isNew: false,
        message: `Đăng nhập thành công! Chào mừng ${hydrated.name} quay lại tiệm "${hydrated.shopState.shopName}".`,
        profile: hydrated,
      };
    }

    if (mode === 'login') {
      return {
        success: false,
        message: `Không tìm thấy tài khoản "${check.trimmedName}" trong database.`,
      };
    }

    const randomColor = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
    const freshShop = createInitialShopState();
    freshShop.shopName = `Tiệm Thẻ ${check.trimmedName}`;
    const newProfile = createProfileRecord(check.trimmedName, check.trimmedPin, randomColor, freshShop);
    this.saveProfile(newProfile, true);

    return {
      success: true,
      isNew: true,
      message: `Tạo tài khoản mới thành công! Chào mừng ${newProfile.name} khởi nghiệp với $${freshShop.cash.toLocaleString()}.`,
      profile: newProfile,
    };
  }

  public recordHistory(entry: Omit<ShopHistoryEntry, 'id' | 'timestamp'>) {
    const prof = this.getActiveProfile();
    const newEntry: ShopHistoryEntry = {
      id: `sh_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`,
      timestamp: Date.now(),
      ...entry,
    };

    const updated: ShopPlayerProfile = {
      ...prof,
      lastPlayedAt: Date.now(),
      history: [newEntry, ...prof.history.slice(0, 59)],
    };
    this.saveProfile(updated, true);
  }

  public resetActiveProfileShop(): ShopPlayerProfile {
    const prof = this.getActiveProfile();
    const freshState = createInitialShopState();
    freshState.shopName = prof.shopState?.shopName || freshState.shopName;

    const resetEntry: ShopHistoryEntry = {
      id: `sh_reset_${Date.now().toString(36)}`,
      timestamp: Date.now(),
      category: 'system',
      title: 'Khởi Lại Tiến Trình Tiệm',
      amount: freshState.cash,
      detail: `Đã đặt lại tiệm "${freshState.shopName}" về Ngày 1 với $${freshState.cash.toLocaleString()}.`,
      isIncome: true,
    };

    const updated: ShopPlayerProfile = {
      ...prof,
      lastPlayedAt: Date.now(),
      shopState: freshState,
      history: [resetEntry, ...prof.history.slice(0, 59)],
    };

    this.saveProfile(updated, true);
    return updated;
  }

  public deleteProfile(profileId: string): { success: boolean; error?: string } {
    if (profileId === TEST_VIP_PROFILE_ID) {
      return { success: false, error: 'Không thể xóa tài khoản hệ thống Tester VIP.' };
    }
    const active = this.getActiveProfile();
    if (active.id === profileId) {
      return { success: false, error: 'Không thể xóa tài khoản đang đăng nhập.' };
    }
    const all = this.getAllProfilesMap();
    if (!all[profileId]) {
      return { success: false, error: 'Tài khoản không tồn tại.' };
    }
    delete all[profileId];
    this.writeProfilesMap(all);
    return { success: true };
  }
}

export const shopProfileManager = new ShopProfileManager();
