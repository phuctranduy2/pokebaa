import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ALL_UNIQUE_BOOSTER_SETS,
  GradingJob,
  LIVE_STUDIO_BUILD_COST,
  LIVE_STUDIO_BUILD_LEVEL,
  ONEPIECE_CARDS_DB,
  OwnedGradedSlabEntry,
  POKEMON_CARDS_DB,
  advanceGradingQueue,
  crackAndRegradeSlab,
  createInitialShopState,
  getBoosterSetCards,
  getSlabMarketValuation,
  getStaffUnlockLevel,
  settleSlabAuction,
  startSlabAuction,
} from './pokemonShopLogic';
import { CITY_POIS } from './cityMapData';
import {
  COUNTERFEIT_SCAN_FEE,
  FAKE_REPORT_BOUNTY,
  LUXURY_ASSETS_CATALOG,
  MARKET_PULSE_CATALOG,
  RESTORE_CARD_FEE,
  SATELLITE_KIOSK_CATALOG,
  TOURNAMENT_TIERS,
  TournamentTrophy,
  advanceTournamentRound,
  attemptCityHuntHaggle,
  buildLivePackOrderQueue,
  checkLiveBreakPrerequisites,
  computeAllMasterSetProgress,
  consumeLiveBoxFromInventory,
  createInitialKiosksState,
  createInitialLiveStreamRuntime,
  createLiveStreamSlots,
  createTournamentBracket,
  executeLiveBoxBreak,
  executeSinglePackLiveRip,
  generateCityHuntSpots,
  getLiveBreakSlotPriceBounds,
  getLuxuryAssetBuffs,
  getMarketPulseMultiplierForCard,
  getMasterSetMilestoneKey,
  getMasterSetMilestoneReward,
  getMasterSetWholesaleDiscount,
  getOwnedLiveBoosterBoxes,
  getSlotAssignedPackNumbers,
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
} from './shopExpansionSystems';

function makeDeterministicRng(values: number[]): () => number {
  let idx = 0;
  return () => {
    const val = values[idx % values.length];
    idx += 1;
    return val;
  };
}

test('1. Live Tournament Circuit & Trophies: bracket progression, champion payout, bonus slab, and trophy caps', () => {
  const sampleCards = POKEMON_CARDS_DB.slice(0, 3).map((card) => ({
    card,
    slabGrade: 10,
  }));

  const bracket = createTournamentBracket({
    format: 'pokemon',
    tier: 'regional',
    playerDeckCards: sampleCards,
    rng: makeDeterministicRng([0.1, 0.2, 0.3, 0.4, 0.5]),
  });

  assert.equal(bracket.matches.length, 4);
  assert.equal(bracket.currentRound, 1);
  assert.equal(bracket.entryFee, TOURNAMENT_TIERS.regional.entryFee);
  assert.equal(
    bracket.totalPrizePool,
    TOURNAMENT_TIERS.regional.entryFee * 8 + TOURNAMENT_TIERS.regional.prizePoolBonus
  );
  assert.ok(bracket.matches.some((m) => m.playerA.isPlayer || m.playerB.isPlayer));

  // Force player wins every round (low rng roll < winProbA when playerA or winProb)
  const r1 = advanceTournamentRound(bracket, () => 0.01);
  assert.equal(r1.completed, false);
  assert.equal(r1.nextBracket.currentRound, 2);
  assert.equal(r1.nextBracket.matches.filter((m) => m.round === 2).length, 2);

  const r2 = advanceTournamentRound(r1.nextBracket, () => 0.01);
  assert.equal(r2.completed, false);
  assert.equal(r2.nextBracket.currentRound, 3);
  assert.equal(r2.nextBracket.matches.filter((m) => m.round === 3).length, 1);

  const r3 = advanceTournamentRound(r2.nextBracket, () => 0.01);
  assert.equal(r3.completed, true);
  assert.equal(r3.nextBracket.currentRound, 4);
  assert.equal(r3.playerIsChampion, true);
  assert.equal(r3.payout, bracket.totalPrizePool);
  assert.ok(r3.trophy);
  assert.equal(r3.trophy?.tier, 'regional');

  // Bonus pack & slab reward
  const localBonus = rollTournamentBonusReward({
    format: 'pokemon',
    tier: 'local',
    rng: () => 0.2,
  });
  assert.equal(localBonus.bonusPackCount, 2);
  assert.equal(localBonus.bonusSlab, undefined);

  const gpBonus = rollTournamentBonusReward({
    format: 'onepiece',
    tier: 'grand_prix',
    rng: () => 0.25,
  });
  assert.equal(gpBonus.bonusPackCount, 5);
  assert.equal(gpBonus.bonusPackProductId, 'op09Emperors_pack');
  assert.ok(gpBonus.bonusSlab);
  assert.equal(gpBonus.bonusSlab?.slab.company, 'BGS');
  assert.equal(gpBonus.bonusSlab?.slab.grade, 10);
  assert.equal(typeof gpBonus.bonusSlab?.slab.year, 'number');
  assert.ok((gpBonus.bonusSlab?.slab.year || 0) >= 2024);

  // Trophy buff caps (max +15 Rep, max +60% rental)
  const manyTrophies: TournamentTrophy[] = Array.from({ length: 12 }, (_, idx) => ({
    id: `t_${idx}`,
    title: `Trophy ${idx}`,
    format: 'pokemon',
    tier: 'local',
    prizeWon: 200,
    color: '#fbbf24',
    wonAt: Date.now(),
  }));
  const cappedBuffs = getTrophyBuffs(manyTrophies);
  assert.equal(cappedBuffs.reputationBonus, 15);
  assert.equal(cappedBuffs.tableRentalBonusPct, 60);
});

