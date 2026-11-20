import React, { useState, useEffect } from 'react';
import {
  X,
  DollarSign,
  Store,
  BookOpen,
  Package,
  CheckCircle2,
  Crown,
  ShieldCheck,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  PokemonCard,
  GameStopMysteryBoxResult,
} from '../game/pokemonShopLogic';
import { GradedSlabCard } from './GradedSlabCard';
import { soundManager } from '../game/audio';

interface GameStopMysteryModalProps {
  result: GameStopMysteryBoxResult;
  onCardKeptInShowcase: (card: PokemonCard, price: number) => void;
  onCardAddedToBinder: (card: PokemonCard) => void;
  onCardQuickSold: (card: PokemonCard, cashReceived: number) => void;
  onClose: () => void;
}

export const GameStopMysteryModal: React.FC<GameStopMysteryModalProps> = ({
  result,
  onCardKeptInShowcase,
  onCardAddedToBinder,
  onCardQuickSold,
  onClose,
}) => {
  const [isOpened, setIsOpened] = useState(false);
  const [slabActionTaken, setSlabActionTaken] = useState<'showcase' | 'binder' | 'sold' | null>(null);

  useEffect(() => {
    soundManager.playBoxOpen();
  }, []);

  const handleOpenBox = () => {
    soundManager.playFoilCrinkle();
    setIsOpened(true);

    try {
      confetti({
        particleCount: 100,
        spread: 100,
        origin: { y: 0.6 },
        colors: ['#e51b24', '#facc15', '#ffffff', '#38bdf8', '#a855f7'],
      });
    } catch {
      // Confetti fallback
    }
  };

  const slab = result.slab;
  const slabCard = result.slabCard;

  const handleShowcase = () => {
    soundManager.playCardFlip();
    setSlabActionTaken('showcase');
    onCardKeptInShowcase(slabCard, result.slabMarketValue);
  };

  const handleBinder = () => {
    soundManager.playCardFlip();
    setSlabActionTaken('binder');
    onCardAddedToBinder(slabCard);
  };

  const handleQuickSell = () => {
    soundManager.playCashRegister();
    setSlabActionTaken('sold');
    onCardQuickSold(slabCard, result.slabMarketValue);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/92 p-2.5 sm:p-4 animate-in fade-in duration-200 select-none overflow-hidden">
      <div className="relative w-full max-w-lg rounded-3xl border border-amber-500/60 bg-[#040814] p-3 sm:p-4 flex flex-col items-center justify-between text-center shadow-[0_0_90px_rgba(245,158,11,0.4)] overflow-hidden my-auto">
        {/* Background Ambient Radial Glow & Rotating Golden/Crimson Rays (Exact Ảnh 2 Style) */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(229,27,36,0.25)_0%,rgba(245,158,11,0.18)_40%,transparent_70%)]" />
        <div className="pointer-events-none absolute -inset-32 bg-[conic-gradient(from_0deg,transparent_0deg,rgba(245,158,11,0.18)_30deg,transparent_60deg,rgba(239,68,68,0.18)_90deg,transparent_120deg,rgba(245,158,11,0.18)_150deg,transparent_180deg,rgba(239,68,68,0.18)_210deg,transparent_240deg,rgba(245,158,11,0.18)_270deg,transparent_300deg,rgba(245,158,11,0.18)_330deg,transparent_360deg)] animate-[spin_30s_linear_infinite]" />

        {/* Ultra-Compact Top Bar: GAMESTOP GOLD • 100% GRADED 10 HIT + Close (✕) */}
        <div className="relative w-full flex items-center justify-between border-b border-zinc-800/60 pb-1.5 mb-1.5 px-1">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-black tracking-[0.25em] text-[#d4af37] uppercase">
              GAMESTOP GOLD
            </span>
            <span className="text-zinc-600">•</span>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#0b162c] border border-[#1e3a6a] text-[10px] font-black text-white">
              <div className="h-2.5 w-2.5 rounded-xs bg-gradient-to-tr from-amber-400 via-rose-500 to-cyan-400 flex items-center justify-center text-[7px] text-black font-black">
                ◆
              </div>
              <span className="tracking-wider text-amber-300">100% GRADED 10 HIT</span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-800 cursor-pointer transition-colors"
            title="Đóng [ESC]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ========================================================================= */}
        {/* STAGE 1: SEALED GAMESTOP MYSTERY BOX (Auto-fit Screen Ratio, No Overflow) */}
        {/* ========================================================================= */}
        {!isOpened ? (
          <div className="relative my-auto flex flex-col items-center justify-center py-2 sm:py-3 w-full">
            <div className="flex items-center gap-2 mb-2">
              <img
                src="/boxes/gamestop_gamestopLogo.png"
                alt="GameStop"
                className="h-6 sm:h-7 w-auto object-contain"
              />
            </div>

            <div
              className="relative group cursor-pointer my-1.5 transition-transform duration-300 hover:scale-105"
              onClick={handleOpenBox}
            >
              <div className="absolute inset-0 bg-red-600/35 blur-3xl rounded-full -z-10 animate-pulse" />
              <img
                src={
                  result.boxId === 'gamestop_mystery_charizard'
                    ? '/boxes/gamestop_box2.png'
                    : result.boxId === 'gamestop_mystery_black'
                    ? '/boxes/gamestop_box3.png'
                    : '/boxes/gamestop_box1.png'
                }
                alt={result.boxName}
                className="max-h-[30vh] sm:max-h-[34vh] w-auto object-contain drop-shadow-[0_25px_45px_rgba(0,0,0,0.95)]"
              />
            </div>

            <div className="text-xs sm:text-sm font-black text-amber-300 uppercase tracking-wider mt-1.5 mb-3 flex items-center gap-1.5">
              <Crown className="h-4 w-4 text-amber-400" />
              <span>Cam kết 1 Slab Graded 10 (PSA / CGC) + 2 Booster Packs</span>
            </div>

            <button
              onClick={handleOpenBox}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 px-7 sm:px-8 py-2.5 sm:py-3 font-extrabold text-xs sm:text-sm tracking-wider uppercase text-zinc-950 hover:from-amber-300 hover:to-amber-400 cursor-pointer shadow-[0_4px_20px_rgba(245,158,11,0.35)] hover:shadow-[0_6px_28px_rgba(245,158,11,0.5)] border border-amber-200/50 transition-all duration-200 hover:scale-[1.02] active:scale-95"
            >
              <Package className="h-4 w-4 text-zinc-950 shrink-0" />
              <span>MỞ HỘP GAMESTOP BÍ ẨN</span>
            </button>
          </div>
        ) : (
          /* ========================================================================= */
          /* STAGE 2: REVEAL SLAB & DETAILS (Auto-scales with Player Screen Ratio)     */
          /* ========================================================================= */
          <div className="relative flex flex-col items-center justify-center my-auto w-full animate-in zoom-in-95 duration-200 min-h-0">
            {/* Centered Graded Slab - Responsive auto-height, perfectly hugging card */}
            <div className="relative flex items-center justify-center w-full py-0.5 min-h-0">
              <GradedSlabCard
                card={slabCard}
                slab={slab}
                cardHeightStyle="clamp(160px, 26vh, 280px)"
              />
            </div>

            {/* Bonus Packs Compact Tag (2 Packs đi kèm) */}
            <div className="relative z-10 flex items-center justify-center gap-1.5 sm:gap-2 mt-1 px-2.5 py-0.5 sm:py-1 rounded-xl bg-[#0b162c] border border-[#1e3a6a] text-zinc-200 max-w-sm w-full shadow-xs">
              <span className="text-[10px] sm:text-[11px] font-bold text-amber-300 flex items-center gap-1 shrink-0">
                <Package className="h-3 w-3 text-red-400" />
                2 Packs Tặng Kèm:
              </span>
              <div className="flex items-center gap-1.5 truncate">
                {result.packs.map((p, i) => (
                  <span
                    key={i}
                    className="px-1.5 py-0.5 rounded-md bg-zinc-900 border border-zinc-700 text-[9px] sm:text-[10px] font-bold text-zinc-300 truncate"
                  >
                    {p.setName}
                  </span>
                ))}
              </div>
              <span className="text-[9px] sm:text-[10px] font-bold text-emerald-400 shrink-0">✓ Đã vào kho</span>
            </div>

            {/* Card Name, Bold Value & Grade Badges (Exact Proportions) */}
            <div className="relative mt-1 text-center w-full max-w-md">
              <div className="text-sm sm:text-base font-black text-white tracking-wide truncate">
                {slabCard.name}
              </div>
              <div className="flex items-center justify-center gap-2 mt-0.5 flex-wrap">
                <div className="text-2xl sm:text-3xl font-black text-amber-300 font-sans tracking-tight drop-shadow-[0_2px_15px_rgba(245,158,11,0.5)]">
                  ${result.slabMarketValue.toLocaleString()}
                </div>
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#0f1b33] border border-[#facc15] text-[#facc15] shadow-[0_0_15px_rgba(250,204,21,0.25)] text-[10px] sm:text-xs font-black">
                  <span>100% Graded 10</span>
                </div>
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-950/80 border border-emerald-400/60 text-emerald-300 text-[10px] sm:text-[11px] font-black">
                  <span>
                    {slab.company} {slab.grade} · {slab.gradeLabel || 'GEM MINT'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* COMPACT ACTIONS AREA (Responsive & Never Overflowing)                      */}
        {/* ========================================================================= */}
        {isOpened && (
          <div className="relative space-y-1.5 mt-1.5 pt-1.5 border-t border-zinc-800/80 w-full max-w-md">
            {slabActionTaken === null ? (
              <>
                {/* Upper Primary Action Button: Trưng Bày Bán Trên Bàn */}
                <button
                  onClick={handleShowcase}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 py-2.5 font-black text-xs sm:text-sm text-black hover:from-amber-300 hover:to-amber-400 cursor-pointer shadow-lg transition-transform hover:scale-[1.01] active:scale-95"
                >
                  <Store className="h-4 w-4" />
                  <span>
                    ⭐ Giữ Lại Trưng Bày Bán Trên Bàn ($
                    {Math.round(result.slabMarketValue * 1.2).toLocaleString()})
                  </span>
                </button>

                {/* Lower 2 Split Buttons: Binder & Bán Nhanh */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handleBinder}
                    className="flex items-center justify-center gap-1.5 rounded-xl bg-[#0b162c] border border-[#1e3a6a] py-2 font-bold text-xs sm:text-sm text-sky-400 hover:bg-[#132446] hover:text-white cursor-pointer transition-colors"
                  >
                    <BookOpen className="h-4 w-4" />
                    <span>Cất Vào Sổ Binder</span>
                  </button>

                  <button
                    onClick={handleQuickSell}
                    className="flex items-center justify-center gap-1.5 rounded-xl bg-[#051c14] border border-emerald-800/60 py-2 font-bold text-xs sm:text-sm text-emerald-400 hover:bg-[#0a2e22] hover:text-white cursor-pointer transition-colors"
                  >
                    <DollarSign className="h-4 w-4" />
                    <span>Bán Lấy Tiền Mặt</span>
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2 text-xs sm:text-sm text-emerald-400 font-bold py-2.5 bg-emerald-950/80 px-4 rounded-xl border border-emerald-500/50 w-full justify-center">
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                <span>
                  {slabActionTaken === 'showcase' && 'Đã đặt lên bàn trưng bày bán cho khách!'}
                  {slabActionTaken === 'binder' && 'Đã cất an toàn vào binder sưu tập!'}
                  {slabActionTaken === 'sold' && `Đã bán nhanh nhận: +$${result.slabMarketValue.toLocaleString()}`}
                </span>
              </div>
            )}

            {/* Bottom Status / Footer Line (Exact Ảnh 2) */}
            <div className="flex items-center justify-between text-[10px] text-zinc-500 font-medium px-1 pt-0.5">
              <span className="flex items-center gap-1 text-zinc-400">
                <ShieldCheck className="h-3 w-3 text-emerald-400" />
                Cam kết thẻ chính hãng 100% PSA / CGC
              </span>
              <button
                onClick={onClose}
                className="text-zinc-500 hover:text-zinc-300 transition cursor-pointer"
              >
                Đóng [ESC]
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
