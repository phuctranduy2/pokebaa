import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowUpRight,
  Check,
  CheckCircle2,
  Clock,
  Flame,
  Globe,
  LayoutList,
  Lock,
  MapPin,
  Navigation,
  Package,
  RefreshCw,
  Search,
  ShoppingCart,
  Star,
  TrendingUp,
  User,
  XCircle,
} from 'lucide-react';
import { ShopState } from '../game/pokemonShopLogic';
import {
  canAcceptDeliveryOrder,
  DeliveryOrder,
  DeliveryOrderCategory,
  DeliveryStop,
  getDailyTaskProgressList,
  hasDeliverableShopStock,
} from '../game/cardDeliverySystem';
import { soundManager } from '../game/audio';

const POKESHIP_LOGO_URL = '/assets/aistudio/image_4ef28ede.png';

interface PokeShipAppViewProps {
  shopState: ShopState;
  onBack: () => void;
  onAcceptOrder: (order: DeliveryOrder) => void;
  onCancelMission: () => void;
  onRefreshBoard: () => void;
  onFocusDeliveryOnMap?: (stop: DeliveryStop) => void;
  onClaimDailyTask?: (taskId: string) => void;
  onGoToSupply?: () => void;
}

type WebNavTab = 'dispatch' | 'active' | 'tasks' | 'earnings';
type SortMode = 'payout_desc' | 'distance_asc' | 'exp_desc';

const CATEGORY_LABELS: Record<DeliveryOrderCategory, string> = {
  pack_box: 'Pack & Box',
  vip_sniper: 'VIP Thẻ Hiếm',
  rush_mystery: 'Hỏa Tốc',
  multi_route: 'Đa Điểm',
};

const CATEGORY_TEXT_STYLE: Record<DeliveryOrderCategory, string> = {
  pack_box: 'text-sky-700 bg-sky-50 border-sky-200',
  vip_sniper: 'text-amber-700 bg-amber-50 border-amber-200',
  rush_mystery: 'text-orange-700 bg-orange-50 border-orange-200',
  multi_route: 'text-emerald-700 bg-emerald-50 border-emerald-200',
};

