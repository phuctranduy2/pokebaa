import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ShopProfileManager,
  SHOP_PROFILES_DB_KEY,
  SHOP_ACTIVE_PROFILE_ID_KEY,
  LEGACY_SHOP_STORAGE_KEY,
  validateProfileCredentials,
} from './shopProfileManager';
import { createInitialShopState } from './pokemonShopLogic';

function createMockStorage(): Storage {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, String(value));
    },
  };
}

test('ShopProfileManager: validates player name and password/PIN rules', () => {
  assert.equal(validateProfileCredentials('A', '1234').valid, false);
  assert.equal(validateProfileCredentials('Minh', '123').valid, false);
  assert.equal(validateProfileCredentials('Minh', 'ab cd').valid, false);
  assert.equal(validateProfileCredentials('Minh', '1234').valid, true);
  assert.equal(validateProfileCredentials('Ash Ketchum', 'Pika2026!').valid, true);
});

test('ShopProfileManager: migrates legacy single-shop save into default player account', () => {
  const mockStorage = createMockStorage();
  const legacyState = createInitialShopState();
  legacyState.shopName = 'Tiệm Huyền Thoại';
  legacyState.cash = 8888;
  legacyState.storeLevel = 4;
  mockStorage.setItem(LEGACY_SHOP_STORAGE_KEY, JSON.stringify(legacyState));

  (globalThis as any).localStorage = mockStorage;
  const manager = new ShopProfileManager();
  const active = manager.getActiveProfile();

  assert.equal(active.shopState.shopName, 'Tiệm Huyền Thoại');
  assert.equal(active.shopState.cash, 8888);
  assert.equal(active.shopState.storeLevel, 4);
  assert.ok(mockStorage.getItem(SHOP_PROFILES_DB_KEY));
  assert.equal(mockStorage.getItem(SHOP_ACTIVE_PROFILE_ID_KEY), active.id);
});

test('ShopProfileManager: multi-user registration, password verification, and isolated shop database', () => {
  const mockStorage = createMockStorage();
  (globalThis as any).localStorage = mockStorage;
  const manager = new ShopProfileManager();

  // Default user updates credentials and cash
  const defaultProf = manager.getActiveProfile();
  const credRes = manager.updateCredentials('Chủ Tiệm 1', 'pass1234', 'PokeVault Pro');
  assert.equal(credRes.success, true);

  const updatedState1 = { ...manager.getActiveProfile().shopState, cash: 5400, storeLevel: 3 };
  manager.saveActiveShopState(updatedState1);

  // Register a second player in the database
  const regRes = manager.loginOrRegister('Red Trainer', 'charizard99', 'auto');
  assert.equal(regRes.success, true);
  assert.equal(regRes.isNew, true);
  assert.equal(manager.getActiveProfile().name, 'Red Trainer');
  assert.equal(manager.getActiveProfile().shopState.cash, 2500);
  assert.equal(manager.getActiveProfile().shopState.storeLevel, 1);

  // Modify second player's shop cash
  const updatedState2 = { ...manager.getActiveProfile().shopState, cash: 1200 };
  manager.saveActiveShopState(updatedState2);

  // Reject wrong password when logging back into first player
  const badLogin = manager.loginOrRegister('Chủ Tiệm 1', 'wrongpass', 'auto');
  assert.equal(badLogin.success, false);
  assert.equal(manager.getActiveProfile().name, 'Red Trainer');

  // Accept right password and restore first player's exact ShopState from database
  const goodLogin = manager.loginOrRegister('Chủ Tiệm 1', 'pass1234', 'auto');
  assert.equal(goodLogin.success, true);
  assert.equal(goodLogin.isNew, false);
  assert.equal(manager.getActiveProfile().id, defaultProf.id);
  assert.equal(manager.getActiveProfile().shopState.cash, 5400);
  assert.equal(manager.getActiveProfile().shopState.storeLevel, 3);
  assert.equal(manager.getActiveProfile().shopState.shopName, 'PokeVault Pro');

  // Verify both profiles remain in DB (+ 1 guaranteed VIP Tester account)
  assert.equal(manager.getAllProfiles().length, 3);
});

test('ShopProfileManager: records shop history and resets only active player progress', () => {
  const mockStorage = createMockStorage();
  (globalThis as any).localStorage = mockStorage;
  const manager = new ShopProfileManager();

  manager.loginOrRegister('Player Two', '2222', 'auto');
  manager.saveActiveShopState({ ...manager.getActiveProfile().shopState, cash: 9999 });

  manager.loginOrRegister('Phúc Đẹp Trai', '1234', 'auto');
  manager.recordHistory({
    category: 'sale',
    title: 'POS Checkout',
    amount: 45,
    detail: 'Sold 2 packs',
    isIncome: true,
  });
  assert.equal(manager.getActiveProfile().history[0].title, 'POS Checkout');

  manager.saveActiveShopState({ ...manager.getActiveProfile().shopState, cash: 100 });
  const resetProf = manager.resetActiveProfileShop();
  assert.equal(resetProf.shopState.cash, 2500);
  assert.equal(resetProf.name, 'Phúc Đẹp Trai');

  // Ensure Player Two's database entry is untouched
  manager.loginOrRegister('Player Two', '2222', 'auto');
  assert.equal(manager.getActiveProfile().shopState.cash, 9999);
});

test('ShopProfileManager: defaults and persists unlockedShelves per player profile', () => {
  const mockStorage = createMockStorage();
  const legacyWithoutShelves = createInitialShopState() as any;
  delete legacyWithoutShelves.unlockedShelves;
  mockStorage.setItem(LEGACY_SHOP_STORAGE_KEY, JSON.stringify(legacyWithoutShelves));

  (globalThis as any).localStorage = mockStorage;
  const manager = new ShopProfileManager();
  const active = manager.getActiveProfile();
  assert.deepEqual(active.shopState.unlockedShelves, ['shelf_wall_bay_1', 'shelf_card_1', 'op_shelf_wall_bay_1', 'op_shelf_card_1']);

  manager.saveActiveShopState({
    ...active.shopState,
    unlockedShelves: ['shelf_wall_bay_1', 'shelf_card_1', 'op_shelf_wall_bay_1', 'op_shelf_card_1', 'shelf_wall_bay_2'],
  });
  const reloaded = new ShopProfileManager();
  assert.deepEqual(reloaded.getActiveProfile().shopState.unlockedShelves, [
    'shelf_wall_bay_1',
    'shelf_card_1',
    'op_shelf_wall_bay_1',
    'op_shelf_card_1',
    'shelf_wall_bay_2',
  ]);
});
