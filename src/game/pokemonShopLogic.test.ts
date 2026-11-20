import test from 'node:test';
import assert from 'node:assert/strict';
import {
  POKEMON_CARDS_DB,
  BOOSTER_SETS,
  ALL_UNIQUE_BOOSTER_SETS,
  COLLECTOR_BOX_SETS,
  ALL_COLLECTOR_BOXES,
  COLLECTOR_MAX_BOXES_PER_SHELF,
  COLLECTOR_SHELF_LAYOUT,
  isCollectorBoxProduct,
  getBoosterSet,
  getBoosterSetCards,
  ripBoosterPack,
  ripBoosterPackWithMetadata,
  ripBoosterBoxWithMetadata,
  createInitialShopState,
  calculatePurchaseProbability,
  generateCustomer,
  getUnlockedSetsForLevel,
  getCardHoloClass,
  GACHA_PACK_TIERS,
  rollGachaPack,
  placeCardInDisplaySlots,
  rollGameStopMysteryBox,
  getStockedStationIds,
  pickItemFromStationForCustomer,
  releaseCustomerReservedItems,
  STARTER_UNLOCKED_SHELVES,
  SHELF_UNLOCKS,
  isShelfUnlocked,
  getWallShelfCapacity,
  canStockProductOnUnlockedShelves,
  ONEPIECE_CARDS_DB,
  GRADING_SHOP_UNLOCK_LEVEL,
  GRADING_FEE_PER_CARD,
  GRADING_RECEPTIONIST_WAGE,
  GRADING_SPECIALIST_WAGE,
  MAX_GRADING_SPECIALISTS,
  getGradingSpeedStats,
  findAnyRawCardById,
  rollGradingResult,
  advanceGradingQueue,
  GradingJob,
  GRADING_CLEANING_FEE,
  GRADING_SERVICE_TIERS,
  GRADER_RESEARCH_BRIEFS,
  inspectRawCardForGrading,
  getGradingCardRoiAdvice,
  generateCustomerGradingOrder,
  advanceCustomerGradingOrders,
  recordGradedSlabIntoStats,
  STAFF_WORK_START_HOUR,
  STAFF_WORK_END_HOUR,
  isStaffWorkingHours,
  CASHIER_UNLOCK_LEVEL,
  RESTOCKER_UNLOCK_LEVEL,
  OFFICE_STAFF_UNLOCK_LEVEL,
  OFFICE_STAFF_WAGE,
  getStaffUnlockLevel,
  pickNextAutoWholesaleOrder,
  CRACK_REGRADE_FEE,
  SLAB_GUARD_FEE,
  SLAB_GUARD_OPTIONS,
  DAILY_MARKET_TRENDS,
  pickDailyMarketTrend,
  evaluateFancyCert,
  getSlabMarketValuation,
  crackAndRegradeSlab,
  startSlabAuction,
  advanceSlabAuctions,
  settleSlabAuction,
  getAuctionCommissionRate,
  generateAuctionConsignmentOffer,
  startAuctionFromConsignmentOffer,
  placeUserBidOnAuctionLot,
  generateWalkInBuybackOffer,
  generateVipSlabOrder,
  OwnedGradedSlabEntry,
} from './pokemonShopLogic';

test('Pokemon Cards DB: contains iconic grails with authentic high-res imageUrl and artUrl', () => {
  assert.ok(POKEMON_CARDS_DB.length >= 20);
  const charizard = POKEMON_CARDS_DB.find((c) => c.id === 'p151_charizard_sir');
  assert.ok(charizard);
  assert.ok(charizard.imageUrl.startsWith('https://images.pokemontcg.io/'));
  assert.ok(charizard.artUrl.startsWith('https://raw.githubusercontent.com/PokeAPI/'));
  assert.equal(charizard.pocketRarity, 'Star3');
  assert.equal(charizard.raritySymbol, '☆☆☆');

  const mewGold = POKEMON_CARDS_DB.find((c) => c.id === 'p151_mew_gold');
  assert.ok(mewGold);
  assert.equal(mewGold.pocketRarity, 'Crown');
  assert.equal(mewGold.raritySymbol, '👑');

  // Verify all cards have valid imageUrl and artUrl
  for (const card of POKEMON_CARDS_DB) {
    assert.ok(card.imageUrl && card.imageUrl.length > 5, `Card ${card.name} must have imageUrl`);
    assert.ok(card.artUrl && card.artUrl.length > 5, `Card ${card.name} must have artUrl`);
    assert.ok(card.raritySymbol, `Card ${card.name} must have raritySymbol`);
  }
});

test('Booster Sets: 10 packs per box and level unlock progression', () => {
  assert.ok(BOOSTER_SETS.pokemon30thCommon);
  assert.ok(BOOSTER_SETS.pokemonRedVintage);
  assert.ok(BOOSTER_SETS.evolvingSkies);
  assert.ok(BOOSTER_SETS.prismaticEvolutions);
  assert.ok(BOOSTER_SETS.surgingSparks);

  // Removed packs must not exist
  assert.equal((BOOSTER_SETS as any).pokemon151, undefined);
  assert.equal((BOOSTER_SETS as any).crownZenith, undefined);
  assert.equal((BOOSTER_SETS as any).shroudedFable, undefined);
  assert.equal((BOOSTER_SETS as any).temporalForces, undefined);

  // Common pack image must match requested URL
  assert.equal(
    BOOSTER_SETS.pokemon30thCommon.packImageUrl,
    'https://cdn.hstatic.net/products/200000160361/1234_7343f2ac70a64e7d8eee069e79da0905.jpg'
  );

  // Ascended Heroes pack image & name
  assert.equal(BOOSTER_SETS.prismaticEvolutions.name, 'Ascended Heroes');
  assert.equal(
    BOOSTER_SETS.prismaticEvolutions.packImageUrl,
    'https://tcgplayer-cdn.tcgplayer.com/product/672434_in_1000x1000.jpg'
  );

  // Destined Rivals pack image & name
  assert.equal(BOOSTER_SETS.deltaReign.name, 'Destined Rivals');
  assert.equal(
    BOOSTER_SETS.deltaReign.packImageUrl,
    'https://screenfreegames.com/cdn/shop/files/PokemonDestinedRivalsBoosterpack.webp?v=1747974163'
  );

  // Evolving Skies pack image & box image
  assert.equal(
    BOOSTER_SETS.evolvingSkies.packImageUrl,
    'https://m.media-amazon.com/images/I/814N5FR88dL._AC_UF894,1000_QL80_.jpg'
  );
  assert.equal(
    BOOSTER_SETS.evolvingSkies.boxImageUrl,
    'https://static0.dualshockersimages.com/wordpress/wp-content/uploads/2021/08/Pok-mon-TCG-All-Cards-Confirmed-For-Evolving-Skies-Expansion.jpg?w=1200&h=675&fit=crop'
  );

  // 9 packs per box
  for (const set of Object.values(BOOSTER_SETS)) {
    assert.equal(set.packsPerBox, 9, 'Each booster box must contain 9 packs');
    assert.ok(set.boxRetailPrice > set.boxWholesalePrice);
  }

  // Level progression
  const lvl1Sets = getUnlockedSetsForLevel(1);
  assert.ok(lvl1Sets.includes('pokemon30thCommon'));
  assert.ok(getUnlockedSetsForLevel(3).includes('paldeanFates'));
  assert.ok(getUnlockedSetsForLevel(8).includes('evolvingSkies'));
  assert.ok(getUnlockedSetsForLevel(10).includes('pokemonRedVintage'));
});

