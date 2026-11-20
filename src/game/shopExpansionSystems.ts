import {
  ALL_UNIQUE_BOOSTER_SETS,
  BoosterSetInfo,
  DailyMarketTrend,
  GradedSlab,
  GradingCompany,
  InventoryItem,
  ONEPIECE_CARDS_DB,
  OwnedGradedSlabEntry,
  POCKET_RARITY_RANK,
  POKEMON_CARDS_DB,
  PokemonCard,
  ShopState,
  getBoosterSetCards,
  isStaffWorkingHours,
  ripBoosterBoxWithMetadata,
  ripBoosterPackWithMetadata,
} from './pokemonShopLogic';
import { ALL_ONEPIECE_BOOSTER_SETS } from './onePieceData';
import { CITY_POIS } from './cityMapData';

// ==========================================
// 1. LIVE TOURNAMENT CIRCUIT & TROPHIES
// ==========================================
export type TournamentFormat = 'pokemon' | 'onepiece';
export type TournamentTierId = 'local' | 'regional' | 'grand_prix';

export interface TournamentTierConfig {
  id: TournamentTierId;
  name: string;
  entryFee: number;
  prizePoolBonus: number;
  repReward: number;
  xpReward: number;
  npcPowerRange: [number, number];
  trophyTitle: string;
  trophyColor: string;
}

export const TOURNAMENT_TIERS: Record<TournamentTierId, TournamentTierConfig> = {
  local: {
    id: 'local',
    name: 'Giải Tuần Cục Bộ (Local Cup)',
    entryFee: 25,
    prizePoolBonus: 60,
    repReward: 2,
    xpReward: 75,
    npcPowerRange: [35, 115],
    trophyTitle: 'Cúp Bạc Local Challenger',
    trophyColor: '#94a3b8',
  },
  regional: {
    id: 'regional',
    name: 'Giải Khu Vực Ocean Park (Regional)',
    entryFee: 75,
    prizePoolBonus: 220,
    repReward: 4,
    xpReward: 160,
    npcPowerRange: [95, 220],
    trophyTitle: 'Cúp Vàng Regional Champion',
    trophyColor: '#fbbf24',
  },
  grand_prix: {
    id: 'grand_prix',
    name: 'Grand Prix Landmark 81 (Master)',
    entryFee: 200,
    prizePoolBonus: 650,
    repReward: 8,
    xpReward: 340,
    npcPowerRange: [175, 360],
    trophyTitle: 'Cúp Bạch Kim Grand Master',
    trophyColor: '#38bdf8',
  },
};

export interface TournamentParticipant {
  id: string;
  name: string;
  isPlayer: boolean;
  deckPower: number;
  highlightCardName: string;
}

export interface TournamentMatch {
  id: string;
  round: 1 | 2 | 3; // 1: Tứ kết, 2: Bán kết, 3: Chung kết
  playerA: TournamentParticipant;
  playerB: TournamentParticipant;
  winnerId?: string;
  scoreLabel?: string;
}

export interface TournamentBracketState {
  id: string;
  format: TournamentFormat;
  tier: TournamentTierId;
  entryFee: number;
  totalPrizePool: number;
  currentRound: 1 | 2 | 3 | 4; // 4 = completed
  matches: TournamentMatch[];
  playerEliminated: boolean;
  championId?: string;
  championName?: string;
  selectedCardNames: string[];
  startedAt: number;
}

export interface TournamentTrophy {
  id: string;
  title: string;
  format: TournamentFormat;
  tier: TournamentTierId;
  prizeWon: number;
  color: string;
  wonAt: number;
}

const TOURNAMENT_NPC_PLAYERS = [
  'Minh Khôi TCG',
  'Satoshi Quận 1',
  'Hải Tặc Luffy99',
  'Ngọc Ánh Collector',
  'Quốc Bảo Ocean',
  'Kaito Tokyo',
  'Tuấn Anh Meta',
  'Hoàng Long VIP',
  'Yuki Sài Gòn',
];

export function computeTeamDeckPower(
  cards: Array<{ card: PokemonCard; slabGrade?: number }>
): number {
  if (!cards || cards.length === 0) return 45;
  return Math.round(
    cards.reduce((sum, item) => {
      const rarityRank = POCKET_RARITY_RANK[item.card.pocketRarity] || 1;
      const priceScore = Math.min(85, Math.sqrt(Math.max(1, item.card.marketPrice || 1)) * 3.8);
      const slabBonus = item.slabGrade ? (item.slabGrade >= 10 ? 36 : item.slabGrade >= 9.5 ? 24 : 14) : 0;
      return sum + rarityRank * 10 + priceScore + slabBonus;
    }, 0)
  );
}

export function createTournamentBracket(params: {
  format: TournamentFormat;
  tier: TournamentTierId;
  playerDeckCards: Array<{ card: PokemonCard; slabGrade?: number }>;
  rng?: () => number;
}): TournamentBracketState {
  const { format, tier, playerDeckCards, rng = Math.random } = params;
  const cfg = TOURNAMENT_TIERS[tier];
  const playerPower = computeTeamDeckPower(playerDeckCards);
  const playerHighlight = playerDeckCards[0]?.card.name || (format === 'onepiece' ? 'Monkey D. Luffy' : 'Charizard ex');

  const shuffledNames = [...TOURNAMENT_NPC_PLAYERS].sort(() => rng() - 0.5).slice(0, 7);
  const participants: TournamentParticipant[] = [
    {
      id: 'player_team',
      name: 'Đội Shop Của Bạn',
      isPlayer: true,
      deckPower: playerPower,
      highlightCardName: playerHighlight,
    },
    ...shuffledNames.map((npcName, idx) => {
      const [minP, maxP] = cfg.npcPowerRange;
      const deckPower = Math.round(minP + rng() * (maxP - minP));
      return {
        id: `npc_t_${idx + 1}`,
        name: npcName,
        isPlayer: false,
        deckPower,
        highlightCardName: format === 'onepiece' ? 'Gear 5 / Shanks Deck' : 'Charizard / Mew Meta',
      };
    }),
  ];

  // Pair 8 participants into 4 quarterfinal matches
  const qfMatches: TournamentMatch[] = [0, 1, 2, 3].map((i) => ({
    id: `qf_${i + 1}`,
    round: 1,
    playerA: participants[i * 2],
    playerB: participants[i * 2 + 1],
  }));

  return {
    id: `tour_${Date.now()}_${Math.floor(rng() * 1000)}`,
    format,
    tier,
    entryFee: cfg.entryFee,
    totalPrizePool: cfg.entryFee * 8 + cfg.prizePoolBonus,
    currentRound: 1,
    matches: qfMatches,
    playerEliminated: false,
    selectedCardNames: playerDeckCards.map((c) => c.card.name),
    startedAt: Date.now(),
  };
}

function resolveTournamentMatch(
  match: TournamentMatch,
  rng: () => number
): TournamentMatch {
  const powerA = Math.max(10, match.playerA.deckPower);
  const powerB = Math.max(10, match.playerB.deckPower);
  const winProbA = Math.min(0.86, Math.max(0.18, powerA / (powerA + powerB)));
  const aWins = rng() < winProbA;
  const winner = aWins ? match.playerA : match.playerB;
  const scoreLabel = rng() < 0.55 ? '2 - 0' : '2 - 1';
  return {
    ...match,
    winnerId: winner.id,
    scoreLabel,
  };
}

export function advanceTournamentRound(
  bracket: TournamentBracketState,
  rng: () => number = Math.random
): {
  nextBracket: TournamentBracketState;
  playerWonMatch: boolean;
  completed: boolean;
  playerIsChampion: boolean;
  payout: number;
  trophy?: TournamentTrophy;
} {
  if (bracket.currentRound >= 4) {
    return {
      nextBracket: bracket,
      playerWonMatch: false,
      completed: true,
      playerIsChampion: bracket.championId === 'player_team',
      payout: 0,
    };
  }

  const activeRound = bracket.currentRound as 1 | 2 | 3;
  const resolvedRoundMatches: TournamentMatch[] = [];
  const otherMatches: TournamentMatch[] = [];

  for (const m of bracket.matches) {
    if (m.round === activeRound && !m.winnerId) {
      resolvedRoundMatches.push(resolveTournamentMatch(m, rng));
    } else {
      otherMatches.push(m);
    }
  }

  const allMatches = [...otherMatches, ...resolvedRoundMatches];
  const playerMatch = resolvedRoundMatches.find(
    (m) => m.playerA.isPlayer || m.playerB.isPlayer
  );
  const playerWonMatch = Boolean(playerMatch && playerMatch.winnerId === 'player_team');
  const playerEliminated =
    bracket.playerEliminated || Boolean(playerMatch && !playerWonMatch);

  // Build next round matches if round 1 -> 2 or round 2 -> 3
  if (activeRound < 3) {
    const winners = resolvedRoundMatches.map((m) =>
      m.winnerId === m.playerA.id ? m.playerA : m.playerB
    );
    const nextRound = (activeRound + 1) as 2 | 3;
    const nextRoundMatches: TournamentMatch[] = [];
    for (let i = 0; i < winners.length; i += 2) {
      if (winners[i] && winners[i + 1]) {
        nextRoundMatches.push({
          id: `r${nextRound}_${i / 2 + 1}`,
          round: nextRound,
          playerA: winners[i],
          playerB: winners[i + 1],
        });
      }
    }
    return {
      nextBracket: {
        ...bracket,
        currentRound: nextRound,
        matches: [...allMatches, ...nextRoundMatches],
        playerEliminated,
      },
      playerWonMatch,
      completed: false,
      playerIsChampion: false,
      payout: 0,
    };
  }

  // Final round completed
  const finalMatch = resolvedRoundMatches[0];
  const champion =
    finalMatch?.winnerId === finalMatch?.playerA.id
      ? finalMatch.playerA
      : finalMatch?.playerB;
  const playerIsChampion = champion?.id === 'player_team';
  const cfg = TOURNAMENT_TIERS[bracket.tier];
  const payout = playerIsChampion
    ? bracket.totalPrizePool
    : !bracket.playerEliminated
    ? Math.round(bracket.totalPrizePool * 0.25) // Runner-up consolation 25%
    : 0;

  const trophy: TournamentTrophy | undefined = playerIsChampion
    ? {
        id: `trophy_${Date.now()}_${Math.floor(rng() * 1000)}`,
        title: `${cfg.trophyTitle} (${bracket.format === 'onepiece' ? 'One Piece' : 'Pokémon'})`,
        format: bracket.format,
        tier: bracket.tier,
        prizeWon: payout,
        color: cfg.trophyColor,
        wonAt: Date.now(),
      }
    : undefined;

  return {
    nextBracket: {
      ...bracket,
      currentRound: 4,
      matches: allMatches,
      playerEliminated,
      championId: champion?.id,
      championName: champion?.name,
    },
    playerWonMatch,
    completed: true,
    playerIsChampion,
    payout,
    trophy,
  };
}

