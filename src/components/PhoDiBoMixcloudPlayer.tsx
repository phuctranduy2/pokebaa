import React, { useEffect, useRef, useState } from 'react';
import { soundManager } from '../game/audio';

export type MixcloudVenueKey = 'toxic' | 'khoi' | 'fouru' | 'newdtv';

interface VenueTrackConfig {
  feed: string;
  startAtSeconds: number;
  title: string;
}

const VENUE_TRACKS: Record<MixcloudVenueKey, VenueTrackConfig> = {
  toxic: {
    feed: '/djbacsihai/b%C3%A1c-s%C4%A9-h%E1%BA%A3i-ng%C6%B0%E1%BB%9Di-ch%C6%A1i-h%E1%BB%87-n%C6%B0%E1%BB%9Bc-2/',
    startAtSeconds: 0,
    title: 'Mixcloud TOXIC Club DJ',
  },
  khoi: {
    feed: '/djbacsihai/bac-si-hai-the-xingxing-nightclub-hcm-28-9-2018/',
    startAtSeconds: 540, // Bắt đầu từ phút thứ 9 (09:00)
    title: 'Mixcloud KHOI Food Garden DJ',
  },
  fouru: {
    feed: '/jarty-ye/djye%E9%9D%9C%E9%9B%AF-private-mixhaozi-the-next-episode-x-kkecho%E9%82%A3%E5%A5%87%E6%B2%83%E5%A4%AB-%E5%94%AF%E4%B8%80-vs-%E8%8B%A6%E5%92%96%E5%95%A1-x-%E9%BB%83%E9%9C%84%E9%9B%B2-lydiamixtape-2x23/',
    startAtSeconds: 0,
    title: 'Mixcloud 4U CLUB DJ',
  },
  newdtv: {
    feed: '/djthaihoang1991/vinahouse-2019-anh-%C4%91ang-%E1%BB%9F-%C4%91%C3%A2u-%C4%91%E1%BA%A5y-anh-ft-%C4%91%E1%BB%ABng-t%C3%ACm-anh-n%E1%BB%AFa-dj-th%C3%A1i-ho%C3%A0ng/',
    startAtSeconds: 0,
    title: 'Mixcloud NEW DTV Vinahouse DJ Thai Hoang',
  },
};

interface MixcloudWidgetInstance {
  ready: Promise<MixcloudWidgetInstance>;
  play?: () => Promise<void> | void;
  pause?: () => Promise<void> | void;
  seek?: (seconds: number) => Promise<boolean> | void;
  getPosition?: () => Promise<number>;
  getIsPaused?: () => Promise<boolean>;
  events?: {
    play?: { on?: (cb: () => void) => void };
    pause?: { on?: (cb: () => void) => void };
  };
}

declare global {
  interface Window {
    Mixcloud?: {
      PlayerWidget: (iframe: HTMLIFrameElement) => MixcloudWidgetInstance;
    };
  }
}

function loadMixcloudWidgetApi(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.Mixcloud?.PlayerWidget) return Promise.resolve();
  return new Promise((resolve) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-mixcloud-widget-api="true"]');
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => resolve(), { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://widget.mixcloud.com/media/js/widgetApi.js';
    script.async = true;
    script.dataset.mixcloudWidgetApi = 'true';
    script.onload = () => resolve();
    script.onerror = () => resolve();
    document.head.appendChild(script);
  });
}

interface MixcloudVenueSlotProps {
  venue: MixcloudVenueKey;
  isActive: boolean;
  isMuted: boolean;
}

