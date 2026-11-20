import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CARD_EXCHANGE_CONFIG,
  boxMullerRandom,
  calculateUniqueCardPrice,
  getInitialMarketCatalog,
  getInitialVault,
  getOrderBookForCard,
  tickPriceEngine,
  loadCardExchangeState,
  saveCardExchangeState,
  UniqueCardItem,
  CardExchangeState,
  MARKET_CANDLE_RULES,
  aggregateCandles,
  generateTimeframeCandles,
} from './cardExchangeLogic';

test('Card Exchange CONFIG: disclaimer, fees, price engine & event constants are present', () => {
  assert.equal(
    CARD_EXCHANGE_CONFIG.DISCLAIMER,
    'Mô phỏng trong game, không phải lời khuyên tài chính.'
  );
  assert.equal(CARD_EXCHANGE_CONFIG.FEES.ORDER_TAX_RATE, 0.01);
  assert.equal(CARD_EXCHANGE_CONFIG.FEES.REALIZED_PROFIT_TAX_RATE, 0.10);
  assert.equal(CARD_EXCHANGE_CONFIG.PREMIUMS.LOW_SERIAL_THRESHOLD, 0.10);
  assert.equal(CARD_EXCHANGE_CONFIG.PREMIUMS.LOW_SERIAL_PREMIUM, 0.15);
  assert.equal(CARD_EXCHANGE_CONFIG.PREMIUMS.FIRST_PULL_PREMIUM, 0.05);

  assert.equal(CARD_EXCHANGE_CONFIG.PRICE_ENGINE.VOLATILITY_SIGMA.Common, 0.01);
  assert.equal(CARD_EXCHANGE_CONFIG.PRICE_ENGINE.VOLATILITY_SIGMA.Rare, 0.02);
  assert.equal(CARD_EXCHANGE_CONFIG.PRICE_ENGINE.VOLATILITY_SIGMA.SuperRare, 0.03);
  assert.equal(CARD_EXCHANGE_CONFIG.PRICE_ENGINE.VOLATILITY_SIGMA.AltArt, 0.05);
  assert.equal(CARD_EXCHANGE_CONFIG.PRICE_ENGINE.VOLATILITY_SIGMA.Manga, 0.07);
  assert.equal(CARD_EXCHANGE_CONFIG.PRICE_ENGINE.VOLATILITY_SIGMA.SecretRare, 0.07);
  assert.equal(CARD_EXCHANGE_CONFIG.PRICE_ENGINE.HYPE_DAILY_DECAY, 0.20);

  assert.equal(CARD_EXCHANGE_CONFIG.EVENTS.REPRINT_DROP, -0.30);
  assert.equal(CARD_EXCHANGE_CONFIG.EVENTS.OP_ROTATION_DROP, -0.25);
  assert.equal(CARD_EXCHANGE_CONFIG.EVENTS.GRADING_FAIL_DROP, -0.15);
});

test('Box-Muller: generates standard normal random numbers with realistic spread', () => {
  const samples: number[] = [];
  for (let i = 0; i < 1000; i++) {
    samples.push(boxMullerRandom());
  }
  const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
  // Mean should be close to 0 within tolerance
  assert.ok(Math.abs(mean) < 0.25, `Expected mean near 0, got ${mean}`);
});

test('Unique Card Pricing: applies +15% low serial and +5% first pull premiums', () => {
  const testCard: UniqueCardItem = {
    id: 'test_card_1',
    cardCode: 'OP05-119-MANGA',
    name: 'Luffy Manga',
    franchise: 'onepiece',
    rarity: 'Manga',
    imageUrl: '🏴‍☠️',
    serial: { number: 5, total: 100 }, // 5/100 = 5% <= 10% threshold!
    condition: 'Gem Mint',
    ownerHistory: [],
    isFirstOwner: true, // +5%
    basePrice: 100,
    purchasePrice: 100,
    acquiredAtDay: 1,
    acquiredAtHour: 10,
  };

  const pricing = calculateUniqueCardPrice(testCard, 100);
  assert.equal(pricing.basePrice, 100);
  assert.equal(pricing.lowSerialBonus, 15); // +15%
  assert.equal(pricing.firstPullBonus, 5); // +5%
  assert.equal(pricing.isLowSerial, true);
  assert.equal(pricing.finalPrice, 120);

  // Card without low serial (50/100 = 50% > 10%) and not first owner
  const normalCard: UniqueCardItem = {
    ...testCard,
    serial: { number: 50, total: 100 },
    isFirstOwner: false,
  };
  const normalPricing = calculateUniqueCardPrice(normalCard, 100);
  assert.equal(normalPricing.lowSerialBonus, 0);
  assert.equal(normalPricing.firstPullBonus, 0);
  assert.equal(normalPricing.finalPrice, 100);
});