export function getTrophyBuffs(trophies: TournamentTrophy[] = []): {
  reputationBonus: number;
  tableRentalBonusPct: number;
} {
  const count = trophies.length;
  return {
    reputationBonus: Math.min(15, count * 2),
    tableRentalBonusPct: Math.min(60, count * 10),
  };
}

export interface TournamentPrizeReward {
  bonusCash: number;
  bonusPackProductId: string;
  bonusPackCount: number;
  bonusSlab?: OwnedGradedSlabEntry;
  summaryText: string;
}

export function rollTournamentBonusReward(params: {
  format: TournamentFormat;
  tier: TournamentTierId;
  rng?: () => number;
}): TournamentPrizeReward {
  const { format, tier, rng = Math.random } = params;
  const isOp = format === 'onepiece';
  const bonusPackProductId = isOp ? 'op09Emperors_pack' : 'pokemon30thCommon_pack';
  const bonusPackCount = tier === 'grand_prix' ? 5 : tier === 'regional' ? 3 : 2;
  const bonusCash = tier === 'grand_prix' ? 120 : tier === 'regional' ? 45 : 15;

  // Regional & Grand Prix award a guaranteed trophy-tier Graded Slab Prize!
  let bonusSlab: OwnedGradedSlabEntry | undefined;
  if (tier === 'regional' || tier === 'grand_prix') {
    const db = isOp ? ONEPIECE_CARDS_DB : POKEMON_CARDS_DB;
    const minPrice = tier === 'grand_prix' ? 90 : 35;
    const pool = db.filter((c) => (c.marketPrice || 0) >= minPrice);
    const pickedCard = (pool.length > 0 ? pool : db)[Math.floor(rng() * Math.max(1, (pool.length > 0 ? pool : db).length))];
    const company: GradingCompany = tier === 'grand_prix' ? 'BGS' : 'PSA';
    const grade = tier === 'grand_prix' ? 10 : rng() < 0.5 ? 10 : 9.5;
    const gradeLabel = company === 'BGS' && grade >= 10 ? 'BLACK LABEL 10' : grade >= 10 ? 'GEM MT 10' : 'GEM MINT 9.5';
    const rawPrice = Math.max(20, Math.round(pickedCard.marketPrice || 45));
    const gradedPrice = Math.round(rawPrice * (tier === 'grand_prix' ? 3.2 : 2.1));
    const certNum = `${Math.floor(70000000 + rng() * 29999999)}`;
    bonusSlab = {
      id: `tour_slab_${Date.now()}_${Math.floor(rng() * 10000)}`,
      card: pickedCard,
      rawPrice,
      gradedPrice,
      gradedAt: Date.now(),
      slab: {
        company,
        grade,
        gradeLabel,
        certNumber: certNum,
        year: new Date().getFullYear(),
        isCertFancy: certNum.endsWith('777') || certNum.endsWith('888'),
        subgrades: {
          centering: grade,
          corners: grade,
          edges: grade >= 10 ? 10 : 9.5,
          surface: grade,
          centeringRatio: '50/50 · 50/50',
          notes: 'Championship Prize Trophy Slab',
        },
        slabGuardColor: tier === 'grand_prix' ? 'gold' : 'emerald',
      },
    };
  }

  const summaryText = bonusSlab
    ? `+${bonusPackCount} Pack VIP & Slab ${bonusSlab.slab.company} ${bonusSlab.slab.gradeLabel} (${bonusSlab.card.name})`
    : `+${bonusPackCount} Pack VIP thưởng giải`;

  return {
    bonusCash,
    bonusPackProductId,
    bonusPackCount,
    bonusSlab,
    summaryText,
  };
}

// ==========================================
// 2. TCG MARKET PULSE & SPECULATION NEWS
// ==========================================
export type MarketPulseTarget =
  | 'pokemon_30th'
  | 'pokemon_151'
  | 'onepiece_all'
  | 'crown_star3'
  | 'bgs_psa10'
  | 'vintage_dip';

export interface MarketPulseEvent {
  id: string;
  headline: string;
  advice: string;
  badge: string;
  target: MarketPulseTarget;
  multiplier: number; // e.g., 1.38 for +38% surge, 0.78 for -22% dip
  isBullish: boolean;
}

export const MARKET_PULSE_CATALOG: MarketPulseEvent[] = [
  {
    id: 'pulse_op_movie',
    headline: 'Anime One Piece ra tập Gear 5 đặc biệt — Săn lùng OP05 & OP09!',
    advice: 'Bán thẻ/Slab One Piece ngay hoặc mở Live Box Break OP để tối đa lãi.',
    badge: '+35% ONE PIECE',
    target: 'onepiece_all',
    multiplier: 1.35,
    isBullish: true,
  },
  {
    id: 'pulse_30th_hype',
    headline: 'Triển lãm Pokémon 30th Anniversary bùng nổ tại Landmark 81!',
    advice: 'Các thẻ Kỷ Niệm 30 Năm & Mew RGB đang tăng trần trên sàn.',
    badge: '+32% 30TH SET',
    target: 'pokemon_30th',
    multiplier: 1.32,
    isBullish: true,
  },
  {
    id: 'pulse_151_out_of_print',
    headline: 'Tin đồn Scarlet & Violet 151 ngừng tái bản đợt cuối!',
    advice: 'Gom Charizard/Mew 151 và đẩy lên Sàn Đấu Giá VIP.',
    badge: '+28% SV 151',
    target: 'pokemon_151',
    multiplier: 1.28,
    isBullish: true,
  },
  {
    id: 'pulse_grail_whale',
    headline: 'Hội Đại Gia Châu Á đổ bộ săn thẻ Crown 👑 & Immersive ☆☆☆!',
    advice: 'Đưa ngay thẻ 3 Sao / Crown lên Kệ Trưng Bày hoặc Sàn Đấu Giá.',
    badge: '+40% GRAIL',
    target: 'crown_star3',
    multiplier: 1.4,
    isBullish: true,
  },
  {
    id: 'pulse_slab_boom',
    headline: 'Cơn sốt Slab BGS Black Label & PSA 10 lan rộng giới đầu tư!',
    advice: 'Đẩy mạnh chấm điểm và ký gửi Slab 10 ngay hôm nay.',
    badge: '+25% SLAB 10',
    target: 'bgs_psa10',
    multiplier: 1.25,
    isBullish: true,
  },
  {
    id: 'pulse_vintage_dip',
    headline: 'Đợt xả hàng ngắn hạn — Giá thu mua Raw trên chợ hạ nhiệt -18%!',
    advice: 'Cơ hội vàng đi Săn Hàng Hiếm & Thu Mua Buyback giá rẻ để ôm chờ sóng.',
    badge: '-18% GIÁ GOM',
    target: 'vintage_dip',
    multiplier: 0.82,
    isBullish: false,
  },
];

export function rollDailyMarketPulses(
  day: number,
  rng?: () => number
): MarketPulseEvent[] {
  const pool = [...MARKET_PULSE_CATALOG];
  if (rng) {
    const firstIdx = Math.floor(rng() * pool.length);
    const first = pool.splice(firstIdx, 1)[0];
    const second = pool[Math.floor(rng() * pool.length)];
    return [first, second];
  }
  const idxA = Math.abs(day || 1) % pool.length;
  const idxB = (idxA + 2) % pool.length;
  return [pool[idxA], pool[idxB]];
}

