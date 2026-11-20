import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  DollarSign,
  Plus,
  Tag,
  Trophy,
  Check,
  Search,
  Filter,
  Layers,
  Flame,
  Zap,
  Lock,
} from 'lucide-react';
import { PokemonCard, POKEMON_CARDS_DB, getCardHoloClass, SHELF_UNLOCKS, isShelfUnlocked } from '../game/pokemonShopLogic';
import { soundManager } from '../game/audio';

export type CardDisplayTab = 'shelf_1' | 'shelf_2' | 'shelf_3' | 'showcase';

interface ShowcaseModalProps {
  showcaseCards: Array<{ card: PokemonCard; retailPrice: number; isSold?: boolean; isReserved?: boolean; isSlab?: boolean; slab?: any }>;
  shelfCards?: Array<{ card: PokemonCard; retailPrice: number; isSold?: boolean; isReserved?: boolean; isSlab?: boolean; slab?: any }>;
  unlockedShelves?: string[];
  initialTab?: CardDisplayTab;
  onUpdateShowcase: (updated: Array<{ card: PokemonCard; retailPrice: number; isSold?: boolean; isReserved?: boolean; isSlab?: boolean; slab?: any }>) => void;
  onUpdateShelfCards?: (updated: Array<{ card: PokemonCard; retailPrice: number; isSold?: boolean; isReserved?: boolean; isSlab?: boolean; slab?: any }>) => void;
  onOpenShelfUnlocks?: () => void;
  onClose: () => void;
}