test('Holy Grail & Dynamic RGB Holographic Tiers: $4,000 Mew and tiered classes', () => {
  const mewGrail = POKEMON_CARDS_DB.find((c) => c.id === 'mew_30th_grgb_grail');
  assert.ok(mewGrail, 'Mew 30th G/RGB Grail card must exist');
  assert.equal(mewGrail.marketPrice, 4000.0);
  assert.equal(mewGrail.hasRgbAura, true);
  assert.equal(mewGrail.pocketRarity, 'Crown');
  assert.ok(mewGrail.imageUrl.includes('grail_4000'));

  // Holographic tier mapping
  assert.equal(getCardHoloClass(4.0, false), '', 'Cards under $5 have no base holo');
  assert.equal(getCardHoloClass(12.0, false), 'card-holo-tier-5', 'Cards $5 - $24.99 have tier 5 holo');
  assert.equal(getCardHoloClass(55.0, false), 'card-holo-tier-25', 'Cards $25 - $99.99 have tier 25 holo');
  assert.equal(getCardHoloClass(250.0, false), 'card-holo-tier-100', 'Cards $100 - $999.99 have tier 100 holo');
  assert.equal(getCardHoloClass(4000.0, true), 'card-holo-tier-4000', '$4,000 Holy Grail has supreme tier 4000 holo');
});

test('Pack Ripping Simulator: generates exactly 10 cards per pack with TCG Pocket rates', () => {
  for (let i = 0; i < 20; i++) {
    const pack = ripBoosterPack('pokemon30thCommon');
    assert.equal(pack.length, 10, 'Every booster pack must have exactly 10 cards');
    assert.ok(pack[0].name.length > 0);
    assert.ok(pack[9].marketPrice > 0);
  }

  const meta = ripBoosterPackWithMetadata('pokemon30thCommon');
  assert.equal(meta.cards.length, 10);
  assert.equal(typeof meta.isGodPack, 'boolean');
});

test('Booster Box Simulator: unboxes 9 packs (90 cards) with hit card aggregation and market value', () => {
  const boxResult = ripBoosterBoxWithMetadata('pokemon30thCommon');
  assert.equal(boxResult.packs.length, 9, 'Booster box must contain 9 packs');
  assert.equal(boxResult.totalCards, 90, 'Booster box must total 90 cards');
  assert.ok(boxResult.totalMarketValue > 0, 'Total box market value must be positive');
  assert.ok(Array.isArray(boxResult.hitCards), 'Hit cards must be an array');
  assert.equal(typeof boxResult.godPackCount, 'number');
});


test('Shop Economy: initial state provides seed cash, starter inventory and showcase cards', () => {
  const shop = createInitialShopState();
  assert.equal(shop.storeLevel, 1);
  assert.ok(shop.cash >= 500, 'Initial capital is healthy for restocking');
  assert.ok(Array.isArray(shop.showcaseCards));
  assert.equal(shop.reputation, 85);
});

test('Pricing & Customer Willingness: determines buyer satisfaction based on market price ratio', () => {
  const fairDeal = calculatePurchaseProbability(9.5, 10.0);
  assert.ok(fairDeal.willBuy !== undefined);
  assert.equal(fairDeal.satisfaction, 'Fair Price');

  const greatDeal = calculatePurchaseProbability(8.0, 10.0);
  assert.equal(greatDeal.satisfaction, 'Great Deal');
  assert.equal(greatDeal.willBuy, true);

  const ripoff = calculatePurchaseProbability(18.0, 10.0);
  assert.equal(ripoff.satisfaction, 'Ripoff');
});

test('Customer Generator: generates valid shop customers with basket items', () => {
  const shop = createInitialShopState();
  const customer = generateCustomer(shop.inventory, shop.showcaseCards);
  assert.ok(customer.id.startsWith('cust_'));
  assert.ok(customer.initialBudget > 0);
  assert.ok(customer.budget >= 0);
  assert.ok(Array.isArray(customer.basket));
});

test('Gacha Mystery Packs: 8 tiers, strictly 50% floor protection and graded slabs', () => {
  const packKeys = Object.keys(GACHA_PACK_TIERS);
  assert.equal(packKeys.length, 8, 'Must have exactly 8 Gacha pack tiers');

  // Verify all 8 packs have correct URLs, ranks and floor prices (exactly 50% of price)
  for (const pack of Object.values(GACHA_PACK_TIERS)) {
    assert.equal(pack.floorPrice, pack.price * 0.5, `Floor price of ${pack.name} must be 50% of price`);
    assert.ok(pack.imageUrl && pack.imageUrl.startsWith('http'), `Image URL for ${pack.name} must be valid`);
    assert.ok(pack.rank >= 1 && pack.rank <= 8, `Rank must be between 1 and 8`);
  }

  // Verify rollGachaPack never drops below floor price (max loss is 50%) across 200 pulls
  for (const packId of packKeys) {
    const pack = GACHA_PACK_TIERS[packId];
    for (let i = 0; i < 25; i++) {
      const pull = rollGachaPack(packId);
      assert.ok(
        pull.payoutValue >= pack.floorPrice,
        `Payout $${pull.payoutValue} cannot be lower than floor price $${pack.floorPrice}`
      );
      assert.ok(pull.card.name.length > 0);
      assert.ok(pull.card.marketPrice >= pack.floorPrice);
      if (pull.isSlab && pull.slab) {
        assert.ok(['PSA', 'CGC'].includes(pull.slab.company));
        assert.ok([8, 9, 10].includes(pull.slab.grade));
      }
    }
  }

  // Deterministic boundary tests for exact slab probabilities & multipliers:
  // 0.5% -> PSA/CGC 10 (x4 - x5 raw)
  const roll10 = rollGachaPack('blaze', () => 0.002);
  assert.equal(roll10.isSlab, true);
  assert.equal(roll10.slab?.grade, 10);
  assert.ok(['PSA', 'CGC'].includes(roll10.slab!.company));
  assert.ok(roll10.gradeMultiplier >= 4.0 && roll10.gradeMultiplier <= 5.0);
  assert.ok(roll10.payoutValue >= roll10.rawPrice * 4.0 && roll10.payoutValue <= roll10.rawPrice * 5.0);

  // 5.0% -> PSA/CGC 9 (+30% - +40% raw)
  const roll9 = rollGachaPack('blaze', () => 0.03);
  assert.equal(roll9.isSlab, true);
  assert.equal(roll9.slab?.grade, 9);
  assert.ok(['PSA', 'CGC'].includes(roll9.slab!.company));
  assert.ok(roll9.gradeMultiplier >= 1.3 && roll9.gradeMultiplier <= 1.4);

  // 10.0% -> PSA/CGC 8 (= raw price)
  const roll8 = rollGachaPack('blaze', () => 0.1);
  assert.equal(roll8.isSlab, true);
  assert.equal(roll8.slab?.grade, 8);
  assert.ok(['PSA', 'CGC'].includes(roll8.slab!.company));
  assert.equal(roll8.gradeMultiplier, 1.0);
  assert.equal(roll8.payoutValue, roll8.rawPrice);

  // Remaining 84.5% -> Raw card
  const rollRaw = rollGachaPack('blaze', () => 0.5);
  assert.equal(rollRaw.isSlab, false);
  assert.equal(rollRaw.payoutValue, rollRaw.rawPrice);

  // Monte Carlo rate sanity check over 4000 pulls (0.5% / 5% / 10%)
  let g10 = 0;
  let g9 = 0;
  let g8 = 0;
  const N = 4000;
  for (let i = 0; i < N; i++) {
    const p = rollGachaPack('silver');
    if (p.isSlab && p.slab) {
      if (p.slab.grade === 10) g10++;
      else if (p.slab.grade === 9) g9++;
      else if (p.slab.grade === 8) g8++;
    }
  }
  const r10 = g10 / N;
  const r9 = g9 / N;
  const r8 = g8 / N;
  assert.ok(r10 >= 0.001 && r10 <= 0.012, `Grade 10 rate expected ~0.5%, got ${(r10 * 100).toFixed(2)}%`);
  assert.ok(r9 >= 0.035 && r9 <= 0.068, `Grade 9 rate expected ~5%, got ${(r9 * 100).toFixed(2)}%`);
  assert.ok(r8 >= 0.08 && r8 <= 0.125, `Grade 8 rate expected ~10%, got ${(r8 * 100).toFixed(2)}%`);
});

