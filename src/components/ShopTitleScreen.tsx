import React, { useState, useEffect } from 'react';
import { Play, Volume2, VolumeX, Users, KeyRound, Zap, Check } from 'lucide-react';
import { soundManager } from '../game/audio';
import { ShopPlayerProfile, TEST_VIP_PROFILE_ID } from '../game/shopProfileManager';

interface ShopTitleScreenProps {
  activeProfile: ShopPlayerProfile;
  isAccountModalOpen?: boolean;
  onOpenAccountModal: (tab?: 'profile' | 'switch') => void;
  onSwitchToTestAccount?: () => void;
  onStart: () => void;
}

const CONTROL_HINTS: ReadonlyArray<{ keyLabel: string; actionLabel: string }> = [
  { keyLabel: 'WASD', actionLabel: 'Di chuyển' },
  { keyLabel: 'Shift', actionLabel: 'Chạy nhanh' },
  { keyLabel: 'Space', actionLabel: 'Nhảy' },
  { keyLabel: 'Chuột', actionLabel: 'Xoay góc nhìn' },
  { keyLabel: 'E', actionLabel: 'Tương tác' },
  { keyLabel: 'Tab', actionLabel: 'Tablet' },
  { keyLabel: 'B', actionLabel: 'Túi đồ' },
  { keyLabel: 'V', actionLabel: 'Sổ thẻ' },
];

