import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  Eye,
  EyeOff,
  Store,
  Sparkles,
  Trophy,
  BookOpen,
} from 'lucide-react';
import {
  ALL_UNIQUE_BOOSTER_SETS,
  POKEMON_CARDS_DB,
  ONEPIECE_CARDS_DB,
  PokemonCard,
  getCardHoloClass,
  POCKET_RARITY_RANK,
} from '../game/pokemonShopLogic';
import { ALL_ONEPIECE_BOOSTER_SETS } from '../game/onePieceData';
import {
  computeAllMasterSetProgress,
  getMasterSetMilestoneReward,
  getMasterSetWholesaleDiscount,
} from '../game/shopExpansionSystems';
import { soundManager } from '../game/audio';

interface CardBinderModalProps {
  collectedCardIds: Record<string, number>; // cardId -> quantity
  claimedMasterSetMilestones?: string[];
  onClaimMasterSetMilestone?: (setId: string, pct: 50 | 80 | 100) => void;
  onClose: () => void;
  onCardKeptInShowcase?: (card: PokemonCard, price: number) => void;
}

export type SortMode = 'rarity_desc' | 'price_desc' | 'price_asc' | 'dex' | 'owned_desc';

export const CardBinderModal: React.FC<CardBinderModalProps> = ({
  collectedCardIds,
  claimedMasterSetMilestones = [],
  onClaimMasterSetMilestone,
  onClose,
  onCardKeptInShowcase,
}) => {
  const [viewMode, setViewMode] = useState<'binder' | 'master_set'>('binder');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortMode, setSortMode] = useState<SortMode>('rarity_desc');
  const [seriesFilter, setSeriesFilter] = useState<'all' | 'pokemon' | 'onepiece'>('all');
  const [showPriceAndQty, setShowPriceAndQty] = useState(true);
  const [selectedCard, setSelectedCard] = useState<PokemonCard | null>(null);

  const masterSets = React.useMemo(
    () => computeAllMasterSetProgress(collectedCardIds, claimedMasterSetMilestones),
    [collectedCardIds, claimedMasterSetMilestones]
  );
  const wholesaleDiscountPct = Math.round(
    getMasterSetWholesaleDiscount(claimedMasterSetMilestones) * 100
  );
  const totalClaimableMilestones = masterSets.reduce(
    (sum, s) => sum + s.claimableMilestones.length,
    0
  );

  // Cards per 2-page spread: Left page (3x2 = 6) + Right page (3x2 = 6) = 12 cards
  const CARDS_PER_SPREAD = 12;

  // Master card list sorted according to sortMode
  const sortedCards = React.useMemo(() => {
    let list =
      seriesFilter === 'pokemon'
        ? [...POKEMON_CARDS_DB]
        : seriesFilter === 'onepiece'
        ? [...ONEPIECE_CARDS_DB]
        : [...POKEMON_CARDS_DB, ...ONEPIECE_CARDS_DB];
    if (sortMode === 'rarity_desc') {
      return list.sort((a, b) => {
        const rankDiff = (POCKET_RARITY_RANK[b.pocketRarity] || 0) - (POCKET_RARITY_RANK[a.pocketRarity] || 0);
        if (rankDiff !== 0) return rankDiff;
        return (b.marketPrice || 0) - (a.marketPrice || 0);
      });
    }
    if (sortMode === 'price_desc') {
      return list.sort((a, b) => (b.marketPrice || 0) - (a.marketPrice || 0));
    }
    if (sortMode === 'price_asc') {
      return list.sort((a, b) => (a.marketPrice || 0) - (b.marketPrice || 0));
    }
    if (sortMode === 'dex') {
      return list.sort((a, b) => {
        if (a.dexNumber !== b.dexNumber) return a.dexNumber - b.dexNumber;
        return a.name.localeCompare(b.name);
      });
    }
    if (sortMode === 'owned_desc') {
      return list.sort((a, b) => {
        const countA = collectedCardIds[a.id] || 0;
        const countB = collectedCardIds[b.id] || 0;
        if (countA !== countB) return countB - countA;
        return (b.marketPrice || 0) - (a.marketPrice || 0);
      });
    }
    return list;
  }, [sortMode, collectedCardIds]);

  const totalPages = Math.max(1, Math.ceil(sortedCards.length / CARDS_PER_SPREAD));

  // Ensure currentPage is valid
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
    if (currentPage < 1) setCurrentPage(1);
  }, [currentPage, totalPages]);

  // Page turns with sound
  const handlePageChange = useCallback((newPage: number) => {
    const clamped = Math.max(1, Math.min(totalPages, newPage));
    if (clamped !== currentPage) {
      soundManager.playCardSlide();
      setCurrentPage(clamped);
    }
  }, [currentPage, totalPages]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedCard) {
        if (e.code === 'Escape') setSelectedCard(null);
        return;
      }
      if (e.code === 'ArrowLeft' || e.code === 'KeyA' || e.code === 'PageUp') {
        e.preventDefault();
        handlePageChange(currentPage - 1);
      } else if (e.code === 'ArrowRight' || e.code === 'KeyD' || e.code === 'PageDown') {
        e.preventDefault();
        handlePageChange(currentPage + 1);
      } else if (e.code === 'Escape' || e.code === 'KeyB' || e.code === 'KeyV') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPage, handlePageChange, onClose, selectedCard]);

  // Slice cards for current 2-page view
  const startIndex = (currentPage - 1) * CARDS_PER_SPREAD;
  const spreadCards = sortedCards.slice(startIndex, startIndex + CARDS_PER_SPREAD);
  const leftPageCards = spreadCards.slice(0, 6);
  const rightPageCards = spreadCards.slice(6, 12);

  // Total portfolio statistics
  const cardByIdMap = React.useMemo(() => {
    const map = new Map<string, PokemonCard>();
    for (const c of [...POKEMON_CARDS_DB, ...ONEPIECE_CARDS_DB]) {
      map.set(c.id, c);
    }
    return map;
  }, []);
  const totalCollectedUnique = Object.keys(collectedCardIds).filter((id) => (collectedCardIds[id] || 0) > 0).length;
  const totalCardsInSet = POKEMON_CARDS_DB.length + ONEPIECE_CARDS_DB.length;
  const totalPortfolioValue = Object.entries(collectedCardIds).reduce((sum, [cardId, count]) => {
    const card = cardByIdMap.get(cardId);
    return sum + (card ? card.marketPrice * count : 0);
  }, 0);

  // Cycle sorting mode
  const handleCycleSort = () => {
    soundManager.playSelectSound();
    setSortMode((prev) => {
      if (prev === 'rarity_desc') return 'price_desc';
      if (prev === 'price_desc') return 'price_asc';
      if (prev === 'price_asc') return 'owned_desc';
      if (prev === 'owned_desc') return 'dex';
      return 'rarity_desc';
    });
  };

  const getSortLabel = () => {
    if (sortMode === 'rarity_desc') return '⭐ Độ Hiếm';
    if (sortMode === 'price_desc') return '💰 Giá Cao Nhất';
    if (sortMode === 'price_asc') return '🏷️ Giá Thấp Nhất';
    if (sortMode === 'owned_desc') return '📦 Số Lượng';
    return '📖 STT Pokédex';
  };

  // Helper to render a card slot (either empty sleeve pocket or filled card pocket)
  const renderCardSlot = (card: PokemonCard | undefined, globalIndex: number) => {
    if (!card) {
      // Out of bounds empty pocket
      return (
        <div key={`empty-${globalIndex}`} className="flex flex-col items-center">
          <div className="h-6 mb-1" />
          <div className="w-full aspect-[63/88] rounded-xl border border-zinc-800/80 bg-[#12141a] flex items-center justify-center shadow-inner">
            <span className="text-[10px] text-zinc-700 font-mono font-bold">---</span>
          </div>
        </div>
      );
    }

    const ownedCount = collectedCardIds[card.id] || 0;
    const isOwned = ownedCount > 0;

    return (
      <div
        key={card.id}
        onClick={() => {
          if (isOwned) {
            soundManager.playSelectSound();
            setSelectedCard(card);
          }
        }}
        className={`group relative flex flex-col items-center ${isOwned ? 'cursor-pointer' : 'cursor-default'}`}
      >
        {/* Top Header Tag: Green Price Pill + Quantity (Only if owned & toggle is ON) */}
        <div className="h-6 w-full flex items-center justify-between px-1 mb-1">
          {showPriceAndQty && isOwned ? (
            <>
              {/* Authentic Green Pill Price Tag */}
              <div className="rounded-full bg-[#16a34a] px-2 py-0.5 shadow-sm text-white font-black text-[11px] leading-tight font-mono tracking-tight flex items-center gap-0.5">
                <span>${card.marketPrice.toFixed(2)}</span>
              </div>
              {/* Quantity xCount */}
              <span className="text-[11px] font-bold text-zinc-200 drop-shadow">
                x{ownedCount}
              </span>
            </>
          ) : (
            <div className="h-full" />
          )}
        </div>

        {/* Card Sleeve Pocket */}
        <div className="relative w-full aspect-[63/88] rounded-xl overflow-hidden border border-zinc-700/80 bg-[#12141a] shadow-lg flex items-center justify-center p-1 transition-all group-hover:border-zinc-500">
          {isOwned ? (
            /* OWNED CARD: Authentic Card Artwork inside Sleeve */
            <div
              className={`w-full h-full rounded-lg flex items-center justify-center overflow-hidden transition-transform duration-200 group-hover:scale-102 ${
                getCardHoloClass(card.marketPrice, card.hasRgbAura)
              }`}
            >
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
                className="w-full h-full object-contain drop-shadow"
              />
            </div>
          ) : (
            /* UNOWNED CARD: Pure Empty Black Sleeve Pocket with subtle slot index! */
            <div className="w-full h-full rounded-lg bg-gradient-to-b from-[#0e1015] to-[#08090d] border border-white/5 flex flex-col items-center justify-center p-2 text-center select-none shadow-inner">
              <span className="text-zinc-600 font-mono text-xs font-bold">
                #{startIndex + globalIndex + 1}
              </span>
              <span className="text-[9px] text-zinc-700 uppercase tracking-widest mt-1">
                Trống
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-2 sm:p-4 select-none animate-in fade-in duration-200">
      {/* MAIN CONTAINER: LEATHER BINDER SPREAD + RIGHT-SIDE ACTION BUTTONS */}
      <div className="relative flex items-center justify-center gap-3 sm:gap-6 w-full max-w-[1300px]">
        {/* ========================================================================= */}
        {/* LEATHER BINDER DUAL-PAGE ALBUM (EXACT REPLICA OF STEAM TCG SIMULATOR)     */}
        {/* ========================================================================= */}
        <div
          className="relative flex-1 rounded-[32px] p-4 sm:p-6 shadow-[0_25px_60px_rgba(0,0,0,0.95)] border-4 border-[#523d2e] overflow-hidden flex flex-col justify-between"
          style={{
            background: 'linear-gradient(135deg, #2b1d14 0%, #1c130d 100%)',
          }}
        >
          {/* Top subtle leather stitched trim */}
          <div className="absolute inset-1.5 rounded-[26px] border border-dashed border-[#78553e]/60 pointer-events-none" />

          {/* TWO-PAGE SPREAD CONTENT OR MASTER SET PROGRESS VAULT */}
          {viewMode === 'master_set' ? (
            <div className="relative z-10 rounded-2xl border border-[#3d2b1f] bg-[#12141a] p-4 max-h-[540px] overflow-y-auto space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 pb-3">
                <div>
                  <h3 className="text-sm font-black uppercase text-amber-300 flex items-center gap-2">
                    <Trophy className="h-4 w-4" /> Bách Khoa Master Set & Grand Dex Vault
                  </h3>
                  <p className="text-[11px] text-zinc-400">
                    Hoàn thành 50% / 80% / 100% mỗi Set để nhận Tiền mặt, XP & Giảm giá nhập sỉ vĩnh viễn!
                  </p>
                </div>
                <span className="rounded-lg bg-emerald-500/20 border border-emerald-500/40 px-3 py-1 text-xs font-black text-emerald-300">
                  Giảm Giá Nhập Sỉ Hiện Tại: -{wholesaleDiscountPct}%
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {masterSets
                  .filter((s) => seriesFilter === 'all' || s.universe === seriesFilter)
                  .map((ms) => {
                    const setInfo =
                      [...ALL_UNIQUE_BOOSTER_SETS, ...ALL_ONEPIECE_BOOSTER_SETS].find(
                        (i) => i.id === ms.setId
                      ) || ALL_UNIQUE_BOOSTER_SETS[0];
                    return (
                      <div
                        key={ms.setId}
                        className="rounded-xl border border-zinc-800 bg-zinc-900/75 p-3 space-y-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-black text-white truncate">
                            {ms.setName}
                          </span>
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-black ${
                              ms.universe === 'onepiece'
                                ? 'bg-red-500/20 text-red-300'
                                : 'bg-sky-500/20 text-sky-300'
                            }`}
                          >
                            {ms.ownedUnique}/{ms.totalUnique} ({ms.percent}%)
                          </span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-zinc-800 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 transition-all"
                            style={{ width: `${ms.percent}%` }}
                          />
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {([50, 80, 100] as const).map((pct) => {
                            const isClaimed = ms.claimedMilestones.includes(pct);
                            const isReady = ms.claimableMilestones.includes(pct);
                            const reward = getMasterSetMilestoneReward(setInfo, pct);
                            return (
                              <button
                                key={pct}
                                disabled={!isReady || !onClaimMasterSetMilestone}
                                onClick={() => {
                                  if (isReady && onClaimMasterSetMilestone) {
                                    soundManager.playRarePullFanfare();
                                    onClaimMasterSetMilestone(ms.setId, pct);
                                  }
                                }}
                                className={`flex-1 rounded-lg px-2 py-1 text-[10px] font-black border transition ${
                                  isClaimed
                                    ? 'border-emerald-500/40 bg-emerald-950/50 text-emerald-300'
                                    : isReady
                                    ? 'border-amber-400 bg-amber-500 text-black animate-pulse cursor-pointer hover:bg-amber-400'
                                    : 'border-zinc-800 bg-zinc-950 text-zinc-500 cursor-not-allowed'
                                }`}
                              >
                                {isClaimed
                                  ? `✓ ${pct}%`
                                  : isReady
                                  ? `Nhận ${pct}% (+$${reward.cash})`
                                  : `Mốc ${pct}% ($${reward.cash})`}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          ) : (
            <>
              <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8 items-center">
                {/* LEFT PAGE: 3 COLUMNS x 2 ROWS */}
                <div
                  className="rounded-2xl p-3 sm:p-4 border border-[#3d2b1f] shadow-inner"
                  style={{
                    background: 'linear-gradient(180deg, #18191f 0%, #0f1015 100%)',
                  }}
                >
                  <div className="grid grid-cols-3 gap-2 sm:gap-3">
                    {Array.from({ length: 6 }).map((_, idx) => renderCardSlot(leftPageCards[idx], idx))}
                  </div>
                </div>

                {/* RIGHT PAGE: 3 COLUMNS x 2 ROWS */}
                <div
                  className="rounded-2xl p-3 sm:p-4 border border-[#3d2b1f] shadow-inner"
                  style={{
                    background: 'linear-gradient(180deg, #18191f 0%, #0f1015 100%)',
                  }}
                >
                  <div className="grid grid-cols-3 gap-2 sm:gap-3">
                    {Array.from({ length: 6 }).map((_, idx) => renderCardSlot(rightPageCards[idx], 6 + idx))}
                  </div>
                </div>
              </div>

              {/* CENTER SPINE WITH 4 METALLIC DOUBLE-RINGS AND BOTTOM PAGE PILL */}
              <div className="hidden md:flex absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-12 flex-col justify-between items-center py-8 pointer-events-none z-20">
                {/* 4 Silver Double Ring Clips */}
                {[0, 1, 2, 3].map((ringIdx) => (
                  <div key={ringIdx} className="flex items-center gap-1.5 opacity-90">
                    <div className="w-2.5 h-7 rounded-full bg-gradient-to-r from-zinc-500 via-zinc-100 to-zinc-600 shadow-md border border-zinc-700" />
                    <div className="w-2.5 h-7 rounded-full bg-gradient-to-r from-zinc-500 via-zinc-100 to-zinc-600 shadow-md border border-zinc-700" />
                  </div>
                ))}
              </div>
            </>
          )}

          {/* BOTTOM BAR: PAGE PILL e.g. "1/11" & STATS */}
          <div className="relative z-10 flex items-center justify-between pt-3 mt-2 border-t border-[#3d2b1f] text-xs">
            <div className="flex items-center gap-2">
              <span className="text-zinc-400 font-medium">Sở Hữu:</span>
              <span className="text-amber-300 font-black">
                {totalCollectedUnique}/{totalCardsInSet} Thẻ ({Math.round((totalCollectedUnique / totalCardsInSet) * 100)}%)
              </span>
              <span className="text-zinc-600">·</span>
              <span className="text-zinc-400 font-medium">Tổng Giá Trị:</span>
              <span className="text-emerald-400 font-black">${totalPortfolioValue.toFixed(2)}</span>
            </div>

            {/* Page Pill in Center Bottom (Image: 1/11) */}
            <div className="rounded-lg bg-[#422d1e] px-4 py-1 border border-[#694830] shadow text-amber-200 font-black text-xs tracking-wider">
              {currentPage}/{totalPages}
            </div>

            <div className="text-zinc-400 text-[11px] hidden sm:block">
              Dùng phím <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-white font-mono">A/D</kbd> hoặc <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-white font-mono">←/→</kbd> để lật trang
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* RIGHT-SIDE ACTION BUTTONS (EXACT REPLICA OF THE STREAMER SCREENSHOT)      */}
        {/* ========================================================================= */}
        <div className="flex flex-col gap-2 shrink-0 w-44 sm:w-52">
          {/* Binder vs Master Set Switcher */}
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-zinc-950 border border-amber-500/40 p-1">
            <button
              onClick={() => {
                soundManager.playSelectSound();
                setViewMode('binder');
              }}
              className={`flex items-center justify-center gap-1 py-1.5 rounded-lg text-[10px] font-black transition cursor-pointer ${
                viewMode === 'binder'
                  ? 'bg-amber-500 text-black shadow'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <BookOpen className="h-3 w-3" /> Sổ Thẻ
            </button>
            <button
              onClick={() => {
                soundManager.playSelectSound();
                setViewMode('master_set');
              }}
              className={`flex items-center justify-center gap-1 py-1.5 rounded-lg text-[10px] font-black transition cursor-pointer ${
                viewMode === 'master_set'
                  ? 'bg-emerald-500 text-black shadow'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Trophy className="h-3 w-3" /> Master Set
              {totalClaimableMilestones > 0 && (
                <span className="rounded-full bg-red-600 text-white px-1 text-[9px] animate-pulse">
                  {totalClaimableMilestones}
                </span>
              )}
            </button>
          </div>

          {/* Series Switcher: Tất Cả / Pokémon T1 / One Piece T2 */}
          <div className="flex rounded-xl bg-zinc-950 border border-zinc-800 p-1 gap-1">
            <button
              onClick={() => {
                soundManager.playSelectSound();
                setSeriesFilter('all');
                setCurrentPage(1);
              }}
              className={`flex-1 py-1 rounded-lg text-[10px] font-black transition cursor-pointer ${
                seriesFilter === 'all'
                  ? 'bg-amber-400 text-black shadow'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Tất Cả
            </button>
            <button
              onClick={() => {
                soundManager.playSelectSound();
                setSeriesFilter('pokemon');
                setCurrentPage(1);
              }}
              className={`flex-1 py-1 rounded-lg text-[10px] font-black transition cursor-pointer ${
                seriesFilter === 'pokemon'
                  ? 'bg-sky-500 text-white shadow'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Pokémon
            </button>
            <button
              onClick={() => {
                soundManager.playSelectSound();
                setSeriesFilter('onepiece');
                setCurrentPage(1);
              }}
              className={`flex-1 py-1 rounded-lg text-[10px] font-black transition cursor-pointer ${
                seriesFilter === 'onepiece'
                  ? 'bg-red-500 text-white shadow'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              One Piece
            </button>
          </div>

          {/* Page Up */}
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-zinc-900/95 hover:bg-zinc-800 disabled:opacity-40 text-white font-black text-xs border border-zinc-700/80 shadow transition cursor-pointer"
          >
            <span>Lật Trang Trước</span>
            <span className="text-zinc-400 font-bold text-[10px]">Page Up</span>
          </button>

          {/* Page Down */}
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-zinc-900/95 hover:bg-zinc-800 disabled:opacity-40 text-white font-black text-xs border border-zinc-700/80 shadow transition cursor-pointer"
          >
            <span>Lật Trang Sau</span>
            <span className="text-zinc-400 font-bold text-[10px]">Page Down</span>
          </button>

          {/* Last 10 Pages */}
          <button
            onClick={() => handlePageChange(currentPage - 10)}
            disabled={currentPage <= 1}
            className="flex items-center justify-between px-4 py-2 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 disabled:opacity-40 text-zinc-300 font-bold text-xs border border-zinc-800 transition cursor-pointer"
          >
            <span>Lùi 10 Trang</span>
            <ChevronsLeft className="h-4 w-4 text-zinc-400" />
          </button>

          {/* Next 10 Pages */}
          <button
            onClick={() => handlePageChange(currentPage + 10)}
            disabled={currentPage >= totalPages}
            className="flex items-center justify-between px-4 py-2 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 disabled:opacity-40 text-zinc-300 font-bold text-xs border border-zinc-800 transition cursor-pointer"
          >
            <span>Tiến 10 Trang</span>
            <ChevronsRight className="h-4 w-4 text-zinc-400" />
          </button>

          {/* Sort Button */}
          <button
            onClick={handleCycleSort}
            className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs shadow-md transition cursor-pointer"
          >
            <div className="flex items-center gap-1.5">
              <ArrowUpDown className="h-4 w-4" />
              <span>Sắp Xếp</span>
            </div>
            <span className="text-[10px] bg-black/20 px-1.5 py-0.5 rounded font-bold">
              {getSortLabel()}
            </span>
          </button>

          {/* Quick Sort Options */}
          <div className="grid grid-cols-2 gap-1 bg-zinc-950/70 p-1.5 rounded-xl border border-zinc-800 text-[10px]">
            <button
              onClick={() => {
                soundManager.playSelectSound();
                setSortMode('rarity_desc');
              }}
              className={`px-2 py-1.5 rounded-lg font-bold text-center transition cursor-pointer ${
                sortMode === 'rarity_desc'
                  ? 'bg-amber-400 text-black font-black shadow'
                  : 'bg-zinc-900 text-zinc-300 hover:text-white'
              }`}
            >
              ⭐ Độ Hiếm
            </button>
            <button
              onClick={() => {
                soundManager.playSelectSound();
                setSortMode('price_desc');
              }}
              className={`px-2 py-1.5 rounded-lg font-bold text-center transition cursor-pointer ${
                sortMode === 'price_desc'
                  ? 'bg-emerald-500 text-black font-black shadow'
                  : 'bg-zinc-900 text-zinc-300 hover:text-white'
              }`}
            >
              💰 Giá Cao
            </button>
            <button
              onClick={() => {
                soundManager.playSelectSound();
                setSortMode('price_asc');
              }}
              className={`px-2 py-1.5 rounded-lg font-bold text-center transition cursor-pointer ${
                sortMode === 'price_asc'
                  ? 'bg-sky-400 text-black font-black shadow'
                  : 'bg-zinc-900 text-zinc-300 hover:text-white'
              }`}
            >
              🏷️ Giá Thấp
            </button>
            <button
              onClick={() => {
                soundManager.playSelectSound();
                setSortMode('dex');
              }}
              className={`px-2 py-1.5 rounded-lg font-bold text-center transition cursor-pointer ${
                sortMode === 'dex'
                  ? 'bg-purple-400 text-black font-black shadow'
                  : 'bg-zinc-900 text-zinc-300 hover:text-white'
              }`}
            >
              📖 Pokédex
            </button>
          </div>

          {/* Show/Hide Card Price & Quantity */}
          <button
            onClick={() => setShowPriceAndQty((prev) => !prev)}
            className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-zinc-900/95 hover:bg-zinc-800 text-white font-bold text-xs border border-zinc-700/80 shadow transition cursor-pointer"
          >
            <div className="flex items-center gap-1.5">
              {showPriceAndQty ? <Eye className="h-4 w-4 text-emerald-400" /> : <EyeOff className="h-4 w-4 text-zinc-400" />}
              <span>Hiện Giá & Qty</span>
            </div>
            <span className={`text-[10px] font-black ${showPriceAndQty ? 'text-emerald-400' : 'text-zinc-500'}`}>
              {showPriceAndQty ? 'BẬT' : 'TẮT'}
            </span>
          </button>

          {/* Close */}
          <button
            onClick={onClose}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs shadow-lg transition cursor-pointer mt-2"
          >
            <X className="h-4 w-4" />
            <span>Đóng Sổ Thẻ (ESC)</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* INSPECT CARD MODAL OVERLAY                                                */}
      {/* ========================================================================= */}
      {/* ========================================================================= */}
      {/* INSPECT CARD MODAL OVERLAY (FULL CARD DISPLAY - CLEAN & ZERO CLUTTER)       */}
      {/* ========================================================================= */}
      {selectedCard && (
        <div
          onClick={() => setSelectedCard(null)}
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/90 p-4 animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative flex flex-col items-center max-w-md w-full text-center"
          >
            {/* Top Close Button */}
            <button
              onClick={() => setSelectedCard(null)}
              className="absolute -top-3 -right-3 z-10 h-9 w-9 rounded-full bg-zinc-800/90 hover:bg-zinc-700 text-zinc-300 hover:text-white flex items-center justify-center border border-zinc-600 shadow-xl cursor-pointer transition"
            >
              <X className="h-5 w-5" />
            </button>

            {/* FULL CARD - Crisp, Large & Unobstructed */}
            <div className="relative group cursor-pointer my-2 flex items-center justify-center">
              <img
                src={selectedCard.imageUrl}
                alt={selectedCard.name}
                onError={(e) => {
                  const img = e.currentTarget as HTMLImageElement;
                  if (img.src.includes('_p1.jpg') || img.src.includes('_p2.jpg')) {
                    img.src = img.src.replace(/_p\d+\.jpg/, '.jpg');
                  } else if (img.src.includes('_p1.png') || img.src.includes('_p2.png')) {
                    img.src = img.src.replace(/_p\d+\.png/, '.png');
                  } else if (selectedCard.artUrl && img.src !== selectedCard.artUrl) {
                    img.src = selectedCard.artUrl;
                  } else if (selectedCard.fallbackUrl && img.src !== selectedCard.fallbackUrl) {
                    img.src = selectedCard.fallbackUrl;
                  }
                }}
                className="max-h-[68vh] w-auto object-contain rounded-2xl drop-shadow-[0_25px_60px_rgba(0,0,0,0.95)] hover:scale-[1.02] transition-transform duration-300"
              />
            </div>

            {/* Clean Info & Actions below card */}
            <div className="w-full max-w-sm mt-3 px-2">
              <h3 className="text-xl font-black text-white drop-shadow">
                {selectedCard.name}
              </h3>
              <p className="text-xs text-zinc-400 font-semibold mt-0.5">
                {selectedCard.setName} · {selectedCard.setNumber} {selectedCard.raritySymbol && `· ${selectedCard.raritySymbol}`}
              </p>

              {/* Price & Quantity Badge */}
              <div className="my-3 py-2 px-4 rounded-xl bg-zinc-900/90 border border-zinc-700/70 flex items-center justify-between text-xs font-bold shadow-lg">
                <span className="text-zinc-400">Giá Thị Trường (TCG):</span>
                <span className="font-black text-emerald-400 text-base">
                  ${selectedCard.marketPrice.toFixed(2)}
                </span>
                <span className="text-zinc-500">|</span>
                <span className="text-amber-400">
                  {collectedCardIds[selectedCard.id] || 0} thẻ trong sổ
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2.5">
                {onCardKeptInShowcase && (
                  <button
                    onClick={() => {
                      soundManager.playSelectSound();
                      onCardKeptInShowcase(selectedCard, Math.round(selectedCard.marketPrice * 1.15));
                      setSelectedCard(null);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 py-3 font-black text-black hover:from-amber-400 hover:to-amber-500 shadow-lg cursor-pointer text-xs uppercase tracking-wide transition"
                  >
                    <Store className="h-4 w-4" />
                    <span>Đưa Lên Bàn Bán</span>
                  </button>
                )}
                <button
                  onClick={() => setSelectedCard(null)}
                  className="flex-1 rounded-xl bg-zinc-800/90 border border-zinc-700 py-3 font-bold text-white hover:bg-zinc-700 cursor-pointer text-xs transition"
                >
                  Đóng (ESC)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