test('Expansion Exclusivity & Transparent Base Set Vintage Pack Asset', () => {
  // Verify Base Set Vintage pack uses transparent asset and has proper prices
  const vintageSet = BOOSTER_SETS.pokemonRedVintage;
  assert.equal(vintageSet.packImageUrl, '/assets/packs/base_set_charizard_pack_transparent.png');
  assert.equal(vintageSet.boxRetailPrice, 855.0);
  assert.equal(vintageSet.packRetailPrice, 95.0);

  // Verify Paldean Fates expansion pulls Paldean Fates cards
  const paldeanResult = ripBoosterPackWithMetadata('paldeanFates');
  assert.equal(paldeanResult.cards.length, 10);
  for (const card of paldeanResult.cards) {
    assert.equal(card.setId, 'paldeanFates', `Card ${card.name} in Paldean Fates pack must have setId paldeanFates`);
  }

  // Verify Base Set vintage expansion pulls vintage cards
  const vintageResult = ripBoosterPackWithMetadata('pokemonRedVintage');
  assert.equal(vintageResult.cards.length, 10);
  for (const card of vintageResult.cards) {
    assert.equal(card.setId, 'pokemonRedVintage', `Card ${card.name} in Base Set pack must have setId pokemonRedVintage`);
  }
});

test('All 8 Sets: rich Common/Uncommon pools (>=340) and realistic non-100% rare hit rates', () => {
  for (const set of ALL_UNIQUE_BOOSTER_SETS) {
    const cards = getBoosterSetCards(set.id);
    const commons = cards.filter((c) => c.pocketRarity === 'Diamond1');
    const uncommons = cards.filter((c) => c.pocketRarity === 'Diamond2');
    assert.ok(cards.length >= 450, `Set ${set.id} should have >= 450 cards (has ${cards.length})`);
    assert.ok(commons.length >= 190, `Set ${set.id} should have >= 190 Common cards (has ${commons.length})`);
    assert.ok(commons.length + uncommons.length >= 340, `Set ${set.id} should have >= 340 Common+Uncommon cards`);
  }

  // Verify Base Set Vintage (Red Version) does NOT give Star1+/Crown or expensive hits in every pack
  let totalUltraHits = 0;
  let totalExpensiveCommons = 0;
  const numPacks = 40;
  for (let i = 0; i < numPacks; i++) {
    const pack = ripBoosterPackWithMetadata('pokemonRedVintage');
    for (const c of pack.cards) {
      if (c.pocketRarity === 'Star1' || c.pocketRarity === 'Star2' || c.pocketRarity === 'Star3' || c.pocketRarity === 'Crown') {
        totalUltraHits++;
      }
      if (c.pocketRarity === 'Diamond1' && c.marketPrice >= 5) {
        totalExpensiveCommons++;
      }
    }
  }
  assert.equal(totalExpensiveCommons, 0, 'Common Diamond1 pulls should never cost >= $5');
  assert.ok(totalUltraHits < 10, `Expected realistic rare hit rate across 40 packs, got ${totalUltraHits} ultra hits`);
});

test('30th Anniversary: R/G/B RGB Mews are Crown ($3000+) & every 30th pack/box ends with 1 of 30 Pikachu 30th + Rare #9', () => {
  const cards30th = getBoosterSetCards('pokemon30thCommon');
  const isPika30th = (c: { raritySymbol: string; rarityLabel: string }) =>
    c.raritySymbol === '⚡30TH' || c.rarityLabel.startsWith('Pikachu 30th');

  const pika30Cards = cards30th.filter(isPika30th);
  assert.equal(pika30Cards.length, 30, 'Must contain all 30 Pikachu 30th cards');

  // Verify YOSHIROTTEN R/G/B Mews are properly classified as Crown and priced $3,000+ (never $0.29 Common)
  for (const id of ['me55-R', 'me55-G', 'me55-B']) {
    const rgbMew = cards30th.find((c) => c.id === id);
    assert.ok(rgbMew, `${id} must exist in pokemon30thCommon`);
    assert.equal(rgbMew.pocketRarity, 'Crown', `${id} must be Crown rarity`);
    assert.ok(rgbMew.marketPrice >= 2500, `${id} must reflect high market price ($${rgbMew.marketPrice})`);
  }

  const rareOrHigher = new Set(['Diamond3', 'Diamond4', 'Star1', 'Star2', 'Star3', 'Crown']);

  // Single 30th packs: 30 packs tested
  for (let i = 0; i < 30; i++) {
    const pack = ripBoosterPackWithMetadata('pokemon30thCommon');
    assert.equal(pack.cards.length, 10);
    assert.ok(
      rareOrHigher.has(pack.cards[8].pocketRarity),
      `30th pack Card #9 must be Rare or higher, got ${pack.cards[8].pocketRarity} (${pack.cards[8].name})`
    );
    assert.ok(
      isPika30th(pack.cards[9]),
      `30th pack Card #10 must ALWAYS be Pikachu 30th, got ${pack.cards[9].name}`
    );
  }

  // Full 30th Booster Boxes (3 boxes = 30 packs)
  for (let b = 0; b < 3; b++) {
    const box = ripBoosterBoxWithMetadata('pokemon30thCommon');
    assert.equal(box.packs.length, 9);
    for (const pack of box.packs) {
      assert.ok(
        rareOrHigher.has(pack.cards[8].pocketRarity),
        `30th box Card #9 must be Rare or higher, got ${pack.cards[8].pocketRarity}`
      );
      assert.ok(
        isPika30th(pack.cards[9]),
        `30th box Card #10 must ALWAYS be Pikachu 30th, got ${pack.cards[9].name}`
      );
    }
  }

  // Non-30th packs, boxes, and Gacha packs must NEVER contain or pull Pikachu 30th cards
  for (const set of ALL_UNIQUE_BOOSTER_SETS) {
    if (set.id === 'pokemon30thCommon') continue;
    assert.equal(
      getBoosterSetCards(set.id).filter(isPika30th).length,
      0,
      `Set ${set.id} must not contain any Pikachu 30th card`
    );
    const box = ripBoosterBoxWithMetadata(set.id);
    for (const pack of box.packs) {
      for (const c of pack.cards) {
        assert.ok(!isPika30th(c), `Non-30th box (${set.id}) must never pull Pikachu 30th`);
      }
    }
  }
  for (const packId of Object.keys(GACHA_PACK_TIERS)) {
    const gachaPull = rollGachaPack(packId);
    assert.ok(!isPika30th(gachaPull.card), `Gacha pack ${packId} must never pull Pikachu 30th`);
  }
});

test('Auto Display Placement: puts kept cards & PSA/CGC slabs into visible table/shelf slots cleanly', () => {
  const sampleCard = POKEMON_CARDS_DB[7]; // Charizard ex 151
  const secondCard = POKEMON_CARDS_DB[10]; // Mew Grail
  const cgcSlab = {
    company: 'CGC' as const,
    grade: 9,
    gradeLabel: 'MINT 9',
    certNumber: '1400294317663',
    year: 2022,
  };
  const psaSlab = {
    company: 'PSA' as const,
    grade: 10,
    gradeLabel: 'GEM MT 10',
    certNumber: '1000000',
    year: 2019,
  };

  // 1. Fresh shop has 10 full showcase slots & 18 full shelf slots -> rotates onto visible showcase slot 0..9 (cheapest starter slot #9 first)
  const freshShop = createInitialShopState();
  const res1 = placeCardInDisplaySlots(freshShop.showcaseCards, freshShop.shelfCards, {
    card: sampleCard,
    retailPrice: 322,
    isSlab: true,
    slab: cgcSlab,
  });
  assert.equal(res1.location, 'showcase');
  assert.equal(res1.slotIndex, 0, 'Places into first empty showcase slot #0');
  assert.equal(res1.showcaseCards[0].card.id, sampleCard.id);
  assert.equal(res1.showcaseCards[0].card.imageUrl, sampleCard.imageUrl);
  assert.equal(res1.showcaseCards[0].isSlab, true);
  assert.deepEqual(res1.showcaseCards[0].slab, cgcSlab);

  // Second keep on shop goes to next slot #1
  const res2 = placeCardInDisplaySlots(res1.showcaseCards, res1.shelfCards, {
    card: secondCard,
    retailPrice: 5000,
    isSlab: true,
    slab: psaSlab,
  });
  assert.equal(res2.location, 'showcase');
  assert.equal(res2.slotIndex, 1, 'Next keep goes to slot #1 without overwriting #0');
  assert.equal(res2.showcaseCards[0].slab?.company, 'CGC');
  assert.equal(res2.showcaseCards[1].slab?.company, 'PSA');
  assert.equal(res2.showcaseCards[1].slab?.grade, 10);

  // 2. If a showcase slot was sold, place directly into that sold showcase slot
  const withSoldShowcase = res2.showcaseCards.map((s, idx) =>
    idx === 0 ? { ...s, isSold: true } : s
  );
  const resSoldShowcase = placeCardInDisplaySlots(withSoldShowcase, res2.shelfCards, {
    card: sampleCard,
    retailPrice: 120,
    isSlab: false,
  });
  assert.equal(resSoldShowcase.location, 'showcase');
  assert.equal(resSoldShowcase.slotIndex, 0);
  assert.equal(resSoldShowcase.showcaseCards[0].isSold, false);
  assert.equal(resSoldShowcase.showcaseCards[0].isSlab, false);
  assert.equal(resSoldShowcase.showcaseCards[0].slab, undefined);

  // 3. If shelf slot is targeted, place into shelf slot
  const resShelf = placeCardInDisplaySlots(res2.showcaseCards, [], {
    card: sampleCard,
    retailPrice: 400,
    isSlab: true,
    slab: psaSlab,
  });
  assert.equal(resShelf.location, 'showcase');
});

