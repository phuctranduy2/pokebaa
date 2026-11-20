import React, { useState } from 'react';
import {
  X,
  Swords,
  DollarSign,
  Users,
  Trophy,
  Sparkles,
  Coffee,
  CheckCircle2,
  Clock,
  ShieldCheck,
  TrendingUp,
  Crown,
  Play,
} from 'lucide-react';
import { soundManager } from '../game/audio';
import confetti from 'canvas-confetti';
import {
  ONEPIECE_CARDS_DB,
  POKEMON_CARDS_DB,
  PokemonCard,
  ShopState,
} from '../game/pokemonShopLogic';
import {
  TOURNAMENT_TIERS,
  TournamentFormat,
  TournamentTierId,
  computeTeamDeckPower,
  getTrophyBuffs,
} from '../game/shopExpansionSystems';

interface BattleArenaModalProps {
  tableRentalPricePerHour: number;
  tablePlayersCount: number;
  totalEarnings: number;
  storeCash: number;
  shopState?: ShopState;
  onStartTournamentBracket?: (
    format: TournamentFormat,
    tier: TournamentTierId,
    selectedCards: Array<{ card: PokemonCard; slabGrade?: number }>
  ) => void;
  onAdvanceTournamentRound?: () => void;
  onCollectFees?: (amount: number) => void;
  onSetRentalPrice?: (newPrice: number) => void;
  onHostTournament?: () => void;
  onClose: () => void;
}

