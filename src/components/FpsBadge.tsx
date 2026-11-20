import React, { useEffect, useRef } from 'react';
import type { GraphicsQualityPreset } from '../game/ShopScene';

const FPS_BASE_CLASS =
  'text-[10px] font-black font-mono tabular-nums tracking-wider uppercase';
const GOOD_CLASS = `${FPS_BASE_CLASS} text-emerald-400`;
const WARN_CLASS = `${FPS_BASE_CLASS} text-amber-300`;
const LOW_CLASS = `${FPS_BASE_CLASS} text-red-400`;

const QUALITY_LABELS: Record<GraphicsQualityPreset, { short: string; cls: string }> = {
  fast: { short: 'MƯỢT', cls: 'text-cyan-300' },
  balanced: { short: 'CÂN BẰNG', cls: 'text-emerald-300' },
  high: { short: 'CAO', cls: 'text-amber-300' },
};

interface FpsBadgeProps {
  quality?: GraphicsQualityPreset;
  onCycleQuality?: () => void;
}

/**
 * Zero-re-render live FPS counter + clickable Graphics Quality preset toggle.
 * FPS text & color update directly via DOM ref every 500ms without triggering React renders.
 */
export const FpsBadge: React.FC<FpsBadgeProps> = React.memo(({ quality = 'balanced', onCycleQuality }) => {
  const fpsSpanRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    let rafId = 0;
    let frameCount = 0;
    let lastSampleMs = performance.now();
    let lastTier: 'good' | 'warn' | 'low' = 'good';

    const tick = (now: number) => {
      frameCount++;
      const elapsed = now - lastSampleMs;
      if (elapsed >= 500) {
        const fps = Math.round((frameCount * 1000) / elapsed);
        const el = fpsSpanRef.current;
        if (el) {
          el.textContent = `${fps} FPS`;
          const tier: 'good' | 'warn' | 'low' = fps >= 45 ? 'good' : fps >= 25 ? 'warn' : 'low';
          if (tier !== lastTier) {
            lastTier = tier;
            el.className = tier === 'good' ? GOOD_CLASS : tier === 'warn' ? WARN_CLASS : LOW_CLASS;
          }
        }
        frameCount = 0;
        lastSampleMs = now;
      }
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  const qMeta = QUALITY_LABELS[quality];

  return (
    <button
      type="button"
      onClick={onCycleQuality}
      title="Bấm để đổi cấu hình đồ họa tăng FPS: Cân Bằng → Siêu Mượt (Tối đa FPS) → Cao"
      className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-zinc-900/95 border border-emerald-500/35 hover:border-cyan-400/70 hover:bg-zinc-800/95 cursor-pointer transition"
    >
      <span ref={fpsSpanRef} className={GOOD_CLASS}>
        -- FPS
      </span>
      <span className="text-zinc-600 text-[9px] select-none">•</span>
      <span className={`text-[9px] font-black tracking-wider uppercase ${qMeta.cls}`}>
        {qMeta.short}
      </span>
    </button>
  );
});

FpsBadge.displayName = 'FpsBadge';