export function getMarketPulseMultiplierForCard(
  card: PokemonCard,
  pulses: MarketPulseEvent[] = [],
  slab?: GradedSlab
): { multiplier: number; matchedPulse?: MarketPulseEvent } {
  if (!pulses || pulses.length === 0) return { multiplier: 1 };
  let bestMult = 1;
  let matchedPulse: MarketPulseEvent | undefined;
  const setLower = (card.setName || '').toLowerCase();

  for (const p of pulses) {
    let matches = false;
    if (p.target === 'onepiece_all' && card.universe === 'onepiece') matches = true;
    else if (p.target === 'pokemon_30th' && setLower.includes('30th')) matches = true;
    else if (p.target === 'pokemon_151' && setLower.includes('151')) matches = true;
    else if (
      p.target === 'crown_star3' &&
      (card.pocketRarity === 'Crown' || card.pocketRarity === 'Star3')
    )
      matches = true;
    else if (p.target === 'bgs_psa10' && slab && slab.grade >= 10) matches = true;
    else if (p.target === 'vintage_dip') matches = true;

    if (matches && Math.abs(p.multiplier - 1) > Math.abs(bestMult - 1)) {
      bestMult = p.multiplier;
      matchedPulse = p;
    }
  }
  return { multiplier: bestMult, matchedPulse };
}

// ==========================================
// 3. CARD RESTORATION & COUNTERFEIT SCANNER
// ==========================================
export const COUNTERFEIT_SCAN_FEE = 8;
export const RESTORE_CARD_FEE = 18;
export const FAKE_REPORT_BOUNTY = 30;

export type CardConditionGrade = 'MP' | 'LP' | 'NM' | 'MINT';

export function scanCardCounterfeitCheck(params: {
  isCounterfeit: boolean;
}): {
  feePaid: number;
  isFake: boolean;
  bountyEligible: number;
  reportMessage: string;
} {
  return {
    feePaid: COUNTERFEIT_SCAN_FEE,
    isFake: params.isCounterfeit,
    bountyEligible: params.isCounterfeit ? FAKE_REPORT_BOUNTY : 0,
    reportMessage: params.isCounterfeit
      ? '🚨 PHÁT HIỆN THẺ GIẢ (FAKE PROXY)! Đường in lụa & lớp foil sai chuẩn. Hãy Báo Công An / Từ chối để nhận thưởng!'
      : '✅ ĐÈN UV XÁC NHẬN THẺ CHÍNH HÃNG 100%! Vân foil chuẩn xác, an tâm thu mua.',
  };
}

export function restoreCardCondition(params: {
  card: PokemonCard;
  currentCondition: CardConditionGrade;
  currentRawPrice: number;
  preGradeBonus?: number;
}): {
  feePaid: number;
  nextCondition: CardConditionGrade;
  nextRawPrice: number;
  nextPreGradeBonus: number;
  message: string;
} {
  const nextCondition: CardConditionGrade =
    params.currentCondition === 'MP'
      ? 'LP'
      : params.currentCondition === 'LP'
      ? 'NM'
      : 'MINT';
  const boostFactor =
    params.currentCondition === 'MP'
      ? 1.22
      : params.currentCondition === 'LP'
      ? 1.18
      : 1.12;
  const nextRawPrice = Math.max(
    params.currentRawPrice + 5,
    Math.round(params.currentRawPrice * boostFactor)
  );
  const nextPreGradeBonus = Number(
    Math.min(0.16, (params.preGradeBonus || 0) + 0.04).toFixed(3)
  );

  return {
    feePaid: RESTORE_CARD_FEE,
    nextCondition,
    nextRawPrice,
    nextPreGradeBonus,
    message: `✨ Đã ép phẳng & khử ẩm UV cho ${params.card.name}: ${params.currentCondition} → ${nextCondition} (+4% tỷ lệ Grade 10)!`,
  };
}

// ==========================================
// 4. LIVE BOX BREAK STREAMER
// ==========================================
export type LiveBreakSlotId =
  | 'fire_red'
  | 'water_blue'
  | 'lightning_yellow'
  | 'psychic_purple'
  | 'darkness_black'
  | 'dragon_gold';

export interface LiveBreakSlotInfo {
  id: LiveBreakSlotId;
  label: string;
  matchTypes: string[];
  colorHex: string;
}

export const LIVE_BREAK_SLOTS: LiveBreakSlotInfo[] = [
  { id: 'fire_red', label: 'Hệ Lửa / Đỏ', matchTypes: ['Fire', 'Fighting', 'Red'], colorHex: '#ef4444' },
  { id: 'water_blue', label: 'Hệ Nước / Xanh', matchTypes: ['Water', 'Blue'], colorHex: '#38bdf8' },
  { id: 'lightning_yellow', label: 'Hệ Điện / Vàng', matchTypes: ['Lightning', 'Yellow'], colorHex: '#facc15' },
  { id: 'psychic_purple', label: 'Hệ Tâm Linh / Tím', matchTypes: ['Psychic', 'Purple'], colorHex: '#c084fc' },
  { id: 'darkness_black', label: 'Hệ Bóng Tối / Đen', matchTypes: ['Darkness', 'Metal', 'Black'], colorHex: '#94a3b8' },
  { id: 'dragon_gold', label: 'Hệ Rồng / Cỏ / Đặc Biệt', matchTypes: ['Dragon', 'Grass', 'Colorless', 'Green', 'Multi'], colorHex: '#34d399' },
];

export interface LiveBoxBreakResult {
  setId: string;
  setName: string;
  boxWholesaleCost: number;
  slotPrice: number;
  slotsClaimed: number;
  slotBuyers: Array<{ slotId: LiveBreakSlotId; slotLabel: string; buyerName: string }>;
  slotRevenue: number;
  shopKeptCards: PokemonCard[];
  shopKeptValue: number;
  shippedHitsCount: number;
  totalHitsPulled: number;
  netProfit: number;
  viralFollowersGain: number;
  xpGain: number;
}

const STREAM_VIEWER_NAMES = [
  'Khánh Duy SG',
  'Tuấn Kiệt VIP',
  'Mèo Béo TCG',
  'Duy Hải Collector',
  'An Nhiên Ocean',
  'Nam Phong Stream',
  'Linh Chi 151',
];

export function executeLiveBoxBreak(params: {
  setId: string;
  slotPrice: number;
  viralFollowers: number;
  reputation: number;
  rng?: () => number;
}): LiveBoxBreakResult {
  const { setId, slotPrice, viralFollowers, reputation, rng = Math.random } = params;
  const allSets: BoosterSetInfo[] = [...ALL_UNIQUE_BOOSTER_SETS, ...ALL_ONEPIECE_BOOSTER_SETS];
  const setInfo = allSets.find((s) => s.id === setId) || ALL_UNIQUE_BOOSTER_SETS[0];
  const boxWholesaleCost = setInfo.boxWholesalePrice || 22.5;
  const boxRetailPrice = setInfo.boxRetailPrice || Math.round(boxWholesaleCost * 1.85);

  // Higher viral followers & reputation + fair pricing vs shop retail => more slots claimed
  const fairPriceAnchor = Math.max(4, boxRetailPrice / 6);
  const priceAppeal = Math.max(-0.25, Math.min(0.22, ((fairPriceAnchor - slotPrice) / fairPriceAnchor) * 0.35));
  const fillChance = Math.min(0.95, 0.45 + Math.min(0.3, viralFollowers / 1500) + reputation / 500 + priceAppeal);

  const slotBuyers: LiveBoxBreakResult['slotBuyers'] = [];
  LIVE_BREAK_SLOTS.forEach((slot, idx) => {
    if (rng() < fillChance || idx < 2) {
      slotBuyers.push({
        slotId: slot.id,
        slotLabel: slot.label,
        buyerName: STREAM_VIEWER_NAMES[Math.floor(rng() * STREAM_VIEWER_NAMES.length)],
      });
    }
  });

  const claimedSet = new Set(slotBuyers.map((b) => b.slotId));
  const slotRevenue = Math.round(slotBuyers.length * slotPrice);

  // Rip the real 9-pack box using existing game engine
  const boxResult = ripBoosterBoxWithMetadata(setInfo.id);
  const shopKeptCards: PokemonCard[] = [];
  let shippedHitsCount = 0;
  let totalHitsPulled = 0;

  for (const card of boxResult.hitCards) {
    totalHitsPulled += 1;
    const matchedSlot =
      LIVE_BREAK_SLOTS.find((s) =>
        s.matchTypes.some((t) => (card.type || '').toLowerCase().includes(t.toLowerCase()))
      ) || LIVE_BREAK_SLOTS[LIVE_BREAK_SLOTS.length - 1];

    if (claimedSet.has(matchedSlot.id)) {
      shippedHitsCount += 1;
    } else {
      shopKeptCards.push(card);
    }
  }

  const shopKeptValue = Math.round(
    shopKeptCards.reduce((sum, c) => sum + (c.marketPrice || 0), 0)
  );
  const netProfit = Math.round(slotRevenue - boxWholesaleCost);
  const viralFollowersGain = 18 + Math.min(45, totalHitsPulled * 4) + (slotBuyers.length >= 5 ? 12 : 0);
  const xpGain = 35 + slotBuyers.length * 6;

  return {
    setId: setInfo.id,
    setName: setInfo.name,
    boxWholesaleCost,
    slotPrice,
    slotsClaimed: slotBuyers.length,
    slotBuyers,
    slotRevenue,
    shopKeptCards,
    shopKeptValue,
    shippedHitsCount,
    totalHitsPulled,
    netProfit,
    viralFollowersGain,
    xpGain,
  };
}