test('Order Book: generates bids, asks, spread and integrates player limit orders', () => {
  const ob = getOrderBookForCard('OP01-004', 10, [
    {
      id: 'order_1',
      cardCode: 'OP01-004',
      cardName: 'Usopp',
      type: 'buy',
      price: 9.8,
      volume: 5,
      filledVolume: 0,
      createdAt: Date.now(),
      gameDay: 1,
      gameHour: 10,
      status: 'open',
    },
  ]);

  assert.ok(ob.bids.length > 0);
  assert.ok(ob.asks.length > 0);
  assert.ok(ob.spread >= 0);
  const playerBid = ob.bids.find((b) => b.isPlayerOrder);
  assert.ok(playerBid, 'Player limit buy order must be present in order book');
  assert.equal(playerBid.price, 9.8);
});

test('Price Engine Tick: updates prices, generates candles and handles MM/Meme regimes', () => {
  const catalog = getInitialMarketCatalog();
  const { uniqueCards, fungibleStacks } = getInitialVault();

  const testState: CardExchangeState = {
    hasSeenIntro: true,
    marketCards: catalog,
    vaultUniqueCards: uniqueCards,
    vaultFungibleStacks: fungibleStacks,
    activeOrders: [],
    tradeHistory: [],
    billTaxRecords: [],
    marketEvents: [],
    lastTickDay: 1,
    lastTickHour: 8,
  };

  // High-end card should be bluechip MM regime with authentic price
  const luffyCard = catalog['OP05-119-MANGA'];
  assert.equal(luffyCard.regime, 'bluechip_mm');
  assert.ok(luffyCard.currentPrice >= 3000, `Luffy should be ~$4,200, got ${luffyCard.currentPrice}`);

  // Penny card should be meme ponzi regime with penny price
  const usoppCard = catalog['OP01-004'];
  assert.equal(usoppCard.regime, 'meme_ponzi');
  assert.ok(usoppCard.currentPrice <= 2.0, `Usopp should be penny card < $2.0, got ${usoppCard.currentPrice}`);

  const initialCandlesCount = luffyCard.candles.length;

  const { updatedState } = tickPriceEngine(testState, 1, 9);
  const updatedLuffy = updatedState.marketCards['OP05-119-MANGA'];
  const updatedUsopp = updatedState.marketCards['OP01-004'];

  assert.ok(updatedLuffy.currentPrice > 0);
  assert.equal(updatedLuffy.candles.length, initialCandlesCount + 1);
  assert.ok(updatedUsopp.currentPrice > 0);
  assert.equal(updatedUsopp.candles.length, usoppCard.candles.length + 1);
});

test('Candlestick Multi-Market Rules: verifies exact conversion ratios per market', () => {
  // 1. Crypto 24/7 (Phép chia thời gian rất chẵn)
  const crypto = MARKET_CANDLE_RULES.crypto;
  assert.equal(crypto.conversion['1W_to_1D'].count, 7, 'Crypto 1W -> 1D must be 7 candles (24/7)');
  assert.equal(crypto.conversion['1D_to_4H'].count, 6, 'Crypto 1D -> 4H must be 6 candles (24h/4h)');
  assert.equal(crypto.conversion['4H_to_1H'].count, 4, 'Crypto 4H -> 1H must be 4 candles');
  assert.equal(crypto.conversion['1H_to_15M'].count, 4, 'Crypto 1H -> 15M must be 4 candles');
  assert.equal(crypto.conversion['15M_to_5M'].count, 3, 'Crypto 15M -> 5M must be 3 candles');
  assert.equal(crypto.conversion['5M_to_1m'].count, 5, 'Crypto 5M -> 1M must be 5 candles');

  // 2. Forex / Vàng 24/5 (Nghỉ cuối tuần)
  const forex = MARKET_CANDLE_RULES.forex;
  assert.equal(forex.conversion['1W_to_1D'].count, 5, 'Forex 1W -> 1D must be 5 candles (T2 - T6)');
  assert.equal(forex.conversion['1D_to_4H'].count, 6, 'Forex 1D -> 4H must be 6 candles');
  assert.equal(forex.conversion['4H_to_1H'].count, 4, 'Forex 4H -> 1H must be 4 candles');
  assert.equal(forex.conversion['1H_to_15M'].count, 4, 'Forex 1H -> 15M must be 4 candles');
  assert.equal(forex.conversion['15M_to_5M'].count, 3, 'Forex 15M -> 5M must be 3 candles');

  // 3. Chứng khoán Việt Nam HOSE (Khớp lệnh ~4.5h/ngày)
  const hose = MARKET_CANDLE_RULES.hose;
  assert.equal(hose.conversion['1W_to_1D'].count, 5, 'HOSE 1W -> 1D must be 5 candles (T2 - T6)');
  assert.equal(hose.conversion['1D_to_4H'].count, 2, 'HOSE 1D -> 4H must be 2 candles (Sáng & Chiều)');
  assert.equal(hose.conversion['4H_to_1H'].count, 4, 'HOSE 4H -> 1H must be 4 candles');
  assert.equal(hose.conversion['1H_to_15M'].count, 4, 'HOSE 1H -> 15M must be 4 candles');
  assert.equal(hose.conversion['15M_to_5M'].count, 3, 'HOSE 15M -> 5M must be 3 candles');
});

