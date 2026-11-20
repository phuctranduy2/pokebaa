import React from 'react';
import { Flame, Sparkles } from 'lucide-react';
import { getBoosterSet, getCardHoloClass } from '../game/pokemonShopLogic';
import { LivePackCardOutcome, OwnedLiveBoosterBox } from '../game/shopExpansionSystems';

export type PackRipAnimStage = 'idle' | 'gripping' | 'tearing' | 'sliding' | 'fanning';

interface LivePovBreakStageProps {
  setId?: string;
  setName?: string;
  ownedBoxes?: OwnedLiveBoosterBox[];
  phase: 'setup' | 'streaming_selling' | 'ripping' | 'summary';
  packAnimStage: PackRipAnimStage;
  currentPackOutcomes: LivePackCardOutcome[];
  currentPackNum: number;
  packsPerBox: number;
  sealGlintKey: number;
  soldSlotsCount?: number;
  autoStartingRip?: boolean;
  currentPackBuyer?: string;
  currentPackSlotLabel?: string;
  currentPackSlotColor?: string;
  activeShelfCount?: number;
  activeTotalCount?: number;
  onTapStageAction?: () => void;
}

const PovLeftHand: React.FC<{
  pose: 'hold_box' | 'grip_pack' | 'slide_pack' | 'hold_cards' | 'rest';
}> = ({ pose }) => {
  const transformClass =
    pose === 'grip_pack'
      ? 'translate-x-2 -translate-y-4 rotate-[8deg]'
      : pose === 'slide_pack'
      ? 'translate-x-1 -translate-y-7 rotate-[12deg]'
      : pose === 'hold_box'
      ? 'translate-x-0 -translate-y-2 rotate-[4deg]'
      : pose === 'hold_cards'
      ? '-translate-x-3 translate-y-2 rotate-[-7deg]'
      : '-translate-x-6 translate-y-8 rotate-[-12deg]';

  return (
    <svg
      viewBox="0 0 220 220"
      className={`pointer-events-none h-44 w-44 transition-transform duration-300 ease-out drop-shadow-[0_14px_22px_rgba(0,0,0,0.68)] ${transformClass}`}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="skinL" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f5ceb0" />
          <stop offset="52%" stopColor="#e4ac84" />
          <stop offset="100%" stopColor="#bf7d54" />
        </linearGradient>
        <linearGradient id="skinLThumb" x1="0" y1="0" x2="1" y2="0.8">
          <stop offset="0%" stopColor="#fae0cb" />
          <stop offset="65%" stopColor="#e8b48e" />
          <stop offset="100%" stopColor="#c88860" />
        </linearGradient>
        <linearGradient id="sleeveL" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1e293b" />
          <stop offset="100%" stopColor="#090d16" />
        </linearGradient>
      </defs>
      {/* Studio Hoodie Cuff */}
      <path d="M-10,222 L38,144 L98,170 L56,222 Z" fill="url(#sleeveL)" />
      <path d="M38,144 L98,170" stroke="#334155" strokeWidth="2.5" strokeLinecap="round" />
      {/* Palm & Back of Hand */}
      <path
        d="M38,148 C54,118 80,94 110,84 C136,75 158,90 160,114 C162,140 130,166 96,172 Z"
        fill="url(#skinL)"
      />
      {/* Curled Support Fingers */}
      <rect x="118" y="70" width="54" height="19" rx="9.5" transform="rotate(-14 118 70)" fill="url(#skinL)" stroke="#b37048" strokeWidth="1.2" />
      <rect x="124" y="90" width="56" height="19" rx="9.5" transform="rotate(-8 124 90)" fill="url(#skinL)" stroke="#b37048" strokeWidth="1.2" />
      <rect x="120" y="110" width="50" height="18" rx="9" transform="rotate(-2 120 110)" fill="url(#skinL)" stroke="#b37048" strokeWidth="1.2" />
      {/* Knuckle Shading Lines */}
      <path d="M138,72 C140,78 140,81 138,84" stroke="#b5724c" strokeWidth="1.1" opacity="0.55" fill="none" />
      <path d="M144,93 C146,99 146,102 144,105" stroke="#b5724c" strokeWidth="1.1" opacity="0.55" fill="none" />
      {/* Foreground Thumb */}
      <path
        d="M84,96 C108,73 144,72 160,86 C168,94 162,108 146,111 C126,114 103,117 86,121 Z"
        fill="url(#skinLThumb)"
        stroke="#b37048"
        strokeWidth="1.3"
      />
      {/* Knuckle Crease + Thumbnail Gloss */}
      <path d="M124,84 C126,91 126,97 123,102" stroke="#b8764f" strokeWidth="1.2" opacity="0.45" fill="none" />
      <ellipse cx="149" cy="91" rx="8.5" ry="5.5" transform="rotate(-8 149 91)" fill="#fff0e6" opacity="0.9" />
    </svg>
  );
};

