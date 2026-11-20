/**
 * Sàn Thẻ TCG Exchange - GMGN Pro Trading Terminal (Balanced & Responsive)
 * "Mô phỏng trong game, không phải lời khuyên tài chính."
 *
 * Căn chỉnh hoàn hảo tỉ lệ hiển thị trên Tablet:
 * - Card Art hiển thị rõ nét, kích thước chuẩn thẻ bài.
 * - Live Candlestick Chart chuyển động thời gian thực (live pulse & micro-ticks).
 * - Bảng Mua/Bán gọn gàng, đầy đủ nút, không bị che khuất hay kéo cuộn khó chịu.
 * - Đã xóa: Callout, Sao chép GD, Giám sát, P1/P2/P3, Gas.
 * - Phần dưới (Hoạt động, Kho thẻ, Sổ lệnh, Lệnh treo) rộng rãi, tương tác mượt mà.
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  CARD_EXCHANGE_CONFIG,
  CardExchangeState,
  MarketCardMeta,
  UniqueCardItem,
  FungibleCardStack,
  LimitOrder,
  TradeHistoryRecord,
  BillTaxRecord,
  CardRarity,
  CardFranchise,
  loadCardExchangeState,
  saveCardExchangeState,
  calculateUniqueCardPrice,
  getOrderBookForCard,
  tickPriceEngine,
  boxMullerRandom,
  generateTimeframeCandles,
  ChartTimeframe,
  CandleStick,
  MarketModeType,
  MARKET_CANDLE_RULES,
} from '../game/cardExchangeLogic';
import { ShopState } from '../game/pokemonShopLogic';
import { soundManager } from '../game/audio';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Layers,
  History,
  Info,
  DollarSign,
  AlertTriangle,
  Search,
  ArrowRight,
  ShieldAlert,
  Sparkles,
  Award,
  Clock,
  CheckCircle2,
  X,
  RefreshCw,
  PlusCircle,
  FileText,
  Flame,
  ShieldCheck,
  ChevronDown,
  Maximize2,
  Crosshair,
  Minus,
  Plus,
  Sliders,
  Sparkle,
  Image as ImageIcon,
  Zap,
  BarChart2,
} from 'lucide-react';

export interface LiveTradeItem {
  id: string;
  timeLabel: string;
  type: 'buy' | 'sell';
  mcLabel: string;
  cardCode: string;
  amount: number;
  usdValue: number;
  traderName: string;
  traderTag?: string;
}

export const TRADER_POOLS = [
  { name: 'thầy hùng TCG', tag: 'KOL' },
  { name: '0x83...0951', tag: 'Whale' },
  { name: '0x20...493c', tag: 'Smart' },
  { name: 'Pikachu_Sniper', tag: 'Sniper' },
  { name: 'Luffy_G5_Trader', tag: 'KOL' },
  { name: 'CáVoi_Wano', tag: 'Whale' },
  { name: 'Ash_Collector', tag: 'Smart' },
  { name: '0x99...b712', tag: 'Sniper' },
  { name: 'Zoro_Master', tag: 'KOL' },
  { name: 'Kaido_Fund', tag: 'Whale' },
];

export function generateSeedTradesForCard(cardCode: string, price: number, count = 12): LiveTradeItem[] {
  const times = ['vừa xong', '45s', '1m', '2m', '4m', '7m', '12m', '18m', '25m', '38m', '45m', '1h'];
  return Array.from({ length: count }, (_, idx) => {
    const isBuy = Math.random() > 0.42;
    let qty = 1;
    if (price < 1) {
      qty = Math.floor(10 + Math.random() * 90);
    } else if (price < 10) {
      qty = Math.floor(2 + Math.random() * 12);
    } else if (price < 100) {
      qty = Math.floor(1 + Math.random() * 6);
    } else {
      qty = Math.floor(1 + Math.random() * 3);
    }
    const totalUsd = Number((price * qty).toFixed(2));
    const trader = TRADER_POOLS[idx % TRADER_POOLS.length];
    return {
      id: `trade_${cardCode}_${idx}_${Date.now() - idx * 60000}`,
      timeLabel: times[idx] || `${(idx + 1) * 3}m`,
      type: isBuy ? 'buy' : 'sell',
      mcLabel: `$${(price * 1000).toLocaleString()}`,
      cardCode,
      amount: qty,
      usdValue: totalUsd,
      traderName: trader.name,
      traderTag: trader.tag,
    };
  });
}

interface CardExchangeAppViewProps {
  shopState: ShopState;
  activeProfileId?: string;
  onUpdateCash: (newCash: number) => void;
  onRecordBillTax?: (taxRecord: BillTaxRecord) => void;
  onBack: () => void;
}

export const CardExchangeAppView: React.FC<CardExchangeAppViewProps> = ({
  shopState,
  activeProfileId = 'default',
  onUpdateCash,
  onRecordBillTax,
  onBack,
}) => {
  // Exchange state persisted per player profile
  const [exchangeState, setExchangeState] = useState<CardExchangeState>(() =>
    loadCardExchangeState(activeProfileId)
  );

  const [selectedFranchise, setSelectedFranchise] = useState<'all' | 'onepiece' | 'pokemon'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCardCode, setSelectedCardCode] = useState<string>('OP05-119-MANGA');
  const currentCard = exchangeState.marketCards[selectedCardCode] || Object.values(exchangeState.marketCards)[0];
  const [showCardPicker, setShowCardPicker] = useState<boolean>(false);
  const [showIntroModal, setShowIntroModal] = useState<boolean>(!exchangeState.hasSeenIntro);
  const [showSyncShopModal, setShowSyncShopModal] = useState<boolean>(false);
  const [selectedUniqueCardForHistory, setSelectedUniqueCardForHistory] = useState<UniqueCardItem | null>(null);
  const [previewArtUrl, setPreviewArtUrl] = useState<string | null>(null);

  // GMGN Layout Controls
  const [activeBottomTab, setActiveBottomTab] = useState<'activity' | 'positions' | 'orderbook' | 'orders'>('activity');
  const [activityFilter, setActivityFilter] = useState<'all' | 'kol' | 'smart' | 'whale' | 'sniper'>('all');
  const [chartTimeframe, setChartTimeframe] = useState<ChartTimeframe>('1H');
  const [marketMode, setMarketMode] = useState<MarketModeType>('crypto');
  const [selectedDrawingTool, setSelectedDrawingTool] = useState<'crosshair' | 'line' | 'fib' | 'brush' | 'text'>('crosshair');

  // Trading panel form state
  const [orderSide, setOrderSide] = useState<'buy' | 'sell'>('buy');
  const [orderType, setOrderType] = useState<'market' | 'limit'>('market');
  const [tradeVolume, setTradeVolume] = useState<number>(1);
  const [limitPriceInput, setLimitPriceInput] = useState<string>('');

  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);
  const [actionErrorMessage, setActionErrorMessage] = useState<string | null>(null);

  // Live simulation tick state (makes the candlestick chart LIVE and MOVING!)
  const [livePulseTick, setLivePulseTick] = useState<number>(0);
  const candleCacheRef = useRef<Record<string, CandleStick[]>>({});

  // Live trades feed categorized strictly per card code
  const [tradesByCard, setTradesByCard] = useState<Record<string, LiveTradeItem[]>>(() => {
    const initialMap: Record<string, LiveTradeItem[]> = {};
    initialMap['OP05-119-MANGA'] = generateSeedTradesForCard('OP05-119-MANGA', 3900, 12);
    return initialMap;
  });

  // Real-time chart tick loop: Chuyển động nến thời gian thực theo đúng chế độ MM Lái vs Meme Ponzi
  useEffect(() => {
    const liveInterval = setInterval(() => {
      setLivePulseTick((p) => p + 1);

      setExchangeState((prev) => {
        const next = { ...prev };
        const card = next.marketCards[selectedCardCode];
        if (!card || !card.candles || card.candles.length === 0) return prev;

        const lastIdx = card.candles.length - 1;
        const last = { ...card.candles[lastIdx] };

        let delta = 1;
        let volAdd = 1;
        const regime = card.regime || (card.currentPrice >= 20 ? 'bluechip_mm' : 'meme_ponzi');

        if (regime === 'meme_ponzi') {
          // Micro-tick cho Meme Penny Shitcoin
          if (card.memePhase === 'meme_pump') {
            // Đang bơm thổi: Tăng nhẹ đều đặn (+0.10% đến +0.30% mỗi 2.4s)
            delta = 1 + (0.0010 + 0.0020 * Math.random());
            volAdd = Math.floor(5 + Math.random() * 12);
          } else if (card.memePhase === 'rug_dump') {
            // Rug pull: Giảm dứt khoát (-0.15% đến -0.40% mỗi 2.4s)
            delta = 1 - (0.0015 + 0.0025 * Math.random());
            volAdd = Math.floor(6 + Math.random() * 15);
          } else if (card.memePhase === 'dead_cat_bounce') {
            delta = 1 + (Math.random() - 0.46) * 0.002;
            volAdd = Math.floor(2 + Math.random() * 5);
          } else {
            // long_sideway: Cạn vol, nến nằm im phẳng lì dao động siêu nhỏ
            delta = 1 + (Math.random() - 0.5) * 0.0004;
            volAdd = Math.random() < 0.25 ? 1 : 0;
          }
        } else {
          // Micro-tick cho Crypto Bluechip MM
          if (card.mmPhase === 'pump') {
            // MM đẩy giá bậc thang êm ái (+0.02% đến +0.06% mỗi 2.4s)
            delta = 1 + (0.0002 + 0.0004 * Math.random());
            volAdd = Math.floor(2 + Math.random() * 5);
          } else if (card.mmPhase === 'shakeout') {
            // Rũ bỏ quét stoploss nhẹ nhàng (-0.03% đến -0.07% mỗi 2.4s)
            delta = 1 - (0.0003 + 0.0005 * Math.random());
            volAdd = Math.floor(2 + Math.random() * 6);
          } else if (card.mmPhase === 'distribution') {
            delta = 1 + (Math.random() - 0.52) * 0.0005;
            volAdd = Math.floor(1 + Math.random() * 4);
          } else {
            // accumulation: tích lũy gom hàng êm đềm
            delta = 1 + (Math.random() - 0.49) * 0.0003;
            volAdd = Math.floor(1 + Math.random() * 3);
          }
        }

        const decimals = regime === 'meme_ponzi' ? 3 : 2;
        let microPrice = Number((last.close * delta).toFixed(decimals));

        if (regime === 'bluechip_mm') {
          const baseAnchor = card.baseAnchorPrice || 4200;
          if (microPrice > baseAnchor * 1.25 || microPrice < baseAnchor * 0.75) {
            microPrice = Number((baseAnchor * (0.98 + 0.04 * Math.random())).toFixed(2));
          } else {
            microPrice = Math.max(baseAnchor * 0.85, Math.min(baseAnchor * 1.18, microPrice));
          }
        } else {
          microPrice = Math.max(CARD_EXCHANGE_CONFIG.PRICE_ENGINE.MIN_PRICE, microPrice);
        }

        last.close = microPrice;
        last.high = Math.max(last.high, microPrice);
        last.low = Math.min(last.low, microPrice);
        last.volume += volAdd;

        const newCandles = [...card.candles];
        newCandles[lastIdx] = last;

        card.candles = newCandles;
        card.currentPrice = microPrice;
        card.high24h = Math.max(card.high24h, microPrice);
        card.low24h = Math.min(card.low24h, microPrice);

        return next;
      });
    }, 2400);

    return () => clearInterval(liveInterval);
  }, [selectedCardCode]);

  // Periodic simulated GMGN transactions feed strictly for the currently selected card
  useEffect(() => {
    const tradeInterval = setInterval(() => {
      if (!currentCard) return;
      const isBuy = Math.random() > 0.45;
      let qty = 1;
      if (currentCard.currentPrice < 1) {
        qty = Math.floor(8 + Math.random() * 50);
      } else if (currentCard.currentPrice < 10) {
        qty = Math.floor(2 + Math.random() * 10);
      } else if (currentCard.currentPrice < 100) {
        qty = Math.floor(1 + Math.random() * 5);
      } else {
        qty = Math.floor(1 + Math.random() * 2);
      }
      const usdVal = Number((currentCard.currentPrice * qty).toFixed(2));
      const trader = TRADER_POOLS[Math.floor(Math.random() * TRADER_POOLS.length)];

      const newTrade: LiveTradeItem = {
        id: `trade_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        timeLabel: 'vừa xong',
        type: isBuy ? 'buy' : 'sell',
        mcLabel: `$${(currentCard.currentPrice * 1000).toLocaleString()}`,
        cardCode: currentCard.cardCode, // STRICTLY matching selected card!
        amount: qty,
        usdValue: usdVal,
        traderName: trader.name,
        traderTag: trader.tag,
      };

      setTradesByCard((prev) => {
        const list = prev[currentCard.cardCode] || generateSeedTradesForCard(currentCard.cardCode, currentCard.currentPrice, 12);
        return {
          ...prev,
          [currentCard.cardCode]: [newTrade, ...list.slice(0, 24)],
        };
      });
    }, 3800);

    return () => clearInterval(tradeInterval);
  }, [currentCard]);

  // Sync state whenever day or hour advances
  useEffect(() => {
    if (
      shopState.currentDay !== exchangeState.lastTickDay ||
      shopState.inGameHour !== exchangeState.lastTickHour
    ) {
      const { updatedState, filledOrders } = tickPriceEngine(
        exchangeState,
        shopState.currentDay,
        shopState.inGameHour
      );

      for (const order of filledOrders) {
        if (order.type === 'buy') {
          const totalVal = order.price * order.volume;
          const fee = totalVal * CARD_EXCHANGE_CONFIG.FEES.ORDER_TAX_RATE;
          onUpdateCash(Math.max(0, shopState.cash - (totalVal + fee)));

          const existing = updatedState.vaultFungibleStacks[order.cardCode];
          if (existing) {
            existing.quantity += order.volume;
            existing.totalCostBasis += totalVal;
            existing.avgBuyPrice = Number((existing.totalCostBasis / existing.quantity).toFixed(2));
          } else {
            const meta = updatedState.marketCards[order.cardCode];
            updatedState.vaultFungibleStacks[order.cardCode] = {
              cardCode: order.cardCode,
              name: order.cardName,
              franchise: meta?.franchise || 'onepiece',
              rarity: meta?.rarity || 'Common',
              imageUrl: meta?.imageUrl || '🃏',
              quantity: order.volume,
              totalCostBasis: totalVal,
              avgBuyPrice: order.price,
            };
          }
        } else {
          const totalVal = order.price * order.volume;
          const fee = totalVal * CARD_EXCHANGE_CONFIG.FEES.ORDER_TAX_RATE;
          const stack = updatedState.vaultFungibleStacks[order.cardCode];
          const costBasis = stack ? stack.avgBuyPrice * order.volume : totalVal * 0.5;
          const profit = Math.max(0, totalVal - costBasis);
          const profitTax = profit * CARD_EXCHANGE_CONFIG.FEES.REALIZED_PROFIT_TAX_RATE;
          const netReceived = totalVal - fee - profitTax;

          onUpdateCash(shopState.cash + netReceived);

          if (profitTax > 0 && onRecordBillTax) {
            onRecordBillTax({
              id: `tax_${Date.now()}`,
              type: 'exchange_profit_tax',
              title: `Thuế Lợi Nhuận Sàn Thẻ (10%): ${order.cardName}`,
              description: `Khớp lệnh bán giới hạn ${order.volume}x ${order.cardCode}. Lãi: $${profit.toFixed(2)}.`,
              amount: Number(profitTax.toFixed(2)),
              gameDay: shopState.currentDay,
              gameHour: shopState.inGameHour,
              timestamp: Date.now(),
            });
          }
        }
      }

      setExchangeState(updatedState);
      saveCardExchangeState(activeProfileId, updatedState);
    }
  }, [shopState.currentDay, shopState.inGameHour]);

  const updateExchangeState = (updater: (prev: CardExchangeState) => CardExchangeState) => {
    setExchangeState((prev) => {
      const next = updater(prev);
      saveCardExchangeState(activeProfileId, next);
      return next;
    });
  };

  // Active Candles: Đảm bảo nến quá khứ (0..N-2) cố định 100%, chỉ nến hiện tại (N-1) chuyển động theo giá realtime
  const activeCandles = useMemo(() => {
    if (!currentCard) return [];

    // Nếu là khung 1H trên Crypto (mặc định chính của sàn): Sử dụng trực tiếp chuỗi nến từ state của thẻ
    if (chartTimeframe === '1H' && marketMode === 'crypto' && currentCard.candles && currentCard.candles.length > 0) {
      return currentCard.candles;
    }

    // Với các khung giờ khác (1m, 5m, 15m, 4H, 1D, 1W) hoặc sàn Forex/HOSE:
    // Khởi tạo một lần vào cache và giữ nguyên vẹn toàn bộ nến lịch sử
    const cacheKey = `${selectedCardCode}_${chartTimeframe}_${marketMode}_${shopState.currentDay}`;
    const cached = candleCacheRef.current[cacheKey];

    if (!cached || cached.length === 0) {
      const generated = generateTimeframeCandles(
        currentCard.baseAnchorPrice || currentCard.currentPrice,
        currentCard.rarity,
        currentCard.regime,
        chartTimeframe,
        currentCard.currentPrice,
        shopState.currentDay,
        shopState.inGameHour,
        marketMode
      );
      candleCacheRef.current[cacheKey] = generated;
      return generated;
    }

    // Giữ nguyên 100% tất cả các cây nến quá khứ (0 đến N-2)
    // Chỉ cập nhật cây nến đang hoạt động cuối cùng (N-1) theo biến động giá realtime
    const lastIdx = cached.length - 1;
    const last = { ...cached[lastIdx] };
    last.close = currentCard.currentPrice;
    last.high = Math.max(last.high, currentCard.currentPrice);
    last.low = Math.min(last.low, currentCard.currentPrice);

    const updated = [...cached];
    updated[lastIdx] = last;
    candleCacheRef.current[cacheKey] = updated;
    return updated;
  }, [
    currentCard,
    selectedCardCode,
    chartTimeframe,
    marketMode,
    currentCard?.currentPrice,
    livePulseTick,
    shopState.currentDay,
    shopState.inGameHour,
  ]);

  useEffect(() => {
    if (currentCard) {
      setLimitPriceInput(currentCard.currentPrice.toFixed(2));
      setTradeVolume(1);
    }
  }, [selectedCardCode]);

  // Ensure the viewed card always has initial simulated trades
  useEffect(() => {
    if (currentCard && (!tradesByCard[selectedCardCode] || tradesByCard[selectedCardCode].length === 0)) {
      setTradesByCard((prev) => ({
        ...prev,
        [selectedCardCode]: generateSeedTradesForCard(selectedCardCode, currentCard.currentPrice, 12),
      }));
    }
  }, [selectedCardCode, currentCard, tradesByCard]);

  // Current Card Trades: strictly filtered to selectedCardCode
  const currentCardTrades = useMemo(() => {
    const list = tradesByCard[selectedCardCode];
    if (!list || list.length === 0) {
      if (currentCard) {
        return generateSeedTradesForCard(selectedCardCode, currentCard.currentPrice, 12);
      }
      return [];
    }
    return list.filter((t) => t.cardCode === selectedCardCode);
  }, [tradesByCard, selectedCardCode, currentCard]);

  // Filter by trader tag (Whale, KOL, Smart, Sniper)
  const displayedTrades = useMemo(() => {
    return currentCardTrades.filter((t) => {
      if (activityFilter === 'all') return true;
      if (activityFilter === 'whale' && t.traderTag !== 'Whale') return false;
      if (activityFilter === 'kol' && t.traderTag !== 'KOL') return false;
      if (activityFilter === 'smart' && t.traderTag !== 'Smart') return false;
      if (activityFilter === 'sniper' && t.traderTag !== 'Sniper') return false;
      return true;
    });
  }, [currentCardTrades, activityFilter]);

  const filteredCards = useMemo(() => {
    let list = Object.values(exchangeState.marketCards);
    if (selectedFranchise !== 'all') {
      list = list.filter((c) => c.franchise === selectedFranchise);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((c) => c.name.toLowerCase().includes(q) || c.cardCode.toLowerCase().includes(q));
    }
    return list;
  }, [exchangeState.marketCards, selectedFranchise, searchQuery]);

  const orderBook = useMemo(() => {
    if (!currentCard) return { bids: [], asks: [], spread: 0 };
    return getOrderBookForCard(currentCard.cardCode, currentCard.currentPrice, exchangeState.activeOrders);
  }, [currentCard, exchangeState.activeOrders, livePulseTick]);

  const playerHoldingStack = exchangeState.vaultFungibleStacks[selectedCardCode];
  const playerHoldingUniques = exchangeState.vaultUniqueCards.filter((c) => c.cardCode === selectedCardCode);

  const portfolioSummary = useMemo(() => {
    let totalValue = 0;
    let totalCost = 0;
    let uniqueCount = exchangeState.vaultUniqueCards.length;
    let fungibleCount = 0;

    for (const card of exchangeState.vaultUniqueCards) {
      const meta = exchangeState.marketCards[card.cardCode];
      const curPrice = meta ? meta.currentPrice : card.basePrice;
      const { finalPrice } = calculateUniqueCardPrice(card, curPrice);
      totalValue += finalPrice;
      totalCost += card.purchasePrice;
    }

    for (const code in exchangeState.vaultFungibleStacks) {
      const stack = exchangeState.vaultFungibleStacks[code];
      const meta = exchangeState.marketCards[code];
      const curPrice = meta ? meta.currentPrice : stack.avgBuyPrice;
      totalValue += curPrice * stack.quantity;
      totalCost += stack.totalCostBasis;
      fungibleCount += stack.quantity;
    }

    const unrealizedPnL = totalValue - totalCost;
    const pnlPct = totalCost > 0 ? (unrealizedPnL / totalCost) * 100 : 0;

    return { totalValue, totalCost, unrealizedPnL, pnlPct, uniqueCount, fungibleCount };
  }, [exchangeState, livePulseTick]);

  useEffect(() => {
    if (actionSuccessMessage) {
      const t = setTimeout(() => setActionSuccessMessage(null), 3000);
      return () => clearTimeout(t);
    }
  }, [actionSuccessMessage]);

  useEffect(() => {
    if (actionErrorMessage) {
      const t = setTimeout(() => setActionErrorMessage(null), 3000);
      return () => clearTimeout(t);
    }
  }, [actionErrorMessage]);

  // Execute trade order
  const handleExecuteTrade = () => {
    if (!currentCard) return;
    const vol = Math.max(1, Math.floor(tradeVolume));

    if (orderSide === 'buy') {
      const isLimit = orderType === 'limit';
      const execPrice = isLimit
        ? parseFloat(limitPriceInput) || currentCard.currentPrice
        : orderBook.asks[0]?.price || currentCard.currentPrice * 1.005;
      const subtotal = execPrice * vol;
      const fee = subtotal * CARD_EXCHANGE_CONFIG.FEES.ORDER_TAX_RATE;
      const totalCost = subtotal + fee;

      if (shopState.cash < totalCost) {
        soundManager.playWrongBuzzer();
        setActionErrorMessage(`Không đủ tiền ví shop! Cần $${totalCost.toFixed(2)}, hiện có $${shopState.cash.toFixed(2)}.`);
        return;
      }

      if (isLimit) {
        onUpdateCash(shopState.cash - totalCost);
        const newOrder: LimitOrder = {
          id: `ord_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          cardCode: currentCard.cardCode,
          cardName: currentCard.name,
          type: 'buy',
          price: execPrice,
          volume: vol,
          filledVolume: 0,
          createdAt: Date.now(),
          gameDay: shopState.currentDay,
          gameHour: shopState.inGameHour,
          status: 'open',
        };
        updateExchangeState((prev) => ({
          ...prev,
          activeOrders: [...prev.activeOrders, newOrder],
        }));
        soundManager.playSelectSound();
        setActionSuccessMessage(`Đã đặt lệnh giới hạn MUA ${vol}x ${currentCard.name} @ $${execPrice.toFixed(2)}.`);
        return;
      }

      // Market Buy
      const newCash = Math.max(0, shopState.cash - totalCost);
      onUpdateCash(newCash);

      if (onRecordBillTax) {
        onRecordBillTax({
          id: `fee_${Date.now()}`,
          type: 'exchange_fee',
          title: `Thuế Khớp Lệnh (1%): ${currentCard.name}`,
          description: `Phí giao dịch mua ${vol}x ${currentCard.cardCode} giá $${execPrice.toFixed(2)}.`,
          amount: Number(fee.toFixed(2)),
          gameDay: shopState.currentDay,
          gameHour: shopState.inGameHour,
          timestamp: Date.now(),
        });
      }

      updateExchangeState((prev) => {
        const next = { ...prev };
        const stack = next.vaultFungibleStacks[currentCard.cardCode];
        if (stack) {
          stack.quantity += vol;
          stack.totalCostBasis += subtotal;
          stack.avgBuyPrice = Number((stack.totalCostBasis / stack.quantity).toFixed(2));
        } else {
          next.vaultFungibleStacks[currentCard.cardCode] = {
            cardCode: currentCard.cardCode,
            name: currentCard.name,
            franchise: currentCard.franchise,
            rarity: currentCard.rarity,
            imageUrl: currentCard.imageUrl,
            quantity: vol,
            totalCostBasis: subtotal,
            avgBuyPrice: execPrice,
          };
        }

        next.tradeHistory.unshift({
          id: `trade_${Date.now()}`,
          cardCode: currentCard.cardCode,
          cardName: currentCard.name,
          type: 'market_buy',
          price: execPrice,
          volume: vol,
          totalValue: subtotal,
          feeTax1Pct: fee,
          realizedProfit: 0,
          profitTax10Pct: 0,
          timestamp: Date.now(),
          gameDay: shopState.currentDay,
          gameHour: shopState.inGameHour,
          details: `Mua ngay ${vol} thẻ @ $${execPrice.toFixed(2)}`,
        });

        return next;
      });

      // Append player buy order immediately to current card's live trades
      const playerBuyTrade: LiveTradeItem = {
        id: `player_trade_${Date.now()}`,
        timeLabel: 'vừa xong',
        type: 'buy',
        mcLabel: `$${(currentCard.currentPrice * 1000).toLocaleString()}`,
        cardCode: currentCard.cardCode,
        amount: vol,
        usdValue: Number(subtotal.toFixed(2)),
        traderName: 'Bạn (Trader)',
        traderTag: 'Player',
      };
      setTradesByCard((prev) => ({
        ...prev,
        [currentCard.cardCode]: [playerBuyTrade, ...(prev[currentCard.cardCode] || []).slice(0, 24)],
      }));

      soundManager.playChipSound();
      setActionSuccessMessage(`Đã mua ${vol}x ${currentCard.name} @ $${execPrice.toFixed(2)} (Thuế 1%: $${fee.toFixed(2)}).`);
    } else {
      // SELL SIDE
      const isLimit = orderType === 'limit';
      const stack = exchangeState.vaultFungibleStacks[currentCard.cardCode];
      const availableQty = stack ? stack.quantity : 0;

      if (availableQty < vol) {
        soundManager.playWrongBuzzer();
        setActionErrorMessage(`Không đủ thẻ thường để bán! Trong kho chỉ có ${availableQty}x.`);
        return;
      }

      const execPrice = isLimit
        ? parseFloat(limitPriceInput) || currentCard.currentPrice
        : orderBook.bids[0]?.price || currentCard.currentPrice * 0.995;

      if (isLimit) {
        updateExchangeState((prev) => {
          const next = { ...prev };
          const s = next.vaultFungibleStacks[currentCard.cardCode];
          if (s) {
            s.quantity -= vol;
            if (s.quantity <= 0) delete next.vaultFungibleStacks[currentCard.cardCode];
          }
          next.activeOrders.push({
            id: `ord_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            cardCode: currentCard.cardCode,
            cardName: currentCard.name,
            type: 'sell',
            price: execPrice,
            volume: vol,
            filledVolume: 0,
            createdAt: Date.now(),
            gameDay: shopState.currentDay,
            gameHour: shopState.inGameHour,
            status: 'open',
          });
          return next;
        });
        soundManager.playSelectSound();
        setActionSuccessMessage(`Đã đặt lệnh giới hạn BÁN ${vol}x ${currentCard.name} @ $${execPrice.toFixed(2)}.`);
        return;
      }

      // Market Sell
      const grossValue = execPrice * vol;
      const fee = grossValue * CARD_EXCHANGE_CONFIG.FEES.ORDER_TAX_RATE;
      const costBasis = stack ? stack.avgBuyPrice * vol : grossValue;
      const realizedProfit = Math.max(0, grossValue - costBasis);
      const profitTax10Pct = realizedProfit * CARD_EXCHANGE_CONFIG.FEES.REALIZED_PROFIT_TAX_RATE;
      const netCashReceived = grossValue - fee - profitTax10Pct;

      onUpdateCash(shopState.cash + netCashReceived);

      if (profitTax10Pct > 0 && onRecordBillTax) {
        onRecordBillTax({
          id: `proftax_${Date.now()}`,
          type: 'exchange_profit_tax',
          title: `Thuế Lợi Nhuận Chốt Lời (10%): ${currentCard.name}`,
          description: `Bán ${vol}x ${currentCard.cardCode}. Lãi: $${realizedProfit.toFixed(2)}. Thuế 10%: $${profitTax10Pct.toFixed(2)}.`,
          amount: Number(profitTax10Pct.toFixed(2)),
          gameDay: shopState.currentDay,
          gameHour: shopState.inGameHour,
          timestamp: Date.now(),
        });
      }

      updateExchangeState((prev) => {
        const next = { ...prev };
        const s = next.vaultFungibleStacks[currentCard.cardCode];
        if (s) {
          s.quantity -= vol;
          s.totalCostBasis = Math.max(0, s.totalCostBasis - costBasis);
          if (s.quantity <= 0) delete next.vaultFungibleStacks[currentCard.cardCode];
        }

        next.tradeHistory.unshift({
          id: `trade_${Date.now()}`,
          cardCode: currentCard.cardCode,
          cardName: currentCard.name,
          type: 'market_sell',
          price: execPrice,
          volume: vol,
          totalValue: grossValue,
          feeTax1Pct: fee,
          realizedProfit,
          profitTax10Pct,
          timestamp: Date.now(),
          gameDay: shopState.currentDay,
          gameHour: shopState.inGameHour,
          details: `Bán ${vol} thẻ. Lãi: $${realizedProfit.toFixed(2)} (Thuế 10%: $${profitTax10Pct.toFixed(2)})`,
        });

        return next;
      });

      // Append player sell order immediately to current card's live trades
      const playerSellTrade: LiveTradeItem = {
        id: `player_trade_${Date.now()}`,
        timeLabel: 'vừa xong',
        type: 'sell',
        mcLabel: `$${(currentCard.currentPrice * 1000).toLocaleString()}`,
        cardCode: currentCard.cardCode,
        amount: vol,
        usdValue: Number(grossValue.toFixed(2)),
        traderName: 'Bạn (Trader)',
        traderTag: 'Player',
      };
      setTradesByCard((prev) => ({
        ...prev,
        [currentCard.cardCode]: [playerSellTrade, ...(prev[currentCard.cardCode] || []).slice(0, 24)],
      }));

      soundManager.playCashRegister();
      setActionSuccessMessage(`Đã bán ${vol}x ${currentCard.name}. Thực nhận: +$${netCashReceived.toFixed(2)}.`);
    }
  };

  const handleCancelOrder = (orderId: string) => {
    const order = exchangeState.activeOrders.find((o) => o.id === orderId);
    if (!order) return;

    if (order.type === 'buy') {
      const remainingVol = order.volume - order.filledVolume;
      const refund = order.price * remainingVol * (1 + CARD_EXCHANGE_CONFIG.FEES.ORDER_TAX_RATE);
      onUpdateCash(shopState.cash + refund);
    } else {
      const remainingVol = order.volume - order.filledVolume;
      updateExchangeState((prev) => {
        const next = { ...prev };
        const stack = next.vaultFungibleStacks[order.cardCode];
        if (stack) {
          stack.quantity += remainingVol;
        } else {
          const meta = next.marketCards[order.cardCode];
          next.vaultFungibleStacks[order.cardCode] = {
            cardCode: order.cardCode,
            name: order.cardName,
            franchise: meta?.franchise || 'onepiece',
            rarity: meta?.rarity || 'Common',
            imageUrl: meta?.imageUrl || '🃏',
            quantity: remainingVol,
            totalCostBasis: order.price * remainingVol,
            avgBuyPrice: order.price,
          };
        }
        return next;
      });
    }

    updateExchangeState((prev) => ({
      ...prev,
      activeOrders: prev.activeOrders.filter((o) => o.id !== orderId),
    }));

    soundManager.playSelectSound();
    setActionSuccessMessage(`Đã hủy lệnh #${orderId.slice(-4)}.`);
  };

  const handleSellUniqueCard = (card: UniqueCardItem) => {
    const meta = exchangeState.marketCards[card.cardCode];
    const curPrice = meta ? meta.currentPrice : card.basePrice;
    const { finalPrice } = calculateUniqueCardPrice(card, curPrice);

    const grossValue = finalPrice;
    const fee = grossValue * CARD_EXCHANGE_CONFIG.FEES.ORDER_TAX_RATE;
    const realizedProfit = Math.max(0, grossValue - card.purchasePrice);
    const profitTax10Pct = realizedProfit * CARD_EXCHANGE_CONFIG.FEES.REALIZED_PROFIT_TAX_RATE;
    const netCash = grossValue - fee - profitTax10Pct;

    onUpdateCash(shopState.cash + netCash);

    if (profitTax10Pct > 0 && onRecordBillTax) {
      onRecordBillTax({
        id: `uniq_tax_${Date.now()}`,
        type: 'exchange_profit_tax',
        title: `Thuế Chốt Lời Thẻ Độc Nhất (10%): ${card.name}`,
        description: `Bán thẻ #${card.serial ? card.serial.number : 'SP'}. Giá: $${finalPrice.toFixed(2)}. Lãi: $${realizedProfit.toFixed(2)}.`,
        amount: Number(profitTax10Pct.toFixed(2)),
        gameDay: shopState.currentDay,
        gameHour: shopState.inGameHour,
        timestamp: Date.now(),
      });
    }

    updateExchangeState((prev) => ({
      ...prev,
      vaultUniqueCards: prev.vaultUniqueCards.filter((c) => c.id !== card.id),
      tradeHistory: [
        {
          id: `uniq_sell_${Date.now()}`,
          cardCode: card.cardCode,
          cardName: card.name,
          type: 'market_sell',
          price: finalPrice,
          volume: 1,
          totalValue: grossValue,
          feeTax1Pct: fee,
          realizedProfit,
          profitTax10Pct,
          timestamp: Date.now(),
          gameDay: shopState.currentDay,
          gameHour: shopState.inGameHour,
          details: `Bán thẻ ERC-721 #${card.serial?.number || 'SP'} [${card.grading?.label || 'Raw'}].`,
        },
        ...prev.tradeHistory,
      ],
    }));

    // Append player unique card sell order immediately to card's live trades
    const playerUniqueSell: LiveTradeItem = {
      id: `player_unique_${Date.now()}`,
      timeLabel: 'vừa xong',
      type: 'sell',
      mcLabel: `$${(finalPrice * 1000).toLocaleString()}`,
      cardCode: card.cardCode,
      amount: 1,
      usdValue: Number(finalPrice.toFixed(2)),
      traderName: 'Bạn (Thẻ Hiếm)',
      traderTag: 'Player',
    };
    setTradesByCard((prev) => ({
      ...prev,
      [card.cardCode]: [playerUniqueSell, ...(prev[card.cardCode] || []).slice(0, 24)],
    }));

    soundManager.playCashRegister();
    setActionSuccessMessage(`Đã thanh lý thẻ độc nhất ${card.name} với giá $${finalPrice.toFixed(2)}!`);
  };

  const handleSyncFromShop = (franchiseType: 'pokemon' | 'onepiece') => {
    const meta = Object.values(exchangeState.marketCards).find((c) => c.franchise === franchiseType && c.rarity === 'Manga') ||
      Object.values(exchangeState.marketCards)[0];

    const newUnique: UniqueCardItem = {
      id: `sync_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      cardCode: meta.cardCode,
      name: meta.name,
      franchise: franchiseType,
      rarity: 'Manga',
      imageUrl: meta.imageUrl,
      serial: { number: Math.floor(1 + Math.random() * 9), total: 100 },
      condition: 'Gem Mint',
      grading: {
        company: 'PSA',
        score: 10,
        label: 'PSA 10 Gem Mint',
        multiplier: 2.5,
      },
      ownerHistory: [
        {
          id: `sync_hist_${Date.now()}`,
          owner: 'Bạn (Rút từ Cửa hàng)',
          timestamp: Date.now(),
          gameDay: shopState.currentDay,
          gameHour: shopState.inGameHour,
          price: 0,
          type: 'sync',
        },
      ],
      isFirstOwner: true,
      basePrice: meta.currentPrice,
      purchasePrice: 0,
      acquiredAtDay: shopState.currentDay,
      acquiredAtHour: shopState.inGameHour,
    };

    updateExchangeState((prev) => ({
      ...prev,
      vaultUniqueCards: [newUnique, ...prev.vaultUniqueCards],
    }));

    soundManager.playWinChime();
    setShowSyncShopModal(false);
    setActionSuccessMessage(`Đã số hóa thẻ độc nhất ${newUnique.name} (#${newUnique.serial?.number}/100, PSA 10) vào Sàn!`);
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0a0d] text-[#e4e5eb] rounded-b-2xl overflow-hidden select-none font-mono text-[11px] leading-tight">
      {/* ========================================================================= */}
      {/* 1. TOP HEADER & CARD SELECTOR BAR                                         */}
      {/* ========================================================================= */}
      <div className="h-11 bg-[#111216] border-b border-[#22242c] px-3 flex items-center justify-between shrink-0 gap-3">
        {/* Left: Brand + Quick Card Picker Dropdown */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 cursor-pointer">
            <img
              src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQPhGLRPvfdv_obQaacsQ7fXzW88crdY5E_oUwQAksTow&s=10"
              alt="GMGN Logo"
              className="w-6 h-6 rounded-md object-contain bg-black/40 border border-[#262832]"
            />
            <span className="font-black text-sm tracking-tight text-white">GMGN</span>
          </div>

          <div className="h-4 w-px bg-zinc-700" />

          {/* Interactive Card Picker Button with Card Artwork Thumbnail */}
          <div className="relative">
            <button
              onClick={() => setShowCardPicker(!showCardPicker)}
              className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-[#181a20] hover:bg-[#20232c] border border-zinc-700/80 text-[11px] font-bold text-white transition cursor-pointer shadow-sm max-w-[260px] shrink-0"
            >
              {currentCard?.imageUrl && (
                <img
                  src={currentCard.imageUrl}
                  alt={currentCard.name}
                  className="w-3.5 h-4.5 rounded object-cover border border-amber-400/50 shrink-0"
                />
              )}
              <span className="text-emerald-400 font-bold truncate max-w-[130px]">{currentCard?.name}</span>
              <span className="text-[9px] text-zinc-400 font-mono shrink-0">({currentCard?.cardCode})</span>
              <ChevronDown className="w-3 h-3 text-zinc-400 shrink-0" />
            </button>

            {/* Dropdown Card Selector Modal / Popover */}
            {showCardPicker && (
              <div className="absolute left-0 top-9 z-50 w-72 bg-[#121318] border border-zinc-700 rounded-2xl p-2.5 shadow-2xl space-y-2">
                <div className="flex items-center gap-1 bg-[#1a1c24] p-1 rounded-lg text-[10px]">
                  <button
                    onClick={() => setSelectedFranchise('all')}
                    className={`flex-1 py-0.5 rounded font-bold ${selectedFranchise === 'all' ? 'bg-zinc-700 text-white' : 'text-zinc-400'}`}
                  >
                    Tất cả
                  </button>
                  <button
                    onClick={() => setSelectedFranchise('onepiece')}
                    className={`flex-1 py-0.5 rounded font-bold ${selectedFranchise === 'onepiece' ? 'bg-rose-950 text-rose-300' : 'text-zinc-400'}`}
                  >
                    One Piece
                  </button>
                  <button
                    onClick={() => setSelectedFranchise('pokemon')}
                    className={`flex-1 py-0.5 rounded font-bold ${selectedFranchise === 'pokemon' ? 'bg-amber-950 text-amber-300' : 'text-zinc-400'}`}
                  >
                    Pokémon
                  </button>
                </div>

                <div className="max-h-60 overflow-y-auto space-y-1 pr-1">
                  {filteredCards.map((c) => (
                    <div
                      key={c.cardCode}
                      onClick={() => {
                        soundManager.playSelectSound();
                        setSelectedCardCode(c.cardCode);
                        setShowCardPicker(false);
                      }}
                      className={`p-1.5 rounded-xl border flex items-center gap-2 cursor-pointer transition ${
                        c.cardCode === selectedCardCode ? 'bg-emerald-950/40 border-emerald-500/60' : 'bg-black/30 border-transparent hover:bg-zinc-800/40'
                      }`}
                    >
                      <div className="w-7 h-9 rounded bg-zinc-900 border border-zinc-800 overflow-hidden shrink-0 flex items-center justify-center">
                        <img src={c.imageUrl} alt={c.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-white truncate">{c.name}</div>
                        <div className="text-[10px] text-zinc-400">{c.cardCode} • {c.rarity}</div>
                      </div>
                      <div className="text-right text-xs font-black text-emerald-400 font-mono">
                        ${c.currentPrice.toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Header Navigation & Actions */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {(shopState.marketPulseNews || []).length > 0 && (
            <div className="hidden xl:flex items-center gap-1.5">
              {(shopState.marketPulseNews || []).slice(0, 2).map((pulse) => (
                <span
                  key={pulse.id}
                  title={pulse.headline}
                  className={`rounded-md border px-2 py-0.5 text-[10px] font-black ${
                    pulse.isBullish
                      ? 'border-emerald-500/40 bg-emerald-950/50 text-emerald-300'
                      : 'border-amber-500/40 bg-amber-950/50 text-amber-300'
                  }`}
                >
                  📰 {pulse.badge}
                </span>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2 bg-[#171920] border border-[#262832] px-2.5 py-1 rounded-lg">
            <span className="text-[10px] text-zinc-400">VÍ CỬA HÀNG:</span>
            <span className={`font-black text-xs ${shopState.cash <= 50 ? 'text-rose-400 animate-pulse' : 'text-emerald-400'}`}>
              ${shopState.cash.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            {shopState.cash <= 0 && <span className="bg-rose-950 text-rose-300 px-1 rounded text-[8px] font-black">PHÁ SẢN</span>}
          </div>

          <button
            onClick={onBack}
            className="px-2.5 py-1 rounded-lg bg-rose-950/50 hover:bg-rose-900/70 text-rose-300 border border-rose-500/40 text-[10px] font-bold transition cursor-pointer"
          >
            Trang Chủ
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. CARD ART & METRICS BANNER (PROMINENT REAL CARD ARTWORK DISPLAY)        */}
      {/* ========================================================================= */}
      <div className="min-h-14 bg-[#0f1014] border-b border-[#22242c] px-3 py-1 flex items-center justify-between gap-3 shrink-0 overflow-hidden">
        {/* Left: REAL CARD ARTWORK THUMBNAIL + CARD DETAILS */}
        <div className="flex items-center gap-2.5 min-w-0 shrink">
          {/* Card Artwork preview */}
          <div
            onClick={() => setPreviewArtUrl(currentCard?.imageUrl || null)}
            className="group relative w-9 h-12 rounded-md border-2 border-amber-400/80 bg-zinc-950 shadow-md overflow-hidden cursor-zoom-in shrink-0 hover:scale-105 transition"
            title="Bấm để phóng to xem đầy đủ Art Thẻ Bài"
          >
            <img
              src={currentCard?.imageUrl}
              alt={currentCard?.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
              <Maximize2 className="w-3.5 h-3.5 text-white" />
            </div>
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-black text-xs sm:text-sm text-white tracking-wide truncate">{currentCard?.name}</span>
              <span className="text-[9px] px-1.5 py-0.2 rounded font-black bg-zinc-800 text-amber-300 border border-amber-500/30 shrink-0">
                {currentCard?.rarity}
              </span>

              {/* MM Lái & Meme Ponzi Dynamic Badges */}
              {currentCard?.regime === 'bluechip_mm' ? (
                <>
                  {currentCard.mmPhase === 'pump' && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/25 text-emerald-300 border border-emerald-500/50 flex items-center gap-1 font-black animate-pulse shadow-sm whitespace-nowrap">
                      🐋 MM LÁI: BƠM THỔI (PUMP)
                    </span>
                  )}
                  {currentCard.mmPhase === 'accumulation' && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-500/40 flex items-center gap-1 font-bold whitespace-nowrap">
                      🏦 MM LÁI: TÍCH LŨY
                    </span>
                  )}
                  {currentCard.mmPhase === 'distribution' && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-500/40 flex items-center gap-1 font-bold whitespace-nowrap">
                      ⚡ MM LÁI: PHÂN PHỐI
                    </span>
                  )}
                  {currentCard.mmPhase === 'shakeout' && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-950/80 text-rose-300 border border-rose-500/40 flex items-center gap-1 font-bold whitespace-nowrap">
                      🩸 MM LÁI: RŨ BỎ
                    </span>
                  )}
                </>
              ) : (
                <>
                  {currentCard?.memePhase === 'meme_pump' && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/30 text-emerald-300 border border-emerald-400 flex items-center gap-1 font-black animate-bounce shadow-md whitespace-nowrap">
                      🚀 PONZI: BƠM x5
                    </span>
                  )}
                  {currentCard?.memePhase === 'rug_dump' && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-950 text-rose-400 border border-rose-600 flex items-center gap-1 font-black animate-pulse whitespace-nowrap">
                      💀 RUG PULL XẢ
                    </span>
                  )}
                  {currentCard?.memePhase === 'dead_cat_bounce' && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1 font-bold whitespace-nowrap">
                      🪓 NẢY XÁC CHẾT
                    </span>
                  )}
                  {(!currentCard?.memePhase || currentCard.memePhase === 'long_sideway') && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700 flex items-center gap-1 font-bold whitespace-nowrap">
                      💤 SIDEWAY CẠN VOL
                    </span>
                  )}
                </>
              )}

              {currentCard?.hype > 0.03 && (
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1 font-bold whitespace-nowrap">
                  <Flame className="w-2.5 h-2.5" /> +{Math.round(currentCard.hype * 100)}%
                </span>
              )}
            </div>
            <div className="text-[10px] text-zinc-400 flex items-center gap-2 mt-0.5 truncate">
              <span>Mã: <strong className="text-zinc-200">{currentCard?.cardCode}</strong></span>
              <span>• Block: <strong className="text-zinc-200">{currentCard?.franchise === 'onepiece' ? 'OP Grand Line' : 'Pocket-Kanto'}</strong></span>
            </div>
          </div>
        </div>

        {/* Center/Right: Key Metrics (Clean, whitespace-nowrap, zero-collision) */}
        <div className="flex items-center gap-3 sm:gap-4 shrink-0 whitespace-nowrap">
          <div>
            <div className="text-[9px] text-zinc-400 uppercase font-medium">Giá Sàn</div>
            <div className="text-base sm:text-lg font-black text-emerald-400 font-mono leading-none mt-0.5">
              ${currentCard?.currentPrice !== undefined ? (currentCard.currentPrice < 1.0 ? currentCard.currentPrice.toFixed(3) : currentCard.currentPrice.toFixed(2)) : '0.00'}
            </div>
          </div>

          <div className="border-l border-zinc-800 pl-3">
            <div className="text-[9px] text-zinc-400 uppercase font-medium">Vốn Hóa (MC)</div>
            <div className="text-xs font-bold text-white font-mono leading-none mt-0.5">
              ${(currentCard?.currentPrice * 1000).toLocaleString('en-US', { maximumFractionDigits: 1 })}
            </div>
          </div>

          <div className="border-l border-zinc-800 pl-3">
            <div className="text-[9px] text-zinc-400 uppercase font-medium">24h Vol</div>
            <div className="text-xs font-bold text-white font-mono leading-none mt-0.5">
              ${(currentCard?.volume24h * currentCard?.currentPrice).toFixed(1)}
            </div>
          </div>

          <div className="border-l border-zinc-800 pl-3">
            <div className="text-[9px] text-zinc-400 uppercase font-medium">Pool AMM</div>
            <div className="text-xs font-bold text-cyan-400 font-mono leading-none mt-0.5">
              ${(currentCard?.poolLiquidityUsd || (currentCard?.currentPrice * 500)).toLocaleString()} TVL
            </div>
            <div className="text-[8px] text-zinc-500 leading-none mt-0.5">
              {currentCard?.regime === 'bluechip_mm'
                ? `~$${currentCard?.dollarsPerPoint || 250}/giá`
                : `Pool mỏng`}
            </div>
          </div>
        </div>
      </div>

      {/* Notifications toast */}
      {actionSuccessMessage && (
        <div className="bg-emerald-950 border-b border-emerald-500/50 px-4 py-1 text-emerald-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>{actionSuccessMessage}</span>
          </div>
          <button onClick={() => setActionSuccessMessage(null)}>✕</button>
        </div>
      )}

      {actionErrorMessage && (
        <div className="bg-rose-950 border-b border-rose-500/50 px-4 py-1 text-rose-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
            <span>{actionErrorMessage}</span>
          </div>
          <button onClick={() => setActionErrorMessage(null)}>✕</button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. MAIN TERMINAL WORKSPACE (LEFT: CHART + BOTTOM TABS | RIGHT: ORDER FORM)*/}
      {/* ========================================================================= */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT COLUMN: CANDLESTICK CHART (TOP) + DETAILED TABS (BOTTOM) */}
        <div className="flex-1 flex flex-col border-r border-[#22242c] overflow-hidden">
          {/* Chart Section Header */}
          <div className="min-h-7 py-1 bg-[#14151b] border-b border-[#22242c] px-3 flex flex-wrap items-center justify-between gap-1.5 text-[10px] shrink-0">
            {/* Timeframe Selectors */}
            <div className="flex items-center gap-1">
              {(['1m', '5m', '15m', '1H', '4H', '1D', '1W'] as const).map((tf) => (
                <button
                  key={tf}
                  onClick={() => {
                    soundManager.playSelectSound();
                    setChartTimeframe(tf);
                  }}
                  className={`px-1.5 py-0.5 rounded font-bold transition cursor-pointer ${
                    chartTimeframe === tf
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                  }`}
                >
                  {tf}
                </button>
              ))}

            </div>

            <div className="flex items-center gap-2 text-zinc-400">
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                LIVE
              </span>
            </div>
          </div>

          {/* Chart Canvas Area (Height: ~220px, clean and live!) */}
          <div className="h-56 relative bg-[#08080a] flex">
            {/* Left toolbar */}
            <div className="w-7 border-r border-[#1e2028] bg-[#101115] flex flex-col items-center py-2 gap-2 text-zinc-500 shrink-0">
              <button
                onClick={() => setSelectedDrawingTool('crosshair')}
                className={`p-1 rounded cursor-pointer ${selectedDrawingTool === 'crosshair' ? 'text-emerald-400 bg-zinc-800' : 'hover:text-white'}`}
                title="Crosshair"
              >
                <Crosshair className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setSelectedDrawingTool('line')}
                className={`p-1 rounded cursor-pointer ${selectedDrawingTool === 'line' ? 'text-emerald-400 bg-zinc-800' : 'hover:text-white'}`}
                title="Trendline"
              >
                <Minus className="w-3.5 h-3.5 rotate-45" />
              </button>
              <button
                onClick={() => setSelectedDrawingTool('fib')}
                className={`p-1 rounded cursor-pointer ${selectedDrawingTool === 'fib' ? 'text-emerald-400 bg-zinc-800' : 'hover:text-white'}`}
                title="Sliders"
              >
                <Sliders className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setSelectedDrawingTool('brush')}
                className={`p-1 rounded cursor-pointer ${selectedDrawingTool === 'brush' ? 'text-emerald-400 bg-zinc-800' : 'hover:text-white'}`}
                title="Marker"
              >
                <Sparkle className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Live HTML5 Canvas Chart */}
            <div className="flex-1 relative overflow-hidden">
              <GmgnCanvasChart
                candles={activeCandles}
                currentPrice={currentCard?.currentPrice || 0}
                cardName={currentCard?.name || 'Card'}
                timeframe={chartTimeframe}
                marketMode={marketMode}
                livePulse={livePulseTick}
                drawingTool={selectedDrawingTool}
              />
            </div>
          </div>

          {/* Bottom Tabs Area (Hoạt động / Kho thẻ / Sổ lệnh / Lệnh treo) */}
          <div className="flex-1 flex flex-col bg-[#0c0d11] border-t border-[#22242c] overflow-hidden">
            {/* Tab switch buttons */}
            <div className="h-8 bg-[#13141a] border-b border-[#22242c] px-3 flex items-center justify-between text-[11px] shrink-0">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => {
                    soundManager.playSelectSound();
                    setActiveBottomTab('activity');
                  }}
                  className={`font-bold transition cursor-pointer flex items-center gap-1.5 ${
                    activeBottomTab === 'activity' ? 'text-white border-b-2 border-emerald-400 pb-0.5' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <Activity className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Hoạt Động</span>
                </button>

                <button
                  onClick={() => {
                    soundManager.playSelectSound();
                    setActiveBottomTab('positions');
                  }}
                  className={`font-bold transition cursor-pointer flex items-center gap-1.5 ${
                    activeBottomTab === 'positions' ? 'text-white border-b-2 border-emerald-400 pb-0.5' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Kho Thẻ</span>
                  <span className="px-1.5 py-0.2 rounded bg-zinc-800 text-[9px] text-zinc-300">
                    {portfolioSummary.uniqueCount + portfolioSummary.fungibleCount}
                  </span>
                </button>

                <button
                  onClick={() => {
                    soundManager.playSelectSound();
                    setActiveBottomTab('orderbook');
                  }}
                  className={`font-bold transition cursor-pointer flex items-center gap-1.5 ${
                    activeBottomTab === 'orderbook' ? 'text-white border-b-2 border-emerald-400 pb-0.5' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <span>Sổ Lệnh</span>
                </button>

                <button
                  onClick={() => {
                    soundManager.playSelectSound();
                    setActiveBottomTab('orders');
                  }}
                  className={`font-bold transition cursor-pointer flex items-center gap-1.5 ${
                    activeBottomTab === 'orders' ? 'text-white border-b-2 border-emerald-400 pb-0.5' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <span>Lệnh</span>
                  {exchangeState.activeOrders.length > 0 && (
                    <span className="px-1.5 py-0.2 rounded bg-zinc-800 text-[9px] text-zinc-300">
                      {exchangeState.activeOrders.length}
                    </span>
                  )}
                </button>
              </div>

              {activeBottomTab === 'activity' && (
                <div className="hidden sm:flex items-center gap-1 text-[10px]">
                  {(['all', 'kol', 'smart', 'whale', 'sniper'] as const).map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setActivityFilter(filter)}
                      className={`px-2 py-0.5 rounded font-bold transition cursor-pointer uppercase ${
                        activityFilter === filter ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      {filter === 'all' ? 'Tất cả' : filter}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Tab Body Contents */}
            <div className="flex-1 overflow-y-auto">
              {/* Tab 1: Live Activity */}
              {activeBottomTab === 'activity' && (
                <table className="w-full text-left text-[11px] font-mono">
                  <thead>
                    <tr className="border-b border-[#1c1d24] text-[10px] text-zinc-500 uppercase bg-[#111216] sticky top-0">
                      <th className="py-1.5 pl-3">Thời gian</th>
                      <th className="py-1.5">Loại</th>
                      <th className="py-1.5">Mã Thẻ</th>
                      <th className="py-1.5 text-right">Số lượng</th>
                      <th className="py-1.5 text-right">Tổng USD</th>
                      <th className="py-1.5 pl-4">Ví Trader</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#171820]">
                    {displayedTrades.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-zinc-500 text-xs">
                          Chưa có giao dịch {activityFilter !== 'all' ? `nhóm ${activityFilter.toUpperCase()} ` : ''}cho mã {selectedCardCode}
                        </td>
                      </tr>
                    ) : (
                      displayedTrades.map((trade) => (
                        <tr key={trade.id} className="hover:bg-[#15161d] transition">
                          <td className="py-1.5 pl-3 text-zinc-500 text-[10px]">{trade.timeLabel}</td>
                          <td className="py-1.5">
                            <span
                              className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                                trade.type === 'buy'
                                  ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/30'
                                  : 'bg-rose-950/80 text-rose-400 border border-rose-500/30'
                              }`}
                            >
                              {trade.type === 'buy' ? 'Mua' : 'Bán'}
                            </span>
                          </td>
                          <td className="py-1.5 text-emerald-300 font-mono font-bold">
                            <div className="flex items-center gap-1.5">
                              {(exchangeState.marketCards[trade.cardCode]?.imageUrl || currentCard?.imageUrl) && (
                                <img
                                  src={exchangeState.marketCards[trade.cardCode]?.imageUrl || currentCard?.imageUrl}
                                  alt={trade.cardCode}
                                  className="w-4 h-5.5 rounded object-cover border border-zinc-700 shrink-0"
                                />
                              )}
                              <span className="text-[10px]">{trade.cardCode}</span>
                            </div>
                          </td>
                          <td className="py-1.5 text-right text-zinc-300 font-mono">{trade.amount}</td>
                          <td className={`py-1.5 text-right font-black font-mono ${trade.type === 'buy' ? 'text-emerald-400' : 'text-rose-400'}`}>
                            ${trade.usdValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="py-1.5 pl-4 flex items-center gap-1.5">
                            <span className="w-4 h-4 rounded-full bg-zinc-800 flex items-center justify-center text-[9px]">
                              {trade.traderTag === 'Player' ? '⭐' : '👤'}
                            </span>
                            <span className={`font-bold ${trade.traderTag === 'Player' ? 'text-amber-300' : 'text-zinc-300'}`}>
                              {trade.traderName}
                            </span>
                            {trade.traderTag && (
                              <span
                                className={`text-[9px] px-1 rounded font-bold ${
                                  trade.traderTag === 'Player'
                                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                    : trade.traderTag === 'Whale'
                                    ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                    : trade.traderTag === 'KOL'
                                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                    : trade.traderTag === 'Sniper'
                                    ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                }`}
                              >
                                {trade.traderTag}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}

              {/* Tab 2: Positions / My Vault */}
              {activeBottomTab === 'positions' && (
                <div className="p-3 space-y-2.5">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="bg-[#14151b] border border-[#22242c] p-2 rounded-xl">
                      <div className="text-[10px] text-zinc-400">TỔNG TÀI SẢN KHO</div>
                      <div className="text-base font-black text-emerald-400">${portfolioSummary.totalValue.toFixed(2)}</div>
                    </div>
                    <div className="bg-[#14151b] border border-[#22242c] p-2 rounded-xl">
                      <div className="text-[10px] text-zinc-400">LÃI/LỖ TẠM TÍNH</div>
                      <div className={`text-base font-black ${portfolioSummary.unrealizedPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {portfolioSummary.unrealizedPnL >= 0 ? '+' : ''}${portfolioSummary.unrealizedPnL.toFixed(2)} ({portfolioSummary.pnlPct.toFixed(1)}%)
                      </div>
                    </div>
                    <div className="bg-[#14151b] border border-[#22242c] p-2 rounded-xl">
                      <div className="text-[10px] text-zinc-400">THẺ ĐỘC NHẤT ERC-721</div>
                      <div className="text-base font-black text-amber-300">{portfolioSummary.uniqueCount} thẻ</div>
                    </div>
                  </div>

                  {/* 1. Fungible Stacks (Thẻ sàn mua qua AMM/Khớp lệnh) */}
                  {Object.entries(exchangeState.vaultFungibleStacks).map(([code, stack]) => {
                    const meta = exchangeState.marketCards[code] || currentCard;
                    if (!stack || stack.quantity <= 0) return null;
                    const currentVal = stack.quantity * (meta?.currentPrice || 0);
                    const cost = stack.quantity * stack.avgBuyPrice;
                    const pnl = currentVal - cost;

                    return (
                      <div key={code} className="bg-[#14151b] border border-emerald-500/30 p-2 rounded-xl flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-11 rounded bg-zinc-900 border border-emerald-500/50 overflow-hidden shrink-0">
                            <img src={meta?.imageUrl} alt={meta?.name} className="w-full h-full object-cover" />
                          </div>
                          <div>
                            <div className="text-xs font-black text-white">{meta?.name}</div>
                            <div className="text-[10px] text-zinc-400 flex items-center gap-1.5 mt-0.5">
                              <span className="font-mono text-emerald-300 font-bold">{code}</span>
                              <span>• Số lượng: <strong className="text-white">{stack.quantity} thẻ</strong></span>
                              <span>• Giá TB: <strong className="text-zinc-300">${stack.avgBuyPrice.toFixed(2)}</strong></span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <div className="text-xs font-black text-white font-mono">${currentVal.toFixed(2)}</div>
                            <div className={`text-[9px] font-bold ${pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              setSelectedCardCode(code);
                              setOrderSide('sell');
                              setTradeVolume(Math.min(stack.quantity, 1));
                            }}
                            className="px-2 py-1 rounded bg-rose-950 hover:bg-rose-900 border border-rose-500/40 text-rose-300 text-[10px] font-bold cursor-pointer"
                          >
                            Bán Thẻ
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {/* 2. Unique Cards (Thẻ độc nhất NFT/Graded) */}
                  {exchangeState.vaultUniqueCards.map((card) => {
                    const meta = exchangeState.marketCards[card.cardCode];
                    const curPrice = meta ? meta.currentPrice : card.basePrice;
                    const pricing = calculateUniqueCardPrice(card, curPrice);

                    return (
                      <div key={card.id} className="bg-[#14151b] border border-[#22242c] p-2 rounded-xl flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-11 rounded bg-zinc-900 border border-amber-400/60 overflow-hidden shrink-0">
                            <img src={card.imageUrl} alt={card.name} className="w-full h-full object-cover" />
                          </div>
                          <div>
                            <div className="text-xs font-black text-white">{card.name}</div>
                            <div className="text-[10px] text-zinc-400 flex items-center gap-1.5 mt-0.5">
                              <span className="font-mono text-amber-300 font-bold">{card.cardCode}</span>
                              {card.serial && (
                                <span className="px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                                  #{card.serial.number}/{card.serial.total} {pricing.isLowSerial && '(+15% Serial Thấp)'}
                                </span>
                              )}
                              {card.isFirstOwner && (
                                <span className="px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                                  Rút đầu (+5%)
                                </span>
                              )}
                              {card.grading && (
                                <span className="px-1 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/30 font-bold">
                                  {card.grading.label}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <div className="text-xs font-black text-emerald-400">${pricing.finalPrice.toFixed(2)}</div>
                            <div className="text-[9px] text-zinc-500">Định giá sàn</div>
                          </div>
                          <button
                            onClick={() => setSelectedUniqueCardForHistory(card)}
                            className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] font-bold cursor-pointer"
                          >
                            Lịch Sử
                          </button>
                          <button
                            onClick={() => handleSellUniqueCard(card)}
                            className="px-2 py-1 rounded bg-rose-950 hover:bg-rose-900 border border-rose-500/40 text-rose-300 text-[10px] font-bold cursor-pointer"
                          >
                            Bán Ra Chợ
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Tab 3: Order Book */}
              {activeBottomTab === 'orderbook' && (
                <div className="p-3 grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-[10px] text-rose-400 font-bold uppercase mb-1">Lệnh Bán</div>
                    <div className="space-y-1">
                      {orderBook.asks.map((ask, i) => (
                        <div key={i} className="flex justify-between py-1 px-2 rounded bg-rose-950/20 text-[11px] font-mono">
                          <span className="text-rose-400 font-bold">${ask.price.toFixed(2)}</span>
                          <span className="text-zinc-300">{ask.volume} thẻ {ask.isPlayerOrder && <span className="text-amber-400 font-bold">(Bạn)</span>}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-emerald-400 font-bold uppercase mb-1">Lệnh Mua</div>
                    <div className="space-y-1">
                      {orderBook.bids.map((bid, i) => (
                        <div key={i} className="flex justify-between py-1 px-2 rounded bg-emerald-950/20 text-[11px] font-mono">
                          <span className="text-emerald-400 font-bold">${bid.price.toFixed(2)}</span>
                          <span className="text-zinc-300">{bid.volume} thẻ {bid.isPlayerOrder && <span className="text-amber-400 font-bold">(Bạn)</span>}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 4: Active Limit Orders */}
              {activeBottomTab === 'orders' && (
                <div className="p-3 space-y-1.5">
                  {exchangeState.activeOrders.length === 0 ? (
                    <div className="text-center py-8 text-zinc-500 text-xs">Không có lệnh giới hạn nào đang treo.</div>
                  ) : (
                    exchangeState.activeOrders.map((ord) => (
                      <div key={ord.id} className="p-2 rounded-xl bg-[#14151b] border border-[#22242c] flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          {(exchangeState.marketCards[ord.cardCode]?.imageUrl || currentCard?.imageUrl) && (
                            <img
                              src={exchangeState.marketCards[ord.cardCode]?.imageUrl || currentCard?.imageUrl}
                              alt={ord.cardName}
                              className="w-5 h-7 rounded object-cover border border-zinc-700 shrink-0"
                            />
                          )}
                          <span className={`px-1.5 py-0.2 rounded text-[9px] font-black ${ord.type === 'buy' ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30' : 'bg-rose-950 text-rose-400 border border-rose-500/30'}`}>
                            {ord.type === 'buy' ? 'MUA' : 'BÁN'}
                          </span>
                          <div>
                            <div className="font-bold text-white">{ord.cardName}</div>
                            <div className="text-zinc-400 text-[10px] font-mono">{ord.cardCode}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-zinc-300">{ord.volume} thẻ @ ${ord.price.toFixed(2)}</span>
                          <button
                            onClick={() => handleCancelOrder(ord.id)}
                            className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-rose-900 text-zinc-400 hover:text-white text-[10px] cursor-pointer"
                          >
                            Hủy lệnh
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* RIGHT COLUMN: FOCUSED ORDER EXECUTION TERMINAL (CLEAN & COMPLETE)          */}
        {/* ========================================================================= */}
        {/* ========================================================================= */}
        {/* RIGHT COLUMN: SLIM & COMPACT TRADING TERMINAL (MAX SPACE FOR CHART)       */}
        {/* ========================================================================= */}
        <div className="w-[235px] border-l border-[#22242c] bg-[#111216] flex flex-col justify-between shrink-0 p-2 space-y-1.5 overflow-hidden text-[10px]">
          {/* Top: Buy / Sell Tab Switches */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[9px] text-zinc-400">
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                74ms Khớp lệnh
              </span>
              <span className="text-zinc-400">Kho: <strong className="text-white">{playerHoldingStack?.quantity || 0}</strong></span>
            </div>

            {/* Buy / Sell Tabs */}
            <div className="grid grid-cols-2 gap-1 bg-[#171920] p-0.5 rounded-lg border border-[#262832]">
              <button
                onClick={() => {
                  soundManager.playSelectSound();
                  setOrderSide('buy');
                }}
                className={`py-1.5 rounded font-black text-[11px] uppercase tracking-wider transition cursor-pointer shadow-sm ${
                  orderSide === 'buy' ? 'bg-emerald-600 text-white shadow-emerald-950/50' : 'text-zinc-400 hover:text-white'
                }`}
              >
                Mua Vào
              </button>
              <button
                onClick={() => {
                  soundManager.playSelectSound();
                  setOrderSide('sell');
                }}
                className={`py-1.5 rounded font-black text-[11px] uppercase tracking-wider transition cursor-pointer shadow-sm ${
                  orderSide === 'sell' ? 'bg-rose-600 text-white shadow-rose-950/50' : 'text-zinc-400 hover:text-white'
                }`}
              >
                Bán Ra
              </button>
            </div>

            {/* Order Type: Market vs Limit */}
            <div className="grid grid-cols-2 gap-1 text-[9px] font-bold">
              <button
                onClick={() => setOrderType('market')}
                className={`py-0.5 rounded border transition cursor-pointer ${
                  orderType === 'market' ? 'bg-zinc-800 border-zinc-600 text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'
                }`}
              >
                Khớp Ngay
              </button>
              <button
                onClick={() => setOrderType('limit')}
                className={`py-0.5 rounded border transition cursor-pointer ${
                  orderType === 'limit' ? 'bg-zinc-800 border-zinc-600 text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'
                }`}
              >
                Đặt Giá
              </button>
            </div>

            {/* Inputs: Limit Price + Quantity */}
            <div className="space-y-1.5 pt-0.5">
              {orderType === 'limit' && (
                <div>
                  <div className="flex justify-between text-[9px] text-zinc-400 mb-0.5">
                    <span>Giá đặt ($)</span>
                    <span className="text-zinc-500">${currentCard?.currentPrice.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setLimitPriceInput((prev) => Math.max(0.1, Number((parseFloat(prev || '0') - 1).toFixed(2))).toString())}
                      className="px-1.5 py-1 bg-zinc-800 hover:bg-zinc-700 rounded text-white font-bold cursor-pointer"
                    >
                      <Minus className="w-2.5 h-2.5" />
                    </button>
                    <input
                      type="number"
                      step="0.5"
                      value={limitPriceInput}
                      onChange={(e) => setLimitPriceInput(e.target.value)}
                      className="flex-1 bg-[#171920] border border-[#262832] rounded px-1.5 py-1 text-xs text-white font-mono text-center focus:outline-none focus:border-emerald-500"
                    />
                    <button
                      onClick={() => setLimitPriceInput((prev) => (Number((parseFloat(prev || '0') + 1).toFixed(2))).toString())}
                      className="px-1.5 py-1 bg-zinc-800 hover:bg-zinc-700 rounded text-white font-bold cursor-pointer"
                    >
                      <Plus className="w-2.5 h-2.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Quantity Selector with quick chips */}
              <div>
                <div className="flex justify-between text-[9px] text-zinc-400 mb-0.5">
                  <span>Số lượng {orderSide === 'buy' ? 'mua' : 'bán'}</span>
                  <span className="text-zinc-500">Thẻ lẻ</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setTradeVolume((v) => Math.max(1, v - 1))}
                    className="px-1.5 py-1 bg-zinc-800 hover:bg-zinc-700 rounded text-white font-bold cursor-pointer"
                  >
                    <Minus className="w-2.5 h-2.5" />
                  </button>
                  <input
                    type="number"
                    min="1"
                    value={tradeVolume}
                    onChange={(e) => setTradeVolume(Math.max(1, parseInt(e.target.value) || 1))}
                    className="flex-1 bg-[#171920] border border-[#262832] rounded px-1.5 py-1 text-xs text-white font-mono text-center focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    onClick={() => setTradeVolume((v) => v + 1)}
                    className="px-1.5 py-1 bg-zinc-800 hover:bg-zinc-700 rounded text-white font-bold cursor-pointer"
                  >
                    <Plus className="w-2.5 h-2.5" />
                  </button>
                </div>

                {/* Quick preset chips */}
                <div className="grid grid-cols-5 gap-1 mt-1 text-[9px] font-bold">
                  {(currentCard?.regime === 'meme_ponzi' ? [1, 10, 50, 100] : [1, 2, 5, 10]).map((num) => (
                    <button
                      key={num}
                      onClick={() => setTradeVolume(num)}
                      className={`py-0.5 rounded bg-[#171920] border border-[#262832] hover:border-emerald-500 text-zinc-300 cursor-pointer ${
                        tradeVolume === num ? 'border-emerald-500 text-emerald-400 font-black' : ''
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                  <button
                    onClick={() => setTradeVolume(playerHoldingStack?.quantity || 1)}
                    className="py-0.5 rounded bg-[#171920] border border-[#262832] hover:border-emerald-500 text-amber-300 font-black cursor-pointer truncate"
                  >
                    All
                  </button>
                </div>
              </div>

              {/* Price Calculation Breakdown */}
              <div className="bg-[#171920] rounded-lg p-2 border border-[#262832] text-[9px] font-mono space-y-0.5">
                <div className="flex justify-between text-zinc-400">
                  <span>Giá mỗi thẻ:</span>
                  <span className="text-white">${(orderType === 'limit' ? parseFloat(limitPriceInput) || currentCard?.currentPrice : currentCard?.currentPrice).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Thuế sàn (1%):</span>
                  <span className="text-amber-400 font-bold">
                    ${(((orderType === 'limit' ? parseFloat(limitPriceInput) || currentCard?.currentPrice : currentCard?.currentPrice) * tradeVolume) * 0.01).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Thuế lãi (10%):</span>
                  <span className="text-zinc-500">Ghi Bill</span>
                </div>
                <div className="border-t border-[#262832] pt-1 flex justify-between font-bold text-white text-[10px]">
                  <span>{orderSide === 'buy' ? 'Tổng chi:' : 'Thực nhận:'}</span>
                  <span className={orderSide === 'buy' ? 'text-emerald-400' : 'text-rose-400'}>
                    ${orderSide === 'buy'
                      ? (((orderType === 'limit' ? parseFloat(limitPriceInput) || currentCard?.currentPrice : currentCard?.currentPrice) * tradeVolume) * 1.01).toFixed(2)
                      : (((orderType === 'limit' ? parseFloat(limitPriceInput) || currentCard?.currentPrice : currentCard?.currentPrice) * tradeVolume) * 0.99).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Action Area */}
          <div className="space-y-1.5">
            <div className="px-1.5 py-1 rounded bg-zinc-900 border border-zinc-800 text-[8px] text-zinc-400 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-400 shrink-0" />
              <span className="truncate">Bandai/Nintendo chính hãng</span>
            </div>

            <button
              onClick={handleExecuteTrade}
              className={`w-full py-2.5 rounded-lg font-black text-[11px] uppercase tracking-wider transition cursor-pointer shadow-md ${
                orderSide === 'buy'
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/50'
                  : 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-950/50'
              }`}
            >
              {orderSide === 'buy'
                ? `MUA ${tradeVolume} THẺ`
                : `BÁN ${tradeVolume} THẺ`}
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. BOTTOM STATUS BAR                                                      */}
      {/* ========================================================================= */}
      <div className="h-6 bg-[#0c0d10] border-t border-[#22242c] px-3 flex items-center justify-between text-[10px] text-zinc-500 shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-emerald-400 font-bold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
            GMGN TCG Terminal
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-zinc-400">Game Day {shopState.currentDay} • {shopState.inGameHour}:00</span>
          <span className="text-emerald-400 font-bold">Stable 60 FPS</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. CARD ARTWORK FULLSCREEN ZOOM MODAL                                     */}
      {/* ========================================================================= */}
      {previewArtUrl && (
        <div
          onClick={() => setPreviewArtUrl(null)}
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#14151c] border border-amber-400/80 rounded-3xl p-4 shadow-2xl max-w-sm w-full space-y-3 flex flex-col items-center"
          >
            <div className="flex items-center justify-between w-full border-b border-zinc-800 pb-2">
              <span className="text-xs font-black text-amber-300">{currentCard?.name}</span>
              <button
                onClick={() => setPreviewArtUrl(null)}
                className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-white"
              >
                ✕
              </button>
            </div>
            <div className="w-64 h-92 rounded-2xl overflow-hidden border-2 border-amber-400/50 shadow-2xl bg-black">
              <img src={previewArtUrl} alt="Card Preview" className="w-full h-full object-contain" />
            </div>
            <div className="text-[10px] text-zinc-400 text-center font-mono">
              {currentCard?.cardCode} • {currentCard?.rarity} • Giá Sàn: ${currentCard?.currentPrice.toFixed(2)}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. ONBOARDING & MODALS                                                    */}
      {/* ========================================================================= */}
      {showIntroModal && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4">
          <div className="bg-[#121216] border border-[#262830] rounded-3xl max-w-xl w-full p-6 text-white space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center text-black font-black text-sm">👾</span>
                <span className="text-base font-black text-white">LUẬT SÀN THẺ TCG EXCHANGE</span>
              </div>
              <button
                onClick={() => {
                  setShowIntroModal(false);
                  updateExchangeState((prev) => ({ ...prev, hasSeenIntro: true }));
                }}
                className="w-7 h-7 rounded-full bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-zinc-300 leading-relaxed max-h-[420px] overflow-y-auto pr-1">
              <div className="p-3 rounded-2xl bg-amber-950/40 border border-amber-500/40 text-amber-200">
                ⚠️ <strong className="text-white">LƯU Ý:</strong> {CARD_EXCHANGE_CONFIG.DISCLAIMER} Toàn bộ là mô phỏng trò chơi, ví tiền dùng chung với shop, không có tiền thật hay on-chain.
              </div>

              <div>
                <strong className="text-emerald-400 uppercase text-[11px]">1. Sổ Thẻ Số Hóa (ERC-721 & ERC-1155):</strong>
                <p className="mt-1">
                  • <strong>Thẻ Độc Nhất (ERC-721):</strong> Thẻ có Serial giới hạn, Alt Art, Manga, Grading PSA 10. Số serial thấp (&lt;10%) được cộng <strong>+15%</strong> giá, tự rút đầu tiên được cộng thêm <strong>+5%</strong>.
                </p>
                <p className="mt-1">
                  • <strong>Thẻ Thường (ERC-1155):</strong> Gom thành chồng số lượng, dễ dàng giao dịch theo lô hoặc từng thẻ lẻ.
                </p>
              </div>

              <div>
                <strong className="text-cyan-400 uppercase text-[11px]">2. Khớp Lệnh & Thuế:</strong>
                <p className="mt-1">
                  Thuế sàn <strong>1%</strong> trên mỗi lệnh mua/bán. Thuế chốt lời <strong>10%</strong> trên khoản lãi thực tế (ghi vào app Bill).
                </p>
              </div>

              <div>
                <strong className="text-purple-400 uppercase text-[11px]">3. Cảnh Báo Phá Sản:</strong>
                <p className="mt-1">
                  Ví tiền dùng chung trực tiếp với ngân sách cửa hàng. Giao dịch không cấp XP. Nếu thua lỗ hết tiền, cửa hàng sẽ phá sản!
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                setShowIntroModal(false);
                updateExchangeState((prev) => ({ ...prev, hasSeenIntro: true }));
              }}
              className="w-full py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider transition cursor-pointer"
            >
              Tôi Đã Hiểu & Bắt Đầu Giao Dịch
            </button>
          </div>
        </div>
      )}

      {showSyncShopModal && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4">
          <div className="bg-[#121216] border border-[#262830] rounded-3xl max-w-md w-full p-6 text-white space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <span className="text-sm font-black text-white">SĂN THẺ TỪ SHOP LÊN SÀN</span>
              <button onClick={() => setShowSyncShopModal(false)} className="w-7 h-7 rounded-full bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-zinc-300">
              Số hóa thẻ hiếm từ cửa hàng thành thẻ độc nhất ERC-721 với số Serial giới hạn và bảo hiểm giá +20%:
            </p>
            <div className="space-y-2">
              <button
                onClick={() => handleSyncFromShop('onepiece')}
                className="w-full p-3 rounded-2xl bg-rose-950/40 hover:bg-rose-900/60 border border-rose-500/40 flex items-center justify-between transition cursor-pointer text-left"
              >
                <div>
                  <div className="text-xs font-black text-rose-300">Monkey D. Luffy Gear 5 (Manga Secret)</div>
                  <div className="text-[10px] text-zinc-400">One Piece TCG • Serial &lt;10% • PSA 10</div>
                </div>
                <ArrowRight className="w-4 h-4 text-rose-400" />
              </button>
              <button
                onClick={() => handleSyncFromShop('pokemon')}
                className="w-full p-3 rounded-2xl bg-amber-950/40 hover:bg-amber-900/60 border border-amber-500/40 flex items-center justify-between transition cursor-pointer text-left"
              >
                <div>
                  <div className="text-xs font-black text-amber-300">Charizard Obsidian Nova (Manga Holo)</div>
                  <div className="text-[10px] text-zinc-400">Pokémon TCG • Serial &lt;10% • PSA 10</div>
                </div>
                <ArrowRight className="w-4 h-4 text-amber-400" />
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedUniqueCardForHistory && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4">
          <div className="bg-[#121216] border border-[#262830] rounded-3xl max-w-md w-full p-6 text-white space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div>
                <div className="text-sm font-black text-white">LỊCH SỬ CHỦ SỞ HỮU</div>
                <div className="text-[10px] text-zinc-400 font-mono">
                  {selectedUniqueCardForHistory.name} #{selectedUniqueCardForHistory.serial?.number}/{selectedUniqueCardForHistory.serial?.total}
                </div>
              </div>
              <button onClick={() => setSelectedUniqueCardForHistory(null)} className="w-7 h-7 rounded-full bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {selectedUniqueCardForHistory.ownerHistory.map((h, i) => (
                <div key={h.id || i} className="p-2.5 rounded-xl bg-black/40 border border-zinc-800 text-xs">
                  <div className="flex justify-between font-bold text-emerald-400">
                    <span>{h.owner}</span>
                    <span className="text-[10px] text-zinc-400">Day {h.gameDay} • {h.gameHour}:00</span>
                  </div>
                  <div className="text-[11px] text-zinc-400 mt-1">Loại: <span className="text-white uppercase">{h.type}</span></div>
                </div>
              ))}
            </div>
            <button onClick={() => setSelectedUniqueCardForHistory(null)} className="w-full py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-white transition cursor-pointer">
              Đóng
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

// ==========================================
// PURE HTML5 CANVAS CANDLESTICK CHART (TRADINGVIEW PRO LEVEL)
// - Kéo thả chuột / touch để di chuyển (Pan)
// - Cuộn chuột / nút phóng to thu nhỏ (Zoom)
// - Con trỏ chữ thập (Crosshair) & Bảng thông số OHLCV thời gian thực
// - Tự động co giãn trục giá (Auto-scale) theo nến đang hiển thị
// - Đa khung thời gian (1m, 5m, 15m, 1H, 4H, 1D, 1W) chuẩn xác
// ==========================================
interface GmgnCanvasChartProps {
  candles: CandleStick[];
  currentPrice: number;
  cardName: string;
  timeframe: ChartTimeframe;
  livePulse: number;
  marketMode?: MarketModeType;
  drawingTool?: 'crosshair' | 'line' | 'fib' | 'brush' | 'text';
}

const GmgnCanvasChart: React.FC<GmgnCanvasChartProps> = ({
  candles,
  currentPrice,
  cardName,
  timeframe,
  livePulse,
  marketMode = 'crypto',
  drawingTool = 'crosshair',
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // TradingView Viewport State (Pan & Zoom)
  const [panOffsetX, setPanOffsetX] = useState<number>(0);
  const [panOffsetY, setPanOffsetY] = useState<number>(0);
  const [zoomScale, setZoomScale] = useState<number>(1.0);

  // Interaction State
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number; initialPanX: number; initialPanY: number } | null>(null);
  const [hoverCoord, setHoverCoord] = useState<{ x: number; y: number } | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // Reset pan & zoom whenever card or timeframe switches
  useEffect(() => {
    setPanOffsetX(0);
    setPanOffsetY(0);
    setZoomScale(1.0);
    setHoverCoord(null);
    setHoverIndex(null);
  }, [cardName, timeframe]);

  // Non-passive wheel event listener on canvas for smooth TradingView zoom
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;
      setZoomScale((prev) => Math.min(2.8, Math.max(0.5, prev * zoomFactor)));
    };

    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      canvas.removeEventListener('wheel', handleWheel);
    };
  }, []);

  // Main Canvas Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    // Background
    ctx.fillStyle = '#08080b';
    ctx.fillRect(0, 0, width, height);

    // Watermark "GMGN · TRADINGVIEW" in background
    ctx.save();
    ctx.font = '900 32px sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.025)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('GMGN.TCG · TRADINGVIEW', width / 2, height / 2 + 10);
    ctx.restore();

    if (!candles || candles.length < 2) {
      ctx.fillStyle = '#71717a';
      ctx.font = '11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('Đang tải dữ liệu nến...', width / 2, height / 2);
      return;
    }

    const margin = { top: 24, right: 62, bottom: 22, left: 10 };
    const chartWidth = Math.max(10, width - margin.left - margin.right);
    const chartHeight = Math.max(10, height - margin.top - margin.bottom);
    const priceAreaHeight = chartHeight * 0.78;
    const volumeAreaHeight = chartHeight * 0.20;

    // Layout step & width per candle with zoom
    const baseStepX = chartWidth / Math.max(10, candles.length);
    const stepX = Math.max(3.5, Math.min(65, baseStepX * zoomScale));
    const candleWidth = Math.max(2, stepX * 0.68);

    // Right-align by default so newest candle rests at the right border
    const totalWidth = candles.length * stepX;
    const rightBaseX = chartWidth - totalWidth;
    const startX = margin.left + rightBaseX + panOffsetX;

    // Filter visible candles for TradingView dynamic auto-scaling
    const visibleIndices: number[] = [];
    candles.forEach((_, idx) => {
      const cx = startX + idx * stepX + stepX / 2;
      if (cx >= margin.left - stepX && cx <= margin.left + chartWidth + stepX) {
        visibleIndices.push(idx);
      }
    });

    const visibleCandles = visibleIndices.length > 0 ? visibleIndices.map((i) => candles[i]) : candles;
    let minPrice = Math.min(...visibleCandles.map((c) => c.low));
    let maxPrice = Math.max(...visibleCandles.map((c) => c.high));
    if (minPrice === maxPrice) {
      minPrice *= 0.95;
      maxPrice *= 1.05;
    }

    // Dynamic padding on Y-axis
    const pricePad = (maxPrice - minPrice) * 0.08;
    minPrice = Math.max(0.01, minPrice - pricePad);
    maxPrice = maxPrice + pricePad;
    const priceRange = maxPrice - minPrice;
    const maxVolume = Math.max(1, ...visibleCandles.map((c) => c.volume));

    const decimals = maxPrice < 5 ? 3 : 2;

    const getYForPrice = (p: number) =>
      margin.top + panOffsetY + ((maxPrice - p) / priceRange) * priceAreaHeight;

    const getPriceFromY = (y: number) =>
      maxPrice - ((y - margin.top - panOffsetY) / priceAreaHeight) * priceRange;

    // 1. Horizontal Price Grid Lines & Labels
    ctx.strokeStyle = '#181920';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.font = '9px monospace';
    ctx.fillStyle = '#636574';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    const gridLines = 4;
    for (let i = 0; i <= gridLines; i++) {
      const y = margin.top + (priceAreaHeight / gridLines) * i;
      const priceVal = maxPrice - (priceRange / gridLines) * i;

      ctx.beginPath();
      ctx.moveTo(margin.left, y);
      ctx.lineTo(margin.left + chartWidth, y);
      ctx.stroke();

      ctx.fillText(`$${priceVal.toFixed(decimals)}`, margin.left + chartWidth + 5, y);
    }
    ctx.setLineDash([]);

    // 2. Active Hovered or Latest Candle for Top OHLCV Header
    const activeCandle =
      hoverIndex !== null && candles[hoverIndex]
        ? candles[hoverIndex]
        : candles[candles.length - 1];

    if (activeCandle) {
      const isBull = activeCandle.close >= activeCandle.open;
      const chgVal = activeCandle.close - activeCandle.open;
      const chgPct = activeCandle.open > 0 ? (chgVal / activeCandle.open) * 100 : 0;
      const color = isBull ? '#10b981' : '#f43f5e';

      ctx.save();
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';

      // Symbol & Timeframe & Market badge
      ctx.fillStyle = '#ffffff';
      const marketLabel = marketMode === 'crypto' ? 'Crypto 24/7' : marketMode === 'forex' ? 'Forex 24/5' : 'HOSE VN';
      const titleText = `${cardName} · ${timeframe} (${marketLabel})`;
      ctx.fillText(titleText, margin.left, 6);

      // OHLCV stats
      ctx.fillStyle = '#71717a';
      const ohlcText = `O: $${activeCandle.open.toFixed(decimals)}  H: $${activeCandle.high.toFixed(decimals)}  L: $${activeCandle.low.toFixed(decimals)}  C: $${activeCandle.close.toFixed(decimals)}`;
      const titleWidth = ctx.measureText(titleText).width;
      ctx.fillText(ohlcText, margin.left + titleWidth + 12, 6);

      // Change % and Volume & Sub-candles count
      const ohlcWidth = ctx.measureText(ohlcText).width;
      ctx.fillStyle = color;
      const subInfo = activeCandle.subCandlesCount && activeCandle.subCandlesCount > 1
        ? ` · [${activeCandle.subCandlesCount} nến con]`
        : '';
      ctx.fillText(
        `${chgPct >= 0 ? '+' : ''}${chgPct.toFixed(2)}%  Vol: ${activeCandle.volume}${subInfo}`,
        margin.left + titleWidth + 18 + ohlcWidth,
        6
      );
      ctx.restore();
    }

    // 3. Render Candlesticks and Volume Histogram (Clipped to chart area)
    ctx.save();
    ctx.beginPath();
    ctx.rect(margin.left, margin.top - 2, chartWidth, chartHeight + 4);
    ctx.clip();

    let lastLabelX = -999;

    candles.forEach((c, index) => {
      const x = startX + index * stepX + stepX / 2;

      // Skip offscreen candles for maximum performance
      if (x < margin.left - stepX || x > margin.left + chartWidth + stepX) return;

      const isBull = c.close >= c.open;
      const color = isBull ? '#10b981' : '#f43f5e';

      // 3.1. Volume Bar
      const volH = (c.volume / maxVolume) * volumeAreaHeight;
      const volY = margin.top + chartHeight - volH;
      ctx.fillStyle = isBull ? 'rgba(16, 185, 129, 0.24)' : 'rgba(244, 63, 94, 0.24)';
      ctx.fillRect(x - candleWidth / 2, volY, candleWidth, volH);

      // 3.2. Upper & Lower Wicks
      const yHigh = getYForPrice(c.high);
      const yLow = getYForPrice(c.low);
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x, yHigh);
      ctx.lineTo(x, yLow);
      ctx.stroke();

      // 3.3. Candle Body
      const yOpen = getYForPrice(c.open);
      const yClose = getYForPrice(c.close);
      const bodyTop = Math.min(yOpen, yClose);
      const bodyH = Math.max(1.5, Math.abs(yClose - yOpen));

      ctx.fillStyle = color;
      ctx.fillRect(x - candleWidth / 2, bodyTop, candleWidth, bodyH);

      // 3.4. X-Axis Time Label (spaced at least 65px apart)
      if (x - lastLabelX >= 65) {
        ctx.fillStyle = '#636574';
        ctx.font = '9px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(c.timeLabel, x, height - 6);
        lastLabelX = x;
      }
    });

    // 4. Current Market Price Line & Live Pulse Dot
    const curY = getYForPrice(currentPrice);
    if (curY >= margin.top && curY <= margin.top + priceAreaHeight) {
      ctx.strokeStyle = '#10b981';
      ctx.setLineDash([2, 2]);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(margin.left, curY);
      ctx.lineTo(margin.left + chartWidth, curY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Pulse circle on newest candle
      const lastX = startX + (candles.length - 1) * stepX + stepX / 2;
      if (lastX >= margin.left && lastX <= margin.left + chartWidth) {
        ctx.fillStyle = '#10b981';
        ctx.beginPath();
        ctx.arc(lastX, curY, 3, 0, Math.PI * 2);
        ctx.fill();
      }

      // Live price tag on right axis
      ctx.fillStyle = '#10b981';
      ctx.fillRect(margin.left + chartWidth + 2, curY - 7, 58, 14);
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`$${currentPrice.toFixed(decimals)}`, margin.left + chartWidth + 5, curY + 3);
    }

    // 5. TradingView Crosshair (When Hovering / Moving Cursor)
    if (
      hoverCoord &&
      hoverCoord.x >= margin.left &&
      hoverCoord.x <= margin.left + chartWidth &&
      hoverCoord.y >= margin.top &&
      hoverCoord.y <= height - margin.bottom
    ) {
      const hx = hoverCoord.x;
      const hy = hoverCoord.y;

      // Vertical line through hovered candle
      if (hoverIndex !== null && candles[hoverIndex]) {
        const candleCenterX = startX + hoverIndex * stepX + stepX / 2;
        ctx.strokeStyle = '#71717a';
        ctx.setLineDash([2, 2]);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(candleCenterX, margin.top);
        ctx.lineTo(candleCenterX, height - margin.bottom);
        ctx.stroke();

        // Bottom time badge on X-axis
        const tLabel = candles[hoverIndex].timeLabel;
        ctx.font = 'bold 9px monospace';
        const tWidth = ctx.measureText(tLabel).width + 8;
        ctx.fillStyle = '#22242e';
        ctx.fillRect(candleCenterX - tWidth / 2, height - margin.bottom, tWidth, 14);
        ctx.strokeStyle = '#4b5563';
        ctx.strokeRect(candleCenterX - tWidth / 2, height - margin.bottom, tWidth, 14);
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText(tLabel, candleCenterX, height - margin.bottom + 10);
      }

      // Horizontal line through cursor Y
      ctx.strokeStyle = '#71717a';
      ctx.setLineDash([2, 2]);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(margin.left, hy);
      ctx.lineTo(margin.left + chartWidth, hy);
      ctx.stroke();
      ctx.setLineDash([]);

      // Right price badge on Y-axis
      const hoverPrice = getPriceFromY(hy);
      ctx.fillStyle = '#22242e';
      ctx.fillRect(margin.left + chartWidth + 2, hy - 7, 58, 14);
      ctx.strokeStyle = '#4b5563';
      ctx.strokeRect(margin.left + chartWidth + 2, hy - 7, 58, 14);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`$${hoverPrice.toFixed(decimals)}`, margin.left + chartWidth + 5, hy + 3);
    }

    ctx.restore();
  }, [
    candles,
    currentPrice,
    hoverCoord,
    hoverIndex,
    cardName,
    timeframe,
    livePulse,
    panOffsetX,
    panOffsetY,
    zoomScale,
  ]);

  // Mouse & Touch Pan / Drag Handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX,
      y: e.clientY,
      initialPanX: panOffsetX,
      initialPanY: panOffsetY,
    });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || candles.length === 0) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setHoverCoord({ x, y });

    // Handle Pan Dragging
    if (isDragging && dragStart) {
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      setPanOffsetX(dragStart.initialPanX + dx);
      setPanOffsetY(dragStart.initialPanY + dy * 0.4);
      return;
    }

    // Handle Crosshair Candle Hover
    const margin = { left: 10, right: 62 };
    const chartWidth = Math.max(10, rect.width - margin.left - margin.right);
    const baseStepX = chartWidth / Math.max(10, candles.length);
    const stepX = Math.max(3.5, Math.min(65, baseStepX * zoomScale));
    const totalWidth = candles.length * stepX;
    const rightBaseX = chartWidth - totalWidth;
    const startX = margin.left + rightBaseX + panOffsetX;

    const idx = Math.floor((x - startX) / stepX);
    if (idx >= 0 && idx < candles.length) {
      setHoverIndex(idx);
    } else {
      setHoverIndex(null);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDragStart(null);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
    setDragStart(null);
    setHoverCoord(null);
    setHoverIndex(null);
  };

  const handleDoubleClick = () => {
    // Reset view to default auto-fit
    setPanOffsetX(0);
    setPanOffsetY(0);
    setZoomScale(1.0);
  };

  // Touch Support for mobile/tablets
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 1) {
      const t = e.touches[0];
      setIsDragging(true);
      setDragStart({
        x: t.clientX,
        y: t.clientY,
        initialPanX: panOffsetX,
        initialPanY: panOffsetY,
      });
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (isDragging && dragStart && e.touches.length === 1) {
      const t = e.touches[0];
      const dx = t.clientX - dragStart.x;
      const dy = t.clientY - dragStart.y;
      setPanOffsetX(dragStart.initialPanX + dx);
      setPanOffsetY(dragStart.initialPanY + dy * 0.4);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    setDragStart(null);
  };

  const handleZoomIn = () => {
    setZoomScale((z) => Math.min(2.8, Number((z * 1.25).toFixed(2))));
  };

  const handleZoomOut = () => {
    setZoomScale((z) => Math.max(0.5, Number((z * 0.80).toFixed(2))));
  };

  const handleReset = () => {
    setPanOffsetX(0);
    setPanOffsetY(0);
    setZoomScale(1.0);
  };

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden select-none">
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onDoubleClick={handleDoubleClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={`w-full h-full ${isDragging ? 'cursor-grabbing' : 'cursor-crosshair'}`}
      />

      {/* Floating TradingView Controls HUD (Bottom Right) */}
      <div className="absolute right-16 bottom-1 flex items-center gap-1 bg-[#121318]/90 border border-[#272832] rounded-lg px-1.5 py-0.5 shadow-lg text-[10px]">
        <button
          onClick={handleZoomIn}
          className="px-1.5 py-0.5 hover:bg-zinc-700 rounded text-zinc-300 hover:text-white font-bold cursor-pointer transition"
          title="Phóng to nến (Cuộn chuột lên)"
        >
          +
        </button>
        <button
          onClick={handleZoomOut}
          className="px-1.5 py-0.5 hover:bg-zinc-700 rounded text-zinc-300 hover:text-white font-bold cursor-pointer transition"
          title="Thu nhỏ nến (Cuộn chuột xuống)"
        >
          -
        </button>
        <div className="h-2.5 w-px bg-zinc-700 mx-0.5" />
        <button
          onClick={handleReset}
          className="px-1.5 py-0.5 hover:bg-zinc-700 rounded text-emerald-400 font-bold cursor-pointer transition flex items-center gap-1 text-[9px]"
          title="Đặt lại khung nhìn mặc định (Double-click)"
        >
          <span>⟲ Auto</span>
        </button>
      </div>

      {/* Panning & Timeframe Status Hint */}
      {(panOffsetX !== 0 || zoomScale !== 1.0) && (
        <div className="absolute left-3 bottom-1 text-[9px] text-zinc-500 font-mono pointer-events-none">
          Kéo để cuộn · Zoom: {Math.round(zoomScale * 100)}% · Double-click để Reset
        </div>
      )}
    </div>
  );
};


