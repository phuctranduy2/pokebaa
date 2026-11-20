import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  Flame,
  Hammer,
  Heart,
  Lock,
  Megaphone,
  Package,
  Play,
  Radio,
  Scissors,
  Send,
  ShoppingBag,
  SlidersHorizontal,
  Sparkles,
  Square,
  Tv,
  UserCheck,
  Users,
  Video,
  X,
  Zap,
} from 'lucide-react';
import {
  LIVE_STREAMER_UNLOCK_LEVEL,
  LIVE_STUDIO_BUILD_COST,
  LIVE_STUDIO_BUILD_LEVEL,
  ShopState,
  getCardHoloClass,
} from '../game/pokemonShopLogic';
import {
  LIVE_BREAK_SLOTS,
  LiveSessionSummaryPayload,
  LiveStreamChatMsg,
  LiveStreamRuntimeState,
  OwnedLiveBoosterBox,
  buildLivePackOrderQueue,
  checkLiveBreakPrerequisites,
  createLiveStreamSlots,
  getLiveBreakSlotPriceBounds,
  getSlotAssignedPackNumbers,
} from '../game/shopExpansionSystems';
import { soundManager } from '../game/audio';
import { LivePovBreakStage, PackRipAnimStage } from './LivePovBreakStage';

export type LiveSessionCompletionPayload = LiveSessionSummaryPayload;

interface PokeLiveAppModalProps {
  shopState: ShopState;
  liveRuntime: LiveStreamRuntimeState;
  onToggleAutoLive: () => void;
  onStartBroadcast: (box: OwnedLiveBoosterBox, slotPrice: number, openTikTokView: boolean) => void;
  onCancelBeforeRip: () => void;
  onShowSeal: () => void;
  onHypeShoutout: () => void;
  onFlashSale: () => void;
  onBeginRipping: () => void;
  onRipNextPack: () => void;
  onToggleAutoRip: () => void;
  onSendHostComment: (text: string) => void;
  onTapHeart: () => void;
  onResetToSetup: () => void;
  onTikTokViewChange: (isViewingTikTok: boolean) => void;
  onBuildLiveStudio: () => void;
  onGoToHireStreamer: () => void;
  onGoToSupplyShop: () => void;
  onClose: () => void;
}

type AppViewMode = 'console' | 'tiktok';

interface FloatingHeart {
  id: number;
  offsetX: number;
  colorClass: string;
}

const WARMUP_VIEWER_CHAT: Array<{ sender: string; text: string }> = [
  { sender: '@minh_vinhomes', text: 'Chào shop mới lên live nha, phòng studio nhìn xịn quá!' },
  { sender: '@linh_collector', text: 'Hôm nay shop khui set nào thế bác streamer ơi?' },
  { sender: '@khang_landmark81', text: 'Vừa thấy thông báo live của shop, hóng kèo săn hit!' },
  { sender: '@tuan_thuduc', text: 'Cho em xem góc đèn ring light với hộp bài cận cảnh đi ạ' },
  { sender: '@vy_onepiece', text: 'Đã thả tim cho nhân viên live nha, lên kèo box sớm đi shop!' },
  { sender: '@nam_aeonmall', text: 'Đang ngồi canh slot đẹp đây, có hệ Lửa hú em liền!' },
];