export const ShopTitleScreen: React.FC<ShopTitleScreenProps> = ({
  activeProfile,
  isAccountModalOpen = false,
  onOpenAccountModal,
  onSwitchToTestAccount,
  onStart,
}) => {
  const [isMuted, setIsMuted] = useState<boolean>(soundManager.getMuted());

  const handleToggleMute = () => {
    const nextMuted = soundManager.toggleMuted();
    setIsMuted(nextMuted);
  };

  const handleStartGame = () => {
    soundManager.playDoorChime();
    soundManager.startAmbientLoungeMusic();
    onStart();
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isAccountModalOpen) return;
      const target = e.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
      if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        handleStartGame();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAccountModalOpen]);

  const isTestVip = activeProfile.id === TEST_VIP_PROFILE_ID;
  const formattedCash = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: activeProfile.shopState.cash % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(activeProfile.shopState.cash);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 select-none overflow-y-auto bg-zinc-950/60 backdrop-blur-[6px]">
      {/* Subtle Top Vignette so 3D shop interior breathes behind the panel */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_25%,rgba(9,9,11,0.72)_100%)]" />

      {/* Top-Right Audio Control */}
      <div className="fixed top-4 right-4 z-20">
        <button
          type="button"
          onClick={handleToggleMute}
          title={isMuted ? 'Bật âm thanh' : 'Tắt âm thanh'}
          className={`flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-medium backdrop-blur-md transition-colors duration-150 cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
            isMuted
              ? 'border-red-500/30 bg-zinc-950/80 text-red-300 hover:bg-red-950/70'
              : 'border-white/10 bg-zinc-950/75 text-zinc-200 hover:border-white/25 hover:text-white'
          }`}
        >
          {isMuted ? (
            <VolumeX className="h-4 w-4 text-red-400 shrink-0" />
          ) : (
            <Volume2 className="h-4 w-4 text-emerald-400 shrink-0" />
          )}
          <span className="hidden sm:inline">{isMuted ? 'Âm thanh: Tắt' : 'Âm thanh: Bật'}</span>
        </button>
      </div>

      {/* Compact Main Panel */}
      <div className="relative z-10 w-full max-w-[500px] rounded-2xl border border-white/10 bg-zinc-950/90 backdrop-blur-xl p-6 sm:p-7 shadow-2xl my-auto">
        {/* Title & Concise Intro */}
        <div className="text-center">
          <p className="text-xs font-medium tracking-wide text-amber-400/90">
            Pokemon TCG · Mô phỏng cửa hàng 3D
          </p>
          <h1 className="mt-1.5 text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            PokeCard <span className="text-amber-400">Shop</span>
          </h1>
          <p className="mt-2 mx-auto max-w-sm text-[13px] text-zinc-400 leading-relaxed">
            Nhập hàng sỉ, xé pack săn thẻ hiếm, trưng bày tủ kính và thu ngân quét mã POS.
          </p>
        </div>

        {/* Active Account Summary (Hairline Dividers, No Nested Card Box) */}
        <div className="mt-5 border-y border-white/[0.08] py-4">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-zinc-950 font-bold text-base shadow-sm"
              style={{ backgroundColor: activeProfile.avatarColor || '#f59e0b' }}
            >
              {activeProfile.name.charAt(0).toUpperCase()}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-white truncate">
                  {activeProfile.name}
                </span>
                <span className="text-sm font-semibold text-emerald-400 tabular-nums whitespace-nowrap shrink-0">
                  ${formattedCash}
                </span>
              </div>
              <div className="mt-0.5 flex items-center gap-1.5 text-xs text-zinc-400 truncate">
                <span className="font-medium text-amber-300 tabular-nums">
                  Lv.{activeProfile.shopState.storeLevel}
                </span>
                <span aria-hidden="true" className="text-zinc-600">·</span>
                <span className="truncate">{activeProfile.shopState.shopName}</span>
                <span aria-hidden="true" className="text-zinc-600">·</span>
                <span className="tabular-nums whitespace-nowrap">
                  Ngày {activeProfile.shopState.currentDay || 1}
                </span>
              </div>
            </div>
          </div>

          {/* Compact Single-Line Account Utility Actions */}
          <div className="mt-3.5 grid grid-cols-3 gap-2">
            {onSwitchToTestAccount && (
              <button
                type="button"
                onClick={onSwitchToTestAccount}
                title={
                  isTestVip
                    ? 'Bạn đang ở tài khoản Tester VIP (Cấp 27 · $1,000,000)'
                    : 'Chuyển nhanh sang tài khoản Tester VIP (Cấp 27 · $1,000,000)'
                }
                className={`flex items-center justify-center gap-1.5 rounded-lg border px-2.5 py-2 text-xs font-medium transition-colors duration-150 cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
                  isTestVip
                    ? 'border-amber-400/35 bg-amber-400/10 text-amber-300'
                    : 'border-white/10 bg-white/[0.04] text-zinc-200 hover:bg-white/[0.09] hover:text-white'
                }`}
              >
                {isTestVip ? (
                  <Check className="h-3.5 w-3.5 shrink-0" />
                ) : (
                  <Zap className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                )}
                <span className="truncate">{isTestVip ? 'Test VIP' : 'Vào Test VIP'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                soundManager.playSelectSound();
                onOpenAccountModal('profile');
              }}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-2 text-xs font-medium text-zinc-200 hover:bg-white/[0.09] hover:text-white transition-colors duration-150 cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
            >
              <KeyRound className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
              <span className="truncate">Hồ sơ & PIN</span>
            </button>

            <button
              type="button"
              onClick={() => {
                soundManager.playSelectSound();
                onOpenAccountModal('switch');
              }}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-2 text-xs font-medium text-zinc-200 hover:bg-white/[0.09] hover:text-white transition-colors duration-150 cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
            >
              <Users className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
              <span className="truncate">Đổi tài khoản</span>
            </button>
          </div>
        </div>

        {/* Primary CTA */}
        <div className="mt-5">
          <button
            type="button"
            onClick={handleStartGame}
            className="group flex h-12 w-full items-center justify-center gap-2.5 rounded-xl bg-amber-400 px-6 text-sm sm:text-base font-bold text-zinc-950 shadow-lg shadow-amber-500/15 transition-all duration-150 hover:bg-amber-300 active:scale-[0.99] cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
          >
            <Play className="h-4 w-4 fill-current transition-transform duration-150 group-hover:translate-x-0.5 shrink-0" />
            <span>Mở cửa tiệm & Bắt đầu</span>
          </button>

          <p className="mt-2.5 text-center text-[11px] text-zinc-500">
            Nhấn <span className="font-mono text-zinc-300">Enter</span> hoặc{' '}
            <span className="font-mono text-zinc-300">Space</span> để vào nhanh
          </p>
        </div>

        {/* Compact Aligned Controls Grid */}
        <div className="mt-5 border-t border-white/[0.08] pt-4 grid grid-cols-2 sm:grid-cols-4 gap-x-3 gap-y-2">
          {CONTROL_HINTS.map((item) => (
            <div key={item.keyLabel} className="flex items-center gap-1.5 min-w-0">
              <kbd className="inline-flex h-5 min-w-[22px] shrink-0 items-center justify-center rounded border border-white/10 bg-white/[0.05] px-1.5 font-mono text-[10px] font-medium text-zinc-300">
                {item.keyLabel}
              </kbd>
              <span className="text-[11px] text-zinc-400 truncate">{item.actionLabel}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