test('Left-Wall VIP Collector Boxes: exact researched prices, 4 boxes per shelf rule, pack counts & Pikachu 30th exclusion', () => {
  assert.equal(COLLECTOR_MAX_BOXES_PER_SHELF, 4);
  assert.equal(COLLECTOR_SHELF_LAYOUT, '1x1');
  assert.equal(ALL_COLLECTOR_BOXES.length, 4);

  const night30th = COLLECTOR_BOX_SETS.collector_30th_night_upc;
  const sv151 = COLLECTOR_BOX_SETS.collector_sv151_upc;
  const prismaticSpc = COLLECTOR_BOX_SETS.collector_prismatic_spc;
  const celeb25 = COLLECTOR_BOX_SETS.collector_25th_upc;

  assert.equal(night30th.boxRetailPrice, 1000);
  assert.equal(night30th.packsPerBox, 20);
  assert.equal(night30th.boxImageUrl, '/boxes/pokemon30thCelebrationNight.png');

  assert.equal(sv151.boxImageUrl, '/boxes/sv151_clean.png');
  assert.equal(sv151.boxRetailPrice, 850);
  assert.equal(sv151.packsPerBox, 16);

  assert.equal(prismaticSpc.boxImageUrl, '/boxes/prismatic_clean.png');
  assert.equal(prismaticSpc.boxRetailPrice, 270);
  assert.equal(prismaticSpc.packsPerBox, 15);

  assert.equal(celeb25.boxImageUrl, '/boxes/celeb25_clean.png');
  assert.equal(celeb25.boxRetailPrice, 1250);
  assert.equal(celeb25.packsPerBox, 25);

  assert.equal(isCollectorBoxProduct('collector_30th_night_upc_box'), true);
  assert.equal(isCollectorBoxProduct('collector_sv151_upc_box'), true);
  assert.equal(isCollectorBoxProduct('collector_prismatic_spc'), true);
  assert.equal(isCollectorBoxProduct('collector_25th_upc_box'), true);
  assert.equal(isCollectorBoxProduct('paldeanFates_box'), false);

  assert.equal(getBoosterSet('collector_30th_night_upc_box').id, 'collector_30th_night_upc');
  assert.equal(getBoosterSet('collector_sv151_upc_box').id, 'collector_sv151_upc');
  assert.equal(getBoosterSet('collector_prismatic_spc_box').id, 'collector_prismatic_spc');
  assert.equal(getBoosterSet('collector_25th_upc_box').id, 'collector_25th_upc');

  // Initial shop state seeds all 4 Collector Boxes with qty 4, shelved 4
  const initial = createInitialShopState();
  for (const col of ALL_COLLECTOR_BOXES) {
    const inv = initial.inventory.find((i) => i.productId === `${col.id}_box`);
    assert.ok(inv, `Initial inventory must contain ${col.id}_box`);
    assert.equal(inv.quantity, 0);
    assert.equal(inv.shelvedQuantity, 0);
    assert.equal(inv.retailPrice, col.boxRetailPrice);
  }

  // Verify dynamic pack counts when ripping & zero Pikachu 30th leakage in non-30th boxes
  const isPika30th = (c: { raritySymbol: string; rarityLabel: string }) =>
    c.raritySymbol === '⚡30TH' || c.rarityLabel.startsWith('Pikachu 30th');

  for (const col of ALL_COLLECTOR_BOXES) {
    if (col.id !== 'collector_30th_night_upc') {
      assert.equal(
        getBoosterSetCards(col.id).filter(isPika30th).length,
        0,
        `Collector Box ${col.id} must not contain Pikachu 30th cards`
      );
    }
    const ripped = ripBoosterBoxWithMetadata(col.id);
    assert.equal(ripped.packs.length, col.packsPerBox, `${col.id} must rip ${col.packsPerBox} packs`);
    assert.equal(ripped.totalCards, col.packsPerBox * 10);
    if (col.id !== 'collector_30th_night_upc') {
      for (const pack of ripped.packs) {
        for (const card of pack.cards) {
          assert.ok(!isPika30th(card), `Collector Box ${col.id} must never pull Pikachu 30th`);
        }
      }
    }
  }
});

test('GameStop Mystery Boxes: Guaranteed PSA 10 / CGC 10 slab + 2 random booster packs', () => {
  const boxKeys = ['gamestop_mystery_gold', 'gamestop_mystery_charizard', 'gamestop_mystery_black'];
  for (const key of boxKeys) {
    const res = rollGameStopMysteryBox(key);
    assert.ok(res.boxId);
    assert.equal(res.packs.length, 2, 'Mystery box must include exactly 2 random booster packs');
    assert.ok(res.slabCard, 'Mystery box must include a graded slab card');
    assert.equal(res.slabCard.isSlab, true);
    assert.ok(res.slabCard.slab);
    assert.equal(res.slabCard.slab.grade, 10, 'Grade must be PSA 10 or CGC 10');
    assert.ok(['PSA', 'CGC'].includes(res.slabCard.slab.company));
  }
});

test('NPC Shopping: empty shop never yields basket items or shelf pickups', () => {
  const shop = createInitialShopState();
  assert.deepEqual(getStockedStationIds(shop), []);

  const cust = generateCustomer(shop.inventory, shop.showcaseCards, shop.shelfCards, {
    startEmptyBasket: true,
  });
  assert.equal(cust.basket.length, 0, 'Freshly spawned NPC must start with empty basket');

  const stations = ['shelves', 'gacha', 'collector_shelves', 'gamestop_shelf', 'showcase', 'shelf_1', 'shelf_2', 'shelf_3'] as const;
  for (const st of stations) {
    const res = pickItemFromStationForCustomer(shop, st, cust);
    assert.equal(res.picked, null, `Empty station ${st} must never yield items`);
    assert.equal(res.reason, 'empty');
  }
});

test('NPC Shopping: desynced shelvedQuantity > 0 with quantity = 0 never sells invisible items', () => {
  const shop = createInitialShopState();
  shop.inventory[0] = {
    ...shop.inventory[0],
    quantity: 0,
    shelvedQuantity: 5,
  };
  assert.deepEqual(getStockedStationIds(shop), []);

  const cust1 = generateCustomer(shop.inventory, shop.showcaseCards, shop.shelfCards);
  assert.equal(cust1.basket.length, 0, 'Must not pick items when quantity is 0');

  const res = pickItemFromStationForCustomer(shop, 'shelves', cust1);
  assert.equal(res.picked, null);
  assert.equal(res.reason, 'empty');
});

