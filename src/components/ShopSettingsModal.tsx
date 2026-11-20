/**
 * PokeCard Shop Settings & Multi-User Account Database Modal.
 * Adapted from Casino's SettingsModal.tsx:
 * - Customize Player Name, Shop Name, Password/PIN & Avatar Color
 * - Switch or Register player accounts protected by Password/PIN (each with its own ShopState DB)
 * - View Shop Transaction History, Store Stats, Audio Settings, and Reset Store Progress
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  User,
  KeyRound,
  ShieldCheck,
  History,
  Users,
  Check,
  AlertCircle,
  Volume2,
  ArrowRightLeft,
  RotateCcw,
  Eye,
  EyeOff,
  Store,
  DollarSign,
  Trash2,
  Zap,
  Music,
  Shuffle,
  SkipForward,
} from 'lucide-react';
import {
  shopProfileManager,
  ShopPlayerProfile,
  ShopHistoryCategory,
  AVATAR_COLORS,
  TEST_VIP_PROFILE_ID,
} from '../game/shopProfileManager';
import { soundManager, BgmTrack } from '../game/audio';

interface ShopSettingsModalProps {
  initialTab?: 'profile' | 'switch' | 'history' | 'audio';
  onClose: () => void;
  onProfileChanged: (profile: ShopPlayerProfile, options?: { switchedAccount?: boolean }) => void;
}

export const ShopSettingsModal: React.FC<ShopSettingsModalProps> = ({
  initialTab = 'profile',
  onClose,
  onProfileChanged,
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'switch' | 'history' | 'audio'>(initialTab);
  const [currentProfile, setCurrentProfile] = useState<ShopPlayerProfile>(() =>
    shopProfileManager.getActiveProfile()
  );
  const [allProfiles, setAllProfiles] = useState<ShopPlayerProfile[]>(() =>
    shopProfileManager.getAllProfiles()
  );

  // Tab 1: Edit profile credentials
  const [editName, setEditName] = useState(currentProfile.name);
  const [editShopName, setEditShopName] = useState(currentProfile.shopState.shopName);
  const [editPin, setEditPin] = useState(currentProfile.pin);
  const [showEditPin, setShowEditPin] = useState(false);
  const [avatarColor, setAvatarColor] = useState(currentProfile.avatarColor || '#f59e0b');
  const [saveStatus, setSaveStatus] = useState<{ type: 'idle' | 'success' | 'error'; message: string }>({
    type: 'idle',
    message: '',
  });

  // Tab 2: Switch / Login / Register account
  const [switchName, setSwitchName] = useState('');
  const [switchPin, setSwitchPin] = useState('');
  const [showSwitchPin, setShowSwitchPin] = useState(false);
  const [switchStatus, setSwitchStatus] = useState<{ type: 'idle' | 'success' | 'error'; message: string }>({
    type: 'idle',
    message: '',
  });
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const switchPinInputRef = useRef<HTMLInputElement | null>(null);

  // Tab 3: History filter
  const [historyFilter, setHistoryFilter] = useState<'all' | ShopHistoryCategory>('all');

  // Tab 4: Audio & System
  const [selectedTrack, setSelectedTrack] = useState<BgmTrack>(soundManager.getCurrentTrack());
  const [volume, setVolume] = useState<number>(soundManager.getVolume());
  const [isMuted, setIsMuted] = useState<boolean>(soundManager.getMuted());
  const [confirmReset, setConfirmReset] = useState(false);
  const [track3Input, setTrack3Input] = useState<string>(() => soundManager.getTrack3Url());
  const [track3SavedMessage, setTrack3SavedMessage] = useState<string>('');
  const [currentTrackItem, setCurrentTrackItem] = useState(() => soundManager.getCurrentTrackItem());
  const [isRandomMode, setIsRandomMode] = useState<boolean>(() => soundManager.isRandom());
  const [isScheduleMode, setIsScheduleMode] = useState<boolean>(() => soundManager.isTimeScheduled());

  useEffect(() => {
    const unsub = soundManager.addTrackChangeListener(() => {
      setSelectedTrack(soundManager.getCurrentTrack());
      setCurrentTrackItem(soundManager.getCurrentTrackItem());
      setIsRandomMode(soundManager.isRandom());
      setIsScheduleMode(soundManager.isTimeScheduled());
      setIsMuted(soundManager.getMuted());
      setVolume(soundManager.getVolume());
    });
    return unsub;
  }, []);

  const refreshProfileLists = () => {
    const prof = shopProfileManager.getActiveProfile();
    setCurrentProfile(prof);
    setEditName(prof.name);
    setEditShopName(prof.shopState.shopName);
    setEditPin(prof.pin);
    setAvatarColor(prof.avatarColor || '#f59e0b');
    setAllProfiles(shopProfileManager.getAllProfiles());
  };

  useEffect(() => {
    refreshProfileLists();
  }, []);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const res = shopProfileManager.updateCredentials(editName, editPin, editShopName, avatarColor);
    if (!res.success || !res.profile) {
      soundManager.playWrongBuzzer();
      setSaveStatus({ type: 'error', message: res.error || 'Lỗi khi lưu thông tin tài khoản.' });
      return;
    }

    refreshProfileLists();
    onProfileChanged(res.profile, { switchedAccount: false });
    soundManager.playSelectSound();
    setSaveStatus({ type: 'success', message: 'Đã lưu tên người chơi, tên tiệm & mật khẩu vào database!' });

    setTimeout(() => {
      setSaveStatus({ type: 'idle', message: '' });
    }, 3000);
  };

  const handleSwitchAccount = (e: React.FormEvent) => {
    e.preventDefault();
    const res = shopProfileManager.loginOrRegister(switchName, switchPin, 'auto');
    if (!res.success || !res.profile) {
      soundManager.playWrongBuzzer();
      setSwitchStatus({ type: 'error', message: res.message });
      return;
    }

    refreshProfileLists();
    onProfileChanged(res.profile, { switchedAccount: true });
    soundManager.playWinChime();

    setSwitchStatus({ type: 'success', message: res.message });
    setSwitchName('');
    setSwitchPin('');

    setTimeout(() => {
      setSwitchStatus({ type: 'idle', message: '' });
      setActiveTab('profile');
    }, 1100);
  };

  const handleDirectVipSwitch = () => {
    const vip = shopProfileManager.switchToTestVipProfile();
    refreshProfileLists();
    onProfileChanged(vip, { switchedAccount: true });
    soundManager.playWinChime();
    setSwitchStatus({
      type: 'success',
      message: 'Đã chuyển sang tài khoản Tester VIP (Cấp 27, $1,000,000)!',
    });
    setTimeout(() => {
      setSwitchStatus({ type: 'idle', message: '' });
      setActiveTab('profile');
    }, 900);
  };

  const handleRefillVip = () => {
    const vip = shopProfileManager.refillTestVipProfile();
    refreshProfileLists();
    onProfileChanged(vip, { switchedAccount: false });
    soundManager.playQuarterDrop();
    setSaveStatus({
      type: 'success',
      message: '⚡ Đã nạp lại $1,000,000 tiền mặt & đầy đủ giấy phép cho Tester VIP!',
    });
    setTimeout(() => {
      setSaveStatus({ type: 'idle', message: '' });
    }, 3000);
  };

  const handleQuickSwitch = (targetName: string) => {
    soundManager.playSelectSound();
    setSwitchName(targetName);
    setSwitchPin('');
    setSwitchStatus({
      type: 'idle',
      message: '',
    });
    setActiveTab('switch');
    setTimeout(() => {
      switchPinInputRef.current?.focus();
    }, 40);
  };

  const handleDeleteProfile = (id: string) => {
    const res = shopProfileManager.deleteProfile(id);
    if (res.success) {
      soundManager.playSelectSound();
      setConfirmDeleteId(null);
      setAllProfiles(shopProfileManager.getAllProfiles());
    }
  };

  const handleTrackChange = (track: BgmTrack) => {
    setSelectedTrack(track);
    soundManager.setTrack(track);
    soundManager.playSelectSound();
  };

  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    soundManager.setVolume(newVol);
  };

  const handleToggleMute = () => {
    const muted = soundManager.toggleMuted();
    setIsMuted(muted);
  };

  const handleNextTrack = () => {
    soundManager.playNextTrack(false);
    soundManager.playSelectSound();
  };

  const handleToggleRandom = () => {
    const nextRandom = soundManager.toggleRandomMode();
    setIsRandomMode(nextRandom);
    soundManager.playSelectSound();
  };

  const handleSaveTrack3 = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    soundManager.setTrack3Url(track3Input);
    soundManager.playSelectSound();
    setTrack3SavedMessage('Đã lưu bài nhạc #3 vào danh sách phát!');
    setTimeout(() => {
      setTrack3SavedMessage('');
    }, 3000);
  };

  const handleResetShop = () => {
    const updated = shopProfileManager.resetActiveProfileShop();
    refreshProfileLists();
    onProfileChanged(updated, { switchedAccount: true });
    soundManager.playQuarterDrop();
    setConfirmReset(false);
  };

  const filteredHistory = currentProfile.history.filter((h) => {
    if (historyFilter === 'all') return true;
    return h.category === historyFilter;
  });

  const s = currentProfile.shopState;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/85 p-3 sm:p-6 backdrop-blur-md select-none">
      <div className="relative flex h-[90vh] max-h-[730px] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border-2 border-amber-500/40 bg-zinc-950 shadow-[0_0_50px_rgba(245,158,11,0.25)] text-white">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900/80 px-5 sm:px-6 py-4">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl shadow-md text-black font-black text-lg border border-white/20"
              style={{ backgroundColor: currentProfile.avatarColor || '#f59e0b' }}
            >
              {currentProfile.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-black text-amber-300 truncate">{currentProfile.name}</h2>
                <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-[10px] font-black text-amber-400 border border-amber-500/30">
                  Shop Lv.{s.storeLevel}
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-sky-500/15 px-2.5 py-0.5 text-[10px] font-bold text-sky-300 border border-sky-500/30">
                  <Store className="h-3 w-3" />
                  {s.shopName}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-zinc-400 mt-0.5">
                <DollarSign className="h-3.5 w-3.5 text-emerald-400" />
                <span className="font-bold text-emerald-300">${s.cash.toFixed(2)}</span>
                <span>•</span>
                <span>Ngày {s.currentDay || 1}</span>
                <span>•</span>
                <span>Mật khẩu: ••••</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              soundManager.playSelectSound();
              onClose();
            }}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white transition cursor-pointer"
            title="Đóng [ESC]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex overflow-x-auto border-b border-zinc-800 bg-zinc-900/40 px-4">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs sm:text-sm font-bold whitespace-nowrap transition cursor-pointer ${
              activeTab === 'profile'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <User className="h-4 w-4" />
            <span>Tài Khoản & Mật Khẩu</span>
          </button>

          <button
            onClick={() => setActiveTab('switch')}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs sm:text-sm font-bold whitespace-nowrap transition cursor-pointer ${
              activeTab === 'switch'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Users className="h-4 w-4" />
            <span>Đổi Người Chơi ({allProfiles.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs sm:text-sm font-bold whitespace-nowrap transition cursor-pointer ${
              activeTab === 'history'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <History className="h-4 w-4" />
            <span>Lịch Sử Tiệm ({currentProfile.history.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('audio')}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs sm:text-sm font-bold whitespace-nowrap transition cursor-pointer ${
              activeTab === 'audio'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Volume2 className="h-4 w-4" />
            <span>Âm Nhạc & Hệ Thống</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6">
          {/* TAB 1: Profile & Password Editing */}
          {activeTab === 'profile' && (
            <div className="mx-auto max-w-xl space-y-6">
              {currentProfile.id === TEST_VIP_PROFILE_ID && (
                <div className="rounded-2xl border-2 border-purple-500/60 bg-gradient-to-r from-purple-950/80 via-indigo-950/60 to-zinc-950 p-4 shadow-xl">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-500 text-white font-black text-lg shadow-md">
                        ⚡
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-purple-200 text-sm">Tài Khoản Test VIP Đang Hoạt Động</span>
                          <span className="rounded-full bg-purple-500/30 px-2 py-0.5 text-[10px] font-bold text-purple-300 border border-purple-400/30">
                            CẤP 27 • $1,000,000
                          </span>
                        </div>
                        <p className="text-xs text-zinc-400">
                          Tài khoản chuyên test: mở sẵn toàn bộ kệ 1F & 2F, mọi pack/box, nhân viên và không giới hạn tiền.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleRefillVip}
                      className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 px-3.5 py-2 text-xs font-black text-white hover:from-purple-400 hover:to-indigo-500 shadow-md cursor-pointer transition"
                    >
                      <Zap className="h-4 w-4" />
                      <span>NẠP LẠI $1,000,000 & FULL TIỆM</span>
                    </button>
                  </div>
                </div>
              )}

              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
                <div className="flex items-center gap-3 mb-4">
                  <ShieldCheck className="h-6 w-6 text-emerald-400 shrink-0" />
                  <div>
                    <h3 className="font-bold text-white text-base">Hồ Sơ Chủ Tiệm & Mật Khẩu Database</h3>
                    <p className="text-xs text-zinc-400">
                      Tên người chơi, mật khẩu và toàn bộ dữ liệu cửa hàng Pokémon được lưu riêng cho từng tài khoản trong database.
                    </p>
                  </div>
                </div>

                <form onSubmit={handleSaveProfile} className="space-y-4">
                  {/* Player Name */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                      Tên Người Chơi (Chủ Tiệm)
                    </label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Nhập tên người chơi..."
                      maxLength={24}
                      required
                      className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-2.5 text-sm font-bold text-white placeholder-zinc-600 focus:border-amber-400 focus:outline-none"
                    />
                  </div>

                  {/* Shop Name */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                      Tên Cửa Hàng Pokémon
                    </label>
                    <input
                      type="text"
                      value={editShopName}
                      onChange={(e) => setEditShopName(e.target.value)}
                      placeholder="Nhập tên tiệm thẻ bài..."
                      maxLength={36}
                      required
                      className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-2.5 text-sm font-bold text-sky-300 placeholder-zinc-600 focus:border-amber-400 focus:outline-none"
                    />
                  </div>

                  {/* Password / PIN */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                        Mật Khẩu / Mã PIN Bảo Mật (4–20 ký tự)
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowEditPin(!showEditPin)}
                        className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-amber-400 cursor-pointer"
                      >
                        {showEditPin ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        <span>{showEditPin ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}</span>
                      </button>
                    </div>
                    <input
                      type={showEditPin ? 'text' : 'password'}
                      value={editPin}
                      onChange={(e) => setEditPin(e.target.value.replace(/\s/g, '').slice(0, 20))}
                      placeholder="Nhập mật khẩu hoặc mã PIN (VD: 1234)..."
                      maxLength={20}
                      required
                      className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-2.5 text-sm font-mono font-bold tracking-widest text-amber-300 placeholder-zinc-600 focus:border-amber-400 focus:outline-none"
                    />
                    <p className="mt-1 text-[11px] text-zinc-500">
                      Dùng để bảo vệ cửa hàng, kho thẻ hiếm và số dư tiền của bạn khi nhiều người chơi chung thiết bị.
                    </p>
                  </div>

                  {/* Avatar Color */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
                      Màu Phù Hiệu Đại Diện
                    </label>
                    <div className="flex gap-2">
                      {AVATAR_COLORS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setAvatarColor(c)}
                          className={`h-9 w-9 rounded-xl border-2 transition cursor-pointer ${
                            avatarColor === c ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-70 hover:opacity-100'
                          }`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>

                  {saveStatus.message && (
                    <div
                      className={`flex items-center gap-2 rounded-xl p-3 text-xs font-bold ${
                        saveStatus.type === 'success'
                          ? 'bg-emerald-950/80 border border-emerald-500/50 text-emerald-300'
                          : 'bg-red-950/80 border border-red-500/50 text-red-300'
                      }`}
                    >
                      {saveStatus.type === 'success' ? (
                        <Check className="h-4 w-4 shrink-0" />
                      ) : (
                        <AlertCircle className="h-4 w-4 shrink-0" />
                      )}
                      <span>{saveStatus.message}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-600 py-3 font-black text-black shadow-lg hover:from-amber-300 hover:to-amber-500 cursor-pointer transition"
                  >
                    <Check className="h-4 w-4 stroke-[3]" />
                    <span>LƯU CÀI ĐẶT TÀI KHOẢN</span>
                  </button>
                </form>
              </div>

              {/* Shop Stats Overview */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3 text-center">
                  <div className="text-[10px] text-zinc-400 font-bold uppercase">Tổng Doanh Thu</div>
                  <div className="text-lg font-black text-emerald-400 mt-1">
                    ${s.totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </div>
                </div>

                <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3 text-center">
                  <div className="text-[10px] text-zinc-400 font-bold uppercase">Khách Đã Phục Vụ</div>
                  <div className="text-lg font-black text-white mt-1">{s.customersServedCount}</div>
                </div>

                <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3 text-center">
                  <div className="text-[10px] text-zinc-400 font-bold uppercase">Pack Đã Xé</div>
                  <div className="text-lg font-black text-amber-300 mt-1">{s.packsOpenedCount}</div>
                </div>

                <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3 text-center">
                  <div className="text-[10px] text-zinc-400 font-bold uppercase">Uy Tín Tiệm</div>
                  <div className="text-lg font-black text-sky-400 mt-1">{s.reputation}/100</div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Multi-User Account Switching & Registration */}
          {activeTab === 'switch' && (
            <div className="mx-auto max-w-xl space-y-6">
              {/* VIP Quick-Switcher Banner */}
              <div className="flex items-center justify-between gap-3 rounded-2xl border-2 border-purple-500/50 bg-gradient-to-r from-purple-950/70 via-indigo-950/50 to-zinc-950 p-4 shadow-lg shadow-purple-950/30">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-500 text-white font-black text-lg shadow-md">
                    ⚡
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-purple-200 text-sm">Tài Khoản Test VIP</span>
                      <span className="rounded-full bg-purple-500/30 border border-purple-400/40 px-2 py-0.5 text-[10px] font-black text-purple-300">
                        MAX CẤP + $1,000,000
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400">
                      Tất cả bản quyền thẻ (Pokémon + One Piece), kệ 1F & 2F, nhân viên đều mở khóa sẵn để test không giới hạn.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleDirectVipSwitch}
                  disabled={currentProfile.id === TEST_VIP_PROFILE_ID}
                  className={`shrink-0 rounded-xl px-3.5 py-2 text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                    currentProfile.id === TEST_VIP_PROFILE_ID
                      ? 'bg-purple-900/40 text-purple-300/60 border border-purple-500/20 cursor-default'
                      : 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white hover:from-purple-400 hover:to-indigo-500 shadow-lg'
                  }`}
                >
                  <Zap className="h-3.5 w-3.5" />
                  <span>{currentProfile.id === TEST_VIP_PROFILE_ID ? 'Đang Sử Dụng' : 'Chuyển Ngay'}</span>
                </button>
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
                <div className="flex items-center gap-3 mb-4">
                  <ArrowRightLeft className="h-6 w-6 text-amber-400 shrink-0" />
                  <div>
                    <h3 className="font-bold text-white text-base">Đăng Nhập Hoặc Tạo Tài Khoản Mới</h3>
                    <p className="text-xs text-zinc-400">
                      Nhập tên và mật khẩu để tải lại tiệm của bạn. Nếu tên chưa có trong database, hệ thống sẽ tự động tạo cửa hàng mới với vốn $2,500!
                    </p>
                  </div>
                </div>

                <form onSubmit={handleSwitchAccount} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1">
                      Tên Người Chơi
                    </label>
                    <input
                      type="text"
                      value={switchName}
                      onChange={(e) => setSwitchName(e.target.value)}
                      placeholder="Nhập tên người chơi..."
                      maxLength={24}
                      required
                      className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-2.5 text-sm font-bold text-white placeholder-zinc-600 focus:border-amber-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400">
                        Mật Khẩu / Mã PIN (4–20 ký tự)
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowSwitchPin(!showSwitchPin)}
                        className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-amber-400 cursor-pointer"
                      >
                        {showSwitchPin ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        <span>{showSwitchPin ? 'Ẩn' : 'Hiện'}</span>
                      </button>
                    </div>
                    <input
                      ref={switchPinInputRef}
                      type={showSwitchPin ? 'text' : 'password'}
                      value={switchPin}
                      onChange={(e) => setSwitchPin(e.target.value.replace(/\s/g, '').slice(0, 20))}
                      placeholder="Nhập mật khẩu hoặc mã PIN..."
                      maxLength={20}
                      required
                      className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-2.5 text-sm font-mono font-bold tracking-widest text-amber-300 placeholder-zinc-600 focus:border-amber-400 focus:outline-none"
                    />
                  </div>

                  {switchStatus.message && (
                    <div
                      className={`flex items-center gap-2 rounded-xl p-3 text-xs font-bold ${
                        switchStatus.type === 'success'
                          ? 'bg-emerald-950/80 border border-emerald-500/50 text-emerald-300'
                          : 'bg-red-950/80 border border-red-500/50 text-red-300'
                      }`}
                    >
                      {switchStatus.type === 'success' ? (
                        <Check className="h-4 w-4 shrink-0" />
                      ) : (
                        <AlertCircle className="h-4 w-4 shrink-0" />
                      )}
                      <span>{switchStatus.message}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-600 py-3 font-black text-black shadow-lg hover:from-amber-300 hover:to-amber-500 cursor-pointer transition"
                  >
                    <KeyRound className="h-4 w-4" />
                    <span>ĐĂNG NHẬP / TẠO TÀI KHOẢN MỚI</span>
                  </button>
                </form>
              </div>

              {/* Saved profiles list */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3">
                  Danh Sách Tài Khoản Trong Database ({allProfiles.length})
                </h4>
                <div className="space-y-2">
                  {allProfiles.map((p) => {
                    const isCurrent = p.id === currentProfile.id;
                    const isVip = p.id === TEST_VIP_PROFILE_ID;
                    const isConfirmingDel = confirmDeleteId === p.id;
                    return (
                      <div
                        key={p.id}
                        className={`flex items-center justify-between gap-3 rounded-xl border p-3 transition ${
                          isCurrent
                            ? isVip
                              ? 'border-purple-500/70 bg-purple-950/30'
                              : 'border-amber-500/60 bg-amber-950/20'
                            : isVip
                            ? 'border-purple-500/30 bg-purple-950/15 hover:border-purple-500/50'
                            : 'border-zinc-800 bg-zinc-900/40 hover:border-zinc-700'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-black font-black text-sm"
                            style={{ backgroundColor: p.avatarColor || '#f59e0b' }}
                          >
                            {isVip ? '⚡' : p.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-white text-sm truncate">{p.name}</span>
                              {isVip && (
                                <span className="rounded bg-purple-500/30 px-1.5 py-0.5 text-[10px] font-black text-purple-300 border border-purple-500/40">
                                  Tài Khoản Test
                                </span>
                              )}
                              {isCurrent && (
                                <span
                                  className={`rounded px-1.5 py-0.5 text-[10px] font-black ${
                                    isVip
                                      ? 'bg-purple-500 text-white'
                                      : 'bg-amber-500/30 text-amber-300'
                                  }`}
                                >
                                  Đang đăng nhập
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-zinc-400 truncate">
                              <span className="text-emerald-300 font-bold">${p.shopState.cash.toFixed(2)}</span> •{' '}
                              <span>Lv.{p.shopState.storeLevel}</span> •{' '}
                              <span>Ngày {p.shopState.currentDay || 1}</span> •{' '}
                              <span className="text-sky-300">{p.shopState.shopName}</span>
                            </div>
                          </div>
                        </div>

                        {!isCurrent && (
                          <div className="flex items-center gap-1.5 shrink-0">
                            {isVip ? (
                              <button
                                type="button"
                                onClick={handleDirectVipSwitch}
                                className="rounded-lg border border-purple-500/50 bg-purple-900/40 px-3 py-1.5 text-xs font-black text-purple-200 hover:bg-purple-600 hover:text-white transition cursor-pointer"
                              >
                                Vào Test VIP
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleQuickSwitch(p.name)}
                                className="rounded-lg border border-amber-500/40 bg-zinc-950 px-3 py-1.5 text-xs font-bold text-amber-300 hover:bg-amber-500 hover:text-black transition cursor-pointer"
                              >
                                Đăng nhập
                              </button>
                            )}

                            {!isVip && (
                              isConfirmingDel ? (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteProfile(p.id)}
                                  className="rounded-lg border border-red-500 bg-red-600 px-2.5 py-1.5 text-[11px] font-black text-white hover:bg-red-500 cursor-pointer"
                                >
                                  Xác nhận xóa
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteId(p.id)}
                                  title="Xóa tài khoản này khỏi thiết bị"
                                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-500 hover:border-red-500/50 hover:text-red-400 cursor-pointer transition"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              )
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Shop Activity History */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-1.5 bg-zinc-900 p-1 rounded-xl border border-zinc-800 flex-wrap">
                  {(
                    [
                      { id: 'all', label: 'Tất Cả' },
                      { id: 'sale', label: 'Bán Hàng' },
                      { id: 'delivery', label: 'PokeShip' },
                      { id: 'order', label: 'Nhập Hàng' },
                      { id: 'pull', label: 'Mở Thẻ' },
                      { id: 'upgrade', label: 'Nâng Cấp' },
                    ] as const
                  ).map((filter) => (
                    <button
                      key={filter.id}
                      onClick={() => setHistoryFilter(filter.id)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                        historyFilter === filter.id
                          ? 'bg-amber-500 text-black shadow'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>

                <div className="text-xs text-zinc-400">
                  Hiển thị <span className="font-bold text-amber-300">{filteredHistory.length}</span> giao dịch gần nhất
                </div>
              </div>

              {filteredHistory.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center text-zinc-500">
                  <History className="h-12 w-12 stroke-[1.5] mb-2 text-zinc-600" />
                  <p className="font-medium text-sm">Chưa có giao dịch nào trong mục này.</p>
                  <p className="text-xs text-zinc-600 mt-1">
                    Hãy nhập hàng trên Tablet, xé pack hoặc thu tiền khách tại quầy POS!
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[450px] overflow-y-auto pr-1">
                  {filteredHistory.map((item) => {
                    const timeStr = new Date(item.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    });
                    const dateStr = new Date(item.timestamp).toLocaleDateString([], {
                      month: 'numeric',
                      day: 'numeric',
                    });

                    return (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-3 rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-3 hover:bg-zinc-900/70 transition"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-black ${
                              item.isIncome
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            }`}
                          >
                            {item.isIncome ? '+' : '-'}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-white truncate">{item.title}</span>
                              <span className="text-[10px] text-zinc-500 shrink-0">
                                {dateStr} {timeStr}
                              </span>
                            </div>
                            <p className="text-xs text-zinc-400 truncate">{item.detail}</p>
                          </div>
                        </div>

                        {item.amount !== 0 && (
                          <div
                            className={`text-sm font-black tabular-nums shrink-0 ${
                              item.isIncome ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {item.isIncome
                              ? `+$${Math.abs(item.amount).toFixed(2)}`
                              : `-$${Math.abs(item.amount).toFixed(2)}`}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: Audio & System Reset */}
          {activeTab === 'audio' && (
            <div className="mx-auto max-w-xl space-y-6">
              <div className="rounded-2xl border border-amber-500/30 bg-zinc-900/80 p-5 shadow-xl">
                <div className="flex items-center justify-between gap-2 mb-4">
                  <div className="flex items-center gap-2">
                    <Music className="h-5 w-5 text-amber-400 animate-pulse" />
                    <h3 className="font-bold text-white text-base">Nhạc Nền Theo Khung Giờ (Sáng · Chiều · Tối)</h3>
                  </div>
                  <button
                    type="button"
                    onClick={handleToggleRandom}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black border transition cursor-pointer ${
                      isScheduleMode
                        ? 'border-emerald-500/80 bg-emerald-950/80 text-emerald-300'
                        : isRandomMode
                        ? 'border-amber-500/80 bg-amber-950/80 text-amber-300'
                        : 'border-zinc-700 bg-zinc-800 text-zinc-400'
                    }`}
                    title="Chuyển giữa tự động theo khung giờ Sáng/Chiều/Tối và phát ngẫu nhiên"
                  >
                    <Shuffle className="h-3.5 w-3.5" />
                    <span>
                      {isScheduleMode ? '🕒 Theo Sáng/Chiều/Tối' : isRandomMode ? '🎲 Random: BẬT' : '🎵 Chọn Thủ Công'}
                    </span>
                  </button>
                </div>

                {/* Now Playing Banner */}
                <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3.5 flex items-center justify-between gap-3 mb-4">
                  <div className="min-w-0">
                    <div className="text-[10px] uppercase font-black text-amber-400 tracking-wider">
                      {isScheduleMode
                        ? '🕒 Tự Động Theo Thời Gian Game'
                        : isRandomMode
                        ? '🎲 Đang Phát Ngẫu Nhiên'
                        : '🎵 Đang Phát Thủ Công'}
                    </div>
                    <div className="text-sm font-bold text-white truncate mt-0.5">
                      {currentTrackItem ? currentTrackItem.title : 'Đang chọn giai điệu...'}
                    </div>
                    <div className="text-[11px] text-zinc-500 truncate font-mono">
                      {currentTrackItem ? currentTrackItem.url : 'Chưa phát'}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleNextTrack}
                    className="flex items-center gap-1.5 rounded-xl border border-amber-500/60 bg-amber-500/20 px-3 py-2 text-xs font-bold text-amber-300 hover:bg-amber-500/30 transition cursor-pointer shrink-0"
                    title="Chuyển sang bài nhạc khác ngay lập tức"
                  >
                    <SkipForward className="h-4 w-4" />
                    <span>Đổi Bài</span>
                  </button>
                </div>

                {/* 3 Tracks List */}
                <div className="space-y-2.5">
                  <span className="text-xs font-bold text-zinc-300">
                    Lịch Phát 3 Bài Nhạc (Bài 3 Sáng · Bài 2 Chiều · Bài 1 Tối):
                  </span>
                  
                  {/* Track 1 -> Buổi Tối */}
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-950 p-2.5">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-purple-500/20 border border-purple-500/40 text-[10px] font-black text-purple-300">
                          1
                        </span>
                        <span className="text-xs font-bold text-zinc-200">
                          Bài #1 (Sudden Purple) — 🌙 Buổi Tối (18:00–05:30)
                        </span>
                      </div>
                      <span className="text-[10px] text-zinc-500 block truncate font-mono ml-7">
                        /audio/bgm_edgeone_1.mp3
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleTrackChange('track_1')}
                      className={`shrink-0 rounded-lg px-2.5 py-1 text-xs font-bold transition cursor-pointer ${
                        selectedTrack === 'track_1'
                          ? 'bg-purple-600 text-white'
                          : 'border border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-purple-400'
                      }`}
                    >
                      {selectedTrack === 'track_1' ? '▶ Đang Chọn' : 'Phát Ngay'}
                    </button>
                  </div>

                  {/* Track 2 -> Buổi Chiều */}
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-950 p-2.5">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500/20 border border-amber-500/40 text-[10px] font-black text-amber-300">
                          2
                        </span>
                        <span className="text-xs font-bold text-zinc-200">
                          Bài #2 (Desperate Orange) — 🌇 Buổi Chiều (12:00–18:00)
                        </span>
                      </div>
                      <span className="text-[10px] text-zinc-500 block truncate font-mono ml-7">
                        /audio/bgm_edgeone_2.mp3
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleTrackChange('track_2')}
                      className={`shrink-0 rounded-lg px-2.5 py-1 text-xs font-bold transition cursor-pointer ${
                        selectedTrack === 'track_2'
                          ? 'bg-amber-600 text-white'
                          : 'border border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-amber-400'
                      }`}
                    >
                      {selectedTrack === 'track_2' ? '▶ Đang Chọn' : 'Phát Ngay'}
                    </button>
                  </div>

                  {/* Track 3 -> Buổi Sáng */}
                  <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cyan-500/20 border border-cyan-500/40 text-[10px] font-black text-cyan-300">
                          3
                        </span>
                        <span className="text-xs font-bold text-zinc-200">
                          Bài #3 (Lofi Study) — 🌅 Buổi Sáng (05:30–12:00)
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleTrackChange('track_3')}
                        className={`shrink-0 rounded-lg px-2.5 py-1 text-xs font-bold transition cursor-pointer ${
                          selectedTrack === 'track_3'
                            ? 'bg-cyan-600 text-white'
                            : 'border border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-cyan-400'
                        }`}
                      >
                        {selectedTrack === 'track_3' ? '▶ Đang Chọn' : 'Phát Ngay'}
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="url"
                        placeholder="Dán link bài nhạc thứ 3 tại đây (https://...)"
                        value={track3Input}
                        onChange={(e) => setTrack3Input(e.target.value)}
                        className="flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:border-amber-400 focus:outline-none font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveTrack3()}
                        className="rounded-lg border border-amber-500/60 bg-amber-500/20 px-3 py-1.5 text-xs font-bold text-amber-300 hover:bg-amber-500/30 transition cursor-pointer shrink-0"
                      >
                        Lưu Link #3
                      </button>
                    </div>
                    {track3SavedMessage && (
                      <p className="text-[11px] font-bold text-emerald-400">{track3SavedMessage}</p>
                    )}
                  </div>
                </div>

                {/* Volume Slider */}
                <div className="mt-5 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-zinc-400">
                    <span>Âm Lượng Nhạc Nền</span>
                    <span className="text-amber-300 font-mono">{Math.round(volume * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={volume}
                    onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                    className="w-full accent-amber-400 cursor-pointer"
                  />
                </div>

                {/* Mute button */}
                <div className="mt-4 flex items-center justify-between pt-4 border-t border-zinc-800">
                  <span className="text-xs font-bold text-zinc-300">Tắt / Bật Âm Thanh Toàn Bộ</span>
                  <button
                    type="button"
                    onClick={handleToggleMute}
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                      isMuted ? 'bg-red-500 text-white' : 'bg-emerald-600/90 text-white hover:bg-emerald-500'
                    }`}
                  >
                    {isMuted ? '🔇 Đang Tắt Âm' : '🔊 Đang Bật Âm'}
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-red-950/60 bg-red-950/20 p-5">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <h4 className="font-bold text-red-300 text-sm">Khởi Lại Tiến Trình Tiệm Của {currentProfile.name}</h4>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Đặt lại cửa hàng hiện tại về Ngày 1 với vốn $2,500 (tài khoản & mật khẩu vẫn giữ nguyên, không ảnh hưởng người chơi khác).
                    </p>
                  </div>
                  {confirmReset ? (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setConfirmReset(false)}
                        className="rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs font-bold text-zinc-300 hover:bg-zinc-800 cursor-pointer"
                      >
                        Hủy
                      </button>
                      <button
                        type="button"
                        onClick={handleResetShop}
                        className="flex items-center gap-1.5 rounded-xl bg-red-600 px-3.5 py-2 text-xs font-black text-white hover:bg-red-500 cursor-pointer"
                      >
                        <RotateCcw className="h-4 w-4" />
                        <span>Xác Nhận Reset</span>
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmReset(true)}
                      className="flex items-center gap-1.5 rounded-xl border border-red-500/40 bg-red-950 px-3.5 py-2 text-xs font-bold text-red-300 hover:bg-red-900 transition cursor-pointer"
                    >
                      <RotateCcw className="h-4 w-4" />
                      <span>Reset Tiệm</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