test('2. TCG Market Pulse: daily rolls and multiplier matching across Pokémon, One Piece, Grails, and Slab 10', () => {
  const pulsesDay3 = rollDailyMarketPulses(3);
  assert.equal(pulsesDay3.length, 2);
  assert.notEqual(pulsesDay3[0].id, pulsesDay3[1].id);

  const seededPulses = rollDailyMarketPulses(1, makeDeterministicRng([0.0, 0.5]));
  assert.equal(seededPulses.length, 2);

  const opPulse = MARKET_PULSE_CATALOG.find((p) => p.target === 'onepiece_all')!;
  const grailPulse = MARKET_PULSE_CATALOG.find((p) => p.target === 'crown_star3')!;
  const slab10Pulse = MARKET_PULSE_CATALOG.find((p) => p.target === 'bgs_psa10')!;
  const set30Pulse = MARKET_PULSE_CATALOG.find((p) => p.target === 'pokemon_30th')!;
  const set151Pulse = MARKET_PULSE_CATALOG.find((p) => p.target === 'pokemon_151')!;
  const dipPulse = MARKET_PULSE_CATALOG.find((p) => p.target === 'vintage_dip')!;

  const opCard = ONEPIECE_CARDS_DB[0];
  assert.equal(getMarketPulseMultiplierForCard(opCard, [opPulse]).multiplier, opPulse.multiplier);

  const crownCard = POKEMON_CARDS_DB.find((c) => c.pocketRarity === 'Crown')!;
  assert.equal(getMarketPulseMultiplierForCard(crownCard, [grailPulse]).multiplier, grailPulse.multiplier);

  const commonCard = POKEMON_CARDS_DB.find((c) => c.pocketRarity === 'Diamond1') || POKEMON_CARDS_DB[0];
  const slab10Match = getMarketPulseMultiplierForCard(commonCard, [slab10Pulse], {
    company: 'PSA',
    grade: 10,
    gradeLabel: 'GEM MT 10',
    certNumber: '88888777',
    year: 2026,
  });
  assert.equal(slab10Match.multiplier, slab10Pulse.multiplier);

  const card30 = { ...commonCard, setName: 'Pokemon 30th Anniversary' };
  assert.equal(getMarketPulseMultiplierForCard(card30, [set30Pulse]).multiplier, set30Pulse.multiplier);

  const card151 = { ...commonCard, setName: 'Scarlet & Violet 151' };
  assert.equal(getMarketPulseMultiplierForCard(card151, [set151Pulse]).multiplier, set151Pulse.multiplier);

  assert.equal(getMarketPulseMultiplierForCard(commonCard, [dipPulse]).multiplier, dipPulse.multiplier);
});

