import React from 'react';
import type { GradedSlab, PokemonCard, SlabGuardColor } from '../game/pokemonShopLogic';

export interface GradedSlabCardProps {
  card: PokemonCard;
  slab: GradedSlab;
  maxWidthClass?: string;
  maxHeightClass?: string;
  heightClass?: string;
  cardHeightStyle?: string;
  imageClassName?: string;
  className?: string;
  showSubgrades?: boolean;
}

const BARCODE_WEIGHTS = [2, 1, 3, 1, 1, 2, 3, 1, 2, 1, 1, 3, 2, 1, 2, 1, 3, 1, 2, 1, 1, 2];

const GUARD_RING_CLASSES: Record<SlabGuardColor, string> = {
  none: '',
  gold: 'ring-4 ring-amber-400 shadow-[0_0_24px_rgba(251,191,36,0.45)]',
  crimson: 'ring-4 ring-red-500 shadow-[0_0_24px_rgba(239,68,68,0.45)]',
  cyan: 'ring-4 ring-cyan-400 shadow-[0_0_24px_rgba(34,211,238,0.45)]',
  emerald: 'ring-4 ring-emerald-400 shadow-[0_0_24px_rgba(52,211,153,0.45)]',
  obsidian: 'ring-4 ring-zinc-700 shadow-[0_0_20px_rgba(24,24,27,0.85)]',
};

const MiniBarcode: React.FC<{ seed: string; heightClass?: string; invert?: boolean }> = ({
  seed,
  heightClass = 'h-2 sm:h-2.5',
  invert = false,
}) => {
  const offset = seed ? seed.charCodeAt(0) % BARCODE_WEIGHTS.length : 0;
  return (
    <div className={`flex items-stretch gap-[1.5px] ${heightClass}`} aria-hidden="true">
      {BARCODE_WEIGHTS.map((_, i) => {
        const w = BARCODE_WEIGHTS[(i + offset) % BARCODE_WEIGHTS.length];
        return (
          <span
            key={i}
            className={`${invert ? 'bg-amber-300' : 'bg-zinc-950'} block h-full shrink-0`}
            style={{ width: w === 3 ? '2.5px' : w === 2 ? '1.5px' : '1px' }}
          />
        );
      })}
    </div>
  );
};