function formatCurrency(val: number): string {
  return `$${val.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export const PokeShipAppView: React.FC<PokeShipAppViewProps> = ({
  shopState,
  onBack,
  onAcceptOrder,
  onCancelMission,
  onRefreshBoard,
  onFocusDeliveryOnMap,
  onClaimDailyTask,
  onGoToSupply,
}) => {
  const [navTab, setNavTab] = useState<WebNavTab>('dispatch');
  const [filter, setFilter] = useState<'all' | DeliveryOrderCategory>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortMode, setSortMode] = useState<SortMode>('payout_desc');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState<boolean>(false);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const lastAutoSyncSigRef = useRef<string>('');

  const dState = shopState.deliveryState;
  const activeMission = dState?.activeMission || null;
  const orders = dState?.availableOrders || [];
  const hasStock = hasDeliverableShopStock(shopState);
  const dailyTasks = useMemo(() => getDailyTaskProgressList(shopState), [shopState]);
  const claimableTasksCount = dailyTasks.filter((t) => t.completed && !t.claimed).length;

  useEffect(() => {
    const hasLegacyDispatch = orders.some((o) =>
      o.stops.some((s) => s.cargo.source === 'station_dispatch')
    );
    const hasAnyAcceptable = orders.some((o) => canAcceptDeliveryOrder(shopState, o).ok);
    const sig = `${shopState.inventory.map((i) => `${i.productId}:${i.quantity}`).join(',')}|${Object.keys(shopState.binderCards || {}).length}|${(shopState.gradedSlabs || []).length}|${hasLegacyDispatch ? 'legacy' : 'clean'}`;

    if (
      !activeMission &&
      (hasLegacyDispatch || (hasStock && orders.length > 0 && !hasAnyAcceptable)) &&
      lastAutoSyncSigRef.current !== sig
    ) {
      lastAutoSyncSigRef.current = sig;
      onRefreshBoard();
    }
  }, [activeMission, hasStock, orders, shopState, onRefreshBoard]);

  useEffect(() => {
    if (!activeMission?.deadlineAtMs) return;
    const t = window.setInterval(() => setNowMs(Date.now()), 500);
    return () => window.clearInterval(t);
  }, [activeMission?.deadlineAtMs]);

  useEffect(() => {
    setConfirmCancel(false);
  }, [activeMission?.id]);

  const filteredOrders = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = orders.filter((o) => {
      if (filter !== 'all' && o.category !== filter) return false;
      if (!q) return true;
      const inOrder =
        o.code.toLowerCase().includes(q) ||
        o.title.toLowerCase().includes(q) ||
        o.subtitle.toLowerCase().includes(q);
      const inStops = o.stops.some(
        (s) =>
          s.locationName.toLowerCase().includes(q) ||
          s.districtName.toLowerCase().includes(q) ||
          s.recipientName.toLowerCase().includes(q) ||
          s.cargo.label.toLowerCase().includes(q)
      );
      return inOrder || inStops;
    });

    return [...list].sort((a, b) => {
      const payA = a.itemPayout + a.baseFee + a.tipBonus + a.rushBonusFee;
      const payB = b.itemPayout + b.baseFee + b.tipBonus + b.rushBonusFee;
      if (sortMode === 'distance_asc') return a.totalDistanceMeters - b.totalDistanceMeters;
      if (sortMode === 'exp_desc') return b.expReward - a.expReward;
      return payB - payA;
    });
  }, [orders, filter, searchQuery, sortMode]);

  useEffect(() => {
    if (filteredOrders.length === 0) {
      setSelectedOrderId(null);
      return;
    }
    if (!selectedOrderId || !filteredOrders.some((o) => o.id === selectedOrderId)) {
      setSelectedOrderId(filteredOrders[0].id);
    }
  }, [filteredOrders, selectedOrderId]);

  const selectedOrder =
    filteredOrders.find((o) => o.id === selectedOrderId) || filteredOrders[0] || null;

  const currentStop: DeliveryStop | null = activeMission
    ? activeMission.stops[activeMission.currentStopIndex] || null
    : null;

  const remainingRushSec =
    activeMission?.deadlineAtMs != null
      ? Math.ceil((activeMission.deadlineAtMs - nowMs) / 1000)
      : null;

  const currentUrlPath =
    navTab === 'dispatch'
      ? 'pokeship.vn/dispatch'
      : navTab === 'active'
        ? 'pokeship.vn/active-route'
        : navTab === 'tasks'
          ? 'pokeship.vn/daily-tasks'
          : 'pokeship.vn/driver-earnings';

  return (
    <div className="flex-1 flex flex-col bg-[#F8FAFC] text-slate-900 rounded-b-2xl overflow-hidden font-sans antialiased">
      {/* Browser Window Chrome (Authentic Web App Shell) */}
      <div className="flex items-center justify-between gap-3 bg-slate-100 border-b border-slate-200 px-3 sm:px-4 py-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="hidden sm:flex items-center gap-1.5 mr-1 shrink-0" aria-hidden="true">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
          </div>

          <button
            type="button"
            onClick={() => {
              soundManager.playSelectSound();
              onBack();
            }}
            title="Quay lại màn hình chính Tablet"
            className="flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer shrink-0 whitespace-nowrap"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Trang chủ</span>
          </button>

          {/* Address Bar */}
          <div className="flex items-center gap-2 flex-1 max-w-md rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-600 shadow-2xs min-w-0">
            <Lock className="h-3 w-3 text-emerald-600 shrink-0" />
            <span className="truncate font-mono text-[11px] text-slate-700">
              https://{currentUrlPath}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              soundManager.playSelectSound();
              onRefreshBoard();
            }}
            className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <RefreshCw className="h-3.5 w-3.5 text-slate-500" />
            <span>Tải lại đơn</span>
          </button>
        </div>
      </div>

      {/* Web App Workspace Body: Left Sidebar + Main Content */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Left Navigation Sidebar */}
        <aside className="hidden md:flex w-52 shrink-0 flex-col justify-between bg-white border-r border-slate-200 p-3">
          <div className="space-y-4">
            {/* Brand Wordmark */}
            <div className="flex items-center gap-2.5 px-2 pt-1">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white ring-1 ring-emerald-200 shadow-xs p-0.5 shrink-0">
                <img
                  src={POKESHIP_LOGO_URL}
                  alt="PokéShip"
                  className="h-full w-full rounded-full object-contain"
                />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-bold tracking-tight text-slate-900 whitespace-nowrap">
                  PokéShip Web
                </div>
                <div className="text-[11px] text-slate-500 truncate">
                  Cổng điều phối giao vận
                </div>
              </div>
            </div>

            {/* Sidebar Navigation Links */}
            <nav className="space-y-1">
              <button
                type="button"
                onClick={() => {
                  soundManager.playSelectSound();
                  setNavTab('dispatch');
                }}
                className={`w-full flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  navTab === 'dispatch'
                    ? 'bg-emerald-50 text-emerald-800 font-semibold'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <span className="flex items-center gap-2">
                  <LayoutList className="h-4 w-4 shrink-0" />
                  <span>Bảng điều phối</span>
                </span>
                <span className="font-mono text-[11px] tabular-nums text-slate-500">
                  {orders.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  soundManager.playSelectSound();
                  setNavTab('active');
                }}
                className={`w-full flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  navTab === 'active'
                    ? 'bg-emerald-50 text-emerald-800 font-semibold'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Navigation className="h-4 w-4 shrink-0" />
                  <span>Chuyến đang chạy</span>
                </span>
                <span className="font-mono text-[11px] tabular-nums text-emerald-700 font-semibold">
                  {activeMission ? '1' : '0'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  soundManager.playSelectSound();
                  setNavTab('tasks');
                }}
                className={`w-full flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  navTab === 'tasks'
                    ? 'bg-emerald-50 text-emerald-800 font-semibold'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>Nhiệm vụ ngày</span>
                </span>
                {claimableTasksCount > 0 && (
                  <span className="font-mono text-[11px] tabular-nums font-semibold text-amber-700">
                    +{claimableTasksCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  soundManager.playSelectSound();
                  setNavTab('earnings');
                }}
                className={`w-full flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  navTab === 'earnings'
                    ? 'bg-emerald-50 text-emerald-800 font-semibold'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <span className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 shrink-0" />
                  <span>Thu nhập & KPI</span>
                </span>
              </button>
            </nav>
          </div>

          {/* Driver Account Footer Card */}
          <div className="border-t border-slate-200 pt-3 space-y-1.5 text-xs">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-900 text-white text-xs font-semibold shrink-0">
                <User className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-slate-900 truncate">
                  {shopState.shopName || 'PokeCard Shop'}
                </div>
                <div className="text-[11px] text-slate-500 truncate">
                  Poké-Sport 155 · {(dState?.rating ?? 4.9).toFixed(2)} ★
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Web Workspace */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Mobile Sub-nav bar (only visible below md) */}
          <div className="flex md:hidden items-center gap-1 border-b border-slate-200 bg-white px-3 py-1.5 overflow-x-auto">
            {(
              [
                { id: 'dispatch', label: `Điều phối (${orders.length})` },
                { id: 'active', label: `Đang giao (${activeMission ? 1 : 0})` },
                { id: 'tasks', label: 'Nhiệm vụ ngày' },
                { id: 'earnings', label: 'Thu nhập' },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  soundManager.playSelectSound();
                  setNavTab(t.id);
                }}
                className={`rounded-md px-2.5 py-1 text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer ${
                  navTab === t.id
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Web Page Header */}
          <header className="flex flex-wrap items-center justify-between gap-4 bg-white border-b border-slate-200 px-4 sm:px-5 py-3 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <img
                src={POKESHIP_LOGO_URL}
                alt="PokéShip"
                className="md:hidden h-8 w-8 rounded-full object-contain bg-white ring-1 ring-emerald-200 p-0.5 shrink-0"
              />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Globe className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span>PokéShip Portal</span>
                  <span aria-hidden="true">/</span>
                  <span className="text-slate-700 font-medium">
                    {navTab === 'dispatch'
                      ? 'Bảng điều phối đơn hàng'
                      : navTab === 'active'
                        ? 'Lộ trình đang giao'
                        : navTab === 'tasks'
                          ? 'Nhiệm vụ trong ngày'
                          : 'Tổng quan hiệu suất'}
                  </span>
                </div>
                <h1 className="text-base font-bold tracking-tight text-slate-900 mt-0.5 truncate">
                  {navTab === 'dispatch'
                    ? 'Danh sách đơn hàng quanh thành phố'
                    : navTab === 'active'
                      ? 'Theo dõi chuyến giao hiện tại'
                      : navTab === 'tasks'
                        ? `Mục tiêu Ngày ${shopState.currentDay}`
                        : 'Thống kê doanh thu & đánh giá'}
                </h1>
              </div>
            </div>

            {navTab === 'dispatch' && (
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-56">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Tìm mã đơn, địa điểm, khách..."
                    className="w-full rounded-md border border-slate-200 bg-slate-50 pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:bg-white focus:outline-none"
                  />
                </div>
                <select
                  value={sortMode}
                  onChange={(e) => setSortMode(e.target.value as SortMode)}
                  className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:border-emerald-600 focus:outline-none cursor-pointer"
                >
                  <option value="payout_desc">Thu nhập cao nhất</option>
                  <option value="distance_asc">Gần cửa hàng nhất</option>
                  <option value="exp_desc">Nhiều EXP nhất</option>
                </select>
              </div>
            )}
          </header>

          {/* Scrollable Workspace Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            {/* Compact KPI Strip (Single Surface, Clean Hairline Dividers) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 bg-white border border-slate-200 rounded-lg divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
              <div className="px-4 py-2.5">
                <div className="text-[11px] font-medium text-slate-500">Đơn hoàn thành</div>
                <div className="mt-0.5 text-lg font-bold text-slate-900 tabular-nums font-mono">
                  {dState?.completedCount || 0}
                </div>
              </div>
              <div className="px-4 py-2.5">
                <div className="text-[11px] font-medium text-slate-500">Đánh giá trung bình</div>
                <div className="mt-0.5 flex items-center gap-1 text-lg font-bold text-slate-900 tabular-nums font-mono">
                  <span>{(dState?.rating ?? 4.9).toFixed(2)}</span>
                  <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                </div>
              </div>
              <div className="px-4 py-2.5">
                <div className="text-[11px] font-medium text-slate-500">Chuỗi đúng giờ</div>
                <div className="mt-0.5 flex items-center gap-1 text-lg font-bold text-slate-900 tabular-nums font-mono">
                  <Flame className="h-4 w-4 text-orange-500" />
                  <span>{dState?.streak || 0}x</span>
                </div>
              </div>
              <div className="px-4 py-2.5">
                <div className="text-[11px] font-medium text-slate-500">Tổng thu PokeShip</div>
                <div className="mt-0.5 text-lg font-bold text-emerald-700 tabular-nums font-mono">
                  {formatCurrency(dState?.totalEarnings || 0)}
                </div>
              </div>
            </div>

            {/* Empty Warehouse Banner (requires real stock before shipping) */}
            {!hasStock && navTab === 'dispatch' && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3">
                <div className="flex items-start gap-2.5 min-w-0">
                  <AlertCircle className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-amber-950">
                      Kho hàng tiệm đang trống — chưa có hàng để nhận giao
                    </div>
                    <div className="text-[11px] text-amber-800 mt-0.5">
                      Đơn giao hàng lấy trực tiếp từ kho Pack/Box, Sổ Thẻ Hiếm hoặc Slab của tiệm. Hãy nhập hàng ở mục Supply (và bưng thùng vào tiệm) trước khi nhận đơn!
                    </div>
                  </div>
                </div>
                {onGoToSupply && (
                  <button
                    type="button"
                    onClick={() => {
                      soundManager.playSelectSound();
                      onGoToSupply();
                    }}
                    className="flex items-center gap-1.5 rounded-md bg-amber-600 hover:bg-amber-700 px-3 py-1.5 text-xs font-semibold text-white transition-colors cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <ShoppingCart className="h-3.5 w-3.5" />
                    <span>Nhập hàng ngay (Supply)</span>
                  </button>
                )}
              </div>
            )}

            {/* Live Active Mission Compact Bar (when on Dispatch tab) */}
            {activeMission && currentStop && navTab === 'dispatch' && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-emerald-300 bg-emerald-50/70 px-4 py-2.5">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white ring-1 ring-emerald-300 p-0.5 shrink-0">
                    <img
                      src={POKESHIP_LOGO_URL}
                      alt="PokéShip"
                      className="h-full w-full rounded-full object-contain"
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-900 truncate">
                      <span>Chuyến đang giao · {activeMission.code}</span>
                      <span aria-hidden="true">·</span>
                      <span className="text-emerald-800 truncate">
                        {currentStop.recipientName} ({currentStop.locationName})
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-600 truncate">
                      {currentStop.cargo.label} · Điểm {activeMission.currentStopIndex + 1}/
                      {activeMission.stops.length}
                      {remainingRushSec !== null && (
                        <>
                          {' · '}
                          <span
                            className={`font-mono font-semibold ${
                              remainingRushSec > 0 ? 'text-orange-700' : 'text-rose-700'
                            }`}
                          >
                            {remainingRushSec > 0 ? `Còn ${remainingRushSec}s` : 'Hết giờ thưởng'}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {onFocusDeliveryOnMap && (
                    <button
                      type="button"
                      onClick={() => {
                        soundManager.playSelectSound();
                        onFocusDeliveryOnMap(currentStop);
                      }}
                      className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-50 transition-colors cursor-pointer whitespace-nowrap"
                    >
                      Mở bản đồ GPS
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      soundManager.playSelectSound();
                      setNavTab('active');
                    }}
                    className="rounded-md bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white transition-colors cursor-pointer whitespace-nowrap"
                  >
                    Chi tiết chuyến
                  </button>
                </div>
              </div>
            )}

            {/* TAB 1: DISPATCH BOARD (MASTER-DETAIL WEB LAYOUT) */}
            {navTab === 'dispatch' && (
              <div className="space-y-3">
                {/* Category Filter Segmented Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="inline-flex flex-wrap items-center gap-1 rounded-lg bg-slate-200/70 p-1">
                    {(
                      [
                        { id: 'all', label: `Tất cả (${orders.length})` },
                        { id: 'pack_box', label: 'Pack & Box' },
                        { id: 'vip_sniper', label: 'VIP Thẻ Hiếm' },
                        { id: 'rush_mystery', label: 'Hỏa tốc' },
                        { id: 'multi_route', label: 'Đa điểm' },
                      ] as const
                    ).map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => {
                          soundManager.playSelectSound();
                          setFilter(tab.id);
                        }}
                        className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                          filter === tab.id
                            ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  <div className="text-xs text-slate-500">
                    Điểm xuất phát: <span className="font-medium text-slate-800">Pokémon Card Shop</span>
                  </div>
                </div>

                {/* Master-Detail Split Grid */}
                {filteredOrders.length === 0 ? (
                  <div className="rounded-lg border border-slate-200 bg-white py-12 px-4 text-center space-y-2.5">
                    <Package className="h-8 w-8 text-slate-400 mx-auto" />
                    <div className="text-sm font-semibold text-slate-900">
                      Không tìm thấy đơn giao hàng phù hợp
                    </div>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      Thử xóa bộ lọc tìm kiếm hoặc tải lại danh sách đơn hàng mới từ hệ thống điều phối.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setFilter('all');
                        setSearchQuery('');
                        onRefreshBoard();
                      }}
                      className="rounded-md bg-emerald-600 hover:bg-emerald-700 px-4 py-2 text-xs font-semibold text-white transition-colors cursor-pointer"
                    >
                      Tạo danh sách đơn mới
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                    {/* Left: Order List Table */}
                    <div className="lg:col-span-7 bg-white border border-slate-200 rounded-lg overflow-hidden">
                      <div className="grid grid-cols-12 gap-2 border-b border-slate-200 bg-slate-50 px-3.5 py-2 text-[11px] font-semibold text-slate-500">
                        <div className="col-span-7">Đơn hàng & Tuyến giao</div>
                        <div className="col-span-2 text-right">Quãng đường</div>
                        <div className="col-span-3 text-right">Ước tính thu</div>
                      </div>

                      <div className="divide-y divide-slate-200">
                        {filteredOrders.map((order) => {
                          const totalPayout =
                            order.itemPayout +
                            order.baseFee +
                            order.tipBonus +
                            order.rushBonusFee;
                          const isSelected = selectedOrder?.id === order.id;
                          const firstStop = order.stops[0];
                          const check = canAcceptDeliveryOrder(shopState, order);

                          return (
                            <button
                              key={order.id}
                              type="button"
                              onClick={() => {
                                soundManager.playSelectSound();
                                setSelectedOrderId(order.id);
                              }}
                              className={`w-full text-left grid grid-cols-12 gap-2 items-center px-3.5 py-3 transition-colors cursor-pointer ${
                                isSelected ? 'bg-emerald-50/70' : 'hover:bg-slate-50'
                              }`}
                            >
                              <div className="col-span-7 min-w-0 space-y-1">
                                <div className="flex items-center gap-2 text-xs">
                                  <span
                                    className={`inline-block rounded border px-1.5 py-0.5 text-[10px] font-semibold whitespace-nowrap ${CATEGORY_TEXT_STYLE[order.category]}`}
                                  >
                                    {CATEGORY_LABELS[order.category]}
                                  </span>
                                  <span className="font-mono text-[11px] font-semibold text-slate-500">
                                    #{order.code}
                                  </span>
                                  {order.timeLimitSec && (
                                    <span className="font-mono text-[11px] font-semibold text-orange-600">
                                      {order.timeLimitSec}s
                                    </span>
                                  )}
                                </div>

                                <div className="text-xs font-semibold text-slate-900 truncate">
                                  {order.title}
                                </div>

                                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 truncate">
                                  <span className="truncate">
                                    {firstStop?.recipientName}
                                  </span>
                                  <span aria-hidden="true">·</span>
                                  <span className="truncate">
                                    {order.stops.length > 1
                                      ? `${order.stops.length} điểm dừng`
                                      : firstStop?.districtName}
                                  </span>
                                  {!check.ok ? (
                                    <>
                                      <span aria-hidden="true">·</span>
                                      <span className="text-rose-600 font-medium">Chưa có hàng trong kho</span>
                                    </>
                                  ) : (
                                    <>
                                      <span aria-hidden="true">·</span>
                                      <span className="text-emerald-700 font-medium">Có sẵn trong kho</span>
                                    </>
                                  )}
                                </div>
                              </div>

                              <div className="col-span-2 text-right font-mono text-xs text-slate-700 tabular-nums">
                                {order.totalDistanceMeters} m
                              </div>

                              <div className="col-span-3 text-right">
                                <div className="font-mono text-sm font-bold text-emerald-700 tabular-nums">
                                  +{formatCurrency(totalPayout)}
                                </div>
                                <div className="font-mono text-[11px] text-slate-500 tabular-nums">
                                  +{order.expReward} XP
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Right: Order Inspector / Detail Panel */}
                    {selectedOrder && (() => {
                      const check = canAcceptDeliveryOrder(shopState, selectedOrder);
                      const totalPayout =
                        selectedOrder.itemPayout +
                        selectedOrder.baseFee +
                        selectedOrder.tipBonus +
                        selectedOrder.rushBonusFee;

                      return (
                        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-lg p-4 space-y-4">
                          <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-3">
                            <div className="min-w-0 space-y-1">
                              <div className="flex items-center gap-2 text-xs text-slate-500">
                                <span className="font-mono font-semibold text-slate-700">
                                  #{selectedOrder.code}
                                </span>
                                <span aria-hidden="true">·</span>
                                <span>{CATEGORY_LABELS[selectedOrder.category]}</span>
                                <span aria-hidden="true">·</span>
                                <span className="font-mono tabular-nums">
                                  {selectedOrder.totalDistanceMeters} m
                                </span>
                              </div>
                              <h2 className="text-sm font-bold text-slate-900 leading-snug">
                                {selectedOrder.title}
                              </h2>
                              <p className="text-xs text-slate-500">{selectedOrder.subtitle}</p>
                            </div>
                          </div>

                          {/* Stops & Cargo List */}
                          <div className="space-y-2">
                            <div className="text-xs font-semibold text-slate-700">
                              Chi tiết kiện hàng & điểm giao ({selectedOrder.stops.length})
                            </div>

                            <div className="divide-y divide-slate-200 border border-slate-200 rounded-md overflow-hidden">
                              {selectedOrder.stops.map((st, idx) => {
                                const sourceText =
                                  st.cargo.source === 'shop_inventory'
                                    ? 'Xuất từ kho tiệm'
                                    : st.cargo.source === 'binder_card'
                                      ? 'Xuất từ sổ thẻ'
                                      : st.cargo.source === 'graded_slab'
                                        ? 'Xuất Slab PSA/CGC'
                                        : 'Kiện ký gửi trạm';
                                return (
                                  <div
                                    key={st.stopId}
                                    className="flex items-center gap-3 bg-slate-50/50 p-2.5"
                                  >
                                    {st.cargo.imageUrl ? (
                                      <img
                                        src={st.cargo.imageUrl}
                                        alt={st.cargo.label}
                                        referrerPolicy="no-referrer"
                                        className="h-11 w-9 rounded border border-slate-200 bg-white object-contain p-0.5 shrink-0"
                                      />
                                    ) : (
                                      <div className="flex h-11 w-9 items-center justify-center rounded border border-slate-200 bg-white shrink-0">
                                        <Package className="h-4 w-4 text-slate-400" />
                                      </div>
                                    )}
                                    <div className="min-w-0 flex-1">
                                      <div className="text-xs font-semibold text-slate-900 truncate">
                                        {selectedOrder.stops.length > 1 ? `Điểm ${idx + 1}: ` : ''}
                                        {st.cargo.label}
                                      </div>
                                      <div className="text-[11px] text-slate-600 truncate">
                                        {st.recipientName} · {st.locationName}
                                      </div>
                                      <div className="text-[11px] text-slate-500 truncate">
                                        {sourceText}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Payout Math Breakdown */}
                          <div className="border-t border-slate-200 pt-3 space-y-1.5 text-xs">
                            <div className="flex items-center justify-between text-slate-600">
                              <span>Phí giao hàng cơ bản</span>
                              <span className="font-mono tabular-nums text-slate-900">
                                {formatCurrency(selectedOrder.baseFee)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-slate-600">
                              <span>Tiền tip khách hàng</span>
                              <span className="font-mono tabular-nums text-slate-900">
                                {formatCurrency(selectedOrder.tipBonus)}
                              </span>
                            </div>
                            {selectedOrder.itemPayout > 0 && (
                              <div className="flex items-center justify-between text-slate-600">
                                <span>Thanh toán tiền hàng</span>
                                <span className="font-mono tabular-nums text-slate-900">
                                  {formatCurrency(selectedOrder.itemPayout)}
                                </span>
                              </div>
                            )}
                            {selectedOrder.rushBonusFee > 0 && (
                              <div className="flex items-center justify-between text-slate-600">
                                <span>
                                  {selectedOrder.category === 'rush_mystery'
                                    ? `Thưởng hỏa tốc (${selectedOrder.timeLimitSec}s)`
                                    : 'Thưởng hoàn thành đa điểm'}
                                </span>
                                <span className="font-mono tabular-nums text-orange-600 font-semibold">
                                  +{formatCurrency(selectedOrder.rushBonusFee)}
                                </span>
                              </div>
                            )}
                            <div className="flex items-center justify-between border-t border-slate-200 pt-2 font-bold text-slate-900">
                              <span>Tổng dự kiến nhận</span>
                              <span className="font-mono text-base text-emerald-700 tabular-nums">
                                +{formatCurrency(totalPayout)} · +{selectedOrder.expReward} XP
                              </span>
                            </div>
                          </div>

                          {/* Primary Action */}
                          {check.ok ? (
                            <button
                              type="button"
                              onClick={() => {
                                soundManager.playSelectSound();
                                onAcceptOrder(selectedOrder);
                                setNavTab('active');
                              }}
                              className="w-full flex items-center justify-center gap-2 rounded-md bg-emerald-600 hover:bg-emerald-700 px-4 py-2.5 text-xs font-semibold text-white transition-colors cursor-pointer"
                            >
                              <span>Nhận đơn & Bắt đầu giao</span>
                              <ArrowUpRight className="h-4 w-4" />
                            </button>
                          ) : (
                            <div className="space-y-2">
                              <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                                {check.reason}
                              </div>
                              {onGoToSupply && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    soundManager.playSelectSound();
                                    onGoToSupply();
                                  }}
                                  className="w-full flex items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800 transition-colors cursor-pointer"
                                >
                                  <ShoppingCart className="h-3.5 w-3.5" />
                                  <span>Mở Supply nhập hàng về tiệm</span>
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: ACTIVE MISSION LIVE TRACKING */}
            {navTab === 'active' && (
              <div>
                {!activeMission || !currentStop ? (
                  <div className="rounded-lg border border-slate-200 bg-white py-12 px-4 text-center space-y-2.5">
                    <img
                      src={POKESHIP_LOGO_URL}
                      alt="PokéShip"
                      className="h-12 w-12 rounded-full object-contain mx-auto ring-1 ring-slate-200 p-0.5 bg-white"
                    />
                    <div className="text-sm font-semibold text-slate-900">
                      Hiện chưa có chuyến giao hàng nào đang chạy
                    </div>
                    <p className="text-xs text-slate-500">
                      Hãy chọn một đơn trên Bảng điều phối để nhận hàng và tự động ghim GPS lên bản đồ.
                    </p>
                    <button
                      type="button"
                      onClick={() => setNavTab('dispatch')}
                      className="rounded-md bg-emerald-600 hover:bg-emerald-700 px-4 py-2 text-xs font-semibold text-white transition-colors cursor-pointer"
                    >
                      Mở Bảng điều phối
                    </button>
                  </div>
                ) : (
                  <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-5">
                    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 pb-4">
                      <div>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <span className="font-mono font-semibold text-emerald-700">
                            #{activeMission.code}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>{CATEGORY_LABELS[activeMission.category]}</span>
                          <span aria-hidden="true">·</span>
                          <span>
                            Điểm {activeMission.currentStopIndex + 1}/{activeMission.stops.length}
                          </span>
                        </div>
                        <h2 className="text-base font-bold text-slate-900 mt-1">
                          {activeMission.title}
                        </h2>
                      </div>

                      {remainingRushSec !== null && (
                        <div
                          className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-mono font-semibold tabular-nums ${
                            remainingRushSec > 0
                              ? 'border-orange-200 bg-orange-50 text-orange-700'
                              : 'border-rose-200 bg-rose-50 text-rose-700'
                          }`}
                        >
                          <Clock className="h-3.5 w-3.5" />
                          <span>
                            {remainingRushSec > 0
                              ? `Còn ${remainingRushSec}s (+$${activeMission.rushBonusFee.toFixed(0)})`
                              : 'Quá hạn thưởng tốc độ'}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Route Timeline */}
                    <div className="space-y-2">
                      <div className="text-xs font-semibold text-slate-700">Tiến trình lộ trình</div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {activeMission.stops.map((st, idx) => {
                          const isDone = Boolean(st.completed);
                          const isCurrent = idx === activeMission.currentStopIndex;
                          return (
                            <div
                              key={st.stopId}
                              className={`rounded-md border px-3 py-2 text-xs ${
                                isDone
                                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                                  : isCurrent
                                    ? 'border-slate-900 bg-slate-900 text-white'
                                    : 'border-slate-200 bg-slate-50 text-slate-500'
                              }`}
                            >
                              <div className="flex items-center justify-between font-semibold">
                                <span>Điểm {idx + 1}</span>
                                {isDone ? (
                                  <Check className="h-3.5 w-3.5" />
                                ) : isCurrent ? (
                                  <span>Đang tới</span>
                                ) : (
                                  <span>Chờ</span>
                                )}
                              </div>
                              <div className="truncate mt-0.5">{st.locationName}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Current Stop Recipient & Cargo */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-slate-200 pt-4">
                      <div className="flex items-center gap-3 min-w-0">
                        {currentStop.cargo.imageUrl ? (
                          <img
                            src={currentStop.cargo.imageUrl}
                            alt={currentStop.cargo.label}
                            referrerPolicy="no-referrer"
                            className="h-14 w-12 rounded-md border border-slate-200 bg-slate-50 object-contain p-1 shrink-0"
                          />
                        ) : (
                          <div className="flex h-14 w-12 items-center justify-center rounded-md border border-slate-200 bg-slate-50 shrink-0">
                            <Package className="h-5 w-5 text-slate-400" />
                          </div>
                        )}
                        <div className="min-w-0 space-y-0.5">
                          <div className="text-sm font-bold text-slate-900 truncate">
                            {currentStop.recipientName} · {currentStop.locationName}
                          </div>
                          <div className="text-xs text-slate-700 font-medium truncate">
                            {currentStop.cargo.label}
                          </div>
                          <div className="text-xs text-slate-500 italic truncate">
                            "{currentStop.note}"
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        {onFocusDeliveryOnMap && (
                          <button
                            type="button"
                            onClick={() => {
                              soundManager.playSelectSound();
                              onFocusDeliveryOnMap(currentStop);
                            }}
                            className="flex items-center gap-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 px-3.5 py-2 text-xs font-semibold text-white transition-colors cursor-pointer whitespace-nowrap"
                          >
                            <Navigation className="h-3.5 w-3.5" />
                            <span>Mở bản đồ GPS [Z]</span>
                          </button>
                        )}

                        {!confirmCancel ? (
                          <button
                            type="button"
                            onClick={() => {
                              soundManager.playSelectSound();
                              setConfirmCancel(true);
                            }}
                            className="flex items-center gap-1.5 rounded-md border border-rose-200 bg-white hover:bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700 transition-colors cursor-pointer whitespace-nowrap"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                            <span>Hủy chuyến</span>
                          </button>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                soundManager.playWrongBuzzer();
                                onCancelMission();
                                setConfirmCancel(false);
                              }}
                              className="rounded-md bg-rose-600 hover:bg-rose-700 px-3 py-2 text-xs font-semibold text-white cursor-pointer whitespace-nowrap"
                            >
                              Xác nhận hủy & hoàn kho
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmCancel(false)}
                              className="rounded-md border border-slate-200 bg-white px-2.5 py-2 text-xs font-medium text-slate-700 cursor-pointer"
                            >
                              Giữ lại
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-600">
                      <MapPin className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span>
                        Lên xe máy <strong>Poké-Sport 155 [F]</strong> trước tiệm, chạy theo đường màu trên radar tới vạch sáng và nhấn{' '}
                        <kbd className="rounded border border-slate-300 bg-white px-1.5 py-0.5 font-mono text-[11px] font-semibold text-slate-900">
                          E
                        </kbd>{' '}
                        để bàn giao trực tiếp cho khách.
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: DAILY TASKS */}
            {navTab === 'tasks' && (
              <div className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-200 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 bg-slate-50">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">
                      Danh sách nhiệm vụ Ngày {shopState.currentDay}
                    </div>
                    <div className="text-xs text-slate-500">
                      Hoàn thành mục tiêu giao hàng & bán hàng để nhận thưởng trực tiếp về quỹ tiệm.
                    </div>
                  </div>
                  <div className="font-mono text-xs font-semibold text-slate-700 tabular-nums">
                    {dailyTasks.filter((t) => t.completed).length}/{dailyTasks.length} hoàn thành
                  </div>
                </div>

                {dailyTasks.map((task) => {
                  const pct = Math.min(
                    100,
                    Math.round((task.current / Math.max(1, task.target)) * 100)
                  );
                  return (
                    <div
                      key={task.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3.5"
                    >
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-slate-900">
                            {task.title}
                          </span>
                          <span className="font-mono text-xs font-semibold text-emerald-700 tabular-nums">
                            +${task.rewardCash} · +{task.rewardExp} XP
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">{task.description}</p>
                        <div className="flex items-center gap-3 max-w-md">
                          <div className="flex-1 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                            <div
                              className={`h-full transition-all duration-300 ${
                                task.completed ? 'bg-emerald-600' : 'bg-slate-900'
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="font-mono text-xs text-slate-600 tabular-nums shrink-0">
                            {task.current}/{task.target}
                          </span>
                        </div>
                      </div>

                      <div className="shrink-0">
                        {task.claimed ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                            <CheckCircle2 className="h-4 w-4" />
                            <span>Đã nhận thưởng</span>
                          </span>
                        ) : task.completed ? (
                          <button
                            type="button"
                            onClick={() => {
                              soundManager.playCashRegister();
                              onClaimDailyTask?.(task.id);
                            }}
                            className="rounded-md bg-emerald-600 hover:bg-emerald-700 px-3.5 py-1.5 text-xs font-semibold text-white transition-colors cursor-pointer whitespace-nowrap"
                          >
                            Nhận thưởng
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400 font-medium">
                            Đang thực hiện
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* TAB 4: EARNINGS & DAILY TELEMETRY */}
            {navTab === 'earnings' && (
              <div className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-200 overflow-hidden">
                <div className="px-4 py-3 bg-slate-50">
                  <div className="text-sm font-semibold text-slate-900">
                    Báo cáo giao vận Ngày {shopState.currentDay}
                  </div>
                  <div className="text-xs text-slate-500">
                    Số liệu đồng bộ trực tiếp với sổ quỹ và lịch sử cửa hàng.
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
                  <div className="p-4">
                    <div className="text-xs text-slate-500">Đơn giao hôm nay</div>
                    <div className="mt-1 font-mono text-lg font-bold text-slate-900 tabular-nums">
                      {dState?.dailyStats?.deliveriesCompleted || 0}
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="text-xs text-slate-500">Hỏa tốc đúng giờ</div>
                    <div className="mt-1 font-mono text-lg font-bold text-slate-900 tabular-nums">
                      {dState?.dailyStats?.rushCompleted || 0}
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="text-xs text-slate-500">Đơn VIP / Slab</div>
                    <div className="mt-1 font-mono text-lg font-bold text-slate-900 tabular-nums">
                      {dState?.dailyStats?.vipCompleted || 0}
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="text-xs text-slate-500">Tổng tiền tip tích lũy</div>
                    <div className="mt-1 font-mono text-lg font-bold text-emerald-700 tabular-nums">
                      {formatCurrency(dState?.totalTips || 0)}
                    </div>
                  </div>
                </div>
                <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div>
                    <span className="text-slate-500">Pack đã giao hôm nay:</span>{' '}
                    <span className="font-mono font-semibold text-slate-900 tabular-nums">
                      {dState?.dailyStats?.packsDelivered || 0}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Booster Box đã giao:</span>{' '}
                    <span className="font-mono font-semibold text-slate-900 tabular-nums">
                      {dState?.dailyStats?.boxesDelivered || 0}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Thẻ hiếm / Slab đã giao:</span>{' '}
                    <span className="font-mono font-semibold text-slate-900 tabular-nums">
                      {dState?.dailyStats?.cardsDelivered || 0}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