test('3. Card Restoration, Counterfeit Scanner & Slab Valuation / Crossover risk reduction', () => {
  const fakeScan = scanCardCounterfeitCheck({ isCounterfeit: true });
  assert.equal(fakeScan.feePaid, COUNTERFEIT_SCAN_FEE);
  assert.equal(fakeScan.isFake, true);
  assert.equal(fakeScan.bountyEligible, FAKE_REPORT_BOUNTY);

  const genuineScan = scanCardCounterfeitCheck({ isCounterfeit: false });
  assert.equal(genuineScan.isFake, false);
  assert.equal(genuineScan.bountyEligible, 0);

  const card = POKEMON_CARDS_DB[0];
  const step1 = restoreCardCondition({
    card,
    currentCondition: 'MP',
    currentRawPrice: 100,
    preGradeBonus: 0,
  });
  assert.equal(step1.feePaid, RESTORE_CARD_FEE);
  assert.equal(step1.nextCondition, 'LP');
  assert.equal(step1.nextRawPrice, 122);
  assert.equal(step1.nextPreGradeBonus, 0.04);

  const step2 = restoreCardCondition({
    card,
    currentCondition: step1.nextCondition,
    currentRawPrice: step1.nextRawPrice,
    preGradeBonus: 0.14,
  });
  assert.equal(step2.nextCondition, 'NM');
  assert.equal(step2.nextPreGradeBonus, 0.16); // capped at 0.16

  const step3 = restoreCardCondition({
    card,
    currentCondition: 'NM',
    currentRawPrice: 150,
    preGradeBonus: 0.08,
  });
  assert.equal(step3.nextCondition, 'MINT');

  // Backwards-compatible valuation with marketPulseMultiplier & grailBonusPct
  const grailCard = POKEMON_CARDS_DB.find((c) => c.pocketRarity === 'Star3') || card;
  const baseVal = getSlabMarketValuation(
    grailCard,
    {
      company: 'BGS',
      grade: 10,
      gradeLabel: 'BLACK LABEL 10',
      certNumber: '12345678',
      year: 2026,
    },
    1000
  );
  const boostedVal = getSlabMarketValuation(
    grailCard,
    {
      company: 'BGS',
      grade: 10,
      gradeLabel: 'BLACK LABEL 10',
      certNumber: '12345678',
      year: 2026,
    },
    1000,
    undefined,
    { marketPulseMultiplier: 1.25, grailBonusPct: 6 }
  );
  assert.ok(boostedVal.effectiveValue > baseVal.effectiveValue);
  assert.equal(boostedVal.pulseBonusPct, 25);
  assert.equal(boostedVal.grailBonusPct, 6);

  // Crossover crackAndRegradeSlab with Apple Studio riskReductionPct
  const entry: OwnedGradedSlabEntry = {
    id: 'slab_test_1',
    card: grailCard,
    rawPrice: 150,
    gradedPrice: 500,
    gradedAt: Date.now(),
    slab: {
      company: 'PSA',
      grade: 9,
      gradeLabel: 'MINT 9',
      certNumber: '44556677',
      year: 2025,
    },
  };
  // With 4 specialists (6% base risk) + 5% Apple Studio => 2% floor; rng=0.04 avoids damage
  const crossover = crackAndRegradeSlab({
    entry,
    targetCompany: 'BGS',
    specialistsCount: 4,
    riskReductionPct: 5,
    rng: () => 0.04,
  });
  assert.equal(crossover.didDamage, false);
  assert.equal(crossover.newEntry.slab.regradedCount, 1);
});

test('4. Live Box Break Studio: rips 9-pack box, splits hits between buyers and Shop Binder', () => {
  const result = executeLiveBoxBreak({
    setId: ALL_UNIQUE_BOOSTER_SETS[0].id,
    slotPrice: 12,
    viralFollowers: 400,
    reputation: 60,
    rng: makeDeterministicRng([0.1, 0.99, 0.99, 0.99, 0.99, 0.99]),
  });

  assert.equal(result.setId, ALL_UNIQUE_BOOSTER_SETS[0].id);
  assert.ok(result.slotsClaimed >= 2);
  assert.equal(result.slotRevenue, result.slotsClaimed * 12);
  assert.equal(result.shippedHitsCount + result.shopKeptCards.length, result.totalHitsPulled);
  assert.equal(result.netProfit, Math.round(result.slotRevenue - result.boxWholesaleCost));
  assert.ok(result.viralFollowersGain >= 18);
  assert.ok(result.xpGain > 35);
});

