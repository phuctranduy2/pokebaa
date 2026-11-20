import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  BellRing,
  Briefcase,
  CheckCircle2,
  Clock,
  Gavel,
  Globe,
  Lock,
  Megaphone,
  Microscope,
  PackageCheck,
  Search,
  UserCheck,
  UserMinus,
  UserPlus,
  Users,
  Video,
} from 'lucide-react';
import {
  AUCTIONEER_WAGE,
  AUCTION_HOST_WAGE,
  CASHIER_UNLOCK_LEVEL,
  getGradingSpeedStats,
  GRADING_RECEPTIONIST_WAGE,
  GRADING_SHOP_UNLOCK_LEVEL,
  GRADING_SPECIALIST_WAGE,
  isStaffWorkingHours,
  LIVE_STREAMER_UNLOCK_LEVEL,
  LIVE_STREAMER_WAGE,
  MAX_GRADING_SPECIALISTS,
  OFFICE_STAFF_UNLOCK_LEVEL,
  OFFICE_STAFF_WAGE,
  RESTOCKER_UNLOCK_LEVEL,
  ShopState,
  StaffRole,
} from '../game/pokemonShopLogic';
import { soundManager } from '../game/audio';

export type StaffRoleId = StaffRole;

type StaffNavTab = 'roster' | 'payroll';
type DepartmentFilter = 'all' | 'store' | 'grading' | 'auction';

interface StaffAppViewProps {
  shopState: ShopState;
  onBack: () => void;
  onHireStaff?: (role: StaffRoleId, action: 'hire' | 'fire') => void;
}

interface StaffRoleConfig {
  id: StaffRoleId;
  name: string;
  department: 'store' | 'grading' | 'auction';
  departmentLabel: string;
  hourlyWage: number;
  unlockLevel: number;
  isUnlocked: boolean;
  hiredCount: number;
  maxCount: number;
  workHoursLabel?: string;
  description: string;
  metricLabel: string;
  metricValue: string;
  hireButtonLabel: string;
  unhiredHint: string;
  Icon: React.ComponentType<{ className?: string }>;
}

const formatCurrency = (val: number) => `$${val.toFixed(2)}`;

