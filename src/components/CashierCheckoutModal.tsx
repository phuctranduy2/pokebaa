import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  CreditCard,
  Banknote,
  QrCode,
  Barcode,
  Check,
  CheckCircle2,
  Printer,
  User,
  ScanLine,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { ShopCustomer } from '../game/pokemonShopLogic';
import { soundManager } from '../game/audio';

interface CashierCheckoutModalProps {
  customer: ShopCustomer | null;
  queueCount?: number;
  scannedCounts?: Record<string, number>;
  onScanOneItem?: (itemId: string) => void;
  onScanAllItems?: () => void;
  onCheckoutComplete: (customer: ShopCustomer, totalRevenue: number) => void;
  onClose: () => void;
}

export const CashierCheckoutModal: React.FC<CashierCheckoutModalProps> = ({
  customer,
  queueCount = 1,
  scannedCounts: externalScannedCounts,
  onScanOneItem,
  onScanAllItems,
  onCheckoutComplete,
  onClose,
}) => {
  const [localScannedCounts, setLocalScannedCounts] = useState<Record<string, number>>({});
  const [posDisplay, setPosDisplay] = useState<string>('0');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'qr'>('card');
  const [isCompleted, setIsCompleted] = useState<boolean>(false);

  const scannedCounts = externalScannedCounts ?? localScannedCounts;

  // Reset modal transient state whenever the front customer changes
  useEffect(() => {
    setLocalScannedCounts({});
    setPosDisplay('0');
    setIsCompleted(false);
  }, [customer?.id]);

  const basket = customer?.basket ?? [];
  const totalAmount = basket.reduce((sum, item) => sum + item.unitPrice * item.count, 0);
  const totalUnits = basket.reduce((sum, item) => sum + Math.max(1, item.count || 1), 0);
  const scannedUnits = basket.reduce((sum, item) => {
    const count = Math.max(1, item.count || 1);
    return sum + Math.min(count, scannedCounts[item.item.id] || 0);
  }, 0);
  const scannedSubtotal = basket.reduce((sum, item) => {
    const count = Math.max(1, item.count || 1);
    const qty = Math.min(count, scannedCounts[item.item.id] || 0);
    return sum + item.unitPrice * qty;
  }, 0);
  const allItemsScanned = totalUnits > 0 && scannedUnits >= totalUnits;

  // Auto-fill terminal amount once all items are scanned
  useEffect(() => {
    if (allItemsScanned && totalAmount > 0 && posDisplay === '0') {
      setPosDisplay(totalAmount.toFixed(2));
    }
  }, [allItemsScanned, totalAmount, posDisplay]);

  // Scan 1 physical unit of a specific basket item
  const handleScanItem = useCallback(
    (itemId: string) => {
      const target = basket.find((b) => b.item.id === itemId);
      if (!target) return;
      const maxCount = Math.max(1, target.count || 1);
      const current = scannedCounts[itemId] || 0;
      if (current >= maxCount) return;

      if (onScanOneItem) {
        onScanOneItem(itemId);
      } else {
        soundManager.playBarcodeBeep();
        setLocalScannedCounts((prev) => ({
          ...prev,
          [itemId]: Math.min(maxCount, (prev[itemId] || 0) + 1),
        }));
      }
    },
    [basket, scannedCounts, onScanOneItem]
  );

  // Scan next unscanned unit in basket order
  const handleScanNext = useCallback(() => {
    const nextRow = basket.find((b) => (scannedCounts[b.item.id] || 0) < Math.max(1, b.count || 1));
    if (nextRow) {
      handleScanItem(nextRow.item.id);
    }
  }, [basket, scannedCounts, handleScanItem]);

  // Scan all remaining items quickly
  const handleScanAll = useCallback(() => {
    if (onScanAllItems) {
      onScanAllItems();
    } else {
      soundManager.playBarcodeBeep();
      const all: Record<string, number> = {};
      basket.forEach((b) => {
        all[b.item.id] = Math.max(1, b.count || 1);
      });
      setLocalScannedCounts(all);
    }
  }, [basket, onScanAllItems]);

  // Numeric Keypad Handlers
  const handleKeypadPress = (val: string) => {
    soundManager.playSelectSound();
    if (val === 'backspace') {
      setPosDisplay((prev) => (prev.length <= 1 ? '0' : prev.slice(0, -1)));
      return;
    }
    if (val === '.') {
      if (!posDisplay.includes('.')) {
        setPosDisplay((prev) => prev + '.');
      }
      return;
    }
    setPosDisplay((prev) => (prev === '0' ? val : prev + val));
  };

  const handleQuickFillTotal = () => {
    soundManager.playSelectSound();
    setPosDisplay(totalAmount.toFixed(2));
  };

  // Confirm payment
  const handleConfirmPayment = useCallback(() => {
    if (!customer || isCompleted) return;
    if (!allItemsScanned) {
      handleScanNext();
      return;
    }
    soundManager.playCashRegister();
    setIsCompleted(true);
    confetti({
      particleCount: 65,
      spread: 75,
      origin: { y: 0.6 },
    });

    setTimeout(() => {
      onCheckoutComplete(customer, totalAmount);
    }, 900);
  }, [customer, isCompleted, allItemsScanned, handleScanNext, onCheckoutComplete, totalAmount]);

  // Key listener: SPACE scans 1 item at a time until complete, then confirms payment
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        if (!allItemsScanned) {
          handleScanNext();
        } else {
          handleConfirmPayment();
        }
      } else if (e.code === 'Enter') {
        e.preventDefault();
        if (allItemsScanned) {
          handleConfirmPayment();
        } else {
          handleScanAll();
        }
      } else if (e.code === 'Escape' || e.code === 'KeyQ') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [allItemsScanned, handleScanNext, handleScanAll, handleConfirmPayment, onClose]);

  if (!customer || customer.basket.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
        <div className="w-full max-w-md rounded-3xl border-2 border-zinc-800 bg-zinc-950 p-6 text-center shadow-2xl">
          <div className="text-4xl mb-3">🏪</div>
          <h3 className="text-lg font-black text-amber-300">Quầy Thu Ngân Đang Trống</h3>
          <p className="mt-1 text-xs text-zinc-400">
            Chưa có khách mang hàng tới quầy tính tiền. Hãy đợi khách dạo xem kệ và mang pack/thẻ ra quầy nhé!
          </p>
          <button
            onClick={onClose}
            className="mt-5 w-full rounded-xl bg-amber-500 py-2.5 font-bold text-black hover:bg-amber-400 cursor-pointer"
          >
            Quay Lại Sàn Cửa Hàng
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-2 sm:p-4 select-none animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl rounded-[32px] bg-[#161920] border-2 border-amber-500/35 p-4 sm:p-6 shadow-2xl text-white flex flex-col justify-between overflow-hidden">
        {/* Customer Header + Live Item Scan Progress */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-zinc-700/80 mb-3">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl font-black text-black shadow-md text-sm"
              style={{ backgroundColor: customer.avatarColor }}
            >
              {customer.name.charAt(0)}
            </div>
            <div>
              <div className="text-sm font-bold text-white flex flex-wrap items-center gap-2">
                <span>Khách hàng: {customer.name}</span>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/40">
                  {customer.role}
                </span>
                {queueCount > 1 && (
                  <span className="text-[10px] bg-sky-500/20 text-sky-300 px-2 py-0.5 rounded-full border border-sky-500/40">
                    Còn {queueCount - 1} khách đang xếp hàng
                  </span>
                )}
              </div>
              <div className="text-xs text-zinc-400">
                Ngân sách: ${customer.budget.toFixed(2)} · Đã quét{' '}
                <span className={allItemsScanned ? 'text-emerald-400 font-bold' : 'text-amber-300 font-bold'}>
                  {scannedUnits}/{totalUnits} món
                </span>{' '}
                (Tạm tính ${scannedSubtotal.toFixed(2)})
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* SPLIT INTERFACE: LEFT POS PINPAD + RIGHT ITEM-BY-ITEM PAYMENT MONITOR */}
        <div className="flex flex-col md:flex-row items-center justify-center gap-6 my-auto">
          {/* LEFT: DIGITAL POS PAYMENT TERMINAL */}
          <div className="w-64 sm:w-72 bg-[#252932] rounded-3xl p-3 border-2 border-zinc-600 shadow-2xl flex flex-col justify-between shrink-0">
            <div className="w-full h-4 bg-zinc-800 rounded-t-xl mb-2 flex items-center justify-center">
              <div className="w-24 h-1 bg-black rounded-full" />
            </div>

            <div className="rounded-t-2xl bg-[#0066cc] py-2 text-center text-white font-black text-sm uppercase tracking-wider">
              {allItemsScanned ? 'Total Due' : `Scanned (${scannedUnits}/${totalUnits})`}
            </div>

            <div
              onClick={handleQuickFillTotal}
              title="Bấm để tự điền tổng tiền cần thanh toán"
              className="bg-[#0b1b36] py-3 px-4 text-center cursor-pointer border-b-2 border-zinc-700 hover:bg-[#0e2347] transition"
            >
              <span className="text-4xl sm:text-5xl font-black text-white font-mono tracking-tight tabular-nums">
                {posDisplay}
              </span>
            </div>

            {/* Payment Method Selector */}
            <div className="grid grid-cols-3 gap-1.5 bg-zinc-800/80 p-1.5">
              <button
                type="button"
                onClick={() => {
                  soundManager.playSelectSound();
                  setPaymentMethod('card');
                }}
                className={`flex items-center justify-center gap-1 rounded-lg py-1.5 text-[11px] font-bold cursor-pointer transition ${
                  paymentMethod === 'card' ? 'bg-sky-500 text-black' : 'bg-zinc-900 text-zinc-300 hover:bg-zinc-700'
                }`}
              >
                <CreditCard className="h-3.5 w-3.5" />
                NFC
              </button>
              <button
                type="button"
                onClick={() => {
                  soundManager.playSelectSound();
                  setPaymentMethod('qr');
                }}
                className={`flex items-center justify-center gap-1 rounded-lg py-1.5 text-[11px] font-bold cursor-pointer transition ${
                  paymentMethod === 'qr' ? 'bg-emerald-400 text-black' : 'bg-zinc-900 text-zinc-300 hover:bg-zinc-700'
                }`}
              >
                <QrCode className="h-3.5 w-3.5" />
                VietQR
              </button>
              <button
                type="button"
                onClick={() => {
                  soundManager.playSelectSound();
                  setPaymentMethod('cash');
                }}
                className={`flex items-center justify-center gap-1 rounded-lg py-1.5 text-[11px] font-bold cursor-pointer transition ${
                  paymentMethod === 'cash' ? 'bg-amber-400 text-black' : 'bg-zinc-900 text-zinc-300 hover:bg-zinc-700'
                }`}
              >
                <Banknote className="h-3.5 w-3.5" />
                Tiền mặt
              </button>
            </div>

            {/* 12-Button Numeric Keypad */}
            <div className="bg-[#e2e8f0] p-3 rounded-b-2xl space-y-2">
              {[
                ['1', '2', '3'],
                ['4', '5', '6'],
                ['7', '8', '9'],
                ['←', '0', '.'],
              ].map((row, rIdx) => (
                <div key={rIdx} className="grid grid-cols-3 gap-2">
                  {row.map((key) => (
                    <button
                      key={key}
                      onClick={() => handleKeypadPress(key === '←' ? 'backspace' : key)}
                      className="h-10 rounded-xl bg-white hover:bg-zinc-100 active:scale-95 text-zinc-900 font-black text-lg shadow cursor-pointer transition flex items-center justify-center"
                    >
                      {key}
                    </button>
                  ))}
                </div>
              ))}

              <button
                onClick={handleConfirmPayment}
                disabled={isCompleted}
                title={allItemsScanned ? 'Xác nhận thanh toán hoàn tất' : 'Quét món tiếp theo trước khi thu tiền'}
                className={`w-full h-12 rounded-xl text-white font-black text-xl shadow-lg cursor-pointer transition flex items-center justify-center gap-2 ${
                  allItemsScanned
                    ? 'bg-[#00a844] hover:bg-green-600'
                    : 'bg-amber-500 hover:bg-amber-400 text-black'
                }`}
              >
                {allItemsScanned ? (
                  <Check className="h-8 w-8 stroke-[3.5]" />
                ) : (
                  <>
                    <ScanLine className="h-5 w-5" />
                    <span className="text-sm font-black">QUÉT MÓN ({scannedUnits}/{totalUnits})</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* RIGHT: TOUCHSCREEN PAYMENT SYSTEM MONITOR */}
          <div className="flex-1 w-full max-w-xl rounded-2xl bg-white text-zinc-900 overflow-hidden shadow-2xl border-4 border-zinc-700 flex flex-col justify-between">
            <div className="bg-[#0072ce] text-white px-4 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-5 w-5 bg-lime-400 rotate-45 rounded-xs flex items-center justify-center">
                  <div className="h-2 w-2 bg-black rounded-xs" />
                </div>
                <span className="font-extrabold text-sm tracking-wide">PokéCard POS · Quét Từng Món</span>
              </div>

              <div className="flex items-center gap-2">
                <CheckCircle2 className={`h-5 w-5 ${allItemsScanned ? 'text-emerald-300' : 'text-sky-200/60'}`} />
                <span className="bg-[#00529b] px-2 py-0.5 rounded text-[11px] font-black tracking-wider uppercase">
                  {scannedUnits}/{totalUnits}
                </span>
              </div>
            </div>

            {/* Table Header */}
            <div className="grid grid-cols-12 bg-[#ea580c] text-white text-xs font-black py-2 px-3 tracking-wider uppercase text-center">
              <div className="col-span-6 text-left pl-2">Sản phẩm (Click để quét từng cái)</div>
              <div className="col-span-2">Đã Quét</div>
              <div className="col-span-2">Đơn Giá</div>
              <div className="col-span-2 text-right pr-2">Thành Tiền</div>
            </div>

            {/* Scanned Items List Rows */}
            <div className="p-2 space-y-1.5 min-h-[190px] max-h-[250px] overflow-y-auto bg-[#f8fafc]">
              {customer.basket.map((bItem) => {
                const maxCount = Math.max(1, bItem.count || 1);
                const qtyScanned = Math.min(maxCount, scannedCounts[bItem.item.id] || 0);
                const isFullyScanned = qtyScanned >= maxCount;
                const rowTotal = bItem.unitPrice * maxCount;

                return (
                  <div
                    key={bItem.item.id}
                    onClick={() => handleScanItem(bItem.item.id)}
                    className={`grid grid-cols-12 items-center p-2 rounded-lg text-xs font-bold transition cursor-pointer border ${
                      isFullyScanned
                        ? 'bg-emerald-50/90 border-emerald-400 text-zinc-900'
                        : qtyScanned > 0
                        ? 'bg-amber-50 border-amber-400 text-zinc-900'
                        : 'bg-white border-zinc-200 hover:border-sky-400 text-zinc-700'
                    }`}
                  >
                    <div className="col-span-6 flex items-center gap-2.5 truncate pl-1">
                      <div className="h-9 w-7 bg-zinc-200 rounded border border-zinc-300 overflow-hidden flex items-center justify-center shrink-0">
                        {bItem.item.cardData ? (
                          <img
                            src={bItem.item.cardData.imageUrl}
                            alt={bItem.item.name}
                            className="h-full object-contain"
                          />
                        ) : (
                          <span className="text-sm">🎴</span>
                        )}
                      </div>
                      <div className="truncate">
                        <div className="font-extrabold text-zinc-900 truncate">{bItem.item.name}</div>
                        <div
                          className={`text-[10px] ${
                            isFullyScanned
                              ? 'text-emerald-600'
                              : qtyScanned > 0
                              ? 'text-amber-600'
                              : 'text-sky-600'
                          }`}
                        >
                          {isFullyScanned
                            ? '✓ Đã quét qua máy laser & đóng túi'
                            : qtyScanned > 0
                            ? `⚡ Bấm để quét cái tiếp theo (${qtyScanned}/${maxCount})`
                            : '👆 Bấm để quét từng món qua laser'}
                        </div>
                      </div>
                    </div>

                    <div className="col-span-2 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-md font-black text-xs ${
                          isFullyScanned
                            ? 'bg-emerald-500 text-white'
                            : qtyScanned > 0
                            ? 'bg-amber-400 text-black'
                            : 'bg-zinc-200 text-zinc-700'
                        }`}
                      >
                        {qtyScanned}/{maxCount}
                      </span>
                    </div>

                    <div className="col-span-2 text-center text-zinc-700">
                      ${bItem.unitPrice.toFixed(2)}
                    </div>

                    <div className="col-span-2 text-right pr-2 font-black text-sm text-zinc-900">
                      ${rowTotal.toFixed(2)}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Total Green Button */}
            <div className="p-3 bg-white border-t border-zinc-200">
              <button
                onClick={handleConfirmPayment}
                disabled={isCompleted}
                className={`w-full flex items-center justify-between rounded-xl px-5 py-3.5 shadow-lg cursor-pointer transition ${
                  allItemsScanned
                    ? 'bg-[#00a844] hover:bg-green-600 text-white'
                    : 'bg-sky-600 hover:bg-sky-500 text-white'
                }`}
              >
                <span className="font-extrabold text-base tracking-wide">
                  {isCompleted
                    ? '✓ Đang in hóa đơn & đóng túi...'
                    : allItemsScanned
                    ? `Thu Tiền (${paymentMethod === 'cash' ? 'Tiền Mặt' : paymentMethod === 'qr' ? 'VietQR' : 'NFC'})`
                    : `Quét Món Tiếp Theo (${scannedUnits}/${totalUnits})`}
                </span>
                <span className="text-3xl font-black font-mono tracking-tight">
                  ${(allItemsScanned ? totalAmount : scannedSubtotal).toFixed(2)}
                </span>
              </button>
            </div>

            {/* Monitor Footer Bar */}
            <div className="bg-[#0072ce] text-white px-4 py-2 flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 font-bold">
                <User className="h-4 w-4" />
                <span>Thu Ngân Viên: Player 1</span>
              </div>

              <div className="flex items-center gap-2">
                {!allItemsScanned && (
                  <>
                    <button
                      type="button"
                      onClick={handleScanNext}
                      className="flex items-center gap-1 bg-amber-400 hover:bg-amber-300 text-black px-2.5 py-0.5 rounded cursor-pointer transition font-black"
                    >
                      <ScanLine className="h-3.5 w-3.5" />
                      <span>Quét 1 Món</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleScanAll}
                      title="Quét nhanh toàn bộ giỏ hàng"
                      className="flex items-center gap-1 bg-[#00529b] hover:bg-sky-700 px-2 py-0.5 rounded cursor-pointer transition font-bold"
                    >
                      <Barcode className="h-4 w-4 text-lime-300" />
                      <span>Quét Tất Cả</span>
                    </button>
                  </>
                )}
                <Printer className="h-4 w-4 text-zinc-200" />
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM HUD SHORTCUT HINTS */}
        <div className="pt-3 border-t border-zinc-800 flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-400 mt-3">
          <div className="flex items-center gap-2">
            <span className="bg-zinc-800 px-2 py-1 rounded text-white font-mono font-bold">SPACE</span>
            <span>{allItemsScanned ? 'Thu tiền & hoàn tất đơn' : 'Quét từng món qua laser (1 cái/lần)'}</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="bg-zinc-800 px-2 py-1 rounded text-white font-mono font-bold">ESC / Q</span>
            <span>Rời quầy thu ngân</span>
          </div>
        </div>
      </div>
    </div>
  );
};