export const GradedSlabCard: React.FC<GradedSlabCardProps> = ({
  card,
  slab,
  maxWidthClass = 'max-w-[min(90vw,310px)]',
  heightClass,
  cardHeightStyle = 'clamp(170px, 27vh, 290px)',
  imageClassName = '',
  className = '',
  showSubgrades = false,
}) => {
  const isCgc = slab.company === 'CGC';
  const isBgs = slab.company === 'BGS';
  const isCgcPristine = isCgc && slab.grade >= 10 && Boolean(slab.gradeLabel?.includes('PRISTINE'));
  const isBgsBlackLabel = isBgs && slab.grade >= 10 && Boolean(slab.gradeLabel?.includes('BLACK LABEL'));
  const isBgsGold = isBgs && !isBgsBlackLabel && slab.grade >= 9.5;
  const guardColor: SlabGuardColor = slab.slabGuardColor || 'none';
  const guardRing = GUARD_RING_CLASSES[guardColor] || '';

  const cardNum = card.setNumber
    ? `#${card.setNumber.split('/')[0].trim()}`
    : `#${card.id.slice(-4).toUpperCase()}`;

  const cgcGradeText =
    slab.grade === 10
      ? isCgcPristine
        ? 'PRISTINE'
        : 'GEM MINT'
      : slab.grade === 9
      ? 'MINT'
      : slab.grade === 8
      ? 'NM/M'
      : 'NM';

  const psaGradeText =
    slab.grade === 10 ? 'GEM MT' : slab.grade === 9 ? 'MINT' : slab.grade === 8 ? 'NM-MT' : 'NM';

  const bgsGradeText = isBgsBlackLabel
    ? 'BLACK LABEL'
    : slab.grade >= 10
    ? 'PRISTINE'
    : slab.grade >= 9.5
    ? 'GEM MINT'
    : slab.grade >= 9
    ? 'MINT'
    : slab.grade >= 8.5
    ? 'NM-MT+'
    : 'NM-MT';

  const cardHeightCss = heightClass ? undefined : cardHeightStyle;
  const cardWidthCss = heightClass ? undefined : `calc(${cardHeightStyle} * 63 / 88)`;
  const slabWidthCss = heightClass ? undefined : `calc(${cardHeightStyle} * 63 / 88 + 20px)`;

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (img.src.includes('_p1.jpg') || img.src.includes('_p2.jpg')) {
      img.src = img.src.replace(/_p\d+\.jpg/, '.jpg');
    } else if (img.src.includes('_p1.png') || img.src.includes('_p2.png')) {
      img.src = img.src.replace(/_p\d+\.png/, '.png');
    } else if (card.artUrl && img.src !== card.artUrl) {
      img.src = card.artUrl;
    } else if (card.fallbackUrl && img.src !== card.fallbackUrl) {
      img.src = card.fallbackUrl;
    }
  };

  return (
    <div
      className={`relative mx-auto select-none transition-transform duration-300 rounded-[20px] sm:rounded-[24px] ${guardRing} ${maxWidthClass} ${className}`}
      style={slabWidthCss ? { width: slabWidthCss } : undefined}
    >
      {/* ============================================================== */}
      {/* BGS BECKETT AUTHENTIC SLAB CASING (Black Label / Gold / Silver)*/}
      {/* ============================================================== */}
      {isBgs ? (
        <div
          className={`relative w-full rounded-[18px] sm:rounded-[22px] p-2 bg-gradient-to-b border-2 overflow-hidden flex flex-col items-center ${
            isBgsBlackLabel
              ? 'from-zinc-900 via-black to-zinc-900 border-amber-400 shadow-[0_20px_50px_rgba(0,0,0,0.95),0_0_28px_rgba(251,191,36,0.35)]'
              : isBgsGold
              ? 'from-amber-200/20 via-zinc-300/10 to-amber-200/15 border-amber-300/80 shadow-[0_20px_50px_rgba(0,0,0,0.95)]'
              : 'from-slate-200/20 via-zinc-400/10 to-slate-200/15 border-slate-300/45 shadow-[0_20px_50px_rgba(0,0,0,0.95)]'
          }`}
        >
          <div
            className={`relative z-10 w-full mb-1 sm:mb-1.5 overflow-hidden rounded-lg border shadow-md ${
              isBgsBlackLabel
                ? 'border-amber-400 bg-gradient-to-b from-zinc-950 via-black to-zinc-950 text-amber-200'
                : isBgsGold
                ? 'border-amber-500 bg-gradient-to-b from-amber-200 via-yellow-300 to-amber-400 text-zinc-950'
                : 'border-slate-400 bg-gradient-to-b from-slate-200 via-zinc-100 to-slate-300 text-zinc-950'
            }`}
          >
            <div className="flex items-stretch justify-between gap-1 px-1.5 py-1">
              <div className="flex-1 min-w-0 text-left flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-1">
                    <span
                      className={`text-[8px] font-black px-1 rounded-xs ${
                        isBgsBlackLabel ? 'bg-amber-400 text-black' : 'bg-zinc-950 text-amber-300'
                      }`}
                    >
                      BGS
                    </span>
                    <span className="text-[7px] font-bold uppercase truncate opacity-85">
                      {slab.year} {card.universe === 'onepiece' ? 'ONE PIECE' : 'POKEMON'} {cardNum}
                    </span>
                  </div>
                  <div className="text-[9px] sm:text-[10px] font-black leading-tight truncate mt-0.5">
                    {card.name}
                  </div>
                  <div className="text-[6.5px] sm:text-[7px] font-bold leading-tight truncate opacity-80">
                    {card.setName}
                  </div>
                </div>

                {/* BGS Signature 4-Subgrade Box */}
                {slab.subgrades && (
                  <div className="grid grid-cols-4 gap-0.5 text-[6.5px] font-mono font-bold pt-0.5 tabular-nums">
                    <span>C:{slab.subgrades.centering.toFixed(1)}</span>
                    <span>E:{slab.subgrades.edges.toFixed(1)}</span>
                    <span>R:{slab.subgrades.corners.toFixed(1)}</span>
                    <span>S:{slab.subgrades.surface.toFixed(1)}</span>
                  </div>
                )}

                <div className="flex items-center gap-1 pt-0.5">
                  <MiniBarcode seed={slab.certNumber} heightClass="h-1.5" invert={isBgsBlackLabel} />
                  <span className="text-[6.5px] font-mono font-bold">{slab.certNumber}</span>
                  {slab.isCertFancy && (
                    <span className="text-[7px] font-black text-amber-400" title="Fancy Serial Cert">
                      ★
                    </span>
                  )}
                </div>
              </div>

              <div className="shrink-0 flex flex-col items-center justify-center pl-1">
                <div
                  className={`min-w-[44px] sm:min-w-[50px] rounded-md px-1 py-0.5 flex flex-col items-center justify-center border ${
                    isBgsBlackLabel
                      ? 'border-amber-400 bg-black text-amber-300'
                      : 'border-zinc-900/70 bg-white/80 text-zinc-950'
                  }`}
                >
                  <span className="text-[5.5px] sm:text-[6px] font-black tracking-tight uppercase leading-none text-center">
                    {bgsGradeText}
                  </span>
                  <span className="text-base sm:text-xl font-black leading-tight tracking-tight mt-0.5">
                    {slab.grade}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="relative z-10 w-full rounded-xl bg-[#0b0d12] border border-zinc-800/80 p-0.5 sm:p-1 shadow-[inset_0_2px_12px_rgba(0,0,0,0.95)] flex items-center justify-center">
            <div
              className={`relative aspect-[63/88] rounded-lg overflow-hidden bg-black/40 flex items-center justify-center shadow-inner shrink-0 ${heightClass || ''}`}
              style={cardHeightCss ? { height: cardHeightCss, width: cardWidthCss } : undefined}
            >
              <img
                src={card.imageUrl}
                alt={card.name}
                onError={handleImageError}
                className={`w-full h-full object-fill rounded-lg drop-shadow-[0_4px_16px_rgba(0,0,0,0.85)] ${imageClassName}`}
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent mix-blend-screen" />
            </div>
          </div>

          {showSubgrades && slab.subgrades && (
            <div className="relative z-10 mt-1.5 w-full grid grid-cols-4 gap-1 rounded-lg bg-zinc-950/90 border border-amber-400/25 px-1.5 py-1 text-[9px] font-mono tabular-nums">
              <div className="text-center">
                <div className="text-[7px] text-zinc-400">CTR</div>
                <div className="font-bold text-amber-300">{slab.subgrades.centering.toFixed(1)}</div>
              </div>
              <div className="text-center">
                <div className="text-[7px] text-zinc-400">CRN</div>
                <div className="font-bold text-amber-300">{slab.subgrades.corners.toFixed(1)}</div>
              </div>
              <div className="text-center">
                <div className="text-[7px] text-zinc-400">EDG</div>
                <div className="font-bold text-amber-300">{slab.subgrades.edges.toFixed(1)}</div>
              </div>
              <div className="text-center">
                <div className="text-[7px] text-zinc-400">SRF</div>
                <div className="font-bold text-amber-300">{slab.subgrades.surface.toFixed(1)}</div>
              </div>
            </div>
          )}

          <div className="h-1 w-full flex items-center justify-center gap-1.5 mt-1 opacity-55">
            <span className="h-0.5 w-7 rounded-full bg-amber-300/60" />
            <span className="h-0.5 w-2 rounded-full bg-amber-300/60" />
            <span className="h-0.5 w-7 rounded-full bg-amber-300/60" />
          </div>
        </div>
      ) : isCgc ? (
        /* ============================================================== */
        /* CGC AUTHENTIC SLAB CASING (Black/Gold Pristine 10 vs Silver)   */
        /* ============================================================== */
        <div
          className={`relative w-full rounded-[18px] sm:rounded-[22px] p-2 bg-gradient-to-b from-white/20 via-zinc-400/10 to-white/15 border-2 ${
            isCgcPristine
              ? 'border-amber-300/70 shadow-[0_20px_50px_rgba(0,0,0,0.95),0_0_24px_rgba(251,191,36,0.28),inset_0_1px_1px_rgba(255,255,255,0.45)]'
              : 'border-white/35 shadow-[0_20px_50px_rgba(0,0,0,0.95),inset_0_1px_1px_rgba(255,255,255,0.4)]'
          } overflow-hidden flex flex-col items-center`}
        >
          <div
            className={`absolute inset-[3px] rounded-[15px] sm:rounded-[19px] border pointer-events-none ${
              isCgcPristine ? 'border-amber-400/35' : 'border-white/20'
            }`}
          />

          <div className="absolute -inset-x-10 -top-20 h-48 bg-gradient-to-b from-white/20 to-transparent rotate-[-25deg] pointer-events-none opacity-40 blur-[1px]" />

          <div
            className={`relative z-10 w-full mb-1 sm:mb-1.5 overflow-hidden rounded-xl border shadow-md ${
              isCgcPristine ? 'border-amber-400/90 bg-zinc-950' : 'border-black bg-black'
            }`}
          >
            <div className="flex items-center justify-between bg-black px-1.5 py-0.5 text-white">
              <div className="flex items-center gap-1">
                <div
                  className={`flex h-3 w-3 sm:h-3.5 sm:w-3.5 items-center justify-center rounded-xs shadow-xs ${
                    isCgcPristine
                      ? 'bg-gradient-to-tr from-amber-500 via-yellow-300 to-amber-200'
                      : 'bg-gradient-to-tr from-cyan-400 via-sky-300 to-teal-200'
                  }`}
                >
                  <span className="text-[7px] font-black text-black leading-none">◆</span>
                </div>
                <span
                  className={`text-[11px] sm:text-xs font-black tracking-wider leading-none ${
                    isCgcPristine ? 'text-amber-300' : 'text-white'
                  }`}
                >
                  CGC
                </span>
              </div>
              <span
                className={`text-[6.5px] sm:text-[7.5px] font-bold tracking-[0.1em] uppercase truncate ${
                  isCgcPristine ? 'text-amber-200/90' : 'text-zinc-100'
                }`}
              >
                {isCgcPristine ? 'PRISTINE GOLD EDITION' : 'CERTIFIED GUARANTY COMPANY'}
              </span>
            </div>

            <div
              className={`flex items-stretch justify-between gap-1 px-1.5 py-0.5 border-t ${
                isCgcPristine
                  ? 'bg-gradient-to-b from-zinc-900 via-neutral-950 to-black text-amber-100 border-amber-500/50'
                  : 'bg-gradient-to-b from-zinc-50 via-white to-zinc-100 text-zinc-950 border-zinc-800'
              }`}
            >
              <div className="flex-1 min-w-0 text-left flex flex-col justify-between py-0.2">
                <div>
                  <div
                    className={`text-[9px] sm:text-[10px] font-black leading-tight truncate ${
                      isCgcPristine ? 'text-amber-200' : 'text-zinc-950'
                    }`}
                  >
                    {card.name}
                  </div>
                  <div
                    className={`text-[7px] sm:text-[8px] font-bold leading-tight truncate ${
                      isCgcPristine ? 'text-amber-100/80' : 'text-zinc-800'
                    }`}
                  >
                    {card.universe === 'onepiece' ? 'One Piece TCG' : 'Pokémon'} ({slab.year}) · {card.setName}
                  </div>
                  <div
                    className={`text-[6.5px] sm:text-[7px] font-semibold leading-tight truncate ${
                      isCgcPristine ? 'text-amber-300/75' : 'text-zinc-600'
                    }`}
                  >
                    {card.rarityLabel || card.rarity} · {cardNum}
                  </div>
                </div>

                <div className="flex items-center gap-1 pt-0.5">
                  <MiniBarcode seed={slab.certNumber} heightClass="h-1.5 sm:h-2" invert={isCgcPristine} />
                  <span
                    className={`text-[6.5px] sm:text-[7px] font-mono font-bold ${
                      isCgcPristine ? 'text-amber-300' : 'text-zinc-800'
                    }`}
                  >
                    {slab.certNumber}
                  </span>
                  {slab.isCertFancy && (
                    <span className="text-[7px] font-black text-amber-400" title="Fancy Serial Cert">
                      ★
                    </span>
                  )}
                </div>
              </div>

              <div className="shrink-0 flex items-center justify-center pl-1">
                <div
                  className={`min-w-[44px] sm:min-w-[50px] rounded-md px-1 py-0.5 flex flex-col items-center justify-center shadow-xs ${
                    isCgcPristine
                      ? 'border border-amber-400 bg-gradient-to-b from-amber-300 via-yellow-400 to-amber-500 text-zinc-950'
                      : 'border border-zinc-950/80 bg-white text-zinc-950'
                  }`}
                >
                  <span className="text-[6px] sm:text-[6.5px] font-black tracking-wider uppercase leading-none">
                    {cgcGradeText}
                  </span>
                  <span className="text-base sm:text-xl font-black leading-tight tracking-tight mt-0.5">
                    {slab.grade}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="relative z-10 w-full rounded-xl bg-[#0d0e12] border border-zinc-800/80 p-0.5 sm:p-1 shadow-[inset_0_2px_12px_rgba(0,0,0,0.95)] flex items-center justify-center">
            <div
              className={`relative aspect-[63/88] rounded-lg overflow-hidden bg-black/40 flex items-center justify-center shadow-inner shrink-0 ${heightClass || ''}`}
              style={cardHeightCss ? { height: cardHeightCss, width: cardWidthCss } : undefined}
            >
              <img
                src={card.imageUrl}
                alt={card.name}
                onError={handleImageError}
                className={`w-full h-full object-fill rounded-lg drop-shadow-[0_4px_16px_rgba(0,0,0,0.8)] ${imageClassName}`}
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-transparent via-white/8 to-transparent mix-blend-screen" />
            </div>
          </div>

          {showSubgrades && slab.subgrades && (
            <div className="relative z-10 mt-1.5 w-full grid grid-cols-4 gap-1 rounded-lg bg-zinc-950/90 border border-white/15 px-1.5 py-1 text-[9px] font-mono tabular-nums">
              <div className="text-center">
                <div className="text-[7px] text-zinc-400">CTR</div>
                <div className="font-bold text-amber-300">{slab.subgrades.centering.toFixed(1)}</div>
              </div>
              <div className="text-center">
                <div className="text-[7px] text-zinc-400">CRN</div>
                <div className="font-bold text-amber-300">{slab.subgrades.corners.toFixed(1)}</div>
              </div>
              <div className="text-center">
                <div className="text-[7px] text-zinc-400">EDG</div>
                <div className="font-bold text-amber-300">{slab.subgrades.edges.toFixed(1)}</div>
              </div>
              <div className="text-center">
                <div className="text-[7px] text-zinc-400">SRF</div>
                <div className="font-bold text-amber-300">{slab.subgrades.surface.toFixed(1)}</div>
              </div>
            </div>
          )}

          <div className="h-1 w-full flex items-center justify-center gap-1.5 mt-1 opacity-50">
            <span className="h-0.5 w-6 rounded-full bg-white/40" />
            <span className="h-0.5 w-1.5 rounded-full bg-white/40" />
            <span className="h-0.5 w-6 rounded-full bg-white/40" />
          </div>
        </div>
      ) : (
        /* ============================================================== */
        /* PSA AUTHENTIC SLAB CASING                                      */
        /* ============================================================== */
        <div className="relative w-full rounded-[18px] sm:rounded-[22px] p-2 bg-gradient-to-b from-zinc-200/25 via-zinc-400/10 to-zinc-200/20 border-2 border-zinc-300/40 shadow-[0_20px_50px_rgba(0,0,0,0.95),inset_0_1px_1px_rgba(255,255,255,0.4)] overflow-hidden flex flex-col items-center">
          <div className="absolute inset-[3px] rounded-[15px] sm:rounded-[19px] border border-white/25 pointer-events-none" />
          <div className="absolute inset-[5px] rounded-[13px] sm:rounded-[17px] border border-zinc-500/20 pointer-events-none" />

          <div className="absolute -inset-x-10 -top-20 h-48 bg-gradient-to-b from-white/20 to-transparent rotate-[-25deg] pointer-events-none opacity-40 blur-[1px]" />

          <div className="relative z-10 w-full mb-1 sm:mb-1.5 rounded-md border-[2px] border-[#d91e2a] bg-white p-1 text-zinc-950 shadow-md font-mono overflow-hidden">
            <div className="flex items-stretch justify-between gap-1">
              <div className="flex-1 min-w-0 text-left flex flex-col justify-between py-0.2">
                <div>
                  <div className="text-[7px] sm:text-[8px] font-bold uppercase text-black leading-tight truncate">
                    {slab.year} {card.universe === 'onepiece' ? 'ONE PIECE' : 'POKEMON'} {(card.setName || 'TCG').toUpperCase()}
                  </div>
                  <div className="text-[8.5px] sm:text-[9.5px] font-black uppercase text-black leading-tight truncate mt-0.5">
                    {card.name}
                  </div>
                  <div className="text-[6.5px] sm:text-[7.5px] font-bold uppercase text-zinc-700 leading-tight truncate">
                    {card.rarity || 'SECRET RARE'}
                  </div>
                </div>

                <div className="mt-0.5 flex items-center justify-between gap-1">
                  <MiniBarcode seed={slab.certNumber} heightClass="h-1.5 sm:h-2" />
                  <div className="px-1 py-0.2 rounded-xs bg-gradient-to-tr from-zinc-300 via-white to-zinc-200 border border-zinc-400 text-[6px] sm:text-[6.5px] font-black tracking-tight text-blue-900 shadow-xs shrink-0">
                    P<span className="text-[#d91e2a]">S</span>A
                  </div>
                </div>
              </div>

              <div className="shrink-0 text-right flex flex-col justify-between items-end pl-1 min-w-[40px] sm:min-w-[46px]">
                <span className="text-[7px] sm:text-[7.5px] font-bold text-black leading-tight">
                  {cardNum}
                </span>
                <span className="text-[7.5px] sm:text-[8px] font-black text-black leading-tight tracking-wider">
                  {psaGradeText}
                </span>
                <span className="text-base sm:text-xl font-black text-black leading-none my-0.2">
                  {slab.grade}
                </span>
                <span className="text-[6px] sm:text-[6.5px] font-bold text-zinc-800 tracking-wider leading-tight">
                  {slab.isCertFancy ? '★ ' : ''}
                  {slab.certNumber}
                </span>
              </div>
            </div>
          </div>

          <div className="relative z-10 w-full rounded-xl bg-gradient-to-b from-zinc-300/30 via-zinc-400/20 to-zinc-300/25 border border-zinc-400/40 p-0.5 sm:p-1 shadow-[inset_0_2px_8px_rgba(0,0,0,0.6)] flex items-center justify-center">
            <div
              className={`relative aspect-[63/88] rounded-lg overflow-hidden bg-zinc-950/90 flex items-center justify-center shadow-inner shrink-0 ${heightClass || ''}`}
              style={cardHeightCss ? { height: cardHeightCss, width: cardWidthCss } : undefined}
            >
              <img
                src={card.imageUrl}
                alt={card.name}
                onError={handleImageError}
                className={`w-full h-full object-fill rounded-lg drop-shadow-[0_4px_16px_rgba(0,0,0,0.85)] ${imageClassName}`}
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent mix-blend-screen" />
            </div>
          </div>

          {showSubgrades && slab.subgrades && (
            <div className="relative z-10 mt-1.5 w-full grid grid-cols-4 gap-1 rounded-lg bg-zinc-950/90 border border-white/15 px-1.5 py-1 text-[9px] font-mono tabular-nums">
              <div className="text-center">
                <div className="text-[7px] text-zinc-400">CTR</div>
                <div className="font-bold text-red-300">{slab.subgrades.centering.toFixed(1)}</div>
              </div>
              <div className="text-center">
                <div className="text-[7px] text-zinc-400">CRN</div>
                <div className="font-bold text-red-300">{slab.subgrades.corners.toFixed(1)}</div>
              </div>
              <div className="text-center">
                <div className="text-[7px] text-zinc-400">EDG</div>
                <div className="font-bold text-red-300">{slab.subgrades.edges.toFixed(1)}</div>
              </div>
              <div className="text-center">
                <div className="text-[7px] text-zinc-400">SRF</div>
                <div className="font-bold text-red-300">{slab.subgrades.surface.toFixed(1)}</div>
              </div>
            </div>
          )}

          <div className="h-1 w-full flex items-center justify-center gap-1.5 mt-1 opacity-50">
            <span className="h-0.5 w-8 rounded-full bg-zinc-300/60" />
            <span className="h-0.5 w-8 rounded-full bg-zinc-300/60" />
          </div>
        </div>
      )}
    </div>
  );
};