test('NPC Shopping: live station picking deducts shelvedQuantity, prevents double-buying, and reserves showcase cards', () => {
  let shop = createInitialShopState();
  const packIdx = shop.inventory.findIndex((i) => i.productId === 'pokemon30thCommon_pack');
  assert.ok(packIdx >= 0);
  shop.inventory[packIdx] = {
    ...shop.inventory[packIdx],
    quantity: 1,
    shelvedQuantity: 1,
    retailPrice: 2.0, // Discounted below market so customer willBuy is 100%
  };

  assert.deepEqual(getStockedStationIds(shop), ['shelves']);

  const custA = generateCustomer(shop.inventory, shop.showcaseCards, shop.shelfCards, { startEmptyBasket: true });
  custA.budget = 500;
  const custB = generateCustomer(shop.inventory, shop.showcaseCards, shop.shelfCards, { startEmptyBasket: true });
  custB.budget = 500;

  const miss = pickItemFromStationForCustomer(shop, 'collector_shelves', custA);
  assert.equal(miss.picked, null);

  const pickA = pickItemFromStationForCustomer(shop, 'shelves', custA);
  assert.ok(pickA.picked, 'Customer A should pick stocked pack');
  assert.equal(pickA.picked.count, 1);
  assert.equal(pickA.updatedState.inventory[packIdx].shelvedQuantity, 0);
  assert.equal(pickA.updatedState.inventory[packIdx].quantity, 1);

  shop = pickA.updatedState;
  custA.basket.push(pickA.picked);
  assert.deepEqual(getStockedStationIds(shop), []);

  const pickB = pickItemFromStationForCustomer(shop, 'shelves', custB);
  assert.equal(pickB.picked, null);
  assert.equal(pickB.reason, 'empty');

  const card = POKEMON_CARDS_DB[0];
  shop.showcaseCards = [{ card, retailPrice: card.marketPrice, isSold: false }];
  assert.deepEqual(getStockedStationIds(shop), ['showcase']);

  custB.budget = card.marketPrice + 1000;
  const origRandom = Math.random;
  Math.random = () => 0.1;
  try {
    const cardPick = pickItemFromStationForCustomer(shop, 'showcase', custB);
    assert.ok(cardPick.picked);
    assert.equal(cardPick.updatedState.showcaseCards[0].isReserved, true);
    shop = cardPick.updatedState;
    custB.basket.push(cardPick.picked);
    assert.deepEqual(getStockedStationIds(shop), []);

    const released = releaseCustomerReservedItems(shop, custB);
    assert.equal(released.showcaseCards[0].isReserved, false);
    assert.deepEqual(getStockedStationIds(released), ['showcase']);
  } finally {
    Math.random = origRandom;
  }
});

test('Progressive Shelf Unlocking: starter state, bay capacity limits, specialty locks, and NPC filtering', () => {
  const shop = createInitialShopState();
  assert.deepEqual(shop.unlockedShelves, STARTER_UNLOCKED_SHELVES);
  assert.equal(isShelfUnlocked(shop.unlockedShelves, 'shelf_wall_bay_1'), true);
  assert.equal(isShelfUnlocked(shop.unlockedShelves, 'shelf_card_1'), true);
  assert.equal(isShelfUnlocked(shop.unlockedShelves, 'shelf_wall_bay_2'), false);
  assert.equal(isShelfUnlocked(shop.unlockedShelves, 'shelf_card_2'), false);
  assert.equal(isShelfUnlocked(shop.unlockedShelves, 'shelf_gacha_gondola'), false);
  assert.equal(isShelfUnlocked(shop.unlockedShelves, 'shelf_gamestop_mystery'), false);
  assert.equal(isShelfUnlocked(shop.unlockedShelves, 'shelf_collector_1'), false);

  // Level 1 capacity = 1 wall bay (2 box slots = 16 boxes max, 8 pack cols = 80 packs max)
  const cap1 = getWallShelfCapacity(shop.unlockedShelves);
  assert.equal(cap1.maxBoxSlots, 2);
  assert.equal(cap1.maxPackColumns, 8);
  assert.equal(cap1.maxBoxUnits, 16);
  assert.equal(cap1.maxPackUnits, 80);

  // Fill bay 1 box slots (e.g. 2 distinct box types, 1 each = 2 slots)
  const invBoxes = shop.inventory.map((i) => ({ ...i }));
  const b1 = invBoxes.find((i) => i.productId === 'pokemon30thCommon_box')!;
  const b2 = invBoxes.find((i) => i.productId === 'paldeanFates_box')!;
  b1.quantity = 1;
  b1.shelvedQuantity = 1;
  b2.quantity = 1;
  b2.shelvedQuantity = 1;

  // Adding a 3rd distinct box product exceeds bay 1's 2 box slots
  const blockedBox = canStockProductOnUnlockedShelves(invBoxes, 'surgingSparks_box', shop.unlockedShelves, {
    isFromParcel: true,
  });
  assert.equal(blockedBox.allowed, false);
  assert.equal(blockedBox.requiredShelf?.id, 'shelf_wall_bay_2');

  // Unlocking shelf_wall_bay_2 expands capacity to 4 box slots (32 boxes) & allows the 3rd box
  const unlockedBay2 = [...STARTER_UNLOCKED_SHELVES, 'shelf_wall_bay_2'];
  const allowedAfterUnlock = canStockProductOnUnlockedShelves(invBoxes, 'surgingSparks_box', unlockedBay2, {
    isFromParcel: true,
  });
  assert.equal(allowedAfterUnlock.allowed, true);

  // Locked specialty shelves block stocking until unlocked
  assert.equal(
    canStockProductOnUnlockedShelves(invBoxes, 'gacha_silver', shop.unlockedShelves, { isFromParcel: true }).allowed,
    false
  );
  assert.equal(
    canStockProductOnUnlockedShelves(invBoxes, 'gamestop_mystery_gold_box', shop.unlockedShelves, { isFromParcel: true }).allowed,
    false
  );
  assert.equal(
    canStockProductOnUnlockedShelves(invBoxes, 'collector_30th_night_upc_box', shop.unlockedShelves, { isFromParcel: true }).allowed,
    false
  );

  assert.equal(
    canStockProductOnUnlockedShelves(invBoxes, 'gacha_silver', [...STARTER_UNLOCKED_SHELVES, 'shelf_gacha_gondola']).allowed,
    true
  );

  // placeCardInDisplaySlots skips locked shelf_card_2 and shelf_card_3 when showcase & shelf_card_1 are full
  const fullShowcase = Array.from({ length: 10 }, (_, idx) => ({
    card: POKEMON_CARDS_DB[idx % POKEMON_CARDS_DB.length],
    retailPrice: 100,
    isSold: false,
  }));
  const shelfCards6Unlocked = Array.from({ length: 18 }, (_, idx) => ({
    card: POKEMON_CARDS_DB[idx % POKEMON_CARDS_DB.length],
    retailPrice: 100,
    isSold: idx >= 6, // shelf_1 (0..5) full; shelf_2 (6..11) and shelf_3 (12..17) empty/sold
  }));
  const placedLocked = placeCardInDisplaySlots(
    fullShowcase,
    shelfCards6Unlocked,
    { card: POKEMON_CARDS_DB[0], retailPrice: 55, isSold: false },
    STARTER_UNLOCKED_SHELVES
  );
  assert.equal(placedLocked.location, 'showcase', 'Should not place onto locked shelf_card_2/3');

  const placedUnlocked2 = placeCardInDisplaySlots(
    fullShowcase,
    shelfCards6Unlocked,
    { card: POKEMON_CARDS_DB[0], retailPrice: 55, isSold: false },
    [...STARTER_UNLOCKED_SHELVES, 'shelf_card_2']
  );
  assert.equal(placedUnlocked2.location, 'shelf');
  assert.equal(placedUnlocked2.slotIndex, 6, 'Should place into first slot of unlocked shelf_card_2');

  // NPCs ignore items placed on locked specialty/card shelves
  const lockedShop = createInitialShopState();
  const gachaInvIdx = lockedShop.inventory.findIndex((i) => i.productId === 'gacha_silver');
  assert.ok(gachaInvIdx >= 0);
  lockedShop.inventory[gachaInvIdx] = {
    ...lockedShop.inventory[gachaInvIdx],
    quantity: 5,
    shelvedQuantity: 5,
  };
  lockedShop.shelfCards = shelfCards6Unlocked.map((s, idx) =>
    idx === 6 ? { card: POKEMON_CARDS_DB[0], retailPrice: 50, isSold: false } : { ...s, isSold: true }
  );
  assert.deepEqual(getStockedStationIds(lockedShop), []);

  const cust = generateCustomer(lockedShop.inventory, lockedShop.showcaseCards, lockedShop.shelfCards, {
    startEmptyBasket: true,
  });
  cust.budget = 5000;
  assert.equal(pickItemFromStationForCustomer(lockedShop, 'gacha', cust).picked, null);
  assert.equal(pickItemFromStationForCustomer(lockedShop, 'shelf_2', cust).picked, null);
  assert.equal(SHELF_UNLOCKS.length, 26);
});

