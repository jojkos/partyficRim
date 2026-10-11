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

import { SFX } from "./sfx.js";
import { MUSIC, type MusicTrack } from "./music.js";

export type Bus = "music" | "sfx" | "ui";
export type Channel = Bus | "master";

const STORAGE_KEY = "partyficrim.audio";

interface Persisted {
  muted: Record<Channel, boolean>;
  volume: Record<Channel, number>;
}

const DEFAULTS: Persisted = {
  muted: { master: false, music: false, sfx: false, ui: false },
  volume: { master: 0.8, music: 0.42, sfx: 0.65, ui: 0.5 },
};

function loadPersisted(): Persisted {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(DEFAULTS);
    const parsed = JSON.parse(raw) as Partial<Persisted>;
    const settings = structuredClone(DEFAULTS);
    for (const c of ["master", "music", "sfx", "ui"] as const) {
      if (typeof parsed.muted?.[c] === "boolean")
        settings.muted[c] = parsed.muted[c];
      const v = parsed.volume?.[c];
      if (typeof v === "number" && Number.isFinite(v))
        settings.volume[c] = Math.max(0, Math.min(1, v));
    }
    return settings;
  } catch {
    return structuredClone(DEFAULTS);
  }
}

function savePersisted(p: Persisted): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
  } catch {
    /* ignore */
  }
}

// Sound + music voice definitions — see sfx.ts and music.ts.
export type VoiceFn = (ctx: AudioContext, out: AudioNode, t0: number) => void;
export interface MusicVoice {
  // Schedules one bar starting at `t0`. Returns the time the bar ends.
  // `barIndex` lets voices vary content across bars to avoid loop monotony.
  scheduleBar: (
    ctx: AudioContext,
    out: AudioNode,
    t0: number,
    barIndex: number,
  ) => number;
}

type Listener = () => void;

