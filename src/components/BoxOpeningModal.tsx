import React, { useState, useRef, useCallback } from 'react';
import {
  X,
  Sparkles,
  Trophy,
  DollarSign,
  Store,
  BookOpen,
  Package,
  Layers,
  Zap,
  Flame,
  CheckCircle2,
  TrendingUp,
  Scissors,
  ArrowUp,
  FastForward,
  RotateCcw,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  PokemonCard,
  ripBoosterBoxWithMetadata,
  ripBoosterPackWithMetadata,
  BoxRipResult,
  PackRipResult,
  BOOSTER_SETS,
  ALL_UNIQUE_BOOSTER_SETS,
  ALL_COLLECTOR_BOXES,
  ALL_ONEPIECE_BOOSTER_SETS,
  isOnePieceSetId,
  ONEPIECE_SET_EVENTS,
  getBoosterSet,
  BoosterSetInfo,
  getCardHoloClass,
  InventoryItem,
} from '../game/pokemonShopLogic';
import { soundManager } from '../game/audio';

interface BoxOpeningModalProps {
  setId: string;
  availableBoxesCount: number;
  inventory?: InventoryItem[];
  onOpenTablet?: () => void;
  onCardKeptInShowcase: (card: PokemonCard, price: number) => void;
  onCardAddedToBinder: (card: PokemonCard) => void;
  onCardQuickSold: (card: PokemonCard, cashReceived: number) => void;
  onBoxConsumed: (setId: string) => void;
  onClose: () => void;
}