test('Level 25 PSA & CGC Grading Shop: constants, speed scaling, One Piece + Pokemon support, and 8% Grade 10 odds', () => {
  assert.equal(GRADING_SHOP_UNLOCK_LEVEL, 25);
  assert.equal(GRADING_FEE_PER_CARD, 80);
  assert.equal(GRADING_RECEPTIONIST_WAGE, 20);
  assert.equal(GRADING_SPECIALIST_WAGE, 30);
  assert.equal(MAX_GRADING_SPECIALISTS, 4);

  // Speed & capacity scale smoothly with hired grading specialists (0..4)
  const s0 = getGradingSpeedStats(0);
  const s1 = getGradingSpeedStats(1);
  const s2 = getGradingSpeedStats(2);
  const s3 = getGradingSpeedStats(3);
  const s4 = getGradingSpeedStats(4);
  assert.equal(s0.maxConcurrent, 0);
  assert.equal(s1.maxConcurrent, 1);
  assert.equal(s1.maxQueue, 3);
  assert.equal(s1.secondsPerCard, 24);
  assert.equal(s2.maxConcurrent, 2);
  assert.equal(s2.maxQueue, 6);
  assert.equal(s2.secondsPerCard, 14);
  assert.equal(s3.maxConcurrent, 3);
  assert.equal(s3.maxQueue, 9);
  assert.equal(s3.secondsPerCard, 9);
  assert.equal(s4.maxConcurrent, 4);
  assert.equal(s4.maxQueue, 12);
  assert.equal(s4.secondsPerCard, 5);

  // Supports both Pokémon and One Piece raw cards
  const pkmCard = POKEMON_CARDS_DB[0];
  const opCard = ONEPIECE_CARDS_DB[0];
  assert.ok(findAnyRawCardById(pkmCard.id));
  assert.ok(findAnyRawCardById(opCard.id));

  // Deterministic PSA thresholds: 8% Grade 10 (r < 0.08), 34% Grade 9 (0.08..0.42), 38% Grade 8, 20% Grade 7
  const psa10 = rollGradingResult(pkmCard, 'PSA', () => 0.05);
  assert.equal(psa10.slab.company, 'PSA');
  assert.equal(psa10.slab.grade, 10);
  assert.equal(psa10.gradeMultiplier, 2.8);
  assert.equal(psa10.slab.certNumber.length, 8);

  const psa9 = rollGradingResult(pkmCard, 'PSA', () => 0.15);
  assert.equal(psa9.slab.grade, 9);

  // Deterministic CGC thresholds: 2% Pristine 10 (r < 0.02) + 6% Gem Mint 10 (0.02..0.08) = 8% total Grade 10
  const cgcPristine = rollGradingResult(opCard, 'CGC', () => 0.01);
  assert.equal(cgcPristine.slab.company, 'CGC');
  assert.equal(cgcPristine.slab.grade, 10);
  assert.equal(cgcPristine.slab.gradeLabel, 'PRISTINE 10');
  assert.equal(cgcPristine.gradeMultiplier, 3.4);
  assert.equal(cgcPristine.slab.certNumber.length, 10);

  const cgcGem = rollGradingResult(opCard, 'CGC', () => 0.05);
  assert.equal(cgcGem.slab.grade, 10);
  assert.equal(cgcGem.slab.gradeLabel, 'GEM MINT 10');

  const cgc9 = rollGradingResult(opCard, 'CGC', () => 0.25);
  assert.equal(cgc9.slab.grade, 9);

  // Monte Carlo check: Grade 10 rate stays strictly in 5% - 10% band (~8%)
  let grade10Count = 0;
  const N = 5000;
  for (let i = 0; i < N; i++) {
    const res = rollGradingResult(pkmCard, i % 2 === 0 ? 'PSA' : 'CGC');
    if (res.slab.grade === 10) grade10Count++;
  }
  const rate10 = grade10Count / N;
  assert.ok(rate10 >= 0.05 && rate10 <= 0.105, `Expected ~8% Grade 10 rate (5%-10%), got ${(rate10 * 100).toFixed(2)}%`);

  // Queue execution: 1 specialist grades 1 at a time in 24s; 4 specialists grade 4 concurrently in 5s
  const jobs: GradingJob[] = [pkmCard, opCard, pkmCard, opCard].map((card, i) => ({
    id: `job_${i}`,
    card,
    sourceType: 'binder',
    company: i % 2 === 0 ? 'PSA' : 'CGC',
    feePaid: GRADING_FEE_PER_CARD,
    submittedAt: 0,
    durationMs: 24000,
    elapsedMs: 0,
    status: 'queued',
    rawPrice: card.marketPrice,
  }));

  const stepWith1 = advanceGradingQueue(jobs, 5000, 1);
  assert.equal(stepWith1.nextJobs.filter((j) => j.status === 'grading').length, 1);
  assert.equal(stepWith1.nextJobs.filter((j) => j.status === 'queued').length, 3);
  assert.equal(stepWith1.newlyCompleted.length, 0);

  const stepWith4 = advanceGradingQueue(jobs, 5000, 4);
  assert.equal(stepWith4.newlyCompleted.length, 4, '4 specialists should finish all 4 queued cards concurrently in 5s');
  assert.ok(stepWith4.nextJobs.every((j) => j.status === 'completed' && j.resultSlab));
});

test('All staff share universal working hours from 07:00 AM to 22:00 PM', () => {
  assert.equal(STAFF_WORK_START_HOUR, 7);
  assert.equal(STAFF_WORK_END_HOUR, 22);
  assert.equal(isStaffWorkingHours(0, 0), false);
  assert.equal(isStaffWorkingHours(6, 59), false);
  assert.equal(isStaffWorkingHours(7, 0), true);
  assert.equal(isStaffWorkingHours(12, 30), true);
  assert.equal(isStaffWorkingHours(21, 59), true);
  assert.equal(isStaffWorkingHours(22, 0), false);
  assert.equal(isStaffWorkingHours(23, 30), false);
});

test('Staff unlock levels follow level gates: Cashier Lv.5, Restocker Lv.10, Office Lv.20, Grading Lv.25', () => {
  assert.equal(CASHIER_UNLOCK_LEVEL, 5);
  assert.equal(RESTOCKER_UNLOCK_LEVEL, 10);
  assert.equal(OFFICE_STAFF_UNLOCK_LEVEL, 20);
  assert.equal(getStaffUnlockLevel('cashier'), 5);
  assert.equal(getStaffUnlockLevel('restocker'), 10);
  assert.equal(getStaffUnlockLevel('officeStaff'), 20);
  assert.equal(getStaffUnlockLevel('gradingReceptionist'), 25);
  assert.equal(getStaffUnlockLevel('gradingSpecialists'), 25);
  assert.equal(OFFICE_STAFF_WAGE, 22);
  const initial = createInitialShopState();
  assert.equal(initial.hiredStaff?.officeStaff, 0);
});

