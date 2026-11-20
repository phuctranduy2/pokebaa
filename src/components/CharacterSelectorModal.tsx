import React from 'react';
import { X, Eye, UserCheck, ShieldCheck } from 'lucide-react';
import {
  PLAYER_CHARACTER_CATALOG,
  type PlayerCharacterId,
} from '../game/PlayerCharacterCatalog';
import { soundManager } from '../game/audio';

interface CharacterSelectorModalProps {
  selectedId: PlayerCharacterId;
  cameraMode: 'first' | 'third';
  isRidingBike: boolean;
  onSelect: (id: PlayerCharacterId) => void;
  onToggleCamera: () => void;
  onClose: () => void;
}

export const CharacterSelectorModal: React.FC<CharacterSelectorModalProps> = ({
  selectedId,
  cameraMode,
  isRidingBike,
  onSelect,
  onToggleCamera,
  onClose,
}) => {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl rounded-2xl border border-white/15 bg-zinc-950/95 shadow-2xl overflow-hidden text-zinc-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-4 bg-zinc-900/70">
          <div>
            <h2 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-sky-400" />
              <span>Chọn Nhân Vật 3D</span>
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Chuyển đổi ngoại hình nhân vật có khung xương 3D • Nhìn rõ nhất ở Góc Nhìn Thứ 3 [C]
            </p>
          </div>

          <div className="flex items-center gap-2">
            {!isRidingBike && (
              <button
                type="button"
                onClick={() => {
                  soundManager.playSelectSound();
                  onToggleCamera();
                }}
                className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                  cameraMode === 'third'
                    ? 'border-sky-400/60 bg-sky-500/20 text-sky-300'
                    : 'border-white/15 bg-zinc-900 text-zinc-300 hover:bg-zinc-800'
                }`}
                title="Chuyển nhanh Góc Nhìn 1 / 3 [C]"
              >
                <Eye className="h-3.5 w-3.5" />
                <span>{cameraMode === 'third' ? 'Đang: Góc Nhìn 3 [C]' : 'Chuyển Góc Nhìn 3 [C]'}</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-white transition cursor-pointer"
              aria-label="Đóng"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Grid of characters */}
        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[72vh] overflow-y-auto">
          {PLAYER_CHARACTER_CATALOG.map((char) => {
            const isSelected = char.id === selectedId;
            return (
              <button
                key={char.id}
                type="button"
                onClick={() => {
                  soundManager.playSelectSound();
                  onSelect(char.id);
                }}
                className={`group relative flex flex-col justify-between text-left rounded-xl border p-3.5 transition cursor-pointer ${
                  isSelected
                    ? 'border-sky-400 bg-sky-950/35 shadow-[0_0_24px_rgba(56,189,248,0.18)]'
                    : 'border-white/10 bg-zinc-900/75 hover:border-white/25 hover:bg-zinc-900'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span
                      className="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider border"
                      style={{
                        color: char.accentHex,
                        borderColor: `${char.accentHex}44`,
                        backgroundColor: `${char.accentHex}18`,
                      }}
                    >
                      {char.id === 'gojo' && <ShieldCheck className="h-3 w-3" />}
                      {char.badgeLabel}
                    </span>

                    <span className="text-[10px] font-semibold text-zinc-500">
                      {char.series}
                    </span>
                  </div>

                  <div className="text-sm font-black text-white group-hover:text-sky-200 transition">
                    {char.name}
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-zinc-400">
                    {char.subtitle}
                  </p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between">
                  <span className="text-[11px] font-mono text-zinc-500">
                    {char.targetHeight.toFixed(2)}m • {char.modelUrl ? 'GLB Rigged' : 'Shop Avatar'}
                  </span>
                  <span
                    className={`text-[11px] font-bold ${
                      isSelected ? 'text-sky-300' : 'text-zinc-400 group-hover:text-white'
                    }`}
                  >
                    {isSelected ? '✓ Đang dùng' : 'Chọn'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