export const StaffAppView: React.FC<StaffAppViewProps> = ({
  shopState,
  onBack,
  onHireStaff,
}) => {
  const [navTab, setNavTab] = useState<StaffNavTab>('roster');
  const [deptFilter, setDeptFilter] = useState<DepartmentFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const isStaffOnShift = isStaffWorkingHours(shopState.inGameHour, shopState.inGameMinute);

  const hiredCashiers = shopState.hiredStaff?.cashier || 0;
  const hiredRestockers = shopState.hiredStaff?.restocker || 0;
  const hiredOfficeStaff = shopState.hiredStaff?.officeStaff || 0;
  const hiredLiveStreamer = shopState.hiredStaff?.liveStreamer || 0;
  const hiredGradingReceptionist = shopState.hiredStaff?.gradingReceptionist || 0;
  const hiredGradingSpecialists = shopState.hiredStaff?.gradingSpecialists || 0;
  const hiredAuctioneer = shopState.hiredStaff?.auctioneer || 0;
  const hiredAuctionHost = shopState.hiredStaff?.auctionHost || 0;

  const isCashierUnlocked = shopState.storeLevel >= CASHIER_UNLOCK_LEVEL;
  const isRestockerUnlocked = shopState.storeLevel >= RESTOCKER_UNLOCK_LEVEL;
  const isLiveStreamerUnlocked = shopState.storeLevel >= LIVE_STREAMER_UNLOCK_LEVEL;
  const isOfficeStaffUnlocked = shopState.storeLevel >= OFFICE_STAFF_UNLOCK_LEVEL;
  const isGradingShopUnlocked = shopState.storeLevel >= GRADING_SHOP_UNLOCK_LEVEL;
  const gradingSpeedStats = getGradingSpeedStats(hiredGradingSpecialists);

  const roles = useMemo<StaffRoleConfig[]>(
    () => [
      {
        id: 'cashier',
        name: 'Nhân Viên Thu Ngân',
        department: 'store',
        departmentLabel: 'Quầy thanh toán',
        hourlyWage: 18,
        unlockLevel: CASHIER_UNLOCK_LEVEL,
        isUnlocked: isCashierUnlocked,
        hiredCount: hiredCashiers,
        maxCount: 1,
        description:
          'Tự động đứng tại Quầy Thu Ngân, quét mã vạch và tính tiền cho mọi khách hàng xếp hàng chờ thanh toán.',
        metricLabel: 'Tốc độ quét',
        metricValue: '1.5 giây / khách',
        hireButtonLabel: 'Thuê Thu Ngân ($18/h)',
        unhiredHint: 'Chưa thuê',
        Icon: UserCheck,
      },
      {
        id: 'restocker',
        name: 'Nhân Viên Xếp Hàng',
        department: 'store',
        departmentLabel: 'Kho & Kệ trưng bày',
        hourlyWage: 15,
        unlockLevel: RESTOCKER_UNLOCK_LEVEL,
        isUnlocked: isRestockerUnlocked,
        hiredCount: hiredRestockers,
        maxCount: 1,
        description:
          'Tự động ra cửa bê các thùng hàng đã đặt về kho và xếp từng món lên kệ khi hàng vơi.',
        metricLabel: 'Năng suất châm hàng',
        metricValue: 'Tốc độ 2x (3.5s/món)',
        hireButtonLabel: 'Thuê Xếp Kho ($15/h)',
        unhiredHint: 'Chưa thuê',
        Icon: PackageCheck,
      },
      {
        id: 'officeStaff',
        name: 'Nhân Viên Văn Phòng',
        department: 'store',
        departmentLabel: 'Phòng quản lý',
        hourlyWage: OFFICE_STAFF_WAGE,
        unlockLevel: OFFICE_STAFF_UNLOCK_LEVEL,
        isUnlocked: isOfficeStaffUnlocked,
        hiredCount: hiredOfficeStaff,
        maxCount: 1,
        description:
          'Trực máy tính trong Phòng Quản Lý, tự động dùng tiền của bạn đặt hàng sỉ giao ra cửa khi kệ hoặc kho vơi.',
        metricLabel: 'Nhiệm vụ tự động',
        metricValue: 'Đặt hàng sỉ bằng quỹ shop',
        hireButtonLabel: `Thuê Văn Phòng ($${OFFICE_STAFF_WAGE}/h)`,
        unhiredHint: 'Chưa thuê',
        Icon: Briefcase,
      },
      {
        id: 'liveStreamer',
        name: 'Nhân Viên Livestream (PokeLive)',
        department: 'store',
        departmentLabel: 'Phòng Live Studio',
        hourlyWage: LIVE_STREAMER_WAGE,
        unlockLevel: LIVE_STREAMER_UNLOCK_LEVEL,
        isUnlocked: isLiveStreamerUnlocked,
        hiredCount: hiredLiveStreamer,
        maxCount: 1,
        workHoursLabel: '07:00 – 22:00 (Tại Phòng Live)',
        description:
          'Ngồi trực tại Phòng Live Studio trong shop, lên sóng cùng bạn kéo người xem, chốt đơn Slot & khui Booster Box trực tiếp.',
        metricLabel: 'Yêu cầu lên sóng',
        metricValue: 'Bắt buộc có Phòng Live + Box kho',
        hireButtonLabel: `Thuê Streamer ($${LIVE_STREAMER_WAGE}/h)`,
        unhiredHint: 'Chưa thuê (Bắt buộc để Live)',
        Icon: Video,
      },
      {
        id: 'gradingReceptionist',
        name: 'Nhân Viên Nhận Hàng PSA / CGC',
        department: 'grading',
        departmentLabel: 'Trung tâm Thẩm định',
        hourlyWage: GRADING_RECEPTIONIST_WAGE,
        unlockLevel: GRADING_SHOP_UNLOCK_LEVEL,
        isUnlocked: isGradingShopUnlocked,
        hiredCount: hiredGradingReceptionist,
        maxCount: 1,
        description:
          'Trực tại quầy tiếp nhận Trung Tâm Thẩm Định kế bên, nhận thẻ Raw Pokémon & One Piece từ bạn để chuyển vào phòng lab.',
        metricLabel: 'Phí chấm điểm',
        metricValue: '$80 / thẻ (Raw -> Slab)',
        hireButtonLabel: `Thuê Lễ Tân ($${GRADING_RECEPTIONIST_WAGE}/h)`,
        unhiredHint: 'Chưa thuê (Bắt buộc 1)',
        Icon: BellRing,
      },
      {
        id: 'gradingSpecialists',
        name: `Chuyên Gia Thẩm Định (${hiredGradingSpecialists}/${MAX_GRADING_SPECIALISTS})`,
        department: 'grading',
        departmentLabel: 'Phòng Lab Thẩm định',
        hourlyWage: GRADING_SPECIALIST_WAGE,
        unlockLevel: GRADING_SHOP_UNLOCK_LEVEL,
        isUnlocked: isGradingShopUnlocked,
        hiredCount: hiredGradingSpecialists,
        maxCount: MAX_GRADING_SPECIALISTS,
        description:
          'Ngồi phòng lab soi xét chi tiết thẻ. Thuê càng nhiều chuyên gia, chấm càng nhanh & nhận nhiều thẻ cùng lúc.',
        metricLabel: 'Tốc độ & Hàng đợi',
        metricValue: isGradingShopUnlocked
          ? `${gradingSpeedStats.speedLabel} · 8% Grade 10`
          : `Khóa tại Cấp ${GRADING_SHOP_UNLOCK_LEVEL}`,
        hireButtonLabel: `Thuê +1 Chuyên Gia ($${GRADING_SPECIALIST_WAGE}/h)`,
        unhiredHint: 'Chưa thuê',
        Icon: Microscope,
      },
      {
        id: 'auctioneer',
        name: 'Chủ Tọa Đấu Giá (Auctioneer)',
        department: 'auction',
        departmentLabel: 'Sàn Đấu Giá VIP',
        hourlyWage: AUCTIONEER_WAGE,
        unlockLevel: GRADING_SHOP_UNLOCK_LEVEL,
        isUnlocked: isGradingShopUnlocked,
        hiredCount: hiredAuctioneer,
        maxCount: 1,
        workHoursLabel: '07:00 – 22:00 (Đấu giá 09:00+)',
        description:
          'Đứng bục vàng trên Sân Khấu Showroom, chủ trì gõ búa đấu giá và nhận ký gửi siêu thẻ từ các nhà sưu tầm VIP.',
        metricLabel: 'Hiệu ứng đấu giá',
        metricValue: '+10% Trần giá Bid · Mở sàn 3D',
        hireButtonLabel: `Thuê Chủ Tọa ($${AUCTIONEER_WAGE}/h)`,
        unhiredHint: 'Chưa thuê',
        Icon: Gavel,
      },
      {
        id: 'auctionHost',
        name: 'MC Kéo Khách & Ký Gửi VIP',
        department: 'auction',
        departmentLabel: 'Showroom Đấu Giá VIP',
        hourlyWage: AUCTION_HOST_WAGE,
        unlockLevel: GRADING_SHOP_UNLOCK_LEVEL,
        isUnlocked: isGradingShopUnlocked,
        hiredCount: hiredAuctionHost,
        maxCount: 1,
        workHoursLabel: '07:00 – 22:00 (Đấu giá 09:00+)',
        description:
          'Đứng cạnh bục vàng trên Sân Khấu Showroom, mời đại gia Landmark 81 & Porsche tranh giá dồn dập hơn và mang về lô ký gửi VIP 18% hoa hồng.',
        metricLabel: 'Hiệu ứng VIP',
        metricValue: '+12% Trần Bid · Nhịp nhanh · 18% HH',
        hireButtonLabel: `Thuê MC VIP ($${AUCTION_HOST_WAGE}/h)`,
        unhiredHint: 'Chưa thuê',
        Icon: Megaphone,
      },
    ],
    [
      isCashierUnlocked,
      hiredCashiers,
      isRestockerUnlocked,
      hiredRestockers,
      isLiveStreamerUnlocked,
      hiredLiveStreamer,
      isOfficeStaffUnlocked,
      hiredOfficeStaff,
      isGradingShopUnlocked,
      hiredGradingReceptionist,
      hiredGradingSpecialists,
      hiredAuctioneer,
      hiredAuctionHost,
      gradingSpeedStats.speedLabel,
    ]
  );

  const filteredRoles = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return roles.filter((role) => {
      if (deptFilter !== 'all' && role.department !== deptFilter) return false;
      if (!q) return true;
      return (
        role.name.toLowerCase().includes(q) ||
        role.departmentLabel.toLowerCase().includes(q) ||
        role.description.toLowerCase().includes(q)
      );
    });
  }, [roles, deptFilter, searchQuery]);

  const totalHired = roles.reduce((sum, r) => sum + r.hiredCount, 0);
  const totalCapacity = roles.reduce((sum, r) => sum + r.maxCount, 0);
  const totalHourlyWage = roles.reduce((sum, r) => sum + r.hiredCount * r.hourlyWage, 0);
  const activePayrollRoles = roles.filter((r) => r.hiredCount > 0);

  const currentUrlPath = navTab === 'roster' ? 'hr.pokecard.vn/nhan-su' : 'hr.pokecard.vn/bang-luong';

  const getStatusDisplay = (role: StaffRoleConfig) => {
    if (!role.isUnlocked && role.hiredCount === 0) {
      return {
        label: `Khóa (Cấp ${shopState.storeLevel}/${role.unlockLevel})`,
        toneClass: 'text-slate-400 font-medium',
      };
    }
    if (role.hiredCount > 0) {
      return {
        label: isStaffOnShift
          ? `Đang làm việc (${role.hiredCount}/${role.maxCount})`
          : `Đã tan ca (${role.hiredCount}/${role.maxCount})`,
        toneClass: isStaffOnShift ? 'text-emerald-700 font-semibold' : 'text-amber-700 font-semibold',
      };
    }
    return {
      label: role.unhiredHint,
      toneClass: 'text-slate-500 font-medium',
    };
  };

  return (
    <div className="flex-1 flex flex-col bg-[#F8FAFC] text-slate-900 rounded-b-2xl overflow-hidden font-sans antialiased">
      {/* Browser Window Chrome */}
      <div className="flex items-center justify-between gap-3 bg-slate-100 border-b border-slate-200 px-3 sm:px-4 py-2 shrink-0">
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
            className="flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer shrink-0 whitespace-nowrap"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Trang chủ</span>
          </button>

          <div className="flex items-center gap-2 flex-1 max-w-md rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-600 min-w-0">
            <Globe className="h-3.5 w-3.5 text-blue-600 shrink-0" />
            <span className="truncate font-mono text-[11px] text-slate-700">
              https://{currentUrlPath}
            </span>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-600 shrink-0 whitespace-nowrap">
          <span>Ca cố định 07:00 – 22:00</span>
          <span aria-hidden="true">·</span>
          <span className={isStaffOnShift ? 'font-semibold text-emerald-700' : 'font-semibold text-amber-700'}>
            {isStaffOnShift ? 'Đang trong ca' : 'Ngoài giờ (0$/h)'}
          </span>
        </div>
      </div>

      {/* Web App Top Navigation Bar (Single Row, Clean 3-Zone Header) */}
      <header className="flex flex-wrap items-center justify-between gap-4 bg-white border-b border-slate-200 px-4 sm:px-6 py-3 shrink-0">
        <div className="flex items-center gap-6 min-w-0">
          {/* Brand Wordmark */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white shrink-0">
              <Users className="h-4 w-4" />
            </div>
            <span className="text-sm sm:text-base font-bold tracking-tight text-slate-900 whitespace-nowrap">
              PokéStaff HR
            </span>
          </div>

          {/* Primary Navigation Links */}
          <nav className="flex items-center gap-5">
            <button
              type="button"
              onClick={() => {
                soundManager.playSelectSound();
                setNavTab('roster');
              }}
              className={`py-1 text-xs sm:text-sm font-medium border-b-2 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                navTab === 'roster'
                  ? 'border-blue-600 text-blue-700 font-semibold'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              Đội ngũ &amp; Tuyển dụng ({totalHired}/{totalCapacity})
            </button>

            <button
              type="button"
              onClick={() => {
                soundManager.playSelectSound();
                setNavTab('payroll');
              }}
              className={`py-1 text-xs sm:text-sm font-medium border-b-2 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                navTab === 'payroll'
                  ? 'border-blue-600 text-blue-700 font-semibold'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              Bảng lương ({formatCurrency(totalHourlyWage)}/h)
            </button>
          </nav>
        </div>

        {/* Right Controls (Search + Department Filter on Roster Tab) */}
        {navTab === 'roster' && (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-52">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm vị trí nhân sự..."
                className="w-full rounded-md border border-slate-200 bg-slate-50 pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-0.5 border border-slate-200 shrink-0">
              {[
                { id: 'all' as const, label: 'Tất cả' },
                { id: 'store' as const, label: 'Cửa hàng' },
                { id: 'grading' as const, label: 'Thẩm định' },
                { id: 'auction' as const, label: 'Đấu giá' },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    soundManager.playSelectSound();
                    setDeptFilter(item.id);
                  }}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                    deptFilter === item.id
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </header>

      {/* Scrollable Main Web Workspace */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        {/* Compact 4-Column Summary Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 bg-white border border-slate-200 rounded-lg divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
          <div className="px-4 py-3">
            <div className="text-[11px] font-medium text-slate-500">Nhân sự đang thuê</div>
            <div className="mt-0.5 text-lg font-bold text-slate-900 tabular-nums font-mono">
              {totalHired} / {totalCapacity}
            </div>
          </div>
          <div className="px-4 py-3">
            <div className="text-[11px] font-medium text-slate-500">Tổng lương mỗi giờ</div>
            <div className="mt-0.5 text-lg font-bold text-blue-700 tabular-nums font-mono">
              {formatCurrency(totalHourlyWage)}/h
            </div>
          </div>
          <div className="px-4 py-3">
            <div className="text-[11px] font-medium text-slate-500">Ước tính 1 ca (15 giờ)</div>
            <div className="mt-0.5 text-lg font-bold text-slate-900 tabular-nums font-mono">
              {formatCurrency(totalHourlyWage * 15)}
            </div>
          </div>
          <div className="px-4 py-3">
            <div className="text-[11px] font-medium text-slate-500">Ca làm cố định</div>
            <div
              className={`mt-0.5 flex items-center gap-1.5 text-sm font-semibold ${
                isStaffOnShift ? 'text-emerald-700' : 'text-amber-700'
              }`}
            >
              <Clock className="h-3.5 w-3.5 shrink-0" />
              <span>{isStaffOnShift ? 'Đang trực (07:00–22:00)' : 'Tan ca (0$/giờ)'}</span>
            </div>
          </div>
        </div>

        {navTab === 'roster' ? (
          filteredRoles.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-lg px-4 py-12 text-center space-y-2.5">
              <div className="text-sm font-semibold text-slate-900">
                Không tìm thấy vị trí nhân sự phù hợp
              </div>
              <p className="text-xs text-slate-500">
                Hãy xóa từ khóa tìm kiếm hoặc chọn bộ lọc Tất cả.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setDeptFilter('all');
                }}
                className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Đặt lại bộ lọc
              </button>
            </div>
          ) : (
            /* Clean Full-Width 2-Column SaaS Role Grid (Ample Space, Zero Truncation) */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredRoles.map((role) => {
                const status = getStatusDisplay(role);
                const RoleIcon = role.Icon;

                return (
                  <section
                    key={role.id}
                    className="bg-white border border-slate-200 rounded-lg p-4 sm:p-5 flex flex-col justify-between gap-4"
                  >
                    <div className="space-y-3">
                      {/* Card Header: Icon + Role Name + Wage */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          <div
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${
                              role.hiredCount > 0
                                ? 'border-blue-200 bg-blue-50 text-blue-700'
                                : 'border-slate-200 bg-slate-50 text-slate-600'
                            }`}
                          >
                            <RoleIcon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-[11px] font-medium text-slate-500">
                              {role.departmentLabel} · Yêu cầu Lv.{role.unlockLevel}+
                            </div>
                            <h2 className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
                              {role.name}
                            </h2>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="font-mono text-sm font-bold text-blue-700 tabular-nums">
                            {formatCurrency(role.hourlyWage)}
                          </div>
                          <div className="text-[11px] text-slate-500">mỗi giờ</div>
                        </div>
                      </div>

                      {/* Role Description */}
                      <p className="text-xs text-slate-600 leading-relaxed">
                        {role.description}
                      </p>

                      {/* Clean Hairline Key-Value Specs (No Nested Inner Cards) */}
                      <dl className="divide-y divide-slate-100 border-t border-slate-100 text-xs">
                        <div className="flex items-center justify-between py-2 gap-3">
                          <dt className="text-slate-500">Trạng thái</dt>
                          <dd className={status.toneClass}>{status.label}</dd>
                        </div>
                        <div className="flex items-center justify-between py-2 gap-3">
                          <dt className="text-slate-500">Giờ làm việc</dt>
                          <dd className="font-mono font-medium text-slate-900 tabular-nums">
                            {role.workHoursLabel || '07:00 – 22:00'}
                          </dd>
                        </div>
                        <div className="flex items-center justify-between py-2 gap-3">
                          <dt className="text-slate-500">{role.metricLabel}</dt>
                          <dd className="font-medium text-slate-900 text-right">
                            {role.metricValue}
                          </dd>
                        </div>
                      </dl>
                    </div>

                    {/* Action Footer */}
                    <div className="pt-2 border-t border-slate-100">
                      {!role.isUnlocked && role.hiredCount === 0 ? (
                        <button
                          type="button"
                          disabled
                          className="w-full flex items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-400 cursor-not-allowed"
                        >
                          <Lock className="h-3.5 w-3.5" />
                          <span>Mở khóa tại Cấp {role.unlockLevel}</span>
                        </button>
                      ) : role.id === 'gradingSpecialists' ? (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={role.hiredCount <= 0}
                            onClick={() => onHireStaff?.('gradingSpecialists', 'fire')}
                            className="flex-1 flex items-center justify-center gap-1.5 rounded-md border border-rose-200 bg-rose-50 hover:bg-rose-100 disabled:opacity-40 px-3 py-2 text-xs font-semibold text-rose-700 transition-colors cursor-pointer disabled:cursor-not-allowed whitespace-nowrap"
                          >
                            <UserMinus className="h-3.5 w-3.5" />
                            <span>Sa thải (-1)</span>
                          </button>
                          <button
                            type="button"
                            disabled={role.hiredCount >= MAX_GRADING_SPECIALISTS}
                            onClick={() => onHireStaff?.('gradingSpecialists', 'hire')}
                            className="flex-[1.6] flex items-center justify-center gap-1.5 rounded-md bg-blue-600 hover:bg-blue-700 disabled:opacity-40 px-3 py-2 text-xs font-semibold text-white transition-colors cursor-pointer disabled:cursor-not-allowed whitespace-nowrap"
                          >
                            <UserPlus className="h-3.5 w-3.5" />
                            <span>{role.hireButtonLabel}</span>
                          </button>
                        </div>
                      ) : role.hiredCount > 0 ? (
                        <button
                          type="button"
                          onClick={() => onHireStaff?.(role.id, 'fire')}
                          className="w-full flex items-center justify-center gap-1.5 rounded-md border border-rose-200 bg-rose-50 hover:bg-rose-100 px-4 py-2 text-xs font-semibold text-rose-700 transition-colors cursor-pointer"
                        >
                          <UserMinus className="h-3.5 w-3.5" />
                          <span>Cho Nghỉ Việc</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onHireStaff?.(role.id, 'hire')}
                          className="w-full flex items-center justify-center gap-1.5 rounded-md bg-blue-600 hover:bg-blue-700 px-4 py-2 text-xs font-semibold text-white transition-colors cursor-pointer"
                        >
                          <UserPlus className="h-3.5 w-3.5" />
                          <span>{role.hireButtonLabel}</span>
                        </button>
                      )}
                    </div>
                  </section>
                );
              })}
            </div>
          )
        ) : (
          /* TAB 2: CLEAN FULL-WIDTH PAYROLL TABLE */
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-3.5">
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Bảng chi phí lương nhân sự theo giờ
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Lương tự động trừ mỗi giờ trong khung ca 07:00 – 22:00. Ngoài giờ trực không tính phí.
                </p>
              </div>
              <div className="text-right font-mono">
                <div className="text-sm font-bold text-blue-700 tabular-nums">
                  {formatCurrency(totalHourlyWage)} / giờ
                </div>
                <div className="text-[11px] text-slate-500 tabular-nums">
                  Ước tính {formatCurrency(totalHourlyWage * 15)} / ngày
                </div>
              </div>
            </div>

            {activePayrollRoles.length === 0 ? (
              <div className="px-4 py-12 text-center space-y-2.5">
                <Users className="h-8 w-8 text-slate-400 mx-auto" />
                <div className="text-sm font-semibold text-slate-900">
                  Chưa có nhân viên nào đang làm việc
                </div>
                <p className="text-xs text-slate-500">
                  Chuyển sang mục Đội ngũ &amp; Tuyển dụng để thuê nhân sự cho cửa hàng.
                </p>
                <button
                  type="button"
                  onClick={() => setNavTab('roster')}
                  className="rounded-md bg-blue-600 hover:bg-blue-700 px-4 py-2 text-xs font-semibold text-white cursor-pointer"
                >
                  Xem danh sách tuyển dụng
                </button>
              </div>
            ) : (
              <>
                <div className="hidden sm:grid sm:grid-cols-[2fr_1.3fr_100px_110px_120px] gap-4 border-b border-slate-200 bg-slate-50 px-5 py-2.5 text-[11px] font-semibold text-slate-500">
                  <div>Vị trí công việc</div>
                  <div>Tình trạng trực</div>
                  <div className="text-right">Số lượng</div>
                  <div className="text-right">Đơn giá / giờ</div>
                  <div className="text-right">Thành tiền / giờ</div>
                </div>
                <div className="divide-y divide-slate-200">
                  {activePayrollRoles.map((role) => {
                    const rowCost = role.hiredCount * role.hourlyWage;
                    return (
                      <div
                        key={role.id}
                        className="grid grid-cols-1 sm:grid-cols-[2fr_1.3fr_100px_110px_120px] items-center gap-2 sm:gap-4 px-5 py-3 text-xs"
                      >
                        <div>
                          <div className="font-semibold text-slate-900">{role.name}</div>
                          <div className="text-[11px] text-slate-500">{role.departmentLabel}</div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2
                            className={`h-3.5 w-3.5 shrink-0 ${
                              isStaffOnShift ? 'text-emerald-600' : 'text-amber-600'
                            }`}
                          />
                          <span className={isStaffOnShift ? 'text-emerald-700 font-medium' : 'text-amber-700 font-medium'}>
                            {isStaffOnShift ? 'Đang tính lương ca' : 'Đang nghỉ ngoài giờ'}
                          </span>
                        </div>
                        <div className="sm:text-right font-mono tabular-nums text-slate-700">
                          {role.hiredCount} / {role.maxCount}
                        </div>
                        <div className="sm:text-right font-mono tabular-nums text-slate-600">
                          {formatCurrency(role.hourlyWage)}
                        </div>
                        <div className="sm:text-right font-mono font-semibold tabular-nums text-slate-900">
                          {formatCurrency(rowCost)}/h
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