const MixcloudVenueSlot: React.FC<MixcloudVenueSlotProps> = ({ venue, isActive, isMuted }) => {
  const cfg = VENUE_TRACKS[venue];
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const widgetRef = useRef<MixcloudWidgetInstance | null>(null);
  const activeRef = useRef(isActive);
  const isMutedRef = useRef(isMuted);
  const mixcloudPlayingRef = useRef(false);
  const hasSeekedStartRef = useRef(cfg.startAtSeconds <= 0);
  const [hasEnteredOnce, setHasEnteredOnce] = useState(false);

  activeRef.current = isActive;
  isMutedRef.current = isMuted;

  useEffect(() => {
    if (isActive && !hasEnteredOnce) {
      setHasEnteredOnce(true);
    }
  }, [isActive, hasEnteredOnce]);

  const ensureStartTimestamp = async (widget: MixcloudWidgetInstance) => {
    if (cfg.startAtSeconds <= 0 || hasSeekedStartRef.current) return;
    try {
      await widget.seek?.(cfg.startAtSeconds);
      const pos = await widget.getPosition?.().catch(() => cfg.startAtSeconds);
      if (typeof pos === 'number' && pos >= cfg.startAtSeconds - 15) {
        hasSeekedStartRef.current = true;
      }
    } catch (_) {}
  };

  useEffect(() => {
    if (!hasEnteredOnce || !iframeRef.current) return;
    let cancelled = false;

    const attachWidget = async () => {
      await loadMixcloudWidgetApi();
      if (cancelled || !iframeRef.current || !window.Mixcloud?.PlayerWidget) return;
      try {
        const widget = window.Mixcloud.PlayerWidget(iframeRef.current);
        widgetRef.current = widget;
        await widget.ready;
        if (cancelled) return;

        widget.events?.play?.on?.(() => {
          mixcloudPlayingRef.current = true;
          soundManager.stopToxicDjAudio();
          if (cfg.startAtSeconds > 0 && !hasSeekedStartRef.current) {
            window.setTimeout(() => {
              if (!cancelled && activeRef.current) {
                void ensureStartTimestamp(widget);
              }
            }, 220);
            window.setTimeout(() => {
              if (!cancelled && activeRef.current && !hasSeekedStartRef.current) {
                void ensureStartTimestamp(widget);
              }
            }, 900);
          }
        });
        widget.events?.pause?.on?.(() => {
          mixcloudPlayingRef.current = false;
        });

        if (activeRef.current && !isMutedRef.current) {
          await widget.play?.();
          await ensureStartTimestamp(widget);
          const paused = await widget.getIsPaused?.().catch(() => true);
          if (paused === false) {
            mixcloudPlayingRef.current = true;
            soundManager.stopToxicDjAudio();
          }
        } else {
          await widget.pause?.();
          mixcloudPlayingRef.current = false;
        }
      } catch (_) {}
    };

    attachWidget();
    return () => {
      cancelled = true;
    };
  }, [hasEnteredOnce]);

  useEffect(() => {
    if (!isActive || isMuted) {
      mixcloudPlayingRef.current = false;
      const widget = widgetRef.current;
      if (widget) {
        widget.ready.then(() => widget.pause?.()).catch(() => {});
      } else if (iframeRef.current?.contentWindow) {
        try {
          iframeRef.current.contentWindow.postMessage(
            JSON.stringify({
              type: 'method',
              data: { methodId: Date.now(), methodName: 'pause', args: [] },
            }),
            '*'
          );
        } catch (_) {}
      }
      return;
    }

    const widget = widgetRef.current;
    if (widget) {
      widget.ready
        .then(async () => {
          await widget.play?.();
          await ensureStartTimestamp(widget);
          const paused = await widget.getIsPaused?.().catch(() => true);
          if (paused === false) {
            mixcloudPlayingRef.current = true;
            soundManager.stopToxicDjAudio();
          }
        })
        .catch(() => {});
    } else if (iframeRef.current?.contentWindow) {
      try {
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({
            type: 'method',
            data: { methodId: Date.now(), methodName: 'play', args: [] },
          }),
          '*'
        );
        if (cfg.startAtSeconds > 0 && !hasSeekedStartRef.current) {
          iframeRef.current.contentWindow.postMessage(
            JSON.stringify({
              type: 'method',
              data: { methodId: Date.now() + 1, methodName: 'seek', args: [cfg.startAtSeconds] },
            }),
            '*'
          );
        }
      } catch (_) {}
    }

    const fallbackTimer = window.setTimeout(() => {
      if (activeRef.current && !isMutedRef.current && !mixcloudPlayingRef.current) {
        soundManager.updateToxicDjAudio(0.95, venue);
      }
    }, 900);

    return () => {
      window.clearTimeout(fallbackTimer);
    };
  }, [isActive, isMuted, hasEnteredOnce, venue]);

  if (!hasEnteredOnce) return null;

  const src = `https://player-widget.mixcloud.com/widget/iframe/?feed=${encodeURIComponent(
    cfg.feed
  )}&hide_cover=1&mini=1&autoplay=1`;

  return (
    <div
      className="fixed bottom-0 left-0 z-30 h-[60px] w-[320px] opacity-[0.004] pointer-events-none overflow-hidden"
      aria-hidden="true"
    >
      <iframe
        ref={iframeRef}
        title={cfg.title}
        width="320"
        height="60"
        tabIndex={-1}
        src={src}
        allow="autoplay; encrypted-media; fullscreen"
        className="block border-0"
      />
    </div>
  );
};

interface PhoDiBoMixcloudPlayerProps {
  activeVenue: MixcloudVenueKey | null;
}

export const PhoDiBoMixcloudPlayer: React.FC<PhoDiBoMixcloudPlayerProps> = ({ activeVenue }) => {
  const [isMuted, setIsMuted] = useState<boolean>(() => soundManager.getMuted());

  useEffect(() => {
    const unsub = soundManager.addTrackChangeListener(() => {
      setIsMuted(soundManager.getMuted());
    });
    return unsub;
  }, []);

  return (
    <>
      <MixcloudVenueSlot venue="toxic" isActive={activeVenue === 'toxic'} isMuted={isMuted} />
      <MixcloudVenueSlot venue="khoi" isActive={activeVenue === 'khoi'} isMuted={isMuted} />
      <MixcloudVenueSlot venue="fouru" isActive={activeVenue === 'fouru'} isMuted={isMuted} />
      <MixcloudVenueSlot venue="newdtv" isActive={activeVenue === 'newdtv'} isMuted={isMuted} />
    </>
  );
};