const PovRightHand: React.FC<{
  pose: 'hold_box' | 'pinch_tear' | 'pull_tear' | 'slide_cards' | 'fan_grip';
}> = ({ pose }) => {
  const transformClass =
    pose === 'pinch_tear'
      ? '-translate-x-2 -translate-y-12 rotate-[-6deg]'
      : pose === 'pull_tear'
      ? 'translate-x-12 -translate-y-16 rotate-[16deg]'
      : pose === 'slide_cards'
      ? 'translate-x-2 -translate-y-4 rotate-[-8deg]'
      : pose === 'fan_grip'
      ? 'translate-x-1 translate-y-1 rotate-[-4deg]'
      : 'translate-x-0 -translate-y-2 rotate-[-4deg]';

  return (
    <svg
      viewBox="0 0 240 240"
      className={`pointer-events-none h-48 w-48 transition-transform duration-300 ease-out drop-shadow-[0_16px_26px_rgba(0,0,0,0.74)] ${transformClass}`}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="skinR" x1="1" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f8d4b9" />
          <stop offset="54%" stopColor="#e4ac84" />
          <stop offset="100%" stopColor="#be7b52" />
        </linearGradient>
        <linearGradient id="skinRThumb" x1="1" y1="0" x2="0" y2="0.8">
          <stop offset="0%" stopColor="#fce4d2" />
          <stop offset="65%" stopColor="#eab690" />
          <stop offset="100%" stopColor="#c7875e" />
        </linearGradient>
        <linearGradient id="sleeveR" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1e293b" />
          <stop offset="100%" stopColor="#090d16" />
        </linearGradient>
      </defs>
      {/* Wrist Cuff + Silver Watch Edge */}
      <path d="M176,242 L138,164 L200,136 L246,242 Z" fill="url(#sleeveR)" />
      <path d="M138,164 L200,136" stroke="#334155" strokeWidth="2.5" strokeLinecap="round" />
      <rect x="150" y="148" width="44" height="7" rx="3" transform="rotate(-24 150 148)" fill="#94a3b8" opacity="0.55" />
      {/* Hand Palm */}
      <path
        d="M196,140 C178,106 148,84 114,82 C88,80 68,100 70,125 C72,152 106,170 142,166 Z"
        fill="url(#skinR)"
      />
      {/* Curled Fingers Behind Pack / Toploaders */}
      <rect x="44" y="88" width="56" height="20" rx="10" transform="rotate(14 44 88)" fill="url(#skinR)" stroke="#b37048" strokeWidth="1.2" />
      <rect x="40" y="110" width="58" height="20" rx="10" transform="rotate(8 40 110)" fill="url(#skinR)" stroke="#b37048" strokeWidth="1.2" />
      <rect x="52" y="132" width="52" height="19" rx="9.5" transform="rotate(4 52 132)" fill="url(#skinR)" stroke="#b37048" strokeWidth="1.2" />
      {/* Foreground Thumb Gripping Corner */}
      <path
        d="M142,110 C116,84 74,77 50,90 C40,96 42,112 58,118 C82,126 110,130 132,135 Z"
        fill="url(#skinRThumb)"
        stroke="#b37048"
        strokeWidth="1.4"
      />
      {/* Thumb Knuckle Line & Glossy Nail */}
      <path d="M96,90 C94,97 95,104 98,109" stroke="#b5724c" strokeWidth="1.2" opacity="0.45" fill="none" />
      <ellipse cx="58" cy="98" rx="9" ry="5.5" transform="rotate(14 58 98)" fill="#fff2ea" opacity="0.92" />
    </svg>
  );
};