class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private buses: Record<Bus, GainNode> | null = null;

  private state: Persisted = loadPersisted();
  private listeners = new Set<Listener>();
  unlocked = false;
  private lastSound = new Map<string, number>();
  private activeVoices = 0;

  private musicTrack: MusicTrack | null = null;
  // Per-loop state. Each call to startMusicLoop bumps `musicGen`, getting its
  // own gate node. Old schedule() callbacks bail when they see a stale gen,
  // and the old gate is faded to 0 so already-scheduled notes go silent
  // instead of bleeding into the new track.
  private musicGen = 0;
  private musicBarIndex = 0;
  private musicTimer: number | null = null;
  private musicEndAt = 0;
  private musicGate: GainNode | null = null;

  private ensure(): AudioContext | null {
    if (this.ctx) return this.ctx;
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return null;
    const ctx = new Ctor();
    const master = ctx.createGain();
    master.gain.value = this.effectiveGain("master");
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -9;
    limiter.knee.value = 10;
    limiter.ratio.value = 4;
    limiter.attack.value = 0.008;
    limiter.release.value = 0.2;
    master.connect(limiter);
    limiter.connect(ctx.destination);
    const mk = (b: Bus) => {
      const g = ctx.createGain();
      g.gain.value = this.effectiveGain(b);
      g.connect(master);
      return g;
    };
    this.buses = { music: mk("music"), sfx: mk("sfx"), ui: mk("ui") };
    this.master = master;
    this.ctx = ctx;
    return ctx;
  }

  private effectiveGain(c: Channel): number {
    return this.state.muted[c] ? 0 : this.state.volume[c];
  }

  private applyGains(): void {
    if (!this.ctx || !this.master || !this.buses) return;
    this.master.gain.setTargetAtTime(
      this.effectiveGain("master"),
      this.ctx.currentTime,
      0.02,
    );
    (Object.keys(this.buses) as Bus[]).forEach((b) => {
      this.buses![b].gain.setTargetAtTime(
        this.effectiveGain(b),
        this.ctx!.currentTime,
        0.02,
      );
    });
  }

  // --- public API ---------------------------------------------------------

  async unlock(): Promise<void> {
    const ctx = this.ensure();
    if (!ctx) return;
    if (ctx.state === "suspended") {
      try {
        await ctx.resume();
      } catch {
        /* ignore */
      }
    }
    if (ctx.state !== "running") return;
    this.unlocked = true;
    // Do NOT restart music here. A music loop scheduled before unlock keeps
    // its scheduled notes; resume() unfreezes the clock and they play. The
    // previous bug was double-starting the loop here, which spawned two
    // parallel schedule chains and overlapped menu music with itself.
    this.emit();
  }

  play(name: keyof typeof SFX): void {
    const voice = SFX[name];
    if (!voice) return;
    const ctx = this.ensure();
    if (!ctx || !this.buses) return;
    const channel = name.startsWith("ui.") ? "ui" : "sfx";
    if (this.state.muted.master || this.state.muted[channel] || document.hidden)
      return;
    const now = ctx.currentTime;
    const cooldown = name.startsWith("damage.")
      ? 0.22
      : name === "repair.tick"
        ? 0.16
        : 0.065;
    if (
      now - (this.lastSound.get(name) ?? -Infinity) < cooldown ||
      this.activeVoices >= 12
    )
      return;
    this.lastSound.set(name, now);
    // Pick bus by name prefix.
    const bus = name.startsWith("ui.") ? this.buses.ui : this.buses.sfx;
    try {
      const gate = ctx.createGain();
      gate.connect(bus);
      this.activeVoices++;
      window.setTimeout(() => {
        gate.disconnect();
        this.activeVoices--;
      }, 1800);
      voice(ctx, gate, ctx.currentTime);
    } catch {
      // never let audio crash the app
    }
  }

  music(track: MusicTrack | null): void {
    if (this.musicTrack === track) return;
    this.musicTrack = track;
    this.stopCurrentMusicLoop();
    if (track) this.startMusicLoop(track);
  }

  // Stop the currently-running loop AND silence whatever has already been
  // scheduled into the AudioContext's future. The gate is ramped to 0 over
  // ~140ms then disconnected; queued oscillators continue running but produce
  // no audible output.
  private stopCurrentMusicLoop(): void {
    this.musicGen++; // invalidate any in-flight schedule callback
    if (this.musicTimer !== null) {
      clearTimeout(this.musicTimer);
      this.musicTimer = null;
    }
    this.musicEndAt = 0;
    this.musicBarIndex = 0;
    if (this.musicGate && this.ctx) {
      const gate = this.musicGate;
      const ctx = this.ctx;
      const now = ctx.currentTime;
      try {
        gate.gain.cancelScheduledValues(now);
        gate.gain.setValueAtTime(gate.gain.value, now);
        gate.gain.linearRampToValueAtTime(0, now + 0.14);
      } catch {
        /* ignore */
      }
      // Disconnect after the fade so the node can be GC'd.
      window.setTimeout(() => {
        try {
          gate.disconnect();
        } catch {
          /* ignore */
        }
      }, 220);
      this.musicGate = null;
    }
  }

  private startMusicLoop(track: MusicTrack): void {
    const ctx = this.ensure();
    if (!ctx || !this.buses) return;
    if (this.state.muted.master || this.state.muted.music || document.hidden)
      return;
    const voice = MUSIC[track];
    if (!voice) return;

    // Per-loop gate. Routes scheduled music through a gain we own — when we
    // switch tracks, ramp this to 0 so the queued tail goes silent.
    const gate = ctx.createGain();
    gate.gain.value = 1;
    gate.connect(this.buses.music);
    this.musicGate = gate;

    const gen = ++this.musicGen;
    this.musicBarIndex = 0;
    const schedule = () => {
      if (gen !== this.musicGen) return; // stale — track changed/stopped
      if (this.musicTrack !== track) return;
      if (ctx.state !== "running") {
        this.musicTimer = window.setTimeout(schedule, 250);
        return;
      }
      const now = ctx.currentTime;
      let t = Math.max(now + 0.05, this.musicEndAt);
      // Schedule one bar ahead. Smaller lookahead means less residual to
      // duck on track switch. We re-schedule before the bar ends.
      t = voice.scheduleBar(ctx, gate, t, this.musicBarIndex++);
      this.musicEndAt = t;
      const aheadMs = Math.max(50, (t - ctx.currentTime - 0.25) * 1000);
      this.musicTimer = window.setTimeout(schedule, aheadMs);
    };
    schedule();
  }

  visibilityChanged(): void {
    if (document.hidden) this.stopCurrentMusicLoop();
    else if (this.musicTrack && !this.musicGate)
      this.startMusicLoop(this.musicTrack);
  }

  setMuted(c: Channel, muted: boolean): void {
    this.state.muted[c] = muted;
    savePersisted(this.state);
    this.applyGains();
    if (c === "master" || c === "music") {
      if (muted) {
        // Hard-stop the loop AND silence queued tail.
        this.stopCurrentMusicLoop();
      } else if (this.musicTrack && !this.musicGate) {
        // Only restart if no loop is running. (Avoids the double-start bug.)
        this.startMusicLoop(this.musicTrack);
      }
    }
    this.emit();
  }

  setVolume(c: Channel, v: number): void {
    if (!Number.isFinite(v)) return;
    this.state.volume[c] = Math.max(0, Math.min(1, v));
    savePersisted(this.state);
    this.applyGains();
    this.emit();
  }

  isMuted(c: Channel): boolean {
    return this.state.muted[c];
  }
  getVolume(c: Channel): number {
    return this.state.volume[c];
  }

  subscribe(l: Listener): () => void {
    this.listeners.add(l);
    return () => {
      this.listeners.delete(l);
    };
  }
  private emit(): void {
    for (const l of this.listeners) l();
  }
}

export const audio = new AudioEngine();

// Convenience: install once on the document so any tap unlocks audio
// without each component having to remember.
if (typeof window !== "undefined") {
  document.addEventListener("visibilitychange", () =>
    audio.visibilityChanged(),
  );
  const handler = () => {
    audio
      .unlock()
      .then(() => {
        if (!audio.unlocked) return;
        window.removeEventListener("pointerdown", handler);
        window.removeEventListener("keydown", handler);
        window.removeEventListener("touchstart", handler);
      })
      .catch(() => {});
  };
  window.addEventListener("pointerdown", handler, { once: false });
  window.addEventListener("keydown", handler, { once: false });
  window.addEventListener("touchstart", handler, { once: false });
}