export const BattleArenaModal: React.FC<BattleArenaModalProps> = ({
  tableRentalPricePerHour = 5,
  tablePlayersCount = 4,
  totalEarnings = 0,
  storeCash = 0,
  shopState,
  onStartTournamentBracket,
  onAdvanceTournamentRound,
  onCollectFees,
  onSetRentalPrice,
  onHostTournament,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'matches' | 'tournament' | 'settings'>('tournament');
  const [tournamentHosted, setTournamentHosted] = useState(false);
  const [servedRefreshments, setServedRefreshments] = useState(false);
  const [currentFee, setCurrentFee] = useState(tableRentalPricePerHour);
  const [tourFormat, setTourFormat] = useState<TournamentFormat>('pokemon');
  const [tourTier, setTourTier] = useState<TournamentTierId>('local');
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);

  // Available champion cards from Shop Binder & Graded Slabs
  const candidateDeckCards = React.useMemo(() => {
    const items: Array<{ key: string; card: PokemonCard; slabGrade?: number }> = [];
    const slabs = shopState?.gradedSlabs || [];
    for (const s of slabs) {
      if (tourFormat === 'onepiece' && s.card.universe !== 'onepiece') continue;
      if (tourFormat === 'pokemon' && s.card.universe === 'onepiece') continue;
      items.push({ key: `slab_${s.id}`, card: s.card, slabGrade: s.slab.grade });
    }
    const binder = shopState?.binderCards || {};
    const db = tourFormat === 'onepiece' ? ONEPIECE_CARDS_DB : POKEMON_CARDS_DB;
    for (const c of db) {
      if ((binder[c.id] || 0) > 0) {
        items.push({ key: `raw_${c.id}`, card: c });
      }
    }
    return items.sort((a, b) => (b.card.marketPrice || 0) - (a.card.marketPrice || 0)).slice(0, 18);
  }, [shopState?.gradedSlabs, shopState?.binderCards, tourFormat]);

  const effectiveTeam = React.useMemo(() => {
    const chosen = candidateDeckCards.filter((c) => selectedTeamIds.includes(c.key));
    if (chosen.length > 0) return chosen.slice(0, 3);
    return candidateDeckCards.slice(0, 3);
  }, [candidateDeckCards, selectedTeamIds]);

  const estimatedTeamPower = computeTeamDeckPower(effectiveTeam);
  const trophies = shopState?.trophyCollection || [];
  const trophyBuffs = getTrophyBuffs(trophies);
  const activeBracket = shopState?.activeTournament;

  const handlePriceSelect = (price: number) => {
    soundManager.playSelectSound();
    setCurrentFee(price);
    onSetRentalPrice?.(price);
  };

  const handleTournamentClick = () => {
    if (storeCash < 50 || tournamentHosted) return;
    soundManager.playRarePullFanfare();
    confetti({
      particleCount: 150,
      spread: 90,
      origin: { y: 0.5 },
      colors: ['#3b82f6', '#ef4444', '#ffd700', '#10b981'],
    });
    setTournamentHosted(true);
    onHostTournament?.();
  };

  const handleRefreshmentsClick = () => {
    if (storeCash < 15 || servedRefreshments) return;
    soundManager.playChipSound();
    setServedRefreshments(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 sm:p-5 select-none animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl rounded-3xl border-2 border-blue-500/60 bg-gradient-to-b from-zinc-950 via-[#0d1527] to-zinc-950 p-5 sm:p-7 text-white shadow-[0_25px_70px_rgba(30,58,138,0.5)] flex flex-col justify-between overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-blue-900/60 pb-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-500 to-sky-400 flex items-center justify-center text-white shadow-lg border border-blue-300">
              <Swords className="h-6 w-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg sm:text-xl font-black text-sky-300 uppercase tracking-wide">
                  Khu Vực Bàn Đấu Pokemon TCG (Battle Arena)
                </h3>
                <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-black text-emerald-400 border border-emerald-500/40 flex items-center gap-1">
                  <DollarSign className="h-3 w-3" />
                  {currentFee}$/Giờ Mỗi Người Chơi
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Các bài thủ thi đấu trực tiếp tại bàn chơi. Tiền thuê bàn tự động thu về cho cửa hàng mỗi giờ chơi!
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Đóng bàn đấu"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-sky-400 hover:text-white transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Quick Stats Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4">
          <div className="rounded-2xl border border-blue-500/30 bg-blue-950/40 p-3 flex flex-col justify-between">
            <span className="text-[11px] text-zinc-400 flex items-center gap-1 font-medium">
              <Users className="h-3.5 w-3.5 text-sky-400" /> Bài Thủ Đang Chơi
            </span>
            <span className="text-xl font-black text-white mt-1">{tablePlayersCount} Người</span>
            <span className="text-[10px] text-sky-300">2 trận đấu song song</span>
          </div>

          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/40 p-3 flex flex-col justify-between">
            <span className="text-[11px] text-zinc-400 flex items-center gap-1 font-medium">
              <Clock className="h-3.5 w-3.5 text-emerald-400" /> Giá Thuê / Giờ
            </span>
            <span className="text-xl font-black text-emerald-300 mt-1">${currentFee}.00 / h</span>
            <span className="text-[10px] text-emerald-400">
              Thu nhập: ${(currentFee * tablePlayersCount).toFixed(0)}/h tổng
            </span>
          </div>

          <div className="rounded-2xl border border-amber-500/30 bg-amber-950/40 p-3 flex flex-col justify-between">
            <span className="text-[11px] text-zinc-400 flex items-center gap-1 font-medium">
              <TrendingUp className="h-3.5 w-3.5 text-amber-400" /> Tổng Tiền Thu Hôm Nay
            </span>
            <span className="text-xl font-black text-amber-300 mt-1">${totalEarnings.toFixed(2)}</span>
            <span className="text-[10px] text-amber-400">Tự động cộng vào ngân quỹ</span>
          </div>

          <div className="rounded-2xl border border-purple-500/30 bg-purple-950/40 p-3 flex flex-col justify-between">
            <span className="text-[11px] text-zinc-400 flex items-center gap-1 font-medium">
              <Trophy className="h-3.5 w-3.5 text-purple-400" /> Độ Nổi Tiếng Bàn Đấu
            </span>
            <span className="text-xl font-black text-purple-300 mt-1">Hạng A+</span>
            <span className="text-[10px] text-purple-300">Luôn kín bàn 100%</span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <button
            onClick={() => setActiveTab('tournament')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'tournament'
                ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-black shadow-md shadow-amber-500/30'
                : 'bg-zinc-900/80 text-zinc-400 hover:text-white'
            }`}
          >
            <Trophy className="h-3.5 w-3.5" /> Giải Đấu Bracket ({trophies.length} Cúp)
          </button>
          <button
            onClick={() => setActiveTab('matches')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'matches'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/40'
                : 'bg-zinc-900/80 text-zinc-400 hover:text-white'
            }`}
          >
            <Swords className="h-3.5 w-3.5" /> Trận Đấu Đang Diễn Ra
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'settings'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/40'
                : 'bg-zinc-900/80 text-zinc-400 hover:text-white'
            }`}
          >
            <DollarSign className="h-3.5 w-3.5" /> Cài Đặt Mức Phí & Dịch Vụ
          </button>
        </div>

        {/* Tab Contents */}
        {activeTab === 'tournament' ? (
          <div className="space-y-4 my-1 max-h-[380px] overflow-y-auto pr-1">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-500/30 bg-amber-950/25 px-3.5 py-2.5 text-xs">
              <div className="flex items-center gap-2 text-amber-200 font-bold">
                <Crown className="h-4 w-4 text-amber-400" />
                <span>Tủ Cúp Shop: {trophies.length} Cúp Vô Địch</span>
              </div>
              <span className="font-black text-emerald-300">
                Buff: +{trophyBuffs.reputationBonus} Uy Tín · +{trophyBuffs.tableRentalBonusPct}% Thuê Bàn
              </span>
            </div>

            {activeBracket && activeBracket.currentRound <= 4 ? (
              <div className="rounded-2xl border border-blue-500/40 bg-zinc-900/85 p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 pb-2.5">
                  <div>
                    <span className="text-xs font-black uppercase text-amber-300">
                      {TOURNAMENT_TIERS[activeBracket.tier].name} · {activeBracket.format === 'onepiece' ? 'One Piece' : 'Pokémon'}
                    </span>
                    <div className="text-[11px] text-zinc-400">
                      Tổng Giải Thưởng: <span className="font-black text-emerald-300">${activeBracket.totalPrizePool}</span> ·
                      Vòng hiện tại:{' '}
                      <span className="font-bold text-white">
                        {activeBracket.currentRound === 1
                          ? 'Tứ Kết (8 Đội)'
                          : activeBracket.currentRound === 2
                          ? 'Bán Kết (4 Đội)'
                          : activeBracket.currentRound === 3
                          ? 'Chung Kết (2 Đội)'
                          : `Hoàn Tất — Vô Địch: ${activeBracket.championName}`}
                      </span>
                    </div>
                  </div>

                  {activeBracket.currentRound < 4 && onAdvanceTournamentRound && (
                    <button
                      onClick={() => {
                        soundManager.playSelectSound();
                        onAdvanceTournamentRound();
                      }}
                      className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-2 text-xs font-black text-black shadow cursor-pointer hover:brightness-110"
                    >
                      <Play className="h-3.5 w-3.5" />
                      {activeBracket.currentRound === 1
                        ? 'Đánh Vòng Tứ Kết'
                        : activeBracket.currentRound === 2
                        ? 'Đánh Vòng Bán Kết'
                        : 'Đánh Trận Chung Kết!'}
                    </button>
                  )}
                </div>

                {/* Matches grouped by round: Tứ Kết -> Bán Kết -> Chung Kết */}
                <div className="space-y-3">
                  {([1, 2, 3] as const).map((roundNum) => {
                    const roundMatches = activeBracket.matches.filter((m) => m.round === roundNum);
                    if (roundMatches.length === 0) return null;
                    const roundLabel =
                      roundNum === 1 ? 'Vòng Tứ Kết (8 Đội)' : roundNum === 2 ? 'Vòng Bán Kết (4 Đội)' : 'Trận Chung Kết Vô Địch';
                    return (
                      <div key={roundNum} className="space-y-1.5">
                        <div className="text-[10px] font-black uppercase tracking-wider text-sky-300">
                          {roundLabel}
                        </div>
                        <div className={`grid gap-2 ${roundNum === 3 ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'}`}>
                          {roundMatches.map((m) => (
                            <div
                              key={m.id}
                              className={`rounded-xl border p-2.5 text-xs ${
                                m.playerA.isPlayer || m.playerB.isPlayer
                                  ? 'border-amber-400/60 bg-amber-950/20'
                                  : 'border-zinc-800 bg-zinc-950/70'
                              }`}
                            >
                              <div className="flex items-center justify-between text-[10px] text-zinc-400 mb-1">
                                <span>{roundNum === 3 ? 'Chung Kết' : `Trận ${m.id.toUpperCase()}`}</span>
                                <span className="font-bold text-amber-300">{m.scoreLabel || 'Chờ thi đấu'}</span>
                              </div>
                              <div className="flex items-center justify-between gap-1">
                                <span className={m.winnerId === m.playerA.id ? 'font-black text-emerald-300 truncate' : 'text-zinc-200 truncate'}>
                                  {m.playerA.name} ({m.playerA.deckPower}⚡)
                                </span>
                                <span className="text-[10px] text-zinc-500 px-1 shrink-0">vs</span>
                                <span className={m.winnerId === m.playerB.id ? 'font-black text-emerald-300 truncate' : 'text-zinc-200 truncate'}>
                                  {m.playerB.name} ({m.playerB.deckPower}⚡)
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {activeBracket.currentRound === 4 && (
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-black/50 p-3 text-xs">
                    <span className="font-black text-amber-300">
                      {activeBracket.championId === 'player_team'
                        ? `🏆 CHÚC MỪNG! Đội Shop vô địch & nhận Cúp + $${activeBracket.totalPrizePool} + Pack/Slab VIP!`
                        : `🥈 Giải kết thúc — Nhà vô địch: ${activeBracket.championName}.`}
                    </span>
                    {onStartTournamentBracket && (
                      <button
                        onClick={() => {
                          const cfg = TOURNAMENT_TIERS[tourTier];
                          if (storeCash >= cfg.entryFee) {
                            onStartTournamentBracket(tourFormat, tourTier, effectiveTeam);
                          }
                        }}
                        disabled={storeCash < TOURNAMENT_TIERS[tourTier].entryFee}
                        className="rounded-lg bg-amber-500 px-3 py-1.5 text-[11px] font-black text-black hover:bg-amber-400 disabled:opacity-40 cursor-pointer"
                      >
                        Mở Giải Mới (${TOURNAMENT_TIERS[tourTier].entryFee})
                      </button>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <div className="text-[11px] font-bold text-zinc-400 mb-1">1. Hệ Giải Đấu</div>
                    <div className="grid grid-cols-2 gap-2">
                      {(['pokemon', 'onepiece'] as TournamentFormat[]).map((f) => (
                        <button
                          key={f}
                          onClick={() => {
                            setTourFormat(f);
                            setSelectedTeamIds([]);
                          }}
                          className={`rounded-xl border py-2 text-xs font-black cursor-pointer ${
                            tourFormat === f
                              ? 'border-sky-400 bg-sky-500/20 text-sky-200'
                              : 'border-zinc-800 bg-zinc-950 text-zinc-400'
                          }`}
                        >
                          {f === 'pokemon' ? '⚡ Pokémon TCG' : '🏴‍☠️ One Piece TCG'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="text-[11px] font-bold text-zinc-400 mb-1">2. Hạng Giải (8 Đội · Thưởng Tiền + Pack/Slab)</div>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(['local', 'regional', 'grand_prix'] as TournamentTierId[]).map((t) => {
                        const cfg = TOURNAMENT_TIERS[t];
                        const bonusText =
                          t === 'grand_prix' ? '+5 Pack & BGS 10' : t === 'regional' ? '+3 Pack & Slab' : '+2 Pack VIP';
                        return (
                          <button
                            key={t}
                            onClick={() => setTourTier(t)}
                            className={`rounded-xl border p-1.5 text-center cursor-pointer ${
                              tourTier === t
                                ? 'border-amber-400 bg-amber-500/20 text-amber-200'
                                : 'border-zinc-800 bg-zinc-950 text-zinc-400'
                            }`}
                          >
                            <div className="text-[10px] font-black">{t === 'local' ? 'Local' : t === 'regional' ? 'Regional' : 'Grand Prix'}</div>
                            <div className="text-[10px] text-emerald-300 font-bold">Phí ${cfg.entryFee}</div>
                            <div className="text-[9px] text-amber-300 font-semibold">{bonusText}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-[11px] text-zinc-400 mb-1.5">
                    <span>3. Chọn Tối Đa 3 Thẻ Chủ Lực (Mặc định tự chọn 3 thẻ mạnh nhất trong Binder/Slab):</span>
                    <span className="font-black text-amber-300">Sức Mạnh Đội: {estimatedTeamPower}⚡</span>
                  </div>
                  {candidateDeckCards.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-zinc-700 p-3 text-center text-[11px] text-zinc-400">
                      Chưa có thẻ nào hệ này — hệ thống sẽ dùng Bộ Bài Thuê Chuẩn (Power: {estimatedTeamPower}⚡).
                    </div>
                  ) : (
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {candidateDeckCards.map((item) => {
                        const isPicked = selectedTeamIds.includes(item.key);
                        return (
                          <button
                            key={item.key}
                            onClick={() => {
                              setSelectedTeamIds((prev) =>
                                prev.includes(item.key)
                                  ? prev.filter((k) => k !== item.key)
                                  : prev.length >= 3
                                  ? [...prev.slice(1), item.key]
                                  : [...prev, item.key]
                              );
                            }}
                            className={`shrink-0 w-28 rounded-xl border p-2 text-left transition cursor-pointer ${
                              isPicked
                                ? 'border-amber-400 bg-amber-500/20'
                                : 'border-zinc-800 bg-zinc-950 hover:border-zinc-700'
                            }`}
                          >
                            <div className="text-[10px] font-black text-white truncate">{item.card.name}</div>
                            <div className="text-[10px] text-emerald-300">
                              ${item.card.marketPrice} {item.slabGrade ? `· Slab ${item.slabGrade}` : ''}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {onStartTournamentBracket && (
                  <button
                    onClick={() => {
                      soundManager.playRarePullFanfare();
                      onStartTournamentBracket(tourFormat, tourTier, effectiveTeam);
                    }}
                    disabled={storeCash < TOURNAMENT_TIERS[tourTier].entryFee}
                    className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 py-2.5 text-xs font-black text-black shadow-lg hover:brightness-110 disabled:opacity-40 cursor-pointer"
                  >
                    ⚔️ Khai Mạc Giải Đấu 8 Đội (Lệ Phí ${TOURNAMENT_TIERS[tourTier].entryFee} · Giải Thưởng ${TOURNAMENT_TIERS[tourTier].entryFee * 8 + TOURNAMENT_TIERS[tourTier].prizePoolBonus})
                  </button>
                )}
              </div>
            )}
          </div>
        ) : activeTab === 'matches' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-1">
            {/* MATCH 1: TABLE 1 */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4 relative overflow-hidden">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Bàn Số 1: Trận Đấu Tiêu Điểm
                  </span>
                </div>
                <span className="text-[11px] text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                  Lượt 8 • Best of 3
                </span>
              </div>

              {/* Opponents */}
              <div className="space-y-3 mt-3">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-800/80">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-lg bg-red-600 flex items-center justify-center text-sm font-black">
                      🔥
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">Tuấn Charizard (Áo vest kem)</div>
                      <div className="text-[10px] text-zinc-400">Deck: Charizard ex Darkness Ablaze</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-emerald-400">2 Prize Còn Lại</span>
                    <div className="text-[10px] text-zinc-500">Đã thanh toán $5</div>
                  </div>
                </div>

                <div className="flex items-center justify-center">
                  <span className="text-[10px] font-black tracking-widest text-zinc-500 uppercase px-2 py-0.5 rounded bg-zinc-800">
                    VS
                  </span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-800/80">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-lg bg-yellow-500 text-black flex items-center justify-center text-sm font-black">
                      ⚡
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">Minh Kính Cận (Áo sơ mi sọc xanh)</div>
                      <div className="text-[10px] text-zinc-400">Deck: Miraidon ex Lightning Acceleration</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-amber-400">3 Prize Còn Lại</span>
                    <div className="text-[10px] text-zinc-500">Đã thanh toán $5</div>
                  </div>
                </div>
              </div>
            </div>

            {/* MATCH 2: TABLE 2 */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4 relative overflow-hidden">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Bàn Số 2: Trận Đấu Huyền Thoại
                  </span>
                </div>
                <span className="text-[11px] text-purple-400 font-bold bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                  Lượt 5 • Sudden Death
                </span>
              </div>

              {/* Opponents */}
              <div className="space-y-3 mt-3">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-800/80">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center text-sm font-black">
                      👁️
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">Alex Trọc (Áo hoodie xanh navy)</div>
                      <div className="text-[10px] text-zinc-400">Deck: Mewtwo VSTAR Psychic Embrace</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-emerald-400">1 Prize Còn Lại</span>
                    <div className="text-[10px] text-zinc-500">Đã thanh toán $5</div>
                  </div>
                </div>

                <div className="flex items-center justify-center">
                  <span className="text-[10px] font-black tracking-widest text-zinc-500 uppercase px-2 py-0.5 rounded bg-zinc-800">
                    VS
                  </span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-800/80">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-lg bg-sky-600 flex items-center justify-center text-sm font-black">
                      🌊
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">Huy Eevee (Áo phông xám)</div>
                      <div className="text-[10px] text-zinc-400">Deck: Lugia VSTAR Archeops Energy</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-sky-400">2 Prize Còn Lại</span>
                    <div className="text-[10px] text-zinc-500">Đã thanh toán $5</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* SETTINGS TAB */
          <div className="space-y-4 my-2">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
              <label className="text-xs font-bold text-zinc-300 block mb-2">
                Chọn Mức Phí Thuê Bàn Chơi ($/Giờ Mỗi Người):
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[3, 5, 8, 10].map((rate) => (
                  <button
                    key={rate}
                    onClick={() => handlePriceSelect(rate)}
                    className={`py-3 rounded-xl border text-center transition cursor-pointer ${
                      currentFee === rate
                        ? 'border-emerald-400 bg-emerald-500/20 text-emerald-300 font-black shadow-md'
                        : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white hover:border-zinc-700'
                    }`}
                  >
                    <div className="text-base font-black">${rate}.00</div>
                    <div className="text-[10px]">
                      {rate === 5 ? '(Mặc định chuẩn)' : rate > 5 ? '(VIP Premium)' : '(Khuyến mãi)'}
                    </div>
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-zinc-500 mt-2">
                * Mức giá $5/giờ là tiêu chuẩn vàng của TCG Card Shop Simulator. Khách hàng sẽ vui vẻ trả tiền đều đặn mỗi giờ chơi!
              </p>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-zinc-800 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={handleTournamentClick}
              disabled={tournamentHosted || storeCash < 50}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                tournamentHosted
                  ? 'bg-zinc-800 text-zinc-500 border border-zinc-700 cursor-not-allowed'
                  : storeCash < 50
                  ? 'bg-zinc-900 text-zinc-600 border border-zinc-800 cursor-not-allowed'
                  : 'bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-black hover:brightness-110 shadow-lg shadow-amber-500/20'
              }`}
            >
              <Trophy className="h-4 w-4" />
              {tournamentHosted ? 'Đang Tổ Chức Giải Đấu (+20 Uy Tín)' : 'Tổ Chức Giải Đấu Tuần (Phí $50)'}
            </button>

            <button
              onClick={handleRefreshmentsClick}
              disabled={servedRefreshments || storeCash < 15}
              className={`px-3.5 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                servedRefreshments
                  ? 'bg-zinc-800 text-zinc-500 border border-zinc-700 cursor-not-allowed'
                  : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700'
              }`}
            >
              <Coffee className="h-4 w-4 text-amber-400" />
              {servedRefreshments ? 'Đã Tiếp Nước Uống' : 'Phục Vụ Nước & Snack ($15)'}
            </button>
          </div>

          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg transition cursor-pointer"
          >
            Đóng Lại
          </button>
        </div>
      </div>
    </div>
  );
};
