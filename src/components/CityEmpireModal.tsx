import React, { useState } from 'react';
import {
  AlertTriangle,
  Building2,
  Crown,
  DollarSign,
  Shield,
  ShieldAlert,
  Sparkles,
  Store,
  Trophy,
  X,
} from 'lucide-react';
import { ShopState } from '../game/pokemonShopLogic';
import {
  LUXURY_ASSETS_CATALOG,
  SATELLITE_KIOSK_CATALOG,
  SHOP_SECURITY_TIERS,
  getLuxuryAssetBuffs,
  getTrophyBuffs,
} from '../game/shopExpansionSystems';
import { soundManager } from '../game/audio';

export type CityEmpireTab = 'luxury_kiosk' | 'security_trophies';

interface CityEmpireModalProps {
  shopState: ShopState;
  initialTab?: CityEmpireTab;
  onBuyLuxuryAsset: (assetId: string) => void;
  onUnlockOrUpgradeKiosk: (kioskId: 'aeon_kiosk' | 'landmark_kiosk') => void;
  onCollectKioskCash: (kioskId: 'aeon_kiosk' | 'landmark_kiosk') => void;
  onUpgradeSecurity: () => void;
  onCatchShoplifter: () => void;
  onOpenTournamentArena: () => void;
  onClose: () => void;
}