export const BoxOpeningModal: React.FC<BoxOpeningModalProps> = ({
  setId: initialSetId,
  availableBoxesCount,
  inventory,
  onOpenTablet,
  onCardKeptInShowcase,
  onCardAddedToBinder,
  onCardQuickSold,
  onBoxConsumed,
  onClose,
}) => {
  const [selectedSetId, setSelectedSetId] = useState<string>(initialSetId || 'paldeanFates');
  const [universeTab, setUniverseTab] = useState<'pokemon' | 'onepiece'>(() =>
    isOnePieceSetId(initialSetId) ? 'onepiece' : 'pokemon'
  );
  const boosterSet: BoosterSetInfo = getBoosterSet(selectedSetId);
  const expectedPacksCount = boosterSet.packsPerBox || 10;

  // Exact stock count for currently selected box set
  const currentBoxStock = inventory
    ? inventory.find((i) => i.productId === `${selectedSetId}_box` || i.productId === selectedSetId)?.quantity || 0
    : availableBoxesCount;

  // Stages: 'sealed' (Ảnh 3) | 'lid_open' (Ảnh 4) | 'pulling_pack' | 'ripping_mass' | 'summary'
  const [stage, setStage] = useState<'sealed' | 'lid_open' | 'pulling_pack' | 'ripping_mass' | 'summary'>('sealed');
  const [boxData, setBoxData] = useState<BoxRipResult | null>(null);
  const [openedPackIndices, setOpenedPackIndices] = useState<boolean[]>(
    () => new Array(expectedPacksCount).fill(false)
  );
  const [activePackIndex, setActivePackIndex] = useState<number>(0);
  const [massRipProgress, setMassRipProgress] = useState(0);

  // Single Pack Rip Sub-states (when opening pack from box)
  const [singlePackStage, setSinglePackStage] = useState<'ready_to_tear' | 'cards_slide_up' | 'pack_done'>('ready_to_tear');
  const [currentPackCardIndex, setCurrentPackCardIndex] = useState(0);
  const [revealedPackCards, setRevealedPackCards] = useState<boolean[]>(new Array(10).fill(false));
  const [packDragOffsetY, setPackDragOffsetY] = useState(0);
  const isDraggingCardRef = useRef(false);
  const dragStartYRef = useRef(0);

  // 1. Unseal Box (Ảnh 3 -> Ảnh 4)
  const handleOpenBoxLid = () => {
    if (currentBoxStock <= 0) {
      soundManager.playSelectSound();
      return;
    }
    soundManager.playBoxOpen();
    const result = ripBoosterBoxWithMetadata(selectedSetId);
    setBoxData(result);
    setOpenedPackIndices(new Array(result.packs.length).fill(false));
    onBoxConsumed(selectedSetId);

    setTimeout(() => {
      setStage('lid_open');
      soundManager.playSelectSound();
    }, 450);
  };

  // 2. Select & Pull a Pack from the Box Stack (Ảnh 4)
  const handlePullPackFromBox = (idx: number) => {
    if (!boxData || openedPackIndices[idx]) return;
    soundManager.playFoilCrinkle();
    setActivePackIndex(idx);
    setSinglePackStage('ready_to_tear');
    setCurrentPackCardIndex(0);
    setRevealedPackCards(new Array(10).fill(false));
    setPackDragOffsetY(0);
    setStage('pulling_pack');
  };

  // Helper: Pull next unopened pack in stack
  const handlePullNextPackInBox = () => {
    const nextIdx = openedPackIndices.findIndex((opened) => !opened);
    if (nextIdx !== -1) {
      handlePullPackFromBox(nextIdx);
    } else {
      // All 10 packs opened!
      triggerBoxSummary();
    }
  };

  // 3. Tear the pulled pack wrapper
  const handleTearPulledPack = () => {
    soundManager.playPackTear();
    soundManager.playFoilCrinkle();
    setSinglePackStage('cards_slide_up');
    setCurrentPackCardIndex(0);
    setPackDragOffsetY(0);
  };

  // 4. Slide up card in current pack
  const completePulledCardSlideUp = useCallback(() => {
    if (!boxData) return;
    const currentPack = boxData.packs[activePackIndex];
    if (!currentPack) return;

    soundManager.playCardFlip();
    const updated = [...revealedPackCards];
    updated[currentPackCardIndex] = true;
    setRevealedPackCards(updated);

    const currentCard = currentPack.cards[currentPackCardIndex];
    if (currentCard && (currentCard.marketPrice >= 100 || currentCard.pocketRarity === 'Crown')) {
      soundManager.playRarePullFanfare();
      confetti({ particleCount: 120, spread: 80 });
    }

    if (currentPackCardIndex < 9) {
      setCurrentPackCardIndex((prev) => prev + 1);
      setPackDragOffsetY(0);
    } else {
      // Pack finished
      const updatedOpened = [...openedPackIndices];
      updatedOpened[activePackIndex] = true;
      setOpenedPackIndices(updatedOpened);
      setSinglePackStage('pack_done');
      soundManager.playSelectSound();
    }
  }, [boxData, activePackIndex, revealedPackCards, currentPackCardIndex, openedPackIndices]);

  // Mass rip all remaining packs
  const handleMassRipAll = () => {
    if (!boxData) return;
    soundManager.playPackTear();
    setStage('ripping_mass');
    setMassRipProgress(0);

    const totalBoxPacks = boxData.packs.length;
    let current = 0;
    const interval = setInterval(() => {
      current += 10;
      setMassRipProgress(current);
      soundManager.playFoilCrinkle();

      if (current >= 100) {
        clearInterval(interval);
        setOpenedPackIndices(new Array(totalBoxPacks).fill(true));
        setTimeout(() => {
          triggerBoxSummary();
        }, 300);
      }
    }, 70);
  };

  const triggerBoxSummary = () => {
    setStage('summary');
    soundManager.playRarePullFanfare();
    confetti({
      particleCount: 220,
      spread: 120,
      origin: { y: 0.5 },
      colors: ['#f59e0b', '#ec4899', '#3b82f6', '#10b981', '#facc15'],
    });
  };

  // Batch actions
  const handleBatchKeepShowcase = () => {
    if (!boxData) return;
    boxData.hitCards.forEach((c) => {
      onCardKeptInShowcase(c, Math.round(c.marketPrice * 1.15));
    });
    soundManager.playSelectSound();
    confetti({ particleCount: 50, spread: 60 });
  };

  const handleBatchAddToBinder = () => {
    if (!boxData) return;
    boxData.hitCards.forEach((c) => {
      onCardAddedToBinder(c);
    });
    soundManager.playSelectSound();
    confetti({ particleCount: 50, spread: 60 });
  };

  const handleBatchQuickSellAll = () => {
    if (!boxData) return;
    const cash = Math.round(boxData.totalMarketValue * 0.9);
    if (boxData.packs[0]?.cards[0]) {
      onCardQuickSold(boxData.packs[0].cards[0], cash);
    }
    soundManager.playCashRegister();
    onClose();
  };

  const totalPacksInBox = boxData?.packs.length || expectedPacksCount;
  const unopenedCount = openedPackIndices.filter((opened) => !opened).length;
  const openedCount = totalPacksInBox - unopenedCount;
  const profitLoss = boxData ? boxData.totalMarketValue - boosterSet.boxWholesalePrice : 0;
  const isProfitable = profitLoss >= 0;

  const currentPackData = boxData?.packs[activePackIndex];
  const activePulledCard = currentPackData?.cards[currentPackCardIndex];

  return (
    <div className="fixed inset-0 z-50 pointer-events-auto select-none flex flex-col justify-between p-3 sm:p-5 bg-black/75 animate-in fade-in duration-150 overflow-hidden">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between w-full z-30">
        <div className="flex items-center gap-2 flex-wrap">
          {stage === 'sealed' ? (
            <div className="flex items-center gap-2 flex-wrap">
              {/* Universe Selector Tabs */}
              <div className="flex items-center gap-1 bg-black/80 p-1 rounded-full border border-white/20 shadow-md">
                <button
                  onClick={() => {
                    soundManager.playSelectSound();
                    setUniverseTab('pokemon');
                    if (isOnePieceSetId(selectedSetId)) {
                      setSelectedSetId('paldeanFates');
                      setOpenedPackIndices(new Array(10).fill(false));
                    }
                  }}
                  className={`px-3 py-1 rounded-full text-xs font-black transition cursor-pointer flex items-center gap-1 ${
                    universeTab === 'pokemon'
                      ? 'bg-amber-400 text-black shadow-[0_0_12px_rgba(251,191,36,0.5)]'
                    : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <span>⚡ Pokémon Box</span>
                </button>
                <button
                  onClick={() => {
                    soundManager.playSelectSound();
                    setUniverseTab('onepiece');
                    if (!isOnePieceSetId(selectedSetId)) {
                      setSelectedSetId('op10RoyalBlood');
                      setOpenedPackIndices(new Array(24).fill(false));
                    }
                  }}
                  className={`px-3 py-1 rounded-full text-xs font-black transition cursor-pointer flex items-center gap-1 ${
                    universeTab === 'onepiece'
                      ? 'bg-gradient-to-r from-red-600 to-rose-500 text-white shadow-[0_0_12px_rgba(244,63,94,0.5)]'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <span>🏴‍☠️ One Piece Box</span>
                </button>
              </div>

              {/* Box Sets Buttons */}
              <div className="flex items-center gap-1.5 flex-wrap max-w-2xl">
                {(universeTab === 'pokemon'
                  ? [...ALL_UNIQUE_BOOSTER_SETS, ...ALL_COLLECTOR_BOXES]
                  : ALL_ONEPIECE_BOOSTER_SETS
                ).map((s) => {
                  const stock = inventory
                    ? inventory.find((i) => i.productId === `${s.id}_box` || i.productId === s.id)?.quantity || 0
                    : 0;
                  return (
                    <button
                      key={s.id}
                      onClick={() => {
                        soundManager.playSelectSound();
                        setSelectedSetId(s.id);
                        setOpenedPackIndices(new Array(s.packsPerBox || 10).fill(false));
                      }}
                      className={`px-3 py-1.5 rounded-full text-xs font-black transition cursor-pointer border drop-shadow-md flex items-center gap-1.5 ${
                        selectedSetId === s.id
                          ? universeTab === 'onepiece'
                            ? 'bg-rose-500 text-white border-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.6)]'
                            : 'bg-amber-400 text-black border-amber-300 shadow-[0_0_15px_rgba(251,191,36,0.6)]'
                          : stock > 0
                          ? 'bg-black/75 text-zinc-200 border-white/20 hover:border-amber-400'
                          : 'bg-black/50 text-zinc-500 border-zinc-800'
                      }`}
                    >
                      <span>{s.name.replace('Scarlet & Violet: ', '').replace('Sword & Shield: ', '').split(':')[0]}</span>
                      <span
                        className={`rounded px-1.5 py-0.2 text-[10px] font-mono ${
                          stock > 0
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                            : 'bg-zinc-800 text-zinc-500'
                        }`}
                      >
                        {stock}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-black/85 px-4 py-1.5 rounded-full border border-amber-400/50 text-amber-300 font-black text-xs sm:text-sm drop-shadow">
              <Package className="h-4 w-4 text-amber-400" />
              <span>{boosterSet.name} · {totalPacksInBox} Packs</span>
            </div>
          )}
        </div>

        <button
          onClick={onClose}
          aria-label="Đóng bàn mở box"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-black/75 text-zinc-300 border border-white/20 hover:border-amber-400 hover:text-white transition cursor-pointer drop-shadow"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Main Center Area */}
      <div
        className={`flex-1 flex items-center justify-center py-2 relative w-full h-full ${
          stage === 'summary' ? 'overflow-y-auto' : 'overflow-visible'
        }`}
      >
        {/* ============================================================ */}
        {/* STAGE 1: SEALED BOOSTER BOX ON COUNTER (RAW AUTHENTIC IMAGE) */}
        {/* ============================================================ */}
        {stage === 'sealed' && (
          <div className="flex flex-col items-center text-center max-w-lg select-none">
            {/* Raw Authentic Booster Box Display (NO ARTIFICIAL FRAMING) */}
            <div
              onClick={currentBoxStock > 0 ? handleOpenBoxLid : undefined}
              className={`group relative transition-transform duration-300 flex flex-col items-center ${
                currentBoxStock > 0
                  ? 'cursor-pointer hover:scale-105 active:scale-95'
                  : 'cursor-not-allowed opacity-75 grayscale-[30%]'
              }`}
            >
              {/* Authentic Box Artwork */}
              <img
                src={boosterSet.boxImageUrl}
                alt={boosterSet.name}
                className="max-h-[360px] sm:max-h-[420px] w-auto object-contain drop-shadow-[0_25px_60px_rgba(0,0,0,0.95)] transition-transform duration-300 group-hover:scale-102"
              />

              {/* Floating seal tag with live stock */}
              <div className="absolute top-4 px-4 py-1.5 rounded-full bg-black/85 border border-amber-400 text-amber-300 font-black text-xs uppercase tracking-wider shadow-xl flex items-center gap-1.5">
                <span>{currentBoxStock > 0 ? '🔒' : '🚫'}</span>
                <span>
                  {currentBoxStock > 0
                    ? `SEAL CHÍNH HÃNG · ${expectedPacksCount} GÓI BÀI (CÒN ${currentBoxStock} HỘP)`
                    : 'HẾT HÀNG TRONG KHO (0 HỘP)'}
                </span>
              </div>
            </div>

            {/* Set Name & Price */}
            <div className="mt-4 text-center">
              <h3 className="text-xl sm:text-2xl font-black text-white tracking-wide drop-shadow-md">
                {boosterSet.name}
              </h3>
              <p className="text-xs sm:text-sm text-amber-300 font-bold mt-1">
                Giá nhập sỉ: ${boosterSet.boxWholesalePrice.toFixed(2)} · Bán lẻ: ${boosterSet.boxRetailPrice.toFixed(2)}
              </p>
            </div>

            {/* Stock Notice & Tablet Action if empty */}
            {currentBoxStock <= 0 ? (
              <div className="mt-3 flex flex-col items-center gap-2 rounded-2xl bg-rose-950/70 border border-rose-500/50 p-3 text-rose-200 text-xs">
                <span>⚠️ Bạn chưa có hộp này trong kho hoặc trên kệ!</span>
                {onOpenTablet && (
                  <button
                    onClick={() => {
                      onClose();
                      onOpenTablet();
                    }}
                    className="flex items-center gap-1.5 rounded-xl bg-amber-400 px-4 py-2 font-black text-black hover:bg-amber-300 transition cursor-pointer shadow-lg"
                  >
                    <span>📱 Mở Tablet Đặt Hộp Này Về Shop</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="mt-3 text-xs text-emerald-400 font-bold">
                ✓ Sẵn sàng khui seal! Bạn đang có {currentBoxStock} hộp.
              </div>
            )}

            {/* Open Box Button */}
            <div className="mt-4 flex items-center gap-3">
              <button
                disabled={currentBoxStock <= 0}
                onClick={handleOpenBoxLid}
                className={`flex items-center gap-2 rounded-2xl px-8 py-3.5 font-black text-sm uppercase tracking-wider font-sans transition ${
                  currentBoxStock > 0
                    ? 'bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-black shadow-[0_10px_30px_rgba(245,158,11,0.5)] hover:from-amber-300 hover:to-amber-400 cursor-pointer'
                    : 'bg-zinc-800 text-zinc-500 cursor-not-allowed opacity-50 shadow-none'
                }`}
              >
                <Scissors className="h-5 w-5" />
                <span>
                  {currentBoxStock > 0
                    ? `CẮT MÀNG CO & MỞ HỘP NGAY`
                    : 'HẾT HÀNG (CHƯA CÓ TRONG KHO)'}
                </span>
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STAGE 2: OPEN BOX WITH RAW PACKS STACK (EXACT ẢNH 4 REPLICA - NO BORDER)  */}
        {/* ========================================================================= */}
        {stage === 'lid_open' && boxData && (
          <div className="flex flex-col items-center w-full max-w-4xl select-none">
            {/* Box Event Banner */}
            {boxData.boxEventTitle && (
              <div className="w-full mb-3 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500/20 via-rose-500/20 to-amber-500/20 border border-amber-400/50 flex items-center justify-between shadow-xl flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-amber-300 animate-spin" />
                  <span className="text-xs sm:text-sm font-black text-amber-200">
                    {boxData.boxEventTitle}
                  </span>
                </div>
                {boxData.hasMangaHit && (
                  <span className="px-3 py-1 rounded-full bg-gradient-to-r from-red-600 to-rose-500 text-white font-black text-[11px] animate-pulse shadow-lg flex items-center gap-1">
                    <Flame className="h-3.5 w-3.5 fill-white" />
                    <span>MANGA CASE HIT</span>
                  </span>
                )}
              </div>
            )}

            {/* Header Status */}
            <div className="flex items-center justify-between w-full mb-3 px-3 flex-wrap gap-2">
              <div>
                <h3 className="text-base sm:text-lg font-black text-amber-300 flex items-center gap-2">
                  <Package className="h-5 w-5 text-amber-400" />
                  <span>HỘP ĐÃ MỞ: CÒN {unopenedCount}/{totalPacksInBox} GÓI BÀI</span>
                </h3>
                <p className="text-xs text-zinc-400">
                  Bấm vào gói bài thô phía trước để rút ra xé, hoặc bấm xé toàn bộ cùng lúc!
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleMassRipAll}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 px-5 py-2.5 font-black text-black shadow-lg hover:from-amber-300 hover:to-amber-500 transition cursor-pointer text-xs sm:text-sm uppercase tracking-wider"
                >
                  <Flame className="h-4 w-4" />
                  <span>XÉ TOÀN BỘ {unopenedCount} GÓI CÒN LẠI ⚡</span>
                </button>
              </div>
            </div>

            {/* RAW PACKS STACK (NO ARTIFICIAL BORDERS - DIRECT PACK IMAGE) */}
            <div className="relative w-full max-w-md h-[400px] flex items-center justify-center my-2">
              {/* Render the stack of remaining unpulled packs receding in depth (capped at 10 visual layers) */}
              <div className="relative z-10 w-64 sm:w-72 h-[360px] flex items-center justify-center">
                {Array.from({ length: Math.min(unopenedCount, 10) }).map((_, stackIdx) => {
                  const actualPackIdx = openedPackIndices.findIndex(
                    (opened, idx) => !opened && idx >= stackIdx
                  );
                  const isFront = stackIdx === 0;

                  return (
                    <div
                      key={stackIdx}
                      onClick={() => isFront && handlePullPackFromBox(actualPackIdx !== -1 ? actualPackIdx : 0)}
                      style={{
                        transform: `translate3d(0, -${stackIdx * 8}px, -${stackIdx * 18}px) scale(${1 - stackIdx * 0.025})`,
                        zIndex: 30 - stackIdx,
                        transition: 'transform 0.2s ease',
                      }}
                      className={`absolute cursor-pointer flex flex-col items-center justify-center ${
                        isFront
                          ? 'hover:scale-105 hover:-translate-y-3 drop-shadow-[0_20px_45px_rgba(245,158,11,0.6)]'
                          : 'opacity-85 pointer-events-none'
                      }`}
                    >
                      {/* RAW PACK IMAGE DIRECTLY (NO HEAVY BORDER/CONTAINER) */}
                      <img
                        src={boosterSet.packImageUrl}
                        alt={boosterSet.name}
                        className="h-[320px] sm:h-[350px] w-auto object-contain drop-shadow-[0_15px_30px_rgba(0,0,0,0.9)]"
                      />

                      {/* Pull Prompt on Front Pack */}
                      {isFront && (
                        <div className="absolute bottom-6 px-3 py-1 rounded-full bg-amber-400 text-black font-black text-xs uppercase tracking-wider shadow-lg animate-bounce">
                          👆 Bấm để rút gói này!
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quick Action below Box */}
            <div className="mt-3 flex items-center gap-3">
              <button
                onClick={handlePullNextPackInBox}
                className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 px-8 py-3 font-black text-black shadow-xl hover:from-amber-300 hover:to-amber-400 transition cursor-pointer text-sm uppercase tracking-wider"
              >
                <Sparkles className="h-4 w-4" />
                <span>RÚT GÓI BÀI TIẾP THEO ĐỂ XÉ</span>
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STAGE: RIPPING INDIVIDUAL PACK PULLED FROM BOX (RAW PACK - NO BORDER)      */}
        {/* ========================================================================= */}
        {stage === 'pulling_pack' && currentPackData && (
          <div className="relative w-full h-full flex items-center justify-center select-none">
            {/* Step 1: Ready to tear top seam */}
            {singlePackStage === 'ready_to_tear' && (
              <div className="flex flex-col items-center">
                <div
                  onClick={handleTearPulledPack}
                  className="relative cursor-pointer transition-transform duration-300 hover:scale-105 flex flex-col items-center"
                >
                  {/* RAW BOOSTER PACK IMAGE */}
                  <img
                    src={boosterSet.packImageUrl}
                    alt={boosterSet.name}
                    className="h-[440px] sm:h-[500px] w-auto max-w-[340px] sm:max-w-[400px] object-contain drop-shadow-[0_25px_60px_rgba(0,0,0,0.95)]"
                  />

                  {/* Minimal top tear badge */}
                  <div className="absolute top-4 inset-x-0 h-16 flex flex-col items-center justify-center">
                    <div className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-black/85 text-amber-300 text-xs font-black uppercase tracking-wider border border-amber-400 shadow-xl hover:bg-amber-400 hover:text-black transition">
                      <Scissors className="h-4 w-4 animate-bounce" />
                      <span>XÉ MỞ GÓI BÀI #{activePackIndex + 1}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleTearPulledPack}
                  className="mt-4 flex items-center gap-2 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 px-8 py-3 font-black text-black text-sm uppercase tracking-wider shadow-xl cursor-pointer"
                >
                  <Scissors className="h-5 w-5" />
                  <span>XÉ GÓI BÀI #{activePackIndex + 1} NGAY</span>
                </button>
              </div>
            )}

            {/* Step 2: Sliding cards up from pack wrapper (NO YELLOW BACKGROUND CONTAINER) */}
            {singlePackStage === 'cards_slide_up' && activePulledCard && (
              <div className="relative w-full h-full flex items-center justify-center">
                {/* LEFT SIDE MANGA ONOMATOPOEIA & HIT EVENT OVERLAY */}
                {(activePulledCard.isManga ||
                  (activePulledCard.universe === 'onepiece' &&
                    (activePulledCard.pocketRarity === 'Crown' || activePulledCard.pocketRarity === 'Star3'))) && (
                  <div className="absolute left-4 sm:left-12 md:left-20 top-1/2 -translate-y-1/2 flex flex-col items-center z-30 pointer-events-none select-none animate-in zoom-in-90 duration-300">
                    <div className="relative flex flex-col items-center">
                      <div
                        className="text-6xl sm:text-8xl font-black text-rose-500 tracking-tighter drop-shadow-[0_6px_20px_rgba(239,68,68,0.9)] filter scale-110 -rotate-6 select-none"
                        style={{
                          fontFamily: "'Fredoka', 'Impact', 'Arial Black', sans-serif",
                          textShadow: '3px 3px 0 #000, -3px -3px 0 #000, 3px -3px 0 #000, -3px 3px 0 #000',
                        }}
                      >
                        ドン!!
                      </div>
                      <div className="px-3.5 py-1.5 rounded-full bg-gradient-to-r from-red-600 via-amber-500 to-yellow-400 text-black font-black text-xs sm:text-sm uppercase tracking-widest shadow-2xl mt-1 border-2 border-white flex items-center gap-1.5 animate-pulse">
                        <Flame className="h-4 w-4 fill-black" />
                        <span>MANGA RARE HIT</span>
                      </div>
                      <div className="mt-2.5 max-w-[240px] text-center text-xs font-bold text-amber-200 bg-black/85 px-3.5 py-2 rounded-xl border border-amber-400/50 shadow-lg">
                        "{ONEPIECE_SET_EVENTS[selectedSetId]?.mangaQuote || activePulledCard.flavorText || 'Divine Departure!'}"
                      </div>
                      <div className="mt-1.5 text-[11px] font-mono text-zinc-300 bg-black/60 px-2 py-0.5 rounded border border-white/10">
                        PWR {(activePulledCard.hp || activePulledCard.power || 5000).toLocaleString()} · {activePulledCard.setNumber || activePulledCard.cardNumber || activePulledCard.id}
                      </div>
                    </div>
                  </div>
                )}

                {/* Floating arcade value on right */}
                <div className="absolute right-4 sm:right-16 md:right-24 top-1/2 -translate-y-1/2 flex flex-col items-start z-30 pointer-events-none select-none">
                  <span
                    className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight drop-shadow-[0_3px_5px_rgba(0,0,0,1)]"
                    style={{
                      fontFamily: "'Fredoka', 'Nunito', 'Arial Black', sans-serif",
                      textShadow: '2px 2px 0px #000, -2px -2px 0px #000, 2px -2px 0px #000, -2px 2px 0px #000, 0px 4px 8px rgba(0,0,0,0.8)',
                    }}
                  >
                    Card Value
                  </span>
                  <span
                    className="text-5xl sm:text-7xl font-black text-[#ffe600] tracking-tight tabular-nums mt-0.5"
                    style={{
                      fontFamily: "'Fredoka', 'Nunito', 'Arial Black', sans-serif",
                      textShadow: '3px 3px 0px #000, -3px -3px 0px #000, 3px -3px 0px #000, -3px 3px 0px #000, 0px 6px 12px rgba(0,0,0,0.9)',
                    }}
                  >
                    ${activePulledCard.marketPrice.toFixed(2)}
                  </span>
                  <span className="text-xs text-zinc-300 font-bold mt-1 bg-black/60 px-3 py-1 rounded-full">
                    Thẻ {currentPackCardIndex + 1}/{currentPackData.cards.length} · Gói #{activePackIndex + 1}
                  </span>
                </div>

                {/* DIRECT CARD STACK (KHUNG VÀNG PHÍA SAU ĐÃ ĐƯỢC XÓA HOÀN TOÀN) */}
                <div className="relative w-[270px] sm:w-[310px] aspect-[63/88] flex items-center justify-center overflow-visible">
                  {/* Next card peek underneath in current pack */}
                  {currentPackCardIndex < 9 && currentPackData.cards[currentPackCardIndex + 1] && (
                    <div className="absolute w-[250px] sm:w-[290px] aspect-[63/88] rounded-2xl bg-zinc-900 border-2 border-zinc-700 opacity-60 scale-95 pointer-events-none shadow-lg overflow-hidden">
                      <img
                        src={currentPackData.cards[currentPackCardIndex + 1].imageUrl}
                        alt="Next Card"
                        className="w-full h-full object-contain"
                      />
                    </div>
                  )}

                  {/* Active Card */}
                  <div
                    onClick={completePulledCardSlideUp}
                    className={`relative w-[250px] sm:w-[290px] aspect-[63/88] rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.95)] cursor-pointer select-none z-20 overflow-visible ${
                      getCardHoloClass(activePulledCard.marketPrice, activePulledCard.hasRgbAura)
                    } ${activePulledCard.marketPrice < 5 && !activePulledCard.hasRgbAura ? 'border-2 border-white/60' : ''}`}
                  >
                    <div
                      className="relative w-full h-full rounded-2xl overflow-hidden flex items-center justify-center"
                      style={{
                        background: `linear-gradient(135deg, ${activePulledCard.cardColor || '#1e293b'} 0%, #090d16 100%)`,
                      }}
                    >
                      <div className="absolute inset-0 p-3 flex flex-col justify-between select-none pointer-events-none opacity-80">
                        <span className="text-xs font-black text-white/90 truncate uppercase">{activePulledCard.name}</span>
                        <div className="flex items-center justify-between text-[11px] text-zinc-400 font-mono">
                          <span>{activePulledCard.setNumber}</span>
                          <span className="text-amber-300 font-bold">{activePulledCard.raritySymbol || '♢'}</span>
                        </div>
                      </div>
                      <img
                        src={activePulledCard.imageUrl}
                        alt={activePulledCard.name}
                        onError={(e) => {
                          const img = e.currentTarget as HTMLImageElement;
                          if (img.src.includes('_p1.jpg') || img.src.includes('_p2.jpg')) {
                            img.src = img.src.replace(/_p\d+\.jpg/, '.jpg');
                          } else if (img.src.includes('_p1.png') || img.src.includes('_p2.png')) {
                            img.src = img.src.replace(/_p\d+\.png/, '.png');
                          } else if (activePulledCard.artUrl && img.src !== activePulledCard.artUrl) {
                            img.src = activePulledCard.artUrl;
                          } else if (activePulledCard.fallbackUrl && img.src !== activePulledCard.fallbackUrl) {
                            img.src = activePulledCard.fallbackUrl;
                          }
                        }}
                        className="relative z-10 w-full h-full object-contain"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Pack finished - fan out 10 cards */}
            {singlePackStage === 'pack_done' && (
              <div className="flex flex-col items-center w-full max-w-6xl px-2 sm:px-6 text-center overflow-visible">
                <div className="text-sm font-black text-amber-300 mb-1">
                  ĐÃ XÉ XONG GÓI #{activePackIndex + 1} · {unopenedCount > 0 ? `Còn ${unopenedCount} gói trong hộp` : 'Hết toàn bộ gói!'}
                </div>

                {/* 10-card row fan (zero clipping on top/bottom/sides) */}
                <div className="grid grid-cols-5 gap-1.5 sm:flex sm:items-center sm:justify-center sm:gap-0 sm:-space-x-9 md:-space-x-11 lg:-space-x-12 w-full py-6 sm:py-10 px-2 sm:px-6 overflow-visible">
                  {currentPackData.cards.map((c, i) => (
                    <div
                      key={c.id + i}
                      style={{
                        transform: `rotate(${(i - 4.5) * 1.6}deg) translateY(${Math.abs(i - 4.5) * 2.5}px)`,
                        zIndex: i + 1,
                      }}
                      className={`relative w-full sm:w-28 md:w-32 lg:w-36 aspect-[63/88] h-auto rounded-xl shadow-[0_14px_30px_rgba(0,0,0,0.85)] transition-transform duration-200 hover:scale-110 hover:-translate-y-5 hover:z-50 cursor-pointer overflow-hidden flex-shrink-0 bg-zinc-950 ${
                        getCardHoloClass(c.marketPrice, c.hasRgbAura)
                      } ${c.marketPrice < 5 && !c.hasRgbAura ? 'border-2 border-white/40' : ''}`}
                    >
                      <div
                        className="relative w-full h-full rounded-xl overflow-hidden flex items-center justify-center"
                        style={{
                          background: `linear-gradient(135deg, ${c.cardColor || '#1e293b'} 0%, #090d16 100%)`,
                        }}
                      >
                        <div className="absolute inset-0 p-1 flex flex-col justify-between select-none pointer-events-none opacity-80">
                          <span className="text-[9px] font-black text-white/90 truncate">{c.name}</span>
                          <span className="text-[8px] text-zinc-400 font-mono">{c.setNumber}</span>
                        </div>
                        <img
                          src={c.imageUrl}
                          alt={c.name}
                          onError={(e) => {
                            const img = e.currentTarget as HTMLImageElement;
                            if (img.src.includes('_p1.jpg') || img.src.includes('_p2.jpg')) {
                              img.src = img.src.replace(/_p\d+\.jpg/, '.jpg');
                            } else if (img.src.includes('_p1.png') || img.src.includes('_p2.png')) {
                              img.src = img.src.replace(/_p\d+\.png/, '.png');
                            } else if (c.artUrl && img.src !== c.artUrl) {
                              img.src = c.artUrl;
                            } else if (c.fallbackUrl && img.src !== c.fallbackUrl) {
                              img.src = c.fallbackUrl;
                            }
                          }}
                          className="relative z-10 w-full h-full object-contain"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Buttons to return to box or rip next */}
                <div className="mt-4 flex items-center gap-3 flex-wrap justify-center">
                  {unopenedCount > 0 ? (
                    <>
                      <button
                        onClick={handlePullNextPackInBox}
                        className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 px-6 py-3 font-black text-black shadow-xl hover:from-amber-300 hover:to-amber-400 transition cursor-pointer text-sm uppercase tracking-wider"
                      >
                        <Sparkles className="h-4 w-4" />
                        <span>RÚT GÓI TIẾP THEO TRONG HỘP ({unopenedCount} CÒN LẠI)</span>
                      </button>

                      <button
                        onClick={() => setStage('lid_open')}
                        className="flex items-center gap-2 rounded-2xl bg-black/80 hover:bg-black px-6 py-3 text-sm font-black text-amber-300 border-2 border-amber-400/70 shadow-xl transition cursor-pointer uppercase tracking-wider"
                      >
                        <Package className="h-4 w-4" />
                        <span>QUAY LẠI HỘP ĐỂ CHỌN GÓI</span>
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={triggerBoxSummary}
                      className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-400 to-emerald-600 px-8 py-3.5 font-black text-black text-sm uppercase tracking-wider shadow-xl cursor-pointer"
                    >
                      <Trophy className="h-5 w-5" />
                      <span>XEM TỔNG KẾT TOÀN BỘ HỘP 🏆</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/* STAGE 3: MASS RIPPING ANIMATION                             */}
        {/* ============================================================ */}
        {stage === 'ripping_mass' && (
          <div className="flex flex-col items-center text-center max-w-md">
            <div className="text-6xl mb-3 animate-bounce">⚡ 📦 🎴</div>
            <h3 className="text-2xl font-black text-amber-300">Đang Xé Toàn Bộ {totalPacksInBox} Gói Bài...</h3>
            <p className="text-xs text-zinc-400 mt-1 mb-4">
              Đang quét {totalPacksInBox * 10} thẻ bài và bóc tách những siêu phẩm Crown, Immersive & Full Art!
            </p>
            <div className="w-full bg-zinc-950 rounded-full h-4 overflow-hidden border border-amber-500/50">
              <div
                className="bg-gradient-to-r from-amber-500 via-yellow-300 to-amber-500 h-full transition-all duration-75"
                style={{ width: `${massRipProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* STAGE 4: BOX OPENING SUMMARY (Dynamic Cards Analyzed)        */}
        {/* ============================================================ */}
        {stage === 'summary' && boxData && (
          <div className="flex flex-col items-center w-full max-w-4xl text-center">
            {/* Header Trophy Banner */}
            <div className="flex items-center gap-2 text-xl font-black text-amber-300 mb-1">
              <Trophy className="h-6 w-6 text-yellow-400" />
              <span>TỔNG KẾT MỞ BOOSTER BOX: {boosterSet.name.toUpperCase()}</span>
            </div>

            {/* Box Event Banner */}
            {boxData.boxEventTitle && (
              <div className="w-full my-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500/25 via-rose-500/25 to-amber-500/25 border border-amber-400/50 flex items-center justify-center gap-2 shadow-xl flex-wrap">
                <Sparkles className="h-5 w-5 text-amber-300 animate-spin" />
                <span className="text-xs sm:text-sm font-black text-amber-200">
                  {boxData.boxEventTitle}
                </span>
                {boxData.hasMangaHit && (
                  <span className="px-3 py-0.5 rounded-full bg-gradient-to-r from-red-600 to-rose-500 text-white font-black text-[11px] animate-pulse shadow-md flex items-center gap-1">
                    <Flame className="h-3 w-3 fill-white" />
                    <span>MANGA RARE HIT</span>
                  </span>
                )}
              </div>
            )}

            {/* Profit / Value Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 w-full my-3">
              <div className="rounded-2xl bg-zinc-900/90 border border-zinc-800 p-2.5 text-left">
                <div className="text-[10px] text-zinc-400 font-bold uppercase">Tổng Thẻ Mở Được</div>
                <div className="text-lg font-black text-white">{boxData.totalCards} Thẻ Bài</div>
                <div className="text-[10px] text-zinc-400">
                  {boxData.packs.length} Gói {boosterSet.universe === 'onepiece' ? 'x 6 Thẻ' : 'x 10 Thẻ'}
                </div>
              </div>

              <div className="rounded-2xl bg-zinc-900/90 border border-zinc-800 p-2.5 text-left">
                <div className="text-[10px] text-zinc-400 font-bold uppercase">Giá Nhập Hộp (Cost)</div>
                <div className="text-lg font-black text-zinc-300">${boosterSet.boxWholesalePrice.toFixed(2)}</div>
                <div className="text-[10px] text-zinc-400">Giá bán lẻ: ${boosterSet.boxRetailPrice}</div>
              </div>

              <div className="rounded-2xl bg-emerald-950/40 border border-emerald-500/50 p-2.5 text-left">
                <div className="text-[10px] text-emerald-400 font-bold uppercase">Tổng Giá Trị Thẻ Rút</div>
                <div className="text-lg font-black text-emerald-300">${boxData.totalMarketValue.toFixed(2)}</div>
                <div className="text-[10px] text-emerald-400 font-bold">100% Giá thị trường TCG</div>
              </div>

              <div
                className={`rounded-2xl border p-2.5 text-left ${
                  isProfitable
                    ? 'bg-emerald-950/60 border-emerald-400 text-emerald-300'
                    : 'bg-rose-950/60 border-rose-400 text-rose-300'
                }`}
              >
                <div className="text-[10px] font-bold uppercase">Lợi Nhuận Khui Hộp</div>
                <div className="text-lg font-black">
                  {isProfitable ? '+' : ''}${profitLoss.toFixed(2)}
                </div>
                <div className="text-[10px]">
                  {isProfitable
                    ? `Lãi +${Math.round((profitLoss / boosterSet.boxWholesalePrice) * 100)}% ROI 🚀`
                    : 'Lỗ nhẹ'}
                </div>
              </div>
            </div>

            {/* Highlight Hits Section (With RGB Holographic Effect on cards >= $5) */}
            <div className="w-full text-left mb-2">
              <div className="flex items-center gap-1.5 text-xs font-black text-amber-300 mb-1.5">
                <Sparkles className="h-4 w-4" />
                <span>CÁC THẺ HIT ĐỈNH CHÓP RÚT ĐƯỢC TỪ HỘP ({boxData.hitCards.length} THẺ):</span>
              </div>

              {boxData.hitCards.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2 max-h-56 overflow-y-auto p-1">
                  {boxData.hitCards.map((c, i) => (
                    <div
                      key={c.id + i}
                      className={`rounded-2xl p-2 flex flex-col justify-between transition-transform hover:scale-105 ${
                        getCardHoloClass(c.marketPrice, c.hasRgbAura)
                      } ${c.marketPrice < 5 && !c.hasRgbAura ? 'border-2 border-zinc-700 bg-zinc-900' : ''}`}
                    >
                      <div className="relative h-20 w-full rounded-lg overflow-hidden bg-black/60 mb-1 flex items-center justify-center">
                        <img
                          src={c.imageUrl}
                          alt={c.name}
                          onError={(e) => {
                            const img = e.currentTarget as HTMLImageElement;
                            if (c.artUrl && img.src !== c.artUrl) {
                              img.src = c.artUrl;
                            } else if (c.fallbackUrl && img.src !== c.fallbackUrl) {
                              img.src = c.fallbackUrl;
                            }
                          }}
                          className="h-full object-contain"
                        />
                        <span className="absolute top-1 left-1 rounded bg-black/80 px-1 py-0.2 text-[8px] font-black text-amber-300">
                          {c.raritySymbol}
                        </span>
                      </div>
                      <div className="text-left">
                        <div className="text-[11px] font-bold text-white truncate">{c.name}</div>
                        <div className="text-[9px] text-amber-400 truncate">{c.rarityLabel}</div>
                        <div className="text-[11px] font-black text-emerald-400 mt-0.5">
                          ${c.marketPrice.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-zinc-400 p-4 bg-zinc-900 rounded-xl">
                  Hộp này chủ yếu chứa thẻ Common & Uncommon. Hãy thử vận may với hộp tiếp theo!
                </div>
              )}
            </div>

            {/* Batch Action Buttons */}
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-center mt-3">
              <button
                onClick={handleBatchKeepShowcase}
                className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-black text-black hover:bg-amber-400 transition cursor-pointer shadow-md"
              >
                <Store className="h-4 w-4" />
                <span>Trưng Bày Tất Cả Hit Lên Kệ Bán</span>
              </button>

              <button
                onClick={handleBatchAddToBinder}
                className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-black text-white hover:bg-blue-500 transition cursor-pointer shadow-md"
              >
                <BookOpen className="h-4 w-4" />
                <span>Cất Tất Cả Vào Sổ Thẻ</span>
              </button>

              <button
                onClick={handleBatchQuickSellAll}
                className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-black text-black hover:bg-emerald-500 transition cursor-pointer shadow-md"
              >
                <DollarSign className="h-4 w-4" />
                <span>Bán Nhanh Tất Cả (${Math.round(boxData.totalMarketValue * 0.9)})</span>
              </button>

              <button
                onClick={onClose}
                className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-xs font-bold text-zinc-300 hover:bg-zinc-800 hover:text-white cursor-pointer"
              >
                <span>Xong</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Action helper when pulling single pack */}
      {stage === 'pulling_pack' && singlePackStage === 'cards_slide_up' && (
        <div className="relative z-30 flex items-center justify-center pb-2 pointer-events-auto">
          <button
            onClick={completePulledCardSlideUp}
            className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 px-8 py-3 font-black text-black shadow-xl hover:from-amber-300 hover:to-amber-400 transition cursor-pointer text-sm uppercase tracking-wider"
          >
            <ArrowUp className="h-5 w-5" />
            <span>RÚT THẺ TIẾP THEO (HOẶC BẤM VÀO THẺ)</span>
          </button>
        </div>
      )}
    </div>
  );
};