test('5. City Rare Card Hunts: spawns valid city POIs and handles haggle success & walk-away', () => {
  const spots = generateCityHuntSpots(3, makeDeterministicRng([0.15, 0.45, 0.75]));
  assert.equal(spots.length, 3);
  const validPoiIds = new Set(CITY_POIS.map((p) => p.id));
  for (const spot of spots) {
    assert.ok(validPoiIds.has(spot.poiId), `Invalid POI id ${spot.poiId}`);
    assert.equal(spot.status, 'active');
    assert.ok(spot.askingPrice < spot.marketValue);
    assert.ok(spot.minAcceptablePrice < spot.askingPrice);
  }

  // Successful haggle lowers price
  const haggleWin = attemptCityHuntHaggle({
    spot: spots[0],
    discountTargetPct: 0.12,
    luxuryHaggleBonusPct: 15,
    rng: () => 0.05,
  });
  assert.equal(haggleWin.succeeded, true);
  assert.equal(haggleWin.walkedAway, false);
  assert.ok(haggleWin.nextSpot.askingPrice <= spots[0].askingPrice);
  assert.equal(haggleWin.nextSpot.haggledCount, 1);

  // Failed aggressive haggles drain patience and cause seller to walk away
  const firstFail = attemptCityHuntHaggle({
    spot: spots[1],
    discountTargetPct: 0.2,
    rng: () => 0.99,
  });
  assert.equal(firstFail.succeeded, false);
  assert.equal(firstFail.walkedAway, false);
  assert.equal(firstFail.nextSpot.sellerPatience, 45);

  const secondFail = attemptCityHuntHaggle({
    spot: firstFail.nextSpot,
    discountTargetPct: 0.2,
    rng: () => 0.99,
  });
  assert.equal(secondFail.succeeded, false);
  assert.equal(secondFail.walkedAway, true);
  assert.equal(secondFail.nextSpot.status, 'walked_away');
});

test('6. Luxury Lifestyle Assets: stacks permanent shop buffs and speeds up grading & auction commission', () => {
  const allAssetIds = LUXURY_ASSETS_CATALOG.map((a) => a.id);
  const buffs = getLuxuryAssetBuffs(allAssetIds);

  assert.equal(buffs.pokeshipTipBonusPct, 40); // 25 Porsche + 15 VinFast
  assert.equal(buffs.dailyTaskBonusPct, 15); // VinFast
  assert.equal(buffs.dailyPassiveBonusCash, 185); // 140 Vinhomes + 45 VinFast
  assert.equal(buffs.haggleBonusPct, 15); // DIOR
  assert.equal(buffs.commissionBonusPct, 2); // DIOR
  assert.equal(buffs.gradingSpeedBonusPct, 15); // Apple Studio
  assert.equal(buffs.crossoverRiskReductionPct, 5); // Apple Studio
  assert.equal(buffs.grailValuationBonusPct, 6); // Vinhomes

  // Grading speed bonus actually accelerates grading queue duration
  const job: GradingJob = {
    id: 'job_speed_test',
    card: POKEMON_CARDS_DB[0],
    sourceType: 'binder',
    company: 'PSA',
    tier: 'standard',
    feePaid: 25,
    status: 'queued',
    elapsedMs: 0,
    durationMs: 25000,
    submittedAt: Date.now(),
    rawPrice: POKEMON_CARDS_DB[0].marketPrice || 20,
  };
  const normalStep = advanceGradingQueue([job], 1000, 1, () => 0.5, 0);
  const boostedStep = advanceGradingQueue([job], 1000, 1, () => 0.5, buffs.gradingSpeedBonusPct);
  assert.ok(boostedStep.nextJobs[0].durationMs < normalStep.nextJobs[0].durationMs);

  // Consignment auction commission bonus
  const entry: OwnedGradedSlabEntry = {
    id: 'slab_consign_1',
    card: POKEMON_CARDS_DB[0],
    rawPrice: 100,
    gradedPrice: 500,
    gradedAt: Date.now(),
    slab: {
      company: 'PSA',
      grade: 10,
      gradeLabel: 'GEM MT 10',
      certNumber: '99112233',
      year: 2026,
    },
  };
  const lot = {
    ...startSlabAuction({
      entry,
      startPrice: 400,
      reservePrice: 400,
      isConsignment: true,
      consignorName: 'VIP Whale',
      commissionRate: 0.15,
    }),
    bidCount: 2,
    currentBid: 1000,
  };
  const baseSettle = settleSlabAuction(lot, 0);
  const diorSettle = settleSlabAuction(lot, buffs.commissionBonusPct);
  assert.equal(baseSettle.commissionEarned, 150);
  assert.equal(diorSettle.commissionEarned, 170);
});

