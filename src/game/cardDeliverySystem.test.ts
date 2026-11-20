import test from 'node:test';
import assert from 'node:assert/strict';
import {
  acceptDeliveryOrder,
  canAcceptDeliveryOrder,
  cancelActiveDeliveryMission,
  claimDailyTaskReward,
  completeCurrentDeliveryStop,
  createInitialDailyStats,
  createInitialDeliveryState,
  DELIVERY_DROP_LOCATIONS,
  DeliveryOrder,
  generateDeliveryOrders,
  getActiveDeliveryStop,
  getDailyTaskProgressList,
} from './cardDeliverySystem';
import {
  createInitialShopState,
  POKEMON_CARDS_DB,
  ShopState,
} from './pokemonShopLogic';

function makeStockedShopState(): ShopState {
  const base = createInitialShopState();
  const sampleCard = POKEMON_CARDS_DB[0];
  return {
    ...base,
    storeLevel: 3,
    currentDay: 2,
    inventory: [
      {
        id: 'inv_sv01_pack',
        productId: 'sv01_pack',
        name: 'Scarlet & Violet Booster Pack',
        type: 'pack',
        quantity: 6,
        shelvedQuantity: 0,
        wholesaleCost: 2.5,
        retailPrice: 5.0,
        themeColor: '#ef4444',
      },
      {
        id: 'inv_sv01_box',
        productId: 'sv01_box',
        name: 'Scarlet & Violet Booster Box',
        type: 'box',
        quantity: 2,
        shelvedQuantity: 0,
        wholesaleCost: 28,
        retailPrice: 45,
        themeColor: '#ef4444',
      },
    ],
    binderCards: {
      [sampleCard.id]: 2,
    },
    gradedSlabs: [
      {
        id: 'slab_test_1',
        card: sampleCard,
        slab: {
          company: 'PSA',
          grade: 10,
          certNumber: 'PSA-999001',
          gradeLabel: 'GEM MT 10',
          year: 2026,
        },
        rawPrice: 80,
        gradedPrice: 220,
        gradedAt: Date.now(),
      },
    ],
  };
}

test('generateDeliveryOrders produces all 4 categories and blocks accepting orders when shop has no stock', () => {
  const emptyState: ShopState = {
    ...createInitialShopState(),
    inventory: [],
    binderCards: {},
    gradedSlabs: [],
  };

  const orders = generateDeliveryOrders(emptyState, 1);
  assert.ok(orders.length >= 4);

  const categories = new Set(orders.map((o) => o.category));
  assert.ok(categories.has('pack_box'));
  assert.ok(categories.has('vip_sniper'));
  assert.ok(categories.has('rush_mystery'));
  assert.ok(categories.has('multi_route'));

  const validPoiIds = new Set(DELIVERY_DROP_LOCATIONS.map((l) => l.poiId));
  for (const order of orders) {
    assert.ok(order.stops.length >= 1);
    assert.ok(order.totalDistanceMeters > 0);
    // Empty warehouse must NOT be allowed to accept/ship orders
    const check = canAcceptDeliveryOrder(emptyState, order);
    assert.equal(check.ok, false);
    const acceptRes = acceptDeliveryOrder(emptyState, order, 1000);
    assert.equal(acceptRes.accepted, false);

    for (const stop of order.stops) {
      assert.ok(validPoiIds.has(stop.poiId));
      assert.ok(stop.cargo.source === 'shop_inventory' || stop.cargo.source === 'binder_card');
      assert.ok(Number.isFinite(stop.x) && Number.isFinite(stop.z));
      assert.ok(stop.deliveryFee > 0);
    }
  }
});