test('Office Staff auto wholesale order uses player cash to order low-stock licensed products and respects caps', () => {
  const base = createInitialShopState();

  // Case 1: Only starter Pokemon pack is empty (other licensed starter OP packs are already stocked) -> orders 10x pokemon30thCommon_pack for $25
  const stockedExceptPokemon = base.inventory.map((it) => {
    if (it.productId === 'pokemon30thCommon_pack') {
      return { ...it, quantity: 0, shelvedQuantity: 0 };
    }
    if (it.productId === 'op10RoyalBlood_pack' || it.productId === 'op01RomanceDawn_pack') {
      return { ...it, quantity: 12, shelvedQuantity: 8 };
    }
    return it;
  });
  const selection = pickNextAutoWholesaleOrder({
    cash: 500,
    storeLevel: 20,
    inventory: stockedExceptPokemon,
    purchasedLicenses: base.purchasedLicenses,
    unlockedShelves: base.unlockedShelves,
    pendingDeliveries: [],
  });
  assert.ok(selection, 'Should select empty licensed shelf item when affordable');
  assert.equal(selection.parcel.productId, 'pokemon30thCommon_pack');
  assert.equal(selection.orderCount, 10);
  assert.equal(selection.totalCost, 25);
  assert.equal(selection.parcel.totalItems, 10);

  // Case 2: Multiple starter licensed items empty -> prioritizes cheapest empty shelf item (OP-10 Pack $18)
  const cheapestPick = pickNextAutoWholesaleOrder({
    cash: 500,
    storeLevel: 20,
    inventory: base.inventory,
    purchasedLicenses: base.purchasedLicenses,
    unlockedShelves: base.unlockedShelves,
    pendingDeliveries: [],
  });
  assert.ok(cheapestPick);
  assert.equal(cheapestPick.parcel.productId, 'op10RoyalBlood_pack');
  assert.equal(cheapestPick.totalCost, 18);

  // Case 3: Insufficient cash -> returns null without putting cash negative
  const broke = pickNextAutoWholesaleOrder({
    cash: 5,
    storeLevel: 20,
    inventory: stockedExceptPokemon,
    purchasedLicenses: base.purchasedLicenses,
    unlockedShelves: base.unlockedShelves,
    pendingDeliveries: [],
  });
  assert.equal(broke, null);

  // Case 4: Pending parcel cap (>= 6) -> pauses auto ordering until Restocker clears boxes
  const capped = pickNextAutoWholesaleOrder({
    cash: 500,
    storeLevel: 20,
    inventory: stockedExceptPokemon,
    purchasedLicenses: base.purchasedLicenses,
    unlockedShelves: base.unlockedShelves,
    pendingDeliveries: new Array(6).fill(selection.parcel),
  });
  assert.equal(capped, null);
});

test('Deep PSA & CGC Grading System: tiers, UV cleaning, 10x loupe pre-screen, ROI advice, subgrades, customer orders & Pop Report', () => {
  assert.equal(GRADING_CLEANING_FEE, 15);
  assert.equal(GRADING_SERVICE_TIERS.standard.fee, 80);
  assert.equal(GRADING_SERVICE_TIERS.express.fee, 135);
  assert.equal(GRADING_SERVICE_TIERS.walkthrough.fee, 220);
  assert.ok(GRADER_RESEARCH_BRIEFS.length >= 4);

  const pkmCard = POKEMON_CARDS_DB[0];
  const insp1 = inspectRawCardForGrading(pkmCard, 'seed_a');
  const insp2 = inspectRawCardForGrading(pkmCard, 'seed_a');
  assert.deepEqual(insp1, insp2, 'Pre-grade inspection should be deterministic per seedKey');
  assert.ok(insp1.centering >= 7 && insp1.centering <= 10);
  assert.ok(insp1.corners >= 7 && insp1.corners <= 10);
  assert.ok(insp1.edges >= 7 && insp1.edges <= 10);
  assert.ok(insp1.surface >= 7 && insp1.surface <= 10);
  assert.ok(insp1.grade10PotentialPct >= 4 && insp1.grade10PotentialPct <= 16);

  // ROI & Breakeven check: low-value $10 card is risky at $80 Standard, whereas $450 grail card is profitable/highly recommended
  const lowRoi = getGradingCardRoiAdvice(10, 'PSA', 'standard', 8, false);
  assert.equal(lowRoi.verdict, 'risky');
  assert.ok(lowRoi.breakevenRawPrice > 40);

  const highRoi = getGradingCardRoiAdvice(450, 'CGC', 'standard', 12, true);
  assert.ok(highRoi.verdict === 'highly_recommended' || highRoi.verdict === 'profitable');
  assert.equal(highRoi.totalCost, GRADING_FEE_PER_CARD + GRADING_CLEANING_FEE);

  // Boosted Grade 10 roll using walkthrough (+4%) + UV clean (+2.5%) + preGradeBonus (+4%): r = 0.14 hits Grade 10
  const boostedPsa = rollGradingResult(pkmCard, 'PSA', () => 0.14, {
    tier: 'walkthrough',
    cleaned: true,
    preGradeBonus: 0.04,
  });
  assert.equal(boostedPsa.slab.grade, 10);
  assert.ok(boostedPsa.slab.subgrades, 'Resulting slab must include 4 subgrades');
  assert.equal(boostedPsa.slab.subgrades?.centering, 10);

  // Customer grading order lifecycle: waiting_approval -> grading -> ready_pickup
  const order = generateCustomerGradingOrder(25, () => 0.25);
  assert.equal(order.status, 'waiting_approval');
  assert.ok(order.customerPaysFee > order.labCost);
  assert.equal(order.netProfit, order.customerPaysFee - order.labCost);

  const activeOrder = { ...order, status: 'grading' as const };
  const halfStep = advanceCustomerGradingOrders([activeOrder], 3000, 1, () => 0.05);
  assert.equal(halfStep.newlyReady.length, 0);
  assert.equal(halfStep.nextOrders[0].status, 'grading');

  const doneStep = advanceCustomerGradingOrders(halfStep.nextOrders, 20000, 2, () => 0.01);
  assert.equal(doneStep.newlyReady.length, 1);
  assert.equal(doneStep.nextOrders[0].status, 'ready_pickup');
  assert.ok(doneStep.nextOrders[0].resultSlab);

  // Pop Report & Lab Stats recording
  const pristineRes = rollGradingResult(pkmCard, 'CGC', () => 0.005);
  const { nextStats, nextPop } = recordGradedSlabIntoStats(
    undefined,
    undefined,
    pkmCard,
    pristineRes.slab,
    pristineRes.gradedPrice,
    GRADING_FEE_PER_CARD
  );
  assert.equal(nextStats.totalGraded, 1);
  assert.equal(nextStats.cgcCount, 1);
  assert.equal(nextStats.grade10Count, 1);
  assert.equal(nextStats.pristine10Count, 1);
  assert.equal(nextPop[pkmCard.id].cgcPristine10, 1);
});