test('7. Satellite Kiosks: initializes locked kiosks and accrues passive revenue & sold items', () => {
  const initial = createInitialKiosksState();
  assert.equal(Object.keys(initial).length, SATELLITE_KIOSK_CATALOG.length);
  assert.equal(initial.aeon_kiosk.unlocked, false);

  const lockedTick = tickSatelliteKiosks(initial, 2, 80);
  assert.equal(lockedTick.generatedCash, 0);

  const activeState = {
    ...initial,
    aeon_kiosk: { ...initial.aeon_kiosk, unlocked: true, tier: 2 },
  };
  const activeTick = tickSatelliteKiosks(activeState, 2, 88);
  assert.ok(activeTick.generatedCash > 0);
  assert.equal(activeTick.nextKiosks.aeon_kiosk.uncollectedCash, activeTick.generatedCash);
  assert.equal(activeTick.nextKiosks.aeon_kiosk.totalEarned, activeTick.generatedCash);
  assert.ok(activeTick.nextKiosks.aeon_kiosk.itemsSold >= 12);
});

test('8. Master Set Progress & Grand Dex Vault: tracks milestones and caps wholesale discount at 20%', () => {
  const targetSet = ALL_UNIQUE_BOOSTER_SETS[0];
  const setCards = getBoosterSetCards(targetSet.id);
  const binderCards: Record<string, number> = {};
  for (const c of setCards) {
    binderCards[c.id] = 1;
  }

  const progressList = computeAllMasterSetProgress(binderCards, []);
  const targetProgress = progressList.find((p) => p.setId === targetSet.id)!;
  assert.equal(targetProgress.percent, 100);
  assert.deepEqual(targetProgress.claimableMilestones, [50, 80, 100]);

  const reward100 = getMasterSetMilestoneReward(targetSet, 100);
  assert.ok(reward100.cash >= 480);
  assert.equal(reward100.xp, 350);

  const claimed = [getMasterSetMilestoneKey(targetSet.id, 100)];
  assert.equal(getMasterSetWholesaleDiscount(claimed), 0.02);

  const maxedClaims = Array.from({ length: 15 }, (_, idx) => `set_${idx}:100`);
  assert.equal(getMasterSetWholesaleDiscount(maxedClaims), 0.2);
});

test('9. Shop Security & Shoplifters: auto-catches with upgrades and triggers manual alerts without tier protection', () => {
  const manualRoll = rollSecurityAlertEvent({
    securityLevel: 0,
    rng: makeDeterministicRng([0.1, 0.2, 0.5]),
  });
  assert.equal(manualRoll.autoCaught, false);
  assert.equal(manualRoll.incidentType, 'slab_swapper');
  assert.ok(manualRoll.alert);
  assert.equal(manualRoll.alert?.incidentType, 'slab_swapper');
  assert.equal(manualRoll.alert?.riskAmount, 55);
  assert.equal(manualRoll.alert?.remainingMs, 14000);

  const autoCatchRoll = rollSecurityAlertEvent({
    securityLevel: 2,
    rng: makeDeterministicRng([0.1, 0.8, 0.5, 0.2]),
  });
  assert.equal(autoCatchRoll.autoCaught, true);
  assert.equal(autoCatchRoll.incidentType, 'shoplifter');
  assert.equal(autoCatchRoll.alert, null);
  assert.ok(autoCatchRoll.autoBounty >= 70);
});