export interface OwnedLiveBoosterBox {
  productId: string;
  setId: string;
  setName: string;
  universe: 'pokemon' | 'onepiece';
  quantity: number;
  shelvedQuantity: number;
  warehouseQuantity: number;
  packsPerBox: number;
  boxWholesalePrice: number;
  boxRetailPrice: number;
  packRetailPrice: number;
  imageUrl?: string;
}

export function getLiveBreakSlotPriceBounds(
  boxRetailPrice: number,
  boxWholesalePrice: number
): {
  recommendedSlotPrice: number;
  fairSlotAnchor: number;
  minSlotPrice: number;
  maxSlotPrice: number;
} {
  const safeWholesale = Math.max(12, boxWholesalePrice || 22.5);
  const effectiveRetail =
    boxRetailPrice > 0 ? boxRetailPrice : Math.round(safeWholesale * 1.85);
  const fairSlotAnchor = Math.max(4, effectiveRetail / 6);
  // Math.ceil ensures 6/6 sold slots always covers at least 100% of Shop Box Retail Price
  const recommendedSlotPrice = Math.max(4, Math.ceil(effectiveRetail / 6));
  const minSlotPrice = Math.max(3, Math.floor(safeWholesale / 6));
  const maxSlotPrice = Math.max(45, recommendedSlotPrice + 15, Math.ceil((effectiveRetail * 1.65) / 6));

  return {
    recommendedSlotPrice,
    fairSlotAnchor,
    minSlotPrice,
    maxSlotPrice,
  };
}

export interface LiveStreamPrerequisites {
  hasStudioRoom: boolean;
  hasStreamerHired: boolean;
  hasStreamerOnShift: boolean;
  ownedBoxes: OwnedLiveBoosterBox[];
  canGoLive: boolean;
  missingReasons: string[];
}

export interface LiveStreamSlotState {
  slotId: LiveBreakSlotId;
  label: string;
  matchTypes: string[];
  colorHex: string;
  price: number;
  status: 'available' | 'sold';
  buyerName?: string;
}

export interface LiveStreamChatMsg {
  id: string;
  sender: string;
  text: string;
  kind: 'chat' | 'bid' | 'hype' | 'hit' | 'system';
  timestamp: number;
}

export function getOwnedLiveBoosterBoxes(inventory: InventoryItem[] = []): OwnedLiveBoosterBox[] {
  const allSets: Array<{ info: BoosterSetInfo; universe: 'pokemon' | 'onepiece' }> = [
    ...ALL_UNIQUE_BOOSTER_SETS.map((info) => ({ info, universe: 'pokemon' as const })),
    ...ALL_ONEPIECE_BOOSTER_SETS.map((info) => ({ info, universe: 'onepiece' as const })),
  ];
  const result: OwnedLiveBoosterBox[] = [];
  for (const item of inventory) {
    if (item.type !== 'box' || (item.quantity || 0) <= 0) continue;
    const cleanId = item.productId.replace(/_box$/, '');
    const matched = allSets.find((s) => s.info.id === cleanId);
    if (!matched) continue;
    const totalQty = Math.max(0, item.quantity || 0);
    const shelvedQty = Math.max(0, Math.min(totalQty, item.shelvedQuantity || 0));
    const warehouseQty = Math.max(0, totalQty - shelvedQty);
    const boxWholesalePrice = matched.info.boxWholesalePrice || item.wholesaleCost || 22.5;
    const boxRetailPrice =
      (item.retailPrice || 0) > 0
        ? item.retailPrice
        : matched.info.boxRetailPrice || Math.round(boxWholesalePrice * 1.85);
    const matchingPackItem = inventory.find((p) => p.productId === `${matched.info.id}_pack`);
    const packRetailPrice =
      matchingPackItem && (matchingPackItem.retailPrice || 0) > 0
        ? matchingPackItem.retailPrice
        : matched.info.packRetailPrice ||
          Number((boxRetailPrice / (matched.info.packsPerBox || 9)).toFixed(2));
    result.push({
      productId: item.productId,
      setId: matched.info.id,
      setName: matched.info.name,
      universe: matched.universe,
      quantity: totalQty,
      shelvedQuantity: shelvedQty,
      warehouseQuantity: warehouseQty,
      packsPerBox: matched.info.packsPerBox || 9,
      boxWholesalePrice,
      boxRetailPrice,
      packRetailPrice,
      imageUrl: matched.info.boxImageUrl || item.imageUrl,
    });
  }
  return result;
}

export function checkLiveBreakPrerequisites(
  state: Pick<ShopState, 'liveStudioUnlocked' | 'hiredStaff' | 'inGameHour' | 'inGameMinute' | 'inventory' | 'storeLevel'>
): LiveStreamPrerequisites {
  const hasStudioRoom = Boolean(state.liveStudioUnlocked);
  const hasStreamerHired = (state.hiredStaff?.liveStreamer || 0) > 0;
  const hasStreamerOnShift =
    hasStreamerHired && isStaffWorkingHours(state.inGameHour, state.inGameMinute);
  const ownedBoxes = getOwnedLiveBoosterBoxes(state.inventory || []);

  const missingReasons: string[] = [];
  if (!hasStudioRoom) {
    missingReasons.push('Chưa xây Phòng Live Studio tại Shop 3D (Mở ở Cấp 6, $650).');
  }
  if (!hasStreamerHired) {
    missingReasons.push('Chưa thuê Nhân Viên Livestream để đứng live (Thuê ở App Nhân Viên).');
  } else if (!hasStreamerOnShift) {
    missingReasons.push('Nhân Viên Livestream đã hết ca trực (Làm việc 07:00 – 22:00).');
  }
  if (ownedBoxes.length === 0) {
    missingReasons.push('Kho chưa có Booster Box thật nào để khui (Đặt hàng sỉ ở Tablet Supply).');
  }

  return {
    hasStudioRoom,
    hasStreamerHired,
    hasStreamerOnShift,
    ownedBoxes,
    canGoLive: hasStudioRoom && hasStreamerOnShift && ownedBoxes.length > 0,
    missingReasons,
  };
}

export function createLiveStreamSlots(slotPrice: number): LiveStreamSlotState[] {
  const safePrice = Math.max(2, Math.round(slotPrice));
  return LIVE_BREAK_SLOTS.map((s) => ({
    slotId: s.id,
    label: s.label,
    matchTypes: s.matchTypes,
    colorHex: s.colorHex,
    price: safePrice,
    status: 'available',
  }));
}

const LIVE_CASUAL_CHATS = [
  'Hello shop ơi, hôm nay khui set gì thế?',
  'Vừa mới vô live, chúc shop nổ hit to nha 🔥',
  'Mạng nét căng quá, soi kỹ seal hộp giúp em với!',
  'Đợi anh em chốt nốt slot rồi xé box nào!',
  'Hôm qua live nổ Charizard ghê thật sự 😍',
  'Có hệ Lửa / Rồng không shop?',
];

const LIVE_EXPENSIVE_CHATS = [
  'Giá slot hơi cao xíu shop ơi, giảm nhẹ đi!',
  'Chờ flash sale xem sao chứ giá này hơi căng 😅',
  'Box này giá thị trường mềm hơn chút á shop...',
];

export function getSlotAssignedPackNumbers(
  slotIndex: number,
  packsPerBox: number = 9,
  slotCount: number = LIVE_BREAK_SLOTS.length
): number[] {
  const safeCount = Math.max(1, slotCount);
  const safePacks = Math.max(1, packsPerBox);
  const packs: number[] = [];
  for (let p = 1; p <= safePacks; p++) {
    if ((p - 1) % safeCount === slotIndex) {
      packs.push(p);
    }
  }
  return packs;
}

export function consumeLiveBoxFromInventory(
  inventory: InventoryItem[] = [],
  productId: string
): {
  updatedInventory: InventoryItem[];
  consumed: boolean;
  deductedFromShelf: boolean;
  remainingShelved: number;
  remainingTotal: number;
} {
  const target = inventory.find((i) => i.productId === productId && (i.quantity || 0) >= 1);
  if (!target) {
    return {
      updatedInventory: inventory,
      consumed: false,
      deductedFromShelf: false,
      remainingShelved: 0,
      remainingTotal: 0,
    };
  }

  let deductedFromShelf = false;
  let remainingShelved = 0;
  let remainingTotal = 0;

  const updatedInventory = inventory.map((item) => {
    if (item.productId !== productId) return item;
    const prevQty = Math.max(0, item.quantity || 0);
    const prevShelved = Math.max(0, Math.min(prevQty, item.shelvedQuantity || 0));
    const nextQty = Math.max(0, prevQty - 1);
    deductedFromShelf = prevShelved > 0;
    // Deduct directly from the shop display shelf first if any units are on shelves
    const nextShelved = deductedFromShelf
      ? Math.min(nextQty, Math.max(0, prevShelved - 1))
      : 0;
    remainingShelved = nextShelved;
    remainingTotal = nextQty;
    return {
      ...item,
      quantity: nextQty,
      shelvedQuantity: nextShelved,
    };
  });

  return {
    updatedInventory,
    consumed: true,
    deductedFromShelf,
    remainingShelved,
    remainingTotal,
  };
}