export const CityEmpireModal: React.FC<CityEmpireModalProps> = ({
  shopState,
  initialTab = 'luxury_kiosk',
  onBuyLuxuryAsset,
  onUnlockOrUpgradeKiosk,
  onCollectKioskCash,
  onUpgradeSecurity,
  onCatchShoplifter,
  onOpenTournamentArena,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<CityEmpireTab>(initialTab);

  const ownedAssets = shopState.ownedLuxuryAssets || [];
  const assetBuffs = getLuxuryAssetBuffs(ownedAssets);
  const kiosks = shopState.satelliteKiosks || {};
  const trophies = shopState.trophyCollection || [];
  const trophyBuffs = getTrophyBuffs(trophies);
  const secLevel = shopState.securityLevel || 0;
  const currentSecTier =
    SHOP_SECURITY_TIERS[Math.min(2, Math.max(0, secLevel))] || SHOP_SECURITY_TIERS[0];
  const nextSecTier = SHOP_SECURITY_TIERS[secLevel + 1];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-2 sm:p-5 select-none animate-in fade-in duration-200">
      <div className="relative flex h-[92vh] max-h-[820px] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-amber-500/40 bg-[#0b0e14] text-zinc-100 shadow-[0_24px_80px_rgba(0,0,0,0.92)]">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800/90 bg-gradient-to-r from-[#111520] via-[#171b28] to-[#111520] px-5 py-3.5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-amber-400/50 bg-gradient-to-br from-amber-500/25 to-rose-500/20 text-amber-300 shadow-lg">
              <Crown className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black uppercase tracking-wide text-amber-300">
                  Trung Tâm Đế Chế TCG & Thành Phố 3D
                </h2>
                <span className="rounded bg-emerald-500/15 border border-emerald-500/40 px-2 py-0.5 text-[10px] font-black text-emerald-300">
                  LV.{shopState.storeLevel}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">
                Luxury & Tài Sản Xa Xỉ · Kiosk Chi Nhánh AEON / Landmark 81 · An Ninh & Tủ Cúp
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="rounded-xl border border-emerald-500/35 bg-emerald-950/50 px-3 py-1.5 text-right">
              <div className="text-[10px] font-bold uppercase text-emerald-400">Quỹ Shop</div>
              <div className="text-sm font-black text-emerald-200 font-mono">
                ${shopState.cash.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </div>
            </div>
            <button
              onClick={onClose}
              aria-label="Đóng trung tâm đế chế"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-amber-400 hover:text-white transition cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-zinc-800/80 bg-[#0e121b] px-5 py-2.5">
          {[
            {
              id: 'luxury_kiosk' as CityEmpireTab,
              label: 'Luxury & Kiosk Chi Nhánh',
              icon: <Building2 className="h-4 w-4" />,
              badge: `${ownedAssets.length}/5`,
            },
            {
              id: 'security_trophies' as CityEmpireTab,
              label: 'An Ninh & Tủ Cúp',
              icon: <Shield className="h-4 w-4" />,
              badge: shopState.activeSecurityAlert ? '🚨 TRỘM!' : `${trophies.length} Cúp`,
            },
          ].map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  soundManager.playSelectSound();
                  setActiveTab(tab.id);
                }}
                className={`flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-black transition cursor-pointer ${
                  active
                    ? 'border-amber-400 bg-amber-500/20 text-amber-200 shadow-md'
                    : 'border-zinc-800 bg-zinc-900/70 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                <span
                  className={`rounded-md px-1.5 py-0.5 text-[10px] font-black ${
                    tab.id === 'security_trophies' && shopState.activeSecurityAlert
                      ? 'bg-red-500 text-white animate-pulse'
                      : active
                      ? 'bg-amber-400/25 text-amber-200'
                      : 'bg-zinc-800 text-zinc-400'
                  }`}
                >
                  {tab.badge}
                </span>
              </button>
            );
          })}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* TAB 1: LUXURY LIFESTYLE & SATELLITE KIOSKS */}
          {activeTab === 'luxury_kiosk' && (
            <div className="space-y-6">
              {/* Active Buff Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-xl border border-purple-500/35 bg-purple-950/25 p-3">
                  <div className="text-[10px] font-bold text-purple-300 uppercase">Mặc Cả & Hoa Hồng</div>
                  <div className="text-sm font-black text-white mt-0.5">
                    +{assetBuffs.haggleBonusPct}% Haggle · +{assetBuffs.commissionBonusPct}% HH
                  </div>
                </div>
                <div className="rounded-xl border border-rose-500/35 bg-rose-950/25 p-3">
                  <div className="text-[10px] font-bold text-rose-300 uppercase">Tip PokeShip 3D</div>
                  <div className="text-sm font-black text-white mt-0.5">
                    +{assetBuffs.pokeshipTipBonusPct}% Tiền Tip
                  </div>
                </div>
                <div className="rounded-xl border border-sky-500/35 bg-sky-950/25 p-3">
                  <div className="text-[10px] font-bold text-sky-300 uppercase">Phòng Lab & Grail</div>
                  <div className="text-sm font-black text-white mt-0.5">
                    +{assetBuffs.gradingSpeedBonusPct}% Tốc Độ · +{assetBuffs.grailValuationBonusPct}% Grail
                  </div>
                </div>
                <div className="rounded-xl border border-emerald-500/35 bg-emerald-950/25 p-3">
                  <div className="text-[10px] font-bold text-emerald-300 uppercase">Danh Tiếng / Ngày</div>
                  <div className="text-sm font-black text-emerald-300 mt-0.5">
                    +${assetBuffs.dailyPassiveBonusCash}/ngày
                  </div>
                </div>
              </div>

              {/* Luxury Assets */}
              <div>
                <h3 className="text-sm font-black uppercase text-purple-300 mb-3 flex items-center gap-2">
                  <Sparkles className="h-4 w-4" /> 1. Tài Sản Xa Xỉ Thành Phố (Mang Buff Vĩnh Viễn)
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {LUXURY_ASSETS_CATALOG.map((asset) => {
                    const isOwned = ownedAssets.includes(asset.id);
                    return (
                      <div
                        key={asset.id}
                        className={`rounded-2xl border p-4 flex flex-col justify-between gap-3 ${
                          isOwned
                            ? 'border-emerald-500/50 bg-emerald-950/20'
                            : 'border-zinc-800 bg-[#121622]'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-2xl">{asset.icon}</span>
                            <span className="text-[10px] font-bold text-zinc-400">
                              {asset.storeName}
                            </span>
                          </div>
                          <div className="text-sm font-black text-white mt-1.5">{asset.name}</div>
                          <p className="text-xs text-amber-200/90 mt-1 leading-relaxed">
                            {asset.buffSummary}
                          </p>
                        </div>

                        {isOwned ? (
                          <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/15 py-2 text-center text-xs font-black text-emerald-300">
                            ✅ Đã Sở Hữu & Kích Hoạt Buff
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              soundManager.playCashRegister();
                              onBuyLuxuryAsset(asset.id);
                            }}
                            disabled={shopState.cash < asset.price}
                            className="w-full rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 py-2 text-xs font-black text-white hover:brightness-110 disabled:opacity-40 cursor-pointer"
                          >
                            Mua Ngay (${asset.price.toLocaleString()})
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Satellite Kiosks */}
              <div>
                <h3 className="text-sm font-black uppercase text-amber-300 mb-3 flex items-center gap-2">
                  <Store className="h-4 w-4" /> 2. Nhượng Quyền Kiosk Vệ Tinh (AEON Mall & Landmark 81)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {SATELLITE_KIOSK_CATALOG.map((cfg) => {
                    const state = kiosks[cfg.id] || {
                      id: cfg.id,
                      unlocked: false,
                      tier: 1,
                      uncollectedCash: 0,
                      totalEarned: 0,
                      itemsSold: 0,
                    };
                    const levelMet = shopState.storeLevel >= cfg.unlockLevel;
                    const upgradeCost = cfg.upgradeCostBase * state.tier;

                    return (
                      <div
                        key={cfg.id}
                        className="rounded-2xl border border-amber-500/35 bg-[#121622] p-4 flex flex-col justify-between gap-3"
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-black text-amber-200">{cfg.name}</span>
                            <span className="rounded bg-zinc-800 px-2 py-0.5 text-[10px] font-black text-zinc-300">
                              {state.unlocked ? `Cấp Kiosk ${state.tier}/3` : `Mở khóa Lv.${cfg.unlockLevel}`}
                            </span>
                          </div>
                          <p className="text-xs text-zinc-400 mt-1">{cfg.description}</p>
                          {state.unlocked && (
                            <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-black/40 p-2.5 text-xs">
                              <div>
                                <div className="text-[10px] text-zinc-400">Chờ Thu</div>
                                <div className="font-black text-emerald-300">
                                  ${state.uncollectedCash.toFixed(0)}
                                </div>
                              </div>
                              <div>
                                <div className="text-[10px] text-zinc-400">Tổng Thu</div>
                                <div className="font-bold text-white">
                                  ${state.totalEarned.toFixed(0)}
                                </div>
                              </div>
                              <div>
                                <div className="text-[10px] text-zinc-400">Đã Bán</div>
                                <div className="font-bold text-sky-300">{state.itemsSold} Pack</div>
                              </div>
                            </div>
                          )}
                        </div>

                        {!state.unlocked ? (
                          <button
                            onClick={() => {
                              soundManager.playCashRegister();
                              onUnlockOrUpgradeKiosk(cfg.id);
                            }}
                            disabled={!levelMet || shopState.cash < cfg.unlockCost}
                            className="w-full rounded-xl bg-amber-500 py-2.5 text-xs font-black text-black hover:bg-amber-400 disabled:opacity-40 cursor-pointer"
                          >
                            {levelMet
                              ? `Mở Kiosk Nhượng Quyền ($${cfg.unlockCost.toLocaleString()})`
                              : `Cần Cấp Shop ${cfg.unlockLevel}`}
                          </button>
                        ) : (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                soundManager.playCashRegister();
                                onCollectKioskCash(cfg.id);
                              }}
                              disabled={state.uncollectedCash < 1}
                              className="flex-1 rounded-xl bg-emerald-600 py-2 text-xs font-black text-white hover:bg-emerald-500 disabled:opacity-40 cursor-pointer"
                            >
                              Thu Tiền (+${state.uncollectedCash.toFixed(0)})
                            </button>
                            {state.tier < 3 && (
                              <button
                                onClick={() => {
                                  soundManager.playSelectSound();
                                  onUnlockOrUpgradeKiosk(cfg.id);
                                }}
                                disabled={shopState.cash < upgradeCost}
                                className="rounded-xl border border-amber-500/40 bg-amber-950/40 px-3 py-2 text-xs font-black text-amber-200 hover:bg-amber-900/50 disabled:opacity-40 cursor-pointer"
                              >
                                Nâng Lv.{state.tier + 1} (${upgradeCost})
                              </button>
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

          {/* TAB 4: SHOP SECURITY & TROPHY CABINET */}
          {activeTab === 'security_trophies' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Security */}
              <div className="lg:col-span-6 space-y-4">
                <div className="rounded-2xl border border-sky-500/35 bg-[#111624] p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black uppercase text-sky-300 flex items-center gap-2">
                      <ShieldAlert className="h-4 w-4" /> Hệ Thống An Ninh & Chống Trộm Cắp
                    </h3>
                    <span className="rounded bg-sky-500/20 px-2 py-0.5 text-[10px] font-black text-sky-300">
                      Cấp {secLevel}/2
                    </span>
                  </div>
                  <div className="rounded-xl bg-black/40 p-3 space-y-2">
                    <div className="text-xs font-black text-white">{currentSecTier.name}</div>
                    <p className="text-xs text-zinc-400">{currentSecTier.description}</p>
                    <div className="flex flex-wrap gap-1.5 text-[10px] font-bold">
                      <span
                        className={`rounded-md px-2 py-0.5 border ${
                          secLevel >= 1
                            ? 'border-cyan-500/40 bg-cyan-950/50 text-cyan-300'
                            : 'border-zinc-800 bg-zinc-900/60 text-zinc-500'
                        }`}
                      >
                        {secLevel >= 1 ? '✓' : '○'} 2 Cổng Từ & 4 Camera AI 3D
                      </span>
                      <span
                        className={`rounded-md px-2 py-0.5 border ${
                          secLevel >= 2
                            ? 'border-emerald-500/40 bg-emerald-950/50 text-emerald-300'
                            : 'border-zinc-800 bg-zinc-900/60 text-zinc-500'
                        }`}
                      >
                        {secLevel >= 2 ? '✓' : '○'} Bảo Vệ 3D Đứng Cửa & Bàn CCTV
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-[11px] font-bold pt-0.5">
                      <span className="text-emerald-300">
                        🛡️ Đã Bắt: {shopState.securityStats?.theftsPrevented || 0}
                      </span>
                      <span className="text-amber-300">
                        🚓 Thưởng Công An: +${shopState.securityStats?.bountiesEarned || 0}
                      </span>
                    </div>
                  </div>

                  {shopState.activeSecurityAlert && (
                    <div className="rounded-xl border-2 border-red-500 bg-red-950/50 p-3.5 animate-pulse space-y-2">
                      <div className="flex items-center justify-between text-xs font-black text-red-200">
                        <span className="flex items-center gap-1.5">
                          <AlertTriangle className="h-4 w-4 text-red-400" />
                          CẢNH BÁO: {shopState.activeSecurityAlert.suspectName}
                        </span>
                        <span>
                          {Math.ceil(shopState.activeSecurityAlert.remainingMs / 1000)}s
                        </span>
                      </div>
                      <p className="text-[11px] text-red-100">
                        Đang lén tiếp cận {shopState.activeSecurityAlert.targetItemName}!
                      </p>
                      <button
                        onClick={() => {
                          soundManager.playCashRegister();
                          onCatchShoplifter();
                        }}
                        className="w-full rounded-xl bg-red-600 py-2 text-xs font-black text-white hover:bg-red-500 cursor-pointer"
                      >
                        🚨 Bắt Quả Tang & Giao Công An (+${shopState.activeSecurityAlert.bountyReward})
                      </button>
                    </div>
                  )}

                  {nextSecTier ? (
                    <button
                      onClick={() => {
                        soundManager.playCashRegister();
                        onUpgradeSecurity();
                      }}
                      disabled={shopState.cash < nextSecTier.cost}
                      className="w-full rounded-xl bg-sky-600 py-2.5 text-xs font-black text-white hover:bg-sky-500 disabled:opacity-40 cursor-pointer"
                    >
                      Nâng Cấp: {nextSecTier.name} (${nextSecTier.cost.toLocaleString()})
                    </button>
                  ) : (
                    <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/30 py-2 text-center text-xs font-black text-emerald-300">
                      ✅ Đã Trang Bị An Ninh Tối Đa
                    </div>
                  )}
                </div>
              </div>

              {/* Trophy Cabinet */}
              <div className="lg:col-span-6 space-y-4">
                <div className="rounded-2xl border border-amber-500/35 bg-[#15131f] p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black uppercase text-amber-300 flex items-center gap-2">
                      <Trophy className="h-4 w-4" /> Tủ Cúp Vô Địch Battle Arena ({trophies.length})
                    </h3>
                    <button
                      onClick={() => {
                        soundManager.playSelectSound();
                        onOpenTournamentArena();
                      }}
                      className="rounded-lg bg-amber-500/20 border border-amber-400/50 px-2.5 py-1 text-[11px] font-black text-amber-200 hover:bg-amber-500/30 cursor-pointer"
                    >
                      Mở Giải Đấu →
                    </button>
                  </div>

                  <div className="rounded-xl bg-black/40 p-3 text-xs text-zinc-300 flex items-center justify-between">
                    <span>Buff Tủ Cúp Đang Có:</span>
                    <span className="font-black text-amber-300">
                      +{trophyBuffs.reputationBonus} Uy Tín · +{trophyBuffs.tableRentalBonusPct}% Tiền Thuê Bàn
                    </span>
                  </div>

                  {trophies.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-zinc-700 py-8 text-center text-xs text-zinc-400">
                      Chưa có cúp vô địch nào. Hãy vào Khu Bàn Đấu (Battle Arena) để tranh tài Giải Đấu Bracket!
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                      {trophies.map((t) => (
                        <div
                          key={t.id}
                          className="flex items-center justify-between rounded-xl border border-amber-500/30 bg-zinc-900/80 px-3 py-2.5"
                        >
                          <div className="flex items-center gap-2.5">
                            <Trophy className="h-5 w-5" style={{ color: t.color }} />
                            <div>
                              <div className="text-xs font-black text-white">{t.title}</div>
                              <div className="text-[10px] text-zinc-400">
                                Tiền thưởng giải: +${t.prizeWon.toLocaleString()}
                              </div>
                            </div>
                          </div>
                          <DollarSign className="h-4 w-4 text-emerald-400" />
                        </div>
                      ))}
                    </div>
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