test('10. PokeLive Studio: enforces real prerequisites, zero instant buys on go-live, staggered waiting room & single-pack rip', () => {
  assert.equal(getStaffUnlockLevel('liveStreamer'), 6);
  assert.equal(LIVE_STUDIO_BUILD_LEVEL, 6);
  assert.equal(LIVE_STUDIO_BUILD_COST, 650);

  // Fresh shop has no studio room, no livestream staff, and no Booster Box in inventory
  const emptyShop = createInitialShopState();
  const emptyPrereqs = checkLiveBreakPrerequisites(emptyShop);
  assert.equal(emptyPrereqs.canGoLive, false);
  assert.equal(emptyPrereqs.hasStudioRoom, false);
  assert.equal(emptyPrereqs.hasStreamerHired, false);
  assert.equal(emptyPrereqs.hasStreamerOnShift, false);
  assert.equal(emptyPrereqs.ownedBoxes.length, 0);
  assert.equal(emptyPrereqs.missingReasons.length, 3);

  // Off-shift streamer (23:00) blocks going live
  const offShiftShop = {
    ...emptyShop,
    liveStudioUnlocked: true,
    inGameHour: 23,
    hiredStaff: { cashier: 0, restocker: 0, liveStreamer: 1 },
    inventory: [
      {
        id: 'inv_30th_box_test',
        productId: 'pokemon30thCommon_box',
        name: 'Booster Box 30th Common',
        type: 'box' as const,
        wholesaleCost: 22.5,
        retailPrice: 41,
        quantity: 2,
        shelvedQuantity: 0,
      },
    ],
  };
  const offShiftPrereqs = checkLiveBreakPrerequisites(offShiftShop);
  assert.equal(offShiftPrereqs.hasStudioRoom, true);
  assert.equal(offShiftPrereqs.hasStreamerHired, true);
  assert.equal(offShiftPrereqs.hasStreamerOnShift, false);
  assert.equal(offShiftPrereqs.ownedBoxes.length, 1);
  assert.equal(offShiftPrereqs.canGoLive, false);

  // On-shift (14:00) satisfies all prerequisites
  const readyPrereqs = checkLiveBreakPrerequisites({ ...offShiftShop, inGameHour: 14 });
  assert.equal(readyPrereqs.canGoLive, true);
  assert.equal(readyPrereqs.missingReasons.length, 0);

  // Initial slots all start available and warm-up ticks (0..2) guarantee zero instant buys
  const initialSlots = createLiveStreamSlots(6);
  assert.equal(initialSlots.length, 6);
  assert.ok(initialSlots.every((s) => s.status === 'available'));

  let currentSlots = initialSlots;
  let viewers = 0;
  for (let tick = 0; tick <= 2; tick++) {
    const warmup = tickLiveWaitingRoom({
      tickIndex: tick,
      currentViewers: viewers,
      slots: currentSlots,
      boxWholesalePrice: 22.5,
      viralFollowers: 150,
      reputation: 70,
      hypeBoostActive: true,
      rng: () => 0.01,
    });
    assert.equal(warmup.soldSlot, undefined);
    assert.ok(warmup.nextSlots.every((s) => s.status === 'available'));
    assert.ok(warmup.nextViewers >= viewers);
    viewers = warmup.nextViewers;
    currentSlots = warmup.nextSlots;
  }

  // Tick >= 3 with favorable rng sells at most 1 slot at a time
  const buyTick = tickLiveWaitingRoom({
    tickIndex: 3,
    currentViewers: Math.max(8, viewers),
    slots: currentSlots,
    boxWholesalePrice: 22.5,
    viralFollowers: 300,
    reputation: 85,
    hypeBoostActive: true,
    rng: () => 0.01,
  });
  assert.ok(buyTick.soldSlot);
  assert.equal(buyTick.nextSlots.filter((s) => s.status === 'sold').length, 1);

  // Single-pack rip separates cards belonging to sold slots ('shipped') vs unsold ('shop_kept')
  const allSoldSlots = buyTick.nextSlots.map((s) => ({
    ...s,
    status: 'sold' as const,
    buyerName: '@TestBuyer',
  }));
  const shippedPack = executeSinglePackLiveRip({
    setId: ALL_UNIQUE_BOOSTER_SETS[0].id,
    slots: allSoldSlots,
  });
  assert.ok(shippedPack.cards.length > 0);
  assert.ok(shippedPack.cards.every((c) => c.disposition === 'shipped'));
  assert.ok(shippedPack.packChatMessages.length > 0);

  const keptPack = executeSinglePackLiveRip({
    setId: ALL_UNIQUE_BOOSTER_SETS[0].id,
    slots: initialSlots,
  });
  assert.ok(keptPack.cards.every((c) => c.disposition === 'shop_kept'));
});