export function tickLiveWaitingRoom(params: {
  tickIndex: number;
  currentViewers: number;
  slots: LiveStreamSlotState[];
  boxWholesalePrice: number;
  boxRetailPrice?: number;
  viralFollowers: number;
  reputation: number;
  boxSetName?: string;
  packsPerBox?: number;
  hypeBoostActive?: boolean;
  rng?: () => number;
}): {
  nextViewers: number;
  nextSlots: LiveStreamSlotState[];
  newMessages: LiveStreamChatMsg[];
  soldSlot?: LiveStreamSlotState;
} {
  const {
    tickIndex,
    currentViewers,
    slots,
    boxWholesalePrice,
    boxRetailPrice,
    viralFollowers,
    reputation,
    boxSetName,
    packsPerBox = 9,
    hypeBoostActive = false,
    rng = Math.random,
  } = params;

  const newMessages: LiveStreamChatMsg[] = [];
  const now = Date.now();

  // Gradual realistic viewer growth (never spikes instantly on tick 0)
  const targetMaxViewers =
    14 +
    Math.min(70, Math.round(viralFollowers / 18)) +
    Math.round((reputation || 50) * 0.28) +
    (hypeBoostActive ? 16 : 0);
  const rampStep =
    currentViewers < targetMaxViewers
      ? Math.max(1, Math.round(1 + rng() * (hypeBoostActive ? 5 : 3)))
      : Math.round((rng() - 0.45) * 2);
  const nextViewers = Math.max(1, Math.min(targetMaxViewers + 10, currentViewers + rampStep));

  const unsold = slots.filter((s) => s.status === 'available');
  const avgUnsoldPrice =
    unsold.length > 0
      ? unsold.reduce((sum, s) => sum + s.price, 0) / unsold.length
      : slots[0]?.price || 8;
  const effectiveRetail =
    boxRetailPrice && boxRetailPrice > 0
      ? boxRetailPrice
      : Math.round((boxWholesalePrice || 22.5) * 1.85);
  const fairPriceAnchor = Math.max(4, effectiveRetail / 6);
  const priceRatio = avgUnsoldPrice / fairPriceAnchor;

  // Warm-up period (first 3 ticks ~ 4s): viewers arrive and greet, ZERO instant buys
  if (tickIndex <= 2) {
    if (tickIndex === 0) {
      newMessages.push({
        id: `chat_${now}_sys0`,
        sender: 'Hệ Thống Live',
        text: '📡 Đã kết nối camera Phòng Live Studio! Người xem thành phố đang kéo vào...',
        kind: 'system',
        timestamp: now,
      });
    } else if (rng() < 0.85) {
      const viewer = STREAM_VIEWER_NAMES[Math.floor(rng() * STREAM_VIEWER_NAMES.length)];
      const line = LIVE_CASUAL_CHATS[Math.floor(rng() * LIVE_CASUAL_CHATS.length)];
      newMessages.push({
        id: `chat_${now}_${tickIndex}`,
        sender: viewer,
        text: line,
        kind: 'chat',
        timestamp: now,
      });
    }
    return { nextViewers, nextSlots: slots, newMessages };
  }

  // Organic chat comment
  if (rng() < 0.55) {
    const viewer = STREAM_VIEWER_NAMES[Math.floor(rng() * STREAM_VIEWER_NAMES.length)];
    const pool = priceRatio > 1.38 ? LIVE_EXPENSIVE_CHATS : LIVE_CASUAL_CHATS;
    newMessages.push({
      id: `chat_${now}_c_${tickIndex}`,
      sender: viewer,
      text: pool[Math.floor(rng() * pool.length)],
      kind: 'chat',
      timestamp: now,
    });
  }

  // Realistic staggered slot purchase chance (at most 1 buyer per tick)
  let nextSlots = slots;
  let soldSlot: LiveStreamSlotState | undefined;
  if (unsold.length > 0) {
    const priceAppeal =
      priceRatio <= 0.9
        ? 0.22
        : priceRatio <= 1.15
        ? 0.08
        : priceRatio <= 1.45
        ? -0.14
        : -0.34;
    const baseBuyProb =
      0.24 +
      Math.min(0.18, nextViewers / 260) +
      (hypeBoostActive ? 0.18 : 0) +
      priceAppeal;
    const clampedProb = Math.max(0.04, Math.min(0.78, baseBuyProb));

    if (rng() < clampedProb) {
      const picked = unsold[Math.floor(rng() * unsold.length)];
      const pickedSlotIdx = slots.findIndex((s) => s.slotId === picked.slotId);
      const assignedPackLabels = getSlotAssignedPackNumbers(
        Math.max(0, pickedSlotIdx),
        packsPerBox,
        slots.length
      )
        .map((n) => `#${n}`)
        .join(', ');
      const buyerName = STREAM_VIEWER_NAMES[Math.floor(rng() * STREAM_VIEWER_NAMES.length)];
      soldSlot = { ...picked, status: 'sold', buyerName };
      nextSlots = slots.map((s) => (s.slotId === picked.slotId ? soldSlot! : s));
      newMessages.push({
        id: `chat_${now}_bid_${tickIndex}`,
        sender: buyerName,
        text: `💸 Đã chốt [${picked.label}${assignedPackLabels ? ` · Pack ${assignedPackLabels}` : ''}]${
          boxSetName ? ` (${boxSetName})` : ''
        } giá $${picked.price} — Chờ nhân viên unbox!`,
        kind: 'bid',
        timestamp: now,
      });
    }
  }

  return { nextViewers, nextSlots, newMessages, soldSlot };
}

export interface LivePackCardOutcome {
  card: PokemonCard;
  isHit: boolean;
  matchedSlotId: LiveBreakSlotId;
  matchedSlotLabel: string;
  disposition: 'shipped' | 'shop_kept';
  buyerName?: string;
}

