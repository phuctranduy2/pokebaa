/**
 * Web Audio API Sound Engine & Procedural Music Synthesizer.
 * Provides authentic Casino Lounge Jazz BGM, 8-bit Mega Retro Chiptune BGM,
 * and complete slot SFX (quarter drop, lever pull, reel stop, win fanfares).
 * Zero external audio files (100% self-contained, no 404s).
 */

export interface BgmTrackItem {
  id: string;
  title: string;
  artist?: string;
  url: string;
}

export const DEFAULT_BGM_PLAYLIST: BgmTrackItem[] = [
  {
    id: 'track_1',
    title: 'Bài #1 • Nhạc Buổi Tối (Sudden Purple)',
    artist: 'EdgeOne / Original',
    url: '/audio/bgm_edgeone_1.mp3',
  },
  {
    id: 'track_2',
    title: 'Bài #2 • Nhạc Buổi Chiều (Desperate Orange)',
    artist: 'EdgeOne / Original',
    url: '/audio/bgm_edgeone_2.mp3',
  },
  {
    id: 'track_3',
    title: 'Bài #3 • Nhạc Buổi Sáng (Lofi Study)',
    artist: 'Pixabay / Royalty-Free Lofi',
    url: '/audio/bgm_lofi_chill_3.mp3',
  },
];

export type TimeOfDayMusicPeriod = 'morning' | 'afternoon' | 'evening';

/**
 * Maps game clock hour (0..24) to Morning / Afternoon / Evening period:
 * - Buổi sáng (05:30 - 11:59) -> morning  -> Bài #3
 * - Buổi chiều (12:00 - 17:59) -> afternoon -> Bài #2
 * - Buổi tối (18:00 - 05:29) -> evening   -> Bài #1
 */
export function getTimeOfDayMusicPeriod(rawHour: number): TimeOfDayMusicPeriod {
  const h = (((rawHour || 0) % 24) + 24) % 24;
  if (h >= 5.5 && h < 12.0) return 'morning';
  if (h >= 12.0 && h < 18.0) return 'afternoon';
  return 'evening';
}

export function getTrackIdForHour(rawHour: number): 'track_1' | 'track_2' | 'track_3' {
  const period = getTimeOfDayMusicPeriod(rawHour);
  if (period === 'morning') return 'track_3';
  if (period === 'afternoon') return 'track_2';
  return 'track_1';
}

/**
 * Returns true when the player is physically inside the Pokémon Card Shop building
 * (Floor 1, Floor 2, Manager Office, or Live Studio room).
 * Stepping past the front glass doors (Z > 15.55) onto the sidewalk or entering other buildings returns false.
 */
export function isPlayerInsidePokemonShop(x: number, y: number, z: number): boolean {
  if (y < -0.5 || y > 11.0) return false;
  const inMainShop = x >= -12.7 && x <= 12.7 && z >= -11.7 && z <= 15.55;
  if (inMainShop) return true;
  if (y < 4.5) {
    const inManagerOffice = x >= -13.2 && x <= -7.3 && z >= -17.3 && z < -11.5;
    if (inManagerOffice) return true;
    const inLiveStudio = x >= 7.2 && x <= 12.7 && z >= -17.3 && z < -11.5;
    if (inLiveStudio) return true;
  }
  return false;
}

export type BgmTrack = 'schedule' | 'random' | 'track_1' | 'track_2' | 'track_3' | 'jazz' | 'megaman' | 'chill' | string;

class SoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private masterGain: GainNode | null = null;
  private bgmGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;

  private isBgmPlaying: boolean = false;
  private currentTrack: BgmTrack = 'schedule';
  private bgmIntervalId: number | null = null;
  private bgmVolume: number = 0.75;
  private musicDuckFactor: number = 1.0;
  private static readonly BGM_LEVEL_SCALE: number = 0.15;

  // HTML5 Audio streaming player for BGM tracks & venue ambience SFX
  private bgmAudio: HTMLAudioElement | null = null;
  private ronBeoCheerAudios: HTMLAudioElement[] = [];
  private playlist: BgmTrackItem[] = [];
  private currentTrackIndex: number = -1;
  private isRandomMode: boolean = false;
  private isTimeScheduleMode: boolean = true;
  private externalZoneOverride: boolean = false;
  private playerInsideShop: boolean = true;
  private currentRawHour: number = 7.0;
  private listeners: Array<() => void> = [];
  private toxicDjGain: GainNode | null = null;
  private toxicDjTimer: number | null = null;
  private toxicDjStep: number = 0;
  private toxicDjTargetVol: number = 0;
  private toxicDjSilenceTicks: number = 0;
  private toxicDjStyle: 'toxic' | 'khoi' | 'fouru' | 'newdtv' = 'toxic';

  constructor() {
    this.loadPlaylist();
    this.setupUserInteractionUnlock();
  }

  private loadPlaylist() {
    this.playlist = [...DEFAULT_BGM_PLAYLIST];
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const customUrl = localStorage.getItem('pokecard_bgm_track_custom');
        if (customUrl && customUrl.trim().startsWith('http')) {
          this.playlist.push({
            id: 'track_custom',
            title: 'Giai Điệu Tùy Chỉnh',
            artist: 'Custom Stream URL',
            url: customUrl.trim(),
          });
        }
      } catch (_) {}
    }
  }

  private setupUserInteractionUnlock() {
    if (typeof window === 'undefined') return;
    const unlock = () => {
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      if (
        this.isBgmPlaying &&
        this.bgmAudio &&
        this.bgmAudio.paused &&
        !this.isMuted &&
        !this.externalZoneOverride &&
        this.playerInsideShop
      ) {
        this.bgmAudio.play().catch(() => {});
      }
    };
    window.addEventListener('pointerdown', unlock, { passive: true });
    window.addEventListener('click', unlock, { passive: true });
    window.addEventListener('keydown', unlock, { passive: true });
    window.addEventListener('touchstart', unlock, { passive: true });
  }

  private initBgmAudio() {
    if (typeof Audio === 'undefined') return;
    if (!this.bgmAudio) {
      this.bgmAudio = new Audio();
      this.bgmAudio.preload = 'auto';
      // Do NOT set crossOrigin as it blocks servers without CORS headers
      this.bgmAudio.volume = this.getEffectiveBgmAudioVolume();

      // Auto-replay time-scheduled song or advance to next track when song ends
      this.bgmAudio.addEventListener('ended', () => {
        if (this.isBgmPlaying && !this.isMuted && this.playerInsideShop && !this.externalZoneOverride) {
          if (this.isTimeScheduleMode) {
            const targetId = getTrackIdForHour(this.currentRawHour);
            const idx = this.playlist.findIndex((t) => t.id === targetId);
            if (idx !== -1) {
              this.playTrackByIndex(idx, true);
              return;
            }
          }
          this.playNextTrack(true);
        }
      });

      // Handle stream errors by falling back or picking next track
      this.bgmAudio.addEventListener('error', (err) => {
        console.warn('BGM stream error, trying next track:', err);
        setTimeout(() => {
          if (this.isBgmPlaying && !this.isMuted && this.playerInsideShop && !this.externalZoneOverride) {
            this.playNextTrack(true);
          }
        }, 1000);
      });
    }
  }

  private initContext() {
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();

        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 1, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);

        this.bgmGain = this.ctx.createGain();
        this.bgmGain.gain.setValueAtTime(
          this.getEffectiveBgmGain(),
          this.ctx.currentTime
        );
        this.bgmGain.connect(this.masterGain);

        this.sfxGain = this.ctx.createGain();
        this.sfxGain.gain.setValueAtTime(this.isMuted ? 0 : 0.8, this.ctx.currentTime);
        this.sfxGain.connect(this.masterGain);

        this.toxicDjGain = this.ctx.createGain();
        this.toxicDjGain.gain.setValueAtTime(0, this.ctx.currentTime);
        this.toxicDjGain.connect(this.masterGain);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(muted ? 0 : 1, this.ctx.currentTime);
    }
    if (this.bgmGain && this.ctx) {
      this.bgmGain.gain.setValueAtTime(
        this.getEffectiveBgmGain(),
        this.ctx.currentTime
      );
    }
    if (this.bgmAudio) {
      this.bgmAudio.volume = this.getEffectiveBgmAudioVolume();
      if (muted || this.externalZoneOverride || !this.playerInsideShop) {
        this.bgmAudio.pause();
      } else if (this.isBgmPlaying) {
        this.bgmAudio.play().catch(() => {});
      }
    }
    if (muted) {
      for (const a of this.ronBeoCheerAudios) {
        try {
          a.pause();
        } catch (_) {}
      }
      this.stopToxicDjAudio();
      this.stopRainAmbience();
    }
    this.notifyTrackChange();
  }

  /**
   * Mutes/pauses in-shop background music and automated in-shop simulation SFX
   * whenever the player steps outside the Pokémon Card Shop building.
   */
  public setPlayerInsideShop(inside: boolean) {
    if (this.playerInsideShop === inside) return;
    this.playerInsideShop = inside;
    if (this.bgmGain && this.ctx) {
      this.bgmGain.gain.setTargetAtTime(
        this.getEffectiveBgmGain(),
        this.ctx.currentTime,
        0.08
      );
    }
    if (this.bgmAudio) {
      this.bgmAudio.volume = this.getEffectiveBgmAudioVolume();
      if (!inside || this.externalZoneOverride || this.isMuted) {
        try {
          this.bgmAudio.pause();
        } catch (_) {}
      } else if (this.isBgmPlaying) {
        this.bgmAudio.play().catch(() => {});
      }
    }
    this.notifyTrackChange();
  }

  public isPlayerInsideShop(): boolean {
    return this.playerInsideShop;
  }

  public isShopWorldAudioAllowed(): boolean {
    return !this.isMuted && this.playerInsideShop;
  }

  /**
   * Temporarily pauses standard BGM when the player enters a special music zone
   * (e.g. Phố Đi Bộ DJ set), and resumes it smoothly upon exit.
   */
  public setExternalZoneOverride(active: boolean) {
    if (this.externalZoneOverride === active) return;
    this.externalZoneOverride = active;
    if (this.bgmGain && this.ctx) {
      this.bgmGain.gain.setValueAtTime(
        this.getEffectiveBgmGain(),
        this.ctx.currentTime
      );
    }
    if (this.bgmAudio) {
      this.bgmAudio.volume = this.getEffectiveBgmAudioVolume();
      if (active || !this.playerInsideShop) {
        try {
          this.bgmAudio.pause();
        } catch (_) {}
      } else if (this.isBgmPlaying && !this.isMuted) {
        this.bgmAudio.play().catch(() => {});
      }
    }
    this.notifyTrackChange();
  }

  public isExternalZoneOverride(): boolean {
    return this.externalZoneOverride;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public toggleMuted(): boolean {
    this.setMuted(!this.isMuted);
    return this.isMuted;
  }

  private getEffectiveBgmAudioVolume(): number {
    return this.isMuted || this.externalZoneOverride || !this.playerInsideShop
      ? 0
      : Math.max(0, Math.min(1, this.bgmVolume * SoundEngine.BGM_LEVEL_SCALE * this.musicDuckFactor));
  }

  private getEffectiveBgmGain(): number {
    return this.isMuted || this.externalZoneOverride || !this.playerInsideShop
      ? 0
      : this.bgmVolume * SoundEngine.BGM_LEVEL_SCALE * 0.25 * this.musicDuckFactor;
  }

  public setMusicDuckingFactor(factor: number) {
    this.musicDuckFactor = Math.max(0, Math.min(1, factor));
    if (this.bgmGain && this.ctx) {
      this.bgmGain.gain.setTargetAtTime(this.getEffectiveBgmGain(), this.ctx.currentTime, 0.06);
    }
    if (this.bgmAudio) {
      this.bgmAudio.volume = this.getEffectiveBgmAudioVolume();
    }
  }

  public getMusicDuckingFactor(): number {
    return this.musicDuckFactor;
  }

  public getEffectiveBgmVolume(): number {
    return this.getEffectiveBgmAudioVolume();
  }

  public setVolume(vol: number) {
    this.bgmVolume = Math.max(0, Math.min(1, vol));
    if (this.bgmGain && this.ctx && !this.isMuted) {
      this.bgmGain.gain.setValueAtTime(
        this.getEffectiveBgmGain(),
        this.ctx.currentTime
      );
    }
    if (this.bgmAudio && !this.isMuted) {
      this.bgmAudio.volume = this.getEffectiveBgmAudioVolume();
    }
  }

  public getVolume(): number {
    return this.bgmVolume;
  }

  public getCurrentTrack(): BgmTrack {
    return this.currentTrack;
  }

  public setTrack(track: BgmTrack) {
    this.currentTrack = track;
    if (track === 'schedule') {
      this.isTimeScheduleMode = true;
      this.isRandomMode = false;
      const idx = this.playlist.findIndex((t) => t.id === getTrackIdForHour(this.currentRawHour));
      if (idx !== -1) {
        this.playTrackByIndex(idx);
      } else {
        this.playNextTrack(false);
      }
      return;
    }

    if (track === 'random') {
      this.isTimeScheduleMode = false;
      this.isRandomMode = true;
      this.playNextTrack(false);
      return;
    }

    // Specific track selected manually
    this.isTimeScheduleMode = false;
    this.isRandomMode = false;

    if (track === 'jazz') {
      this.stopBGM();
      this.isBgmPlaying = true;
      this.initContext();
      this.startJazzLounge();
      this.notifyTrackChange();
      return;
    }
    if (track === 'megaman') {
      this.stopBGM();
      this.isBgmPlaying = true;
      this.initContext();
      this.startMegaManChiptune();
      this.notifyTrackChange();
      return;
    }
    if (track === 'chill') {
      this.stopBGM();
      this.isBgmPlaying = true;
      this.initContext();
      this.startChillAmbient();
      this.notifyTrackChange();
      return;
    }

    const idx = this.playlist.findIndex((t) => t.id === track);
    if (idx !== -1) {
      this.playTrackByIndex(idx);
    } else {
      this.playNextTrack(false);
    }
  }

  /**
   * Synchronizes background music with the current in-game hour:
   * - Buổi sáng (05:30 - 12:00): Bài #3
   * - Buổi chiều (12:00 - 18:00): Bài #2
   * - Buổi tối (18:00 - 05:30): Bài #1
   */
  public syncTimeOfDayMusic(rawHour: number) {
    const normalized = (((rawHour || 0) % 24) + 24) % 24;
    this.currentRawHour = normalized;
    if (!this.isTimeScheduleMode || this.playlist.length === 0) return;

    const targetId = getTrackIdForHour(normalized);
    const idx = this.playlist.findIndex((t) => t.id === targetId);
    if (idx === -1) return;

    if (this.isBgmPlaying) {
      if (this.currentTrackIndex !== idx || !this.bgmAudio?.src) {
        this.playTrackByIndex(idx);
      }
    } else if (this.currentTrackIndex !== idx || this.currentTrack !== targetId) {
      this.currentTrackIndex = idx;
      this.currentTrack = targetId;
      this.notifyTrackChange();
    }
  }

  /**
   * Play the next track. In random mode, picks a random song different from current.
   */
  public playNextTrack(isAutoNext: boolean = false) {
    if (this.playlist.length === 0) return;
    let nextIdx: number;

    if (this.isRandomMode) {
      if (this.playlist.length > 1) {
        let attempts = 0;
        do {
          nextIdx = Math.floor(Math.random() * this.playlist.length);
          attempts++;
        } while (nextIdx === this.currentTrackIndex && attempts < 10);
      } else {
        nextIdx = 0;
      }
    } else {
      nextIdx = (this.currentTrackIndex + 1) % this.playlist.length;
    }

    if (!isAutoNext && this.isTimeScheduleMode) {
      this.isTimeScheduleMode = false;
    }
    this.playTrackByIndex(nextIdx, isAutoNext);
  }

  public playPrevTrack() {
    if (this.playlist.length === 0) return;
    this.isTimeScheduleMode = false;
    const prevIdx = (this.currentTrackIndex - 1 + this.playlist.length) % this.playlist.length;
    this.playTrackByIndex(prevIdx);
  }

  public playTrackByIndex(index: number, forceReplaySameTrack: boolean = false) {
    if (index < 0 || index >= this.playlist.length) return;
    this.initContext();
    this.initBgmAudio();
    if (!this.bgmAudio) return;

    const track = this.playlist[index];
    const isSameTrack = this.currentTrackIndex === index && !!this.bgmAudio.src && this.bgmAudio.src.endsWith(track.url);
    this.currentTrackIndex = index;
    this.currentTrack = track.id as BgmTrack;
    this.isBgmPlaying = true;

    // Stop synthetic interval if active
    if (this.bgmIntervalId) {
      clearInterval(this.bgmIntervalId);
      this.bgmIntervalId = null;
    }

    try {
      this.bgmAudio.volume = this.getEffectiveBgmAudioVolume();
      if (!isSameTrack) {
        this.bgmAudio.src = track.url;
        this.bgmAudio.load();
      } else if (forceReplaySameTrack || this.bgmAudio.ended) {
        this.bgmAudio.currentTime = 0;
      }
      if (!this.isMuted && !this.externalZoneOverride && this.playerInsideShop) {
        const playPromise = this.bgmAudio.play();
        if (playPromise && typeof playPromise.catch === 'function') {
          playPromise.catch(() => {
            // Autoplay deferred until user interaction
          });
        }
      }
    } catch (err) {
      console.warn('Error playing audio track:', err);
    }

    this.notifyTrackChange();
  }

  // ----------------------------------------------------
  // BGM PLAYBACK CONTROL (Default: Morning #3 / Afternoon #2 / Evening #1)
  // ----------------------------------------------------
  public startBGM(track?: BgmTrack) {
    this.initContext();
    this.initBgmAudio();
    this.isBgmPlaying = true;

    if (track === 'schedule' || (!track && this.isTimeScheduleMode)) {
      this.isTimeScheduleMode = true;
      this.isRandomMode = false;
      const targetId = getTrackIdForHour(this.currentRawHour);
      const idx = this.playlist.findIndex((t) => t.id === targetId);
      if (idx !== -1) {
        this.playTrackByIndex(idx);
        return;
      }
    }

    if (track && track !== 'random' && track !== 'schedule' && track !== 'jazz' && track !== 'megaman' && track !== 'chill') {
      const idx = this.playlist.findIndex((t) => t.id === track);
      if (idx !== -1) {
        this.playTrackByIndex(idx);
        return;
      }
    }

    if (track === 'jazz') {
      this.startJazzLounge();
      return;
    }
    if (track === 'megaman') {
      this.startMegaManChiptune();
      return;
    }
    if (track === 'chill') {
      this.startChillAmbient();
      return;
    }

    // Default or fallback
    if (this.currentTrackIndex === -1 || !this.bgmAudio?.src) {
      this.playNextTrack(false);
    } else if (this.bgmAudio.paused && !this.isMuted && !this.externalZoneOverride && this.playerInsideShop) {
      this.bgmAudio.play().catch(() => {});
    }
  }

  public stopBGM() {
    this.isBgmPlaying = false;
    if (this.bgmAudio) {
      try {
        this.bgmAudio.pause();
      } catch (_) {}
    }
    if (this.bgmIntervalId) {
      clearInterval(this.bgmIntervalId);
      this.bgmIntervalId = null;
    }
    this.notifyTrackChange();
  }

  // Playlist, Time-of-Day Schedule & Random Mode helpers
  public getPlaylist(): BgmTrackItem[] {
    return [...this.playlist];
  }

  public getCurrentTrackItem(): BgmTrackItem | null {
    if (this.currentTrackIndex >= 0 && this.currentTrackIndex < this.playlist.length) {
      return this.playlist[this.currentTrackIndex];
    }
    return null;
  }

  public getCurrentTrackIndex(): number {
    return this.currentTrackIndex;
  }

  public isRandom(): boolean {
    return this.isRandomMode;
  }

  public isTimeScheduled(): boolean {
    return this.isTimeScheduleMode;
  }

  public setTimeScheduleMode(enabled: boolean) {
    this.isTimeScheduleMode = enabled;
    if (enabled) {
      this.isRandomMode = false;
      this.syncTimeOfDayMusic(this.currentRawHour);
    }
    this.notifyTrackChange();
  }

  public setRandomMode(enabled: boolean) {
    this.isRandomMode = enabled;
    if (enabled) {
      this.isTimeScheduleMode = false;
    }
    this.notifyTrackChange();
  }

  public toggleRandomMode(): boolean {
    const nextRandom = !this.isRandomMode;
    this.isRandomMode = nextRandom;
    this.isTimeScheduleMode = !nextRandom;
    if (this.isTimeScheduleMode) {
      this.syncTimeOfDayMusic(this.currentRawHour);
    } else if (this.isBgmPlaying) {
      this.playNextTrack(false);
    }
    this.notifyTrackChange();
    return this.isRandomMode;
  }

  public isPlaying(): boolean {
    return this.isBgmPlaying && !this.isMuted;
  }

  public setTrack3Url(url: string) {
    const trimmed = url.trim();
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        if (trimmed) {
          localStorage.setItem('pokecard_bgm_track_3', trimmed);
        } else {
          localStorage.removeItem('pokecard_bgm_track_3');
        }
      } catch (_) {}
    }
    this.loadPlaylist();
    this.notifyTrackChange();
  }

  public getTrack3Url(): string {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        return localStorage.getItem('pokecard_bgm_track_3') || '';
      } catch (_) {}
    }
    return '';
  }

  public addTrackChangeListener(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notifyTrackChange() {
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch (_) {}
    });
  }

  private startJazzLounge() {
    if (!this.ctx || !this.bgmGain) return;

    // Swing tempo: 116 BPM -> Quarter note ~ 0.517s
    const beatSec = 60 / 116;
    const barSec = beatSec * 4;

    // 12-bar Jazz progression in F
    // Fmaj7 - D7b9 - Gm7 - C7#9 | Am7 - D7 | Gm7 - C7 | Fmaj7 ...
    const jazzChords = [
      { name: 'Fmaj9', root: 87.31, notes: [349.23, 440.0, 523.25, 659.25, 783.99] },
      { name: 'D7alt', root: 73.42, notes: [293.66, 369.99, 440.0, 523.25, 622.25] },
      { name: 'Gm9', root: 98.0, notes: [392.0, 466.16, 587.33, 698.46, 880.0] },
      { name: 'C13', root: 65.41, notes: [261.63, 329.63, 466.16, 587.33, 880.0] },
      { name: 'Am9', root: 110.0, notes: [440.0, 523.25, 659.25, 783.99, 987.77] },
      { name: 'D7b9', root: 73.42, notes: [293.66, 369.99, 440.0, 523.25, 622.25] },
      { name: 'Gm11', root: 98.0, notes: [392.0, 466.16, 523.25, 587.33, 698.46] },
      { name: 'C7alt', root: 65.41, notes: [261.63, 329.63, 415.3, 466.16, 622.25] },
    ];

    let chordIndex = 0;
    let tickCount = 0;

    const playJazzBar = () => {
      if (!this.ctx || !this.bgmGain || !this.isBgmPlaying || !this.playerInsideShop || this.externalZoneOverride) return;
      const startTime = this.ctx.currentTime;
      const chord = jazzChords[chordIndex % jazzChords.length];
      chordIndex++;
      tickCount++;

      // 1. Plucked Walking Double Bass (4 beats walking pattern)
      const bassRoots = [
        chord.root,
        chord.root * 1.25, // third
        chord.root * 1.5,  // fifth
        chord.root * 1.414, // chromatic leading tone
      ];

      bassRoots.forEach((freq, beat) => {
        const t = startTime + beat * beatSec;
        const osc = this.ctx!.createOscillator();
        const subOsc = this.ctx!.createOscillator();
        const filter = this.ctx!.createBiquadFilter();
        const g = this.ctx!.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t);

        subOsc.type = 'sine';
        subOsc.frequency.setValueAtTime(freq / 2, t);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(260, t);
        filter.frequency.exponentialRampToValueAtTime(80, t + beatSec * 0.9);

        g.gain.setValueAtTime(0.24, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + beatSec * 0.9);

        osc.connect(filter);
        subOsc.connect(filter);
        filter.connect(g);
        g.connect(this.bgmGain!);

        osc.start(t);
        subOsc.start(t);
        osc.stop(t + beatSec);
        subOsc.stop(t + beatSec);
      });

      // 2. Jazz Piano / Rhodes Comping (syncopated swing rhythm on beats 1, 2-and, and 4)
      const pianoHits = [0, beatSec * 1.66, beatSec * 3];
      pianoHits.forEach((hitOffset) => {
        const t = startTime + hitOffset;
        chord.notes.forEach((noteFreq, ni) => {
          const osc = this.ctx!.createOscillator();
          const pGain = this.ctx!.createGain();
          const pFilter = this.ctx!.createBiquadFilter();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(noteFreq + (ni % 2 === 0 ? 0.4 : -0.4), t);

          pFilter.type = 'lowpass';
          pFilter.frequency.setValueAtTime(2200, t);
          pFilter.frequency.exponentialRampToValueAtTime(600, t + 1.2);

          pGain.gain.setValueAtTime(0.045, t);
          pGain.gain.exponentialRampToValueAtTime(0.0005, t + 1.2);

          osc.connect(pFilter);
          pFilter.connect(pGain);
          pGain.connect(this.bgmGain!);

          osc.start(t);
          osc.stop(t + 1.3);
        });
      });

      // 3. Swing Brushed Drums (Crisp swing ride/hi-hat on beats 2 & 4, soft brush on 1 & 3)
      for (let beat = 0; beat < 4; beat++) {
        const t = startTime + beat * beatSec;
        const isAccent = beat === 1 || beat === 3;

        // Main beat
        this.playBrushTap(t, isAccent ? 0.12 : 0.05, isAccent ? 6000 : 3500);

        // Swing "ding-a-ling" triplet bounce on 2-and and 4-and
        if (isAccent) {
          const swingT = t + beatSec * 0.66;
          this.playBrushTap(swingT, 0.07, 7500);
        }
      }

      // 4. Melodic jazz vibraphone lick every 2 bars
      if (tickCount % 2 === 0) {
        const lickNotes = [chord.notes[2], chord.notes[3], chord.notes[4], chord.notes[1]];
        lickNotes.forEach((nFreq, li) => {
          const t = startTime + beatSec * (1.5 + li * 0.5);
          const vOsc = this.ctx!.createOscillator();
          const vGain = this.ctx!.createGain();

          vOsc.type = 'sine';
          vOsc.frequency.setValueAtTime(nFreq * 1.5, t);

          vGain.gain.setValueAtTime(0.06, t);
          vGain.gain.exponentialRampToValueAtTime(0.0008, t + 0.8);

          vOsc.connect(vGain);
          vGain.connect(this.bgmGain!);

          vOsc.start(t);
          vOsc.stop(t + 0.85);
        });
      }
    };

    playJazzBar();
    this.bgmIntervalId = window.setInterval(playJazzBar, barSec * 1000);
  }

  private playBrushTap(time: number, vol: number, freq: number) {
    if (!this.ctx || !this.bgmGain) return;
    const dur = 0.06;
    const bufferSize = this.ctx.sampleRate * dur;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.2));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(freq, time);
    filter.Q.setValueAtTime(3, time);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.bgmGain);

    noise.start(time);
  }

  // ----------------------------------------------------
  // MEGA MAN RETRO CHIPTUNE BGM (8-BIT STAGE THEME)
  // ----------------------------------------------------
  private startMegaManChiptune() {
    if (!this.ctx || !this.bgmGain) return;

    // 145 BPM driving chiptune
    const beatSec = 60 / 145;
    const barSec = beatSec * 4;

    const bassNotes = [110, 110, 130.81, 146.83, 164.81, 146.83, 130.81, 123.47];
    const melodyNotes = [
      [440, 523.25, 659.25, 880],
      [659.25, 783.99, 987.77, 880],
      [587.33, 698.46, 880, 1046.5],
      [659.25, 587.33, 523.25, 440],
    ];

    let step = 0;
    const playChiptuneBar = () => {
      if (!this.ctx || !this.bgmGain || !this.isBgmPlaying || !this.playerInsideShop || this.externalZoneOverride) return;
      const t = this.ctx.currentTime;
      const currentMelody = melodyNotes[step % melodyNotes.length];
      step++;

      // Pulse wave bass arpeggio
      for (let i = 0; i < 8; i++) {
        const noteT = t + (i * beatSec) / 2;
        const bOsc = this.ctx!.createOscillator();
        const bGain = this.ctx!.createGain();

        bOsc.type = 'sawtooth';
        bOsc.frequency.setValueAtTime(bassNotes[(step * 2 + i) % bassNotes.length], noteT);

        bGain.gain.setValueAtTime(0.05, noteT);
        bGain.gain.exponentialRampToValueAtTime(0.001, noteT + 0.12);

        bOsc.connect(bGain);
        bGain.connect(this.bgmGain!);

        bOsc.start(noteT);
        bOsc.stop(noteT + 0.14);
      }

      // Square wave lead melody
      currentMelody.forEach((freq, idx) => {
        const noteT = t + idx * beatSec;
        const mOsc = this.ctx!.createOscillator();
        const mGain = this.ctx!.createGain();

        mOsc.type = 'square';
        mOsc.frequency.setValueAtTime(freq, noteT);

        mGain.gain.setValueAtTime(0.04, noteT);
        mGain.gain.exponentialRampToValueAtTime(0.001, noteT + beatSec * 0.8);

        mOsc.connect(mGain);
        mGain.connect(this.bgmGain!);

        mOsc.start(noteT);
        mOsc.stop(noteT + beatSec * 0.85);
      });
    };

    playChiptuneBar();
    this.bgmIntervalId = window.setInterval(playChiptuneBar, barSec * 1000);
  }

  // ----------------------------------------------------
  // CHILL AMBIENT LOUNGE BGM
  // ----------------------------------------------------
  private startChillAmbient() {
    if (!this.ctx || !this.bgmGain) return;

    const chords = [
      [293.66, 349.23, 440.0, 523.25, 659.25], // Dm9
      [246.94, 329.63, 392.0, 493.88, 659.25], // G13
      [261.63, 329.63, 392.0, 493.88, 587.33], // Cmaj9
      [220.0, 261.63, 329.63, 392.0, 493.88],  // Am9
    ];

    let chordStep = 0;
    const playChordStep = () => {
      if (!this.ctx || !this.bgmGain || !this.isBgmPlaying || !this.playerInsideShop || this.externalZoneOverride) return;
      const now = this.ctx.currentTime;
      const currentChord = chords[chordStep % chords.length];
      chordStep++;

      currentChord.forEach((freq, i) => {
        const osc = this.ctx!.createOscillator();
        const noteGain = this.ctx!.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.04);

        noteGain.gain.setValueAtTime(0.04, now + i * 0.04);
        noteGain.gain.exponentialRampToValueAtTime(0.001, now + 3.8);

        osc.connect(noteGain);
        noteGain.connect(this.bgmGain!);

        osc.start(now + i * 0.04);
        osc.stop(now + 4.0);
      });
    };

    playChordStep();
    this.bgmIntervalId = window.setInterval(playChordStep, 4000);
  }

  // ====================================================
  // MEGA MAN & CASINO SOUND EFFECTS (SFX)
  // ====================================================

  /**
   * SFX: Quarter Drop / Coin insert (quarterDrop.play())
   */
  public playQuarterDrop() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const t = this.ctx.currentTime;
    [2400, 3200, 1800].forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const g = this.ctx!.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + i * 0.06);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.7, t + i * 0.06 + 0.08);

      g.gain.setValueAtTime(0.18, t + i * 0.06);
      g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.06 + 0.09);

      osc.connect(g);
      g.connect(this.sfxGain!);

      osc.start(t + i * 0.06);
      osc.stop(t + i * 0.06 + 0.1);
    });
  }

  /**
   * SFX: Pull Lever (pullLever.play())
   */
  public playPullLever() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const t = this.ctx.currentTime;
    // Mechanical gear click + metallic ratchet
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(160, t);
    osc.frequency.linearRampToValueAtTime(80, t + 0.18);

    g.gain.setValueAtTime(0.2, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

    osc.connect(g);
    g.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.2);
  }

  /**
   * SFX: Enemy Chosen / Alert (enemyChosen.play())
   */
  public playEnemyChosen() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const t = this.ctx.currentTime;
    const freqs = [330, 440, 550, 660, 880];
    freqs.forEach((f, idx) => {
      const noteT = t + idx * 0.05;
      const osc = this.ctx!.createOscillator();
      const g = this.ctx!.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(f, noteT);

      g.gain.setValueAtTime(0.12, noteT);
      g.gain.exponentialRampToValueAtTime(0.001, noteT + 0.07);

      osc.connect(g);
      g.connect(this.sfxGain!);

      osc.start(noteT);
      osc.stop(noteT + 0.08);
    });
  }

  /**
   * SFX: Reel Stop (reelStop.play()) - crisp brake click
   */
  public playReelStop() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(600, t);
    osc.frequency.exponentialRampToValueAtTime(120, t + 0.08);

    g.gain.setValueAtTime(0.25, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.09);

    osc.connect(g);
    g.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.1);
  }

  /**
   * SFX: Mega Jackpot Winner (jackpotSound.play())
   */
  public playJackpotSound() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const t = this.ctx.currentTime;
    // Triumphant 8-bit fanfare: C5, E5, G5, C6, G5, C6, E6
    const melody = [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5, 1318.51, 1567.98];
    melody.forEach((freq, idx) => {
      const noteT = t + idx * 0.11;
      const osc = this.ctx!.createOscillator();
      const g = this.ctx!.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, noteT);

      g.gain.setValueAtTime(0.2, noteT);
      g.gain.exponentialRampToValueAtTime(0.001, noteT + 0.35);

      osc.connect(g);
      g.connect(this.sfxGain!);

      osc.start(noteT);
      osc.stop(noteT + 0.38);
    });
  }

  /**
   * SFX: Dr. Wily Map / Laugh Theme (wilySound.play())
   */
  public playWilySound() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const t = this.ctx.currentTime;
    // Menacing minor sequence: D4, Eb4, D4, C4, Bb3, A3
    const notes = [293.66, 311.13, 293.66, 261.63, 233.08, 220.0];
    notes.forEach((freq, idx) => {
      const noteT = t + idx * 0.12;
      const osc = this.ctx!.createOscillator();
      const g = this.ctx!.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, noteT);

      g.gain.setValueAtTime(0.18, noteT);
      g.gain.exponentialRampToValueAtTime(0.001, noteT + 0.25);

      osc.connect(g);
      g.connect(this.sfxGain!);

      osc.start(noteT);
      osc.stop(noteT + 0.28);
    });
  }

  /**
   * SFX: Proto Man Whistle Theme (protoSound.play())
   */
  public playProtoSound() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const t = this.ctx.currentTime;
    // Classic Proto Man whistle motif
    const notes = [783.99, 880.0, 987.77, 1174.66, 987.77, 1174.66];
    notes.forEach((freq, idx) => {
      const noteT = t + idx * 0.14;
      const osc = this.ctx!.createOscillator();
      const g = this.ctx!.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, noteT);

      g.gain.setValueAtTime(0.16, noteT);
      g.gain.exponentialRampToValueAtTime(0.001, noteT + 0.28);

      osc.connect(g);
      g.connect(this.sfxGain!);

      osc.start(noteT);
      osc.stop(noteT + 0.3);
    });
  }

  /**
   * SFX: Mega Man 1-Up / Extra Life Chime (mm1upSound.play())
   */
  public play1UpSound() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const t = this.ctx.currentTime;
    // Iconic 1-Up chime: E5, G5, E6, C6, D6, G6
    const notes = [659.25, 783.99, 1318.51, 1046.5, 1174.66, 1567.98];
    notes.forEach((freq, idx) => {
      const noteT = t + idx * 0.08;
      const osc = this.ctx!.createOscillator();
      const g = this.ctx!.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, noteT);

      g.gain.setValueAtTime(0.2, noteT);
      g.gain.exponentialRampToValueAtTime(0.001, noteT + 0.25);

      osc.connect(g);
      g.connect(this.sfxGain!);

      osc.start(noteT);
      osc.stop(noteT + 0.28);
    });
  }

  /**
   * SFX: Mega Man Death / Game Over (gameOverSound.play())
   */
  public playGameOverSound() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const t = this.ctx.currentTime;
    // Rapid descending noise bursts
    for (let i = 0; i < 4; i++) {
      const noteT = t + i * 0.12;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(400 - i * 80, noteT);
      osc.frequency.exponentialRampToValueAtTime(80, noteT + 0.1);

      g.gain.setValueAtTime(0.18, noteT);
      g.gain.exponentialRampToValueAtTime(0.001, noteT + 0.11);

      osc.connect(g);
      g.connect(this.sfxGain);

      osc.start(noteT);
      osc.stop(noteT + 0.12);
    }
  }

  /**
   * SFX: Menu Select Click (selectSound.play())
   */
  public playSelectSound() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, t);
    osc.frequency.exponentialRampToValueAtTime(440, t + 0.04);

    g.gain.setValueAtTime(0.12, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

    osc.connect(g);
    g.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.05);
  }

  // General Casino SFX
  public playChipSound() {
    this.playQuarterDrop();
  }

  public playCardSound() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const t = this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * 0.06;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1800, t);
    filter.Q.setValueAtTime(2, t);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    noise.start(t);
  }

  public playFootstep() {
    // Disabled per user request: "tắt tiếng nhân vật di chuyển nha"
  }

  public playSlotTick() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(480, t);
    osc.frequency.exponentialRampToValueAtTime(240, t + 0.025);

    gain.gain.setValueAtTime(0.06, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.025);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.03);
  }

  public playBallClick() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1800 + Math.random() * 600, t);
    gain.gain.setValueAtTime(0.1, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.02);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.02);
  }

  public playWinChime() {
    this.play1UpSound();
  }

  public playJackpotFanfare() {
    this.playJackpotSound();
  }

  public playDiceShake() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    for (let i = 0; i < 4; i++) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(600 + Math.random() * 400, t + i * 0.06);
      gain.gain.setValueAtTime(0.08, t + i * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.06 + 0.04);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t + i * 0.06);
      osc.stop(t + i * 0.06 + 0.05);
    }
  }

  public playElevatorDing() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1046.5, t); // C6 bell
    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 1.2);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 1.2);
  }

  public playDrinkPour() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, t); // D5
    osc.frequency.exponentialRampToValueAtTime(880, t + 0.3);
    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.45);
  }

  public playPackTear() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    // White noise burst for foil crinkle
    const bufferSize = this.ctx.sampleRate * 0.28;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.4));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(3200, t);
    filter.frequency.exponentialRampToValueAtTime(1400, t + 0.25);
    filter.Q.setValueAtTime(3.0, t);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    noise.start(t);
  }

  public playCardSlide() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(350, t);
    osc.frequency.exponentialRampToValueAtTime(180, t + 0.12);
    gain.gain.setValueAtTime(0.08, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.13);
  }

  public playCardFlip() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, t);
    osc.frequency.exponentialRampToValueAtTime(450, t + 0.08);
    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.09);
  }

  public playHoloShimmer() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    const frequencies = [1318.5, 1567.98, 1975.53, 2637.02];
    frequencies.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + idx * 0.05);
      gain.gain.setValueAtTime(0.06, t + idx * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + idx * 0.05 + 0.4);
      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(t + idx * 0.05);
      osc.stop(t + idx * 0.05 + 0.42);
    });
  }

  public playBoxOpen() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    // Tape slice swoosh + cardboard box creak
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(320, t);
    osc.frequency.exponentialRampToValueAtTime(140, t + 0.35);
    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.38);

    // Box lid snap
    setTimeout(() => {
      this.playChipSound();
    }, 180);
  }

  public playFoilCrinkle() {
    this.playPackTear();
  }

  public playPackRip() {
    this.playPackTear();
  }

  public playBarcodeBeep() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(2936.65, t); // High crisp POS beep (D7)
    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.1);
  }

  public playCashRegister() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    // Bell "Cha-Ching!"
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1760, t); // A6
    gain.gain.setValueAtTime(0.22, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.65);
    // Coin roll
    setTimeout(() => {
      this.playChipSound();
    }, 120);
  }

  public playDoorChime() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, t); // E5
    gain1.gain.setValueAtTime(0.15, t);
    gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
    osc1.connect(gain1);
    gain1.connect(this.sfxGain);
    osc1.start(t);
    osc1.stop(t + 0.65);

    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(523.25, t + 0.25); // C5
    gain2.gain.setValueAtTime(0.18, t + 0.25);
    gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.9);
    osc2.connect(gain2);
    gain2.connect(this.sfxGain);
    osc2.start(t + 0.25);
    osc2.stop(t + 0.95);
  }

  public playRarePullFanfare() {
    this.playJackpotFanfare();
  }

  public playLevelUpFanfare() {
    this.playJackpotFanfare();
  }

  /**
   * SFX: Police Patrol Siren (2-cycle wail + yelp, distance-attenuated)
   */
  public playPoliceSiren(volumeScale: number = 1.0) {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const scale = Math.max(0.25, Math.min(1.0, volumeScale));
    const t = this.ctx.currentTime;
    const totalDur = 3.2;

    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc1.type = 'sawtooth';
    osc2.type = 'triangle';

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1050, t);
    filter.Q.setValueAtTime(1.4, t);

    // Classic European/Vietnamese dual-tone wail + rising sweep
    osc1.frequency.setValueAtTime(580, t);
    osc1.frequency.linearRampToValueAtTime(1180, t + 0.65);
    osc1.frequency.linearRampToValueAtTime(600, t + 1.30);
    osc1.frequency.linearRampToValueAtTime(1240, t + 1.95);
    osc1.frequency.linearRampToValueAtTime(620, t + 2.55);
    osc1.frequency.linearRampToValueAtTime(1120, t + 2.90);
    osc1.frequency.linearRampToValueAtTime(580, t + totalDur);

    osc2.frequency.setValueAtTime(580 * 1.5, t);
    osc2.frequency.linearRampToValueAtTime(1180 * 1.5, t + 0.65);
    osc2.frequency.linearRampToValueAtTime(600 * 1.5, t + 1.30);
    osc2.frequency.linearRampToValueAtTime(1240 * 1.5, t + 1.95);
    osc2.frequency.linearRampToValueAtTime(620 * 1.5, t + 2.55);
    osc2.frequency.linearRampToValueAtTime(1120 * 1.5, t + 2.90);
    osc2.frequency.linearRampToValueAtTime(580 * 1.5, t + totalDur);

    const peak = 0.13 * scale;
    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(peak, t + 0.18);
    gain.gain.setValueAtTime(peak, t + totalDur - 0.35);
    gain.gain.exponentialRampToValueAtTime(0.001, t + totalDur);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + totalDur + 0.02);
    osc2.stop(t + totalDur + 0.02);
  }

  /**
   * SFX: Ambulance 115 Dual-Tone Hi-Lo Siren (distance-attenuated)
   */
  public playAmbulanceSiren(volumeScale: number = 1.0) {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const scale = Math.max(0.25, Math.min(1.0, volumeScale));
    const t = this.ctx.currentTime;
    const stepDur = 0.48;
    const cycles = 6;
    const totalDur = stepDur * cycles;

    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(900, t);
    filter.Q.setValueAtTime(1.1, t);

    for (let c = 0; c < cycles; c++) {
      const freq = c % 2 === 0 ? 880 : 660;
      osc.frequency.setValueAtTime(freq, t + c * stepDur);
    }

    const peak = 0.14 * scale;
    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(peak, t + 0.08);
    gain.gain.setValueAtTime(peak, t + totalDur - 0.18);
    gain.gain.exponentialRampToValueAtTime(0.001, t + totalDur);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + totalDur + 0.02);
  }

  /**
   * Ambient Cheer SFX: randomly picks between "2 3 Dô... 2 3 Uống..." clips
   * inside & right outside Quán Nhậu Ron Béo
   */
  public playRonBeoCheer(volumeScale: number = 1.0) {
    if (this.isMuted || typeof Audio === 'undefined') return;
    const clampedScale = Math.max(0, Math.min(1, volumeScale));
    if (clampedScale <= 0.02) return;

    this.initContext();
    try {
      if (this.ronBeoCheerAudios.length === 0) {
        const urls = ['/audio/ron-beo-123-do.mp3', '/audio/ron-beo-123-do-nu.mp3'];
        this.ronBeoCheerAudios = urls.map((url) => {
          const el = new Audio(url);
          el.preload = 'auto';
          return el;
        });
      }

      // Avoid cutting off an active cheer mid-toast
      if (this.ronBeoCheerAudios.some((el) => !el.paused && !el.ended)) {
        return;
      }

      const pickIdx = Math.floor(Math.random() * this.ronBeoCheerAudios.length);
      const audio = this.ronBeoCheerAudios[pickIdx];
      audio.currentTime = 0;
      const baseVol = Math.max(0.45, Math.min(1.0, this.bgmVolume + 0.15));
      audio.volume = Math.max(0.05, Math.min(1.0, clampedScale * baseVol));
      const p = audio.play();
      if (p && typeof p.catch === 'function') {
        p.catch(() => {});
      }
    } catch (_) {}
  }

  /**
   * Spatial Live DJ Beat Synthesizer (132 BPM Vinahouse / EDM Club Groove)
   * Plays smoothly when inside or near TOXIC Youth Pub & Beer Club.
   */
  public updateToxicDjAudio(volumeScale: number, style: 'toxic' | 'khoi' | 'fouru' | 'newdtv' = 'toxic') {
    const clamped = this.isMuted ? 0 : Math.max(0, Math.min(1, volumeScale));
    this.toxicDjTargetVol = clamped;
    this.toxicDjStyle = style;

    if (clamped <= 0.015) {
      this.toxicDjSilenceTicks++;
      if (this.toxicDjGain && this.ctx) {
        this.toxicDjGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.08);
      }
      if (this.toxicDjSilenceTicks > 18) {
        this.stopToxicDjAudio();
      }
      return;
    }

    this.toxicDjSilenceTicks = 0;
    this.initContext();
    if (!this.ctx || !this.toxicDjGain) return;

    const scaledGain = clamped * Math.max(0.28, Math.min(0.85, this.bgmVolume * 0.72));
    this.toxicDjGain.gain.setTargetAtTime(scaledGain, this.ctx.currentTime, 0.09);

    if (this.toxicDjTimer === null && typeof window !== 'undefined') {
      const stepMs = 113.6; // ~132 BPM 16th-note groove
      this.toxicDjTimer = window.setInterval(() => {
        this.tickToxicDjBeat();
      }, stepMs);
    }
  }

  public stopToxicDjAudio() {
    if (this.toxicDjTimer !== null && typeof window !== 'undefined') {
      window.clearInterval(this.toxicDjTimer);
      this.toxicDjTimer = null;
    }
    if (this.toxicDjGain && this.ctx) {
      this.toxicDjGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
    }
    this.toxicDjStep = 0;
  }

  private tickToxicDjBeat() {
    if (this.isMuted || this.toxicDjTargetVol <= 0.015 || !this.ctx || !this.toxicDjGain) return;
    if (this.ctx.state !== 'running') return;

    const now = this.ctx.currentTime + 0.02;
    const step = this.toxicDjStep % 64;
    this.toxicDjStep = (this.toxicDjStep + 1) % 64;
    const stepInBar = step % 16;

    // 1. Punchy 4-on-the-floor Club Kick
    if (step % 4 === 0) {
      const kickOsc = this.ctx.createOscillator();
      const kickGain = this.ctx.createGain();
      kickOsc.type = 'sine';
      kickOsc.frequency.setValueAtTime(142, now);
      kickOsc.frequency.exponentialRampToValueAtTime(44, now + 0.11);
      kickGain.gain.setValueAtTime(0.55, now);
      kickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.20);
      kickOsc.connect(kickGain);
      kickGain.connect(this.toxicDjGain);
      kickOsc.start(now);
      kickOsc.stop(now + 0.21);
    }

    // 2. Bouncy Vinahouse Off-Beat Bassline (F# minor: F#2, D2, E2, C#2)
    if (step % 4 === 2 || (stepInBar === 15 && step % 32 >= 16)) {
      const rootNotes = [92.5, 92.5, 73.42, 82.41]; // F#2, F#2, D2, E2
      const barIdx = Math.floor(step / 16) % rootNotes.length;
      const baseFreq = rootNotes[barIdx] * (stepInBar === 15 ? 2 : 1);

      const bassOsc = this.ctx.createOscillator();
      const bassFilter = this.ctx.createBiquadFilter();
      const bassGain = this.ctx.createGain();
      bassOsc.type = 'sawtooth';
      bassOsc.frequency.setValueAtTime(baseFreq, now);
      bassFilter.type = 'lowpass';
      bassFilter.frequency.setValueAtTime(420, now);
      bassFilter.frequency.exponentialRampToValueAtTime(140, now + 0.14);
      bassFilter.Q.setValueAtTime(3.2, now);
      bassGain.gain.setValueAtTime(0.28, now);
      bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      bassOsc.connect(bassFilter);
      bassFilter.connect(bassGain);
      bassGain.connect(this.toxicDjGain);
      bassOsc.start(now);
      bassOsc.stop(now + 0.16);
    }

    // 3. Crisp Club Hi-Hats & Snare/Clap on 2 & 4
    if (step % 2 === 0 || stepInBar === 11) {
      const isClap = step % 8 === 4;
      const dur = isClap ? 0.11 : step % 4 === 2 ? 0.06 : 0.025;
      const bufSize = Math.floor(this.ctx.sampleRate * dur);
      const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < bufSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufSize * (isClap ? 0.45 : 0.35)));
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buf;
      const filter = this.ctx.createBiquadFilter();
      filter.type = isClap ? 'bandpass' : 'highpass';
      filter.frequency.setValueAtTime(isClap ? 1850 : 6800, now);
      filter.Q.setValueAtTime(isClap ? 1.2 : 0.8, now);
      const nGain = this.ctx.createGain();
      nGain.gain.setValueAtTime(isClap ? 0.22 : step % 4 === 2 ? 0.10 : 0.04, now);
      nGain.gain.exponentialRampToValueAtTime(0.001, now + dur);
      noise.connect(filter);
      filter.connect(nGain);
      nGain.connect(this.toxicDjGain);
      noise.start(now);
    }

    // 4. Energetic Youth Club Pluck / Synth Riff (TOXIC vs KHÓI vs 4U CLUB vs NEW DTV Vinahouse)
    const melodyPattern: Array<number | null> =
      this.toxicDjStyle === 'newdtv'
        ? [
            493.88, null, 587.33, 739.99, null, 659.25, 587.33, null,
            440.0, null, 554.37, 659.25, null, 739.99, 659.25, 587.33,
            392.0, null, 493.88, 587.33, null, 659.25, 587.33, null,
            369.99, null, 440.0, 587.33, null, 739.99, 659.25, 587.33,
          ]
        : this.toxicDjStyle === 'fouru'
          ? [
              392.0, null, 466.16, 587.33, null, 523.25, 466.16, null,
              349.23, null, 466.16, 587.33, null, 698.46, 587.33, 523.25,
              311.13, null, 392.0, 466.16, null, 523.25, 466.16, null,
              293.66, null, 392.0, 523.25, null, 587.33, 466.16, 392.0,
            ]
          : this.toxicDjStyle === 'khoi'
            ? [
                440.0, null, 523.25, 659.25, null, 587.33, 523.25, null,
                392.0, null, 493.88, 587.33, null, 523.25, 493.88, 440.0,
                349.23, null, 440.0, 523.25, null, 493.88, 440.0, null,
                329.63, null, 415.30, 493.88, null, 659.25, 587.33, 523.25,
              ]
            : [
                369.99, null, 440.0, 554.37, null, 493.88, 440.0, null,
                369.99, null, 329.63, 369.99, null, 440.0, 554.37, 659.25,
                293.66, null, 369.99, 440.0, null, 369.99, 329.63, null,
                329.63, null, 415.30, 493.88, null, 554.37, 493.88, 440.0,
              ];
    const leadFreq = melodyPattern[step % 32];
    if (leadFreq !== null) {
      const leadOsc = this.ctx.createOscillator();
      const leadFilter = this.ctx.createBiquadFilter();
      const leadGain = this.ctx.createGain();
      leadOsc.type = 'sawtooth';
      leadOsc.frequency.setValueAtTime(leadFreq, now);
      const sweep = 950 + 1300 * (0.5 + 0.5 * Math.sin(step * 0.22));
      leadFilter.type = 'lowpass';
      leadFilter.frequency.setValueAtTime(sweep, now);
      leadFilter.frequency.exponentialRampToValueAtTime(340, now + 0.15);
      leadFilter.Q.setValueAtTime(4.0, now);
      leadGain.gain.setValueAtTime(0.11, now);
      leadGain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
      leadOsc.connect(leadFilter);
      leadFilter.connect(leadGain);
      leadGain.connect(this.toxicDjGain);
      leadOsc.start(now);
      leadOsc.stop(now + 0.17);
    }
  }

  public playWrongBuzzer() {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;

    const now = this.ctx.currentTime;
    [0, 0.12].forEach((offset) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(140, now + offset);
      osc.frequency.exponentialRampToValueAtTime(100, now + offset + 0.1);
      gain.gain.setValueAtTime(0.3, now + offset);
      gain.gain.linearRampToValueAtTime(0.01, now + offset + 0.1);
      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(now + offset);
      osc.stop(now + offset + 0.1);
    });
  }

  private motoEngineOsc: OscillatorNode | null = null;
  private motoEngineSubOsc: OscillatorNode | null = null;
  private motoEngineGain: GainNode | null = null;
  private motoEngineFilter: BiquadFilterNode | null = null;

  public playMotorbikeStart() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const g = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(52, t);
    osc.frequency.exponentialRampToValueAtTime(118, t + 0.14);
    osc.frequency.exponentialRampToValueAtTime(68, t + 0.34);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(340, t);
    g.gain.setValueAtTime(0.001, t);
    g.gain.linearRampToValueAtTime(0.14, t + 0.05);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.36);
    osc.connect(filter);
    filter.connect(g);
    g.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.38);
  }

  public playMotorbikeHorn() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    [0, 0.13].forEach((offset) => {
      const osc1 = this.ctx!.createOscillator();
      const osc2 = this.ctx!.createOscillator();
      const filter = this.ctx!.createBiquadFilter();
      const gain = this.ctx!.createGain();
      osc1.type = 'sawtooth';
      osc2.type = 'triangle';
      osc1.frequency.setValueAtTime(420, t + offset);
      osc2.frequency.setValueAtTime(528, t + offset);
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1150, t + offset);
      filter.Q.setValueAtTime(1.4, t + offset);
      gain.gain.setValueAtTime(0.001, t + offset);
      gain.gain.linearRampToValueAtTime(0.14, t + offset + 0.015);
      gain.gain.setValueAtTime(0.14, t + offset + 0.065);
      gain.gain.exponentialRampToValueAtTime(0.001, t + offset + 0.105);
      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain!);
      osc1.start(t + offset);
      osc2.start(t + offset);
      osc1.stop(t + offset + 0.11);
      osc2.stop(t + offset + 0.11);
    });
  }

  public updateMotorbikeEngine(isRiding: boolean, speedAbs: number, isThrottle: boolean) {
    if (!isRiding || this.isMuted) {
      this.stopMotorbikeEngine();
      return;
    }
    if (!this.ctx || this.ctx.state !== 'running' || !this.sfxGain) return;

    if (!this.motoEngineOsc || !this.motoEngineSubOsc || !this.motoEngineGain || !this.motoEngineFilter) {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const subOsc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      subOsc.type = 'triangle';
      osc.frequency.setValueAtTime(52, t);
      subOsc.frequency.setValueAtTime(26, t);
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(220, t);
      filter.Q.setValueAtTime(1.2, t);
      gain.gain.setValueAtTime(0.0001, t);
      osc.connect(filter);
      subOsc.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t);
      subOsc.start(t);
      this.motoEngineOsc = osc;
      this.motoEngineSubOsc = subOsc;
      this.motoEngineFilter = filter;
      this.motoEngineGain = gain;
    }

    const now = this.ctx.currentTime;
    const speedRatio = Math.min(1, speedAbs / 20.5);
    const freq = 46 + speedRatio * 74 + (isThrottle ? 8 : 0);
    const cutoff = 180 + speedRatio * 340 + (isThrottle ? 90 : 0);
    const targetVol = 0.025 + speedRatio * 0.035 + (isThrottle ? 0.015 : 0);

    this.motoEngineOsc.frequency.setTargetAtTime(freq, now, 0.08);
    this.motoEngineSubOsc.frequency.setTargetAtTime(freq * 0.5, now, 0.08);
    this.motoEngineFilter.frequency.setTargetAtTime(cutoff, now, 0.08);
    this.motoEngineGain.gain.setTargetAtTime(targetVol, now, 0.09);
  }

  public stopMotorbikeEngine() {
    if (this.motoEngineGain && this.ctx) {
      try {
        this.motoEngineGain.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.04);
      } catch (_) {}
    }
    if (this.motoEngineOsc) {
      try {
        this.motoEngineOsc.stop();
        this.motoEngineOsc.disconnect();
      } catch (_) {}
      this.motoEngineOsc = null;
    }
    if (this.motoEngineSubOsc) {
      try {
        this.motoEngineSubOsc.stop();
        this.motoEngineSubOsc.disconnect();
      } catch (_) {}
      this.motoEngineSubOsc = null;
    }
    if (this.motoEngineFilter) {
      try {
        this.motoEngineFilter.disconnect();
      } catch (_) {}
      this.motoEngineFilter = null;
    }
    if (this.motoEngineGain) {
      try {
        this.motoEngineGain.disconnect();
      } catch (_) {}
      this.motoEngineGain = null;
    }
  }

  private rainSource: AudioBufferSourceNode | null = null;
  private rainFilter: BiquadFilterNode | null = null;
  private rainGain: GainNode | null = null;
  private rainNoiseBuffer: AudioBuffer | null = null;

  private ensureRainNoiseBuffer(): AudioBuffer | null {
    if (!this.ctx) return null;
    if (this.rainNoiseBuffer) return this.rainNoiseBuffer;
    const len = this.ctx.sampleRate * 3;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    // Soft pink-ish noise approximation for natural rainfall texture
    let b0 = 0;
    let b1 = 0;
    let b2 = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99765 * b0 + white * 0.099046;
      b1 = 0.96300 * b1 + white * 0.2965164;
      b2 = 0.57000 * b2 + white * 1.0526913;
      data[i] = (b0 + b1 + b2 + white * 0.1848) * 0.11;
    }
    this.rainNoiseBuffer = buf;
    return buf;
  }

  /**
   * Updates continuous procedural rainfall ambience.
   * Muffled lowpass cutoff when indoors; crisp wider spectrum outdoors.
   */
  public setRainAmbience(intensity: number, isIndoors: boolean) {
    const clamped = Math.max(0, Math.min(1, intensity));
    if (clamped <= 0.01 || this.isMuted) {
      this.stopRainAmbience();
      return;
    }
    if (!this.ctx || this.ctx.state !== 'running' || !this.masterGain) return;

    if (!this.rainSource || !this.rainFilter || !this.rainGain) {
      const buf = this.ensureRainNoiseBuffer();
      if (!buf) return;
      const t = this.ctx.currentTime;
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(isIndoors ? 440 : 1850, t);
      filter.Q.setValueAtTime(0.6, t);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.0001, t);

      src.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);
      src.start(t);

      this.rainSource = src;
      this.rainFilter = filter;
      this.rainGain = gain;
    }

    const now = this.ctx.currentTime;
    const targetCutoff = isIndoors ? 430 : 1950;
    const targetVol = clamped * (isIndoors ? 0.032 : 0.095);
    this.rainFilter.frequency.setTargetAtTime(targetCutoff, now, 0.25);
    this.rainGain.gain.setTargetAtTime(targetVol, now, 0.28);
  }

  public stopRainAmbience() {
    if (this.rainGain && this.ctx) {
      try {
        this.rainGain.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.08);
      } catch (_) {}
    }
    if (this.rainSource) {
      try {
        this.rainSource.stop();
        this.rainSource.disconnect();
      } catch (_) {}
      this.rainSource = null;
    }
    if (this.rainFilter) {
      try {
        this.rainFilter.disconnect();
      } catch (_) {}
      this.rainFilter = null;
    }
    if (this.rainGain) {
      try {
        this.rainGain.disconnect();
      } catch (_) {}
      this.rainGain = null;
    }
  }

  public startAmbientLoungeMusic() {
    this.startBGM('schedule');
  }

  public stopAmbientLoungeMusic() {
    this.stopBGM();
  }
}

export const soundManager = new SoundEngine();