export const PokeLiveAppModal: React.FC<PokeLiveAppModalProps> = ({
  shopState,
  liveRuntime,
  onToggleAutoLive,
  onStartBroadcast,
  onCancelBeforeRip,
  onShowSeal,
  onHypeShoutout,
  onFlashSale,
  onBeginRipping,
  onRipNextPack,
  onToggleAutoRip,
  onSendHostComment,
  onTapHeart,
  onResetToSetup,
  onTikTokViewChange,
  onBuildLiveStudio,
  onGoToHireStreamer,
  onGoToSupplyShop,
  onClose,
}) => {
  const prereqs = useMemo(() => checkLiveBreakPrerequisites(shopState), [shopState]);
  const ownedBoxes = prereqs.ownedBoxes;

  const [selectedProductId, setSelectedProductId] = useState<string>(
    ownedBoxes[0]?.productId || ''
  );
  const selectedBox =
    ownedBoxes.find((b) => b.productId === selectedProductId) || ownedBoxes[0] || null;

  const priceBounds = useMemo(
    () =>
      selectedBox
        ? getLiveBreakSlotPriceBounds(selectedBox.boxRetailPrice, selectedBox.boxWholesalePrice)
        : { recommendedSlotPrice: 7, fairSlotAnchor: 6.83, minSlotPrice: 4, maxSlotPrice: 45 },
    [selectedBox?.boxRetailPrice, selectedBox?.boxWholesalePrice]
  );
  const recommendedSlotPrice = priceBounds.recommendedSlotPrice;
  const [slotPrice, setSlotPrice] = useState<number>(recommendedSlotPrice);

  const [viewMode, setViewMode] = useState<AppViewMode>('console');
  const [hostCommentDraft, setHostCommentDraft] = useState<string>('');
  const [warmupMessages, setWarmupMessages] = useState<LiveStreamChatMsg[]>([]);
  const [warmupViewers, setWarmupViewers] = useState<number>(0);
  const [floatingHearts, setFloatingHearts] = useState<FloatingHeart[]>([]);
  const [packAnimStage, setPackAnimStage] = useState<PackRipAnimStage>('idle');

  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const tiktokChatEndRef = useRef<HTMLDivElement | null>(null);
  const warmupMsgIdxRef = useRef<number>(0);
  const packAnimTimerRef = useRef<number[]>([]);
  const lastAnimatedPackRef = useRef<number>(0);

  const {
    autoLiveEnabled,
    phase,
    activeLiveBox,
    slots,
    viewers,
    likesCount,
    elapsedSec,
    chatMessages,
    hypeUntilMs,
    sealShownCooldownUntil,
    sealGlintKey,
    flashSaleUsed,
    currentPackNum,
    currentPackOutcomes,
    autoRipActive,
    summaryPayload,
    scheduledHourLabel,
  } = liveRuntime;

  const breakStats = shopState.liveBreakStats || {
    breaksHosted: 0,
    slotsSold: 0,
    totalRevenue: 0,
    viralFollowers: 50,
  };

  useEffect(() => {
    if (ownedBoxes.length === 0) {
      if (selectedProductId !== '') setSelectedProductId('');
      return;
    }
    if (!ownedBoxes.some((b) => b.productId === selectedProductId)) {
      setSelectedProductId(ownedBoxes[0].productId);
    }
  }, [ownedBoxes, selectedProductId]);

  useEffect(() => {
    if (selectedBox && phase === 'setup') {
      setSlotPrice(priceBounds.recommendedSlotPrice);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBox?.productId, priceBounds.recommendedSlotPrice]);

  useEffect(() => {
    onTikTokViewChange(viewMode === 'tiktok');
    return () => {
      onTikTokViewChange(false);
    };
  }, [viewMode, onTikTokViewChange]);

  const isStreamReadyToWatch = prereqs.hasStudioRoom && prereqs.hasStreamerOnShift;
  const isBoxBreakLive = phase === 'streaming_selling' || phase === 'ripping';
  const isOnAir = isBoxBreakLive || (viewMode === 'tiktok' && isStreamReadyToWatch);

  const displayChatMessages =
    chatMessages.length > 0 ? chatMessages : warmupMessages;
  const displayViewers = isBoxBreakLive ? viewers : warmupViewers;

  // Auto-scroll chats
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    tiktokChatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [displayChatMessages.length, viewMode]);

  const clearPackAnimTimers = () => {
    packAnimTimerRef.current.forEach((id) => window.clearTimeout(id));
    packAnimTimerRef.current = [];
  };

  useEffect(() => {
    return () => clearPackAnimTimers();
  }, []);

  const triggerLivePackRipVideo = (hasHit: boolean) => {
    clearPackAnimTimers();
    setPackAnimStage('gripping');
    const t1 = window.setTimeout(() => {
      setPackAnimStage('tearing');
    }, 340);
    const t2 = window.setTimeout(() => {
      setPackAnimStage('sliding');
    }, 960);
    const t3 = window.setTimeout(() => {
      setPackAnimStage('fanning');
      if (hasHit) {
        soundManager.playRarePullFanfare();
        spawnFloatingHeart();
        spawnFloatingHeart();
        spawnFloatingHeart();
      }
    }, 1480);
    packAnimTimerRef.current = [t1, t2, t3];
  };

  const spawnFloatingHeart = () => {
    const colors = ['text-rose-400', 'text-pink-400', 'text-amber-300', 'text-fuchsia-400'];
    const heart: FloatingHeart = {
      id: Date.now() + Math.random(),
      offsetX: Math.round((Math.random() - 0.5) * 34),
      colorClass: colors[Math.floor(Math.random() * colors.length)],
    };
    setFloatingHearts((prev) => [...prev.slice(-10), heart]);
    setTimeout(() => {
      setFloatingHearts((prev) => prev.filter((h) => h.id !== heart.id));
    }, 1350);
  };

  // Floating hearts pulse when watching TikTok live
  useEffect(() => {
    if (!isOnAir || viewMode !== 'tiktok') return;
    const t = setInterval(() => {
      if (Math.random() < 0.65) {
        spawnFloatingHeart();
      }
    }, 1000);
    return () => clearInterval(t);
  }, [isOnAir, viewMode]);

  // Warm-up TikTok Lobby Chatter ONLY if employee hasn't started an active Box Break yet
  useEffect(() => {
    if (viewMode !== 'tiktok' || isBoxBreakLive || !isStreamReadyToWatch) return;

    setWarmupViewers((prev) => (prev === 0 ? 4 : prev));
    if (warmupMessages.length === 0) {
      setWarmupMessages([
        {
          id: `warmup_init_${Date.now()}`,
          sender: 'Nhân Viên Studio',
          text: `Xin chào cả nhà ghé kênh ${shopState.shopName}! ${
            autoLiveEnabled && prereqs.canGoLive
              ? 'Mình đang chuẩn bị lên kèo Box Break theo giờ ngay đây!'
              : 'Đang chờ chủ shop nhập Box hoặc bật Tự Live Theo Giờ để mở kèo nha!'
          }`,
          kind: 'system',
          timestamp: Date.now(),
        },
      ]);
    }

    const timer = setInterval(() => {
      setWarmupViewers((v) => Math.min(28, Math.max(3, v + (Math.random() < 0.65 ? 1 : 0))));
      const nextMsg = WARMUP_VIEWER_CHAT[warmupMsgIdxRef.current % WARMUP_VIEWER_CHAT.length];
      warmupMsgIdxRef.current += 1;
      setWarmupMessages((prev) => [
        ...prev.slice(-30),
        {
          id: `warmup_${Date.now()}_${Math.random()}`,
          sender: nextMsg.sender,
          text: nextMsg.text,
          kind: 'chat',
          timestamp: Date.now(),
        },
      ]);
    }, 2200);

    return () => clearInterval(timer);
  }, [
    viewMode,
    isBoxBreakLive,
    isStreamReadyToWatch,
    shopState.shopName,
    warmupMessages.length,
    autoLiveEnabled,
    prereqs.canGoLive,
  ]);

  // Play the 2-hand POV pack-ripping video ONLY when user is in Watch Live ('tiktok') and a pack rips
  useEffect(() => {
    if (viewMode !== 'tiktok') {
      clearPackAnimTimers();
      setPackAnimStage('idle');
      return;
    }
    if (phase === 'ripping' && currentPackNum > 0) {
      if (lastAnimatedPackRef.current !== currentPackNum || packAnimStage === 'idle') {
        lastAnimatedPackRef.current = currentPackNum;
        triggerLivePackRipVideo(currentPackOutcomes.some((c) => c.isHit));
      }
    } else if (phase !== 'ripping') {
      lastAnimatedPackRef.current = 0;
      clearPackAnimTimers();
      setPackAnimStage('idle');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, phase, currentPackNum]);

  const soldSlotsCount = slots.filter((s) => s.status === 'sold').length;
  const currentSoldRevenue = slots
    .filter((s) => s.status === 'sold')
    .reduce((sum, s) => sum + s.price, 0);
  const autoStartingRip =
    phase === 'streaming_selling' && Boolean(activeLiveBox) && soldSlotsCount === 6;

  const targetProductId = activeLiveBox?.productId || selectedBox?.productId;
  const targetInvItem = useMemo(
    () => shopState.inventory.find((i) => i.productId === targetProductId),
    [shopState.inventory, targetProductId]
  );
  const activeTotalCount = Math.max(0, targetInvItem?.quantity || 0);
  const activeShelfCount = Math.max(
    0,
    Math.min(activeTotalCount, targetInvItem?.shelvedQuantity || 0)
  );

  const packQueue = useMemo(
    () =>
      buildLivePackOrderQueue({
        box: activeLiveBox,
        slots,
        currentPackNum,
        phase,
      }),
    [activeLiveBox, slots, currentPackNum, phase]
  );
  const currentPackOrder =
    packQueue.find((p) => p.packNumber === currentPackNum) || null;

  const fairAnchor = priceBounds.fairSlotAnchor;
  const priceRatio = slotPrice / fairAnchor;
  const priceEval =
    priceRatio < 0.9
      ? { label: 'Rẻ hơn giá lẻ Shop — Khách chốt cực nhanh', color: 'text-emerald-300' }
      : priceRatio <= 1.05
      ? { label: 'Chuẩn giá bán lẻ Shop — Khách chốt ổn định', color: 'text-sky-300' }
      : priceRatio <= 1.25
      ? { label: 'Nhỉnh hơn giá Shop chút — Nhu cầu ổn định', color: 'text-cyan-300' }
      : priceRatio <= 1.48
      ? { label: 'Hơi cao so với giá Shop — Khách sẽ do dự', color: 'text-amber-300' }
      : { label: 'Quá đắt so với giá Shop — Rất khó bán Slot', color: 'text-rose-400' };

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60)
      .toString()
      .padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const latestBuyerMsg = [...displayChatMessages].reverse().find((m) => m.kind === 'bid');

  const handleOpenTikTokStream = () => {
    soundManager.playSelectSound();
    setViewMode('tiktok');
  };

  const handleSendHostCommentForm = (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = hostCommentDraft.trim();
    if (!trimmed) return;
    soundManager.playSelectSound();
    onSendHostComment(trimmed);
    setHostCommentDraft('');
  };

  const handleTapHeartBtn = () => {
    soundManager.playSelectSound();
    onTapHeart();
    spawnFloatingHeart();
  };

  const nextScheduledHour = ((shopState.inGameHour + 1) % 24).toString().padStart(2, '0');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-2 sm:p-5 select-none animate-in fade-in duration-200">
      <div className="relative flex h-[92vh] max-h-[860px] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-rose-500/45 bg-[#09090f] text-zinc-100 shadow-[0_24px_80px_rgba(0,0,0,0.94)]">
        {/* Top App Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 bg-gradient-to-r from-[#140b1c] via-[#1c1024] to-[#140b1c] px-5 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-rose-400/50 bg-gradient-to-br from-rose-600/35 to-purple-600/35 text-rose-300 shadow-lg shrink-0">
              <Radio className={`h-5 w-5 ${isOnAir ? 'text-rose-400' : ''}`} />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-white whitespace-nowrap">
                  PokeLive Studio
                </h2>
                <span className="text-xs text-zinc-500" aria-hidden="true">·</span>
                <span
                  className={`text-xs font-bold tabular-nums whitespace-nowrap ${
                    isOnAir ? 'text-rose-400' : 'text-zinc-400'
                  }`}
                >
                  {isBoxBreakLive
                    ? `Đang phát ${scheduledHourLabel ? `(${scheduledHourLabel}) ` : ''}${formatTimer(elapsedSec)}`
                    : isOnAir
                    ? `Phòng Live Sẵn Sàng ${formatTimer(elapsedSec)}`
                    : 'Ngoại tuyến'}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">
                {breakStats.viralFollowers} Followers · Tự động lên sóng mỗi giờ &amp; Xem Luồng TikTok Live
              </p>
            </div>
          </div>

          {/* Center Segmented Mode Tabs */}
          <div className="flex items-center gap-1 rounded-xl border border-zinc-800 bg-zinc-950/90 p-1">
            <button
              type="button"
              onClick={() => {
                soundManager.playSelectSound();
                setViewMode('console');
              }}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition whitespace-nowrap shrink-0 cursor-pointer ${
                viewMode === 'console'
                  ? 'bg-zinc-800 text-white shadow'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Quản Lý Studio
            </button>
            <button
              type="button"
              onClick={handleOpenTikTokStream}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition whitespace-nowrap shrink-0 cursor-pointer ${
                viewMode === 'tiktok'
                  ? 'bg-rose-600 text-white shadow'
                  : 'text-rose-300 hover:bg-rose-950/50'
              }`}
            >
              <Tv className="h-3.5 w-3.5" />
              Xem Stream TikTok
            </button>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                soundManager.playSelectSound();
                onToggleAutoLive();
              }}
              title="Bật/Tắt nhân viên tự động lên sóng theo từng giờ"
              className={`rounded-xl border px-3 py-1.5 text-[11px] font-black transition cursor-pointer whitespace-nowrap ${
                autoLiveEnabled
                  ? 'border-emerald-500/45 bg-emerald-950/50 text-emerald-300 hover:bg-emerald-900/50'
                  : 'border-zinc-700 bg-zinc-900 text-zinc-400 hover:text-white'
              }`}
            >
              {autoLiveEnabled ? 'Tự Live Theo Giờ: BẬT' : 'Tự Live Theo Giờ: TẮT'}
            </button>
            <div className="rounded-xl border border-emerald-500/35 bg-emerald-950/50 px-3 py-1.5 text-right">
              <div className="text-[10px] font-bold text-emerald-400">Quỹ Shop</div>
              <div className="text-sm font-black text-emerald-200 font-mono tabular-nums">
                ${shopState.cash.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              title="Đóng App (Nhân viên vẫn tiếp tục live dưới nền nếu đang phát)"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-rose-400 hover:text-white transition shrink-0 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* ================================================================= */}
        {/* VIEW 1: TIKTOK-STYLE VERTICAL STREAM VIEWER                        */}
        {/* ================================================================= */}
        {viewMode === 'tiktok' ? (
          <div className="flex-1 overflow-y-auto bg-[#07080d] p-4 sm:p-5">
            {!isStreamReadyToWatch && !isBoxBreakLive ? (
              <div className="mx-auto flex h-full max-w-xl flex-col items-center justify-center text-center space-y-4">
                <div className="flex h-20 w-20 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900 text-zinc-500">
                  <Video className="h-9 w-9" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-lg font-black text-white">
                    Phòng Live Hiện Chưa Có Luồng Phát Sóng
                  </h3>
                  <p className="text-xs text-zinc-400 leading-relaxed max-w-md">
                    {!prereqs.hasStudioRoom
                      ? `Shop chưa xây Phòng Live Studio (Cấp ${LIVE_STUDIO_BUILD_LEVEL}+ · $${LIVE_STUDIO_BUILD_COST}).`
                      : !prereqs.hasStreamerHired
                      ? 'Phòng Live đã có nhưng chưa thuê Nhân Viên Livestream để đứng trước camera.'
                      : 'Nhân Viên Livestream đang nghỉ ngoài giờ trực (Ca phát sóng từ 07:00 – 22:00).'}
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2.5">
                  {!prereqs.hasStudioRoom && (
                    <button
                      type="button"
                      onClick={() => {
                        soundManager.playSelectSound();
                        onBuildLiveStudio();
                      }}
                      disabled={
                        shopState.storeLevel < LIVE_STUDIO_BUILD_LEVEL ||
                        shopState.cash < LIVE_STUDIO_BUILD_COST
                      }
                      className="flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-black text-white hover:bg-rose-500 disabled:opacity-45 cursor-pointer"
                    >
                      <Hammer className="h-4 w-4" />
                      Xây Phòng Live (${LIVE_STUDIO_BUILD_COST})
                    </button>
                  )}
                  {prereqs.hasStudioRoom && !prereqs.hasStreamerHired && (
                    <button
                      type="button"
                      onClick={() => {
                        soundManager.playSelectSound();
                        onGoToHireStreamer();
                      }}
                      className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-black text-zinc-950 hover:bg-amber-400 cursor-pointer"
                    >
                      <Users className="h-4 w-4" />
                      Thuê Nhân Viên Live
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setViewMode('console')}
                    className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-xs font-bold text-zinc-200 hover:border-zinc-500 cursor-pointer"
                  >
                    Quay Lại Quản Lý Studio
                  </button>
                </div>
              </div>
            ) : (
              <div className="mx-auto grid h-full max-w-5xl grid-cols-1 lg:grid-cols-12 gap-4 items-center">
                {/* LEFT: TIKTOK 9:16 VERTICAL POV LIVE STREAM PLAYER */}
                <div className="lg:col-span-6 flex items-center justify-center">
                  <div className="relative flex h-[640px] max-h-[76vh] w-full max-w-[395px] flex-col justify-between overflow-hidden rounded-[28px] border border-zinc-700/85 bg-[#0b0d17] shadow-[0_20px_60px_rgba(0,0,0,0.88)]">
                    {/* 2-HAND POV BREAK TABLE + FOIL TEAR VIDEO + FANNED CARDS */}
                    <LivePovBreakStage
                      setId={activeLiveBox?.setId || selectedBox?.setId}
                      setName={activeLiveBox?.setName || selectedBox?.setName}
                      ownedBoxes={ownedBoxes}
                      phase={phase}
                      packAnimStage={packAnimStage}
                      currentPackOutcomes={currentPackOutcomes}
                      currentPackNum={currentPackNum}
                      packsPerBox={activeLiveBox?.packsPerBox || 9}
                      sealGlintKey={sealGlintKey}
                      soldSlotsCount={soldSlotsCount}
                      autoStartingRip={autoStartingRip}
                      currentPackBuyer={currentPackOrder?.buyerName}
                      currentPackSlotLabel={currentPackOrder?.slotLabel}
                      currentPackSlotColor={currentPackOrder?.slotColorHex}
                      activeShelfCount={activeShelfCount}
                      activeTotalCount={activeTotalCount}
                      onTapStageAction={
                        phase === 'ripping' && currentPackNum < (activeLiveBox?.packsPerBox || 9)
                          ? onRipNextPack
                          : undefined
                      }
                    />

                    {/* TIKTOK COMPACT TOP HEADER OVERLAY */}
                    <div className="relative z-20 flex items-center justify-between gap-2 p-3">
                      <div className="flex items-center gap-2 rounded-full bg-black/45 backdrop-blur-md pr-2.5 pl-1 py-1 max-w-[65%]">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-rose-500 to-amber-400 text-[11px] font-black text-white shrink-0">
                          PK
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-black text-white truncate drop-shadow-xs">
                            {shopState.shopName}
                          </div>
                          <div className="flex items-center gap-1 text-[10px] text-zinc-200 tabular-nums">
                            <Heart className="h-2.5 w-2.5 fill-rose-400 text-rose-400" />
                            <span>{likesCount.toLocaleString()}</span>
                          </div>
                        </div>
                        <span className="ml-1 rounded-full bg-rose-600 px-2 py-0.5 text-[9px] font-black text-white shrink-0">
                          LIVE
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <div className="flex items-center gap-1 rounded-full bg-black/45 backdrop-blur-md px-2.5 py-1.5 text-[11px] font-bold text-white tabular-nums">
                          <Eye className="h-3.5 w-3.5 text-zinc-200" />
                          <span>{displayViewers}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setViewMode('console')}
                          title="Thu về Bảng Quản Lý"
                          className="flex h-8 w-8 items-center justify-center rounded-full bg-black/45 backdrop-blur-md text-zinc-200 hover:text-white cursor-pointer"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* FLOATING HEARTS ANIMATION LAYER */}
                    <div className="pointer-events-none absolute right-3.5 bottom-20 z-20 h-44 w-12">
                      {floatingHearts.map((h) => (
                        <Heart
                          key={h.id}
                          style={{ marginRight: `${Math.max(0, h.offsetX)}px` }}
                          className={`absolute bottom-0 right-1 h-5 w-5 fill-current ${h.colorClass} animate-float-heart`}
                        />
                      ))}
                    </div>

                    {/* TIKTOK TRANSPARENT BOTTOM COMMENTS + FOOTER TOOLBAR */}
                    <div className="relative z-20 mt-auto flex flex-col gap-1.5 px-3 pb-3 pt-1">
                      {latestBuyerMsg && isBoxBreakLive && (
                        <div className="self-start flex items-center gap-1.5 rounded-full bg-black/55 backdrop-blur-xs px-2.5 py-1 text-[10px] font-bold text-emerald-300 shadow">
                          <Sparkles className="h-3 w-3 text-amber-300 shrink-0" />
                          <span className="truncate max-w-[290px]">
                            {latestBuyerMsg.sender} {latestBuyerMsg.text}
                          </span>
                        </div>
                      )}

                      <div className="max-h-36 overflow-y-auto space-y-1.5 pr-8">
                        {displayChatMessages.map((msg) => {
                          const avatarLetter = msg.sender.replace('@', '').slice(0, 1).toUpperCase() || 'U';
                          const avatarBg =
                            msg.kind === 'bid'
                              ? 'bg-emerald-500 text-zinc-950'
                              : msg.kind === 'hit'
                              ? 'bg-amber-400 text-zinc-950'
                              : msg.kind === 'system' || msg.kind === 'hype'
                              ? 'bg-rose-500 text-white'
                              : 'bg-indigo-500 text-white';

                          return (
                            <div
                              key={msg.id}
                              className="flex items-start gap-2 text-[11px] leading-snug drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]"
                            >
                              <span
                                className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-black shrink-0 ${avatarBg}`}
                              >
                                {avatarLetter}
                              </span>
                              <div className="min-w-0">
                                <span
                                  className={`font-black mr-1.5 ${
                                    msg.kind === 'bid'
                                      ? 'text-emerald-300'
                                      : msg.kind === 'hit'
                                      ? 'text-amber-300'
                                      : msg.kind === 'system' || msg.kind === 'hype'
                                      ? 'text-rose-300'
                                      : 'text-sky-200'
                                  }`}
                                >
                                  {msg.sender}
                                </span>
                                <span className="text-white/95">{msg.text}</span>
                              </div>
                            </div>
                          );
                        })}
                        <div ref={tiktokChatEndRef} />
                      </div>

                      {/* Bottom Bar */}
                      <div className="flex items-center gap-1.5 pt-1">
                        {(phase === 'setup' || phase === 'summary') && prereqs.canGoLive && selectedBox ? (
                          <button
                            type="button"
                            onClick={() => onStartBroadcast(selectedBox, slotPrice, true)}
                            className="flex items-center gap-1 rounded-full bg-amber-500 px-2.5 py-2 text-[10px] font-black text-zinc-950 hover:bg-amber-400 whitespace-nowrap shrink-0 cursor-pointer"
                          >
                            <ShoppingBag className="h-3.5 w-3.5" />
                            Mở Bán Slot
                          </button>
                        ) : phase === 'streaming_selling' && activeLiveBox ? (
                          <button
                            type="button"
                            onClick={onBeginRipping}
                            className="flex items-center gap-1 rounded-full bg-emerald-500 px-2.5 py-2 text-[10px] font-black text-zinc-950 hover:bg-emerald-400 whitespace-nowrap shrink-0 cursor-pointer tabular-nums"
                          >
                            <Scissors className="h-3.5 w-3.5" />
                            Xé Cho Khách ({soldSlotsCount}/6)
                          </button>
                        ) : phase === 'ripping' && activeLiveBox ? (
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={onRipNextPack}
                              disabled={currentPackNum >= activeLiveBox.packsPerBox}
                              className="flex items-center gap-1 rounded-full bg-rose-600 px-2.5 py-2 text-[10px] font-black text-white hover:bg-rose-500 disabled:opacity-45 whitespace-nowrap cursor-pointer tabular-nums"
                            >
                              <Scissors className="h-3.5 w-3.5" />
                              {currentPackNum < activeLiveBox.packsPerBox
                                ? `Xé #${currentPackNum + 1}`
                                : 'Xong'}
                            </button>
                            <button
                              type="button"
                              onClick={onToggleAutoRip}
                              title={autoRipActive ? 'Tạm dừng tự động xé' : 'Tiếp tục tự động xé'}
                              className={`rounded-full px-2 py-2 text-[10px] font-black whitespace-nowrap cursor-pointer ${
                                autoRipActive
                                  ? 'bg-amber-500 text-zinc-950'
                                  : 'bg-black/65 text-zinc-200 border border-white/20'
                              }`}
                            >
                              {autoRipActive ? 'Auto' : 'Dừng'}
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 rounded-full bg-black/55 px-2.5 py-2 text-[10px] font-bold text-amber-300 whitespace-nowrap shrink-0 tabular-nums">
                            <ShoppingBag className="h-3 w-3" />
                            <span>${slotPrice}</span>
                          </div>
                        )}

                        <form onSubmit={handleSendHostCommentForm} className="flex flex-1 items-center gap-1.5 min-w-0">
                          <input
                            type="text"
                            value={hostCommentDraft}
                            onChange={(e) => setHostCommentDraft(e.target.value)}
                            placeholder="Nhắn với người xem..."
                            className="w-full min-w-0 rounded-full border border-white/15 bg-black/50 px-3 py-1.5 text-xs text-white placeholder:text-zinc-300 outline-none focus:border-rose-400"
                          />
                          <button
                            type="submit"
                            title="Gửi bình luận"
                            className="flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white hover:bg-rose-600 transition shrink-0 cursor-pointer"
                          >
                            <Send className="h-3.5 w-3.5" />
                          </button>
                        </form>

                        <button
                          type="button"
                          onClick={handleTapHeartBtn}
                          title="Thả tim tăng tương tác"
                          className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-600 text-white hover:bg-rose-500 active:scale-95 transition shrink-0 cursor-pointer"
                        >
                          <Heart className="h-4 w-4 fill-current" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* RIGHT: COMPANION LIVE STREAM DIRECTOR PANEL (COMPACT, LOCKED TO PLAYER HEIGHT) */}
                <div className="lg:col-span-6 flex h-[640px] max-h-[76vh] flex-col justify-between gap-2.5 overflow-hidden rounded-2xl border border-zinc-800 bg-[#10121c] p-4">
                  {/* Compact Panel Header */}
                  <div className="flex items-center justify-between gap-2 border-b border-zinc-800 pb-2 shrink-0">
                    <div className="min-w-0">
                      <h3 className="text-sm font-black text-white truncate">
                        Điều Khiển Phiên Live Của Nhân Viên
                      </h3>
                      <p className="text-[11px] text-zinc-400 truncate">
                        Nhân viên tự live theo giờ ngay cả khi đóng app · Theo dõi &amp; điều phối đơn tại đây.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setViewMode('console')}
                      className="rounded-lg border border-zinc-700 bg-zinc-900 px-2.5 py-1.5 text-[11px] font-bold text-zinc-200 hover:border-zinc-500 whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      Bảng Cài Đặt
                    </button>
                  </div>

                  {/* Scroll-Contained Middle Area */}
                  <div className="flex-1 min-h-0 overflow-y-auto space-y-2.5 pr-1">
                    {(phase === 'setup' || phase === 'summary') && (
                      <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-3.5 space-y-2.5">
                        <div className="text-xs font-bold text-zinc-200">
                          {phase === 'summary' && summaryPayload
                            ? `Vừa xong phiên ${summaryPayload.setName} (+$${summaryPayload.slotRevenue}). ${
                                autoLiveEnabled
                                  ? `Nhân viên sẽ tự mở phiên tiếp vào lúc ${nextScheduledHour}:00.`
                                  : ''
                              }`
                            : autoLiveEnabled && prereqs.canGoLive
                            ? 'Nhân viên đang chuẩn bị tự lên sóng theo lịch giờ...'
                            : 'Nhân viên đang giữ luồng chờ chủ shop nhập Box hoặc mở kèo.'}
                        </div>
                        {ownedBoxes.length > 0 ? (
                          <>
                            <div>
                              <label className="block text-[11px] font-bold text-zinc-400 mb-1">
                                Chọn Booster Box từ kho để lên kèo bán Slot ngay
                              </label>
                              <select
                                value={selectedBox?.productId || ''}
                                onChange={(e) => setSelectedProductId(e.target.value)}
                                className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs font-bold text-white outline-none focus:border-rose-400"
                              >
                                {ownedBoxes.map((b) => (
                                  <option key={b.productId} value={b.productId}>
                                    {b.setName} — Kệ: {b.shelvedQuantity} · Tổng kho: {b.quantity} Box
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-xs text-zinc-300 tabular-nums">
                                Giá Slot: <strong className="text-amber-300">${slotPrice}/slot</strong>
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  selectedBox && onStartBroadcast(selectedBox, slotPrice, true)
                                }
                                disabled={!prereqs.canGoLive || !selectedBox}
                                className="flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-xs font-black text-white hover:bg-rose-500 disabled:opacity-45 cursor-pointer"
                              >
                                <Video className="h-4 w-4" />
                                Lên Kèo Bán 6 Slot Ngay
                              </button>
                            </div>
                          </>
                        ) : (
                          <div className="flex items-center justify-between gap-3 rounded-xl border border-rose-500/35 bg-rose-950/20 p-3">
                            <span className="text-xs text-rose-200">
                              Kho hiện có 0 Booster Box. Cần nhập hàng để nhân viên tự live!
                            </span>
                            <button
                              type="button"
                              onClick={onGoToSupplyShop}
                              className="rounded-lg bg-sky-500 px-3 py-2 text-xs font-black text-zinc-950 hover:bg-sky-400 whitespace-nowrap shrink-0 cursor-pointer"
                            >
                              Nhập Box
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {(phase === 'streaming_selling' || phase === 'ripping') && activeLiveBox && (
                      <div className="flex items-center gap-2.5 rounded-xl border border-zinc-800 bg-zinc-950/90 p-2">
                        {activeLiveBox.imageUrl ? (
                          <img
                            src={activeLiveBox.imageUrl}
                            alt={activeLiveBox.setName}
                            referrerPolicy="no-referrer"
                            className="h-10 w-10 rounded-lg border border-zinc-700 bg-zinc-900 object-contain p-0.5 shrink-0"
                          />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-900 text-amber-300 shrink-0">
                            <Package className="h-4 w-4" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-black text-white truncate">
                              Box: {activeLiveBox.setName} ({activeLiveBox.packsPerBox}P)
                            </span>
                            {phase === 'ripping' && (
                              <span className="rounded bg-emerald-500/20 border border-emerald-500/40 px-1.5 py-0.5 text-[9px] font-black text-emerald-300 whitespace-nowrap shrink-0">
                                {activeLiveBox.consumedFromShelf ? 'Đã trừ 1 Box Kệ' : 'Đã trừ 1 Box Kho'}
                              </span>
                            )}
                          </div>
                          <div className="mt-0.5 flex items-center gap-2 text-[10px] text-zinc-400 tabular-nums">
                            <span>
                              Trên kệ: <strong className="text-sky-300">{activeShelfCount} Box</strong>
                            </span>
                            <span aria-hidden="true">·</span>
                            <span>
                              Tổng kho: <strong className="text-zinc-200">{activeTotalCount} Box</strong>
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {phase === 'streaming_selling' && activeLiveBox && (
                      <div className="space-y-2.5">
                        <div className="flex flex-wrap gap-1.5">
                          <button
                            type="button"
                            onClick={onShowSeal}
                            disabled={Date.now() < sealShownCooldownUntil}
                            className="flex items-center gap-1 rounded-lg border border-sky-500/45 bg-sky-950/50 px-2.5 py-1.5 text-[11px] font-black text-sky-200 hover:bg-sky-900/50 disabled:opacity-45 cursor-pointer"
                          >
                            <Sparkles className="h-3 w-3" />
                            Soi Seal Hộp
                          </button>
                          <button
                            type="button"
                            onClick={onHypeShoutout}
                            disabled={Date.now() < hypeUntilMs}
                            className="flex items-center gap-1 rounded-lg border border-amber-500/45 bg-amber-950/50 px-2.5 py-1.5 text-[11px] font-black text-amber-200 hover:bg-amber-900/50 disabled:opacity-45 cursor-pointer"
                          >
                            <Megaphone className="h-3 w-3" />
                            {Date.now() < hypeUntilMs ? 'Đang Kêu Gọi' : 'Kêu Gọi Chốt Đơn'}
                          </button>
                          <button
                            type="button"
                            onClick={onFlashSale}
                            disabled={flashSaleUsed || soldSlotsCount === 6}
                            className="flex items-center gap-1 rounded-lg border border-rose-500/45 bg-rose-950/50 px-2.5 py-1.5 text-[11px] font-black text-rose-200 hover:bg-rose-900/50 disabled:opacity-45 cursor-pointer"
                          >
                            <Zap className="h-3 w-3" />
                            {flashSaleUsed ? 'Đã Flash Sale' : 'Flash Sale -15%'}
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-1.5">
                          {slots.map((slot, slotIdx) => {
                            const packNums = getSlotAssignedPackNumbers(
                              slotIdx,
                              activeLiveBox.packsPerBox,
                              slots.length
                            )
                              .map((n) => `#${n}`)
                              .join(',');
                            return (
                              <div
                                key={slot.slotId}
                                className={`rounded-lg border px-2.5 py-1.5 ${
                                  slot.status === 'sold'
                                    ? 'border-emerald-500/50 bg-emerald-950/30'
                                    : 'border-zinc-800 bg-zinc-900/70'
                                }`}
                              >
                                <div className="flex items-center justify-between text-[11px] font-black gap-1">
                                  <span className="text-white truncate">{slot.label}</span>
                                  <span className="text-amber-300 font-mono tabular-nums shrink-0">
                                    ${slot.price}
                                  </span>
                                </div>
                                <div className="mt-0.5 flex items-center justify-between gap-1 text-[10px] tabular-nums">
                                  <span className="text-zinc-400 shrink-0">P{packNums}</span>
                                  <span
                                    className={`truncate font-bold ${
                                      slot.status === 'sold' ? 'text-emerald-300' : 'text-zinc-500'
                                    }`}
                                  >
                                    {slot.status === 'sold' ? slot.buyerName : 'Chờ khách...'}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Compact Pack-by-Pack Order Preview */}
                        {packQueue.length > 0 && (
                          <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-2">
                            <div className="text-[10px] font-black text-zinc-400 mb-1">
                              Đơn Pack Sẽ Unbox ({activeLiveBox.setName})
                            </div>
                            <div className="grid grid-cols-3 gap-1">
                              {packQueue.map((item) => (
                                <div
                                  key={item.packNumber}
                                  className={`flex items-center justify-between gap-1 rounded-md border px-2 py-1 text-[10px] ${
                                    item.buyerName
                                      ? 'border-emerald-500/40 bg-emerald-950/25'
                                      : 'border-zinc-800 bg-zinc-900/50'
                                  }`}
                                >
                                  <span className="font-black text-white tabular-nums shrink-0">
                                    P#{item.packNumber}
                                  </span>
                                  <span
                                    className={`truncate font-bold ${
                                      item.buyerName ? 'text-emerald-300' : 'text-zinc-500'
                                    }`}
                                  >
                                    {item.buyerName || 'Shop'}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                          <button
                            type="button"
                            onClick={onCancelBeforeRip}
                            className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-[11px] font-bold text-zinc-300 hover:border-rose-400 cursor-pointer"
                          >
                            Tắt Phiên Bán
                          </button>
                          <button
                            type="button"
                            onClick={onBeginRipping}
                            className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3.5 py-2 text-[11px] font-black text-zinc-950 hover:bg-emerald-400 cursor-pointer"
                          >
                            <Scissors className="h-3.5 w-3.5" />
                            Xé Seal &amp; Khui Box (Trừ 1 Box {activeShelfCount > 0 ? 'Trên Kệ' : 'Kho'})
                          </button>
                        </div>
                      </div>
                    )}

                    {phase === 'ripping' && activeLiveBox && (
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between rounded-xl border border-amber-500/40 bg-zinc-950 px-3 py-2">
                          <div className="min-w-0 pr-2">
                            <div className="text-xs font-black text-amber-300 tabular-nums">
                              Đang unbox Pack #{currentPackNum}/{activeLiveBox.packsPerBox}
                            </div>
                            <div className="text-[11px] font-bold text-white truncate">
                              {currentPackOrder?.buyerName
                                ? `Khách: ${currentPackOrder.buyerName} (${currentPackOrder.slotLabel})`
                                : currentPackOrder
                                ? `Shop tự khui (${currentPackOrder.slotLabel})`
                                : activeLiveBox.setName}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={onToggleAutoRip}
                              className="rounded-lg border border-zinc-700 bg-zinc-900 px-2.5 py-1.5 text-[11px] font-bold text-zinc-200 hover:border-amber-400 cursor-pointer"
                            >
                              {autoRipActive ? 'Dừng Auto' : 'Auto Khui'}
                            </button>
                            <button
                              type="button"
                              onClick={onRipNextPack}
                              disabled={currentPackNum >= activeLiveBox.packsPerBox}
                              className="rounded-lg bg-rose-600 px-3 py-1.5 text-[11px] font-black text-white hover:bg-rose-500 disabled:opacity-45 cursor-pointer"
                            >
                              {currentPackNum < activeLiveBox.packsPerBox
                                ? `Khui P#${currentPackNum + 1}`
                                : 'Tổng Kết...'}
                            </button>
                          </div>
                        </div>

                        {/* Compact 3x3 single-line Pack Queue */}
                        {packQueue.length > 0 && (
                          <div className="grid grid-cols-3 gap-1">
                            {packQueue.map((item) => (
                              <div
                                key={item.packNumber}
                                className={`flex items-center justify-between gap-1 rounded-md border px-2 py-1 text-[10px] ${
                                  item.status === 'ripping'
                                    ? 'border-amber-400 bg-amber-500/20'
                                    : item.status === 'unboxed'
                                    ? 'border-emerald-500/50 bg-emerald-950/30'
                                    : item.buyerName
                                    ? 'border-sky-500/35 bg-sky-950/20'
                                    : 'border-zinc-800 bg-zinc-900/50'
                                }`}
                              >
                                <span className="font-black text-white tabular-nums shrink-0">
                                  {item.status === 'unboxed'
                                    ? `✓P${item.packNumber}`
                                    : item.status === 'ripping'
                                    ? `▶P${item.packNumber}`
                                    : `P#${item.packNumber}`}
                                </span>
                                <span
                                  className={`truncate font-bold ${
                                    item.buyerName ? 'text-emerald-300' : 'text-zinc-500'
                                  }`}
                                >
                                  {item.buyerName || 'Shop'}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}

                        {currentPackOutcomes.length > 0 && (
                          <div className="grid grid-cols-5 gap-1.5">
                            {currentPackOutcomes.map((out, idx) => (
                              <div
                                key={`${out.card.id}_${idx}`}
                                className={`rounded-lg border p-1 bg-zinc-950 ${
                                  out.isHit ? 'border-amber-400' : 'border-zinc-800'
                                }`}
                              >
                                <img
                                  src={out.card.imageUrl}
                                  alt={out.card.name}
                                  className="h-14 w-full object-contain"
                                />
                                <div className="mt-0.5 text-[9px] font-bold text-white truncate">
                                  {out.card.name}
                                </div>
                                <div className="text-[9px] font-bold text-emerald-300 truncate tabular-nums">
                                  ${Math.round(out.card.marketPrice || 0)} ·{' '}
                                  {out.disposition === 'shipped' ? out.buyerName : 'Binder'}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Compact Footer Totals */}
                  <div className="shrink-0 rounded-xl border border-zinc-800 bg-black/40 px-3 py-2 flex items-center justify-between text-xs text-zinc-400 tabular-nums">
                    <span>Đã chốt {soldSlotsCount}/6 Slot</span>
                    <span className="font-bold text-emerald-300">Doanh thu Slot: ${currentSoldRevenue}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* ================================================================= */
          /* VIEW 2: STUDIO CONSOLE & REAL-TIME CHAT SPLIT                     */
          /* ================================================================= */
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
            {/* LEFT 8 COLS */}
            <div className="lg:col-span-8 overflow-y-auto p-5 space-y-4 border-b lg:border-b-0 lg:border-r border-zinc-800/80">
              {/* CLICKABLE TIKTOK STREAM BANNER */}
              <div
                role="button"
                tabIndex={0}
                onClick={handleOpenTikTokStream}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleOpenTikTokStream();
                  }
                }}
                className={`group flex flex-wrap items-center justify-between gap-4 rounded-2xl border p-4 transition cursor-pointer ${
                  isBoxBreakLive || isStreamReadyToWatch
                    ? 'border-rose-500/50 bg-gradient-to-r from-[#240d21] via-[#171124] to-[#0f1320] hover:border-rose-400'
                    : 'border-zinc-800 bg-zinc-900/60 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div className="relative flex h-14 w-12 items-center justify-center rounded-xl border border-rose-400/50 bg-black/70 text-rose-300 shrink-0">
                    <Tv className="h-6 w-6" />
                    <span
                      className={`absolute -top-1.5 -right-1.5 rounded px-1.5 py-0.5 text-[9px] font-black ${
                        isBoxBreakLive || isStreamReadyToWatch
                          ? 'bg-rose-600 text-white'
                          : 'bg-zinc-700 text-zinc-300'
                      }`}
                    >
                      {isBoxBreakLive || isStreamReadyToWatch ? 'LIVE' : 'OFF'}
                    </span>
                  </div>
                  <div>
                    <div className="text-sm font-black text-white group-hover:text-rose-200 transition">
                      {phase === 'ripping' && activeLiveBox
                        ? `Nhân Viên Đang Xé Pack ${currentPackNum}/${activeLiveBox.packsPerBox} Cho Khách — Bấm Xem TikTok`
                        : phase === 'streaming_selling' && activeLiveBox
                        ? `Nhân Viên Đang Live Bán Slot (${soldSlotsCount}/6) — Bấm Để Xem TikTok`
                        : isStreamReadyToWatch
                        ? 'Kênh Stream Của Nhân Viên Đang Sẵn Sàng — Bấm Để Vào Xem (TikTok)'
                        : 'Luồng Live TikTok Đang Ngoại Tuyến — Bấm Để Kiểm Tra'}
                    </div>
                    <div className="mt-0.5 text-xs text-zinc-400 tabular-nums">
                      {isBoxBreakLive
                        ? `${displayViewers} người đang xem · ${likesCount} lượt thích · Đóng app nhân viên vẫn tự live tiếp`
                        : isStreamReadyToWatch
                        ? `${
                            autoLiveEnabled && prereqs.canGoLive
                              ? `Tự động lên sóng theo từng giờ (${nextScheduledHour}:00)`
                              : 'Sẵn sàng phát sóng tại Phòng Live Studio'
                          }`
                        : 'Cần Phòng Live Studio + Nhân Viên Livestream đang trực ca (07:00–22:00)'}
                    </div>
                  </div>
                </div>
                <span className="rounded-xl bg-rose-600 px-3.5 py-2 text-xs font-black text-white group-hover:bg-rose-500 whitespace-nowrap shrink-0">
                  Vào Xem Stream
                </span>
              </div>

              {/* 3 REAL-WORLD PREREQUISITE GATES (WHEN SETUP) */}
              {phase === 'setup' && (
                <>
                  <div className="rounded-2xl border border-zinc-800 bg-[#11131e] p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-black tracking-wide text-rose-300">
                        Điều Kiện Tự Động Live Theo Giờ Tại Shop
                      </h3>
                      <span
                        className={`text-xs font-black ${
                          prereqs.canGoLive ? 'text-emerald-300' : 'text-amber-300'
                        }`}
                      >
                        {prereqs.canGoLive
                          ? autoLiveEnabled
                            ? 'Đủ điều kiện · Tự lên sóng ngay'
                            : 'Đủ điều kiện (Đang tắt Tự Live)'
                          : 'Chưa đủ điều kiện'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div
                        className={`rounded-xl border p-3 flex flex-col justify-between gap-2 ${
                          prereqs.hasStudioRoom
                            ? 'border-emerald-500/40 bg-emerald-950/20'
                            : 'border-rose-500/40 bg-rose-950/20'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-black text-white">1. Phòng Live Studio</span>
                            {prereqs.hasStudioRoom ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                            ) : (
                              <Lock className="h-4 w-4 text-rose-400" />
                            )}
                          </div>
                          <p className="text-[11px] text-zinc-400">
                            {prereqs.hasStudioRoom
                              ? 'Phòng Live góc sau bên phải Shop 3D đã sẵn sàng đèn Ring Light & Camera.'
                              : `Cần xây Phòng Live tại Shop (Cấp ${LIVE_STUDIO_BUILD_LEVEL}+ · $${LIVE_STUDIO_BUILD_COST}).`}
                          </p>
                        </div>
                        {!prereqs.hasStudioRoom && (
                          <button
                            type="button"
                            onClick={() => {
                              soundManager.playSelectSound();
                              onBuildLiveStudio();
                            }}
                            disabled={
                              shopState.storeLevel < LIVE_STUDIO_BUILD_LEVEL ||
                              shopState.cash < LIVE_STUDIO_BUILD_COST
                            }
                            className="flex items-center justify-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-[11px] font-black text-white hover:bg-rose-500 disabled:opacity-45 cursor-pointer"
                          >
                            <Hammer className="h-3.5 w-3.5" />
                            Xây Phòng (${LIVE_STUDIO_BUILD_COST})
                          </button>
                        )}
                      </div>

                      <div
                        className={`rounded-xl border p-3 flex flex-col justify-between gap-2 ${
                          prereqs.hasStreamerOnShift
                            ? 'border-emerald-500/40 bg-emerald-950/20'
                            : 'border-amber-500/40 bg-amber-950/20'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-black text-white">2. Nhân Viên Live</span>
                            {prereqs.hasStreamerOnShift ? (
                              <UserCheck className="h-4 w-4 text-emerald-400" />
                            ) : (
                              <AlertCircle className="h-4 w-4 text-amber-400" />
                            )}
                          </div>
                          <p className="text-[11px] text-zinc-400">
                            {prereqs.hasStreamerOnShift
                              ? 'Nhân Viên Livestream đang trực (07:00–22:00) và tự vận hành kèo live mỗi giờ.'
                              : prereqs.hasStreamerHired
                              ? 'Streamer đang nghỉ ngoài giờ! Ca trực từ 07:00 – 22:00.'
                              : `Cần thuê Nhân Viên Livestream (Mở Cấp ${LIVE_STREAMER_UNLOCK_LEVEL}) để tự live.`}
                          </p>
                        </div>
                        {!prereqs.hasStreamerHired && (
                          <button
                            type="button"
                            onClick={() => {
                              soundManager.playSelectSound();
                              onGoToHireStreamer();
                            }}
                            className="flex items-center justify-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-[11px] font-black text-zinc-950 hover:bg-amber-400 cursor-pointer"
                          >
                            <Users className="h-3.5 w-3.5" />
                            Mở App Nhân Viên
                          </button>
                        )}
                      </div>

                      <div
                        className={`rounded-xl border p-3 flex flex-col justify-between gap-2 ${
                          ownedBoxes.length > 0
                            ? 'border-emerald-500/40 bg-emerald-950/20'
                            : 'border-rose-500/40 bg-rose-950/20'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-black text-white">3. Box Thật Trong Kho</span>
                            {ownedBoxes.length > 0 ? (
                              <Package className="h-4 w-4 text-emerald-400" />
                            ) : (
                              <AlertCircle className="h-4 w-4 text-rose-400" />
                            )}
                          </div>
                          <p className="text-[11px] text-zinc-400">
                            {ownedBoxes.length > 0
                              ? `Đang có ${ownedBoxes.reduce((s, b) => s + b.quantity, 0)} Booster Box sẵn sàng tự khui.`
                              : 'Kho hiện đang có 0 Booster Box! Phải nhập Box thật về mới live được.'}
                          </p>
                        </div>
                        {ownedBoxes.length === 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              soundManager.playSelectSound();
                              onGoToSupplyShop();
                            }}
                            className="flex items-center justify-center gap-1.5 rounded-lg bg-sky-500 px-3 py-1.5 text-[11px] font-black text-zinc-950 hover:bg-sky-400 cursor-pointer"
                          >
                            <Package className="h-3.5 w-3.5" />
                            Vào Supply Nhập Box
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Manual Box Selection & Slot Pricing */}
                  <div className="rounded-2xl border border-zinc-800 bg-[#121420] p-4 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-bold text-zinc-400 mb-1.5">
                          Hoặc Chủ Động Chọn Bộ Booster Box Khui Ngay
                        </label>
                        {ownedBoxes.length > 0 ? (
                          <select
                            value={selectedBox?.productId || ''}
                            onChange={(e) => setSelectedProductId(e.target.value)}
                            className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-xs font-bold text-white outline-none focus:border-rose-400"
                          >
                            {ownedBoxes.map((b) => (
                              <option key={b.productId} value={b.productId}>
                                {b.setName} — Trên kệ: {b.shelvedQuantity} · Tổng kho: {b.quantity} Box ({b.packsPerBox} Packs/Box)
                              </option>
                            ))}
                          </select>
                        ) : (
                          <div className="rounded-xl border border-dashed border-zinc-700 bg-zinc-950/60 px-3 py-2.5 text-xs text-rose-300 font-bold">
                            Kho trống — Chưa có Booster Box nào để chọn
                          </div>
                        )}
                      </div>

                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <label className="block text-[11px] font-bold text-zinc-400">
                            Định Giá Mỗi Slot (6 Slot Hệ Bài)
                          </label>
                          {selectedBox && slotPrice !== recommendedSlotPrice && (
                            <button
                              type="button"
                              onClick={() => setSlotPrice(recommendedSlotPrice)}
                              className="rounded-md border border-sky-500/40 bg-sky-950/70 px-2 py-0.5 text-[10px] font-bold text-sky-300 hover:bg-sky-900/80 cursor-pointer transition"
                            >
                              Đặt Chuẩn Giá Shop (${recommendedSlotPrice})
                            </button>
                          )}
                        </div>
                        <div className="flex items-center gap-2.5">
                          <input
                            type="range"
                            min={priceBounds.minSlotPrice}
                            max={priceBounds.maxSlotPrice}
                            value={slotPrice}
                            onChange={(e) => setSlotPrice(Number(e.target.value))}
                            className="flex-1 accent-rose-500"
                          />
                          <span className="rounded-lg border border-rose-500/40 bg-rose-950 px-3 py-1.5 text-xs font-black text-rose-200 font-mono tabular-nums">
                            ${slotPrice}/slot
                          </span>
                        </div>
                        <div className={`mt-1 text-[11px] font-bold ${priceEval.color}`}>
                          {priceEval.label}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {LIVE_BREAK_SLOTS.map((slot) => (
                        <div
                          key={slot.id}
                          className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/70 px-3 py-2"
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className="h-2.5 w-2.5 rounded-full"
                              style={{ backgroundColor: slot.colorHex }}
                            />
                            <span className="text-[11px] font-bold text-zinc-200">{slot.label}</span>
                          </div>
                          <span className="text-xs font-black text-amber-300 tabular-nums">
                            ${createLiveStreamSlots(slotPrice)[0].price}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-black/40 p-3.5">
                      <div className="text-xs text-zinc-300 space-y-1">
                        {selectedBox ? (
                          <>
                            <div>
                              Dùng <span className="font-black text-amber-300">1x {selectedBox.setName}</span> (Trên kệ: {selectedBox.shelvedQuantity} · Tổng kho: {selectedBox.quantity} Box) ·{' '}
                              Giá lẻ chuẩn Shop:{' '}
                              <span className="font-black text-sky-300 tabular-nums">
                                ${selectedBox.boxRetailPrice}
                              </span>{' '}
                              <span className="text-zinc-500 tabular-nums">
                                (~${selectedBox.packRetailPrice}/pack · Sỉ: ${selectedBox.boxWholesalePrice})
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 text-[11px]">
                              <span>
                                Tổng 6/6 Slot:{' '}
                                <span className="font-black text-emerald-300 tabular-nums">
                                  ${slotPrice * 6}
                                </span>
                              </span>
                              <span className="text-zinc-600">·</span>
                              <span
                                className={
                                  slotPrice * 6 - selectedBox.boxWholesalePrice >= 0
                                    ? 'font-bold text-emerald-400 tabular-nums'
                                    : 'font-bold text-rose-400 tabular-nums'
                                }
                              >
                                Lãi gộp: {slotPrice * 6 - selectedBox.boxWholesalePrice >= 0 ? '+' : ''}
                                ${(slotPrice * 6 - selectedBox.boxWholesalePrice).toFixed(2)}
                              </span>
                              <span className="text-zinc-600">·</span>
                              {slotPrice * 6 >= selectedBox.boxRetailPrice ? (
                                <span className="font-bold text-sky-300 tabular-nums">
                                  Chuẩn giá Shop (+${(slotPrice * 6 - selectedBox.boxRetailPrice).toFixed(0)} so với bán lẻ Box)
                                </span>
                              ) : (
                                <span className="font-bold text-amber-300 tabular-nums">
                                  Thấp hơn giá lẻ Shop -${(selectedBox.boxRetailPrice - slotPrice * 6).toFixed(0)}
                                </span>
                              )}
                            </div>
                          </>
                        ) : (
                          <span className="text-zinc-500">Cần hoàn thành đủ 3 điều kiện trên để phát sóng.</span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => selectedBox && onStartBroadcast(selectedBox, slotPrice, false)}
                        disabled={!prereqs.canGoLive || !selectedBox}
                        className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-fuchsia-600 px-5 py-2.5 text-xs font-black text-white shadow-lg hover:brightness-110 disabled:opacity-40 cursor-pointer transition"
                      >
                        <Video className="h-4 w-4" />
                        Bắt Đầu Phát Sóng (Go Live)
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* PHASE 2: LIVE BROADCAST WAITING ROOM */}
              {phase === 'streaming_selling' && activeLiveBox && (
                <div className="space-y-4">
                  <div className="relative overflow-hidden rounded-2xl border border-rose-500/45 bg-gradient-to-br from-[#1f0b29] via-[#131124] to-[#0a0c14] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-rose-400/50 bg-rose-500/20 text-rose-300">
                          <Radio className="h-6 w-6" />
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2 text-xs font-bold tabular-nums">
                            <span className="rounded bg-rose-600 px-2 py-0.5 text-[10px] font-black text-white">
                              LIVE · {formatTimer(elapsedSec)}
                            </span>
                            <span className="text-sky-300">{displayViewers} đang xem</span>
                            <span className="text-zinc-600" aria-hidden="true">·</span>
                            <span className="text-emerald-300">
                              Đã bán {soldSlotsCount}/6 Slot · ${currentSoldRevenue}
                            </span>
                          </div>
                          <div className="mt-1 text-sm font-black text-white">
                            Host: Nhân Viên Livestream · Box: {activeLiveBox.setName} (Trên kệ: {activeShelfCount} · Kho: {activeTotalCount})
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleOpenTikTokStream}
                          className="flex items-center gap-1.5 rounded-xl bg-rose-600 px-3 py-1.5 text-[11px] font-black text-white hover:bg-rose-500 cursor-pointer"
                        >
                          <Tv className="h-3.5 w-3.5" /> Xem Kiểu TikTok
                        </button>
                        <button
                          type="button"
                          onClick={onCancelBeforeRip}
                          className="flex items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-[11px] font-bold text-zinc-300 hover:border-rose-400 hover:text-white cursor-pointer"
                        >
                          <Square className="h-3 w-3" /> Tắt Live
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={onShowSeal}
                        disabled={Date.now() < sealShownCooldownUntil}
                        className="flex items-center gap-1.5 rounded-xl border border-sky-500/45 bg-sky-950/50 px-3 py-2 text-xs font-black text-sky-200 hover:bg-sky-900/50 disabled:opacity-45 cursor-pointer"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        Soi Seal Hộp
                      </button>
                      <button
                        type="button"
                        onClick={onHypeShoutout}
                        disabled={Date.now() < hypeUntilMs}
                        className="flex items-center gap-1.5 rounded-xl border border-amber-500/45 bg-amber-950/50 px-3 py-2 text-xs font-black text-amber-200 hover:bg-amber-900/50 disabled:opacity-45 cursor-pointer"
                      >
                        <Megaphone className="h-3.5 w-3.5" />
                        {Date.now() < hypeUntilMs ? 'Đang Kêu Gọi Hype' : 'Kêu Gọi Chốt Đơn'}
                      </button>
                      <button
                        type="button"
                        onClick={onFlashSale}
                        disabled={flashSaleUsed || soldSlotsCount === 6}
                        className="flex items-center gap-1.5 rounded-xl border border-rose-500/45 bg-rose-950/50 px-3 py-2 text-xs font-black text-rose-200 hover:bg-rose-900/50 disabled:opacity-45 cursor-pointer"
                      >
                        <Zap className="h-3.5 w-3.5" />
                        {flashSaleUsed ? 'Đã Flash Sale -15%' : 'Flash Sale Slot Ế (-15%)'}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                    {slots.map((slot, slotIdx) => {
                      const sold = slot.status === 'sold';
                      const packNums = getSlotAssignedPackNumbers(
                        slotIdx,
                        activeLiveBox.packsPerBox,
                        slots.length
                      )
                        .map((n) => `#${n}`)
                        .join(', ');
                      return (
                        <div
                          key={slot.slotId}
                          className={`rounded-xl border p-3 transition ${
                            sold
                              ? 'border-emerald-500/55 bg-emerald-950/30'
                              : 'border-zinc-800 bg-zinc-900/70'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-0.5">
                            <div className="flex items-center gap-2">
                              <span
                                className="h-2.5 w-2.5 rounded-full"
                                style={{ backgroundColor: slot.colorHex }}
                              />
                              <span className="text-xs font-black text-white">{slot.label}</span>
                            </div>
                            <span className="text-xs font-black font-mono text-amber-300 tabular-nums">
                              ${slot.price}
                            </span>
                          </div>
                          <div className="text-[10px] text-zinc-400 mb-1 truncate tabular-nums">
                            Pack {packNums} · {activeLiveBox.setName}
                          </div>
                          <div className="text-[11px] font-bold">
                            {sold ? (
                              <span className="text-emerald-300">Khách: {slot.buyerName}</span>
                            ) : (
                              <span className="text-zinc-500">Đang chờ khách chốt...</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-500/35 bg-emerald-950/20 p-4">
                    <div className="text-xs text-zinc-300">
                      {autoStartingRip
                        ? '🔥 Đã bán đủ 6/6 Slot! Nhân viên đang tự động xé seal khui cho khách...'
                        : soldSlotsCount === 0
                        ? 'Người xem thành phố đang kéo vào và chuẩn bị chốt đơn...'
                        : `Đã bán ${soldSlotsCount}/6 Slot ($${currentSoldRevenue}). Đủ 6/6 Slot nhân viên sẽ tự xé seal, hoặc bấm xé ngay!`}
                    </div>
                    <button
                      type="button"
                      onClick={onBeginRipping}
                      className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-2.5 text-xs font-black text-zinc-950 shadow-lg hover:brightness-110 cursor-pointer"
                    >
                      <Scissors className="h-4 w-4" />
                      Xé Seal &amp; Khui Box (Trừ 1 Box {activeShelfCount > 0 ? 'Trên Kệ' : 'Kho'})
                    </button>
                  </div>
                </div>
              )}

              {/* PHASE 3: LIVE PACK-BY-PACK RIPPING */}
              {phase === 'ripping' && activeLiveBox && (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-amber-500/40 bg-gradient-to-r from-[#1a1326] to-[#121621] p-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 text-xs font-bold tabular-nums">
                        <span className="rounded bg-rose-600 px-2 py-0.5 text-[10px] font-black text-white">
                          ĐANG KHUI LIVE
                        </span>
                        <span className="text-amber-300">
                          Pack {currentPackNum} / {activeLiveBox.packsPerBox}
                        </span>
                        <span className="text-zinc-600" aria-hidden="true">·</span>
                        <span className="text-sky-300">{displayViewers} người xem</span>
                      </div>
                      <h3 className="text-sm font-black text-white mt-1">
                        {activeLiveBox.setName} ·{' '}
                        <span className="text-emerald-300 text-xs font-bold">
                          {currentPackOrder?.buyerName
                            ? `Unbox cho ${currentPackOrder.buyerName} (${currentPackOrder.slotLabel})`
                            : currentPackOrder
                            ? `Shop tự khui (${currentPackOrder.slotLabel} trống)`
                            : 'Chuẩn bị khui'}
                        </span>
                      </h3>
                      <div className="text-[11px] text-zinc-400 mt-0.5 tabular-nums">
                        {activeLiveBox.consumedFromShelf
                          ? 'Đã trừ 1 Box từ kệ hàng'
                          : 'Đã trừ 1 Box từ kho'}{' '}
                        · Kệ còn: <strong className="text-sky-300">{activeShelfCount} Box</strong> · Tổng kho:{' '}
                        <strong className="text-zinc-200">{activeTotalCount} Box</strong>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={handleOpenTikTokStream}
                        className="flex items-center gap-1.5 rounded-xl bg-rose-600 px-3 py-2 text-xs font-black text-white hover:bg-rose-500 cursor-pointer"
                      >
                        <Tv className="h-3.5 w-3.5" />
                        Xem TikTok
                      </button>
                      <button
                        type="button"
                        onClick={onToggleAutoRip}
                        className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-black cursor-pointer ${
                          autoRipActive
                            ? 'border-amber-400 bg-amber-500/20 text-amber-200'
                            : 'border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-amber-400'
                        }`}
                      >
                        <Play className="h-3.5 w-3.5" />
                        {autoRipActive ? 'Đang Auto Khui...' : 'Auto Khui'}
                      </button>
                      <button
                        type="button"
                        onClick={onRipNextPack}
                        disabled={currentPackNum >= activeLiveBox.packsPerBox}
                        className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-amber-500 px-4 py-2 text-xs font-black text-white shadow-lg hover:brightness-110 disabled:opacity-45 cursor-pointer"
                      >
                        <Scissors className="h-4 w-4" />
                        {currentPackNum === 0
                          ? 'Khui Pack #1'
                          : currentPackNum < activeLiveBox.packsPerBox
                          ? `Khui Pack #${currentPackNum + 1}`
                          : 'Đang Tổng Kết...'}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-9 gap-1.5">
                    {packQueue.map((item) => (
                      <div
                        key={item.packNumber}
                        className={`rounded-lg p-1.5 text-center border tabular-nums ${
                          item.status === 'unboxed'
                            ? 'border-emerald-500/60 bg-emerald-500/15 text-emerald-300'
                            : item.status === 'ripping'
                            ? 'border-amber-400 bg-amber-500/20 text-amber-200 shadow'
                            : item.buyerName
                            ? 'border-sky-500/40 bg-sky-950/30 text-sky-200'
                            : 'border-zinc-800 bg-zinc-900 text-zinc-500'
                        }`}
                      >
                        <div className="text-[10px] font-black">P#{item.packNumber}</div>
                        <div
                          className={`text-[9px] font-bold truncate mt-0.5 ${
                            item.buyerName ? 'text-emerald-300' : 'text-zinc-500'
                          }`}
                        >
                          {item.buyerName || 'Shop'}
                        </div>
                      </div>
                    ))}
                  </div>

                  {currentPackOutcomes.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
                      {currentPackOutcomes.map((out, idx) => (
                        <div
                          key={`${out.card.id}_${idx}`}
                          className={`rounded-xl border p-2 flex flex-col justify-between gap-1.5 bg-zinc-950 ${getCardHoloClass(
                            out.card.marketPrice || 0
                          )} ${
                            out.isHit
                              ? 'border-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.28)]'
                              : 'border-zinc-800'
                          }`}
                        >
                          <img
                            src={out.card.imageUrl}
                            alt={out.card.name}
                            className="w-full h-32 object-contain rounded-lg bg-black/40"
                          />
                          <div>
                            <div className="text-[11px] font-black text-white truncate">
                              {out.card.name}
                            </div>
                            <div className="flex items-center justify-between text-[10px] mt-0.5 tabular-nums">
                              <span className="text-amber-300 font-bold">{out.card.raritySymbol}</span>
                              <span className="text-emerald-300 font-black">
                                ${Math.round(out.card.marketPrice || 0)}
                              </span>
                            </div>
                            <div
                              className={`mt-1 rounded px-1.5 py-0.5 text-[9px] font-black text-center ${
                                out.disposition === 'shipped'
                                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              }`}
                            >
                              {out.disposition === 'shipped'
                                ? `Giao: ${out.buyerName}`
                                : 'Shop giữ → Binder'}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-zinc-700 bg-zinc-950/60 p-8 text-center text-xs text-zinc-400">
                      Nhân viên đang chuẩn bị xé <span className="font-black text-amber-300">Pack #1</span> — bấm &quot;Xem TikTok&quot; để xem trực tiếp cảnh 2 tay xé pack!
                    </div>
                  )}
                </div>
              )}

              {/* PHASE 4: SUMMARY */}
              {phase === 'summary' && summaryPayload && (
                <div className="rounded-2xl border border-emerald-500/45 bg-gradient-to-b from-emerald-950/35 to-[#0f131c] p-5 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <Flame className="h-6 w-6 text-amber-400" />
                      <h3 className="text-base font-black text-emerald-300">
                        Tổng Kết Phiên Live: {summaryPayload.setName}
                      </h3>
                    </div>
                    <span className="text-xs font-black text-emerald-200 tabular-nums">
                      +{summaryPayload.viralFollowersGain} Followers · +{summaryPayload.xpGain} XP
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 tabular-nums">
                    <div className="rounded-xl border border-zinc-800 bg-black/40 p-3">
                      <div className="text-[11px] text-zinc-400 font-bold">Slot Đã Bán</div>
                      <div className="text-lg font-black text-white mt-0.5">
                        {summaryPayload.slotsSoldCount} / 6
                      </div>
                    </div>
                    <div className="rounded-xl border border-zinc-800 bg-black/40 p-3">
                      <div className="text-[11px] text-zinc-400 font-bold">Tiền Thu Slot</div>
                      <div className="text-lg font-black text-emerald-300 mt-0.5">
                        +${summaryPayload.slotRevenue.toLocaleString()}
                      </div>
                    </div>
                    <div className="rounded-xl border border-zinc-800 bg-black/40 p-3">
                      <div className="text-[11px] text-zinc-400 font-bold">Thẻ Giao Khách</div>
                      <div className="text-lg font-black text-sky-300 mt-0.5">
                        {summaryPayload.shippedCardsCount} thẻ
                      </div>
                    </div>
                    <div className="rounded-xl border border-zinc-800 bg-black/40 p-3">
                      <div className="text-[11px] text-zinc-400 font-bold">Vào Binder Shop</div>
                      <div className="text-lg font-black text-amber-300 mt-0.5">
                        {summaryPayload.shopKeptCards.length} thẻ (${summaryPayload.shopKeptValue})
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                    <span className="text-xs text-zinc-400">
                      {autoLiveEnabled && prereqs.canGoLive
                        ? `Nhân viên sẽ tự động lên sóng phiên tiếp vào lúc ${nextScheduledHour}:00.`
                        : 'Bạn có thể tự mở phiên tiếp bất kỳ lúc nào.'}
                    </span>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          soundManager.playSelectSound();
                          onResetToSetup();
                        }}
                        className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2 text-xs font-black text-white hover:border-rose-400 cursor-pointer"
                      >
                        Mở Phiên Live Mới Ngay
                      </button>
                      <button
                        type="button"
                        onClick={onClose}
                        className="rounded-xl bg-emerald-500 px-5 py-2 text-xs font-black text-zinc-950 hover:bg-emerald-400 cursor-pointer"
                      >
                        Quay Lại Shop
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT 4 COLS: LIVE CHAT FEED */}
            <div className="lg:col-span-4 flex flex-col bg-[#0c0e16] h-[300px] lg:h-auto overflow-hidden">
              <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
                <span className="text-xs font-black text-rose-300">
                  Live Chat Thành Phố
                </span>
                <span className="text-[11px] font-bold text-zinc-400 tabular-nums">
                  {isOnAir ? `${displayViewers} người đang xem` : 'Phòng chat chờ'}
                </span>
              </div>

              <div className="flex-1 overflow-y-auto p-3.5 space-y-2">
                {displayChatMessages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center text-xs text-zinc-500 px-4">
                    <Video className="h-8 w-8 text-zinc-700 mb-2" />
                    Khi đủ điều kiện (Phòng Live + Nhân viên trực ca + Box trong kho), nhân viên sẽ tự lên sóng mỗi giờ hoặc khi bạn bấm{' '}
                    <span className="font-bold text-rose-300">Xem Stream TikTok</span>.
                  </div>
                ) : (
                  displayChatMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`rounded-xl px-3 py-2 text-xs leading-snug ${
                        msg.kind === 'bid'
                          ? 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-200'
                          : msg.kind === 'hit'
                          ? 'bg-amber-950/60 border border-amber-400/50 text-amber-200'
                          : msg.kind === 'system'
                          ? 'bg-rose-950/40 border border-rose-500/35 text-rose-200'
                          : msg.kind === 'hype'
                          ? 'bg-purple-950/45 border border-purple-500/35 text-purple-200'
                          : 'bg-zinc-900/80 border border-zinc-800 text-zinc-200'
                      }`}
                    >
                      <span className="font-black mr-1.5 text-white">{msg.sender}:</span>
                      <span>{msg.text}</span>
                    </div>
                  ))
                )}
                <div ref={chatEndRef} />
              </div>

              <form
                onSubmit={handleSendHostCommentForm}
                className="border-t border-zinc-800 px-3 py-2.5 flex items-center gap-2"
              >
                <input
                  type="text"
                  value={hostCommentDraft}
                  onChange={(e) => setHostCommentDraft(e.target.value)}
                  placeholder="Gửi bình luận ghim..."
                  className="flex-1 rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-xs text-white placeholder:text-zinc-500 outline-none focus:border-rose-400"
                />
                <button
                  type="submit"
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-600 text-white hover:bg-rose-500 shrink-0 cursor-pointer"
                  title="Gửi"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