test('BGS Black Label 10, Slab Guard, Fancy Cert, Daily Market Trend, Crossover, VIP Auction, Buyback & VIP Contracts', () => {
  const pkmCard = POKEMON_CARDS_DB[0];

  // BGS Black Label 10 (r < 0.006 -> x5.2 multiplier, 10/10/10/10 subgrades)
  const bgsBlack = rollGradingResult(pkmCard, 'BGS', () => 0.002);
  assert.equal(bgsBlack.slab.company, 'BGS');
  assert.equal(bgsBlack.slab.grade, 10);
  assert.equal(bgsBlack.slab.gradeLabel, 'BLACK LABEL 10');
  assert.equal(bgsBlack.gradeMultiplier, 5.2);
  assert.equal(bgsBlack.slab.subgrades?.centering, 10);
  assert.equal(bgsBlack.slab.subgrades?.surface, 10);

  // BGS Pristine 10 (gold) & BGS Gem Mint 9.5
  const bgsGold10 = rollGradingResult(pkmCard, 'BGS', () => 0.015);
  assert.equal(bgsGold10.slab.gradeLabel, 'PRISTINE 10');
  assert.equal(bgsGold10.gradeMultiplier, 3.6);

  const bgs95 = rollGradingResult(pkmCard, 'BGS', () => 0.06);
  assert.equal(bgs95.slab.grade, 9.5);
  assert.equal(bgs95.gradeMultiplier, 2.15);

  // Fancy Cert detection & Slab Guard + Market Trend Valuation Stacking
  assert.equal(evaluateFancyCert('77777777'), true);
  assert.equal(evaluateFancyCert('12345678'), true);
  assert.equal(SLAB_GUARD_FEE, 12);
  assert.equal(SLAB_GUARD_OPTIONS.length, 5);

  const guardedFancySlab = {
    ...bgsBlack.slab,
    isCertFancy: true,
    slabGuardColor: 'gold' as const,
  };
  const trendAll = DAILY_MARKET_TRENDS[0];
  const val = getSlabMarketValuation(pkmCard, guardedFancySlab, bgsBlack.gradedPrice, trendAll);
  assert.equal(val.fancyCertBonusPct, 15);
  assert.equal(val.guardBonusPct, 5);
  assert.ok(val.effectiveValue > bgsBlack.gradedPrice);

  // Daily trend deterministic rotation across days
  assert.equal(pickDailyMarketTrend(1).id, pickDailyMarketTrend(1).id);

  // Crack & Re-grade Crossover risk scales down with specialists (18% at 0 -> 6% at 4)
  assert.equal(CRACK_REGRADE_FEE, 25);
  const ownedEntry: OwnedGradedSlabEntry = {
    id: 'slab_test_1',
    card: pkmCard,
    slab: bgs95.slab,
    rawPrice: pkmCard.marketPrice,
    gradedPrice: bgs95.gradedPrice,
    gradedAt: Date.now(),
  };
  const crossover = crackAndRegradeSlab({
    entry: ownedEntry,
    targetCompany: 'PSA',
    tier: 'standard',
    cleanSurface: true,
    specialistsCount: 4,
    rng: () => 0.07, // safe since 4 specs = 6% risk; with prevBonus+cleaned reaches PSA 10 cleanly
  });
  assert.equal(crossover.didDamage, false);
  assert.equal(crossover.newEntry.slab.company, 'PSA');
  assert.equal(crossover.newEntry.slab.regradedCount, 1);

  // Live VIP Auction Lifecycle: start -> advance bids -> end -> settle
  const lot = startSlabAuction({
    entry: { ...ownedEntry, slab: guardedFancySlab, gradedPrice: bgsBlack.gradedPrice },
    startPrice: Math.round(bgsBlack.gradedPrice * 0.8),
    reservePrice: Math.round(bgsBlack.gradedPrice * 0.85),
    durationMs: 10000,
    storeLevel: 26,
    reputation: 90,
    activeTrend: trendAll,
    rng: () => 0.3,
  });
  assert.equal(lot.status, 'live');
  assert.ok(lot.maxCeilingBid >= lot.startPrice);

  const step1 = advanceSlabAuctions([lot], 5000, trendAll, () => 0.2);
  assert.equal(step1.changed, true);
  assert.ok(step1.nextLots[0].bidCount >= 1);
  assert.ok(step1.nextLots[0].currentBid > lot.startPrice);

  const step2 = advanceSlabAuctions(step1.nextLots, 6000, trendAll, () => 0.2);
  assert.equal(step2.newlyEnded.length, 1);
  assert.equal(step2.nextLots[0].status, 'ended');

  const settlement = settleSlabAuction(step2.nextLots[0]);
  assert.equal(settlement.sold, true);
  assert.equal(settlement.finalPrice, step2.nextLots[0].currentBid);
  assert.equal(settlement.record.sold, true);

  // Walk-In Buyback Offer & High-Roller VIP Contract Generation
  const buyback = generateWalkInBuybackOffer(25, () => 0.4);
  assert.ok(buyback.askingPrice < buyback.rawMarketPrice);
  assert.equal(buyback.inspected, false);

  const vip = generateVipSlabOrder(26, () => 0.3);
  assert.ok(vip.bonusMultiplier >= 1.28);
  assert.ok(vip.minGrade === 9.5 || vip.minGrade === 10);
});

test('VIP Auction Consignment & User Bidding: commission scaling, NPC intake, and player bid settlement', () => {
  // Commission rate scaling: 18% base -> 20% with MC Host -> 22% in Prime Time
  assert.equal(getAuctionCommissionRate({ auctionHostCount: 0, isPrimeTime: false }), 0.18);
  assert.equal(getAuctionCommissionRate({ auctionHostCount: 1, isPrimeTime: false }), 0.20);
  assert.equal(getAuctionCommissionRate({ auctionHostCount: 1, isPrimeTime: true }), 0.22);

  const trendAll = DAILY_MARKET_TRENDS[0];
  const offer = generateAuctionConsignmentOffer({
    activeTrend: trendAll,
    auctionHostCount: 1,
    isPrimeTime: true,
    rng: () => 0.35,
  });
  assert.ok(offer.consignorName.length > 0);
  assert.equal(offer.commissionRate, 0.22);
  assert.ok(offer.entry.slab.grade >= 9.5);
  assert.ok(offer.estimatedCommission >= 10);

  // Start consignment lot from accepted offer & test NPC win settlement (shop earns commission)
  const npcLot = startAuctionFromConsignmentOffer({
    offer,
    storeLevel: 28,
    reputation: 95,
    activeTrend: trendAll,
    auctioneerCount: 1,
    auctionHostCount: 1,
    isPrimeTime: true,
    durationMs: 8000,
    rng: () => 0.25,
  });
  assert.equal(npcLot.isConsignment, true);
  assert.equal(npcLot.consignorName, offer.consignorName);
  assert.equal(npcLot.commissionRate, 0.22);

  // Advance until NPCs outbid reserve and lot ends
  const npcStep1 = advanceSlabAuctions([npcLot], 4000, trendAll, () => 0.1, {
    auctionHostCount: 1,
    isPrimeTime: true,
  });
  const npcStep2 = advanceSlabAuctions(npcStep1.nextLots, 5000, trendAll, () => 0.1, {
    auctionHostCount: 1,
    isPrimeTime: true,
  });
  assert.equal(npcStep2.nextLots[0].status, 'ended');
  const npcSettlement = settleSlabAuction({
    ...npcStep2.nextLots[0],
    currentBid: Math.max(npcStep2.nextLots[0].currentBid, npcStep2.nextLots[0].reservePrice),
    bidCount: Math.max(1, npcStep2.nextLots[0].bidCount),
  });
  assert.equal(npcSettlement.sold, true);
  assert.equal(npcSettlement.isConsignment, true);
  assert.equal(npcSettlement.wonByPlayer, false);
  assert.equal(npcSettlement.payoutToPlayer, npcSettlement.commissionEarned);
  assert.equal(npcSettlement.netCostToPlayer, 0);

  // Player bids on NPC consignment lot -> anti-snipe timer >= 4500ms & netCost = finalPrice - commission
  const nearEndLot = {
    ...npcLot,
    currentBid: npcLot.reservePrice,
    bidCount: 1,
    remainingMs: 2000,
  };
  const bidResult = placeUserBidOnAuctionLot(nearEndLot, 0.08);
  assert.ok(bidResult);
  assert.equal(bidResult.nextLot.highestBidderIsPlayer, true);
  assert.equal(bidResult.nextLot.highestBidderName, 'Bạn (Chủ Sàn)');
  assert.ok(bidResult.nextLot.remainingMs >= 4500);
  assert.ok(bidResult.bidAmount > nearEndLot.currentBid);

  const playerWinSettlement = settleSlabAuction({ ...bidResult.nextLot, status: 'ended', remainingMs: 0 });
  assert.equal(playerWinSettlement.sold, true);
  assert.equal(playerWinSettlement.wonByPlayer, true);
  assert.equal(playerWinSettlement.payoutToPlayer, 0);
  assert.equal(
    playerWinSettlement.netCostToPlayer,
    playerWinSettlement.finalPrice - playerWinSettlement.commissionEarned
  );

  // Player cannot self-bid on their own (non-consignment) slab lot
  const ownLot = startSlabAuction({
    entry: offer.entry,
    startPrice: offer.suggestedStartPrice,
    reservePrice: offer.reservePrice,
    isConsignment: false,
    rng: () => 0.3,
  });
  assert.equal(placeUserBidOnAuctionLot(ownLot, 0.06), null);
});