test('11. PokeLive Auto Hourly Schedule: streams strictly in-stock products per hour and skips 0-stock items', () => {
  const baseShop = createInitialShopState();
  const runtime = createInitialLiveStreamRuntime(true);
  assert.equal(runtime.autoLiveEnabled, true);

  // Shop with only quantity: 0 items must NEVER start auto-live or pick unowned boxes
  assert.equal(pickAutoLiveBoosterBox(baseShop.inventory), null);
  assert.equal(
    shouldAutoStartHourlyLiveSession({
      runtime,
      shopState: {
        ...baseShop,
        liveStudioUnlocked: true,
        inGameHour: 14,
        hiredStaff: { cashier: 0, restocker: 0, liveStreamer: 1 },
      },
      nowMs: 10000,
    }),
    false
  );

  // Stock 1 specific box (quantity: 2); all other boxes remain quantity: 0
  const stockedInventory = baseShop.inventory.map((item) =>
    item.productId === 'op10RoyalBlood_box' ? { ...item, quantity: 2 } : item
  );
  const picked = pickAutoLiveBoosterBox(stockedInventory);
  assert.ok(picked);
  assert.equal(picked.productId, 'op10RoyalBlood_box');

  const readyShop = {
    ...baseShop,
    liveStudioUnlocked: true,
    inGameHour: 14,
    hiredStaff: { cashier: 0, restocker: 0, liveStreamer: 1 },
    inventory: stockedInventory,
  };
  assert.equal(
    shouldAutoStartHourlyLiveSession({ runtime, shopState: readyShop, nowMs: 10000 }),
    true
  );

  // Same hour after completing a session waits until next hour
  const afterHour14 = {
    ...runtime,
    phase: 'summary' as const,
    lastCompletedHour: 14,
    nextAutoStartAfterMs: 15000,
  };
  assert.equal(
    shouldAutoStartHourlyLiveSession({ runtime: afterHour14, shopState: readyShop, nowMs: 20000 }),
    false
  );
  assert.equal(
    shouldAutoStartHourlyLiveSession({
      runtime: afterHour14,
      shopState: { ...readyShop, inGameHour: 15 },
      nowMs: 20000,
    }),
    true
  );

  // Manual toggle OFF stops auto-live
  assert.equal(
    shouldAutoStartHourlyLiveSession({
      runtime: { ...runtime, autoLiveEnabled: false },
      shopState: readyShop,
      nowMs: 20000,
    }),
    false
  );
});

test('12. PokeLive Shelf Deduction & Pack-to-Buyer Queue: deducts shelvedQuantity first and maps every pack & box to buyer', () => {
  const baseShop = createInitialShopState();
  const invWithShelfAndWarehouse = baseShop.inventory.map((item) => {
    if (item.productId === 'pokemon30thCommon_box') {
      return { ...item, quantity: 6, shelvedQuantity: 0 };
    }
    if (item.productId === 'op10RoyalBlood_box') {
      return { ...item, quantity: 5, shelvedQuantity: 3 };
    }
    return item;
  });

  // pickAutoLiveBoosterBox prefers items actively stocked on the shop shelf (shelvedQuantity > 0)
  const picked = pickAutoLiveBoosterBox(invWithShelfAndWarehouse)!;
  assert.equal(picked.productId, 'op10RoyalBlood_box');
  assert.equal(picked.shelvedQuantity, 3);
  assert.equal(picked.warehouseQuantity, 2);

  // Consuming 1 box on live deducts BOTH shelvedQuantity (3 -> 2) and total quantity (5 -> 4)
  const afterConsume = consumeLiveBoxFromInventory(invWithShelfAndWarehouse, 'op10RoyalBlood_box');
  assert.equal(afterConsume.consumed, true);
  assert.equal(afterConsume.deductedFromShelf, true);
  assert.equal(afterConsume.remainingShelved, 2);
  assert.equal(afterConsume.remainingTotal, 4);
  const updatedOp10 = afterConsume.updatedInventory.find((i) => i.productId === 'op10RoyalBlood_box')!;
  assert.equal(updatedOp10.shelvedQuantity, 2);
  assert.equal(updatedOp10.quantity, 4);

  // Slot 0 covers packs 1 & 7 of a 9-pack box
  assert.deepEqual(getSlotAssignedPackNumbers(0, 9, 6), [1, 7]);

  // Pack queue clearly shows who bought which pack & which box for the employee to unbox
  const slots = createLiveStreamSlots(15).map((s, idx) =>
    idx === 0 ? { ...s, status: 'sold' as const, buyerName: 'An Nhiên Ocean' } : s
  );
  const queue = buildLivePackOrderQueue({
    box: {
      productId: picked.productId,
      setId: picked.setId,
      setName: picked.setName,
      packsPerBox: 9,
    },
    slots,
    currentPackNum: 2,
    phase: 'ripping',
  });
  assert.equal(queue.length, 9);
  assert.equal(queue[0].packNumber, 1);
  assert.equal(queue[0].boxSetName, picked.setName);
  assert.equal(queue[0].buyerName, 'An Nhiên Ocean');
  assert.equal(queue[0].status, 'unboxed');
  assert.equal(queue[1].packNumber, 2);
  assert.equal(queue[1].buyerName, undefined);
  assert.equal(queue[1].status, 'ripping');
  assert.equal(queue[6].packNumber, 7);
  assert.equal(queue[6].buyerName, 'An Nhiên Ocean');
  assert.equal(queue[6].status, 'queued');

  // Ripping pack #1 for An Nhiên Ocean assigns non-hit pack cards to An Nhiên Ocean
  const ripRes = executeSinglePackLiveRip({
    setId: picked.setId,
    slots,
    packNumber: 1,
    packBuyerName: 'An Nhiên Ocean',
    packSlotLabel: slots[0].label,
    setName: picked.setName,
  });
  assert.ok(ripRes.cards.every((c) => c.disposition === 'shipped' && c.buyerName === 'An Nhiên Ocean'));
  assert.ok(ripRes.packChatMessages.length > 0);
});