export const LivePovBreakStage: React.FC<LivePovBreakStageProps> = ({
  setId,
  setName,
  ownedBoxes = [],
  phase,
  packAnimStage,
  currentPackOutcomes,
  currentPackNum,
  packsPerBox,
  sealGlintKey,
  soldSlotsCount = 0,
  autoStartingRip = false,
  currentPackBuyer,
  currentPackSlotLabel,
  currentPackSlotColor,
  activeShelfCount,
  activeTotalCount,
  onTapStageAction,
}) => {
  // Strictly resolve ONLY when a real owned/active setId exists — never fallback to unowned catalog sets
  const setInfo = setId ? getBoosterSet(setId) : null;
  const shelfBoxes = React.useMemo(() => {
    return ownedBoxes.slice(0, 6).map((b) => getBoosterSet(b.setId));
  }, [ownedBoxes]);

  // Sort cards so rarest / hits fan prominently in front (matching real TikTok break showcase)
  const fannedCards = React.useMemo(() => {
    if (currentPackOutcomes.length === 0) return [];
    const sorted = [...currentPackOutcomes].sort(
      (a, b) => (b.card.marketPrice || 0) - (a.card.marketPrice || 0)
    );
    return sorted.slice(0, 3);
  }, [currentPackOutcomes]);

  const packHasHit = React.useMemo(
    () => currentPackOutcomes.some((c) => c.isHit),
    [currentPackOutcomes]
  );

  const showFan =
    phase === 'ripping' &&
    (packAnimStage === 'fanning' || (packAnimStage === 'idle' && currentPackNum > 0)) &&
    fannedCards.length > 0;
  const showPackInHands =
    Boolean(setInfo) &&
    phase === 'ripping' &&
    (packAnimStage === 'gripping' || packAnimStage === 'tearing');
  const showSlidingCards =
    Boolean(setInfo) &&
    phase === 'ripping' &&
    packAnimStage === 'sliding' &&
    fannedCards.length > 0;

  return (
    <div
      onClick={onTapStageAction}
      className={`pointer-events-auto absolute inset-0 overflow-hidden select-none ${
        phase === 'ripping' ? 'cursor-pointer' : ''
      }`}
    >
      {/* 1. BLURRED CARD SHOP SHELVES & SLABS BOKEH WALL (TOP 62%) */}
      <div className="absolute inset-x-0 top-0 h-[62%] bg-gradient-to-b from-[#d8e3f0] via-[#b8c6d8] to-[#8f9eb3] overflow-hidden">
        {/* Top studio LED Ring Light wash */}
        <div className="absolute inset-x-0 -top-10 h-44 bg-[radial-gradient(ellipse_at_50%_20%,rgba(255,255,255,0.92),transparent_72%)]" />

        {/* Back wall Booster Boxes display row — strictly ONLY sets currently stocked in shop */}
        {shelfBoxes.length > 0 && (
          <div className="absolute inset-x-0 top-11 flex items-end justify-center gap-2 px-2 blur-[2.5px] opacity-90">
            {shelfBoxes.map((b, idx) => (
              <div
                key={`${b.id}_${idx}`}
                className="h-24 w-16 rounded-md bg-white/80 p-1 shadow-md border border-white/60 shrink-0"
              >
                <img
                  src={b.boxImageUrl}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-contain"
                />
              </div>
            ))}
          </div>
        )}

        {/* Mid shelf Graded Slabs / Backlit backdrop */}
        <div className="absolute inset-x-6 top-36 flex items-end justify-center gap-4 blur-[1.8px] opacity-85">
          {shelfBoxes.length > 0 ? (
            shelfBoxes.slice(0, 3).map((box, slotIdx) => (
              <div
                key={`${box.id}_slab_${slotIdx}`}
                className="flex h-20 w-14 flex-col items-center rounded border-2 border-zinc-300/80 bg-zinc-900/90 p-1 shadow-lg"
              >
                <div className="h-2 w-full rounded-xs bg-red-600/80 mb-0.5" />
                <img
                  src={box.packImageUrl}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover rounded-xs"
                />
              </div>
            ))
          ) : (
            <div className="h-16 w-48 rounded-lg border border-white/30 bg-white/15 backdrop-blur-xs" />
          )}
        </div>
      </div>

      {/* 2. WOODEN BREAK TABLE + PLAYMAT FOREGROUND (BOTTOM 42%) */}
      <div className="absolute inset-x-0 bottom-0 h-[42%] bg-gradient-to-b from-[#6e472b] via-[#53331d] to-[#341f11] border-t-2 border-[#8c5d3a]">
        <div className="absolute inset-0 opacity-20 bg-[repeating-linear-gradient(178deg,transparent,transparent_14px,rgba(0,0,0,0.35)_14px,rgba(0,0,0,0.35)_16px)]" />
        <div className="mx-auto mt-2 h-24 w-[86%] rounded-xl border border-white/30 bg-gradient-to-r from-sky-200/35 via-rose-200/35 to-amber-200/35 backdrop-blur-xs shadow-inner" />
      </div>

      {/* Live Pack + Box + Buyer Order HUD during ripping (tucked cleanly above center hands) */}
      {phase === 'ripping' && currentPackNum > 0 && (
        <div className="pointer-events-none absolute inset-x-0 top-14 z-20 flex flex-col items-center gap-1 px-3">
          <div className="flex items-center gap-1.5 rounded-full bg-black/75 px-3 py-1 text-[10px] font-black text-white shadow-md backdrop-blur-sm tabular-nums max-w-full">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse shrink-0" />
            <span className="truncate">
              Pack #{currentPackNum}/{packsPerBox} · {setName || setInfo?.name}
            </span>
            {packAnimStage === 'tearing' && (
              <span className="text-amber-300 shrink-0">· Xé seal</span>
            )}
            {packAnimStage === 'sliding' && (
              <span className="text-sky-300 shrink-0">· Rút bài</span>
            )}
            {packAnimStage === 'fanning' && packHasHit && (
              <span className="text-amber-300 shrink-0">· NỔ HIT!</span>
            )}
          </div>
          <div className="flex items-center gap-1.5 rounded-full border border-white/15 bg-black/75 px-3 py-0.5 text-[10px] font-bold text-white shadow backdrop-blur-sm">
            {currentPackSlotColor && (
              <span
                className="h-2 w-2 rounded-full shrink-0"
                style={{ backgroundColor: currentPackSlotColor }}
              />
            )}
            {currentPackBuyer ? (
              <span className="text-emerald-300">
                Unbox cho: <strong className="text-white">{currentPackBuyer}</strong>
                {currentPackSlotLabel ? ` (${currentPackSlotLabel})` : ''}
              </span>
            ) : (
              <span className="text-zinc-300">
                Shop tự khui{currentPackSlotLabel ? ` (${currentPackSlotLabel} trống)` : ''}
              </span>
            )}
          </div>
        </div>
      )}

      {/* 3. CENTER CAMERA STAGE: HANDS + SEALED BOX / TEARING PACK / SLIDING STACK / FANNED TOPLOADERS */}
      <div className="absolute inset-x-0 top-[14%] bottom-[26%] flex items-center justify-center">
        {/* CASE A: SHOWING ONLY OWNED STOCKED BOOSTER BOX */}
        {(phase === 'setup' || phase === 'streaming_selling' || phase === 'summary') && (
          <div className="relative flex flex-col items-center justify-center">
            {setInfo ? (
              <div className="relative z-10 flex items-center gap-2 rounded-2xl border-2 border-white/60 bg-white/15 p-2 shadow-[0_24px_50px_rgba(0,0,0,0.6)] backdrop-blur-xs overflow-hidden">
                <img
                  src={setInfo.boxImageUrl || setInfo.packImageUrl}
                  alt={setName || setInfo.name}
                  referrerPolicy="no-referrer"
                  className="h-40 w-36 object-contain drop-shadow-[0_10px_24px_rgba(0,0,0,0.65)]"
                />
                {sealGlintKey > 0 && (
                  <div
                    key={sealGlintKey}
                    className="pointer-events-none absolute inset-y-0 w-16 bg-gradient-to-r from-transparent via-white/75 to-transparent animate-seal-glint"
                  />
                )}
              </div>
            ) : (
              <div className="relative z-10 flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/40 bg-black/55 px-5 py-6 text-center backdrop-blur-xs">
                <span className="text-xs font-black text-rose-300">Kho Chưa Có Booster Box Sẵn</span>
                <span className="mt-1 text-[10px] text-zinc-300 max-w-[210px]">
                  Chỉ mặt hàng đang có trong kho shop mới được đưa lên live.
                </span>
              </div>
            )}
            <div className="relative z-30 mt-2 rounded-full bg-black/75 px-3 py-1 text-[10px] font-black text-white shadow backdrop-blur-xs tabular-nums text-center max-w-[330px]">
              {!setInfo
                ? 'Đợi nhập Booster Box có sẵn tại Tablet Supply'
                : phase === 'setup' || phase === 'summary'
                ? `Box sẵn: ${setName || setInfo.name} · Kệ: ${activeShelfCount ?? 0} · Tổng: ${activeTotalCount ?? 0}`
                : autoStartingRip
                ? `🔥 Đủ 6/6 khách chốt ${setName || setInfo.name}! Sắp xé seal...`
                : `Box ${setName || setInfo.name} · Chốt ${soldSlotsCount}/6 Slot (Kệ còn: ${activeShelfCount ?? 0})`}
            </div>
            <div className="pointer-events-none absolute -bottom-16 -left-16 z-20">
              <PovLeftHand pose={setInfo ? 'hold_box' : 'rest'} />
            </div>
            <div className="pointer-events-none absolute -bottom-16 -right-16 z-20">
              <PovRightHand pose={setInfo ? 'hold_box' : 'fan_grip'} />
            </div>
          </div>
        )}

        {/* CASE B: BEAT 1 & 2 — REALISTIC CRIMPED FOIL PACK + JAGGED TEAR */}
        {showPackInHands && setInfo && (
          <div className="relative flex items-center justify-center">
            <div
              className={`relative z-10 flex flex-col items-center ${
                packAnimStage === 'tearing' ? 'animate-pack-recoil' : ''
              }`}
            >
              {/* Top Metallic Crimped Foil Strip (peels away dynamically on 'tearing') */}
              <div
                style={{
                  backgroundImage:
                    'repeating-linear-gradient(90deg, rgba(228,228,231,0.95) 0px, rgba(255,255,255,1) 3px, rgba(161,161,170,0.92) 5px)',
                }}
                className={`relative z-30 h-4 w-44 rounded-t-md border-t border-x border-white/80 shadow-md ${
                  packAnimStage === 'tearing' ? 'animate-pack-tear-strip' : ''
                }`}
              >
                <div className="absolute inset-0 bg-gradient-to-b from-white/50 via-transparent to-black/25" />
              </div>

              {/* Exposed Card Top Edges & Golden/Prismatic Rim Glow inside the Torn Pack */}
              {packAnimStage === 'tearing' && (
                <div className="relative z-20 -mt-1.5 flex flex-col items-center">
                  <div
                    className={`h-3 w-40 rounded-t-sm border-t-2 border-x shadow-[0_-6px_22px_rgba(251,191,36,0.95)] ${
                      packHasHit
                        ? 'border-amber-200 bg-gradient-to-r from-amber-300 via-white to-fuchsia-300'
                        : 'border-zinc-200 bg-gradient-to-r from-zinc-100 via-white to-sky-100'
                    }`}
                  />
                  {/* Jagged metallic inner foil tear edge */}
                  <div
                    style={{
                      clipPath:
                        'polygon(0% 100%, 4% 15%, 10% 85%, 16% 20%, 23% 90%, 30% 10%, 38% 85%, 45% 25%, 52% 95%, 60% 18%, 68% 88%, 75% 15%, 83% 90%, 91% 22%, 96% 80%, 100% 100%)',
                    }}
                    className="h-2.5 w-44 -mt-1 bg-zinc-200 shadow-inner"
                  />
                </div>
              )}

              {/* Booster Pack Artwork Body */}
              <div className="relative z-10 -mt-0.5 h-56 w-44 overflow-hidden border-x-2 border-white/75 bg-zinc-900 shadow-[0_24px_50px_rgba(0,0,0,0.8)]">
                <img
                  src={setInfo.packImageUrl}
                  alt={setInfo.name}
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover"
                />
                {/* Foil packaging vertical seam glare */}
                <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(108deg,rgba(0,0,0,0.28)_0%,transparent_28%,rgba(255,255,255,0.34)_48%,transparent_64%,rgba(0,0,0,0.32)_100%)]" />
              </div>

              {/* Bottom Metallic Foil Crimp */}
              <div
                style={{
                  backgroundImage:
                    'repeating-linear-gradient(90deg, rgba(212,212,216,0.95) 0px, rgba(250,250,250,1) 3px, rgba(161,161,170,0.92) 5px)',
                }}
                className="relative z-10 h-3.5 w-44 rounded-b-md border-b border-x border-white/70 shadow-lg"
              />
            </div>

            {/* 2 POV Hands: Left grips pack body, Right pinches & rips foil crimp */}
            <div className="pointer-events-none absolute -bottom-16 -left-20 z-20">
              <PovLeftHand pose="grip_pack" />
            </div>
            <div className="pointer-events-none absolute -top-12 -right-20 z-30">
              <PovRightHand pose={packAnimStage === 'tearing' ? 'pull_tear' : 'pinch_tear'} />
            </div>
          </div>
        )}

        {/* CASE C: BEAT 3 — SLIDING THE CARD STACK OUT OF THE OPEN FOIL WRAPPER */}
        {showSlidingCards && setInfo && (
          <div className="relative flex items-center justify-center w-full h-full">
            {/* Torn pack wrapper dropping downward out of frame */}
            <div className="pointer-events-none absolute bottom-4 z-10 h-36 w-40 overflow-hidden rounded-b-lg border-2 border-white/60 bg-zinc-900 opacity-75 animate-wrapper-drop">
              <img
                src={setInfo.packImageUrl}
                alt=""
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover"
              />
            </div>

            {/* Emerging Stacked Cards (layered depth + suspense holo edge peeking!) */}
            <div className="relative z-20 flex items-center justify-center animate-card-slide-up">
              {/* Back cards thickness silhouette */}
              <div className="absolute -top-2 translate-x-2 rotate-[3deg] h-52 w-36 rounded-xl border-2 border-amber-200/80 bg-gradient-to-br from-amber-300/60 via-zinc-900 to-fuchsia-500/40 shadow-2xl" />
              <div className="absolute -top-1 translate-x-1 rotate-[1.5deg] h-52 w-36 rounded-xl border border-zinc-300/70 bg-zinc-900 shadow-xl" />
              {/* Lead card peeking in hand */}
              <div className="relative h-52 w-36 overflow-hidden rounded-xl border-2 border-white/85 bg-zinc-950 shadow-[0_20px_50px_rgba(0,0,0,0.85)]">
                <img
                  src={fannedCards[0].card.imageUrl}
                  alt={fannedCards[0].card.name}
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover"
                />
                {packHasHit && (
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_25%,rgba(253,224,71,0.45),transparent_55%)]" />
                )}
              </div>
              {packHasHit && (
                <div className="absolute -top-3 right-0 flex items-center gap-1 rounded-full bg-amber-400 px-2.5 py-0.5 text-[10px] font-black text-zinc-950 shadow-lg">
                  <Sparkles className="h-3 w-3" />
                  Ánh Holo!
                </div>
              )}
            </div>

            <div className="pointer-events-none absolute -bottom-16 -left-16 z-20">
              <PovLeftHand pose="slide_pack" />
            </div>
            <div className="pointer-events-none absolute -bottom-14 -right-12 z-30">
              <PovRightHand pose="slide_cards" />
            </div>
          </div>
        )}

        {/* CASE D: BEAT 4 — FANNED CARDS IN CLEAR ACRYLIC TOPLOADERS HELD BY HAND */}
        {showFan && (
          <div className="relative flex items-center justify-center w-full h-full">
            {/* Hit shockwave burst glow when rare card hits */}
            {packHasHit && packAnimStage === 'fanning' && (
              <div
                key={`burst_${currentPackNum}`}
                className="pointer-events-none absolute h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(251,191,36,0.55)_0%,rgba(244,114,182,0.28)_45%,transparent_72%)] animate-hit-burst"
              />
            )}

            <div className="relative z-10 flex items-center justify-center animate-card-fan-reveal">
              {fannedCards.map((out, idx) => {
                const count = fannedCards.length;
                const angle =
                  count === 1
                    ? 0
                    : count === 2
                    ? idx === 0
                      ? -8
                      : 8
                    : idx === 0
                    ? -12
                    : idx === 1
                    ? 0
                    : 12;
                const shiftX =
                  count === 1
                    ? 0
                    : count === 2
                    ? idx === 0
                      ? -36
                      : 36
                    : (idx - 1) * 66;
                const shiftY = count === 3 && idx === 1 ? -10 : 4;
                const price = Math.round(out.card.marketPrice || 0);

                return (
                  <div
                    key={`${out.card.id}_${idx}`}
                    style={{
                      transform: `translate(${shiftX}px, ${shiftY}px) rotate(${angle}deg)`,
                      zIndex: 10 + idx,
                    }}
                    className={`absolute w-32 sm:w-36 rounded-xl border-2 p-1 backdrop-blur-[1px] shadow-[0_20px_44px_rgba(0,0,0,0.78)] ${
                      out.isHit
                        ? 'border-amber-300 bg-amber-100/20'
                        : 'border-sky-200/75 bg-white/15'
                    } ${getCardHoloClass(out.card.marketPrice || 0)}`}
                  >
                    {/* Top Acrylic Toploader Lip & Inner Bevel */}
                    <div className="h-1.5 w-full rounded-t bg-gradient-to-r from-white/35 via-white/75 to-white/35 mb-0.5" />
                    <div className="relative overflow-hidden rounded-lg bg-zinc-950 border border-white/25">
                      <img
                        src={out.card.imageUrl}
                        alt={out.card.name}
                        referrerPolicy="no-referrer"
                        className="h-44 sm:h-48 w-full object-cover"
                      />
                      {/* Glossy acrylic sleeve diagonal reflection */}
                      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(122deg,rgba(255,255,255,0.22)_0%,transparent_26%,rgba(255,255,255,0.12)_48%,transparent_65%)]" />
                      {out.isHit && (
                        <div className="absolute top-1.5 left-1.5 flex items-center gap-0.5 rounded-full bg-amber-400 px-1.5 py-0.5 text-[9px] font-black text-zinc-950 shadow">
                          <Flame className="h-2.5 w-2.5" />
                          HIT
                        </div>
                      )}
                    </div>
                    {/* Crisp Card Tag */}
                    <div className="mt-1 flex items-center justify-between gap-1 rounded-md bg-black/85 px-1.5 py-0.5 text-[10px] font-black text-white">
                      <span className="truncate">{out.card.name}</span>
                      <span className="text-amber-300 tabular-nums shrink-0">${price}</span>
                    </div>
                    {out.disposition === 'shipped' ? (
                      <div className="mt-0.5 rounded bg-emerald-600/95 px-1 py-0.5 text-center text-[9px] font-black text-white truncate">
                        Ship: {out.buyerName}
                      </div>
                    ) : (
                      <div className="mt-0.5 rounded bg-zinc-800/90 px-1 py-0.5 text-center text-[9px] font-bold text-zinc-300 truncate">
                        Binder Shop
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Right POV Hand & Thumb overlapping the corner of the fanned cards */}
            <div className="pointer-events-none absolute -bottom-16 -right-8 z-30">
              <PovRightHand pose="fan_grip" />
            </div>
            <div className="pointer-events-none absolute -bottom-20 -left-14 z-20 opacity-90">
              <PovLeftHand pose="hold_cards" />
            </div>
          </div>
        )}

        {/* CASE E: PACK READY WHEN JUST ENTERED RIPPING (Pack 0) */}
        {phase === 'ripping' && packAnimStage === 'idle' && currentPackNum === 0 && setInfo && (
          <div className="relative flex flex-col items-center justify-center">
            <div className="relative z-10 flex flex-col items-center">
              <div className="h-56 w-44 overflow-hidden rounded-xl border-2 border-amber-300/80 bg-zinc-900 shadow-[0_20px_50px_rgba(0,0,0,0.8)]">
                <img
                  src={setInfo.packImageUrl}
                  alt={setInfo.name}
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover"
                />
              </div>
              <span className="mt-2 rounded-full bg-rose-600 px-3.5 py-1 text-[11px] font-black text-white shadow-lg">
                Đang chuẩn bị xé Pack #1 cho khách...
              </span>
            </div>
            <div className="pointer-events-none absolute -bottom-16 -left-20 z-20">
              <PovLeftHand pose="grip_pack" />
            </div>
            <div className="pointer-events-none absolute -bottom-14 -right-20 z-20">
              <PovRightHand pose="fan_grip" />
            </div>
          </div>
        )}
      </div>

      {/* Subtle Bottom & Top Edge Scrims ONLY (Center stage stays 100% clear) */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/75 via-black/30 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[38%] bg-gradient-to-t from-black/90 via-black/55 to-transparent" />
    </div>
  );
};