test('acceptDeliveryOrder deducts inventory/binder/slab and cancelActiveDeliveryMission refunds them cleanly', () => {
  const sampleCard = POKEMON_CARDS_DB[0];
  let state = makeStockedShopState();
  state = {
    ...state,
    deliveryState: createInitialDeliveryState(state),
  };

  const customMultiOrder: DeliveryOrder = {
    id: 'ord_test_multi',
    code: 'TOUR-777',
    category: 'multi_route',
    title: 'Đơn test 2 điểm',
    subtitle: 'Test deduction and refund',
    stops: [
      {
        stopId: 'st_1',
        poiId: 'poi_starbucks',
        locationName: 'Starbucks Coffee',
        districtName: 'Đại Lộ Trung Tâm',
        recipientName: 'Minh Anh',
        recipientAvatarColor: '#f59e0b',
        note: 'Giao ngay',
        x: -21,
        z: 18.2,
        cargo: {
          source: 'shop_inventory',
          productId: 'sv01_pack',
          label: '2x Booster Pack',
          itemType: 'pack',
          quantity: 2,
          itemValue: 11.2,
          wholesaleCost: 5,
        },
        deliveryFee: 18,
        tipBonus: 5,
        expReward: 10,
      },
      {
        stopId: 'st_2',
        poiId: 'poi_dior',
        locationName: 'DIOR Flagship Boutique',
        districtName: 'Ngã Tư DIOR',
        recipientName: 'Bảo Ngọc',
        recipientAvatarColor: '#a855f7',
        note: 'Giao VIP',
        x: 474.6,
        z: 18.2,
        cargo: {
          source: 'graded_slab',
          slabId: 'slab_test_1',
          cardId: sampleCard.id,
          label: 'Slab PSA 10',
          itemType: 'slab',
          quantity: 1,
          itemValue: 300,
          wholesaleCost: 10,
          slabSnapshot: (state.gradedSlabs ?? [])[0],
        },
        deliveryFee: 25,
        tipBonus: 8,
        expReward: 14,
      },
    ],
    totalDistanceMeters: 500,
    baseFee: 43,
    rushBonusFee: 16,
    itemPayout: 311.2,
    tipBonus: 13,
    expReward: 32,
    reputationBonus: 2,
    timeLimitSec: null,
    createdAtMs: 1000,
    minLevel: 1,
  };

  assert.equal(canAcceptDeliveryOrder(state, customMultiOrder).ok, true);
  const acceptRes = acceptDeliveryOrder(state, customMultiOrder, 10_000);
  assert.equal(acceptRes.accepted, true);
  state = acceptRes.nextState;

  // Verify upfront stock deduction
  assert.equal(state.inventory.find((i) => i.productId === 'sv01_pack')?.quantity, 4);
  assert.equal((state.gradedSlabs ?? []).length, 0);
  assert.ok(state.deliveryState?.activeMission);
  assert.equal(getActiveDeliveryStop(state)?.stopId, 'st_1');

  // Cannot accept a second mission concurrently
  const secondCheck = canAcceptDeliveryOrder(state, state.deliveryState!.availableOrders[0]);
  assert.equal(secondCheck.ok, false);

  // Simulate completing stop 0 before cancelling before stop 1
  const midSummary = completeCurrentDeliveryStop(state, 15_000);
  assert.equal(midSummary.missionFinished, false);
  state = midSummary.nextState;
  assert.equal(state.deliveryState?.activeMission?.currentStopIndex, 1);
  assert.equal(getActiveDeliveryStop(state)?.stopId, 'st_2');

  // Cancel mid-way: only stop_2 (graded_slab) should be refunded, not stop_1 (2 packs already delivered)
  const cancelRes = cancelActiveDeliveryMission({
    ...state,
    deliveryState: { ...state.deliveryState!, streak: 4 },
  });
  assert.equal(cancelRes.refundedCount, 1);
  assert.equal(cancelRes.nextState.deliveryState?.activeMission, null);
  assert.equal(cancelRes.nextState.deliveryState?.streak, 0);
  assert.equal(cancelRes.nextState.inventory.find((i) => i.productId === 'sv01_pack')?.quantity, 4);
  assert.equal((cancelRes.nextState.gradedSlabs ?? []).length, 1);
  assert.equal((cancelRes.nextState.gradedSlabs ?? [])[0].id, 'slab_test_1');
});

