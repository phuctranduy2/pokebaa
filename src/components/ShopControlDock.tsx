import React, { useState } from 'react';
import {
  ChevronUp,
  ChevronDown,
  Eye,
  Volume2,
  VolumeX,
  CreditCard,
  Package,
  Monitor,
  Store,
  BookOpen,
  ShoppingBag,
  HelpCircle,
  Sparkles,
  X,
  Car,
  UtensilsCrossed,
  Zap,
  Trophy,
} from 'lucide-react';
import { ShopStationType } from '../game/ShopScene';
import { soundManager } from '../game/audio';

interface ShopControlDockProps {
  cameraMode: 'first' | 'third';
  onToggleCamera: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  onTeleport: (stationId: ShopStationType) => void;
  onOpenModal: (stationId: ShopStationType) => void;
  currentFloor?: 1 | 2;
  onTeleportFloor?: (floor: 1 | 2) => void;
  onOpenCityEmpire?: () => void;
  hasSecurityAlert?: boolean;
  activeHuntCount?: number;
}

export const ShopControlDock: React.FC<ShopControlDockProps> = ({
  cameraMode,
  onToggleCamera,
  isMuted,
  onToggleMute,
  onTeleport,
  onOpenModal,
  currentFloor = 1,
  onTeleportFloor,
  onOpenCityEmpire,
  hasSecurityAlert = false,
  activeHuntCount = 0,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [showHelp, setShowHelp] = useState<boolean>(false);

  const stationsList: Array<{
    id: ShopStationType;
    label: string;
    icon: React.ReactNode;
    color: string;
    floor?: 1 | 2;
    viewOnly?: boolean;
  }> = [
    { id: 'register', label: 'Quầy Thu Ngân', icon: <CreditCard className="h-4 w-4" />, color: 'hover:border-emerald-400', floor: 1 },
    { id: 'rip_packs', label: 'Bàn Bóc Thẻ', icon: <Package className="h-4 w-4" />, color: 'hover:border-amber-400', floor: 1 },
    { id: 'box_opening', label: 'Mở Box 10 Packs', icon: <Package className="h-4 w-4 text-rose-400" />, color: 'hover:border-rose-400', floor: 1 },
    { id: 'pc_ordering', label: 'Tablet Tiệm [TAB]', icon: <Monitor className="h-4 w-4 text-cyan-400" />, color: 'hover:border-cyan-400', floor: 1 },
    { id: 'showcase', label: 'Bàn Trưng Bày', icon: <Store className="h-4 w-4 text-amber-400" />, color: 'hover:border-amber-400', floor: 1 },
    { id: 'battle_tables', label: 'Bàn Đấu ($5/H)', icon: <Sparkles className="h-4 w-4 text-blue-400" />, color: 'hover:border-blue-400', floor: 1 },
    { id: 'gacha', label: 'Pack Gacha 🎲', icon: <Sparkles className="h-4 w-4 text-pink-400" />, color: 'hover:border-pink-400', floor: 1 },
    { id: 'shelves', label: 'Kệ Hàng T1', icon: <ShoppingBag className="h-4 w-4" />, color: 'hover:border-yellow-400', floor: 1 },
    { id: 'binder', label: 'Sổ Sưu Tập', icon: <BookOpen className="h-4 w-4" />, color: 'hover:border-indigo-400', floor: 1 },
    { id: 'ny_steakhouse', label: 'Steakhouse NY', icon: <UtensilsCrossed className="h-4 w-4 text-amber-400" />, color: 'hover:border-amber-500', floor: 1, viewOnly: true },
    { id: 'porsche_showroom', label: 'Showroom Porsche', icon: <Car className="h-4 w-4 text-red-400" />, color: 'hover:border-red-500', floor: 1, viewOnly: true },
    { id: 'vinfast_showroom', label: 'Showroom VinFast', icon: <Zap className="h-4 w-4 text-cyan-400" />, color: 'hover:border-cyan-400', floor: 1, viewOnly: true },
    { id: 'ron_pickleball', label: 'RON Pickleball', icon: <Trophy className="h-4 w-4 text-lime-400" />, color: 'hover:border-lime-400', floor: 1, viewOnly: true },
    { id: 'aeon_mall', label: 'AEON Mall', icon: <ShoppingBag className="h-4 w-4 text-fuchsia-400" />, color: 'hover:border-fuchsia-400', floor: 1, viewOnly: true },
    { id: 'phan_chau_trinh', label: 'THPT Phan Châu Trinh', icon: <BookOpen className="h-4 w-4 text-rose-400" />, color: 'hover:border-rose-400', floor: 1, viewOnly: true },
    // Floor 2 One Piece Stations
    { id: 'op_shelves', label: 'Kệ One Piece (T2)', icon: <ShoppingBag className="h-4 w-4 text-amber-400" />, color: 'hover:border-amber-400', floor: 2 },
    { id: 'op_gacha', label: 'Gacha Trái Ác Quỷ (T2)', icon: <Sparkles className="h-4 w-4 text-purple-400" />, color: 'hover:border-purple-400', floor: 2 },
    { id: 'op_collector_shelves', label: 'Rương Hải Tặc (T2)', icon: <Store className="h-4 w-4 text-yellow-400" />, color: 'hover:border-yellow-400', floor: 2 },
    { id: 'op_showcase', label: 'Tủ VIP One Piece (T2)', icon: <Store className="h-4 w-4 text-emerald-400" />, color: 'hover:border-emerald-400', floor: 2 },
  ];

  return (
    <div className="pointer-events-auto fixed bottom-3 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center">
      {/* Collapse/Expand Toggle Button */}
      <button
        onClick={() => {
          soundManager.playSelectSound();
          setIsExpanded(!isExpanded);
        }}
        className="mb-1 flex items-center gap-1 rounded-full border border-amber-500/40 bg-zinc-950/95 px-3 py-1 text-[11px] font-bold text-amber-300 shadow-lg hover:bg-zinc-900 cursor-pointer transition"
      >
        {isExpanded ? (
          <>
            <ChevronDown className="h-3 w-3" />
            <span>Thu Gọn Thanh Điều Khiển</span>
          </>
        ) : (
          <>
            <ChevronUp className="h-3 w-3" />
            <span>Mở Rộng Bảng Quản Lý Shop ({currentFloor === 2 ? 'Tầng 2 VIP' : 'Tầng 1'})</span>
          </>
        )}
      </button>

      {/* Main Dock Container */}
      {isExpanded && (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-950/95 p-2 sm:px-4 sm:py-2.5 shadow-2xl max-w-[94vw] overflow-x-auto">
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-center">
            {/* Direct Floor 1 <-> Floor 2 Switcher Button */}
            {onTeleportFloor && (
              <button
                onClick={() => {
                  soundManager.playSelectSound();
                  onTeleportFloor(currentFloor === 1 ? 2 : 1);
                }}
                title={currentFloor === 1 ? 'Chuyển nhanh lên Tầng 2 (Khu One Piece VIP)' : 'Chuyển nhanh xuống Tầng 1 (Khu Pokemon)'}
                className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-black transition cursor-pointer shadow-lg animate-pulse hover:animate-none ${
                  currentFloor === 2
                    ? 'border-amber-400/80 bg-amber-950/90 text-amber-300 hover:bg-amber-900'
                    : 'border-yellow-400/80 bg-yellow-950/90 text-yellow-300 hover:bg-yellow-900'
                }`}
              >
                <span className="text-sm">{currentFloor === 1 ? '🪜' : '🏪'}</span>
                <span>{currentFloor === 1 ? 'LÊN TẦNG 2 (VIP)' : 'XUỐNG TẦNG 1'}</span>
              </button>
            )}

            {onOpenCityEmpire && (
              <button
                onClick={() => {
                  soundManager.playSelectSound();
                  onOpenCityEmpire();
                }}
                title="Mở Trung Tâm Đế Chế TCG (Thị Trường, Live Break, Săn Hàng Hiếm 3D, Luxury, Kiosk, An Ninh)"
                className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-black transition cursor-pointer shadow-lg ${
                  hasSecurityAlert
                    ? 'border-red-400 bg-red-950/90 text-red-200 animate-pulse'
                    : 'border-amber-400/75 bg-gradient-to-r from-amber-950/90 to-rose-950/90 text-amber-200 hover:brightness-110'
                }`}
              >
                <span className="text-sm">{hasSecurityAlert ? '🚨' : '👑'}</span>
                <span>{hasSecurityAlert ? 'BẮT TRỘM!' : 'Đế Chế & Săn Thẻ'}</span>
                {!hasSecurityAlert && activeHuntCount > 0 && (
                  <span className="rounded bg-amber-400 text-black px-1 text-[10px]">
                    {activeHuntCount}
                  </span>
                )}
              </button>
            )}

            <div className="h-5 w-px bg-zinc-800 mx-0.5 hidden sm:block" />

            {/* Teleport / Open stations buttons */}
            {stationsList.map((st) => (
              <button
                key={st.id}
                onClick={() => {
                  soundManager.playSelectSound();
                  onTeleport(st.id);
                }}
                onDoubleClick={() => {
                  if (!st.viewOnly) {
                    onOpenModal(st.id);
                  }
                }}
                title={st.viewOnly ? `Đi tới tham quan ${st.label}` : `Đi tới ${st.label} (Nhấp đúp để mở giao diện)`}
                className={`flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs font-bold transition cursor-pointer ${
                  st.floor === currentFloor
                    ? 'border-zinc-700 bg-zinc-900/90 text-zinc-100 hover:bg-zinc-800'
                    : 'border-zinc-800/60 bg-zinc-950/60 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
                } ${st.color}`}
              >
                <span>{st.icon}</span>
                <span>{st.label}</span>
              </button>
            ))}

            <div className="h-5 w-px bg-zinc-800 mx-1 hidden sm:block" />

            {/* Camera View Mode Toggle (1st / 3rd Person) */}
            <button
              onClick={() => {
                soundManager.playSelectSound();
                onToggleCamera();
              }}
              title="Chuyển Góc Nhìn Thứ 1 (FPS) / Thứ 3 [C]"
              className="flex items-center gap-1.5 rounded-xl border border-sky-700/70 bg-sky-950/60 px-2.5 py-1.5 text-xs font-black text-sky-300 hover:border-sky-400 hover:text-white cursor-pointer transition"
            >
              <Eye className="h-3.5 w-3.5 text-sky-400" />
              <span>{cameraMode === 'third' ? 'Góc Nhìn 3' : 'Góc Nhìn 1 (FPS)'}</span>
            </button>

            {/* Mute Music */}
            <button
              onClick={() => {
                soundManager.playSelectSound();
                onToggleMute();
              }}
              title="Bật/Tắt nhạc nền tiệm (M)"
              className="flex items-center justify-center h-8 w-8 rounded-xl border border-zinc-800 bg-zinc-900/90 text-zinc-300 hover:border-amber-400 hover:text-white cursor-pointer"
            >
              {isMuted ? <VolumeX className="h-4 w-4 text-rose-400" /> : <Volume2 className="h-4 w-4 text-emerald-400" />}
            </button>

            {/* Help & Guide */}
            <button
              onClick={() => setShowHelp(!showHelp)}
              title="Hướng dẫn chơi Shop Simulator"
              className="flex items-center justify-center h-8 w-8 rounded-xl border border-zinc-800 bg-zinc-900/90 text-zinc-300 hover:border-amber-400 hover:text-white cursor-pointer"
            >
              <HelpCircle className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Controls Help Guide Modal */}
      {showHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-md rounded-3xl border-2 border-amber-500/50 bg-zinc-950 p-6 text-white shadow-2xl">
            <button
              onClick={() => setShowHelp(false)}
              className="absolute top-4 right-4 h-8 w-8 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-2 text-lg font-black text-amber-300 mb-3">
              <Sparkles className="h-5 w-5" />
              <span>HƯỚNG DẪN CHƠI POKECARD SHOP SIMULATOR</span>
            </div>

            <div className="space-y-3 text-xs text-zinc-300">
              <div className="rounded-xl bg-zinc-900 p-3 border border-zinc-800">
                <span className="font-bold text-amber-300">🕹️ Di Chuyển & Điều Khiển:</span>
                <p className="mt-1">
                  • Phím <kbd className="rounded bg-black px-1.5 py-0.5 text-amber-300">W A S D</kbd> để bước đi.
                  <br />• Giữ chuột trái & kéo để xoay góc nhìn camera.
                  <br />• Phím <kbd className="rounded bg-black px-1.5 py-0.5 text-amber-300">E</kbd> khi lại gần các quầy để tương tác mở menu.
                  <br />• Phím <kbd className="rounded bg-black px-1.5 py-0.5 text-amber-300">V</kbd> để đổi góc nhìn thứ nhất (First Person) hoặc thứ ba.
                </p>
              </div>

              <div className="rounded-xl bg-zinc-900 p-3 border border-zinc-800">
                <span className="font-bold text-emerald-300">💼 Vòng Lặp Kinh Doanh Tiệm Thẻ:</span>
                <p className="mt-1">
                  1. 📱 Mở <strong>Tablet Tiệm [TAB]</strong> đặt mua lô Booster Pack & Booster Box giá sỉ.
                  <br />2. 🎴 Bấm <strong>Xé Pack / Mở Box</strong> săn thẻ hiếm Charizard SIR & Mew Gold!
                  <br />3. 💎 Đặt thẻ xịn vào <strong>Tủ Kính Trưng Bày</strong> định giá bán kiếm lãi.
                  <br />4. 📟 Khi khách xếp hàng ở <strong>Quầy Thu Ngân</strong>, bấm E để quét mã vạch nhận tiền!
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowHelp(false)}
              className="mt-4 w-full rounded-xl bg-amber-500 py-2.5 font-bold text-black hover:bg-amber-400 cursor-pointer"
            >
              Đã Hiểu & Bắt Đầu Chơi!
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