test('13. PokeLive Standard Shop Retail Pricing: matches catalog & custom retailPrice and scales bounds dynamically', () => {
  const baseShop = createInitialShopState();
  const inv = baseShop.inventory.map((item) => {
    if (item.productId === 'pokemon30thCommon_box') {
      return { ...item, quantity: 2, shelvedQuantity: 1 };
    }
    if (item.productId === 'evolvingSkies_box') {
      return { ...item, quantity: 1, shelvedQuantity: 1, retailPrice: 120 }; // custom shop retail override
    }
    if (item.productId === 'pokemonRedVintage_box') {
      return { ...item, quantity: 1, shelvedQuantity: 1 }; // $855 catalog retail
    }
    return item;
  });

  const owned = getOwnedLiveBoosterBoxes(inv);
  const commonBox = owned.find((b) => b.productId === 'pokemon30thCommon_box')!;
  const evoBox = owned.find((b) => b.productId === 'evolvingSkies_box')!;
  const vintageBox = owned.find((b) => b.productId === 'pokemonRedVintage_box')!;

  // Catalog retail & custom retailPrice override preserved
  assert.equal(commonBox.boxRetailPrice, 41);
  assert.equal(evoBox.boxRetailPrice, 120);
  assert.equal(vintageBox.boxRetailPrice, 855);

  // Recommended 6/6 slots always covers >= 100% of Shop Box Retail Price
  const commonBounds = getLiveBreakSlotPriceBounds(commonBox.boxRetailPrice, commonBox.boxWholesalePrice);
  assert.equal(commonBounds.recommendedSlotPrice, 7); // ceil(41 / 6) = 7 -> 6*7 = $42 >= $41
  assert.ok(commonBounds.recommendedSlotPrice * 6 >= commonBox.boxRetailPrice);

  const evoBounds = getLiveBreakSlotPriceBounds(evoBox.boxRetailPrice, evoBox.boxWholesalePrice);
  assert.equal(evoBounds.recommendedSlotPrice, 20); // 120 / 6 = 20 -> 6*20 = $120
  assert.ok(evoBounds.recommendedSlotPrice * 6 >= evoBox.boxRetailPrice);

  const vintageBounds = getLiveBreakSlotPriceBounds(vintageBox.boxRetailPrice, vintageBox.boxWholesalePrice);
  assert.equal(vintageBounds.recommendedSlotPrice, 143); // ceil(855 / 6) = 143 -> 6*143 = $858 >= $855
  assert.ok(vintageBounds.maxSlotPrice > 200); // not capped at 45!
  assert.ok(vintageBounds.recommendedSlotPrice * 6 >= vintageBox.boxRetailPrice);

  // Waiting room at standard retail price ($143/slot for $855 box) must NOT trigger expensive-price complaints
  const vintageSlots = createLiveStreamSlots(vintageBounds.recommendedSlotPrice);
  const tickRes = tickLiveWaitingRoom({
    tickIndex: 5,
    currentViewers: 30,
    slots: vintageSlots,
    boxWholesalePrice: vintageBox.boxWholesalePrice,
    boxRetailPrice: vintageBox.boxRetailPrice,
    viralFollowers: 300,
    reputation: 70,
    rng: makeDeterministicRng([0.2, 0.0, 0.05, 0.1, 0.0]),
  });
  assert.ok(tickRes.soldSlot, 'Buyer should purchase slot priced fairly at shop retail');
  assert.ok(
    !tickRes.newMessages.some((m) => m.text.includes('Giá slot hơi cao') || m.text.includes('hơi căng')),
    'Standard shop retail price must not trigger overpriced viewer chat'
  );
});



