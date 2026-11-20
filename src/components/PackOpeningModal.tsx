import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  ArrowUp,
  FastForward,
  Play,
  Pause,
  Scissors,
  Check,
  Package,
  Sparkles,
  Flame,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  PokemonCard,
  ripBoosterPackWithMetadata,
  BOOSTER_SETS,
  ALL_UNIQUE_BOOSTER_SETS,
  ALL_ONEPIECE_BOOSTER_SETS,
  isOnePieceSetId,
  ONEPIECE_SET_EVENTS,
  getBoosterSet,
  BoosterSetInfo,
  getCardHoloClass,
  InventoryItem,
} from '../game/pokemonShopLogic';
import { soundManager } from '../game/audio';

interface PackOpeningModalProps {
  setId: string;
  onCardKeptInShowcase: (card: PokemonCard, price: number) => void;
  onCardAddedToBinder: (card: PokemonCard) => void;
  onCardQuickSold: (card: PokemonCard, cashReceived: number) => void;
  onPackConsumed: (setId: string, pulledCards?: PokemonCard[]) => void;
  availablePacksCount: number;
  inventory?: InventoryItem[];
  onOpenTablet?: () => void;
  onClose: () => void;
}

export const PackOpeningModal: React.FC<PackOpeningModalProps> = ({
  setId: initialSetId,
  onCardKeptInShowcase,
  onCardAddedToBinder,
  onCardQuickSold,
  onPackConsumed,
  availablePacksCount,
  inventory,
  onOpenTablet,
  onClose,
}) => {
  const [selectedSetId, setSelectedSetId] = useState<string>(initialSetId || 'paldeanFates');
  const [universeTab, setUniverseTab] = useState<'pokemon' | 'onepiece'>(() =>
    isOnePieceSetId(initialSetId) ? 'onepiece' : 'pokemon'
  );
  const boosterSet: BoosterSetInfo = getBoosterSet(selectedSetId);

  // Exact stock count for currently selected pack set
  const currentPackStock = inventory
    ? inventory.find(
        (i) =>
          i.productId === `${selectedSetId}_pack` ||
          i.productId === selectedSetId ||
          i.productId === `gacha_${selectedSetId}`
      )?.quantity || 0
    : availablePacksCount;

  // Stages: 'ready_to_rip' | 'ripping' | 'cards_slide_up' | 'summary'
  const [stage, setStage] = useState<'ready_to_rip' | 'ripping' | 'cards_slide_up' | 'summary'>('ready_to_rip');
  const [cards, setCards] = useState<PokemonCard[]>([]);
  const [isGodPack, setIsGodPack] = useState(false);
  const [hasMangaRare, setHasMangaRare] = useState(false);
  const [specialEventTitle, setSpecialEventTitle] = useState<string | undefined>(undefined);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [revealedCards, setRevealedCards] = useState<boolean[]>([]);

  // Tear progress for Stage 1 (0 to 100%)
  const [tearProgress, setTearProgress] = useState(0);
  const [isTearing, setIsTearing] = useState(false);
  const tearStartXRef = useRef(0);

  // Swipe-Up gesture states (Vuốt thẻ lên ra khỏi gói - Image 1)
  const [dragOffsetY, setDragOffsetY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartYRef = useRef(0);
  const currentDragOffsetRef = useRef(0);
  const [totalPulledValue, setTotalPulledValue] = useState(0);

  // Auto-Open State
  const [isAutoOpening, setIsAutoOpening] = useState(false);

  // 3D tilt
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  // Start ripping the pack immediately
  const triggerPackTear = useCallback(() => {
    soundManager.playFoilCrinkle();
    setStage('ripping');

    const result = ripBoosterPackWithMetadata(selectedSetId);
    setCards(result.cards);
    setIsGodPack(result.isGodPack);
    setHasMangaRare(!!result.hasMangaRare);
    setSpecialEventTitle(result.specialEventTitle);
    setRevealedCards(new Array(result.cards.length).fill(false));
    setCurrentCardIndex(0);
    setDragOffsetY(0);
    setTotalPulledValue(0);
    onPackConsumed(selectedSetId, result.cards);

    // Fast tear transition straight into cards (under 120ms)
    setTimeout(() => {
      setStage('cards_slide_up');
      soundManager.playCardSlide();

      if (result.isGodPack) {
        soundManager.playRarePullFanfare();
        confetti({
          particleCount: 220,
          spread: 120,
          origin: { y: 0.5 },
          colors: ['#facc15', '#eab308', '#ffffff', '#ec4899'],
        });
      } else if (result.hasMangaRare) {
        soundManager.playRarePullFanfare();
        confetti({
          particleCount: 180,
          spread: 110,
          origin: { y: 0.4 },
          colors: ['#facc15', '#ef4444', '#ffffff', '#3b82f6'],
        });
      }
    }, 120);
  }, [selectedSetId, onPackConsumed]);

  // Auto-rip pack on mount if player has pack in stock (skips redundant "Xé gói này ngay" screen)
  useEffect(() => {
    if (stage === 'ready_to_rip' && currentPackStock > 0) {
      triggerPackTear();
    }
  }, [stage, currentPackStock, triggerPackTear]);

  const currentCard = cards[currentCardIndex];

  // Complete card draw & slide up
  const completeCardSlideUp = useCallback(() => {
    if (!currentCard) return;

    soundManager.playCardFlip();
    const updated = [...revealedCards];
    updated[currentCardIndex] = true;
    setRevealedCards(updated);
    setTotalPulledValue((prev) => +(prev + currentCard.marketPrice).toFixed(2));

    // High rarity & Manga celebrations
    if (
      currentCard.isManga ||
      currentCard.pocketRarity === 'Crown' ||
      currentCard.pocketRarity === 'Star3' ||
      currentCard.pocketRarity === 'Star2' ||
      currentCard.hasRgbAura
    ) {
      soundManager.playRarePullFanfare();
      confetti({
        particleCount: currentCard.isManga ? 200 : 140,
        spread: currentCard.isManga ? 120 : 100,
        origin: { y: 0.5 },
        colors: currentCard.isManga
          ? ['#facc15', '#ef4444', '#000000', '#ffffff', '#a855f7']
          : ['#f59e0b', '#ec4899', '#3b82f6', '#10b981', '#facc15'],
      });
    } else if (
      currentCard.pocketRarity === 'Star1' ||
      currentCard.pocketRarity === 'Diamond4'
    ) {
      soundManager.playHoloShimmer();
    }

    // Auto save card to binder
    onCardAddedToBinder(currentCard);

    // If more cards remain in pack
    if (currentCardIndex < cards.length - 1) {
      setDragOffsetY(0);
      currentDragOffsetRef.current = 0;
      setCurrentCardIndex((prev) => prev + 1);
    } else {
      // Completed all 10 cards -> Transition to Final Cascade (Image 2)
      setTimeout(() => {
        setStage('summary');
        soundManager.playWinChime();
        confetti({
          particleCount: 160,
          spread: 90,
          origin: { y: 0.6 },
          colors: ['#fbbf24', '#f59e0b', '#10b981', '#ffffff'],
        });
      }, 350);
    }
  }, [currentCard, currentCardIndex, cards.length, revealedCards, onCardAddedToBinder]);

  // Pointer drag events for swipe-up card pull
  const handlePointerDown = (e: React.PointerEvent) => {
    if (stage !== 'cards_slide_up') return;
    setIsDragging(true);
    dragStartYRef.current = e.clientY;
    currentDragOffsetRef.current = dragOffsetY;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || stage !== 'cards_slide_up') return;
    const deltaY = e.clientY - dragStartYRef.current;
    if (deltaY < 0) {
      // Dragging UP
      const newOffset = Math.max(-260, deltaY);
      setDragOffsetY(newOffset);
      currentDragOffsetRef.current = newOffset;

      // 3D tilt
      setTilt({
        x: Math.max(-15, newOffset * 0.08),
        y: Math.sin(newOffset * 0.05) * 5,
      });

      // Threshold reached -> trigger pull completion
      if (newOffset <= -120) {
        setIsDragging(false);
        completeCardSlideUp();
      }
    }
  };

  const handlePointerUp = () => {
    if (!isDragging) return;
    setIsDragging(false);
    if (currentDragOffsetRef.current <= -100) {
      completeCardSlideUp();
    } else {
      // Snap back into sleeve
      setDragOffsetY(0);
      currentDragOffsetRef.current = 0;
      setTilt({ x: 0, y: 0 });
    }
  };

  // Auto Opening Loop
  useEffect(() => {
    if (!isAutoOpening || stage !== 'cards_slide_up') return;
    const timer = setTimeout(() => {
      completeCardSlideUp();
    }, 1100);
    return () => clearTimeout(timer);
  }, [isAutoOpening, stage, currentCardIndex, completeCardSlideUp]);

  // Instant Reveal All
  const handleRevealAll = () => {
    soundManager.playCardFlip();
    const updated = new Array(cards.length).fill(true);
    setRevealedCards(updated);
    cards.forEach((c) => onCardAddedToBinder(c));
    setStage('summary');
  };

  // Horizontal Tear gesture on pack top (Stage 1)
  const handleTearPointerDown = (e: React.PointerEvent) => {
    setIsTearing(true);
    tearStartXRef.current = e.clientX;
  };

  const handleTearPointerMove = (e: React.PointerEvent) => {
    if (!isTearing) return;
    const dist = e.clientX - tearStartXRef.current;
    if (dist > 30) {
      setIsTearing(false);
      triggerPackTear();
    }
  };

  const handleTearPointerUp = () => {
    if (isTearing) {
      setIsTearing(false);
      // Even simple click on tear strip rips the pack
      triggerPackTear();
    }
  };

  const totalCalculatedValue = cards.reduce((sum, c) => sum + c.marketPrice, 0);

  return (
    <div
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      className="fixed inset-0 z-50 pointer-events-auto select-none flex flex-col justify-between p-3 sm:p-5 bg-black/45 animate-in fade-in duration-150 overflow-hidden"
    >
      {/* TOP HEADER: Clean floating controls (no dark container) */}
      <div className="flex items-center justify-between w-full z-30 px-2 pt-1 pointer-events-auto">
        {/* Left: Pack set badge (only when picking a set or discreet status) */}
        {stage === 'ready_to_rip' ? (
          <div className="flex items-center gap-2 flex-wrap">
            {/* Universe Selector Tabs */}
            <div className="flex items-center gap-1 bg-black/80 p-1 rounded-full border border-white/20 shadow-md">
              <button
                onClick={() => {
                  soundManager.playSelectSound();
                  setUniverseTab('pokemon');
                  if (isOnePieceSetId(selectedSetId)) {
                    setSelectedSetId('paldeanFates');
                  }
                }}
                className={`px-3 py-1 rounded-full text-xs font-black transition cursor-pointer flex items-center gap-1 ${
                  universeTab === 'pokemon'
                    ? 'bg-amber-400 text-black shadow-[0_0_12px_rgba(251,191,36,0.5)]'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <span>⚡ Pokémon TCG</span>
              </button>
              <button
                onClick={() => {
                  soundManager.playSelectSound();
                  setUniverseTab('onepiece');
                  if (!isOnePieceSetId(selectedSetId)) {
                    setSelectedSetId('op10RoyalBlood');
                  }
                }}
                className={`px-3 py-1 rounded-full text-xs font-black transition cursor-pointer flex items-center gap-1 ${
                  universeTab === 'onepiece'
                    ? 'bg-gradient-to-r from-red-600 to-rose-500 text-white shadow-[0_0_12px_rgba(244,63,94,0.5)]'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <span>🏴‍☠️ One Piece TCG</span>
              </button>
            </div>

            {/* Set Selection Buttons */}
            <div className="flex items-center gap-1.5 flex-wrap max-w-2xl">
              {(universeTab === 'pokemon' ? ALL_UNIQUE_BOOSTER_SETS : ALL_ONEPIECE_BOOSTER_SETS).map((s) => {
                const stock = inventory
                  ? inventory.find(
                      (i) =>
                        i.productId === `${s.id}_pack` ||
                        i.productId === s.id ||
                        i.productId === `gacha_${s.id}`
                    )?.quantity || 0
                  : 0;
                return (
                  <button
                    key={s.id}
                    onClick={() => {
                      soundManager.playSelectSound();
                      setSelectedSetId(s.id);
                    }}
                    className={`px-3 py-1.5 rounded-full text-xs font-black transition cursor-pointer border drop-shadow-md flex items-center gap-1.5 ${
                      selectedSetId === s.id
                        ? universeTab === 'onepiece'
                          ? 'bg-rose-500 text-white border-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.6)]'
                          : 'bg-amber-400 text-black border-amber-300 shadow-[0_0_15px_rgba(251,191,36,0.5)]'
                        : stock > 0
                        ? 'bg-black/70 text-zinc-200 border-white/20 hover:border-amber-400'
                        : 'bg-black/50 text-zinc-500 border-zinc-800'
                    }`}
                  >
                    <span>{s.name.split(':')[0]}</span>
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
          <div className="text-sm font-black text-amber-300/80 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
            {boosterSet.name}
          </div>
        )}

        {/* Right: Discreet Skip & Close buttons */}
        <div className="flex items-center gap-2">
          {stage === 'cards_slide_up' && (
            <>
              <button
                onClick={() => setIsAutoOpening(!isAutoOpening)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-black transition cursor-pointer border drop-shadow ${
                  isAutoOpening
                    ? 'bg-amber-400 text-black border-amber-300 animate-pulse'
                    : 'bg-black/70 text-zinc-200 border-white/20 hover:border-amber-400'
                }`}
              >
                {isAutoOpening ? <Pause className="h-3 w-3 fill-current" /> : <Play className="h-3 w-3 fill-current" />}
                <span>{isAutoOpening ? 'Dừng' : 'Tự Động'}</span>
              </button>

              <button
                onClick={handleRevealAll}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-black bg-black/70 text-amber-300 border border-amber-400/40 hover:bg-amber-500 hover:text-black transition cursor-pointer drop-shadow"
              >
                <FastForward className="h-3 w-3" />
                <span>Rút Hết</span>
              </button>
            </>
          )}

          <button
            onClick={onClose}
            aria-label="Đóng bàn bóc thẻ"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-black/70 text-zinc-300 border border-white/20 hover:border-amber-400 hover:text-white transition cursor-pointer drop-shadow"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* ============================================================ */}
      {/* MAIN CENTER ARENA: Ripping, Sliding Up, or Cascade Summary */}
      {/* ============================================================ */}
      <div className="flex-1 flex items-center justify-center relative w-full h-full overflow-visible">
        {/* ------------------------------------------------------------ */}
        {/* STAGE 1 & TEARING: FAST FOIL TEAR TRANSITION (KHÔNG HIỆN NÚT THỪA) */}
        {/* ------------------------------------------------------------ */}
        {(stage === 'ready_to_rip' || stage === 'ripping') && (
          <div className="relative flex flex-col items-center justify-center">
            {/* The Authentic Booster Pack Foil Image */}
            <div className="relative flex flex-col items-center select-none scale-105 animate-pulse">
              <img
                src={boosterSet.packImageUrl}
                alt={boosterSet.name}
                className="h-[440px] sm:h-[500px] w-auto max-w-[340px] sm:max-w-[400px] object-contain drop-shadow-[0_25px_60px_rgba(0,0,0,0.95)]"
              />

              {stage === 'ripping' && (
                <div className="absolute top-12 left-4 right-4 h-2 bg-gradient-to-r from-yellow-300 via-white to-amber-400 shadow-[0_0_20px_white] rounded-full animate-ping" />
              )}
            </div>

            {/* Stock Notice & Tablet Action ONLY if empty */}
            {currentPackStock <= 0 && (
              <div className="mt-4 flex flex-col items-center gap-2 rounded-2xl bg-rose-950/70 border border-rose-500/50 p-3 text-rose-200 text-xs">
                <span>⚠️ Bạn chưa có gói bài này trong kho hoặc trên kệ!</span>
                {onOpenTablet && (
                  <button
                    onClick={() => {
                      onClose();
                      onOpenTablet();
                    }}
                    className="flex items-center gap-1.5 rounded-xl bg-amber-400 px-4 py-2 font-black text-black hover:bg-amber-300 transition cursor-pointer shadow-lg"
                  >
                    <span>📱 Mở Tablet Đặt Gói Này Về Shop</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* ------------------------------------------------------------ */}
        {/* STAGE 2: PULLING CARDS UP DIRECTLY (KHUNG VÀNG PHÍA SAU ĐÃ XÓA)*/}
        {/* ------------------------------------------------------------ */}
        {stage === 'cards_slide_up' && currentCard && (
          <div className="relative w-full h-full flex items-center justify-center">
            {/* LEFT SIDE MANGA ONOMATOPOEIA & HIT EVENT OVERLAY */}
            {(currentCard.isManga ||
              (currentCard.universe === 'onepiece' &&
                (currentCard.pocketRarity === 'Crown' || currentCard.pocketRarity === 'Star3'))) && (
              <div className="absolute left-4 sm:left-12 md:left-20 top-1/2 -translate-y-1/2 flex flex-col items-center z-30 pointer-events-none select-none animate-in zoom-in-90 duration-300">
                <div className="relative flex flex-col items-center">
                  {/* Huge Japanese Manga Action Sound Kanji */}
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
                  {/* Quote / Special Event */}
                  <div className="mt-2.5 max-w-[240px] text-center text-xs font-bold text-amber-200 bg-black/85 px-3.5 py-2 rounded-xl border border-amber-400/50 shadow-lg">
                    "{ONEPIECE_SET_EVENTS[selectedSetId]?.mangaQuote || currentCard.flavorText || 'Divine Departure!'}"
                  </div>
                  <div className="mt-1.5 text-[11px] font-mono text-zinc-300 bg-black/60 px-2 py-0.5 rounded border border-white/10">
                    PWR {(currentCard.hp || currentCard.power || 5000).toLocaleString()} · {currentCard.setNumber || currentCard.cardNumber || currentCard.id}
                  </div>
                </div>
              </div>
            )}

            {/* RIGHT SIDE FLOATING ARCADE VALUE (Card Value $11.91) */}
            <div className="absolute right-4 sm:right-16 md:right-24 lg:right-32 top-1/2 -translate-y-1/2 flex flex-col items-start z-30 pointer-events-none select-none">
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
                ${currentCard.marketPrice.toFixed(2)}
              </span>
            </div>

            {/* CARD STACK CONTAINER (No artificial yellow frame behind card) */}
            <div className="relative w-[280px] sm:w-[320px] h-[400px] sm:h-[440px] flex items-center justify-center overflow-visible">
              {/* Next card peek underneath in the stack */}
              {currentCardIndex < cards.length - 1 && (
                <div className="absolute w-[260px] sm:w-[290px] h-[370px] sm:h-[405px] rounded-2xl bg-zinc-900 border-2 border-zinc-700 opacity-60 scale-95 pointer-events-none shadow-lg overflow-hidden">
                  <img
                    src={cards[currentCardIndex + 1].imageUrl}
                    alt="Next Card"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {/* ACTIVE SLIDING CARD (Draggable & Swipeable UP) */}
              <div
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onClick={() => {
                  if (!isDragging && dragOffsetY === 0) {
                    completeCardSlideUp();
                  }
                }}
                style={{
                  transform: `translateY(${dragOffsetY}px) rotateX(${tilt.x}deg) rotateZ(${tilt.y}deg)`,
                  transition: isDragging ? 'none' : 'transform 0.22s cubic-bezier(0.2, 0.8, 0.2, 1)',
                }}
                className={`relative w-[260px] sm:w-[290px] h-[370px] sm:h-[405px] rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.95)] cursor-grab active:cursor-grabbing select-none z-20 overflow-visible ${
                  getCardHoloClass(currentCard.marketPrice, currentCard.hasRgbAura)
                } ${currentCard.marketPrice < 5 && !currentCard.hasRgbAura ? 'border-2 border-white/60' : ''}`}
              >
                {/* Card Scan Image */}
                <div
                  className="relative w-full h-full rounded-2xl overflow-hidden flex items-center justify-center"
                  style={{
                    background: `linear-gradient(135deg, ${currentCard.cardColor || '#1e293b'} 0%, #090d16 100%)`,
                  }}
                >
                  {/* Card skeleton behind image */}
                  <div className="absolute inset-0 p-3 flex flex-col justify-between select-none pointer-events-none opacity-85">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black tracking-wider text-white/90 truncate max-w-[180px] uppercase">
                        {currentCard.name}
                      </span>
                      <span className="text-xs font-black text-amber-300">
                        {currentCard.icon || '⚔️'} {currentCard.hp ? `${currentCard.hp} HP` : ''}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-zinc-400 font-mono">
                      <span>{currentCard.setNumber}</span>
                      <span className="font-bold text-amber-400">{currentCard.raritySymbol || '♢'}</span>
                    </div>
                  </div>

                  <img
                    src={currentCard.imageUrl}
                    alt={currentCard.name}
                    onError={(e) => {
                      const img = e.currentTarget as HTMLImageElement;
                      if (img.src.includes('_p1.jpg') || img.src.includes('_p2.jpg')) {
                        img.src = img.src.replace(/_p\d+\.jpg/, '.jpg');
                      } else if (img.src.includes('_p1.png') || img.src.includes('_p2.png')) {
                        img.src = img.src.replace(/_p\d+\.png/, '.png');
                      } else if (currentCard.artUrl && img.src !== currentCard.artUrl) {
                        img.src = currentCard.artUrl;
                      } else if (currentCard.fallbackUrl && img.src !== currentCard.fallbackUrl) {
                        img.src = currentCard.fallbackUrl;
                      }
                    }}
                    className="relative z-10 w-full h-full object-contain rounded-2xl"
                  />
                </div>

                {/* Holographic Shimmer Overlay */}
                <div className="absolute inset-0 rounded-2xl pointer-events-none mix-blend-color-dodge opacity-50 bg-gradient-to-tr from-transparent via-white/30 to-transparent" />
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------ */}
        {/* STAGE 3: ALL CARDS FANNED OUT HORIZONTALLY (EXACT ẢNH 2 REPLICA) */}
        {/* ------------------------------------------------------------ */}
        {stage === 'summary' && (
          <div className="relative w-full flex flex-col items-center justify-center select-none py-2">
            {/* The Metallic Foil Wrapper sitting behind the cards (Exact Ảnh 2) */}
            <div
              className="absolute w-[480px] sm:w-[580px] h-[340px] rounded-2xl opacity-40 blur-[1px] pointer-events-none"
              style={{
                background: `linear-gradient(180deg, #e2e8f0 0%, #cbd5e1 30%, #94a3b8 70%, #64748b 100%)`,
                boxShadow: '0 20px 40px rgba(0,0,0,0.8)',
              }}
            />

            {/* HORIZONTAL FANNED CARDS ROW (Zero clipping on top/bottom/sides) */}
            <div className="relative z-20 grid grid-cols-5 gap-2 sm:flex sm:items-center sm:justify-center sm:gap-0 sm:-space-x-9 md:-space-x-11 lg:-space-x-13 w-full max-w-6xl py-6 sm:py-10 px-2 sm:px-6 overflow-visible">
              {cards.map((c, i) => (
                <div
                  key={c.id + i}
                  style={{
                    transform: `rotate(${(i - 4.5) * 1.6}deg) translateY(${Math.abs(i - 4.5) * 2.5}px)`,
                    zIndex: i + 1,
                  }}
                  className={`group relative w-full sm:w-28 md:w-32 lg:w-36 aspect-[63/88] h-auto rounded-xl shadow-[0_15px_35px_rgba(0,0,0,0.9)] bg-zinc-950 transition-all duration-300 hover:scale-110 hover:-translate-y-6 hover:z-50 cursor-pointer overflow-visible flex-shrink-0 ${
                    getCardHoloClass(c.marketPrice, c.hasRgbAura)
                  } ${c.marketPrice < 5 && !c.hasRgbAura ? 'border-2 border-white/40' : ''}`}
                >
                  {/* RED 3D CARTOON STAR BADGE WITH "NEW" (EXACT ẢNH 2 REPLICA) */}
                  <div className="absolute -top-4 -left-4 z-40 pointer-events-none select-none">
                    <svg
                      viewBox="0 0 100 100"
                      className="w-14 h-14 sm:w-16 sm:h-16 drop-shadow-[0_6px_12px_rgba(0,0,0,0.9)] filter"
                      style={{ transform: 'rotate(-8deg)' }}
                    >
                      <defs>
                        <linearGradient id="starRedGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#ff5252" />
                          <stop offset="50%" stopColor="#e50914" />
                          <stop offset="100%" stopColor="#8b0000" />
                        </linearGradient>
                      </defs>
                      {/* Red star with thick black outline */}
                      <path
                        d="M50 4 L64 33 L96 37 L72 60 L79 92 L50 75 L21 92 L28 60 L4 37 L36 33 Z"
                        fill="url(#starRedGradient)"
                        stroke="#000000"
                        strokeWidth="8"
                        strokeLinejoin="round"
                        strokeLinecap="round"
                      />
                      {/* Gold inner border line */}
                      <path
                        d="M50 12 L61 34 L87 38 L67 57 L73 84 L50 70 L27 84 L33 57 L13 38 L39 34 Z"
                        fill="none"
                        stroke="#ffd700"
                        strokeWidth="3.5"
                        strokeLinejoin="round"
                      />
                      {/* "NEW" arcade text */}
                      <text
                        x="50"
                        y="62"
                        textAnchor="middle"
                        fontFamily="'Fredoka', 'Nunito', 'Arial Black', sans-serif"
                        fontWeight="900"
                        fontSize="23"
                        fill="#ffeb3b"
                        stroke="#000000"
                        strokeWidth="2"
                        letterSpacing="-0.5"
                      >
                        NEW
                      </text>
                    </svg>
                  </div>

                  {/* Card Scan Image */}
                  <div
                    className="relative w-full h-full rounded-lg overflow-hidden flex items-center justify-center"
                    style={{
                      background: `linear-gradient(135deg, ${c.cardColor || '#1e293b'} 0%, #090d16 100%)`,
                    }}
                  >
                    {/* Fallback layout underneath image */}
                    <div className="absolute inset-0 p-1.5 flex flex-col justify-between select-none pointer-events-none opacity-85">
                      <div className="text-[9px] font-black text-white/90 truncate leading-tight">
                        {c.name}
                      </div>
                      <div className="flex items-center justify-between text-[8px] text-zinc-400 font-mono">
                        <span>{c.setNumber}</span>
                        <span className="text-amber-300 font-bold">{c.icon || '⚔️'}</span>
                      </div>
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

                  {/* Price Tag Chip on Hover */}
                  <div className="absolute bottom-1 right-1 bg-black/90 px-1.5 py-0.5 rounded text-[10px] font-black text-yellow-300 border border-yellow-400/50 opacity-90">
                    ${c.marketPrice.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>

            {/* ARCADE DISPLAY: "Total Value $9.82" (EXACT ẢNH 2 REPLICA) */}
            <div className="relative z-30 mt-3 flex flex-col items-center text-center select-none pointer-events-none">
              <span
                className="text-2xl sm:text-3xl font-extrabold text-white tracking-wide drop-shadow-[0_2px_5px_rgba(0,0,0,0.95)]"
                style={{
                  fontFamily: "'Fredoka', 'Nunito', 'Arial Black', sans-serif",
                  textShadow: '2px 2px 0px #000, -2px -2px 0px #000, 2px -2px 0px #000, -2px 2px 0px #000, 0px 4px 8px rgba(0,0,0,0.8)',
                }}
              >
                Total Value
              </span>
              <span
                className="text-5xl sm:text-7xl font-black text-[#ffe600] tracking-tight tabular-nums mt-0.5"
                style={{
                  fontFamily: "'Fredoka', 'Nunito', 'Arial Black', sans-serif",
                  textShadow: '3px 3px 0px #000, -3px -3px 0px #000, 3px -3px 0px #000, -3px 3px 0px #000, 0px 6px 14px rgba(0,0,0,0.95)',
                }}
              >
                ${totalCalculatedValue.toFixed(2)}
              </span>
            </div>

            {/* Bottom Action Buttons */}
            <div className="relative z-30 mt-6 flex items-center gap-3 flex-wrap justify-center">
              {availablePacksCount > 0 && (
                <button
                  onClick={() => {
                    setStage('ready_to_rip');
                    setCards([]);
                    setRevealedCards([]);
                  }}
                  className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 px-6 py-3 font-black text-black shadow-xl hover:from-amber-300 hover:to-amber-400 transition cursor-pointer text-sm uppercase tracking-wider"
                >
                  <Package className="h-4 w-4" />
                  <span>XÉ THÊM 1 GÓI NỮA (Còn {availablePacksCount})</span>
                </button>
              )}

              <button
                onClick={onClose}
                className="flex items-center gap-2 rounded-2xl bg-black/80 hover:bg-black px-8 py-3 text-sm font-black text-white border-2 border-amber-400/70 shadow-xl transition cursor-pointer uppercase tracking-wider"
              >
                <Check className="h-4 w-4 text-emerald-400" />
                <span>THU THẬP VÀO SỔ & TRỞ LẠI TIỆM</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* BOTTOM ACTION BAR FOR STAGE 2 */}
      {stage === 'cards_slide_up' && (
        <div className="relative z-30 flex items-center justify-center pb-2 pointer-events-auto">
          <button
            onClick={completeCardSlideUp}
            className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 px-8 py-3 font-black text-black shadow-[0_10px_25px_rgba(245,158,11,0.5)] hover:from-amber-300 hover:to-amber-400 transition cursor-pointer text-sm sm:text-base uppercase tracking-wider"
          >
            <ArrowUp className="h-5 w-5" />
            <span>RÚT THẺ TIẾP THEO (HOẶC BẤM VÀO THẺ / VUỐT LÊN)</span>
          </button>
        </div>
      )}
    </div>
  );
};