export const ShowcaseModal: React.FC<ShowcaseModalProps> = ({
  showcaseCards,
  shelfCards = [],
  unlockedShelves,
  initialTab = 'shelf_1',
  onUpdateShowcase,
  onUpdateShelfCards,
  onOpenShelfUnlocks,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<CardDisplayTab>(initialTab);

  // 10 showcase slots
  const [showcaseSlots, setShowcaseSlots] = useState<Array<{ card: PokemonCard; retailPrice: number; isSold?: boolean; isReserved?: boolean; isSlab?: boolean; slab?: any } | null>>(() => {
    const arr = new Array(10).fill(null);
    showcaseCards.slice(0, 10).forEach((item, idx) => {
      arr[idx] = item;
    });
    return arr;
  });

  // 18 shelf slots (6 per shelf)
  const [shelfSlots, setShelfSlots] = useState<Array<{ card: PokemonCard; retailPrice: number; isSold?: boolean; isReserved?: boolean; isSlab?: boolean; slab?: any } | null>>(() => {
    const arr = new Array(18).fill(null);
    shelfCards.slice(0, 18).forEach((item, idx) => {
      arr[idx] = item;
    });
    return arr;
  });

  useEffect(() => {
    const arr = new Array(10).fill(null);
    showcaseCards.slice(0, 10).forEach((item, idx) => {
      arr[idx] = item;
    });
    setShowcaseSlots(arr);
  }, [showcaseCards]);

  useEffect(() => {
    const arr = new Array(18).fill(null);
    shelfCards.slice(0, 18).forEach((item, idx) => {
      arr[idx] = item;
    });
    setShelfSlots(arr);
  }, [shelfCards]);

  const [activeSlotIndex, setActiveSlotIndex] = useState<number | null>(null);
  const [showCardPicker, setShowCardPicker] = useState<boolean>(false);
  const [editingPriceIndex, setEditingPriceIndex] = useState<number | null>(null);
  const [tempPriceInput, setTempPriceInput] = useState<string>('');
  const [pickerSearch, setPickerSearch] = useState<string>('');

  // ESC to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Current active slots based on tab
  const isShowcase = activeTab === 'showcase';
  const currentShelfId =
    activeTab === 'shelf_1'
      ? 'shelf_card_1'
      : activeTab === 'shelf_2'
      ? 'shelf_card_2'
      : activeTab === 'shelf_3'
      ? 'shelf_card_3'
      : null;
  const shelf2Locked = !isShelfUnlocked(unlockedShelves, 'shelf_card_2');
  const shelf3Locked = !isShelfUnlocked(unlockedShelves, 'shelf_card_3');
  const isCurrentShelfLocked = Boolean(currentShelfId && !isShelfUnlocked(unlockedShelves, currentShelfId));
  const lockedShelfDef = currentShelfId ? SHELF_UNLOCKS.find((s) => s.id === currentShelfId) : undefined;
  const shelfOffset = activeTab === 'shelf_1' ? 0 : activeTab === 'shelf_2' ? 6 : activeTab === 'shelf_3' ? 12 : 0;
  const currentSlots = isShowcase ? showcaseSlots : shelfSlots.slice(shelfOffset, shelfOffset + 6);

  // Sync helpers (preserve slot indices cleanly using isSold placeholder so other stands never shift)
  const toStableArray = (slots: typeof currentSlots) =>
    slots.map((s) =>
      s && s.card
        ? s
        : {
            card: POKEMON_CARDS_DB[0],
            retailPrice: 0,
            isSold: true,
          }
    );

  const handleUpdateCurrentSlots = (newSubset: typeof currentSlots) => {
    if (isShowcase) {
      setShowcaseSlots(newSubset);
      onUpdateShowcase(toStableArray(newSubset));
    } else {
      const full = [...shelfSlots];
      for (let i = 0; i < 6; i++) {
        full[shelfOffset + i] = newSubset[i] || null;
      }
      setShelfSlots(full);
      onUpdateShelfCards?.(toStableArray(full));
    }
  };

  // Place card into slot
  const handlePlaceCardIntoSlot = (slotIdx: number, card: PokemonCard) => {
    if (isCurrentShelfLocked) return;
    soundManager.playChipSound();
    const newSubset = [...currentSlots];
    const cardSlab = (card as any).slab;
    newSubset[slotIdx] = {
      card,
      retailPrice: Math.round(card.marketPrice * 1.15),
      isSold: false,
      isSlab: Boolean(cardSlab || (card as any).isSlab),
      slab: cardSlab,
    };
    handleUpdateCurrentSlots(newSubset);
    setShowCardPicker(false);
  };

  // Remove card from slot
  const handleRemoveCardFromSlot = (slotIdx: number) => {
    soundManager.playSelectSound();
    const newSubset = [...currentSlots];
    const existing = newSubset[slotIdx];
    newSubset[slotIdx] = existing && existing.card ? { ...existing, isSold: true } : null;
    handleUpdateCurrentSlots(newSubset);
  };

  // Change retail price for slot
  const handleSavePrice = (slotIdx: number) => {
    const val = parseFloat(tempPriceInput);
    if (!isNaN(val) && val >= 0) {
      soundManager.playSelectSound();
      const newSubset = [...currentSlots];
      if (newSubset[slotIdx]) {
        newSubset[slotIdx]!.retailPrice = val;
        handleUpdateCurrentSlots(newSubset);
      }
    }
    setEditingPriceIndex(null);
  };

  // Auto-fill active view
  const handleFillAllSlots = () => {
    if (isCurrentShelfLocked) return;
    soundManager.playSelectSound();
    const count = isShowcase ? 10 : 6;
    const startIdx = isShowcase ? 0 : shelfOffset;
    const newSubset = [...currentSlots];
    for (let i = 0; i < count; i++) {
      if (!newSubset[i] || newSubset[i]?.isSold) {
        const card = POKEMON_CARDS_DB[(startIdx + i) % POKEMON_CARDS_DB.length];
        newSubset[i] = {
          card,
          retailPrice: Math.round(card.marketPrice * 1.15),
          isSold: false,
          isSlab: false,
        };
      }
    }
    handleUpdateCurrentSlots(newSubset);
  };

  // Clear active view (preserve cards currently held in a customer's basket)
  const handleClearAllSlots = () => {
    if (isCurrentShelfLocked) return;
    soundManager.playSelectSound();
    const newSubset = currentSlots.map((s) =>
      s && s.card ? (s.isReserved && !s.isSold ? s : { ...s, isSold: true }) : null
    );
    handleUpdateCurrentSlots(newSubset);
  };

  const activeSlotsOnly = currentSlots.filter((s) => Boolean(s && s.card && !s.isSold && !s.isReserved));
  const occupiedCount = activeSlotsOnly.length;
  const maxSlots = isShowcase ? 10 : 6;
  const totalValue = activeSlotsOnly.reduce((acc, s) => acc + (s ? s.retailPrice : 0), 0);

  // Filtered cards for drawer
  const filteredPickerCards = POKEMON_CARDS_DB.filter(
    (c) =>
      c.name.toLowerCase().includes(pickerSearch.toLowerCase()) ||
      c.rarity.toLowerCase().includes(pickerSearch.toLowerCase()) ||
      c.setName.toLowerCase().includes(pickerSearch.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-2 sm:p-4 select-none animate-in fade-in duration-200">
      <div className="relative w-full max-w-[1360px] h-[94vh] max-h-[920px] rounded-[32px] bg-gradient-to-b from-[#1e1e24] via-[#141418] to-[#0a0a0d] border-4 border-amber-600/50 p-4 sm:p-6 shadow-[0_25px_80px_rgba(0,0,0,0.95)] text-white flex flex-col justify-between overflow-hidden">
        {/* Header Bar */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800 shrink-0 gap-2 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-200 flex items-center justify-center text-black font-black text-2xl shadow-lg border border-amber-300">
              {isShowcase ? '🏆' : activeTab === 'shelf_1' ? '🔥' : activeTab === 'shelf_2' ? '⚡' : '✨'}
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h3 className="text-base sm:text-xl font-black text-amber-300 uppercase tracking-wide">
                  {isShowcase
                    ? 'Bàn Trưng Bày 10 Chân Đứng Vàng VIP'
                    : activeTab === 'shelf_1'
                    ? 'Kệ Trưng Bày Thẻ #1 (Fire & Dragon)'
                    : activeTab === 'shelf_2'
                    ? 'Kệ Trưng Bày Thẻ #2 (Vintage 30th Anniversary)'
                    : 'Kệ Trưng Bày Thẻ #3 (Secret Illustration Rares)'}
                </h3>
                <span className="rounded-full bg-amber-500/20 px-3 py-0.5 text-xs font-black text-amber-300 border border-amber-500/40">
                  {occupiedCount}/{maxSlots} Thẻ Đang Bán
                </span>
                <span className="rounded-full bg-emerald-500/20 px-3 py-0.5 text-xs font-black text-emerald-400 border border-emerald-500/40">
                  Tổng Giá Trị: ${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Cơ chế bán thẻ trực tiếp: Chọn thẻ và cài đặt tag giá vàng. Khách hàng tới quầy sẽ xem và mua thẻ!
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleFillAllSlots}
              disabled={isCurrentShelfLocked}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-black font-black text-xs cursor-pointer shadow transition-all hover:scale-105 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              Lắp Đầy {maxSlots} Thẻ
            </button>
            <button
              onClick={handleClearAllSlots}
              disabled={isCurrentShelfLocked}
              className="px-3.5 py-2 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 font-bold text-xs border border-zinc-700/80 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Để Trống Chân Đứng
            </button>
            <button
              onClick={onClose}
              aria-label="Đóng"
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white cursor-pointer border border-zinc-700/80 transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Tab Switcher: 3 Shelves + 1 Showcase Table */}
        <div className="flex items-center gap-2 my-2 overflow-x-auto pb-1 shrink-0">
          <button
            onClick={() => {
              setActiveTab('shelf_1');
              setActiveSlotIndex(null);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'shelf_1'
                ? 'bg-gradient-to-r from-orange-600 to-amber-500 text-white shadow-lg shadow-orange-500/30'
                : 'bg-zinc-900/90 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-800'
            }`}
          >
            <Flame className="h-3.5 w-3.5" /> Kệ Trưng Bày 1 (6 Thẻ Lửa & Rồng)
          </button>

          <button
            onClick={() => {
              setActiveTab('shelf_2');
              setActiveSlotIndex(null);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'shelf_2'
                ? 'bg-gradient-to-r from-yellow-500 to-amber-400 text-black shadow-lg shadow-yellow-500/30'
                : 'bg-zinc-900/90 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-800'
            }`}
          >
            {shelf2Locked ? <Lock className="h-3.5 w-3.5 text-amber-400" /> : <Zap className="h-3.5 w-3.5" />} Kệ Trưng Bày 2 (6 Thẻ 30th Vintage){shelf2Locked ? ' · Khóa' : ''}
          </button>

          <button
            onClick={() => {
              setActiveTab('shelf_3');
              setActiveSlotIndex(null);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'shelf_3'
                ? 'bg-gradient-to-r from-purple-600 to-pink-500 text-white shadow-lg shadow-purple-500/30'
                : 'bg-zinc-900/90 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-800'
            }`}
          >
            {shelf3Locked ? <Lock className="h-3.5 w-3.5 text-purple-400" /> : <Sparkles className="h-3.5 w-3.5" />} Kệ Trưng Bày 3 (6 Thẻ Secret Rare){shelf3Locked ? ' · Khóa' : ''}
          </button>

          <button
            onClick={() => {
              setActiveTab('showcase');
              setActiveSlotIndex(null);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'showcase'
                ? 'bg-gradient-to-r from-amber-500 to-yellow-300 text-black shadow-lg shadow-amber-500/30'
                : 'bg-zinc-900/90 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-800'
            }`}
          >
            <Trophy className="h-3.5 w-3.5" /> Bàn Đứng Vàng VIP (10 Thẻ)
          </button>
        </div>

        {/* Display Slots Arena */}
        <div
          className="my-2 p-3 sm:p-5 rounded-2xl border-2 border-zinc-800 shadow-inner flex flex-col justify-between flex-1 gap-4 overflow-y-auto"
          style={{
            background: isShowcase
              ? 'radial-gradient(ellipse at 50% 30%, #3a2a1f 0%, #1f1510 100%)'
              : 'radial-gradient(ellipse at 50% 30%, #1f2430 0%, #0f1218 100%)',
          }}
        >
          {isCurrentShelfLocked && lockedShelfDef ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-3">
              <div className="h-16 w-16 rounded-2xl bg-amber-500/15 border-2 border-amber-500/50 flex items-center justify-center">
                <Lock className="h-8 w-8 text-amber-400" />
              </div>
              <h4 className="text-lg sm:text-xl font-black text-amber-300 uppercase">
                {lockedShelfDef.name} Đang Bị Khóa
              </h4>
              <p className="text-xs sm:text-sm text-zinc-300 max-w-md">
                {lockedShelfDef.description}
              </p>
              <div className="flex items-center gap-3 text-xs font-black">
                <span className="px-3 py-1 rounded-full bg-zinc-900 border border-amber-500/40 text-amber-300">
                  Yêu cầu: Cấp Cửa Hàng {lockedShelfDef.level}
                </span>
                <span className="px-3 py-1 rounded-full bg-zinc-900 border border-emerald-500/40 text-emerald-300">
                  Phí Mở Khóa: ${lockedShelfDef.fee.toLocaleString()}
                </span>
              </div>
              {onOpenShelfUnlocks && (
                <button
                  onClick={() => {
                    soundManager.playSelectSound();
                    onOpenShelfUnlocks();
                  }}
                  className="mt-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-600 hover:from-cyan-400 hover:to-sky-500 text-white font-black text-xs sm:text-sm shadow-lg cursor-pointer transition"
                >
                  🪜 Mở Tablet Mở Khóa Kệ Ngay
                </button>
              )}
            </div>
          ) : isShowcase ? (
            /* 10 SLOTS SHOWCASE TABLE (2 ROWS OF 5) */
            <>
              {/* Row 1: Back Tier */}
              <div className="grid grid-cols-5 gap-3 sm:gap-4 flex-1 items-stretch">
                {currentSlots.slice(0, 5).map((item, relIdx) => renderSlot(item, relIdx))}
              </div>
              {/* Row 2: Front Tier */}
              <div className="grid grid-cols-5 gap-3 sm:gap-4 flex-1 items-stretch">
                {currentSlots.slice(5, 10).map((item, relIdx) => renderSlot(item, relIdx + 5))}
              </div>
            </>
          ) : (
            /* 6 SLOTS SHELF (2 TIERS OF 3 - PROMINENT & HIGH-RES) */
            <>
              {/* Upper Tier (3 slots) */}
              <div className="grid grid-cols-3 gap-4 sm:gap-6 flex-1 items-stretch max-w-5xl mx-auto w-full">
                {currentSlots.slice(0, 3).map((item, relIdx) => renderSlot(item, relIdx, true))}
              </div>
              {/* Lower Tier (3 slots) */}
              <div className="grid grid-cols-3 gap-4 sm:gap-6 flex-1 items-stretch max-w-5xl mx-auto w-full">
                {currentSlots.slice(3, 6).map((item, relIdx) => renderSlot(item, relIdx + 3, true))}
              </div>
            </>
          )}
        </div>

        {/* Bottom Status & Info Bar */}
        <div className="flex items-center justify-between text-xs text-zinc-400 pt-2 border-t border-zinc-800">
          <div className="flex items-center gap-3">
            <span>💡 <b>Mẹo bán hàng:</b> Đặt giá quanh mức 100% - 115% giá thị trường để khách hàng mua nhanh nhất!</span>
          </div>
          <div>
            Nhấn <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-white font-mono text-[10px]">ESC</kbd> để đóng
          </div>
        </div>
      </div>

      {/* Card Picker Drawer */}
      {showCardPicker && activeSlotIndex !== null && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 p-4">
          <div className="relative w-full max-w-2xl max-h-[85vh] rounded-3xl bg-zinc-950 border-2 border-amber-500/60 p-5 flex flex-col shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <span className="text-amber-400 font-black text-lg">Chọn Thẻ Đặt Vào Chân Đứng #{activeSlotIndex + 1}</span>
              </div>
              <button
                onClick={() => setShowCardPicker(false)}
                className="h-8 w-8 rounded-lg bg-zinc-900 text-zinc-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="my-3 relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
              <input
                type="text"
                placeholder="Tìm theo tên thẻ, độ hiếm, bộ sưu tập..."
                value={pickerSearch}
                onChange={(e) => setPickerSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-white text-xs placeholder:text-zinc-500 focus:outline-none focus:border-amber-400"
              />
            </div>

            <div className="flex-1 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 gap-3 pr-1 py-1">
              {filteredPickerCards.map((card) => (
                <div
                  key={card.id}
                  onClick={() => handlePlaceCardIntoSlot(activeSlotIndex, card)}
                  className="group rounded-2xl border border-zinc-800 bg-zinc-900/80 hover:border-amber-400 p-2.5 flex flex-col items-center justify-between transition-all hover:scale-102 cursor-pointer shadow-lg"
                >
                  <div className="relative w-full aspect-[63/88] rounded-xl overflow-hidden bg-black/40 mb-2">
                    <img
                      src={card.imageUrl}
                      alt={card.name}
                      onError={(e) => {
                        const img = e.currentTarget as HTMLImageElement;
                        if (img.src.includes('_p1.jpg') || img.src.includes('_p2.jpg')) {
                          img.src = img.src.replace(/_p\d+\.jpg/, '.jpg');
                        } else if (img.src.includes('_p1.png') || img.src.includes('_p2.png')) {
                          img.src = img.src.replace(/_p\d+\.png/, '.png');
                        } else if (card.artUrl && img.src !== card.artUrl) {
                          img.src = card.artUrl;
                        } else if (card.fallbackUrl && img.src !== card.fallbackUrl) {
                          img.src = card.fallbackUrl;
                        }
                      }}
                      className="w-full h-full object-contain group-hover:scale-105 transition duration-200"
                    />
                  </div>
                  <div className="w-full text-center">
                    <div className="text-xs font-black text-white truncate">{card.name}</div>
                    <div className="text-[10px] text-zinc-400 truncate">{card.setName} • {card.rarityLabel}</div>
                    <div className="mt-1 flex items-center justify-between text-[11px] font-bold">
                      <span className="text-zinc-400">Thị trường:</span>
                      <span className="text-emerald-400 font-mono">${card.marketPrice.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  function renderSlot(item: any, slotIdx: number, isLarge: boolean = false) {
    const isActive = activeSlotIndex === slotIdx;
    const isReservedByCustomer = Boolean(item && item.card && !item.isSold && item.isReserved);
    const hasActiveCard = item && item.card && !item.isSold && !isReservedByCustomer;

    return (
      <div
        key={slotIdx}
        onClick={() => {
          if (isReservedByCustomer) return;
          setActiveSlotIndex(slotIdx);
          if (!hasActiveCard) setShowCardPicker(true);
        }}
        className={`group relative flex flex-col items-center justify-between p-2.5 rounded-2xl transition-all ${
          isReservedByCustomer
            ? 'cursor-not-allowed bg-sky-950/30 border border-sky-500/30'
            : isActive
            ? 'cursor-pointer ring-2 ring-emerald-400 bg-black/40 shadow-[0_0_20px_rgba(52,211,153,0.3)]'
            : 'cursor-pointer hover:bg-white/5 bg-black/20'
        }`}
      >
        {hasActiveCard ? (
          <div className="relative w-full aspect-[63/88] flex-1 min-h-[170px] sm:min-h-[220px] flex items-center justify-center">
            {(() => {
              const activeSlab = item.slab || item.card?.slab;
              const showSlab = Boolean((item.isSlab || activeSlab) && activeSlab);

              if (showSlab && activeSlab) {
                const isCgc = activeSlab.company === 'CGC';
                const grade = activeSlab.grade || 10;
                const cert = activeSlab.certNumber || '88401924';
                const gradeSub =
                  grade === 10
                    ? activeSlab.gradeLabel?.includes('PRISTINE')
                      ? 'PRISTINE'
                      : isCgc
                      ? 'GEM MINT'
                      : 'GEM MT'
                    : grade === 9
                    ? 'MINT'
                    : 'NM-MT';

                return (
                  <div className="w-full h-full rounded-xl border border-zinc-300/40 bg-gradient-to-b from-zinc-300/20 via-zinc-800/90 to-zinc-300/15 p-1.5 shadow-2xl flex flex-col justify-between transition-all duration-300 group-hover:scale-105">
                    {isCgc ? (
                      <div className="rounded-md overflow-hidden border border-black bg-black shrink-0 mb-1">
                        <div className="flex items-center justify-between bg-black px-1.5 py-0.5 text-white">
                          <span className="text-[9px] font-black tracking-wider">CGC</span>
                          <span className="text-[6px] font-bold tracking-wider text-zinc-200 truncate">
                            CERTIFIED GUARANTY
                          </span>
                        </div>
                        <div className="flex items-center justify-between bg-gradient-to-b from-slate-100 to-slate-200 px-1.5 py-0.5 text-zinc-950">
                          <div className="min-w-0 text-left pr-1">
                            <div className="text-[8px] font-extrabold truncate leading-tight">
                              {item.card.name}
                            </div>
                            <div className="text-[6.5px] font-mono text-zinc-700 truncate leading-tight">
                              {cert}
                            </div>
                          </div>
                          <div className="shrink-0 border-l border-zinc-800 pl-1.5 text-center leading-none">
                            <div className="text-[6px] font-black">{gradeSub}</div>
                            <div className="text-xs font-black">{grade}</div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-sm border-2 border-[#d91e2a] bg-white px-1.5 py-0.5 text-zinc-950 shrink-0 mb-1 font-mono">
                        <div className="flex items-center justify-between gap-1">
                          <div className="min-w-0 text-left">
                            <div className="text-[7.5px] font-black uppercase truncate leading-tight">
                              {item.card.name}
                            </div>
                            <div className="flex items-center gap-1 mt-0.5">
                              <span className="text-[6.5px] font-black px-1 bg-zinc-200 border border-zinc-400 text-blue-900">
                                P<span className="text-[#d91e2a]">S</span>A
                              </span>
                              <span className="text-[6.5px] font-bold text-zinc-700 truncate">{cert}</span>
                            </div>
                          </div>
                          <div className="shrink-0 text-right leading-none">
                            <div className="text-[6.5px] font-black">{gradeSub}</div>
                            <div className="text-xs font-black">{grade}</div>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex-1 min-h-0 rounded-md overflow-hidden bg-zinc-950 border border-zinc-600/40 flex items-center justify-center p-0.5">
                      <img
                        src={item.card.imageUrl}
                        alt={item.card.name}
                        onError={(e) => {
                          const img = e.currentTarget as HTMLImageElement;
                          if (img.src.includes('_p1.jpg') || img.src.includes('_p2.jpg')) {
                            img.src = img.src.replace(/_p\d+\.jpg/, '.jpg');
                          } else if (img.src.includes('_p1.png') || img.src.includes('_p2.png')) {
                            img.src = img.src.replace(/_p\d+\.png/, '.png');
                          } else if (item.card.artUrl && img.src !== item.card.artUrl) {
                            img.src = item.card.artUrl;
                          } else if (item.card.fallbackUrl && img.src !== item.card.fallbackUrl) {
                            img.src = item.card.fallbackUrl;
                          }
                        }}
                        className="w-full h-full object-contain drop-shadow-xl"
                      />
                    </div>
                  </div>
                );
              }

              return (
                <>
                  <div
                    className={`w-full h-full rounded-2xl shadow-2xl flex items-center justify-center overflow-hidden p-1 bg-black/60 transition-all duration-300 group-hover:scale-105 group-hover:shadow-[0_15px_35px_rgba(0,0,0,0.9)] ${
                      getCardHoloClass(item.card.marketPrice, item.card.hasRgbAura)
                    } ${item.card.marketPrice < 5 && !item.card.hasRgbAura ? 'border-2 border-white/40' : ''}`}
                  >
                    <img
                      src={item.card.imageUrl}
                      alt={item.card.name}
                      onError={(e) => {
                        const img = e.currentTarget as HTMLImageElement;
                        if (img.src.includes('_p1.jpg') || img.src.includes('_p2.jpg')) {
                          img.src = img.src.replace(/_p\d+\.jpg/, '.jpg');
                        } else if (img.src.includes('_p1.png') || img.src.includes('_p2.png')) {
                          img.src = img.src.replace(/_p\d+\.png/, '.png');
                        } else if (item.card.artUrl && img.src !== item.card.artUrl) {
                          img.src = item.card.artUrl;
                        } else if (item.card.fallbackUrl && img.src !== item.card.fallbackUrl) {
                          img.src = item.card.fallbackUrl;
                        }
                      }}
                      className="w-full h-full object-contain drop-shadow-xl"
                    />
                  </div>
                  <span className="absolute top-2 left-2 rounded-lg bg-sky-950/90 px-2 py-0.5 text-[9px] font-black text-sky-300 shadow-lg border border-sky-400/60">
                    RAW
                  </span>
                </>
              );
            })()}

            {/* Remove button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleRemoveCardFromSlot(slotIdx);
              }}
              title="Gỡ thẻ về album"
              className="absolute -top-2 -right-2 h-7 w-7 rounded-full bg-rose-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-150 shadow-lg hover:scale-110 cursor-pointer z-10"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : isReservedByCustomer ? (
          /* Reserved inside customer's basket walking to register */
          <div className="relative w-full aspect-[63/88] flex-1 min-h-[170px] sm:min-h-[220px] flex flex-col items-center justify-center text-center px-2">
            <div className="text-3xl mb-2">🧺</div>
            <span className="text-xs text-sky-300 font-black">Trong Giỏ Khách</span>
            <span className="text-[10px] text-zinc-400 mt-1">Khách đang cầm ra quầy thanh toán</span>
          </div>
        ) : (
          /* Empty Stand */
          <div className="relative w-full aspect-[63/88] flex-1 min-h-[170px] sm:min-h-[220px] flex flex-col items-center justify-center">
            <div className="w-3.5 h-36 bg-gradient-to-r from-[#d4af37] via-[#fff4b8] to-[#aa8012] rounded shadow-md" />
            <div className="w-24 h-3.5 bg-gradient-to-b from-[#fff4b8] via-[#d4af37] to-[#805e07] rounded shadow-md -mt-16" />
            <div className="w-28 h-4 bg-gradient-to-t from-[#805e07] via-[#d4af37] to-[#fff4b8] rounded-md shadow-lg mt-14" />
            <span className="text-xs text-amber-300 font-black mt-3 opacity-80 group-hover:opacity-100 flex items-center gap-1">
              <Plus className="h-3.5 w-3.5" /> Đặt Thẻ
            </span>
          </div>
        )}

        {/* Yellow Retail Price Tag */}
        <div className="w-full mt-2 shrink-0">
          {hasActiveCard ? (
            <div
              onClick={(e) => {
                e.stopPropagation();
                setEditingPriceIndex(slotIdx);
                setTempPriceInput(item.retailPrice.toString());
              }}
              className={`flex items-center rounded-xl overflow-hidden shadow-lg border transition-all ${
                isActive ? 'border-emerald-400 ring-2 ring-emerald-400/80' : 'border-zinc-700/80 hover:border-amber-400'
              }`}
            >
              <div className="bg-white text-zinc-900 px-2 py-1.5 flex flex-col items-center justify-center shrink-0 w-10 border-r border-zinc-300">
                <span className="text-[9px] font-black leading-none">1</span>
                <span className="text-[7px] font-bold text-zinc-600 leading-none">PSC</span>
              </div>

              <div className="bg-gradient-to-b from-[#fde047] to-[#facc15] flex-1 px-2 py-1 text-center flex flex-col items-center justify-center">
                {editingPriceIndex === slotIdx ? (
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <span className="text-xs text-black font-bold">$</span>
                    <input
                      type="number"
                      autoFocus
                      value={tempPriceInput}
                      onChange={(e) => setTempPriceInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSavePrice(slotIdx)}
                      onBlur={() => handleSavePrice(slotIdx)}
                      className="w-16 bg-white text-black font-black text-xs text-center rounded px-1 py-0.5 border border-zinc-400"
                    />
                  </div>
                ) : (
                  <>
                    <span className="text-sm sm:text-base font-black text-black tracking-tight font-mono leading-tight">
                      ${item.retailPrice.toFixed(2)}
                    </span>
                    <span className="text-[9px] font-bold text-zinc-700 leading-none">
                      Mkt: ${item.card.marketPrice.toFixed(0)}
                    </span>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="w-full text-center py-2 text-[11px] text-zinc-400 font-bold border border-dashed border-zinc-700 rounded-xl">
              Ô Trống
            </div>
          )}
        </div>
      </div>
    );
  }
};