test('OHLC Aggregation Principle: Open=first, Close=last, High=max, Low=min, Vol=sum', () => {
  const subCandles = [
    { timeLabel: '09:00', timestamp: 1000, open: 100, high: 108, low: 98, close: 105, volume: 50 },
    { timeLabel: '09:15', timestamp: 1015, open: 105, high: 115, low: 104, close: 112, volume: 75 }, // Đỉnh High: 115
    { timeLabel: '09:30', timestamp: 1030, open: 112, high: 113, low: 92, close: 95, volume: 120 }, // Đáy Low: 92
    { timeLabel: '09:45', timestamp: 1045, open: 95, high: 102, low: 94, close: 99, volume: 60 },   // Close cuối: 99
  ];

  const masterCandle = aggregateCandles(subCandles, '09:00 - 10:00', 1045, '1H', 'crypto');

  assert.ok(masterCandle, 'Master candle must be generated');
  assert.equal(masterCandle.open, 100, 'Master Open must strictly match first sub-candle Open');
  assert.equal(masterCandle.close, 99, 'Master Close must strictly match last sub-candle Close');
  assert.equal(masterCandle.high, 115, 'Master High must strictly match peak High among all sub-candles');
  assert.equal(masterCandle.low, 92, 'Master Low must strictly match trough Low among all sub-candles');
  assert.equal(masterCandle.volume, 305, 'Master Volume must equal sum of all sub-candles (50+75+120+60)');
  assert.equal(masterCandle.subCandlesCount, 4);
  assert.equal(masterCandle.subCandles?.length, 4);
});

test('Multi-Timeframe Generator: synthesizes 1m, 5m, 15m, 1H, 4H, 1D, 1W with market conversion', () => {
  // Crypto 1W
  const crypto1W = generateTimeframeCandles(100, 'SuperRare', 'bluechip_mm', '1W', 120, 10, 11, 'crypto');
  assert.ok(crypto1W.length > 0, 'Crypto 1W candles must be generated');
  const last1W = crypto1W[crypto1W.length - 1];
  assert.equal(last1W.timeframe, '1W');
  assert.equal(last1W.marketMode, 'crypto');
  assert.ok(last1W.subCandlesCount && last1W.subCandlesCount > 0, 'Aggregated candle must contain sub-candles count');

  // HOSE 1D (2 nến 4H / ngày)
  const hose1D = generateTimeframeCandles(50, 'Rare', 'bluechip_mm', '1D', 55, 5, 14, 'hose');
  assert.ok(hose1D.length > 0, 'HOSE 1D candles must be generated');
  const lastHose1D = hose1D[hose1D.length - 1];
  assert.equal(lastHose1D.marketMode, 'hose');
  assert.equal(lastHose1D.timeframe, '1D');

  // 15m (3 nến 5m)
  const tf15m = generateTimeframeCandles(20, 'Common', 'meme_ponzi', '15m', 22, 2, 10, 'crypto');
  assert.ok(tf15m.length > 0);
  assert.equal(tf15m[tf15m.length - 1].timeframe, '15m');
});

