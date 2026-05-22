// Audio engine — one AudioContext, three named buses (music/sfx/ui), master
// gain, mute + volume persistence, mobile autoplay unlock.
//
// Callers never touch Web Audio directly. They use:
//   audio.play('attack.laser')   — fire a registered SFX/UI sound
//   audio.music('game')          — switch the music track (or null to stop)
//   audio.unlock()               — call once on a user gesture (mobile)
//   audio.setMuted('master', t)  — mute/unmute a bus or master
//   audio.setVolume('music', v)  — adjust bus volume
//
// Real audio files plug in by changing src/audio/sfx.ts and src/audio/music.ts
// without modifying any call site.

import { SFX } from './sfx.js';
import { MUSIC, type MusicTrack } from './music.js';

export type Bus = 'music' | 'sfx' | 'ui';
export type Channel = Bus | 'master';

const STORAGE_KEY = 'partyficrim.audio';

interface Persisted {
  muted: Record<Channel, boolean>;
  volume: Record<Channel, number>;
}

const DEFAULTS: Persisted = {
  muted: { master: false, music: false, sfx: false, ui: false },
  volume: { master: 0.7, music: 0.45, sfx: 0.75, ui: 0.6 },
};

function loadPersisted(): Persisted {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(DEFAULTS);
    const parsed = JSON.parse(raw) as Partial<Persisted>;
    return {
      muted: { ...DEFAULTS.muted, ...(parsed.muted ?? {}) },
      volume: { ...DEFAULTS.volume, ...(parsed.volume ?? {}) },
    };
  } catch {
    return structuredClone(DEFAULTS);
  }
}

function savePersisted(p: Persisted): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)); } catch { /* ignore */ }
}

// Sound + music voice definitions — see sfx.ts and music.ts.
export type VoiceFn = (ctx: AudioContext, out: AudioNode, t0: number) => void;
export interface MusicVoice {
  // Schedules one bar starting at `t0`. Returns the time the bar ends.
  scheduleBar: (ctx: AudioContext, out: AudioNode, t0: number) => number;
}

type Listener = () => void;

class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private buses: Record<Bus, GainNode> | null = null;

  private state: Persisted = loadPersisted();
  private listeners = new Set<Listener>();
  unlocked = false;

  private musicTrack: MusicTrack | null = null;
  private musicTimer: number | null = null;
  private musicEndAt = 0;

  private ensure(): AudioContext | null {
    if (this.ctx) return this.ctx;
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    const ctx = new Ctor();
    const master = ctx.createGain();
    master.gain.value = this.effectiveGain('master');
    master.connect(ctx.destination);
    const mk = (b: Bus) => {
      const g = ctx.createGain();
      g.gain.value = this.effectiveGain(b);
      g.connect(master);
      return g;
    };
    this.buses = { music: mk('music'), sfx: mk('sfx'), ui: mk('ui') };
    this.master = master;
    this.ctx = ctx;
    return ctx;
  }

  private effectiveGain(c: Channel): number {
    return this.state.muted[c] ? 0 : this.state.volume[c];
  }

  private applyGains(): void {
    if (!this.ctx || !this.master || !this.buses) return;
    this.master.gain.setTargetAtTime(this.effectiveGain('master'), this.ctx.currentTime, 0.02);
    (Object.keys(this.buses) as Bus[]).forEach((b) => {
      this.buses![b].gain.setTargetAtTime(this.effectiveGain(b), this.ctx!.currentTime, 0.02);
    });
  }

  // --- public API ---------------------------------------------------------

  async unlock(): Promise<void> {
    const ctx = this.ensure();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      try { await ctx.resume(); } catch { /* ignore */ }
    }
    this.unlocked = true;
    // Re-start music if a track was selected before unlock.
    if (this.musicTrack) this.startMusicLoop(this.musicTrack);
    this.emit();
  }

  play(name: keyof typeof SFX): void {
    const voice = SFX[name];
    if (!voice) return;
    const ctx = this.ensure();
    if (!ctx || !this.buses) return;
    if (this.state.muted.master) return;
    // Pick bus by name prefix.
    const bus = name.startsWith('ui.') ? this.buses.ui : this.buses.sfx;
    try {
      voice(ctx, bus, ctx.currentTime);
    } catch {
      // never let audio crash the app
    }
  }

  music(track: MusicTrack | null): void {
    if (this.musicTrack === track) return;
    this.musicTrack = track;
    if (this.musicTimer !== null) {
      clearTimeout(this.musicTimer);
      this.musicTimer = null;
    }
    this.musicEndAt = 0;
    if (track) this.startMusicLoop(track);
  }

  private startMusicLoop(track: MusicTrack): void {
    const ctx = this.ensure();
    if (!ctx || !this.buses) return;
    if (this.state.muted.master || this.state.muted.music) return;
    const voice = MUSIC[track];
    if (!voice) return;
    const schedule = () => {
      if (this.musicTrack !== track) return;
      const now = ctx.currentTime;
      let t = Math.max(now + 0.05, this.musicEndAt);
      // Schedule a couple of bars ahead so we never gap.
      for (let i = 0; i < 2; i++) t = voice.scheduleBar(ctx, this.buses!.music, t);
      this.musicEndAt = t;
      const aheadMs = Math.max(50, (t - ctx.currentTime - 0.3) * 1000);
      this.musicTimer = window.setTimeout(schedule, aheadMs);
    };
    schedule();
  }

  setMuted(c: Channel, muted: boolean): void {
    this.state.muted[c] = muted;
    savePersisted(this.state);
    this.applyGains();
    if (c === 'master' || c === 'music') {
      // Restart music if turning on, stop if turning off.
      if (muted) {
        if (this.musicTimer !== null) clearTimeout(this.musicTimer);
        this.musicTimer = null;
        this.musicEndAt = 0;
      } else if (this.musicTrack) {
        this.startMusicLoop(this.musicTrack);
      }
    }
    this.emit();
  }

  setVolume(c: Channel, v: number): void {
    this.state.volume[c] = Math.max(0, Math.min(1, v));
    savePersisted(this.state);
    this.applyGains();
    this.emit();
  }

  isMuted(c: Channel): boolean { return this.state.muted[c]; }
  getVolume(c: Channel): number { return this.state.volume[c]; }

  subscribe(l: Listener): () => void {
    this.listeners.add(l);
    return () => { this.listeners.delete(l); };
  }
  private emit(): void { for (const l of this.listeners) l(); }
}

export const audio = new AudioEngine();

// Convenience: install once on the document so any tap unlocks audio
// without each component having to remember.
if (typeof window !== 'undefined') {
  const handler = () => {
    audio.unlock().catch(() => { /* ignore */ });
    window.removeEventListener('pointerdown', handler);
    window.removeEventListener('keydown', handler);
    window.removeEventListener('touchstart', handler);
  };
  window.addEventListener('pointerdown', handler, { once: false });
  window.addEventListener('keydown', handler, { once: false });
  window.addEventListener('touchstart', handler, { once: false });
}
