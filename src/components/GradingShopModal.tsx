import React, { useMemo, useState } from 'react';
import {
  Award,
  BookOpen,
  Briefcase,
  Calculator,
  CheckCircle2,
  ClipboardList,
  Clock,
  Crown,
  DollarSign,
  Eye,
  Gavel,
  Hammer,
  Layers,
  Lock,
  Megaphone,
  Microscope,
  Search,
  Shield,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UserCheck,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import {
  AUCTION_BROKER_COMMISSION_RATE,
  AUCTIONEER_WAGE,
  AUCTION_HOST_WAGE,
  CRACK_REGRADE_FEE,
  GRADING_CLEANING_FEE,
  GRADING_FEE_PER_CARD,
  GRADING_RECEPTIONIST_WAGE,
  GRADING_SERVICE_TIERS,
  GRADING_SHOP_UNLOCK_LEVEL,
  GRADING_SPECIALIST_WAGE,
  GRADER_RESEARCH_BRIEFS,
  GradingCompany,
  GradingJob,
  GradingServiceTierId,
  MAX_GRADING_SPECIALISTS,
  OwnedGradedSlabEntry,
  PokemonCard,
  SLAB_GUARD_FEE,
  SLAB_GUARD_OPTIONS,
  ShopState,
  SlabGuardColor,
  StaffRole,
  findAnyRawCardById,
  getAuctionCommissionRate,
  getAuctionShowroomSchedule,
  getGradingCardRoiAdvice,
  getGradingSpeedStats,
  getSlabMarketValuation,
  inspectRawCardForGrading,
  isStaffWorkingHours,
} from '../game/pokemonShopLogic';
import { GradedSlabCard } from './GradedSlabCard';
import {
  COUNTERFEIT_SCAN_FEE,
  FAKE_REPORT_BOUNTY,
  RESTORE_CARD_FEE,
  getLuxuryAssetBuffs,
  getMarketPulseMultiplierForCard,
} from '../game/shopExpansionSystems';
import { soundManager } from '../game/audio';

export interface RawCardCandidate {
  key: string;
  card: PokemonCard;
  sourceType: 'binder' | 'showcase' | 'shelf' | 'op_showcase' | 'op_shelf';
  slotIndex?: number;
  quantity: number;
}

export type GradingModalTab = 'submit' | 'queue' | 'auction' | 'orders' | 'vault' | 'research';

interface GradingShopModalProps {
  shopState: ShopState;
  initialTab?: GradingModalTab;
  onHireStaff: (
    role: StaffRole,
    action: 'hire' | 'fire'
  ) => void;
  onSubmitGrading: (
    items: Array<{
      card: PokemonCard;
      sourceType: RawCardCandidate['sourceType'];
      slotIndex?: number;
      preGradeBonus?: number;
    }>,
    company: GradingCompany,
    options?: {
      tier: GradingServiceTierId;
      cleanSurface: boolean;
    }
  ) => void;
  onClaimCompletedJob: (
    jobId: string,
    destination: 'vault' | 'showcase' | 'sell'
  ) => void;
  onClaimAllCompleted?: (destination: 'vault' | 'showcase') => void;
  onActionOwnedSlab: (
    slabEntryId: string,
    action: 'showcase' | 'sell'
  ) => void;
  onApproveCustomerOrder?: (orderId: string) => void;
  onCompleteCustomerOrder?: (orderId: string) => void;
  onStartAuction?: (
    slabEntryId: string,
    startPrice: number,
    reservePrice: number,
    durationMs?: number
  ) => void;
  onStartConsignmentAuction?: () => void;
  onAcceptConsignmentOffer?: (offerId: string) => void;
  onDeclineConsignmentOffer?: (offerId: string) => void;
  onInviteConsignmentOffer?: () => void;
  onPlaceUserBid?: (lotId: string, stepPct?: number) => void;
  onSettleAuction?: (lotId: string) => void;
  onCrackAndRegrade?: (slabEntryId: string, targetCompany: GradingCompany) => void;
  onEquipSlabGuard?: (slabEntryId: string, guardColor: SlabGuardColor) => void;
  onInspectBuyback?: (offerId: string) => void;
  onScanBuybackAuthenticity?: (offerId: string) => void;
  onRestoreBuybackCard?: (offerId: string) => void;
  onReportFakeBuyback?: (offerId: string) => void;
  onAcceptBuyback?: (offerId: string) => void;
  onDeclineBuyback?: (offerId: string) => void;
  onFulfillVipOrder?: (vipOrderId: string, slabEntryId: string) => void;
  onClose: () => void;
}

export const GradingShopModal: React.FC<GradingShopModalProps> = ({
  shopState,
  initialTab = 'submit',
  onHireStaff,
  onSubmitGrading,
  onClaimCompletedJob,
  onClaimAllCompleted,
  onActionOwnedSlab,
  onApproveCustomerOrder,
  onCompleteCustomerOrder,
  onStartAuction,
  onStartConsignmentAuction,
  onAcceptConsignmentOffer,
  onDeclineConsignmentOffer,
  onInviteConsignmentOffer,
  onPlaceUserBid,
  onSettleAuction,
  onCrackAndRegrade,
  onEquipSlabGuard,
  onInspectBuyback,
  onScanBuybackAuthenticity,
  onRestoreBuybackCard,
  onReportFakeBuyback,
  onAcceptBuyback,
  onDeclineBuyback,
  onFulfillVipOrder,
  onClose,
}) => {
  const isUnlocked = shopState.storeLevel >= GRADING_SHOP_UNLOCK_LEVEL;
  const isStaffOnShift = isStaffWorkingHours(shopState.inGameHour, shopState.inGameMinute);
  const auctionSchedule = getAuctionShowroomSchedule(shopState.inGameHour, shopState.inGameMinute);
  const receptionistCount = shopState.hiredStaff?.gradingReceptionist || 0;
  const specialistsCount = shopState.hiredStaff?.gradingSpecialists || 0;
  const auctioneerCount = shopState.hiredStaff?.auctioneer || 0;
  const auctionHostCount = shopState.hiredStaff?.auctionHost || 0;
  const currentCommissionRate = getAuctionCommissionRate({
    auctionHostCount,
    isPrimeTime: auctionSchedule.isPrimeTime,
  });
  const luxuryBuffs = getLuxuryAssetBuffs(shopState.ownedLuxuryAssets || []);
  const marketPulses = shopState.marketPulseNews || [];
  const totalCommissionWithLuxury = currentCommissionRate + luxuryBuffs.commissionBonusPct / 100;
  const currentCommissionPct = Math.round(currentCommissionRate * 100);
  const speedStats = getGradingSpeedStats(specialistsCount);

  const [activeTab, setActiveTab] = useState<GradingModalTab>(initialTab);
  const [selectedCompany, setSelectedCompany] = useState<GradingCompany>('PSA');
  const [selectedTier, setSelectedTier] = useState<GradingServiceTierId>('standard');
  const [cleanSurface, setCleanSurface] = useState<boolean>(false);
  const [universeFilter, setUniverseFilter] = useState<'all' | 'pokemon' | 'onepiece'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [inspectedKey, setInspectedKey] = useState<string | null>(null);
  const [revealedJob, setRevealedJob] = useState<GradingJob | null>(null);
  const [certQuery, setCertQuery] = useState('');
  const [calcRawPrice, setCalcRawPrice] = useState<number>(85);
  const [calcClean, setCalcClean] = useState<boolean>(true);
  const [auctionSelectedSlabId, setAuctionSelectedSlabId] = useState<string | null>(null);
  const [auctionStartPct, setAuctionStartPct] = useState<number>(85);
  const [auctionReservePct, setAuctionReservePct] = useState<number>(105);

  const gradingJobs = shopState.gradingJobs || [];
  const activeOrQueuedJobs = gradingJobs.filter((j) => j.status !== 'completed');
  const completedJobs = gradingJobs.filter((j) => j.status === 'completed');
  const ownedSlabs: OwnedGradedSlabEntry[] = shopState.gradedSlabs || [];
  const customerOrders = shopState.customerGradingOrders || [];
  const slabAuctions = shopState.slabAuctions || [];
  const consignmentOffers = shopState.auctionConsignmentOffers || [];
  const auctionHistory = shopState.auctionHistory || [];
  const buybackOffers = shopState.buybackOffers || [];
  const vipSlabOrders = shopState.vipSlabOrders || [];
  const activeTrend = shopState.activeMarketTrend;

  const waitingOrdersCount =
    customerOrders.filter((o) => o.status === 'waiting_approval' || o.status === 'ready_pickup').length +
    buybackOffers.length +
    vipSlabOrders.length;

  const popEntries = useMemo(
    () => Object.values(shopState.gradingPopReport || {}),
    [shopState.gradingPopReport]
  );
  const labStats = shopState.gradingLabStats;

  const tierInfo = GRADING_SERVICE_TIERS[selectedTier] || GRADING_SERVICE_TIERS.standard;
  const feePerCard = tierInfo.fee + (cleanSurface ? GRADING_CLEANING_FEE : 0);

  const rawCandidates = useMemo<RawCardCandidate[]>(() => {
    const list: RawCardCandidate[] = [];

    Object.entries(shopState.binderCards || {}).forEach(([cardId, qty]) => {
      if (!qty || qty <= 0) return;
      const card = findAnyRawCardById(cardId);
      if (!card) return;
      list.push({
        key: `binder:${cardId}`,
        card,
        sourceType: 'binder',
        quantity: qty,
      });
    });

    const addDisplayList = (
      entries: ShopState['showcaseCards'] | undefined,
      sourceType: RawCardCandidate['sourceType']
    ) => {
      (entries || []).forEach((entry, idx) => {
        if (!entry || !entry.card || entry.isSold || entry.isReserved || entry.isSlab || entry.slab) return;
        list.push({
          key: `${sourceType}:${idx}:${entry.card.id}`,
          card: entry.card,
          sourceType,
          slotIndex: idx,
          quantity: 1,
        });
      });
    };

    addDisplayList(shopState.showcaseCards, 'showcase');
    addDisplayList(shopState.shelfCards, 'shelf');
    addDisplayList(shopState.opShowcaseCards, 'op_showcase');
    addDisplayList(shopState.opShelfCards, 'op_shelf');

    return list.sort((a, b) => (b.card.marketPrice || 0) - (a.card.marketPrice || 0));
  }, [
    shopState.binderCards,
    shopState.showcaseCards,
    shopState.shelfCards,
    shopState.opShowcaseCards,
    shopState.opShelfCards,
  ]);

  const filteredCandidates = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return rawCandidates.filter((item) => {
      const isOp = item.card.universe === 'onepiece';
      if (universeFilter === 'pokemon' && isOp) return false;
      if (universeFilter === 'onepiece' && !isOp) return false;
      if (q) {
        const hay = `${item.card.name} ${item.card.setName} ${item.card.rarityLabel || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rawCandidates, universeFilter, searchQuery]);

  const selectedItems = useMemo(
    () =>
      selectedKeys
        .map((k) => rawCandidates.find((c) => c.key === k))
        .filter((x): x is RawCardCandidate => Boolean(x)),
    [selectedKeys, rawCandidates]
  );

  const focusedCandidate = useMemo(() => {
    if (inspectedKey) {
      const found = rawCandidates.find((c) => c.key === inspectedKey);
      if (found) return found;
    }
    return selectedItems[selectedItems.length - 1] || filteredCandidates[0] || null;
  }, [inspectedKey, rawCandidates, selectedItems, filteredCandidates]);

  const focusedInspection = useMemo(() => {
    if (!focusedCandidate) return null;
    return inspectRawCardForGrading(focusedCandidate.card, focusedCandidate.key);
  }, [focusedCandidate]);

  const focusedRoi = useMemo(() => {
    if (!focusedCandidate || !focusedInspection) return null;
    return getGradingCardRoiAdvice(
      focusedCandidate.card.marketPrice || 1,
      selectedCompany,
      selectedTier,
      focusedInspection.grade10PotentialPct,
      cleanSurface
    );
  }, [focusedCandidate, focusedInspection, selectedCompany, selectedTier, cleanSurface]);

  const remainingQueueCapacity = Math.max(0, speedStats.maxQueue - activeOrQueuedJobs.length);
  const totalFee = selectedItems.length * feePerCard;
  const canSubmit =
    isUnlocked &&
    isStaffOnShift &&
    receptionistCount >= 1 &&
    specialistsCount >= 1 &&
    selectedItems.length > 0 &&
    selectedItems.length <= remainingQueueCapacity &&
    shopState.cash >= totalFee;

  const toggleSelect = (key: string) => {
    soundManager.playSelectSound();
    setInspectedKey(key);
    setSelectedKeys((prev) =>
      prev.includes(key)
        ? prev.filter((k) => k !== key)
        : prev.length < Math.max(1, remainingQueueCapacity)
        ? [...prev, key]
        : prev
    );
  };

  const handleSelectTopProfitable = () => {
    soundManager.playSelectSound();
    const limit = Math.max(1, remainingQueueCapacity);
    const profitable = filteredCandidates
      .filter((item) => {
        const insp = inspectRawCardForGrading(item.card, item.key);
        const roi = getGradingCardRoiAdvice(
          item.card.marketPrice || 1,
          selectedCompany,
          selectedTier,
          insp.grade10PotentialPct,
          cleanSurface
        );
        return roi.expectedNetProfit > 0;
      })
      .slice(0, limit)
      .map((item) => item.key);
    setSelectedKeys(profitable);
    if (profitable[0]) setInspectedKey(profitable[0]);
  };

  const handleSubmitSelected = () => {
    if (!canSubmit) return;
    onSubmitGrading(
      selectedItems.map((it) => {
        const insp = inspectRawCardForGrading(it.card, it.key);
        return {
          card: it.card,
          sourceType: it.sourceType,
          slotIndex: it.slotIndex,
          preGradeBonus: insp.preGradeBonus,
        };
      }),
      selectedCompany,
      { tier: selectedTier, cleanSurface }
    );
    setSelectedKeys([]);
    setActiveTab('queue');
  };

  const filteredVaultSlabs = useMemo(() => {
    const q = certQuery.trim().toLowerCase();
    if (!q) return ownedSlabs;
    return ownedSlabs.filter(
      (entry) =>
        entry.slab.certNumber.toLowerCase().includes(q) ||
        entry.card.name.toLowerCase().includes(q) ||
        entry.slab.company.toLowerCase().includes(q)
    );
  }, [ownedSlabs, certQuery]);

  const auctionCandidateEntry = useMemo(() => {
    if (auctionSelectedSlabId) {
      const found = ownedSlabs.find((s) => s.id === auctionSelectedSlabId);
      if (found) return found;
    }
    return ownedSlabs[0] || null;
  }, [auctionSelectedSlabId, ownedSlabs]);

  const calcAdvice = useMemo(
    () => getGradingCardRoiAdvice(calcRawPrice, selectedCompany, selectedTier, 8, calcClean),
    [calcRawPrice, selectedCompany, selectedTier, calcClean]
  );

  const hitRatePct =
    labStats && labStats.totalGraded > 0
      ? ((labStats.grade10Count / labStats.totalGraded) * 100).toFixed(1)
      : '0.0';

  const crackRiskPct = Math.max(5, 18 - Math.min(4, specialistsCount) * 3);
  const regradeCostTotal = CRACK_REGRADE_FEE + GRADING_SERVICE_TIERS.standard.fee + GRADING_CLEANING_FEE;

  const hasFilterActive = universeFilter !== 'all' || searchQuery.trim().length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-2 sm:p-4 select-none">
      <div className="relative flex flex-col w-full max-w-6xl h-[90vh] max-h-[860px] rounded-2xl border border-white/12 bg-[#090C12] text-zinc-100 shadow-2xl overflow-hidden">
        {/* Top Header */}
        <header className="shrink-0 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#0D111B] px-5 py-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-400/15 border border-amber-400/35 text-amber-300">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm sm:text-base font-extrabold tracking-tight text-white">
                  PSA · CGC · BGS Grading Lab &amp; Sàn Đấu Giá VIP
                </h2>
                <span className="rounded-md bg-white/6 border border-white/10 px-2 py-0.5 text-[11px] font-semibold text-amber-300 tabular-nums">
                  Lv.{GRADING_SHOP_UNLOCK_LEVEL}+ · Từ ${GRADING_FEE_PER_CARD}
                </span>
              </div>

              {isUnlocked && activeTrend ? (
                <div className="flex items-center gap-2 text-xs text-zinc-400 mt-0.5 min-w-0">
                  <span className="inline-flex items-center gap-1 font-semibold text-emerald-400 shrink-0">
                    <TrendingUp className="h-3.5 w-3.5" />
                    {activeTrend.badge}
                  </span>
                  <span className="text-zinc-200 font-medium truncate" title={activeTrend.description}>
                    {activeTrend.title}
                  </span>
                  <span className="hidden lg:inline text-zinc-400 truncate" title={activeTrend.description}>
                    — {activeTrend.description}
                  </span>
                </div>
              ) : (
                <p className="text-xs text-zinc-400 truncate mt-0.5">
                  BGS Black Label (x5.2) · Đấu giá Whale · Crossover · Slab Guard · Thu mua 10x
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <span className="hidden sm:inline text-xs font-semibold text-zinc-400 tabular-nums">
              Ngày {shopState.currentDay}
            </span>
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-950/40 px-3 py-1.5 text-xs font-bold text-emerald-300 tabular-nums">
              ${shopState.cash.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-[#141A28] text-zinc-400 hover:bg-white/10 hover:text-white cursor-pointer transition"
              title="Đóng [ESC]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* Locked Overlay if Store Level < 25 */}
        {!isUnlocked ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4 overflow-y-auto">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-400/40 bg-amber-500/10 text-amber-300">
              <Lock className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-extrabold text-amber-300">
              Trung Tâm Thẩm Định &amp; Sàn Đấu Giá Mở Khóa Tại Cấp {GRADING_SHOP_UNLOCK_LEVEL}
            </h3>
            <p className="max-w-md text-sm text-zinc-300">
              Cửa hàng hiện đang ở <strong className="text-white">Cấp {shopState.storeLevel} / {GRADING_SHOP_UNLOCK_LEVEL}</strong>. Hãy tiếp tục bán hàng để mở khóa toàn bộ Tòa nhà Grading Lab + Sàn Đấu Giá VIP!
            </p>
            <div className="w-full max-w-lg rounded-xl border border-white/10 bg-[#101521] p-4 text-left text-xs text-zinc-300 space-y-2">
              <div className="font-bold text-amber-300">Quyền lợi khi mở khóa tại Cấp {GRADING_SHOP_UNLOCK_LEVEL}:</div>
              <div>• 3 Hãng chấm điểm: <strong>PSA 10 (x2.8)</strong>, <strong>CGC Pristine 10 (x3.4)</strong>, <strong>BGS Black Label 10 (x5.2)</strong>.</div>
              <div>• <strong>Sàn Đấu Giá Showroom VIP</strong> với đại gia Landmark 81, Porsche Center &amp; Tokyo.</div>
              <div>• <strong>Đập hộp Crossover</strong>, gắn <strong>Slab Guard</strong>, thu mua kính lúp 10x &amp; giao hợp đồng VIP.</div>
            </div>
          </div>
        ) : (
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            {/* Compact Staff Status & Quick Controls Bar */}
            <div className="shrink-0 grid grid-cols-1 md:grid-cols-2 gap-2.5 border-b border-white/10 bg-[#0B0F18] px-5 py-2">
              {/* Staff 1: Receptionist */}
              <div className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-[#111724] px-3 py-1.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border ${
                      receptionistCount >= 1
                        ? 'border-emerald-500/35 bg-emerald-500/15 text-emerald-300'
                        : 'border-rose-500/35 bg-rose-500/15 text-rose-300'
                    }`}
                  >
                    <UserCheck className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white truncate">Lễ Tân Thu Mua</span>
                      <span
                        className={`rounded px-1.5 py-0.2 text-[10px] font-semibold ${
                          receptionistCount < 1
                            ? 'bg-rose-500/15 text-rose-300'
                            : isStaffOnShift
                            ? 'bg-emerald-500/15 text-emerald-300'
                            : 'bg-zinc-700/60 text-zinc-300'
                        }`}
                      >
                        {receptionistCount < 1 ? 'Cần thuê 1' : isStaffOnShift ? 'Đang trực' : 'Tan ca'}
                      </span>
                    </div>
                    <div className="text-[11px] text-zinc-400 tabular-nums truncate">
                      Ca 07:00–22:00 · ${GRADING_RECEPTIONIST_WAGE}/h
                    </div>
                  </div>
                </div>
                {receptionistCount >= 1 ? (
                  <button
                    onClick={() => onHireStaff('gradingReceptionist', 'fire')}
                    className="shrink-0 rounded-lg border border-white/10 bg-zinc-800/80 hover:bg-rose-600/80 hover:border-rose-400/40 px-2.5 py-1 text-[11px] font-semibold text-zinc-200 cursor-pointer transition"
                  >
                    Nghỉ Việc
                  </button>
                ) : (
                  <button
                    onClick={() => onHireStaff('gradingReceptionist', 'hire')}
                    className="shrink-0 rounded-lg bg-emerald-500 hover:bg-emerald-400 px-3 py-1 text-[11px] font-bold text-black cursor-pointer transition"
                  >
                    Thuê (${GRADING_RECEPTIONIST_WAGE}/h)
                  </button>
                )}
              </div>

              {/* Staff 2: Lab Specialists */}
              <div className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-[#111724] px-3 py-1.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border ${
                      specialistsCount >= 1
                        ? 'border-sky-500/35 bg-sky-500/15 text-sky-300'
                        : 'border-rose-500/35 bg-rose-500/15 text-rose-300'
                    }`}
                  >
                    <Users className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white truncate">
                        Chuyên Gia Lab ({specialistsCount}/{MAX_GRADING_SPECIALISTS})
                      </span>
                      {specialistsCount > 0 && !isStaffOnShift && (
                        <span className="rounded bg-zinc-700/60 px-1.5 py-0.2 text-[10px] font-semibold text-zinc-300">
                          Tan ca
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-sky-300/90 tabular-nums truncate">
                      {specialistsCount > 0
                        ? `${speedStats.maxConcurrent} luồng · ${speedStats.secondsPerCard}s/thẻ · Rủi ro đập hộp ${crackRiskPct}%`
                        : 'Chưa có chuyên gia · Rủi ro 18%'}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    disabled={specialistsCount <= 0}
                    onClick={() => onHireStaff('gradingSpecialists', 'fire')}
                    className="rounded-lg border border-white/10 bg-zinc-900 px-2.5 py-1 text-xs font-bold text-zinc-300 hover:bg-zinc-800 disabled:opacity-35 cursor-pointer disabled:cursor-not-allowed"
                  >
                    -1
                  </button>
                  <button
                    disabled={specialistsCount >= MAX_GRADING_SPECIALISTS}
                    onClick={() => onHireStaff('gradingSpecialists', 'hire')}
                    className="flex items-center gap-1 rounded-lg bg-sky-500 hover:bg-sky-400 px-2.5 py-1 text-[11px] font-bold text-black disabled:opacity-35 cursor-pointer disabled:cursor-not-allowed"
                  >
                    <UserPlus className="h-3 w-3" />
                    <span>+1 (${GRADING_SPECIALIST_WAGE}/h)</span>
                  </button>
                </div>
              </div>
            </div>

            {/* 6-Tab Navigation Bar */}
            <nav className="shrink-0 flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-5 py-2 bg-[#090C12]">
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  onClick={() => setActiveTab('submit')}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                    activeTab === 'submit'
                      ? 'bg-sky-400 text-black'
                      : 'bg-[#121826] text-zinc-300 hover:bg-white/10 border border-white/8'
                  }`}
                >
                  <Microscope className="h-3.5 w-3.5" />
                  <span>Gửi &amp; Soi 10x</span>
                  <span className={`tabular-nums text-[11px] ${activeTab === 'submit' ? 'text-black/75' : 'text-zinc-400'}`}>
                    ({rawCandidates.length})
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab('queue')}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                    activeTab === 'queue'
                      ? 'bg-amber-400 text-black'
                      : 'bg-[#121826] text-zinc-300 hover:bg-white/10 border border-white/8'
                  }`}
                >
                  <Clock className="h-3.5 w-3.5" />
                  <span>Đang Chấm</span>
                  <span className={`tabular-nums text-[11px] ${activeTab === 'queue' ? 'text-black/75' : 'text-zinc-400'}`}>
                    ({gradingJobs.length})
                  </span>
                  {completedJobs.length > 0 && (
                    <span className="rounded bg-emerald-500 px-1.5 py-0.2 text-[10px] font-extrabold text-black tabular-nums">
                      {completedJobs.length}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('auction')}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                    activeTab === 'auction'
                      ? 'bg-rose-500 text-white'
                      : 'bg-[#121826] text-zinc-300 hover:bg-white/10 border border-white/8'
                  }`}
                >
                  <Gavel className="h-3.5 w-3.5" />
                  <span>Sàn Đấu Giá VIP</span>
                  <span className={`tabular-nums text-[11px] ${activeTab === 'auction' ? 'text-white/80' : 'text-zinc-400'}`}>
                    ({slabAuctions.length})
                  </span>
                  {consignmentOffers.length > 0 && (
                    <span className="rounded bg-amber-400 px-1.5 py-0.2 text-[10px] font-extrabold text-black tabular-nums">
                      +{consignmentOffers.length}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('orders')}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                    activeTab === 'orders'
                      ? 'bg-cyan-400 text-black'
                      : 'bg-[#121826] text-zinc-300 hover:bg-white/10 border border-white/8'
                  }`}
                >
                  <ClipboardList className="h-3.5 w-3.5" />
                  <span>Thu Mua &amp; Hợp Đồng VIP</span>
                  {waitingOrdersCount > 0 && (
                    <span className="rounded bg-amber-400 px-1.5 py-0.2 text-[10px] font-extrabold text-black tabular-nums">
                      {waitingOrdersCount}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('vault')}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                    activeTab === 'vault'
                      ? 'bg-emerald-400 text-black'
                      : 'bg-[#121826] text-zinc-300 hover:bg-white/10 border border-white/8'
                  }`}
                >
                  <Award className="h-3.5 w-3.5" />
                  <span>Kho Slab &amp; Pop</span>
                  <span className={`tabular-nums text-[11px] ${activeTab === 'vault' ? 'text-black/75' : 'text-zinc-400'}`}>
                    ({ownedSlabs.length})
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab('research')}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                    activeTab === 'research'
                      ? 'bg-violet-400 text-black'
                      : 'bg-[#121826] text-zinc-300 hover:bg-white/10 border border-white/8'
                  }`}
                >
                  <BookOpen className="h-3.5 w-3.5" />
                  <span>Nghiên Cứu &amp; ROI</span>
                </button>
              </div>

              <div className="hidden lg:flex items-center gap-1.5 rounded-lg border border-white/8 bg-[#101521] px-2.5 py-1 text-[11px] tabular-nums text-zinc-400">
                <span>Hàng đợi:</span>
                <span className="font-bold text-white">
                  {activeOrQueuedJobs.length}/{speedStats.maxQueue}
                </span>
              </div>
            </nav>

            {/* Tab Content Area */}
            <div
              className={`flex-1 min-h-0 p-4 sm:p-5 ${
                activeTab === 'submit' ? 'overflow-y-auto lg:overflow-hidden' : 'overflow-y-auto custom-dark-scrollbar'
              }`}
            >
              {/* TAB 1: SUBMIT & 10X LOUPE PRE-SCREEN */}
              {activeTab === 'submit' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:h-full lg:min-h-0">
                  {/* Left Rail: Options (scrollable) + Pinned Checkout CTA (always visible!) */}
                  <div className="lg:col-span-4 flex flex-col lg:h-full lg:min-h-0 rounded-xl border border-white/10 bg-[#0E131F] overflow-hidden">
                    <div className="flex-1 min-h-0 overflow-y-auto p-3.5 space-y-3 custom-dark-scrollbar">
                      {/* 1. Company Selector */}
                      <div className="space-y-2">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                          1. Chọn Hãng Thẩm Định
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <button
                            onClick={() => {
                              soundManager.playSelectSound();
                              setSelectedCompany('PSA');
                            }}
                            className={`rounded-xl border p-2 text-left transition cursor-pointer ${
                              selectedCompany === 'PSA'
                                ? 'border-red-500/80 bg-red-950/35'
                                : 'border-white/8 bg-[#090C12] hover:border-white/25'
                            }`}
                          >
                            <div className="text-sm font-black text-red-400">PSA</div>
                            <div className="text-[10px] text-zinc-300">Nhãn Đỏ</div>
                            <div className="text-[11px] font-bold text-amber-300 tabular-nums mt-1">
                              10 = x2.8
                            </div>
                          </button>

                          <button
                            onClick={() => {
                              soundManager.playSelectSound();
                              setSelectedCompany('CGC');
                            }}
                            className={`rounded-xl border p-2 text-left transition cursor-pointer ${
                              selectedCompany === 'CGC'
                                ? 'border-cyan-400/80 bg-cyan-950/30'
                                : 'border-white/8 bg-[#090C12] hover:border-white/25'
                            }`}
                          >
                            <div className="text-sm font-black text-cyan-300">CGC</div>
                            <div className="text-[10px] text-zinc-300">Pristine</div>
                            <div className="text-[11px] font-bold text-amber-300 tabular-nums mt-1">
                              10P = x3.4
                            </div>
                          </button>

                          <button
                            onClick={() => {
                              soundManager.playSelectSound();
                              setSelectedCompany('BGS');
                            }}
                            className={`rounded-xl border p-2 text-left transition cursor-pointer ${
                              selectedCompany === 'BGS'
                                ? 'border-amber-400/85 bg-amber-950/30'
                                : 'border-white/8 bg-[#090C12] hover:border-white/25'
                            }`}
                          >
                            <div className="text-sm font-black text-amber-300">BGS</div>
                            <div className="text-[10px] text-zinc-300">Black Label</div>
                            <div className="text-[11px] font-bold text-yellow-300 tabular-nums mt-1">
                              BL = x5.2
                            </div>
                          </button>
                        </div>
                      </div>

                      {/* 2. Service Tier & UV Cleaning */}
                      <div className="space-y-2 border-t border-white/8 pt-3">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                          2. Gói Dịch Vụ &amp; Vệ Sinh UV
                        </div>
                        <div className="space-y-1.5">
                          {(Object.keys(GRADING_SERVICE_TIERS) as GradingServiceTierId[]).map((tid) => {
                            const t = GRADING_SERVICE_TIERS[tid];
                            const active = selectedTier === tid;
                            return (
                              <button
                                key={tid}
                                onClick={() => {
                                  soundManager.playSelectSound();
                                  setSelectedTier(tid);
                                }}
                                className={`w-full rounded-xl border px-3 py-2 text-left transition cursor-pointer ${
                                  active
                                    ? 'border-sky-400/80 bg-sky-950/35'
                                    : 'border-white/8 bg-[#090C12] hover:border-white/25'
                                }`}
                              >
                                <div className="flex items-center justify-between gap-2 text-xs font-bold">
                                  <span className="text-white">{t.name}</span>
                                  <span className="text-amber-300 tabular-nums">
                                    ${t.fee}/thẻ · {t.badge}
                                  </span>
                                </div>
                                <div className="text-[11px] text-zinc-400 mt-0.5 leading-snug">
                                  {t.description}
                                </div>
                              </button>
                            );
                          })}
                        </div>

                        <button
                          onClick={() => {
                            soundManager.playSelectSound();
                            setCleanSurface((v) => !v);
                          }}
                          className={`w-full flex items-center justify-between rounded-xl border px-3 py-2 text-xs transition cursor-pointer ${
                            cleanSurface
                              ? 'border-emerald-400/80 bg-emerald-950/35 text-emerald-200'
                              : 'border-white/8 bg-[#090C12] text-zinc-300 hover:border-white/25'
                          }`}
                        >
                          <div className="text-left">
                            <div className="font-bold">Vệ Sinh Microfiber + UV</div>
                            <div className="text-[10px] text-zinc-400">+2.5% cơ hội Grade 10 / Black Label</div>
                          </div>
                          <span className="font-extrabold text-amber-300 tabular-nums">
                            +${GRADING_CLEANING_FEE}
                          </span>
                        </button>
                      </div>

                      {/* 3. Live 10x Loupe Pre-Screening Box (only when focused card exists) */}
                      {focusedCandidate && focusedInspection && focusedRoi && (
                        <div className="rounded-xl border border-sky-500/30 bg-[#090D16] p-3 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 text-[11px] font-bold text-sky-300 uppercase">
                              <Eye className="h-3.5 w-3.5" />
                              <span>Soi Kính Lúp 10x</span>
                            </div>
                            <span className="text-[10px] font-bold text-amber-300">
                              {focusedInspection.conditionTag}
                            </span>
                          </div>

                          <div className="text-xs font-bold text-white truncate">
                            {focusedCandidate.card.name} · Raw ${(focusedCandidate.card.marketPrice || 0).toFixed(0)}
                          </div>

                          <div className="grid grid-cols-4 gap-1.5 text-center tabular-nums">
                            {[
                              { k: 'CTR', v: focusedInspection.centering },
                              { k: 'CRN', v: focusedInspection.corners },
                              { k: 'EDG', v: focusedInspection.edges },
                              { k: 'SRF', v: focusedInspection.surface },
                            ].map((sub) => (
                              <div
                                key={sub.k}
                                className="rounded-lg border border-white/8 bg-[#121826] py-1"
                              >
                                <div className="text-[9px] text-zinc-400 font-semibold">{sub.k}</div>
                                <div
                                  className={`text-xs font-black ${
                                    sub.v >= 9.5 ? 'text-emerald-300' : sub.v >= 9.0 ? 'text-sky-300' : 'text-amber-300'
                                  }`}
                                >
                                  {sub.v.toFixed(1)}
                                </div>
                              </div>
                            ))}
                          </div>

                          <div className="space-y-1 text-[11px] tabular-nums">
                            <div className="flex justify-between text-zinc-400">
                              <span>Tỷ lệ tâm thẻ:</span>
                              <span className="text-white font-semibold">{focusedInspection.centeringRatio}</span>
                            </div>
                            <div className="flex justify-between text-zinc-400">
                              <span>Cơ hội Grade 10 / 9.5+:</span>
                              <span className="text-amber-300 font-bold">
                                {(
                                  focusedInspection.grade10PotentialPct +
                                  tierInfo.grade10BonusPct +
                                  (cleanSurface ? 2.5 : 0)
                                ).toFixed(1)}%
                              </span>
                            </div>
                            <div className="flex justify-between text-zinc-400">
                              <span>Lãi kỳ vọng (+EV):</span>
                              <span
                                className={`font-bold ${
                                  focusedRoi.expectedNetProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                                }`}
                              >
                                {focusedRoi.expectedNetProfit >= 0 ? '+' : ''}${focusedRoi.expectedNetProfit.toFixed(0)} (Hòa vốn ≥ ${focusedRoi.breakevenRawPrice})
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Pinned Sticky Bottom Checkout Footer (NEVER CLIPPED) */}
                    <div className="shrink-0 border-t border-white/10 bg-[#121826] p-3.5 space-y-2.5">
                      <div className="space-y-1 text-xs tabular-nums">
                        <div className="flex justify-between text-zinc-400">
                          <span>Đã chọn ({tierInfo.name}):</span>
                          <span className="font-semibold text-zinc-200">
                            {selectedItems.length} thẻ × ${feePerCard}
                          </span>
                        </div>
                        <div className="flex justify-between items-baseline text-sm font-extrabold">
                          <span className="text-white">Tổng chi phí:</span>
                          <span className="text-base text-emerald-400">${totalFee.toLocaleString()}</span>
                        </div>
                      </div>

                      {!isStaffOnShift && (
                        <div className="rounded-lg border border-indigo-500/35 bg-indigo-950/40 px-2.5 py-1.5 text-[11px] text-indigo-200">
                          Ngoài ca làm việc (07:00–22:00). Quay lại vào ca sáng!
                        </div>
                      )}
                      {(receptionistCount < 1 || specialistsCount < 1) && (
                        <div className="rounded-lg border border-rose-500/35 bg-rose-950/35 px-2.5 py-1.5 text-[11px] text-rose-200">
                          Cần thuê 1 Lễ Tân và ≥ 1 Chuyên Gia ở thanh phía trên.
                        </div>
                      )}

                      <button
                        disabled={!canSubmit}
                        onClick={handleSubmitSelected}
                        className="w-full rounded-xl bg-sky-400 hover:bg-sky-300 py-2.5 px-3 font-extrabold text-xs sm:text-sm text-black disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed transition"
                      >
                        {!isStaffOnShift
                          ? 'Ngoài Giờ Làm Việc (07:00–22:00)'
                          : `Gửi Chấm ${selectedCompany} (${selectedItems.length} thẻ · $${totalFee.toLocaleString()})`}
                      </button>
                    </div>
                  </div>

                  {/* Right Rail: Owned Raw Cards Picker */}
                  <div className="lg:col-span-8 flex flex-col lg:h-full lg:min-h-0 space-y-3">
                    {/* Filter & Search Toolbar */}
                    <div className="shrink-0 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {(['all', 'pokemon', 'onepiece'] as const).map((f) => (
                          <button
                            key={f}
                            onClick={() => setUniverseFilter(f)}
                            className={`rounded-lg px-3 py-1.5 text-xs font-bold cursor-pointer transition ${
                              universeFilter === f
                                ? 'bg-amber-400 text-black'
                                : 'bg-[#121826] text-zinc-300 hover:bg-white/10 border border-white/8'
                            }`}
                          >
                            {f === 'all' ? 'Tất Cả' : f === 'pokemon' ? 'Pokémon' : 'One Piece'}
                          </button>
                        ))}
                        <button
                          onClick={handleSelectTopProfitable}
                          disabled={filteredCandidates.length === 0}
                          className="rounded-lg border border-emerald-500/35 bg-emerald-950/30 hover:bg-emerald-900/40 px-2.5 py-1.5 text-xs font-bold text-emerald-300 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition"
                        >
                          Chọn Nhanh Lãi +EV
                        </button>
                        {selectedKeys.length > 0 && (
                          <button
                            onClick={() => setSelectedKeys([])}
                            className="rounded-lg border border-white/10 bg-[#121826] hover:bg-zinc-800 px-2.5 py-1.5 text-xs font-semibold text-zinc-300 cursor-pointer"
                          >
                            Bỏ chọn ({selectedKeys.length})
                          </button>
                        )}
                      </div>

                      <div className="relative flex-1 min-w-[180px] max-w-xs">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
                        <input
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Tìm tên thẻ Raw..."
                          className="w-full rounded-lg border border-white/10 bg-[#101521] pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-zinc-500 focus:border-sky-400 focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Grid or Actionable Empty State */}
                    {filteredCandidates.length === 0 ? (
                      <div className="flex-1 flex flex-col items-center justify-center rounded-xl border border-dashed border-white/12 bg-[#0E131F] p-8 text-center space-y-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-[#151C2C] text-zinc-400">
                          <Layers className="h-6 w-6" />
                        </div>
                        <div className="space-y-1">
                          <div className="text-sm font-bold text-white">
                            {hasFilterActive ? 'Không tìm thấy thẻ Raw khớp bộ lọc' : 'Chưa có thẻ Raw để gửi chấm'}
                          </div>
                          <p className="max-w-md text-xs text-zinc-400 leading-relaxed">
                            Mở Pack/Box rồi cất thẻ vào Binder, trưng lên kệ, hoặc thu mua thẻ Raw giá hời từ khách vãng lai.
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                          {hasFilterActive && (
                            <button
                              onClick={() => {
                                setUniverseFilter('all');
                                setSearchQuery('');
                              }}
                              className="rounded-lg border border-white/15 bg-[#151C2C] hover:bg-white/10 px-3.5 py-2 text-xs font-bold text-white cursor-pointer transition"
                            >
                              Xóa Bộ Lọc
                            </button>
                          )}
                          <button
                            onClick={() => setActiveTab('orders')}
                            className="rounded-lg bg-cyan-400 hover:bg-cyan-300 px-4 py-2 text-xs font-extrabold text-black cursor-pointer transition flex items-center gap-1.5"
                          >
                            <ClipboardList className="h-3.5 w-3.5" />
                            <span>
                              Qua Quầy Thu Mua Khách ({buybackOffers.length > 0 ? `${buybackOffers.length} thẻ đang chào` : 'Mở Tab Thu Mua'})
                            </span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 min-h-0 overflow-y-auto pr-1 custom-dark-scrollbar">
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                          {filteredCandidates.map((item) => {
                            const isSelected = selectedKeys.includes(item.key);
                            const isFocused = focusedCandidate?.key === item.key;
                            const isOp = item.card.universe === 'onepiece';
                            const insp = inspectRawCardForGrading(item.card, item.key);
                            const roi = getGradingCardRoiAdvice(
                              item.card.marketPrice || 1,
                              selectedCompany,
                              selectedTier,
                              insp.grade10PotentialPct,
                              cleanSurface
                            );

                            return (
                              <button
                                key={item.key}
                                onClick={() => toggleSelect(item.key)}
                                onMouseEnter={() => setInspectedKey(item.key)}
                                className={`group relative flex flex-col items-center rounded-xl border p-2 text-left transition cursor-pointer ${
                                  isSelected
                                    ? 'border-sky-400 bg-sky-950/35'
                                    : isFocused
                                    ? 'border-amber-400/50 bg-[#121826]'
                                    : 'border-white/8 bg-[#101521] hover:border-white/25'
                                }`}
                              >
                                <div className="relative w-full aspect-[63/88] rounded-lg overflow-hidden bg-black/50 mb-1.5">
                                  <img
                                    src={item.card.imageUrl}
                                    alt={item.card.name}
                                    className="w-full h-full object-contain"
                                  />
                                  <span
                                    className={`absolute top-1 left-1 rounded px-1.5 py-0.5 text-[9px] font-black ${
                                      isOp ? 'bg-rose-600 text-white' : 'bg-amber-400 text-black'
                                    }`}
                                  >
                                    {isOp ? 'OP' : 'PKM'}
                                  </span>
                                  <span className="absolute top-1 right-1 rounded bg-black/85 px-1.5 py-0.5 text-[9px] font-bold text-zinc-200 border border-white/15 tabular-nums">
                                    {item.sourceType === 'binder' ? `x${item.quantity}` : 'Kệ'}
                                  </span>
                                  <span
                                    className={`absolute bottom-1 left-1 rounded px-1.5 py-0.5 text-[9px] font-extrabold tabular-nums ${
                                      roi.expectedNetProfit >= 0
                                        ? 'bg-emerald-500/95 text-black'
                                        : 'bg-zinc-900/90 text-zinc-300 border border-white/10'
                                    }`}
                                  >
                                    {roi.expectedNetProfit >= 0 ? `+EV $${roi.expectedNetProfit.toFixed(0)}` : 'Rủi ro'}
                                  </span>
                                  {isSelected && (
                                    <div className="absolute inset-0 bg-sky-500/20 flex items-center justify-center">
                                      <CheckCircle2 className="h-8 w-8 text-sky-300 drop-shadow-lg" />
                                    </div>
                                  )}
                                </div>
                                <div className="w-full text-[11px] font-bold text-white truncate">
                                  {item.card.name}
                                </div>
                                <div className="w-full flex items-center justify-between text-[10px] tabular-nums mt-0.5">
                                  <span className="text-zinc-400 truncate">
                                    10x: {((insp.centering + insp.corners + insp.edges + insp.surface) / 4).toFixed(1)}
                                  </span>
                                  <span className="font-bold text-emerald-400">
                                    ${(item.card.marketPrice || 0).toFixed(0)}
                                  </span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: QUEUE & COMPLETED SLABS */}
              {activeTab === 'queue' && (
                <div className="space-y-4">
                  {completedJobs.length > 0 && onClaimAllCompleted && (
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-500/35 bg-emerald-950/25 px-4 py-2.5">
                      <div className="text-xs font-bold text-emerald-200">
                        Có {completedJobs.length} thẻ đã hàn hộp xong và sẵn sàng nhận!
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onClaimAllCompleted('vault')}
                          className="rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-white/10 px-3 py-1.5 text-xs font-bold text-white cursor-pointer"
                        >
                          Cất Tất Cả Vào Kho
                        </button>
                        <button
                          onClick={() => onClaimAllCompleted('showcase')}
                          className="rounded-lg bg-sky-400 hover:bg-sky-300 px-3 py-1.5 text-xs font-extrabold text-black cursor-pointer"
                        >
                          Trưng Bày Tất Cả
                        </button>
                      </div>
                    </div>
                  )}

                  {gradingJobs.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-white/12 bg-[#0E131F] p-10 text-center space-y-3">
                      <Clock className="h-7 w-7 text-zinc-500 mx-auto" />
                      <div className="text-xs text-zinc-400">
                        Hiện chưa có thẻ nào trong phòng thẩm định. Chuyển sang tab <strong className="text-white">Gửi &amp; Soi 10x</strong> để bắt đầu!
                      </div>
                      <button
                        onClick={() => setActiveTab('submit')}
                        className="rounded-lg bg-sky-400 hover:bg-sky-300 px-4 py-1.5 text-xs font-extrabold text-black cursor-pointer"
                      >
                        Chọn Thẻ Gửi Chấm
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {gradingJobs.map((job) => {
                        const pct =
                          job.status === 'completed'
                            ? 100
                            : job.status === 'grading' && job.durationMs > 0
                            ? Math.min(100, Math.round((job.elapsedMs / job.durationMs) * 100))
                            : 0;
                        const remainSec =
                          job.status === 'grading'
                            ? Math.max(0, Math.ceil((job.durationMs - job.elapsedMs) / 1000))
                            : 0;
                        const stageText =
                          job.status === 'queued'
                            ? 'Đang xếp hàng chờ bàn thẩm định'
                            : pct < 25
                            ? `Tiếp nhận & soi UV 10x (${remainSec}s)`
                            : pct < 55
                            ? `Quét laser cân tâm (${remainSec}s)`
                            : pct < 85
                            ? `Chấm 4 tiêu chí (${remainSec}s)`
                            : `Hàn siêu âm & cấp mã Cert (${remainSec}s)`;

                        return (
                          <div
                            key={job.id}
                            className={`flex items-center gap-3 rounded-xl border p-3 ${
                              job.status === 'completed'
                                ? 'border-emerald-500/45 bg-emerald-950/20'
                                : 'border-white/10 bg-[#101521]'
                            }`}
                          >
                            <img
                              src={job.card.imageUrl}
                              alt={job.card.name}
                              className="h-20 w-14 rounded-lg object-contain bg-black shrink-0"
                            />
                            <div className="flex-1 min-w-0 space-y-1.5">
                              <div className="flex items-center justify-between gap-2">
                                <div className="text-xs font-bold text-white truncate">{job.card.name}</div>
                                <span
                                  className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold tabular-nums ${
                                    job.company === 'PSA'
                                      ? 'bg-red-500/20 text-red-300 border border-red-500/35'
                                      : job.company === 'BGS'
                                      ? 'bg-amber-500/20 text-amber-300 border border-amber-400/45'
                                      : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/35'
                                  }`}
                                >
                                  {job.company} · ${job.feePaid}
                                </span>
                              </div>

                              {job.status === 'completed' && job.resultSlab ? (
                                <>
                                  <div className="flex items-center justify-between text-[11px] tabular-nums">
                                    <span
                                      className={`font-extrabold ${
                                        job.resultSlab.grade >= 10
                                          ? 'text-amber-300'
                                          : job.resultSlab.grade >= 9
                                          ? 'text-emerald-300'
                                          : 'text-sky-300'
                                      }`}
                                    >
                                      ✓ {job.resultSlab.company} {job.resultSlab.gradeLabel}
                                      {job.resultSlab.isCertFancy ? ' ★' : ''}
                                    </span>
                                    <span className="font-bold text-emerald-400">
                                      ${(job.gradedPrice || 0).toLocaleString()}
                                    </span>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                    <button
                                      onClick={() => setRevealedJob(job)}
                                      className="rounded-lg bg-amber-400 hover:bg-amber-300 px-2.5 py-1 text-[10px] font-extrabold text-black cursor-pointer"
                                    >
                                      Xem Slab &amp; 4 Tiêu Chí
                                    </button>
                                    <button
                                      onClick={() => onClaimCompletedJob(job.id, 'showcase')}
                                      className="rounded-lg bg-sky-400 hover:bg-sky-300 px-2.5 py-1 text-[10px] font-extrabold text-black cursor-pointer"
                                    >
                                      Trưng Bày Bán
                                    </button>
                                    <button
                                      onClick={() => onClaimCompletedJob(job.id, 'vault')}
                                      className="rounded-lg bg-zinc-800 hover:bg-zinc-700 px-2.5 py-1 text-[10px] font-bold text-zinc-200 cursor-pointer"
                                    >
                                      Cất Kho
                                    </button>
                                    <button
                                      onClick={() => onClaimCompletedJob(job.id, 'sell')}
                                      className="rounded-lg bg-emerald-600 hover:bg-emerald-500 px-2.5 py-1 text-[10px] font-extrabold text-white cursor-pointer tabular-nums"
                                    >
                                      Bán +${(job.gradedPrice || 0).toLocaleString()}
                                    </button>
                                  </div>
                                </>
                              ) : (
                                <>
                                  <div className="flex justify-between text-[11px] text-zinc-400">
                                    <span>{stageText}</span>
                                    <span className="font-bold text-sky-300 tabular-nums">{pct}%</span>
                                  </div>
                                  <div className="h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden">
                                    <div
                                      className="h-full bg-gradient-to-r from-sky-400 to-amber-400 transition-all duration-300"
                                      style={{ width: `${pct}%` }}
                                    />
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: LIVE VIP AUCTION SHOWROOM (COMMISSION BROKERAGE + USER/NPC PARTICIPATION) */}
              {activeTab === 'auction' && (
                <div className="space-y-4">
                  {/* Auction Broker Earnings KPI Strip */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 tabular-nums">
                    <div className="rounded-xl border border-emerald-500/25 bg-[#0E131F] px-3.5 py-2.5 flex items-center justify-between">
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                          Hoa Hồng Ký Gửi Đã Thu
                        </div>
                        <div className="text-base font-black text-emerald-400 mt-0.5">
                          +${(labStats?.consignmentCommissionEarned || 0).toLocaleString()}
                        </div>
                      </div>
                      <span className="rounded-lg bg-emerald-500/15 border border-emerald-500/30 px-2 py-1 text-[11px] font-extrabold text-emerald-300">
                        {labStats?.consignmentLotsCompleted || 0} phiên
                      </span>
                    </div>

                    <div className="rounded-xl border border-amber-400/25 bg-[#0E131F] px-3.5 py-2.5 flex items-center justify-between">
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                          Tỷ Lệ Hoa Hồng Sàn
                        </div>
                        <div className="text-base font-black text-amber-300 mt-0.5">
                          {currentCommissionPct}% / lô NPC
                        </div>
                      </div>
                      <span className="text-[11px] text-zinc-400 text-right leading-tight">
                        18% gốc {auctionHostCount > 0 ? '+2% MC' : ''}{auctionSchedule.isPrimeTime ? ' +2% Vàng' : ''}
                      </span>
                    </div>

                    <div className="rounded-xl border border-sky-500/25 bg-[#0E131F] px-3.5 py-2.5 flex items-center justify-between">
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                          Khách Ký Gửi Chờ Duyệt
                        </div>
                        <div className="text-base font-black text-sky-300 mt-0.5">
                          {consignmentOffers.length} / 4 thẻ NPC
                        </div>
                      </div>
                      <span className="text-[11px] text-zinc-400">
                        {auctionSchedule.isOpen ? 'Sàn Đang Mở' : 'Đóng (09–22h)'}
                      </span>
                    </div>
                  </div>

                  {/* Auction Showroom Staff Bar */}
                  <div className="rounded-xl border border-amber-400/25 bg-[#0E131F] p-3.5 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Gavel className="h-4 w-4 text-amber-400" />
                        <span className="text-xs font-extrabold uppercase tracking-wider text-amber-300">
                          Nhân Sự Sàn Đấu Giá VIP
                        </span>
                        <span className="text-[11px] text-zinc-400">
                          · {auctionSchedule.statusLabel}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {onInviteConsignmentOffer && (
                          <button
                            type="button"
                            disabled={(auctioneerCount < 1 && auctionHostCount < 1) || !auctionSchedule.isOpen || consignmentOffers.length >= 4}
                            onClick={onInviteConsignmentOffer}
                            className="flex items-center gap-1.5 rounded-lg border border-sky-400/40 bg-sky-500/15 hover:bg-sky-500/25 disabled:opacity-40 px-3 py-1.5 text-[11px] font-extrabold text-sky-200 cursor-pointer disabled:cursor-not-allowed transition"
                          >
                            <UserPlus className="h-3.5 w-3.5" />
                            <span>
                              {auctioneerCount < 1 && auctionHostCount < 1
                                ? 'Thuê Chủ Tọa / MC để gọi khách'
                                : consignmentOffers.length >= 4
                                ? 'Hàng chờ đầy (4/4)'
                                : 'Mời Khách NPC Gửi Thẻ'}
                            </span>
                          </button>
                        )}
                        {onStartConsignmentAuction && (
                          <button
                            type="button"
                            disabled={auctioneerCount < 1 || !auctionSchedule.isOpen || slabAuctions.length >= 2}
                            onClick={onStartConsignmentAuction}
                            className="flex items-center gap-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 disabled:opacity-40 px-3 py-1.5 text-[11px] font-extrabold text-black cursor-pointer disabled:cursor-not-allowed transition"
                          >
                            <Sparkles className="h-3.5 w-3.5" />
                            <span>Khai Sàn Nhanh 1 Lô NPC ({currentCommissionPct}% HH)</span>
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      {/* Auctioneer */}
                      <div className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-[#121826] px-3.5 py-2.5">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${
                              auctioneerCount >= 1
                                ? 'border-amber-400/40 bg-amber-500/15 text-amber-300'
                                : 'border-zinc-700 bg-zinc-900 text-zinc-400'
                            }`}
                          >
                            <Gavel className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-white truncate">
                              Chủ Tọa Đấu Giá (Auctioneer)
                            </div>
                            <div className="text-[11px] text-zinc-400 tabular-nums truncate">
                              {auctioneerCount >= 1
                                ? `Đang trực bục · Gọi khách ký gửi · +10% Trần Bid · $${AUCTIONEER_WAGE}/h`
                                : `Bắt buộc để mở phiên · +10% Trần Bid · $${AUCTIONEER_WAGE}/h`}
                            </div>
                          </div>
                        </div>
                        {auctioneerCount >= 1 ? (
                          <button
                            type="button"
                            onClick={() => onHireStaff('auctioneer', 'fire')}
                            className="shrink-0 rounded-lg bg-zinc-800 hover:bg-rose-600/80 border border-white/10 px-3 py-1.5 text-[11px] font-semibold text-zinc-200 cursor-pointer transition"
                          >
                            Nghỉ Việc
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onHireStaff('auctioneer', 'hire')}
                            className="shrink-0 rounded-lg bg-amber-400 hover:bg-amber-300 px-3 py-1.5 text-[11px] font-extrabold text-black cursor-pointer"
                          >
                            Thuê (${AUCTIONEER_WAGE}/h)
                          </button>
                        )}
                      </div>

                      {/* Auction Host */}
                      <div className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-[#121826] px-3.5 py-2.5">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${
                              auctionHostCount >= 1
                                ? 'border-emerald-400/40 bg-emerald-500/15 text-emerald-300'
                                : 'border-zinc-700 bg-zinc-900 text-zinc-400'
                            }`}
                          >
                            <Megaphone className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-white truncate">
                              MC Kéo Khách &amp; Ký Gửi VIP
                            </div>
                            <div className="text-[11px] text-zinc-400 tabular-nums truncate">
                              {auctionHostCount >= 1
                                ? `Kéo khách nhanh +2% HH · +12% Trần Bid · $${AUCTION_HOST_WAGE}/h`
                                : `Kéo khách ký gửi nhanh +2% HH · +12% Trần Bid · $${AUCTION_HOST_WAGE}/h`}
                            </div>
                          </div>
                        </div>
                        {auctionHostCount >= 1 ? (
                          <button
                            type="button"
                            onClick={() => onHireStaff('auctionHost', 'fire')}
                            className="shrink-0 rounded-lg bg-zinc-800 hover:bg-rose-600/80 border border-white/10 px-3 py-1.5 text-[11px] font-semibold text-zinc-200 cursor-pointer transition"
                          >
                            Nghỉ Việc
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onHireStaff('auctionHost', 'hire')}
                            className="shrink-0 rounded-lg bg-emerald-500 hover:bg-emerald-400 px-3 py-1.5 text-[11px] font-extrabold text-black cursor-pointer"
                          >
                            Thuê (${AUCTION_HOST_WAGE}/h)
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* SECTION 1: LIVE AUCTION LOTS ON STAGE */}
                  {slabAuctions.length > 0 ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {slabAuctions.map((lot) => {
                        const secLeft = Math.max(0, Math.ceil(lot.remainingMs / 1000));
                        const reserveReached = lot.bidCount > 0 && lot.currentBid >= lot.reservePrice;
                        const progressPct = Math.min(100, Math.round((lot.currentBid / Math.max(1, lot.maxCeilingBid)) * 100));
                        const lotCommRate = lot.commissionRate ?? AUCTION_BROKER_COMMISSION_RATE;
                        const lotCommPct = Math.round(lotCommRate * 100);
                        const commissionAmount = lot.isConsignment
                          ? Math.max(10, Math.round(lot.currentBid * lotCommRate))
                          : lot.currentBid;
                        const netToConsignor = Math.max(0, lot.currentBid - commissionAmount);
                        const nextBid5Pct = Math.max(
                          lot.currentBid + Math.max(10, Math.round(lot.startPrice * 0.05)),
                          Math.round(lot.currentBid * 1.06)
                        );
                        const netPlayerBidCost = Math.max(
                          0,
                          nextBid5Pct - Math.max(10, Math.round(nextBid5Pct * lotCommRate))
                        );

                        return (
                          <div
                            key={lot.id}
                            className={`rounded-xl border p-4 space-y-3 ${
                              lot.status === 'ended'
                                ? 'border-amber-400/60 bg-amber-950/20'
                                : 'border-rose-500/45 bg-[#0E131F]'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <span
                                  className={`rounded px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${
                                    lot.isConsignment
                                      ? 'bg-amber-400/20 text-amber-300 border border-amber-400/35'
                                      : 'bg-sky-400/20 text-sky-300 border border-sky-400/35'
                                  }`}
                                >
                                  {lot.isConsignment ? `Ký Gửi NPC · HH ${lotCommPct}%` : 'Thẻ Của Bạn · Thu 100%'}
                                </span>
                                <span className="text-[11px] font-bold text-zinc-300 truncate">
                                  {lot.isConsignment ? `Chủ thẻ: ${lot.consignorName || 'Collector'}` : 'Chủ thẻ: Cửa hàng'}
                                </span>
                              </div>
                              <span className="text-xs font-extrabold text-amber-300 tabular-nums shrink-0">
                                {lot.status === 'live' ? `${secLeft}s` : 'Chờ Chốt Búa'}
                              </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                              <div className="sm:col-span-5">
                                <GradedSlabCard
                                  card={lot.entry.card}
                                  slab={lot.entry.slab}
                                  cardHeightStyle="155px"
                                  showSubgrades={true}
                                />
                              </div>

                              <div className="sm:col-span-7 space-y-2">
                                <div className="text-sm font-extrabold text-white truncate">{lot.entry.card.name}</div>
                                <div className="rounded-lg border border-white/8 bg-[#121826] p-2.5 space-y-1 tabular-nums text-xs">
                                  <div className="flex justify-between">
                                    <span className="text-zinc-400">Giá hiện tại:</span>
                                    <span className="text-base font-black text-emerald-400">
                                      ${lot.currentBid.toLocaleString()}
                                    </span>
                                  </div>
                                  {lot.isConsignment && (
                                    <div className="flex justify-between text-[11px]">
                                      <span className="text-zinc-400">Hoa hồng bạn nhận ({lotCommPct}%):</span>
                                      <span className="font-bold text-amber-300">
                                        +${commissionAmount.toLocaleString()} <span className="text-zinc-400 font-normal">(Chủ thẻ ${netToConsignor.toLocaleString()})</span>
                                      </span>
                                    </div>
                                  )}
                                  <div className="flex justify-between text-[11px]">
                                    <span className="text-zinc-400">Giá sàn (Reserve):</span>
                                    <span className={reserveReached ? 'text-emerald-300 font-bold' : 'text-amber-300'}>
                                      ${lot.reservePrice.toLocaleString()} {reserveReached ? '✓ Đạt' : '(Chưa đạt)'}
                                    </span>
                                  </div>
                                  <div className="flex justify-between text-[11px]">
                                    <span className="text-zinc-400">Người dẫn đầu:</span>
                                    <span className={`font-bold truncate max-w-[165px] ${lot.highestBidderIsPlayer ? 'text-sky-300' : 'text-white'}`}>
                                      {lot.highestBidderName || 'Chờ lệnh mở bát...'}
                                    </span>
                                  </div>
                                  <div className="h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden mt-1">
                                    <div
                                      className="h-full bg-gradient-to-r from-amber-400 to-emerald-400 transition-all duration-300"
                                      style={{ width: `${progressPct}%` }}
                                    />
                                  </div>
                                </div>

                                <div className="rounded-lg border border-white/8 bg-[#090C12] p-2 max-h-24 overflow-y-auto space-y-1 text-[11px] tabular-nums">
                                  {lot.bidHistory.length === 0 ? (
                                    <div className="text-zinc-500">Các đại gia Landmark 81 / Porsche đang cân nhắc giá...</div>
                                  ) : (
                                    lot.bidHistory.slice(0, 4).map((ev) => (
                                      <div
                                        key={ev.id}
                                        className={`flex items-center justify-between ${ev.isPlayer ? 'text-sky-300 font-bold' : 'text-zinc-200'}`}
                                      >
                                        <span className="truncate">{ev.bidderName} ({ev.bidderLocation})</span>
                                        <span className="font-bold text-emerald-400 shrink-0">${ev.amount.toLocaleString()}</span>
                                      </div>
                                    ))
                                  )}
                                </div>

                                {/* User Live Bidding Controls on NPC Consignment Lots */}
                                {lot.isConsignment && lot.status === 'live' && onPlaceUserBid && (
                                  <div className="grid grid-cols-2 gap-1.5">
                                    <button
                                      type="button"
                                      disabled={Boolean(lot.highestBidderIsPlayer) || shopState.cash < netPlayerBidCost}
                                      onClick={() => onPlaceUserBid(lot.id, 0.06)}
                                      className="rounded-lg border border-sky-400/50 bg-sky-500/20 hover:bg-sky-500/35 py-1.5 px-2 text-[11px] font-extrabold text-sky-200 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed tabular-nums transition"
                                    >
                                      {lot.highestBidderIsPlayer
                                        ? 'Bạn Đang Dẫn Đầu'
                                        : `Bạn Bid $${nextBid5Pct.toLocaleString()} (Trả $${netPlayerBidCost.toLocaleString()})`}
                                    </button>
                                    <button
                                      type="button"
                                      disabled={Boolean(lot.highestBidderIsPlayer)}
                                      onClick={() => onPlaceUserBid(lot.id, 0.12)}
                                      className="rounded-lg border border-amber-400/45 bg-amber-500/15 hover:bg-amber-500/30 py-1.5 px-2 text-[11px] font-extrabold text-amber-200 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed transition"
                                    >
                                      Đẩy Giá Mạnh +12%
                                    </button>
                                  </div>
                                )}

                                {onSettleAuction && (
                                  <button
                                    disabled={lot.status === 'live'}
                                    onClick={() => onSettleAuction(lot.id)}
                                    className="w-full rounded-lg bg-amber-400 hover:bg-amber-300 py-2 text-xs font-extrabold text-black disabled:opacity-45 cursor-pointer disabled:cursor-not-allowed"
                                  >
                                    {lot.status === 'live'
                                      ? `Đang Đấu Giá (${secLeft}s)...`
                                      : reserveReached
                                      ? lot.isConsignment
                                        ? lot.highestBidderIsPlayer
                                          ? `Nhận Thẻ Thắng Về Kho (-$${netToConsignor.toLocaleString()} trả chủ thẻ)`
                                          : `Chốt Ký Gửi & Thu Hoa Hồng +$${commissionAmount.toLocaleString()} (${lotCommPct}%)`
                                        : `Chốt Búa & Nhận +$${lot.currentBid.toLocaleString()}`
                                      : lot.isConsignment
                                      ? 'Không Đạt Sàn · Trả Chủ Thẻ'
                                      : 'Không Đạt Sàn · Thu Hồi Về Kho'}
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-amber-400/25 bg-[#0E131F] p-5 text-center text-xs text-zinc-300">
                      <Gavel className="h-6 w-6 text-amber-400 mx-auto mb-1.5" />
                      Chưa có phiên đấu giá nào đang chạy trên sân khấu. Duyệt thẻ NPC ký gửi bên dưới để ăn hoa hồng {currentCommissionPct}% hoặc tự đưa thẻ của bạn lên sàn!
                    </div>
                  )}

                  {/* SECTION 2: NPC CONSIGNMENT INTAKE QUEUE (MAIN BROKERAGE FLOW) */}
                  <div className="rounded-xl border border-emerald-500/30 bg-[#0E131F] p-4 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="text-xs font-extrabold uppercase tracking-wider text-emerald-300">
                          1. Thẻ NPC / Nhà Sưu Tầm Gửi Ký Gửi Lên Sàn ({consignmentOffers.length}/4)
                        </div>
                        <p className="text-[11px] text-zinc-400 mt-0.5">
                          Khách mang Slab hiếm đến nhờ sàn bạn đấu giá hộ. Bạn không mất vốn — bán thành công ăn ngay <strong className="text-amber-300">{currentCommissionPct}% hoa hồng</strong>!
                        </p>
                      </div>
                      {onInviteConsignmentOffer && (
                        <button
                          type="button"
                          disabled={(auctioneerCount < 1 && auctionHostCount < 1) || !auctionSchedule.isOpen || consignmentOffers.length >= 4}
                          onClick={onInviteConsignmentOffer}
                          className="rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 px-3 py-1.5 text-[11px] font-extrabold text-black cursor-pointer disabled:cursor-not-allowed transition"
                        >
                          + Mời Khách Ký Gửi
                        </button>
                      )}
                    </div>

                    {consignmentOffers.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-white/12 bg-[#090C12] p-5 text-center text-xs text-zinc-400">
                        {auctioneerCount < 1 && auctionHostCount < 1
                          ? 'Hãy thuê Chủ Tọa hoặc MC Kéo Khách VIP ở trên để các nhà sưu tầm mang thẻ đến ký gửi đấu giá!'
                          : !auctionSchedule.isOpen
                          ? 'Sàn đang đóng cửa ca đêm (09:00 – 22:00). Khách ký gửi sẽ tới vào giờ mở sàn.'
                          : 'Đang chờ nhà sưu tầm tiếp theo gửi thẻ tới quầy ký gửi (hoặc bấm "+ Mời Khách Ký Gửi").'}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {consignmentOffers.map((offer) => {
                          const commPct = Math.round(offer.commissionRate * 100);
                          return (
                            <div
                              key={offer.id}
                              className="flex items-center gap-3 rounded-xl border border-emerald-500/25 bg-[#121826] p-3"
                            >
                              <img
                                src={offer.entry.card.imageUrl}
                                alt={offer.entry.card.name}
                                className="h-24 w-16 rounded-lg object-contain bg-black shrink-0"
                              />
                              <div className="flex-1 min-w-0 space-y-1.5">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="text-xs font-extrabold text-white truncate">
                                    {offer.entry.card.name}
                                  </div>
                                  <span className="rounded bg-amber-400/20 border border-amber-400/35 px-1.5 py-0.5 text-[10px] font-extrabold text-amber-300 tabular-nums shrink-0">
                                    HH {commPct}%
                                  </span>
                                </div>
                                <div className="text-[11px] text-sky-300 font-bold truncate">
                                  {offer.entry.slab.company} {offer.entry.slab.gradeLabel} · Cert #{offer.entry.slab.certNumber}
                                </div>
                                <div className="text-[11px] text-zinc-400 truncate">
                                  Chủ thẻ: <strong className="text-zinc-200">{offer.consignorName}</strong> ({offer.consignorRole})
                                </div>
                                <div className="flex items-center justify-between text-[11px] tabular-nums">
                                  <span className="text-zinc-400">
                                    Sàn: <strong className="text-white">${offer.reservePrice.toLocaleString()}</strong>
                                  </span>
                                  <span className="font-extrabold text-emerald-400">
                                    HH dự kiến: +${offer.estimatedCommission.toLocaleString()}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 pt-0.5">
                                  <button
                                    type="button"
                                    disabled={!onAcceptConsignmentOffer || auctioneerCount < 1 || !auctionSchedule.isOpen || slabAuctions.length >= 2}
                                    onClick={() => onAcceptConsignmentOffer?.(offer.id)}
                                    className="flex-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 py-1.5 px-2 text-[11px] font-extrabold text-black cursor-pointer disabled:cursor-not-allowed"
                                  >
                                    {auctioneerCount < 1
                                      ? 'Cần Chủ Tọa'
                                      : slabAuctions.length >= 2
                                      ? 'Sàn Full (2/2)'
                                      : 'Nhận Ký Gửi & Lên Sàn'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => onDeclineConsignmentOffer?.(offer.id)}
                                    className="rounded-lg bg-zinc-800 hover:bg-rose-700/70 px-2.5 py-1.5 text-[11px] font-bold text-zinc-200 cursor-pointer"
                                  >
                                    Từ Chối
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* SECTION 3: USER SUBMITS OWN SLAB INTO THE AUCTION */}
                  <div className="rounded-xl border border-white/10 bg-[#101521] p-4 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="text-xs font-extrabold uppercase tracking-wider text-sky-300">
                          2. User Tự Thêm Thẻ Của Bạn Vào Buổi Đấu Giá (Kho Slab · Thu 100%)
                        </div>
                        <p className="text-[11px] text-zinc-400 mt-0.5">
                          Nếu bạn muốn thanh lý Slab tự chấm trong Kho cho các đại gia Whale, đưa vào phiên tại đây.
                        </p>
                      </div>
                      <div className="text-xs text-zinc-400 tabular-nums">
                        Kho Slab: <strong className="text-white">{ownedSlabs.length}</strong> thẻ
                      </div>
                    </div>

                    {ownedSlabs.length === 0 ? (
                      <div className="text-xs text-zinc-400 py-3 text-center">
                        Kho Slab của bạn đang trống. (Không bắt buộc — bạn vẫn kiếm hoa hồng đều đặn từ thẻ NPC ký gửi ở mục 1!)
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                        <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-64 overflow-y-auto pr-1 custom-dark-scrollbar">
                          {ownedSlabs.map((entry) => {
                            const selected = auctionCandidateEntry?.id === entry.id;
                            const pulseMatch = getMarketPulseMultiplierForCard(entry.card, marketPulses, entry.slab);
                            const val = getSlabMarketValuation(entry.card, entry.slab, entry.gradedPrice, activeTrend, {
                              marketPulseMultiplier: pulseMatch.multiplier,
                              grailBonusPct: luxuryBuffs.grailValuationBonusPct,
                            });
                            return (
                              <button
                                key={entry.id}
                                onClick={() => {
                                  soundManager.playSelectSound();
                                  setAuctionSelectedSlabId(entry.id);
                                }}
                                className={`rounded-xl border p-2.5 text-left transition cursor-pointer ${
                                  selected
                                    ? 'border-amber-400 bg-amber-950/30'
                                    : 'border-white/8 bg-[#090C12] hover:border-white/25'
                                }`}
                              >
                                <div className="text-xs font-bold text-white truncate">{entry.card.name}</div>
                                <div className="text-[11px] font-semibold text-amber-300">
                                  {entry.slab.company} {entry.slab.gradeLabel}
                                </div>
                                <div className="text-xs font-extrabold text-emerald-400 mt-1 tabular-nums">
                                  Định giá: ${val.effectiveValue.toLocaleString()}
                                </div>
                              </button>
                            );
                          })}
                        </div>

                        {auctionCandidateEntry && (() => {
                          const pulseMatch = getMarketPulseMultiplierForCard(
                            auctionCandidateEntry.card,
                            marketPulses,
                            auctionCandidateEntry.slab
                          );
                          const val = getSlabMarketValuation(
                            auctionCandidateEntry.card,
                            auctionCandidateEntry.slab,
                            auctionCandidateEntry.gradedPrice,
                            activeTrend,
                            {
                              marketPulseMultiplier: pulseMatch.multiplier,
                              grailBonusPct: luxuryBuffs.grailValuationBonusPct,
                            }
                          );
                          const startVal = Math.max(10, Math.round((val.effectiveValue * auctionStartPct) / 100));
                          const reserveVal = Math.max(startVal, Math.round((val.effectiveValue * auctionReservePct) / 100));
                          return (
                            <div className="lg:col-span-5 rounded-xl border border-sky-400/30 bg-[#090C12] p-3.5 space-y-3">
                              <div className="text-xs font-bold text-white truncate">
                                {auctionCandidateEntry.card.name} ({auctionCandidateEntry.slab.company} {auctionCandidateEntry.slab.gradeLabel})
                              </div>
                              <div className="text-[11px] text-zinc-300 space-y-1 tabular-nums">
                                <div className="flex justify-between">
                                  <span>Giá định giá thị trường:</span>
                                  <span className="font-bold text-emerald-400">${val.effectiveValue.toLocaleString()}</span>
                                </div>
                                {(val.fancyCertBonusPct > 0 || val.guardBonusPct > 0 || val.trendBonusPct > 0) && (
                                  <div className="text-[10px] text-amber-300">
                                    Bonus: {val.fancyCertBonusPct > 0 ? `+${val.fancyCertBonusPct}% Cert ` : ''}
                                    {val.guardBonusPct > 0 ? `+${val.guardBonusPct}% Guard ` : ''}
                                    {val.trendBonusPct > 0 ? `+${val.trendBonusPct}% Trend` : ''}
                                  </div>
                                )}
                              </div>

                              <div className="space-y-1">
                                <div className="flex justify-between text-[11px] tabular-nums">
                                  <span className="text-zinc-400">Giá khởi điểm ({auctionStartPct}%):</span>
                                  <span className="text-white font-bold">${startVal.toLocaleString()}</span>
                                </div>
                                <input
                                  type="range"
                                  min={60}
                                  max={110}
                                  step={5}
                                  value={auctionStartPct}
                                  onChange={(e) => setAuctionStartPct(Number(e.target.value))}
                                  className="w-full accent-sky-400 cursor-pointer"
                                />
                              </div>

                              <div className="space-y-1">
                                <div className="flex justify-between text-[11px] tabular-nums">
                                  <span className="text-zinc-400">Giá sàn Reserve ({auctionReservePct}%):</span>
                                  <span className="text-amber-300 font-bold">${reserveVal.toLocaleString()}</span>
                                </div>
                                <input
                                  type="range"
                                  min={85}
                                  max={135}
                                  step={5}
                                  value={auctionReservePct}
                                  onChange={(e) => setAuctionReservePct(Number(e.target.value))}
                                  className="w-full accent-amber-400 cursor-pointer"
                                />
                              </div>

                              <button
                                disabled={!onStartAuction || slabAuctions.length >= 2}
                                onClick={() => onStartAuction?.(auctionCandidateEntry.id, startVal, reserveVal, 28000)}
                                className="w-full rounded-xl bg-sky-400 hover:bg-sky-300 py-2.5 text-xs font-extrabold text-black disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed transition"
                              >
                                {slabAuctions.length >= 2
                                  ? 'Sàn Đang Full (2/2 Lot)'
                                  : 'Đưa Thẻ Của Bạn Lên Sàn (28s)'}
                              </button>
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>

                  {/* Auction History */}
                  {auctionHistory.length > 0 && (
                    <div className="rounded-xl border border-white/10 bg-[#101521] p-3.5 space-y-2">
                      <div className="text-xs font-extrabold uppercase tracking-wider text-zinc-300">
                        Lịch Sử Đấu Giá Gần Đây
                      </div>
                      <div className="space-y-1 text-xs tabular-nums">
                        {auctionHistory.slice(0, 6).map((rec) => (
                          <div key={rec.id} className="flex items-center justify-between gap-2 border-b border-white/6 pb-1">
                            <span className="text-zinc-200 truncate">
                              {rec.isConsignment ? '[Ký Gửi NPC] ' : '[Thẻ Shop] '}
                              {rec.cardName} ({rec.company} {rec.gradeLabel}) {rec.buyerName ? `• ${rec.buyerName}` : ''}
                            </span>
                            <span className={rec.sold ? (rec.wonByPlayer ? 'text-sky-300 font-bold shrink-0' : 'text-emerald-400 font-bold shrink-0') : 'text-zinc-500 shrink-0'}>
                              {!rec.sold
                                ? 'CHƯA ĐẠT SÀN'
                                : rec.wonByPlayer
                                ? `BẠN THẮNG $${rec.finalPrice.toLocaleString()}`
                                : rec.isConsignment
                                ? `BÚA $${rec.finalPrice.toLocaleString()} · HH +$${(rec.commissionEarned || 0).toLocaleString()}`
                                : `SOLD $${rec.finalPrice.toLocaleString()}`}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: BUYBACK SNIPE + VIP CONTRACTS + CUSTOMER ORDERS */}
              {activeTab === 'orders' && (
                <div className="space-y-5">
                  {/* SECTION A: WALK-IN BUYBACK & 10X LOUPE SNIPE */}
                  <div className="space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-xs font-extrabold uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
                        <Search className="h-3.5 w-3.5" />
                        <span>1. Quầy Thu Mua &amp; Snipe Kính Lúp 10x ({buybackOffers.length})</span>
                      </div>
                      <span className="text-[11px] text-zinc-400">
                        Soi 10x trước khi mua lại thẻ Raw giá hời 14%–28%!
                      </span>
                    </div>

                    {buybackOffers.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-white/12 bg-[#0E131F] p-5 text-center text-xs text-zinc-400">
                        Chưa có người bán mang thẻ Raw đến quầy thu mua. Thuê Lễ Tân trong ca làm việc để đón khách bán thẻ!
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {buybackOffers.map((offer) => {
                          const cond = offer.condition || 'NM';
                          const isFakeConfirmed = Boolean(offer.scannedAuthenticity && offer.isCounterfeit);
                          const isAuthenticConfirmed = Boolean(offer.scannedAuthenticity && !offer.isCounterfeit);
                          const canRestore = !offer.restored && !isFakeConfirmed && (cond === 'MP' || cond === 'LP');
                          return (
                            <div
                              key={offer.id}
                              className={`flex items-center gap-3 rounded-xl border p-3 ${
                                isFakeConfirmed
                                  ? 'border-red-500/60 bg-red-950/25'
                                  : 'border-emerald-500/30 bg-[#101521]'
                              }`}
                            >
                              <img
                                src={offer.card.imageUrl}
                                alt={offer.card.name}
                                className="h-24 w-16 rounded-lg object-contain bg-black shrink-0"
                              />
                              <div className="flex-1 min-w-0 space-y-1.5">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="text-xs font-bold text-white truncate">{offer.card.name}</div>
                                  <div className="flex items-center gap-1 shrink-0">
                                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-black border ${
                                      cond === 'MINT'
                                        ? 'bg-sky-500/20 border-sky-400/40 text-sky-300'
                                        : cond === 'NM'
                                        ? 'bg-emerald-500/15 border-emerald-400/30 text-emerald-300'
                                        : 'bg-amber-500/20 border-amber-400/40 text-amber-300'
                                    }`}>
                                      {cond}
                                    </span>
                                    <span className="rounded bg-emerald-500/20 border border-emerald-400/35 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300 tabular-nums">
                                      -{offer.discountPct}% Raw
                                    </span>
                                  </div>
                                </div>
                                <div className="text-[11px] text-zinc-400 truncate tabular-nums">
                                  Người bán: <strong className="text-zinc-200">{offer.sellerName}</strong> · Market ${offer.rawMarketPrice}
                                </div>

                                {/* UV Authenticity Scan Status */}
                                {isFakeConfirmed ? (
                                  <div className="rounded-lg border border-red-500/50 bg-red-950/50 px-2 py-1 text-[11px] font-black text-red-200">
                                    🚨 PHÁT HIỆN THẺ GIẢ (FAKE PROXY)! Không nên mua.
                                  </div>
                                ) : isAuthenticConfirmed ? (
                                  <div className="rounded-lg border border-emerald-500/40 bg-emerald-950/35 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                                    ✅ UV Check: Chính hãng 100% {offer.restored ? '· ✨ Đã Ép Phục Hồi (+4% Gem)' : ''}
                                  </div>
                                ) : null}

                                {offer.inspected ? (
                                  <div className="rounded-lg border border-sky-500/30 bg-[#090C12] p-1.5 text-[11px] tabular-nums space-y-0.5">
                                    <div className="text-sky-300 font-bold">
                                      CTR {offer.inspection.centering} · CRN {offer.inspection.corners} · EDG {offer.inspection.edges} · SRF {offer.inspection.surface}
                                    </div>
                                    <div className="text-amber-300 font-bold">
                                      {offer.inspection.conditionTag} · Tiềm năng 10: {offer.inspection.grade10PotentialPct}%
                                    </div>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => onInspectBuyback?.(offer.id)}
                                    className="w-full rounded-lg border border-sky-400/40 bg-sky-950/35 hover:bg-sky-900/45 py-1 text-[11px] font-bold text-sky-200 cursor-pointer flex items-center justify-center gap-1"
                                  >
                                    <Eye className="h-3 w-3" />
                                    <span>Soi Kính Lúp 10x (Miễn Phí)</span>
                                  </button>
                                )}

                                {/* Scanner & Restoration Action Row */}
                                <div className="flex items-center gap-1.5">
                                  {!offer.scannedAuthenticity && onScanBuybackAuthenticity && (
                                    <button
                                      disabled={shopState.cash < COUNTERFEIT_SCAN_FEE}
                                      onClick={() => onScanBuybackAuthenticity(offer.id)}
                                      className="flex-1 rounded-lg border border-purple-400/40 bg-purple-950/40 hover:bg-purple-900/50 py-1 text-[10px] font-bold text-purple-200 disabled:opacity-40 cursor-pointer"
                                    >
                                      🔬 Soi Thẻ Giả UV (${COUNTERFEIT_SCAN_FEE})
                                    </button>
                                  )}
                                  {canRestore && onRestoreBuybackCard && (
                                    <button
                                      disabled={shopState.cash < RESTORE_CARD_FEE}
                                      onClick={() => onRestoreBuybackCard(offer.id)}
                                      className="flex-1 rounded-lg border border-amber-400/40 bg-amber-950/40 hover:bg-amber-900/50 py-1 text-[10px] font-bold text-amber-200 disabled:opacity-40 cursor-pointer"
                                    >
                                      ✨ Phục Hồi {cond} (${RESTORE_CARD_FEE})
                                    </button>
                                  )}
                                </div>

                                <div className="flex items-center gap-2 pt-0.5">
                                  {isFakeConfirmed && onReportFakeBuyback ? (
                                    <button
                                      onClick={() => onReportFakeBuyback(offer.id)}
                                      className="flex-1 rounded-lg bg-red-600 hover:bg-red-500 py-1.5 text-[11px] font-extrabold text-white cursor-pointer"
                                    >
                                      🚓 Báo Công An Bắt Gian (+${FAKE_REPORT_BOUNTY})
                                    </button>
                                  ) : (
                                    <button
                                      disabled={shopState.cash < offer.askingPrice}
                                      onClick={() => onAcceptBuyback?.(offer.id)}
                                      className="flex-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 py-1.5 text-[11px] font-extrabold text-black disabled:opacity-40 cursor-pointer tabular-nums"
                                    >
                                      Mua Đứt -${offer.askingPrice}
                                    </button>
                                  )}
                                  <button
                                    onClick={() => onDeclineBuyback?.(offer.id)}
                                    className="rounded-lg bg-zinc-800 hover:bg-rose-700/70 px-3 py-1.5 text-[11px] font-bold text-zinc-200 cursor-pointer"
                                  >
                                    Bỏ Qua
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* SECTION B: VIP CITY SLAB CONTRACTS */}
                  <div className="space-y-2.5">
                    <div className="text-xs font-extrabold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                      <Crown className="h-3.5 w-3.5" />
                      <span>2. Hợp Đồng Giao Slab VIP Toàn Thành Phố ({vipSlabOrders.length})</span>
                    </div>

                    {vipSlabOrders.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-white/12 bg-[#0E131F] p-5 text-center text-xs text-zinc-400">
                        Hiện chưa có hợp đồng đặc biệt nào từ Landmark 81, Porsche Center hay Casa Riva.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {vipSlabOrders.map((vip) => {
                          const matchingSlab = ownedSlabs.find((s) => {
                            const univOk = vip.universe === 'any' || s.card.universe === vip.universe;
                            return univOk && s.slab.grade >= vip.minGrade && s.rawPrice >= vip.minCardRawPrice;
                          });
                          return (
                            <div
                              key={vip.id}
                              className="rounded-xl border border-amber-400/35 bg-[#101521] p-3.5 space-y-2"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="text-xs font-extrabold text-amber-300 flex items-center gap-1.5">
                                  <Briefcase className="h-3.5 w-3.5" />
                                  <span>{vip.vipName}</span>
                                </div>
                                <span className="text-[11px] font-black text-emerald-400 tabular-nums">
                                  TRẢ x{vip.bonusMultiplier}
                                </span>
                              </div>
                              <div className="text-[11px] text-zinc-300">
                                Địa điểm: <strong>{vip.landmark}</strong> · Yêu cầu:{' '}
                                <span className="text-white font-bold">
                                  {vip.universe === 'any' ? 'Pokémon / One Piece' : vip.universe === 'onepiece' ? 'One Piece' : 'Pokémon'}{' '}
                                  Grade ≥ {vip.minGrade} (Raw ≥ ${vip.minCardRawPrice})
                                </span>
                              </div>
                              {matchingSlab ? (
                                <button
                                  onClick={() => onFulfillVipOrder?.(vip.id, matchingSlab.id)}
                                  className="w-full rounded-lg bg-amber-400 hover:bg-amber-300 py-1.5 text-xs font-extrabold text-black cursor-pointer tabular-nums"
                                >
                                  Giao {matchingSlab.card.name} ({matchingSlab.slab.company} {matchingSlab.slab.grade}) · Nhận +$
                                  {Math.round(matchingSlab.gradedPrice * vip.bonusMultiplier).toLocaleString()}
                                </button>
                              ) : (
                                <div className="rounded-lg border border-white/8 bg-[#090C12] px-3 py-1.5 text-[11px] text-zinc-400">
                                  Chưa có Slab đạt chuẩn trong Kho Slab để giao hợp đồng này.
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* SECTION C: WALK-IN CUSTOMER GRADING COMMISSIONS */}
                  <div className="space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-xs font-extrabold uppercase tracking-wider text-cyan-300">
                        3. Đơn Khách Gửi Chấm Hộ ({customerOrders.length})
                      </div>
                      <div className="text-xs text-emerald-300 font-bold tabular-nums">
                        Đã trả: {labStats?.customerOrdersCompleted || 0} đơn · Lãi: +${(labStats?.customerServiceProfit || 0).toLocaleString()}
                      </div>
                    </div>

                    {customerOrders.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-white/12 bg-[#0E131F] p-5 text-center text-xs text-zinc-400">
                        Chưa có đơn ký gửi chấm điểm từ khách vãng lai.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {customerOrders.map((order) => {
                          const pct =
                            order.status === 'ready_pickup'
                              ? 100
                              : order.status === 'grading' && order.durationMs > 0
                              ? Math.min(100, Math.round((order.elapsedMs / order.durationMs) * 100))
                              : 0;
                          const tierMeta = GRADING_SERVICE_TIERS[order.tier];

                          return (
                            <div
                              key={order.id}
                              className={`flex items-center gap-3 rounded-xl border p-3 ${
                                order.status === 'ready_pickup'
                                  ? 'border-emerald-500/45 bg-emerald-950/20'
                                  : 'border-white/10 bg-[#101521]'
                              }`}
                            >
                              <img
                                src={order.card.imageUrl}
                                alt={order.card.name}
                                className="h-20 w-14 rounded-lg object-contain bg-black shrink-0"
                              />
                              <div className="flex-1 min-w-0 space-y-1.5">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="text-xs font-bold text-white truncate">
                                    {order.customerName} ({order.customerRole})
                                  </div>
                                  <span className="text-[10px] font-bold text-sky-300 shrink-0">
                                    {order.company} · {tierMeta.badge}
                                  </span>
                                </div>
                                <div className="text-[11px] text-zinc-300 truncate">{order.card.name}</div>
                                <div className="flex items-center justify-between text-[11px] tabular-nums">
                                  <span className="text-zinc-400">
                                    Thu ${order.customerPaysFee} − Lab ${order.labCost}
                                  </span>
                                  <span className="font-bold text-emerald-400">
                                    Lãi +${order.netProfit}
                                  </span>
                                </div>

                                {order.status === 'waiting_approval' && (
                                  <button
                                    disabled={!isStaffOnShift || specialistsCount < 1}
                                    onClick={() => onApproveCustomerOrder?.(order.id)}
                                    className="w-full rounded-lg bg-cyan-400 hover:bg-cyan-300 py-1.5 text-[11px] font-extrabold text-black disabled:opacity-40 cursor-pointer tabular-nums"
                                  >
                                    Duyệt &amp; Đưa Vào Phòng Lab (-${order.labCost})
                                  </button>
                                )}

                                {order.status === 'grading' && (
                                  <div className="space-y-1">
                                    <div className="flex justify-between text-[10px] text-zinc-400 tabular-nums">
                                      <span>Đang xử lý đơn khách...</span>
                                      <span>{pct}%</span>
                                    </div>
                                    <div className="h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden">
                                      <div
                                        className="h-full bg-cyan-400 transition-all duration-300"
                                        style={{ width: `${pct}%` }}
                                      />
                                    </div>
                                  </div>
                                )}

                                {order.status === 'ready_pickup' && order.resultSlab && (
                                  <div className="space-y-1.5">
                                    <div className="text-[11px] font-bold text-amber-300 tabular-nums">
                                      {order.resultSlab.company} {order.resultSlab.gradeLabel} · #{order.resultSlab.certNumber}
                                    </div>
                                    <button
                                      onClick={() => onCompleteCustomerOrder?.(order.id)}
                                      className="w-full rounded-lg bg-emerald-500 hover:bg-emerald-400 py-1.5 text-[11px] font-extrabold text-black cursor-pointer tabular-nums"
                                    >
                                      Trả Slab &amp; Thu +${order.customerPaysFee}
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 5: OWNED SLAB VAULT + SLAB GUARD + CRACK & RE-GRADE + POP REPORT */}
              {activeTab === 'vault' && (
                <div className="space-y-5">
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 tabular-nums">
                    <div className="rounded-xl border border-white/8 bg-[#101521] p-3">
                      <div className="text-[10px] font-semibold text-zinc-400 uppercase">Đã Đóng Slab</div>
                      <div className="text-lg font-black text-white mt-0.5">{labStats?.totalGraded || 0}</div>
                    </div>
                    <div className="rounded-xl border border-white/8 bg-[#101521] p-3">
                      <div className="text-[10px] font-semibold text-zinc-400 uppercase">Grade 10 Hits</div>
                      <div className="text-lg font-black text-amber-300 mt-0.5">
                        {labStats?.grade10Count || 0} ({hitRatePct}%)
                      </div>
                    </div>
                    <div className="rounded-xl border border-white/8 bg-[#101521] p-3">
                      <div className="text-[10px] font-semibold text-zinc-400 uppercase">Black Label &amp; Pristine</div>
                      <div className="text-lg font-black text-yellow-300 mt-0.5">
                        {(labStats?.blackLabelCount || 0) + (labStats?.pristine10Count || 0)}
                      </div>
                    </div>
                    <div className="rounded-xl border border-white/8 bg-[#101521] p-3">
                      <div className="text-[10px] font-semibold text-zinc-400 uppercase">Phiên Đấu Giá Xong</div>
                      <div className="text-lg font-black text-rose-300 mt-0.5">
                        {labStats?.auctionsCompleted || 0}
                      </div>
                    </div>
                    <div className="rounded-xl border border-white/8 bg-[#101521] p-3">
                      <div className="text-[10px] font-semibold text-zinc-400 uppercase">Tổng Giá Trị</div>
                      <div className="text-lg font-black text-emerald-400 mt-0.5">
                        ${(labStats?.totalSlabValueCreated || 0).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-xs font-bold uppercase tracking-wider text-zinc-300 tabular-nums">
                      Kho Slab ({filteredVaultSlabs.length}) · Slab Guard (${SLAB_GUARD_FEE}) · Crossover (${regradeCostTotal})
                    </div>
                    <div className="relative w-full sm:w-64">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
                      <input
                        value={certQuery}
                        onChange={(e) => setCertQuery(e.target.value)}
                        placeholder="Tra Cert # hoặc tên thẻ..."
                        className="w-full rounded-lg border border-white/10 bg-[#101521] pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-zinc-500 focus:border-sky-400 focus:outline-none"
                      />
                    </div>
                  </div>

                  {filteredVaultSlabs.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-white/12 bg-[#0E131F] p-8 text-center text-xs text-zinc-400">
                      Chưa có Slab nào khớp bộ lọc. Sau khi chấm xong, bạn có thể cất Slab vào kho này!
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {filteredVaultSlabs.map((entry) => {
                        const pulseMatch = getMarketPulseMultiplierForCard(entry.card, marketPulses, entry.slab);
                        const val = getSlabMarketValuation(entry.card, entry.slab, entry.gradedPrice, activeTrend, {
                          marketPulseMultiplier: pulseMatch.multiplier,
                          grailBonusPct: luxuryBuffs.grailValuationBonusPct,
                        });
                        return (
                          <div
                            key={entry.id}
                            className="rounded-xl border border-white/10 bg-[#101521] p-3 flex flex-col items-center gap-2.5"
                          >
                            <GradedSlabCard
                              card={entry.card}
                              slab={entry.slab}
                              cardHeightStyle="175px"
                              showSubgrades={true}
                            />

                            <div className="w-full space-y-0.5 text-xs px-1 tabular-nums">
                              <div className="flex items-center justify-between">
                                <span className="text-zinc-400">Định giá thị trường:</span>
                                <span className="font-black text-emerald-400">
                                  ${val.effectiveValue.toLocaleString()}
                                </span>
                              </div>
                              {(pulseMatch.matchedPulse || val.grailBonusPct > 0) && (
                                <div className="flex flex-wrap gap-1 pt-0.5">
                                  {pulseMatch.matchedPulse && (
                                    <span className="rounded bg-sky-500/15 border border-sky-400/30 px-1.5 py-0.5 text-[9px] font-black text-sky-300">
                                      📰 {pulseMatch.matchedPulse.badge}
                                    </span>
                                  )}
                                  {val.grailBonusPct > 0 && (
                                    <span className="rounded bg-amber-500/15 border border-amber-400/30 px-1.5 py-0.5 text-[9px] font-black text-amber-300">
                                      🏰 +{val.grailBonusPct}% Vault
                                    </span>
                                  )}
                                </div>
                              )}
                              {(val.fancyCertBonusPct > 0 || val.guardBonusPct > 0 || val.trendBonusPct > 0) && (
                                <div className="text-[10px] text-amber-300 font-semibold">
                                  {val.fancyCertBonusPct > 0 ? '★ Cert Hiếm +15%  ' : ''}
                                  {val.guardBonusPct > 0 ? '🛡 Guard +5%  ' : ''}
                                  {val.trendBonusPct > 0 ? `📈 Trend +${val.trendBonusPct}%` : ''}
                                </div>
                              )}
                            </div>

                            <div className="w-full grid grid-cols-3 gap-1.5">
                              <button
                                onClick={() => onActionOwnedSlab(entry.id, 'showcase')}
                                className="rounded-lg bg-sky-400 hover:bg-sky-300 py-1.5 text-[11px] font-extrabold text-black cursor-pointer"
                              >
                                Trưng Kệ
                              </button>
                              <button
                                onClick={() => {
                                  setAuctionSelectedSlabId(entry.id);
                                  setActiveTab('auction');
                                }}
                                className="rounded-lg bg-rose-500 hover:bg-rose-400 py-1.5 text-[11px] font-extrabold text-white cursor-pointer flex items-center justify-center gap-1"
                              >
                                <Gavel className="h-3 w-3" />
                                <span>Đấu Giá</span>
                              </button>
                              <button
                                onClick={() => onActionOwnedSlab(entry.id, 'sell')}
                                className="rounded-lg bg-emerald-600 hover:bg-emerald-500 py-1.5 text-[11px] font-extrabold text-white cursor-pointer flex items-center justify-center gap-0.5"
                              >
                                <DollarSign className="h-3 w-3" />
                                <span>Bán</span>
                              </button>
                            </div>

                            {onEquipSlabGuard && (
                              <div className="w-full rounded-lg border border-white/8 bg-[#090C12] p-2 flex items-center justify-between gap-2">
                                <span className="text-[10px] font-bold text-zinc-300 flex items-center gap-1">
                                  <Shield className="h-3 w-3 text-sky-400" />
                                  <span>Slab Guard (${SLAB_GUARD_FEE}):</span>
                                </span>
                                <div className="flex items-center gap-1">
                                  {SLAB_GUARD_OPTIONS.map((opt) => {
                                    const active = entry.slab.slabGuardColor === opt.id;
                                    return (
                                      <button
                                        key={opt.id}
                                        title={`${opt.name} (${opt.bonusLabel})`}
                                        onClick={() => onEquipSlabGuard(entry.id, opt.id)}
                                        className={`h-4 w-4 rounded-full border cursor-pointer transition ${
                                          active ? 'scale-125 border-white ring-1 ring-white' : 'border-white/30 hover:scale-110'
                                        }`}
                                        style={{ backgroundColor: opt.hex }}
                                      />
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {onCrackAndRegrade && (
                              <div className="w-full rounded-lg border border-amber-500/20 bg-[#090C12] p-2 space-y-1">
                                <div className="flex items-center justify-between text-[10px] text-zinc-400 tabular-nums">
                                  <span className="flex items-center gap-1 text-amber-300 font-bold">
                                    <Hammer className="h-3 w-3" />
                                    <span>Đập Hộp Chấm Lại</span>
                                  </span>
                                  <span>Rủi ro {crackRiskPct}% · ${regradeCostTotal}</span>
                                </div>
                                <div className="grid grid-cols-3 gap-1">
                                  {(['PSA', 'CGC', 'BGS'] as GradingCompany[]).map((co) => (
                                    <button
                                      key={co}
                                      disabled={!isStaffOnShift || specialistsCount < 1 || shopState.cash < regradeCostTotal}
                                      onClick={() => onCrackAndRegrade(entry.id, co)}
                                      className="rounded bg-zinc-800 hover:bg-amber-400 hover:text-black py-1 text-[10px] font-extrabold text-zinc-200 disabled:opacity-35 cursor-pointer"
                                    >
                                      → {co}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {popEntries.length > 0 && (
                    <div className="rounded-xl border border-white/10 bg-[#101521] p-4 space-y-2.5">
                      <div className="text-xs font-extrabold uppercase tracking-wider text-sky-300">
                        Population Report Cửa Hàng ({popEntries.length} mẫu thẻ)
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-[11px] tabular-nums">
                          <thead className="border-b border-white/10 text-zinc-400">
                            <tr>
                              <th className="py-1.5 pr-3">Tên Thẻ</th>
                              <th className="py-1.5 px-2 text-red-300">PSA 10</th>
                              <th className="py-1.5 px-2">PSA ≤9</th>
                              <th className="py-1.5 px-2 text-cyan-300">CGC 10P</th>
                              <th className="py-1.5 px-2">CGC ≤10</th>
                              <th className="py-1.5 px-2 text-amber-300">BGS BL 10</th>
                              <th className="py-1.5 px-2 text-yellow-200">BGS 10/9.5</th>
                              <th className="py-1.5 pl-2">BGS ≤9</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/6">
                            {popEntries.slice(0, 14).map((row) => (
                              <tr key={row.cardId} className="text-zinc-200">
                                <td className="py-1.5 pr-3 font-bold text-white truncate max-w-[180px]">
                                  {row.cardName}
                                </td>
                                <td className="py-1.5 px-2 text-red-300 font-bold">{row.psa10}</td>
                                <td className="py-1.5 px-2 text-zinc-400">{row.psa9 + row.psa8 + row.psa7}</td>
                                <td className="py-1.5 px-2 text-cyan-300 font-bold">{row.cgcPristine10}</td>
                                <td className="py-1.5 px-2 text-zinc-400">{row.cgcGem10 + row.cgc9 + row.cgc8 + row.cgc7}</td>
                                <td className="py-1.5 px-2 text-amber-300 font-black">{row.bgsBlack10 || 0}</td>
                                <td className="py-1.5 px-2 text-yellow-200">{(row.bgsGold10 || 0) + (row.bgs9_5 || 0)}</td>
                                <td className="py-1.5 pl-2 text-zinc-400">{(row.bgs9 || 0) + (row.bgs8_5 || 0) + (row.bgs8 || 0)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 6: PSA, CGC & BGS RESEARCH + ROI BREAKEVEN CALCULATOR */}
              {activeTab === 'research' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                  <div className="lg:col-span-7 space-y-3">
                    <div className="text-xs font-extrabold uppercase tracking-wider text-sky-300">
                      Bản Tin Nghiên Cứu Tiêu Chuẩn PSA · CGC · BGS Black Label
                    </div>
                    {GRADER_RESEARCH_BRIEFS.map((brief) => (
                      <div
                        key={brief.id}
                        className="rounded-xl border border-white/10 bg-[#101521] p-4 space-y-1.5"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-[10px] uppercase tracking-wider text-amber-300 font-bold">
                            {brief.category}
                          </span>
                          <span className="text-[11px] font-bold text-cyan-300 tabular-nums">
                            {brief.highlightMetric}
                          </span>
                        </div>
                        <h4 className="text-sm font-extrabold text-white">{brief.title}</h4>
                        <p className="text-xs font-semibold text-zinc-200">{brief.summary}</p>
                        <p className="text-xs text-zinc-400 leading-relaxed">{brief.detail}</p>
                      </div>
                    ))}
                  </div>

                  <div className="lg:col-span-5">
                    <div className="rounded-xl border border-violet-500/30 bg-[#101521] p-4 space-y-3.5">
                      <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-violet-300">
                        <Calculator className="h-4 w-4" />
                        <span>Máy Tính Hòa Vốn ROI (Breakeven)</span>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-xs tabular-nums">
                          <span className="text-zinc-300">Giá thẻ Raw đầu vào:</span>
                          <span className="font-black text-emerald-400">${calcRawPrice}</span>
                        </div>
                        <input
                          type="range"
                          min={5}
                          max={600}
                          step={5}
                          value={calcRawPrice}
                          onChange={(e) => setCalcRawPrice(Number(e.target.value))}
                          className="w-full accent-sky-400 cursor-pointer"
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        {(['PSA', 'CGC', 'BGS'] as GradingCompany[]).map((co) => (
                          <button
                            key={co}
                            onClick={() => setSelectedCompany(co)}
                            className={`rounded-lg border py-2 text-xs font-bold cursor-pointer ${
                              selectedCompany === co
                                ? co === 'PSA'
                                  ? 'border-red-500 bg-red-950/35 text-red-300'
                                  : co === 'CGC'
                                  ? 'border-cyan-400 bg-cyan-950/25 text-cyan-300'
                                  : 'border-amber-400 bg-amber-950/25 text-amber-300'
                                : 'border-white/8 bg-[#090C12] text-zinc-400'
                            }`}
                          >
                            {co}
                          </button>
                        ))}
                      </div>

                      <button
                        onClick={() => setCalcClean((v) => !v)}
                        className={`w-full rounded-lg border px-3 py-2 text-xs font-bold cursor-pointer ${
                          calcClean
                            ? 'border-emerald-400/75 bg-emerald-950/30 text-emerald-300'
                            : 'border-white/8 bg-[#090C12] text-zinc-400'
                        }`}
                      >
                        {calcClean ? `✓ Kèm Vệ Sinh Siêu Âm (+$${GRADING_CLEANING_FEE})` : 'Không Vệ Sinh Bề Mặt'}
                      </button>

                      <div className="rounded-xl border border-white/8 bg-[#090C12] p-3.5 space-y-1.5 text-xs tabular-nums">
                        <div className="flex justify-between">
                          <span className="text-zinc-400">Tổng phí chấm ({tierInfo.name}):</span>
                          <span className="text-amber-300 font-bold">${calcAdvice.totalCost}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-400">Giá Slab kỳ vọng (EV):</span>
                          <span className="text-white font-bold">${calcAdvice.expectedSlabValue.toFixed(0)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-400">Ngưỡng Raw hòa vốn:</span>
                          <span className="text-sky-300 font-bold">≥ ${calcAdvice.breakevenRawPrice}</span>
                        </div>
                        <div className="flex justify-between border-t border-white/10 pt-2 text-sm font-black">
                          <span>Lãi / Lỗ kỳ vọng:</span>
                          <span
                            className={
                              calcAdvice.expectedNetProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                            }
                          >
                            {calcAdvice.expectedNetProfit >= 0 ? '+' : ''}${calcAdvice.expectedNetProfit.toFixed(0)}
                          </span>
                        </div>
                      </div>

                      <div className="rounded-xl border border-white/8 bg-[#090C12] p-3 text-[11px] space-y-1 tabular-nums">
                        <div className="text-zinc-400 mb-1">Giá trị dự kiến theo từng mức điểm ({selectedCompany}):</div>
                        {selectedCompany === 'BGS' ? (
                          <>
                            <div className="flex justify-between text-amber-300 font-bold">
                              <span>BGS BLACK LABEL 10 (x5.20):</span>
                              <span>${Math.round(calcRawPrice * 5.2).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-yellow-200">
                              <span>BGS Pristine Gold 10 (x3.60):</span>
                              <span>${Math.round(calcRawPrice * 3.6).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-emerald-300">
                              <span>BGS 9.5 Gem Mint (x2.15):</span>
                              <span>${Math.round(calcRawPrice * 2.15).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-zinc-400">
                              <span>BGS 9 / 8.5 / 8:</span>
                              <span>${Math.round(calcRawPrice * 1.28)} / ${Math.round(calcRawPrice * 1.02)} / ${Math.round(calcRawPrice * 0.85)}</span>
                            </div>
                          </>
                        ) : selectedCompany === 'CGC' ? (
                          <>
                            <div className="flex justify-between text-yellow-300">
                              <span>CGC 10 Pristine (x3.40):</span>
                              <span>${Math.round(calcRawPrice * 3.4).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-cyan-300">
                              <span>CGC 10 Gem Mint (x2.60):</span>
                              <span>${Math.round(calcRawPrice * 2.6).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-emerald-300">
                              <span>Grade 9 Mint (x1.30):</span>
                              <span>${Math.round(calcRawPrice * 1.3).toLocaleString()}</span>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="flex justify-between text-amber-300">
                              <span>PSA 10 Gem Mt (x2.80):</span>
                              <span>${Math.round(calcRawPrice * 2.8).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-emerald-300">
                              <span>PSA 9 Mint (x1.35):</span>
                              <span>${Math.round(calcRawPrice * 1.35).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-zinc-400">
                              <span>PSA 8 / PSA 7:</span>
                              <span>${Math.round(calcRawPrice * 1.05)} / ${Math.round(calcRawPrice * 0.85)}</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Slab Inspection Reveal Sub-Modal */}
      {revealedJob && revealedJob.resultSlab && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-md rounded-2xl border border-amber-400/50 bg-[#090C12] p-5 flex flex-col items-center text-center space-y-3.5 shadow-2xl">
            <div className="flex items-center gap-2 text-amber-300 text-sm font-extrabold">
              <Sparkles className="h-4 w-4" />
              <span>
                Kết Quả Thẩm Định {revealedJob.resultSlab.company} {revealedJob.resultSlab.gradeLabel}
              </span>
            </div>

            <GradedSlabCard
              card={revealedJob.card}
              slab={revealedJob.resultSlab}
              cardHeightStyle="clamp(165px, 24vh, 250px)"
              showSubgrades={true}
            />

            <div className="w-full rounded-xl border border-white/10 bg-[#101521] p-3 text-xs space-y-1.5 text-left tabular-nums">
              {revealedJob.resultSlab.subgrades && (
                <div className="flex justify-between text-zinc-300">
                  <span>Độ cân tâm (Centering):</span>
                  <span className="text-sky-300 font-bold">
                    {revealedJob.resultSlab.subgrades.centeringRatio}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-zinc-400">
                <span>Raw + Phí Lab:</span>
                <span>
                  ${revealedJob.rawPrice.toFixed(0)} + ${revealedJob.feePaid}
                </span>
              </div>
              <div className="flex justify-between text-emerald-400 font-black text-sm">
                <span>Giá trị Slab ({revealedJob.gradeMultiplier?.toFixed(2)}x):</span>
                <span>${(revealedJob.gradedPrice || 0).toLocaleString()}</span>
              </div>
              {revealedJob.resultSlab.subgrades?.notes && (
                <p className="text-[11px] text-zinc-300 border-t border-white/10 pt-1.5">
                  {revealedJob.resultSlab.subgrades.notes}
                </p>
              )}
            </div>

            <div className="w-full grid grid-cols-3 gap-2">
              <button
                onClick={() => {
                  onClaimCompletedJob(revealedJob.id, 'showcase');
                  setRevealedJob(null);
                }}
                className="rounded-lg bg-sky-400 hover:bg-sky-300 py-2 text-xs font-extrabold text-black cursor-pointer"
              >
                Trưng Bày
              </button>
              <button
                onClick={() => {
                  onClaimCompletedJob(revealedJob.id, 'vault');
                  setRevealedJob(null);
                }}
                className="rounded-lg bg-zinc-800 hover:bg-zinc-700 py-2 text-xs font-bold text-white cursor-pointer"
              >
                Cất Kho
              </button>
              <button
                onClick={() => {
                  onClaimCompletedJob(revealedJob.id, 'sell');
                  setRevealedJob(null);
                }}
                className="rounded-lg bg-emerald-500 hover:bg-emerald-400 py-2 text-xs font-extrabold text-black cursor-pointer"
              >
                Bán Ngay
              </button>
            </div>

            <button
              onClick={() => setRevealedJob(null)}
              className="text-xs text-zinc-400 hover:text-white cursor-pointer pt-1"
            >
              Đóng xem lại sau
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