test('completeCurrentDeliveryStop handles on-time vs late rush bonuses and multi-stop completion', () => {
  let state = makeStockedShopState();
  state = {
    ...state,
    cash: 100,
    deliveryState: createInitialDeliveryState(state),
  };

  const rushOrder: DeliveryOrder = {
    id: 'ord_rush_test',
    code: 'FAST-111',
    category: 'rush_mystery',
    title: 'Hỏa tốc 60s',
    subtitle: 'Test timer',
    stops: [
      {
        stopId: 'st_rush',
        poiId: 'poi_starbucks',
        locationName: 'Starbucks Coffee',
        districtName: 'Đại Lộ Trung Tâm',
        recipientName: 'Khánh Vy',
        recipientAvatarColor: '#38bdf8',
        note: 'Nhanh nha',
        x: -21,
        z: 18.2,
        cargo: {
          source: 'shop_inventory',
          productId: 'sv01_pack',
          label: '1x Scarlet & Violet Booster Pack',
          itemType: 'pack',
          quantity: 1,
          itemValue: 0,
          wholesaleCost: 0,
        },
        deliveryFee: 20,
        tipBonus: 10,
        expReward: 12,
      },
    ],
    totalDistanceMeters: 80,
    baseFee: 20,
    rushBonusFee: 15,
    itemPayout: 0,
    tipBonus: 10,
    expReward: 20,
    reputationBonus: 2,
    timeLimitSec: 60,
    createdAtMs: 1000,
    minLevel: 1,
  };

  // On-time rush completion
  const onTimeAccept = acceptDeliveryOrder(state, rushOrder, 10_000);
  const onTimeRes = completeCurrentDeliveryStop(onTimeAccept.nextState, 50_000); // 40s <= 60s
  assert.equal(onTimeRes.missionFinished, true);
  assert.equal(onTimeRes.wasOnTime, true);
  assert.equal(onTimeRes.tipEarned, 10);
  assert.equal(onTimeRes.bonusEarned, 15);
  assert.equal(onTimeRes.cashEarned, 45); // 20 + 10 + 15
  assert.equal(onTimeRes.nextState.cash, 145);
  assert.equal(onTimeRes.nextState.deliveryState?.streak, 1);
  assert.equal(onTimeRes.nextState.deliveryState?.dailyStats.deliveriesCompleted, 1);
  assert.equal(onTimeRes.nextState.deliveryState?.dailyStats.rushCompleted, 1);

  // Late rush completion
  const lateAccept = acceptDeliveryOrder(state, rushOrder, 10_000);
  const lateRes = completeCurrentDeliveryStop(lateAccept.nextState, 90_000); // 80s > 60s
  assert.equal(lateRes.missionFinished, true);
  assert.equal(lateRes.wasOnTime, false);
  assert.equal(lateRes.tipEarned, 4); // 40% of 10
  assert.equal(lateRes.bonusEarned, 0);
  assert.equal(lateRes.cashEarned, 24); // 20 + 4
  assert.equal(lateRes.nextState.deliveryState?.streak, 0);
  assert.equal(lateRes.nextState.deliveryState?.dailyStats.rushCompleted, 0);
});

test('getDailyTaskProgressList and claimDailyTaskReward track metrics and enforce idempotent claims', () => {
  const base = createInitialShopState();
  const dailyStats = {
    ...createInitialDailyStats(base.currentDay),
    deliveriesCompleted: 3,
    rushCompleted: 1,
    vipCompleted: 0,
  };

  let state: ShopState = {
    ...base,
    cash: 500,
    todayStats: {
      revenue: 350,
      profit: 120,
      customersServed: 6,
      itemsSold: 10,
    },
    deliveryState: {
      ...createInitialDeliveryState(base),
      dailyStats,
    },
  };

  const progress = getDailyTaskProgressList(state);
  const deliver1 = progress.find((t) => t.id === 'dt_deliver_1')!;
  const deliver3 = progress.find((t) => t.id === 'dt_deliver_3')!;
  const vip1 = progress.find((t) => t.id === 'dt_vip_1')!;
  const customers5 = progress.find((t) => t.id === 'dt_customers_5')!;
  const revenue300 = progress.find((t) => t.id === 'dt_revenue_300')!;

  assert.equal(deliver1.completed, true);
  assert.equal(deliver3.completed, true);
  assert.equal(vip1.completed, false);
  assert.equal(customers5.completed, true);
  assert.equal(revenue300.completed, true);

  // Uncompleted task cannot be claimed
  const failClaim = claimDailyTaskReward(state, 'dt_vip_1');
  assert.equal(failClaim.claimed, false);
  assert.equal(failClaim.rewardCash, 0);

  // Completed task pays cash & EXP once
  const firstClaim = claimDailyTaskReward(state, 'dt_deliver_1');
  assert.equal(firstClaim.claimed, true);
  assert.equal(firstClaim.rewardCash, deliver1.rewardCash);
  assert.equal(firstClaim.rewardExp, deliver1.rewardExp);
  state = firstClaim.nextState;
  assert.equal(state.cash, 500 + deliver1.rewardCash);

  // Duplicate claim is blocked
  const secondClaim = claimDailyTaskReward(state, 'dt_deliver_1');
  assert.equal(secondClaim.claimed, false);
  assert.equal(secondClaim.rewardCash, 0);
  assert.equal(secondClaim.nextState.cash, 500 + deliver1.rewardCash);
});