export function executeSinglePackLiveRip(params: {
  setId: string;
  slots: LiveStreamSlotState[];
  packNumber?: number;
  packBuyerName?: string;
  packSlotLabel?: string;
  setName?: string;
}): {
  cards: LivePackCardOutcome[];
  packChatMessages: LiveStreamChatMsg[];
} {
  const { setId, slots, packNumber, packBuyerName, packSlotLabel, setName } = params;
  const packRes = ripBoosterPackWithMetadata(setId);
  const now = Date.now();
  const packChatMessages: LiveStreamChatMsg[] = [];
  const outcomes: LivePackCardOutcome[] = [];

  for (const card of packRes.cards) {
    const rank = POCKET_RARITY_RANK[card.pocketRarity] || 1;
    const isHit = rank >= 4 || (card.marketPrice || 0) >= 8;
    const matchedSlot =
      slots.find((s) =>
        s.matchTypes.some((t) => (card.type || '').toLowerCase().includes(t.toLowerCase()))
      ) || slots[slots.length - 1];

    const slotBuyer = matchedSlot.status === 'sold' ? matchedSlot.buyerName : undefined;
    const effectiveBuyer = isHit
      ? slotBuyer || packBuyerName
      : slotBuyer || packBuyerName;
    const disposition: 'shipped' | 'shop_kept' = effectiveBuyer ? 'shipped' : 'shop_kept';

    outcomes.push({
      card,
      isHit,
      matchedSlotId: matchedSlot.slotId,
      matchedSlotLabel: matchedSlot.label,
      disposition,
      buyerName: effectiveBuyer,
    });

    if (isHit) {
      packChatMessages.push({
        id: `chat_${now}_hit_${card.id}_${Math.random()}`,
        sender: effectiveBuyer || 'Cộng Đồng Live',
        text: effectiveBuyer
          ? `🔥 NỔ HIT ${card.name} ($${Math.round(card.marketPrice || 0)}) ở ${
              packNumber ? `Pack #${packNumber}` : matchedSlot.label
            }! Chúc mừng ${effectiveBuyer}!`
          : `💎 NỔ HIT ${card.name} ($${Math.round(card.marketPrice || 0)}) thuộc ${matchedSlot.label} còn trống — Shop giữ trọn vào Binder!`,
        kind: 'hit',
        timestamp: now,
      });
    }
  }

  // Ensure live customers actively react on EVERY ripped pack (not only high-tier hits)
  if (packChatMessages.length === 0 && outcomes.length > 0) {
    const shippedOutcomes = outcomes.filter((o) => o.disposition === 'shipped' && o.buyerName);
    const activeBuyer = packBuyerName || shippedOutcomes[0]?.buyerName;
    if (activeBuyer) {
      const leadOutcome =
        shippedOutcomes.find((o) => o.buyerName === activeBuyer) || outcomes[0];
      packChatMessages.push({
        id: `chat_${now}_buyer_${Math.random()}`,
        sender: activeBuyer,
        text: `${
          packNumber ? `Đang unbox Pack #${packNumber}${setName ? ` (${setName})` : ''}${packSlotLabel ? ` · ${packSlotLabel}` : ''}: ` : ''
        }Nhận thẻ ${leadOutcome.card.name}... pack này nha shop, xé tiếp đi ạ!`,
        kind: 'chat',
        timestamp: now,
      });
    } else {
      const viewer = STREAM_VIEWER_NAMES[Math.floor(Math.random() * STREAM_VIEWER_NAMES.length)];
      packChatMessages.push({
        id: `chat_${now}_watch_${Math.random()}`,
        sender: viewer,
        text: `${
          packNumber ? `Pack #${packNumber}${setName ? ` (${setName})` : ''} chưa có chủ, shop giữ Binder! ` : ''
        }Hồi hộp quá nhân viên ơi, xé tiếp pack sau xem nổ hit gì nào!`,
        kind: 'chat',
        timestamp: now,
      });
    }
  }

  return { cards: outcomes, packChatMessages };
}

export type LiveBroadcastPhase = 'setup' | 'streaming_selling' | 'ripping' | 'summary';

export interface ActiveLiveBoxInfo {
  productId: string;
  setId: string;
  setName: string;
  packsPerBox: number;
  boxWholesalePrice: number;
  boxRetailPrice: number;
  packRetailPrice?: number;
  imageUrl?: string;
  consumedFromShelf?: boolean;
}

export interface LivePackOrderItem {
  packNumber: number;
  boxProductId: string;
  boxSetId: string;
  boxSetName: string;
  slotId: LiveBreakSlotId;
  slotLabel: string;
  slotColorHex: string;
  buyerName?: string;
  status: 'waiting_buyer' | 'queued' | 'ripping' | 'unboxed';
}

export function buildLivePackOrderQueue(params: {
  box: Pick<ActiveLiveBoxInfo, 'productId' | 'setId' | 'setName' | 'packsPerBox'> | null;
  slots: LiveStreamSlotState[];
  currentPackNum: number;
  phase: LiveBroadcastPhase;
}): LivePackOrderItem[] {
  const { box, slots, currentPackNum, phase } = params;
  if (!box || slots.length === 0) return [];
  const totalPacks = Math.max(1, box.packsPerBox || 9);
  const queue: LivePackOrderItem[] = [];

  for (let p = 1; p <= totalPacks; p++) {
    const slot = slots[(p - 1) % slots.length];
    const buyerName = slot.status === 'sold' ? slot.buyerName : undefined;
    let status: LivePackOrderItem['status'];
    if (phase === 'summary') {
      status = 'unboxed';
    } else if (phase === 'ripping') {
      if (p < currentPackNum) {
        status = 'unboxed';
      } else if (p === currentPackNum) {
        status = 'ripping';
      } else {
        status = buyerName ? 'queued' : 'waiting_buyer';
      }
    } else {
      status = buyerName ? 'queued' : 'waiting_buyer';
    }

    queue.push({
      packNumber: p,
      boxProductId: box.productId,
      boxSetId: box.setId,
      boxSetName: box.setName,
      slotId: slot.slotId,
      slotLabel: slot.label,
      slotColorHex: slot.colorHex,
      buyerName,
      status,
    });
  }

  return queue;
}

export interface LiveSessionSummaryPayload {
  productId: string;
  setId: string;
  setName: string;
  boxWholesaleCost: number;
  slotsSoldCount: number;
  slotRevenue: number;
  shippedCardsCount: number;
  shopKeptCards: PokemonCard[];
  shopKeptValue: number;
  viralFollowersGain: number;
  xpGain: number;
}

export interface LiveStreamRuntimeState {
  autoLiveEnabled: boolean;
  phase: LiveBroadcastPhase;
  activeLiveBox: ActiveLiveBoxInfo | null;
  slots: LiveStreamSlotState[];
  slotPrice: number;
  viewers: number;
  likesCount: number;
  elapsedSec: number;
  tickIndex: number;
  chatMessages: LiveStreamChatMsg[];
  hypeUntilMs: number;
  sealShownCooldownUntil: number;
  sealGlintKey: number;
  flashSaleUsed: boolean;
  currentPackNum: number;
  currentPackOutcomes: LivePackCardOutcome[];
  allOutcomes: LivePackCardOutcome[];
  autoRipActive: boolean;
  summaryPayload: LiveSessionSummaryPayload | null;
  lastCompletedHour: number | null;
  nextAutoStartAfterMs: number;
  scheduledHourLabel: string | null;
}

export function createInitialLiveStreamRuntime(autoLiveEnabled = true): LiveStreamRuntimeState {
  return {
    autoLiveEnabled,
    phase: 'setup',
    activeLiveBox: null,
    slots: createLiveStreamSlots(6),
    slotPrice: 6,
    viewers: 0,
    likesCount: 0,
    elapsedSec: 0,
    tickIndex: 0,
    chatMessages: [],
    hypeUntilMs: 0,
    sealShownCooldownUntil: 0,
    sealGlintKey: 0,
    flashSaleUsed: false,
    currentPackNum: 0,
    currentPackOutcomes: [],
    allOutcomes: [],
    autoRipActive: false,
    summaryPayload: null,
    lastCompletedHour: null,
    nextAutoStartAfterMs: 0,
    scheduledHourLabel: null,
  };
}

export function pickAutoLiveBoosterBox(inventory: InventoryItem[] = []): OwnedLiveBoosterBox | null {
  const owned = getOwnedLiveBoosterBoxes(inventory);
  if (owned.length === 0) return null;
  // Prefer boxes actively displayed on shop shelves first so live breaks visibly pull from shelf stock
  const sorted = [...owned].sort((a, b) => {
    const aOnShelf = a.shelvedQuantity > 0 ? 1 : 0;
    const bOnShelf = b.shelvedQuantity > 0 ? 1 : 0;
    if (bOnShelf !== aOnShelf) return bOnShelf - aOnShelf;
    if (b.shelvedQuantity !== a.shelvedQuantity) return b.shelvedQuantity - a.shelvedQuantity;
    return b.quantity - a.quantity;
  });
  return sorted[0];
}

export function shouldAutoStartHourlyLiveSession(params: {
  runtime: Pick<
    LiveStreamRuntimeState,
    'autoLiveEnabled' | 'phase' | 'lastCompletedHour' | 'nextAutoStartAfterMs'
  >;
  shopState: Pick<
    ShopState,
    'liveStudioUnlocked' | 'hiredStaff' | 'inGameHour' | 'inGameMinute' | 'inventory' | 'storeLevel'
  >;
  nowMs: number;
}): boolean {
  const { runtime, shopState, nowMs } = params;
  if (!runtime.autoLiveEnabled) return false;
  if (runtime.phase !== 'setup' && runtime.phase !== 'summary') return false;
  if (nowMs < runtime.nextAutoStartAfterMs) return false;

  const prereqs = checkLiveBreakPrerequisites(shopState);
  if (!prereqs.canGoLive) return false;

  // Start immediately on first available hour, then schedule once per new in-game hour
  if (runtime.lastCompletedHour !== null && runtime.lastCompletedHour === shopState.inGameHour) {
    return false;
  }
  return true;
}

// ==========================================
// 5. CITY RARE CARD HUNTS & GARAGE SALES (3D WORLD)
// ==========================================
export interface CityHuntSpot {
  id: string;
  poiId: string;
  locationName: string;
  x: number;
  z: number;
  sellerName: string;
  storyText: string;
  card: PokemonCard;
  marketValue: number;
  askingPrice: number;
  minAcceptablePrice: number;
  haggledCount: number;
  maxHaggles: number;
  sellerPatience: number; // 0-100
  status: 'active' | 'sold' | 'walked_away';
  spawnedAt: number;
}

const HUNT_POI_CANDIDATES = [
  { poiId: 'poi_starbucks', sellerName: 'Sinh Viên Starbucks', story: 'Dọn tủ ký túc xá, bán gấp thẻ sưu tầm từ năm ngoái.' },
  { poiId: 'poi_katinat', sellerName: 'Khách Ngồi Katinat', story: 'Mở pack giải trí trúng thẻ hiếm, muốn sang nhượng nhanh.' },
  { poiId: 'poi_casa_riva', sellerName: 'Du Khách Casa Riva', story: 'Sưu tầm từ Tokyo mang về, cần tiền mặt trước giờ bay.' },
  { poiId: 'poi_aeon_mall', sellerName: 'Hội Chợ Cuối Tuần AEON', story: 'Gian hàng thanh lý thẻ cổ tại sảnh AEON Mall.' },
  { poiId: 'poi_toxic', sellerName: 'DJ Phố Đi Bộ', story: 'Cần tiền nâng cấp bàn DJ, bán rẻ lá bài kỷ niệm.' },
  { poiId: 'poi_4u', sellerName: 'Dân Chơi 4U Club', story: 'Rao bán thẻ Grail ngay trước cửa 4U Superclub.' },
  { poiId: 'poi_sun_wheel', sellerName: 'Nhà Sưu Tầm Bờ Bắc', story: 'Hẹn giao dịch ngay cổng Cầu Tình Yêu • Bến Du Thuyền bờ Bắc.' },
];

export function generateCityHuntSpots(
  count: number = 3,
  rng: () => number = Math.random
): CityHuntSpot[] {
  const highValuePool = [...POKEMON_CARDS_DB, ...ONEPIECE_CARDS_DB].filter(
    (c) => (c.marketPrice || 0) >= 35
  );
  const fallbackPool = highValuePool.length > 0 ? highValuePool : POKEMON_CARDS_DB;
  const shuffledPois = [...HUNT_POI_CANDIDATES].sort(() => rng() - 0.5).slice(0, count);

  return shuffledPois.map((cand, idx) => {
    const poi = CITY_POIS.find((p) => p.id === cand.poiId) || CITY_POIS[0];
    const card = fallbackPool[Math.floor(rng() * fallbackPool.length)];
    const marketValue = Math.max(25, Math.round(card.marketPrice || 50));
    const discountPct = 0.22 + rng() * 0.16; // 22% - 38% below market
    const askingPrice = Math.max(12, Math.round(marketValue * (1 - discountPct)));
    const minAcceptablePrice = Math.max(10, Math.round(askingPrice * 0.72));

    return {
      id: `hunt_${Date.now()}_${idx}_${Math.floor(rng() * 1000)}`,
      poiId: poi.id,
      locationName: poi.name,
      x: poi.x,
      z: poi.z,
      sellerName: cand.sellerName,
      storyText: cand.story,
      card,
      marketValue,
      askingPrice,
      minAcceptablePrice,
      haggledCount: 0,
      maxHaggles: 2,
      sellerPatience: 100,
      status: 'active',
      spawnedAt: Date.now(),
    };
  });
}

export function attemptCityHuntHaggle(params: {
  spot: CityHuntSpot;
  discountTargetPct: number; // e.g., 0.12 or 0.2
  luxuryHaggleBonusPct?: number;
  rng?: () => number;
}): {
  nextSpot: CityHuntSpot;
  succeeded: boolean;
  walkedAway: boolean;
  message: string;
} {
  const { spot, discountTargetPct, luxuryHaggleBonusPct = 0, rng = Math.random } = params;
  if (spot.status !== 'active') {
    return { nextSpot: spot, succeeded: false, walkedAway: false, message: 'Giao dịch này đã kết thúc.' };
  }
  if (spot.haggledCount >= spot.maxHaggles) {
    return {
      nextSpot: spot,
      succeeded: false,
      walkedAway: false,
      message: 'Người bán không giảm thêm nữa, chỉ còn chốt giá hiện tại.',
    };
  }

  const proposedPrice = Math.max(
    spot.minAcceptablePrice,
    Math.round(spot.askingPrice * (1 - discountTargetPct))
  );
  const baseSuccess = discountTargetPct <= 0.12 ? 0.72 : 0.48;
  const successProb = Math.min(0.95, baseSuccess + luxuryHaggleBonusPct / 100);
  const roll = rng();

  if (roll < successProb) {
    return {
      nextSpot: {
        ...spot,
        askingPrice: proposedPrice,
        haggledCount: spot.haggledCount + 1,
        sellerPatience: Math.max(30, spot.sellerPatience - 20),
      },
      succeeded: true,
      walkedAway: false,
      message: `🤝 Ép giá thành công! Người bán đồng ý hạ xuống còn $${proposedPrice.toLocaleString()}!`,
    };
  }

  const nextPatience = spot.sellerPatience - (discountTargetPct > 0.15 ? 55 : 40);
  if (nextPatience <= 0) {
    return {
      nextSpot: {
        ...spot,
        haggledCount: spot.haggledCount + 1,
        sellerPatience: 0,
        status: 'walked_away',
      },
      succeeded: false,
      walkedAway: true,
      message: `💢 Trả giá quá gắt! ${spot.sellerName} tự ái thu thẻ bỏ đi mất rồi!`,
    };
  }

  // Slight compromise
  const compromised = Math.round(spot.askingPrice * 0.95);
  return {
    nextSpot: {
      ...spot,
      askingPrice: Math.max(spot.minAcceptablePrice, compromised),
      haggledCount: spot.haggledCount + 1,
      sellerPatience: nextPatience,
    },
    succeeded: false,
    walkedAway: false,
    message: `😅 Người bán lắc đầu nhưng nhượng bộ nhẹ còn $${Math.max(spot.minAcceptablePrice, compromised).toLocaleString()}.`,
  };
}

// ==========================================
// 6. LUXURY LIFESTYLE & ASSET BUFFS
// ==========================================
export interface LuxuryAssetItem {
  id: string;
  name: string;
  poiId: string;
  storeName: string;
  price: number;
  category: 'vehicle' | 'fashion' | 'tech' | 'real_estate';
  buffSummary: string;
  icon: string;
}

export const LUXURY_ASSETS_CATALOG: LuxuryAssetItem[] = [
  {
    id: 'asset_porsche_911',
    name: 'Porsche 911 GT3 RS',
    poiId: 'poi_porsche',
    storeName: 'Porsche Center Showroom',
    price: 2800,
    category: 'vehicle',
    buffSummary: '+25% Tiền Tip Giao Hàng PokeShip & Tăng Độ Oai Whale',
    icon: '🏎️',
  },
  {
    id: 'asset_vinfast_vf9',
    name: 'VinFast VF9 Plus',
    poiId: 'poi_vinfast',
    storeName: 'VinFast Showroom',
    price: 1650,
    category: 'vehicle',
    buffSummary: '+15% Tiền Tip PokeShip, +15% Thưởng Nhiệm Vụ Ngày & +$45/Ngày',
    icon: '⚡',
  },
  {
    id: 'asset_dior_suit',
    name: 'Bộ Vest DIOR Atelier VIP',
    poiId: 'poi_dior',
    storeName: 'DIOR Flagship Boutique',
    price: 1200,
    category: 'fashion',
    buffSummary: '+15% Tỷ Lệ Mặc Cả Thành Công & +2% Hoa Hồng Ký Gửi VIP',
    icon: '👔',
  },
  {
    id: 'asset_apple_studio',
    name: 'Apple Studio Display Lab',
    poiId: 'poi_apple',
    storeName: 'Apple Flagship Store',
    price: 950,
    category: 'tech',
    buffSummary: '+15% Tốc Độ Chấm Điểm Lab & -5% Rủi Ro Đập Hộp Crossover',
    icon: '💻',
  },
  {
    id: 'asset_vinhomes_villa',
    name: 'Penthouse Vault Vinhomes',
    poiId: 'poi_casa_riva',
    storeName: 'Penthouse Vault Vinhomes',
    price: 5500,
    category: 'real_estate',
    buffSummary: '+$140/Ngày Doanh Thu Danh Tiếng & +6% Định Giá Grail',
    icon: '🏰',
  },
];

export interface LuxuryAssetBuffs {
  haggleBonusPct: number;
  commissionBonusPct: number;
  pokeshipTipBonusPct: number;
  dailyTaskBonusPct: number;
  dailyPassiveBonusCash: number;
  gradingSpeedBonusPct: number;
  crossoverRiskReductionPct: number;
  grailValuationBonusPct: number;
}

export function getLuxuryAssetBuffs(ownedIds: string[] = []): LuxuryAssetBuffs {
  const owned = new Set(ownedIds);
  return {
    haggleBonusPct: owned.has('asset_dior_suit') ? 15 : 0,
    commissionBonusPct: owned.has('asset_dior_suit') ? 2 : 0,
    pokeshipTipBonusPct:
      (owned.has('asset_porsche_911') ? 25 : 0) + (owned.has('asset_vinfast_vf9') ? 15 : 0),
    dailyTaskBonusPct: owned.has('asset_vinfast_vf9') ? 15 : 0,
    dailyPassiveBonusCash:
      (owned.has('asset_vinhomes_villa') ? 140 : 0) + (owned.has('asset_vinfast_vf9') ? 45 : 0),
    gradingSpeedBonusPct: owned.has('asset_apple_studio') ? 15 : 0,
    crossoverRiskReductionPct: owned.has('asset_apple_studio') ? 5 : 0,
    grailValuationBonusPct: owned.has('asset_vinhomes_villa') ? 6 : 0,
  };
}

// ==========================================
// 7. SATELLITE KIOSK FRANCHISES (AEON MALL & LANDMARK 81)
// ==========================================
export interface SatelliteKioskConfig {
  id: 'aeon_kiosk' | 'landmark_kiosk';
  name: string;
  poiId: string;
  unlockLevel: number;
  unlockCost: number;
  baseHourlyRevenue: number;
  upgradeCostBase: number;
  description: string;
}

export interface SatelliteKioskState {
  id: 'aeon_kiosk' | 'landmark_kiosk';
  unlocked: boolean;
  tier: number; // 1..3
  uncollectedCash: number;
  totalEarned: number;
  itemsSold: number;
}

export const SATELLITE_KIOSK_CATALOG: SatelliteKioskConfig[] = [
  {
    id: 'aeon_kiosk',
    name: 'Kiosk Vệ Tinh AEON Mall',
    poiId: 'poi_aeon_mall',
    unlockLevel: 12,
    unlockCost: 1400,
    baseHourlyRevenue: 28,
    upgradeCostBase: 900,
    description: 'Quầy bán Pack tự động đặt tại sảnh trung tâm thương mại AEON đông đúc.',
  },
  {
    id: 'landmark_kiosk',
    name: 'Flagship Pop-Up Landmark 81',
    poiId: 'poi_landmark81',
    unlockLevel: 22,
    unlockCost: 3400,
    baseHourlyRevenue: 62,
    upgradeCostBase: 1800,
    description: 'Gian hàng cao cấp đối diện Shop tại Vincom Landmark 81 chuyên bán Box & Slab VIP.',
  },
];

export function createInitialKiosksState(): Record<string, SatelliteKioskState> {
  return {
    aeon_kiosk: {
      id: 'aeon_kiosk',
      unlocked: false,
      tier: 1,
      uncollectedCash: 0,
      totalEarned: 0,
      itemsSold: 0,
    },
    landmark_kiosk: {
      id: 'landmark_kiosk',
      unlocked: false,
      tier: 1,
      uncollectedCash: 0,
      totalEarned: 0,
      itemsSold: 0,
    },
  };
}

export function tickSatelliteKiosks(
  kiosks: Record<string, SatelliteKioskState> = {},
  inGameHoursElapsed: number,
  reputation: number = 50
): { nextKiosks: Record<string, SatelliteKioskState>; generatedCash: number } {
  if (inGameHoursElapsed <= 0) return { nextKiosks: kiosks, generatedCash: 0 };
  const repMult = 0.85 + Math.min(0.45, Math.max(0, reputation) / 220);
  let generatedCash = 0;
  const nextKiosks: Record<string, SatelliteKioskState> = { ...kiosks };

  for (const cfg of SATELLITE_KIOSK_CATALOG) {
    const cur = nextKiosks[cfg.id];
    if (!cur || !cur.unlocked) continue;
    const tierMult = 1 + (Math.max(1, cur.tier) - 1) * 0.55;
    const deltaCash = Number((cfg.baseHourlyRevenue * tierMult * repMult * inGameHoursElapsed).toFixed(2));
    const deltaItems = Math.max(1, Math.round(inGameHoursElapsed * 3 * cur.tier));
    generatedCash += deltaCash;
    nextKiosks[cfg.id] = {
      ...cur,
      uncollectedCash: Number((cur.uncollectedCash + deltaCash).toFixed(2)),
      totalEarned: Number((cur.totalEarned + deltaCash).toFixed(2)),
      itemsSold: cur.itemsSold + deltaItems,
    };
  }

  return { nextKiosks, generatedCash: Number(generatedCash.toFixed(2)) };
}

// ==========================================
// 8. MASTER SET PROGRESS & GRAND DEX VAULT
// ==========================================
export const MASTER_SET_MILESTONES = [50, 80, 100] as const;

export interface MasterSetProgress {
  setId: string;
  setName: string;
  universe: 'pokemon' | 'onepiece';
  ownedUnique: number;
  totalUnique: number;
  percent: number;
  claimableMilestones: Array<50 | 80 | 100>;
  claimedMilestones: Array<50 | 80 | 100>;
}

export function getMasterSetMilestoneKey(setId: string, pct: 50 | 80 | 100): string {
  return `${setId}:${pct}`;
}

export function getMasterSetMilestoneReward(
  setInfo: BoosterSetInfo,
  pct: 50 | 80 | 100
): { cash: number; xp: number; rep: number; discountLabel: string } {
  const baseScale = Math.max(1, Math.round((setInfo.boxWholesalePrice || 25) / 25));
  if (pct === 50) {
    return { cash: 90 * baseScale, xp: 80, rep: 2, discountLabel: 'Thưởng Tiến Độ 50%' };
  }
  if (pct === 80) {
    return { cash: 210 * baseScale, xp: 160, rep: 4, discountLabel: 'Thưởng Cao Thủ 80%' };
  }
  return {
    cash: 480 * baseScale,
    xp: 350,
    rep: 7,
    discountLabel: 'Master Set 100% (-2% Nhập Sỉ Vĩnh Viễn)',
  };
}

export function computeAllMasterSetProgress(
  binderCards: Record<string, number> = {},
  claimedKeys: string[] = []
): MasterSetProgress[] {
  const claimedSet = new Set(claimedKeys);
  const allSets: Array<{ info: BoosterSetInfo; universe: 'pokemon' | 'onepiece' }> = [
    ...ALL_UNIQUE_BOOSTER_SETS.map((info) => ({ info, universe: 'pokemon' as const })),
    ...ALL_ONEPIECE_BOOSTER_SETS.map((info) => ({ info, universe: 'onepiece' as const })),
  ];

  return allSets.map(({ info, universe }) => {
    const cards = getBoosterSetCards(info.id);
    const totalUnique = Math.max(1, cards.length);
    let ownedUnique = 0;
    for (const c of cards) {
      if ((binderCards[c.id] || 0) > 0) ownedUnique += 1;
    }
    const percent = Math.min(100, Math.round((ownedUnique / totalUnique) * 100));
    const claimedMilestones = MASTER_SET_MILESTONES.filter((m) =>
      claimedSet.has(getMasterSetMilestoneKey(info.id, m))
    );
    const claimableMilestones = MASTER_SET_MILESTONES.filter(
      (m) => percent >= m && !claimedSet.has(getMasterSetMilestoneKey(info.id, m))
    );

    return {
      setId: info.id,
      setName: info.name,
      universe,
      ownedUnique,
      totalUnique,
      percent,
      claimableMilestones,
      claimedMilestones,
    };
  });
}

export function getMasterSetWholesaleDiscount(claimedKeys: string[] = []): number {
  const completedCount = claimedKeys.filter((k) => k.endsWith(':100')).length;
  return Math.min(0.2, completedCount * 0.02); // Up to 20% permanent wholesale discount
}

// ==========================================
// 9. SHOP SECURITY, CCTV & SHOPLIFTER ALERTS
// ==========================================
export interface SecurityTierInfo {
  level: number;
  name: string;
  cost: number;
  autoCatchChance: number;
  responseWindowMs: number;
  bountyBonus: number;
  description: string;
}

export const SHOP_SECURITY_TIERS: SecurityTierInfo[] = [
  {
    level: 0,
    name: 'Chưa Lắp An Ninh',
    cost: 0,
    autoCatchChance: 0,
    responseWindowMs: 14000,
    bountyBonus: 0,
    description: 'Chưa có camera/cổng từ. Cần tự quan sát khi có kẻ gian trà trộn.',
  },
  {
    level: 1,
    name: 'Cổng Từ & Camera AI 360°',
    cost: 480,
    autoCatchChance: 0.45,
    responseWindowMs: 22000,
    bountyBonus: 15,
    description: 'Còi báo động tự động khi có trộm, 45% tự bắt và kéo dài thời gian xử lý lên 22s.',
  },
  {
    level: 2,
    name: 'Đội Bảo Vệ Chuyên Nghiệp & Khóa Từ',
    cost: 1250,
    autoCatchChance: 0.85,
    responseWindowMs: 30000,
    bountyBonus: 35,
    description: 'Bảo vệ đứng cửa + khóa từ tự động, 85% tự tóm gọn kẻ gian & tăng tiền thưởng Công An.',
  },
];

export interface SecurityAlertEvent {
  id: string;
  suspectName: string;
  incidentType: 'shoplifter' | 'slab_swapper';
  targetItemName: string;
  riskAmount: number;
  bountyReward: number;
  remainingMs: number;
  triggeredAt: number;
}

const SUSPECT_NAMES = [
  'Áo Khoác Đen Khả Nghi',
  'Khách Đeo Khẩu Trang Kín',
  'Kẻ Tráo Slab Giả',
  'Đạo Chích Khu Chợ Đêm',
];

export function rollSecurityAlertEvent(params: {
  securityLevel: number;
  rng?: () => number;
}): {
  alert: SecurityAlertEvent | null;
  autoCaught: boolean;
  autoBounty: number;
  suspectName: string;
  incidentType: SecurityAlertEvent['incidentType'];
} {
  const { securityLevel, rng = Math.random } = params;
  const tier = SHOP_SECURITY_TIERS[Math.min(2, Math.max(0, securityLevel))] || SHOP_SECURITY_TIERS[0];
  const suspectName = SUSPECT_NAMES[Math.floor(rng() * SUSPECT_NAMES.length)];
  const incidentType: SecurityAlertEvent['incidentType'] =
    rng() < 0.35 ? 'slab_swapper' : 'shoplifter';
  const targetItemName =
    incidentType === 'slab_swapper' ? 'Kệ Trưng Bày Slab VIP' : 'Kệ Booster Pack Tầng 1';
  const riskAmount = incidentType === 'slab_swapper' ? 55 : 22;
  const bountyReward = 35 + tier.bountyBonus + Math.floor(rng() * 20);

  if (tier.autoCatchChance > 0 && rng() < tier.autoCatchChance) {
    return {
      alert: null,
      autoCaught: true,
      autoBounty: bountyReward,
      suspectName,
      incidentType,
    };
  }

  return {
    alert: {
      id: `sec_${Date.now()}_${Math.floor(rng() * 1000)}`,
      suspectName,
      incidentType,
      targetItemName,
      riskAmount,
      bountyReward,
      remainingMs: tier.responseWindowMs,
      triggeredAt: Date.now(),
    },
    autoCaught: false,
    autoBounty: 0,
    suspectName,
    incidentType,
  };
}
