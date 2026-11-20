import React, { useState } from 'react';
import {
  X,
  Package,
  TrendingUp,
  Sparkles,
  DollarSign,
  Plus,
  Minus,
  Check,
  RefreshCw,
  ShoppingBag,
  Store,
  Lock,
} from 'lucide-react';
import {
  InventoryItem,
  ShopState,
  COLLECTOR_MAX_BOXES_PER_SHELF,
  SHELF_UNLOCKS,
  STARTER_UNLOCKED_SHELVES,
  getBoosterSet,
  getWallShelfCapacity,
  getCollectorShelfIdForProduct,
  isCollectorBoxProduct,
  isGameStopMysteryProduct,
  isShelfUnlocked,
} from '../game/pokemonShopLogic';
import { soundManager } from '../game/audio';

interface ShelfManagementModalProps {
  shopState: ShopState;
  onUpdatePrices: (updatedInventory: InventoryItem[]) => void;
  onOpenShelfUnlocks?: () => void;
  onClose: () => void;
}

export const ShelfManagementModal: React.FC<ShelfManagementModalProps> = ({
  shopState,
  onUpdatePrices,
  onOpenShelfUnlocks,
  onClose,
}) => {
  const [inventory, setInventory] = useState<InventoryItem[]>(shopState.inventory);
  const [savedNotification, setSavedNotification] = useState(false);
  const unlockedShelves = shopState.unlockedShelves || STARTER_UNLOCKED_SHELVES;
  const wallCap = getWallShelfCapacity(unlockedShelves);
  const unlockedTotal = SHELF_UNLOCKS.filter((s) => isShelfUnlocked(unlockedShelves, s.id)).length;
  const unlockedCollectorCount = ['shelf_collector_1', 'shelf_collector_2', 'shelf_collector_3', 'shelf_collector_4'].filter(
    (id) => isShelfUnlocked(unlockedShelves, id)
  ).length;
  const isGameStopUnlocked = isShelfUnlocked(unlockedShelves, 'shelf_gamestop_mystery');

  // Quick adjust price
  const handlePriceStep = (index: number, step: number) => {
    soundManager.playChipSound();
    const updated = [...inventory];
    updated[index] = {
      ...updated[index],
      retailPrice: Math.max(1, +(updated[index].retailPrice + step).toFixed(2)),
    };
    setInventory(updated);
    onUpdatePrices(updated);
    showSaved();
  };

  const showSaved = () => {
    setSavedNotification(true);
    setTimeout(() => setSavedNotification(false), 1200);
  };

  // Group items into VIP Collector Boxes, GameStop Mystery Boxes, Standard Boxes, and Packs
  const collectorBoxItems = inventory.filter((i) => i.type === 'box' && isCollectorBoxProduct(i.productId));
  const gameStopBoxItems = inventory.filter((i) => i.type === 'box' && isGameStopMysteryProduct(i.productId));
  const boxItems = inventory.filter(
    (i) => i.type === 'box' && !isCollectorBoxProduct(i.productId) && !isGameStopMysteryProduct(i.productId)
  );
  const packItems = inventory.filter((i) => i.type === 'pack');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 sm:p-5 select-none animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl h-[90vh] max-h-[780px] rounded-3xl border-2 border-amber-500/60 bg-gradient-to-b from-zinc-950 via-[#18181b] to-zinc-950 p-5 sm:p-7 text-white shadow-2xl flex flex-col justify-between overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-black font-black text-2xl shadow-lg">
              🏪
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-amber-300 uppercase tracking-wide">
                  Kệ Bán Hàng Trưng Bày (Retail & Collector Shelves)
                </h2>
                <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-300 border border-amber-500/30">
                  {inventory.length} Loại Sản Phẩm
                </span>
                {savedNotification && (
                  <span className="flex items-center gap-1 rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300 border border-emerald-500/30 animate-pulse">
                    <Check className="h-3 w-3" /> Đã cập nhật giá bán!
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-400">
                Quản lý Kệ VIP Collector (Tường trái · Tối đa 2 Box 1×1/kệ) và Kệ Booster Box & Pack chuẩn!
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Đóng quản lý kệ"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-amber-400 hover:text-white transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* MAIN SHELF DISPLAY ARENA */}
        <div className="flex-1 overflow-y-auto py-4 space-y-6 pr-1">
          {/* UNLOCKED SHELF CAPACITY BAR */}
          <div className="rounded-2xl border border-cyan-500/40 bg-cyan-950/30 px-4 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 flex-wrap text-xs">
              <span className="font-black text-cyan-300">
                🪜 Tiến độ kệ: {unlockedTotal}/{SHELF_UNLOCKS.length} Kệ Đã Mở
              </span>
              <span className="text-zinc-400">•</span>
              <span className="text-zinc-200 font-bold">
                Dãy Expansion: {wallCap.unlockedBayIndices.length}/4 Khoang ({wallCap.maxBoxUnits} Box · {wallCap.maxPackUnits} Pack)
              </span>
            </div>
            {unlockedTotal < SHELF_UNLOCKS.length && onOpenShelfUnlocks && (
              <button
                onClick={() => {
                  soundManager.playSelectSound();
                  onOpenShelfUnlocks();
                }}
                className="px-3.5 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-black text-xs cursor-pointer shadow shrink-0"
              >
                Mở Khóa Thêm Kệ 🪜
              </button>
            )}
          </div>

          {/* VIP COLLECTOR SHELF PANEL (LEFT WALL · MAX 2 BOXES 1x1 PER SHELF) */}
          <div className="rounded-2xl border-2 border-amber-500/60 bg-gradient-to-br from-[#0f172a] via-zinc-950 to-[#18181b] p-4 sm:p-6 shadow-2xl relative">
            <div className="flex items-center justify-between mb-3 border-b border-amber-500/30 pb-2 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xl">👑</span>
                <h3 className="text-sm font-black text-amber-300 uppercase tracking-wider">
                  Kệ VIP Tường Trái: Collector Boxes & Pack Hiếm (Max {COLLECTOR_MAX_BOXES_PER_SHELF} Box · 1×1)
                </h3>
                {unlockedCollectorCount === 0 ? (
                  <span className="text-[10px] font-black text-amber-300 bg-amber-950/80 border border-amber-500/60 px-2 py-0.5 rounded-full">
                    🔒 Khóa (Mở từng kệ từ Cấp 9+)
                  </span>
                ) : (
                  <span className="text-[10px] font-black text-emerald-300 bg-emerald-950/80 border border-emerald-500/60 px-2 py-0.5 rounded-full">
                    🔓 Đã Mở {unlockedCollectorCount}/4 Tủ VIP
                  </span>
                )}
              </div>
              <span className="rounded-full bg-amber-500/15 border border-amber-400/50 px-2.5 py-0.5 text-[11px] text-amber-200 font-black">
                Mỗi kệ tối đa {COLLECTOR_MAX_BOXES_PER_SHELF} hộp (1×1 không xếp chồng)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {collectorBoxItems.map((item) => {
                const globalIdx = inventory.findIndex((x) => x.id === item.id);
                const profit = item.retailPrice - item.wholesaleCost;
                const profitMargin = item.wholesaleCost > 0 ? Math.round((profit / item.wholesaleCost) * 100) : 0;
                const setInfo = getBoosterSet(item.productId);
                const visible1x1Count = Math.min(COLLECTOR_MAX_BOXES_PER_SHELF, Math.max(0, item.shelvedQuantity));
                const colShelfId = getCollectorShelfIdForProduct(item.productId) || 'shelf_collector_1';
                const colDef = SHELF_UNLOCKS.find((s) => s.id === colShelfId);
                const colUnlocked = isShelfUnlocked(unlockedShelves, colShelfId);

                return (
                  <div
                    key={item.id}
                    className={`rounded-2xl border bg-zinc-900/95 p-3.5 shadow-xl flex flex-col justify-between ${
                      colUnlocked ? 'border-amber-500/40' : 'border-zinc-700/70 opacity-75'
                    }`}
                  >
                    {/* 1x1 Dual Pedestal Preview */}
                    <div className="relative h-32 w-full rounded-xl bg-white border border-amber-400/50 flex items-center justify-center p-2 overflow-hidden group">
                      <img
                        src={setInfo.boxImageUrl}
                        alt={item.name}
                        className={`h-full w-full object-contain group-hover:scale-105 transition-transform ${colUnlocked ? '' : 'grayscale opacity-60'}`}
                      />
                      <div className="absolute top-1.5 left-1.5 rounded bg-black/85 px-2 py-0.5 text-[9px] font-black text-amber-300 border border-amber-400/40">
                        {setInfo.packsPerBox} Packs · 1×1
                      </div>
                      {colUnlocked ? (
                        <div className="absolute top-1.5 right-1.5 rounded bg-emerald-600/90 px-2 py-0.5 text-[9px] font-black text-white">
                          Trên kệ: {visible1x1Count}/{COLLECTOR_MAX_BOXES_PER_SHELF}
                        </div>
                      ) : (
                        <div className="absolute top-1.5 right-1.5 rounded bg-rose-700/95 px-2 py-0.5 text-[9px] font-black text-white flex items-center gap-1">
                          <Lock className="h-2.5 w-2.5" /> Cấp {colDef?.level || 9} · ${colDef?.fee || 500}
                        </div>
                      )}
                    </div>

                    <div className="mt-2.5 text-xs font-black text-white leading-tight line-clamp-2" title={item.name}>
                      {item.name}
                    </div>

                    {/* Yellow Price Tag */}
                    <div className="mt-2.5 rounded-xl border-2 border-black bg-gradient-to-r from-yellow-300 to-amber-400 p-2 text-black shadow-md flex items-center justify-between">
                      <div className="h-10 w-10 rounded border-2 border-black bg-white flex items-center justify-center overflow-hidden p-0.5">
                        <img src={setInfo.boxImageUrl} alt={item.name} className="h-full w-full object-contain" />
                      </div>
                      <div className="text-center px-2">
                        <div className="text-[9px] font-bold uppercase tracking-wider text-black/70">
                          Kệ (Max 2)
                        </div>
                        <div className="text-lg font-black tabular-nums">
                          {visible1x1Count} <span className="text-[11px] font-bold text-black/70">/ Kho {item.quantity}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[9px] font-bold uppercase tracking-wider text-black/70">
                          Giá bán
                        </div>
                        <div className="text-base font-black tabular-nums text-black">
                          ${item.retailPrice.toLocaleString()}
                        </div>
                      </div>
                    </div>

                    {/* High-Ticket Price Increments */}
                    <div className="mt-2 flex items-center justify-between gap-1">
                      <button
                        onClick={() => handlePriceStep(globalIdx, -50)}
                        className="flex-1 py-1 rounded bg-zinc-800 text-xs font-bold text-zinc-300 hover:bg-zinc-700 transition cursor-pointer"
                      >
                        -$50
                      </button>
                      <button
                        onClick={() => handlePriceStep(globalIdx, -10)}
                        className="flex-1 py-1 rounded bg-zinc-800 text-xs font-bold text-zinc-300 hover:bg-zinc-700 transition cursor-pointer"
                      >
                        -$10
                      </button>
                      <button
                        onClick={() => handlePriceStep(globalIdx, 10)}
                        className="flex-1 py-1 rounded bg-zinc-800 text-xs font-bold text-zinc-300 hover:bg-zinc-700 transition cursor-pointer"
                      >
                        +$10
                      </button>
                      <button
                        onClick={() => handlePriceStep(globalIdx, 50)}
                        className="flex-1 py-1 rounded bg-zinc-800 text-xs font-bold text-zinc-300 hover:bg-zinc-700 transition cursor-pointer"
                      >
                        +$50
                      </button>
                    </div>

                    <div className="mt-2 flex items-center justify-between text-[10px] text-zinc-400 pt-1 border-t border-zinc-800">
                      <span>Giá nhập sỉ: ${item.wholesaleCost.toLocaleString()}</span>
                      <span className={`font-bold ${profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        Lãi: ${profit.toFixed(0)} ({profitMargin}%)
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* GAMESTOP POKÉMON MYSTERY BOXES (BLACK STEEL STAND NEXT TO CASHIER) */}
          {gameStopBoxItems.length > 0 && (
            <div className="rounded-2xl border-2 border-red-600/70 bg-gradient-to-br from-black via-zinc-950 to-zinc-900 p-4 sm:p-6 shadow-2xl relative">
              <div className="flex items-center justify-between mb-3 border-b border-red-600/40 pb-2 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🎮</span>
                  <div className="flex items-center gap-2">
                    <img
                      src="/boxes/gamestop_gamestopLogo.png"
                      alt="GameStop"
                      className="h-5 w-auto object-contain"
                    />
                    <h3 className="text-sm font-black text-red-400 uppercase tracking-wider">
                      Hộp Bí Ẩn GameStop (Sát Quầy Thu Ngân)
                    </h3>
                    {!isGameStopUnlocked && (
                      <span className="text-[10px] font-black text-amber-300 bg-red-950/90 border border-red-500/60 px-2 py-0.5 rounded-full">
                        🔒 Khóa Cấp 8 · $600
                      </span>
                    )}
                  </div>
                </div>
                <span className="rounded-full bg-red-600/20 border border-red-500/50 px-2.5 py-0.5 text-[11px] text-red-200 font-black">
                  1 Slab PSA/CGC 10 + 2 Packs Ngẫu Nhiên
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {gameStopBoxItems.map((item) => {
                  const globalIdx = inventory.findIndex((x) => x.id === item.id);
                  const profit = item.retailPrice - item.wholesaleCost;
                  const profitMargin = item.wholesaleCost > 0 ? Math.round((profit / item.wholesaleCost) * 100) : 0;
                  const setInfo = getBoosterSet(item.productId);

                  return (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-red-600/40 bg-zinc-950/95 p-3.5 shadow-xl flex flex-col justify-between"
                    >
                      <div className="relative h-36 w-full rounded-xl bg-black border border-red-500/40 flex items-center justify-center p-2 overflow-hidden group">
                        <img
                          src={setInfo.boxImageUrl}
                          alt={item.name}
                          className="h-full w-full object-contain group-hover:scale-105 transition-transform drop-shadow-[0_10px_20px_rgba(0,0,0,0.9)]"
                        />
                        <div className="absolute top-1.5 left-1.5 rounded bg-red-600/90 px-2 py-0.5 text-[9px] font-black text-white shadow">
                          GAMESTOP
                        </div>
                        <div className="absolute top-1.5 right-1.5 rounded bg-black/85 px-2 py-0.5 text-[10px] font-mono font-bold text-amber-300 border border-amber-400/40">
                          Trên Kệ: {item.shelvedQuantity} / Tổng: {item.quantity}
                        </div>
                      </div>

                      <div className="mt-3">
                        <div className="text-xs font-black text-white truncate">{item.name}</div>
                        <div className="text-[10px] text-zinc-400">Cam kết 1 Slab PSA/CGC 10 + 2 Booster Packs</div>
                      </div>

                      {/* Price Control */}
                      <div className="mt-2.5 rounded-xl bg-black/60 border border-zinc-800 p-2 flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-zinc-400">Giá bán lẻ:</span>
                        <div className="flex items-center gap-1 font-mono text-base font-black text-emerald-400">
                          <span>$</span>
                          <span>{item.retailPrice.toFixed(0)}</span>
                        </div>
                      </div>

                      {/* Quick Adjust Buttons */}
                      <div className="mt-2 flex items-center gap-1">
                        <button
                          onClick={() => handlePriceStep(globalIdx, -20)}
                          className="flex-1 py-1 rounded bg-zinc-800 text-xs font-bold text-zinc-300 hover:bg-zinc-700 transition cursor-pointer"
                        >
                          -$20
                        </button>
                        <button
                          onClick={() => handlePriceStep(globalIdx, -5)}
                          className="flex-1 py-1 rounded bg-zinc-800 text-xs font-bold text-zinc-300 hover:bg-zinc-700 transition cursor-pointer"
                        >
                          -$5
                        </button>
                        <button
                          onClick={() => handlePriceStep(globalIdx, 5)}
                          className="flex-1 py-1 rounded bg-zinc-800 text-xs font-bold text-zinc-300 hover:bg-zinc-700 transition cursor-pointer"
                        >
                          +$5
                        </button>
                        <button
                          onClick={() => handlePriceStep(globalIdx, 20)}
                          className="flex-1 py-1 rounded bg-zinc-800 text-xs font-bold text-zinc-300 hover:bg-zinc-700 transition cursor-pointer"
                        >
                          +$20
                        </button>
                      </div>

                      <div className="mt-2 flex items-center justify-between text-[10px] text-zinc-400 pt-1 border-t border-zinc-800">
                        <span>Giá sỉ: ${item.wholesaleCost.toFixed(0)}</span>
                        <span className={`font-bold ${profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          Lãi: ${profit.toFixed(0)} ({profitMargin}%)
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* THE METALLIC GONDOLA SHELF FRAME (STANDARD BOXES & PACKS) */}
          <div className="rounded-2xl border-2 border-zinc-700 bg-[#27272a] p-4 sm:p-6 shadow-2xl relative">
            {/* EMBOSSED POKEMON WATERMARK ON BACKBOARD (Image 3 & 4) */}
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none opacity-20 select-none">
              <span className="text-7xl sm:text-9xl font-black tracking-widest text-slate-300">
                Pokémon
              </span>
            </div>

            {/* SECTION 1: STANDARD BOOSTER BOX DISPLAY */}
            <div className="mb-8 relative z-10">
              <div className="flex items-center justify-between mb-3 border-b border-zinc-600/60 pb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-xl">📦</span>
                  <h3 className="text-sm font-black text-amber-300 uppercase tracking-wider">
                    Tầng 1: Booster Boxes Chuẩn (Hàng 4 Hộp 2×2 - 10 Packs/Hộp)
                  </h3>
                </div>
                <span className="text-[11px] text-zinc-300 font-semibold">
                  Kệ tường phải · Xếp 2×2
                </span>
              </div>

              {/* 4 Box Slots Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {boxItems.map((item) => {
                  const globalIdx = inventory.findIndex((x) => x.id === item.id);
                  const profit = item.retailPrice - item.wholesaleCost;
                  const profitMargin = item.wholesaleCost > 0 ? Math.round((profit / item.wholesaleCost) * 100) : 0;
                  const setInfo = getBoosterSet(item.productId);

                  return (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-zinc-600 bg-zinc-900/90 p-3.5 shadow-lg flex flex-col justify-between"
                    >
                      {/* Box 3D Preview Stack */}
                      <div className="relative h-28 w-full rounded-xl bg-gradient-to-br from-zinc-800 to-zinc-950 border border-zinc-700 flex items-center justify-center p-2 overflow-hidden group">
                        <img
                          src={setInfo.boxImageUrl}
                          alt={item.name}
                          className="h-full w-auto object-contain group-hover:scale-105 transition-transform"
                        />

                        {/* Top tag */}
                        <div className="absolute top-1.5 left-1.5 rounded bg-black/70 px-1.5 py-0.5 text-[9px] font-bold text-amber-300">
                          {(item.setName || item.name).split(':')[0]}
                        </div>
                      </div>

                      {/* ITEM NAME */}
                      <div className="mt-2 text-xs font-black text-white truncate" title={item.name}>
                        {item.name}
                      </div>

                      {/* YELLOW RETAIL PRICE TAG */}
                      <div className="mt-3 rounded-xl border-2 border-black bg-gradient-to-r from-yellow-300 to-amber-400 p-2 text-black shadow-md flex items-center justify-between">
                        {/* Mini Thumbnail */}
                        <div className="h-10 w-10 rounded border-2 border-black bg-white flex items-center justify-center text-lg font-black shadow-inner">
                          📦
                        </div>

                        {/* Stock Quantity Remaining */}
                        <div className="text-center px-2">
                          <div className="text-[9px] font-bold uppercase tracking-wider text-black/70">
                            Số lượng
                          </div>
                          <div className="text-xl font-black tabular-nums">
                            {item.quantity}
                          </div>
                        </div>

                        {/* Price Controls */}
                        <div className="text-right">
                          <div className="text-[9px] font-bold uppercase tracking-wider text-black/70">
                            Giá bán
                          </div>
                          <div className="text-base font-black tabular-nums text-black">
                            ${item.retailPrice.toFixed(2)}
                          </div>
                        </div>
                      </div>

                      {/* Price Increments (+ / -) */}
                      <div className="mt-2 flex items-center justify-between gap-1">
                        <button
                          onClick={() => handlePriceStep(globalIdx, -5)}
                          className="flex-1 py-1 rounded bg-zinc-800 text-xs font-bold text-zinc-300 hover:bg-zinc-700 transition cursor-pointer"
                        >
                          -$5
                        </button>
                        <button
                          onClick={() => handlePriceStep(globalIdx, -1)}
                          className="flex-1 py-1 rounded bg-zinc-800 text-xs font-bold text-zinc-300 hover:bg-zinc-700 transition cursor-pointer"
                        >
                          -$1
                        </button>
                        <button
                          onClick={() => handlePriceStep(globalIdx, 1)}
                          className="flex-1 py-1 rounded bg-zinc-800 text-xs font-bold text-zinc-300 hover:bg-zinc-700 transition cursor-pointer"
                        >
                          +$1
                        </button>
                        <button
                          onClick={() => handlePriceStep(globalIdx, 5)}
                          className="flex-1 py-1 rounded bg-zinc-800 text-xs font-bold text-zinc-300 hover:bg-zinc-700 transition cursor-pointer"
                        >
                          +$5
                        </button>
                      </div>

                      {/* Profit Margin Info */}
                      <div className="mt-2 flex items-center justify-between text-[10px] text-zinc-400 pt-1 border-t border-zinc-800">
                        <span>Giá nhập sỉ: ${item.wholesaleCost.toFixed(2)}</span>
                        <span className={`font-bold ${profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          Lãi: ${profit.toFixed(2)} ({profitMargin}%)
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* SECTION 2: BOOSTER PACK MULTI-LANE TRAYS (32 PACKS/COLUMN - Image 4 & 5) */}
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3 border-b border-zinc-600/60 pb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🎴</span>
                  <h3 className="text-sm font-black text-amber-300 uppercase tracking-wider">
                    Tầng 2: Booster Packs (Khay Đứng 32 Gói/Cột - 10 Thẻ/Gói)
                  </h3>
                </div>
                <span className="text-[11px] text-zinc-300 font-semibold">
                  Mỗi rãnh xếp đứng 32 gói bài liên tiếp
                </span>
              </div>

              {/* Pack Slots Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {packItems.map((item) => {
                  const globalIdx = inventory.findIndex((x) => x.id === item.id);
                  const profit = item.retailPrice - item.wholesaleCost;
                  const profitMargin = Math.round((profit / item.wholesaleCost) * 100);

                  return (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-zinc-600 bg-zinc-900/90 p-3.5 shadow-lg flex flex-col justify-between"
                    >
                      {/* Pack 3D Tray Preview (Upright packs standing deep) */}
                      <div className="relative h-28 w-full rounded-xl bg-gradient-to-br from-zinc-800 to-zinc-950 border border-zinc-700 flex items-center justify-center p-2 overflow-hidden group">
                        {/* 5 Standing packs deep */}
                        <div className="flex items-center justify-center -space-x-4 group-hover:scale-105 transition-transform">
                          {[0, 1, 2, 3, 4].map((p) => (
                            <div
                              key={p}
                              className="w-10 h-20 rounded border-2 border-amber-300 shadow-lg flex flex-col items-center justify-between p-1 text-[7px] font-black"
                              style={{
                                background: `linear-gradient(180deg, ${p === 4 ? '#eab308' : '#27272a'} 0%, #09090b 100%)`,
                              }}
                            >
                              <span className="text-yellow-300">151</span>
                              <span className="text-xs">⚡</span>
                              <span className="text-[6px] text-zinc-300">10T</span>
                            </div>
                          ))}
                        </div>

                        <div className="absolute top-1.5 left-1.5 rounded bg-black/70 px-1.5 py-0.5 text-[9px] font-bold text-sky-300">
                          32 Packs Deep
                        </div>
                      </div>

                      {/* ITEM NAME */}
                      <div className="mt-2 text-xs font-black text-white truncate" title={item.name}>
                        {item.name}
                      </div>

                      {/* YELLOW RETAIL PRICE TAG (Exact Image 4 replica) */}
                      <div className="mt-3 rounded-xl border-2 border-black bg-gradient-to-r from-yellow-300 to-amber-400 p-2 text-black shadow-md flex items-center justify-between">
                        {/* Mini Thumbnail */}
                        <div className="h-10 w-10 rounded border-2 border-black bg-white flex items-center justify-center text-lg font-black shadow-inner">
                          🎴
                        </div>

                        {/* Stock Quantity Remaining (32) */}
                        <div className="text-center px-2">
                          <div className="text-[9px] font-bold uppercase tracking-wider text-black/70">
                            Trong khay
                          </div>
                          <div className="text-xl font-black tabular-nums">
                            {item.quantity}
                          </div>
                        </div>

                        {/* Price Controls */}
                        <div className="text-right">
                          <div className="text-[9px] font-bold uppercase tracking-wider text-black/70">
                            Giá bán
                          </div>
                          <div className="text-base font-black tabular-nums text-black">
                            ${item.retailPrice.toFixed(2)}
                          </div>
                        </div>
                      </div>

                      {/* Price Increments (+ / -) */}
                      <div className="mt-2 flex items-center justify-between gap-1">
                        <button
                          onClick={() => handlePriceStep(globalIdx, -1)}
                          className="flex-1 py-1 rounded bg-zinc-800 text-xs font-bold text-zinc-300 hover:bg-zinc-700 transition cursor-pointer"
                        >
                          -$1
                        </button>
                        <button
                          onClick={() => handlePriceStep(globalIdx, -0.25)}
                          className="flex-1 py-1 rounded bg-zinc-800 text-xs font-bold text-zinc-300 hover:bg-zinc-700 transition cursor-pointer"
                        >
                          -25¢
                        </button>
                        <button
                          onClick={() => handlePriceStep(globalIdx, 0.25)}
                          className="flex-1 py-1 rounded bg-zinc-800 text-xs font-bold text-zinc-300 hover:bg-zinc-700 transition cursor-pointer"
                        >
                          +25¢
                        </button>
                        <button
                          onClick={() => handlePriceStep(globalIdx, 1)}
                          className="flex-1 py-1 rounded bg-zinc-800 text-xs font-bold text-zinc-300 hover:bg-zinc-700 transition cursor-pointer"
                        >
                          +$1
                        </button>
                      </div>

                      {/* Profit Margin Info */}
                      <div className="mt-2 flex items-center justify-between text-[10px] text-zinc-400 pt-1 border-t border-zinc-800">
                        <span>Giá nhập sỉ: ${item.wholesaleCost.toFixed(2)}</span>
                        <span className={`font-bold ${profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          Lãi: ${profit.toFixed(2)} ({profitMargin}%)
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM ACTION BAR */}
        <div className="border-t border-zinc-800 pt-3 flex items-center justify-between flex-wrap gap-2">
          <div className="text-xs text-zinc-400">
            💡 <strong className="text-amber-300">Mẹo buôn bán:</strong> Đặt giá cao hơn giá sỉ khoảng 40% - 60% để tối ưu lợi nhuận và thu hút khách mua hàng!
          </div>

          <button
            onClick={() => {
              soundManager.playSelectSound();
              onClose();
            }}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-600 text-black font-black text-sm shadow-lg hover:from-amber-300 hover:to-amber-500 transition cursor-pointer"
          >
            LƯU VÀ TRỞ LẠI CỬA HÀNG
          </button>
        </div>
      </div>
    </div>
  );
};
