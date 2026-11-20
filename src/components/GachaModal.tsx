import React, { useState } from 'react';
import {
  X,
  Sparkles,
  DollarSign,
  ShieldCheck,
  TrendingUp,
  Award,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Zap,
  Flame,
  CheckCircle2,
  Crown,
  Trophy,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  GACHA_PACK_TIERS,
  GachaPackInfo,
  GachaPullResult,
  GradedSlab,
  rollGachaPack,
  PokemonCard,
  ShopState,
  getCardHoloClass,
} from '../game/pokemonShopLogic';
import { soundManager } from '../game/audio';
import { GradedSlabCard } from './GradedSlabCard';

interface GachaModalProps {
  shopState: ShopState;
  onDeductCash: (amount: number) => void;
  onAddCash: (amount: number) => void;
  onOpenPackFromShelf?: (tierId: string) => void;
  onCardKeptInShowcase: (
    card: PokemonCard,
    price: number,
    slabMeta?: { isSlab?: boolean; slab?: GradedSlab }
  ) => void;
  onCardAddedToBinder: (card: PokemonCard) => void;
  onClose: () => void;
}

export const GachaModal: React.FC<GachaModalProps> = ({
  shopState,
  onDeductCash,
  onAddCash,
  onOpenPackFromShelf,
  onCardKeptInShowcase,
  onCardAddedToBinder,
  onClose,
}) => {
  const packList = Object.values(GACHA_PACK_TIERS);
  const [selectedPackIndex, setSelectedPackIndex] = useState<number>(0);
  const [stage, setStage] = useState<'selecting' | 'spinning' | 'revealed'>('selecting');
  const [pullResult, setPullResult] = useState<GachaPullResult | null>(null);
  const [claimedAction, setClaimedAction] = useState<string | null>(null);

  const currentPack = packList[selectedPackIndex];
  const currentInvItem = shopState.inventory.find(
    (i) => i.productId === `gacha_${currentPack.id}` || i.productId === currentPack.id
  );
  const stockOnShelf = currentInvItem ? Math.max(0, currentInvItem.shelvedQuantity || 0) : 0;
  const hasStockOnShelf = stockOnShelf > 0;

  // Execute roll from shelf stock
  const handleStartRoll = () => {
    if (!hasStockOnShelf) {
      soundManager.playWrongBuzzer();
      alert(`Gói ${currentPack.name} hiện chưa có trên kệ Gondola! Hãy mở Tablet (phím TAB) -> Supply để đặt hàng và bưng lên kệ trước.`);
      return;
    }

    soundManager.playSelectSound();
    soundManager.playFoilCrinkle();
    onOpenPackFromShelf?.(currentPack.id);

    setStage('spinning');
    setClaimedAction(null);

    // Roll result
    const result = rollGachaPack(currentPack.id);
    setPullResult(result);

    setTimeout(() => {
      soundManager.playPackTear();
      if (result.isJackpot || result.multiplier >= 2.0) {
        soundManager.playRarePullFanfare();
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.55 },
        });
      } else {
        soundManager.playCardFlip();
      }
      setStage('revealed');
    }, 1800);
  };

  // Actions on pulled item
  const handleKeepInBinder = () => {
    if (!pullResult || claimedAction) return;
    soundManager.playSelectSound();
    onCardAddedToBinder(pullResult.card);
    setClaimedAction('Đã cất vào Sổ Sưu Tập Master Set!');
  };

  const handlePutInShowcase = () => {
    if (!pullResult || claimedAction) return;
    soundManager.playSelectSound();
    onCardKeptInShowcase(pullResult.card, Math.round(pullResult.payoutValue * 1.15), {
      isSlab: pullResult.isSlab,
      slab: pullResult.slab,
    });
    setClaimedAction('Đã tự động đưa lên Bàn / Kệ Trưng Bày!');
  };

  const handleQuickSell = () => {
    if (!pullResult || claimedAction) return;
    soundManager.playCashRegister();
    onAddCash(pullResult.payoutValue);
    setClaimedAction(`Đã bán nhanh nhận về $${pullResult.payoutValue.toFixed(2)} tiền mặt!`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-2 sm:p-4 select-none animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl rounded-[32px] bg-gradient-to-b from-zinc-950 via-[#0d1527] to-zinc-950 border-4 border-indigo-500/50 p-4 sm:p-6 shadow-[0_25px_80px_rgba(0,0,0,0.95)] text-white flex flex-col justify-between overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-cyan-400 flex items-center justify-center text-white font-black text-xl shadow-lg">
              🎲
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-indigo-300 to-pink-300 uppercase tracking-wide">
                  Pack Gacha Hên Xui Đẳng Cấp TCG
                </h3>
                <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-black text-emerald-400 border border-emerald-500/40">
                  Bảo Hiểm Lỗ Tối Đa 50%
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                8 hạng gói từ Gói Bạc ($20) đến Chén Thánh ($5,000)! Càng lên cao càng nhiều Slab PSA/BGS/CGC!
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-black/60 border border-emerald-500/50">
              <span className="text-xs text-zinc-400">Quỹ tiệm:</span>
              <span className="text-base font-black text-emerald-400 font-mono">
                ${shopState.cash.toFixed(2)}
              </span>
            </div>

            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* STAGE 1: TIER SELECTOR & PACK PREVIEW                                     */}
        {/* ========================================================================= */}
        {stage === 'selecting' && (
          <div className="my-4 flex flex-col md:flex-row items-center gap-6">
            {/* Left: Pack 3D Art Preview Card */}
            <div className="w-full md:w-80 flex flex-col items-center justify-center shrink-0">
              <div
                className="relative w-64 h-80 rounded-2xl p-4 flex flex-col items-center justify-between border-2 shadow-2xl transition transform hover:scale-102"
                style={{
                  borderColor: currentPack.themeColor,
                  background: `radial-gradient(circle at 50% 30%, ${currentPack.themeColor}33 0%, #09090b 80%)`,
                }}
              >
                {/* Pack Image provided by user */}
                <div className="relative h-48 w-full flex items-center justify-center">
                  <img
                    src={currentPack.imageUrl}
                    alt={currentPack.name}
                    className="max-h-full max-w-full object-contain drop-shadow-[0_15px_30px_rgba(0,0,0,0.9)] animate-pulse"
                  />
                  <span
                    className="absolute top-0 right-0 px-2 py-0.5 rounded text-[10px] font-black uppercase text-black"
                    style={{ backgroundColor: currentPack.accentColor }}
                  >
                    Rank #{currentPack.rank}
                  </span>
                </div>

                <div className="text-center w-full">
                  <div className="text-lg font-black text-white">{currentPack.name}</div>
                  <div className="text-xs font-bold text-zinc-400">{currentPack.vietnameseName}</div>
                  <div className="mt-1 text-2xl font-black font-mono" style={{ color: currentPack.accentColor }}>
                    ${currentPack.price.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Floor Guarantee Badge (Tối thiểu hoàn 50%) */}
              <div className="mt-3 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs font-bold">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                <span>Hoàn tiền tối thiểu: ${currentPack.floorPrice.toLocaleString()} (50%)</span>
              </div>
            </div>

            {/* Right: Tier Carousel Grid & Info */}
            <div className="flex-1 w-full space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                  Chọn Hạng Gói Gacha (8 Cấp Độ):
                </span>
                <span className="text-xs font-bold text-amber-300">
                  Jackpot tối đa: ${currentPack.topJackpot.toLocaleString()}
                </span>
              </div>

              {/* 8 Tiers Horizontal Scrollable Shelf */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {packList.map((p, idx) => {
                  const isSelected = selectedPackIndex === idx;
                  const inv = shopState.inventory.find(
                    (i) => i.productId === `gacha_${p.id}` || i.productId === p.id
                  );
                  const qty = inv ? Math.max(0, inv.shelvedQuantity || 0) : 0;
                  const inStock = qty > 0;

                  return (
                    <div
                      key={p.id}
                      onClick={() => {
                        soundManager.playSelectSound();
                        setSelectedPackIndex(idx);
                      }}
                      className={`p-2.5 rounded-xl border-2 transition cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'border-cyan-400 bg-cyan-950/40 shadow-lg scale-102 ring-2 ring-cyan-400/30'
                          : inStock
                          ? 'border-zinc-800 bg-zinc-900/80 hover:border-zinc-600'
                          : 'border-zinc-800/60 bg-zinc-950/60 opacity-60'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-black text-zinc-400">#{p.rank}</span>
                        {inStock ? (
                          <span className="text-[10px] font-black text-emerald-400 bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-500/40">
                            Kệ: {qty}
                          </span>
                        ) : (
                          <span className="text-[9px] font-bold text-zinc-500 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">
                            Hết (0)
                          </span>
                        )}
                      </div>

                      <div className="h-14 w-full flex items-center justify-center my-1">
                        <img src={p.imageUrl} alt={p.name} className={`h-full object-contain ${!inStock ? 'grayscale opacity-60' : ''}`} />
                      </div>

                      <div className="text-[11px] font-extrabold text-white truncate text-center mt-1">
                        {p.name}
                      </div>
                      <div className="text-[10px] font-black text-cyan-300 text-center">
                        ${p.price.toLocaleString()}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pack Detail Box */}
              <div className="p-3.5 rounded-2xl bg-black/40 border border-zinc-800 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-300">{currentPack.description}</span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-zinc-400">Số lượng trên kệ:</span>
                    <span className={`font-mono font-black px-2 py-0.5 rounded text-xs ${hasStockOnShelf ? 'text-emerald-400 bg-emerald-950/80 border border-emerald-500/40' : 'text-rose-400 bg-rose-950/80 border border-rose-500/40'}`}>
                      {stockOnShelf} gói
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-zinc-400 pt-1 border-t border-zinc-800">
                  <div>
                    Tỉ lệ Slab PSA/CGC:{' '}
                    <span className="font-bold text-cyan-300">
                      0.5% Grade 10 (×4-5) · 5% Grade 9 (+30-40%) · 10% Grade 8 (=Raw)
                    </span>
                  </div>
                  <div>
                    Mức lỗ tối đa:{' '}
                    <span className="font-bold text-emerald-400">Chỉ 50% vốn</span>
                  </div>
                </div>
              </div>

              {/* Roll CTA Button */}
              <div className="pt-2">
                <button
                  onClick={handleStartRoll}
                  disabled={!hasStockOnShelf}
                  className={`w-full py-4 rounded-2xl font-black text-sm sm:text-base flex items-center justify-center gap-2 shadow-2xl transition cursor-pointer uppercase tracking-wider ${
                    hasStockOnShelf
                      ? 'bg-gradient-to-r from-amber-400 via-orange-500 to-pink-500 text-white hover:from-amber-300 hover:to-pink-400 active:scale-98 shadow-[0_0_30px_rgba(245,158,11,0.4)]'
                      : 'bg-zinc-800/80 text-zinc-500 border border-zinc-700/50 cursor-not-allowed'
                  }`}
                >
                  <Sparkles className="h-5 w-5" />
                  <span>
                    {hasStockOnShelf
                      ? `XÉ 1 GÓI TRÊN KỆ GONDOLA (CÒN ${stockOnShelf} GÓI)`
                      : `HẾT HÀNG TRÊN KỆ · HÃY ORDER QUA TABLET & XẾP LÊN KỆ`}
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STAGE 2: ROLLING / SPINNING SUSPENSE ANIMATION                           */}
        {/* ========================================================================= */}
        {stage === 'spinning' && (
          <div className="py-20 flex flex-col items-center justify-center space-y-6 text-center animate-pulse">
            <div className="relative">
              <div className="h-40 w-40 rounded-full border-4 border-dashed border-cyan-400 animate-spin flex items-center justify-center" />
              <div className="absolute inset-0 flex items-center justify-center text-4xl">
                🎲
              </div>
            </div>

            <div>
              <h3 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-200 to-pink-300 uppercase tracking-widest">
                ĐANG QUAY GACHA VÀ XÁC ĐỊNH LÁ BÀI...
              </h3>
              <p className="text-xs text-zinc-400 mt-1">
                Thuật toán bảo hiểm đảm bảo giá trị thẻ bài tối thiểu ${currentPack.floorPrice.toLocaleString()}!
              </p>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STAGE 3: REVEAL VIEW (AUTHENTIC GRADED SLAB OR RAW MINT CARD)             */}
        {/* ========================================================================= */}
        {stage === 'revealed' && pullResult && (
          <div className="my-2 flex flex-col items-center text-center space-y-4 animate-in zoom-in-95 duration-300">
            {/* Outcome Result Header */}
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-black/60 border text-xs font-black uppercase mb-1">
                {pullResult.isJackpot ? (
                  <span className="text-amber-300 flex items-center gap-1">
                    <Crown className="h-4 w-4" /> NỔ HŨ JACKPOT ĐỈNH CAO!
                  </span>
                ) : pullResult.multiplier >= 1.0 ? (
                  <span className="text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="h-4 w-4" /> CÓ LÃI (+{Math.round((pullResult.multiplier - 1) * 100)}%)!
                  </span>
                ) : (
                  <span className="text-zinc-300">BẢO HIỂM HOÀN TIỀN 50% AN TOÀN</span>
                )}
              </div>

              <div className="text-3xl sm:text-4xl font-black text-white font-mono">
                ${pullResult.payoutValue.toLocaleString()}
              </div>
              <div className="text-xs text-zinc-400">
                Gói {pullResult.packName} (${currentPack.price.toLocaleString()}) → Hệ số:{' '}
                <span className="font-black text-amber-300">{pullResult.multiplier.toFixed(2)}x</span>
                {pullResult.isSlab && pullResult.slab && (
                  <span className="ml-2 text-cyan-300 font-bold">
                    • {pullResult.slab.company} {pullResult.slab.grade} (Raw ${pullResult.rawPrice.toLocaleString()} × {pullResult.gradeMultiplier.toFixed(2)})
                  </span>
                )}
              </div>
            </div>

            {/* THE CARD OR GRADED SLAB DISPLAY */}
            <div className="relative flex items-center justify-center w-full">
              {pullResult.isSlab && pullResult.slab ? (
                <GradedSlabCard
                  card={pullResult.card}
                  slab={pullResult.slab}
                  cardHeightStyle="clamp(160px, 26vh, 280px)"
                />
              ) : (
                /* RAW CARD DISPLAY */
                <div
                  className={`relative w-56 sm:w-64 aspect-[63/88] rounded-2xl p-1.5 shadow-[0_25px_60px_rgba(0,0,0,0.95)] flex items-center justify-center ${
                    getCardHoloClass(pullResult.card.marketPrice, pullResult.card.hasRgbAura)
                  } ${pullResult.card.marketPrice < 5 ? 'border-2 border-white/40' : ''}`}
                >
                  <img
                    src={pullResult.card.imageUrl}
                    alt={pullResult.card.name}
                    className="w-full h-full object-contain rounded-xl"
                  />
                </div>
              )}
            </div>

            {/* Status notice if claimed */}
            {claimedAction && (
              <div className="text-xs font-black text-emerald-400 bg-emerald-950/80 px-4 py-1.5 rounded-full border border-emerald-500/50">
                {claimedAction}
              </div>
            )}

            {/* Action Buttons for Pulled Card */}
            <div className="flex items-center gap-2.5 flex-wrap justify-center pt-2">
              <button
                onClick={handlePutInShowcase}
                disabled={Boolean(claimedAction)}
                className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs cursor-pointer shadow disabled:opacity-50"
              >
                Trưng Bày Bán Kệ Kính (Showcase)
              </button>

              <button
                onClick={handleKeepInBinder}
                disabled={Boolean(claimedAction)}
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs cursor-pointer shadow disabled:opacity-50"
              >
                Cất Vào Sổ Thẻ (Binder)
              </button>

              <button
                onClick={handleQuickSell}
                disabled={Boolean(claimedAction)}
                className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs cursor-pointer shadow disabled:opacity-50"
              >
                Bán Nhanh Lấy ${pullResult.payoutValue.toLocaleString()} Tiền Mặt
              </button>

              <button
                onClick={() => setStage('selecting')}
                className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs cursor-pointer"
              >
                Quay Gói Khác
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="pt-3 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-400">
          <span>Cam kết: Thấp nhất tỉ lệ lỗ chỉ 50% so với số tiền bỏ ra</span>
          <button onClick={onClose} className="hover:text-white font-bold">
            Đóng [ESC]
          </button>
        </div>
      </div>
    </div>
  );
};
