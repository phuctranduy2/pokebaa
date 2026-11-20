import React, { useState } from 'react';
import { Package, Box, ShoppingCart, X, ChevronRight, Zap } from 'lucide-react';
import {
  InventoryItem,
  BOOSTER_SETS,
  ALL_UNIQUE_BOOSTER_SETS,
  ALL_COLLECTOR_BOXES,
  ALL_ONEPIECE_BOOSTER_SETS,
  ALL_ONEPIECE_COLLECTOR_BOXES,
  ALL_ONEPIECE_BOUNTY_SETS,
  BoosterSetInfo,
} from '../game/pokemonShopLogic';
import { soundManager } from '../game/audio';

interface InventoryModalProps {
  onClose: () => void;
  inventory: InventoryItem[];
  onOpenRipPacks: (setId?: string) => void;
  onOpenBoxOpening: (setId?: string) => void;
  onOpenOrdering: () => void;
  onHoldBox?: (set: BoosterSetInfo) => void;
  onHoldPack?: (set: BoosterSetInfo) => void;
}

export const InventoryModal: React.FC<InventoryModalProps> = ({
  onClose,
  inventory,
  onOpenRipPacks,
  onOpenBoxOpening,
  onOpenOrdering,
  onHoldBox,
  onHoldPack,
}) => {
  const [activeTab, setActiveTab] = useState<'packs' | 'boxes'>('packs');

  const packItems = inventory.filter((item) => item.type === 'pack');
  const boxItems = inventory.filter((item) => item.type === 'box');

  const totalPacks = packItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalBoxes = boxItems.reduce((sum, item) => sum + item.quantity, 0);

  // Calculate estimated total backpack value
  const totalValue = inventory.reduce((sum, item) => sum + item.quantity * item.retailPrice, 0);

  // Group booster sets with held quantities (both Pokemon T1 & One Piece T2)
  const setList: BoosterSetInfo[] = [...ALL_UNIQUE_BOOSTER_SETS, ...ALL_ONEPIECE_BOOSTER_SETS];
  const boxSetList: BoosterSetInfo[] = [
    ...ALL_UNIQUE_BOOSTER_SETS,
    ...ALL_COLLECTOR_BOXES,
    ...ALL_ONEPIECE_BOOSTER_SETS,
    ...ALL_ONEPIECE_COLLECTOR_BOXES,
    ...ALL_ONEPIECE_BOUNTY_SETS,
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 sm:p-5 animate-in fade-in select-none">
      <div className="relative w-full max-w-3xl rounded-3xl border border-amber-500/40 bg-[#090d16] text-zinc-100 shadow-[0_0_80px_rgba(245,158,11,0.25)] flex flex-col max-h-[90vh] overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-zinc-800/80 px-6 py-4 bg-zinc-950/60">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 shadow-inner">
              <Package className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black tracking-wide text-white">TÚI ĐỒ / KHO HÀNG CÁ NHÂN</h2>
                <span className="rounded-lg bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 font-mono text-[11px] font-black text-amber-300">
                  Phím [E]
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Quản lý các gói thẻ và booster box đang sở hữu • Bóc thẻ hoặc mở box ngay
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              soundManager.playSelectSound();
              onClose();
            }}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-800 cursor-pointer transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Inventory Quick Overview Bar */}
        <div className="grid grid-cols-3 gap-2 px-6 py-3 bg-zinc-900/40 border-b border-zinc-800/60">
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-2.5 text-center">
            <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Gói Thẻ Lẻ</div>
            <div className="text-lg font-black text-amber-400">{totalPacks} gói</div>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-2.5 text-center">
            <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Booster Box (10 Packs)</div>
            <div className="text-lg font-black text-rose-400">{totalBoxes} box</div>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-2.5 text-center">
            <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Tổng Giá Trị Túi</div>
            <div className="text-lg font-black text-emerald-400">${totalValue.toLocaleString()}</div>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex border-b border-zinc-800 px-6 gap-3 pt-3 bg-zinc-950/30">
          <button
            onClick={() => {
              soundManager.playSelectSound();
              setActiveTab('packs');
            }}
            className={`flex items-center gap-2 pb-3 px-3 text-xs font-black border-b-2 cursor-pointer transition-colors ${
              activeTab === 'packs'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Zap className="h-4 w-4" />
            <span>Gói Thẻ Cần Bóc ({totalPacks})</span>
          </button>

          <button
            onClick={() => {
              soundManager.playSelectSound();
              setActiveTab('boxes');
            }}
            className={`flex items-center gap-2 pb-3 px-3 text-xs font-black border-b-2 cursor-pointer transition-colors ${
              activeTab === 'boxes'
                ? 'border-rose-400 text-rose-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Box className="h-4 w-4" />
            <span>Booster Box ({totalBoxes})</span>
          </button>
        </div>

        {/* Item List Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {activeTab === 'packs' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {setList.map((set) => {
                const invItem = packItems.find(
                  (i) => i.productId === `${set.id}_pack` || i.productId === set.id
                );
                const count = invItem ? invItem.quantity : 0;
                return (
                  <div
                    key={set.id}
                    className={`rounded-2xl border p-3 flex items-center justify-between transition-all ${
                      count > 0
                        ? 'border-amber-500/40 bg-zinc-900/80 hover:border-amber-400 shadow-md'
                        : 'border-zinc-800/60 bg-zinc-950/40 opacity-55'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={set.packImageUrl}
                        alt={set.name}
                        className="h-16 w-12 rounded-lg object-cover border border-amber-500/30 shadow-md shrink-0"
                      />
                      <div>
                        <div className="text-xs font-black text-white">{set.name}</div>
                        <div className="text-[11px] text-zinc-400">{set.series} • {set.releaseYear}</div>
                        <div className="mt-1 flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-amber-300">
                            Số lượng: <strong className="text-sm font-black text-white">{count}</strong>
                          </span>
                          <span className="text-[10px] text-zinc-500 font-mono">(${set.packRetailPrice}/gói)</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      {count > 0 ? (
                        <button
                          onClick={() => {
                            soundManager.playSelectSound();
                            onClose();
                            onOpenRipPacks(set.id);
                          }}
                          className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-3.5 py-2 text-xs font-black text-black hover:from-amber-400 hover:to-amber-500 shadow-lg cursor-pointer transition-transform hover:scale-105"
                        >
                          <Zap className="h-3.5 w-3.5 fill-black" />
                          <span>Bóc Thẻ</span>
                        </button>
                      ) : (
                        <span className="text-[11px] font-bold text-zinc-500 italic px-2">Hết gói</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 'boxes' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {boxSetList.map((set) => {
                const invItem = boxItems.find(
                  (i) => i.productId === `${set.id}_box` || i.productId === set.id
                );
                const count = invItem ? invItem.quantity : 0;
                const isCollector = set.id.startsWith('collector_');
                return (
                  <div
                    key={set.id}
                    className={`rounded-2xl border p-3 flex items-center justify-between transition-all ${
                      count > 0
                        ? (isCollector
                            ? 'border-amber-400/60 bg-zinc-900/90 hover:border-amber-300 shadow-md'
                            : 'border-rose-500/40 bg-zinc-900/80 hover:border-rose-400 shadow-md')
                        : 'border-zinc-800/60 bg-zinc-950/40 opacity-55'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={set.boxImageUrl}
                        alt={set.name}
                        className="h-16 w-16 rounded-xl object-contain bg-white/95 p-0.5 border border-rose-500/30 shadow-md shrink-0"
                      />
                      <div>
                        <div className="text-xs font-black text-white">
                          {isCollector ? `👑 ${set.name}` : `${set.name} Box`}
                        </div>
                        <div className={`text-[11px] ${isCollector ? 'text-amber-300/90' : 'text-rose-300/80'}`}>
                          {isCollector ? `VIP 1×1 · ${set.packsPerBox} Packs` : `Hộp nguyên seal ${set.packsPerBox || 10} Packs`}
                        </div>
                        <div className="mt-1 flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-rose-300">
                            Số lượng: <strong className="text-sm font-black text-white">{count}</strong>
                          </span>
                          <span className="text-[10px] text-zinc-500 font-mono">(${set.boxRetailPrice}/box)</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          soundManager.playSelectSound();
                          onClose();
                          if (onHoldBox) {
                            onHoldBox(set);
                          }
                        }}
                        className="flex items-center gap-1.5 rounded-xl border border-rose-500/50 bg-rose-950/60 px-3 py-2 text-xs font-black text-rose-300 hover:bg-rose-900/80 hover:border-rose-400 shadow cursor-pointer transition-transform hover:scale-105"
                        title="Cầm hộp booster box trên tay"
                      >
                        <Package className="h-3.5 w-3.5" />
                        <span>Cầm Trên Tay</span>
                      </button>

                      {count > 0 ? (
                        <button
                          onClick={() => {
                            soundManager.playSelectSound();
                            onClose();
                            onOpenBoxOpening(set.id);
                          }}
                          className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-rose-500 to-rose-600 px-3.5 py-2 text-xs font-black text-white hover:from-rose-400 hover:to-rose-500 shadow-lg cursor-pointer transition-transform hover:scale-105"
                        >
                          <Box className="h-3.5 w-3.5" />
                          <span>Mở Box</span>
                        </button>
                      ) : (
                        <span className="text-[11px] font-bold text-zinc-500 italic px-2">Kho: 0</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Bottom Actions Bar */}
        <div className="flex items-center justify-between border-t border-zinc-800/80 px-6 py-3.5 bg-zinc-950/60">
          <button
            onClick={() => {
              soundManager.playSelectSound();
              onClose();
              onOpenOrdering();
            }}
            className="flex items-center gap-2 text-xs font-bold text-amber-400 hover:text-amber-300 cursor-pointer"
          >
            <ShoppingCart className="h-4 w-4" />
            <span>Đặt Mua Thêm Hàng Trên Tablet (TAB)</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>

          <button
            onClick={() => {
              soundManager.playSelectSound();
              onClose();
            }}
            className="rounded-xl border border-zinc-700 bg-zinc-800 px-5 py-2 text-xs font-bold text-zinc-300 hover:bg-zinc-700 hover:text-white cursor-pointer transition-colors"
          >
            Đóng [ESC]
          </button>
        </div>
      </div>
    </div>
  );
};
