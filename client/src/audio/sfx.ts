// Sound registry. Each entry is a "voice" — a function that schedules nodes
// for one playback. Names are stable contract; implementations are placeholder
// synthesis today but can be swapped to AudioBuffer playback (real samples)
// later without touching any caller.

import { chord, kick, noise, tone } from './synth.js';
import type { VoiceFn } from './engine.js';

export const SFX = {
  // --- UI -------------------------------------------------------------------
  'ui.tap': (ctx, out, t) => tone(ctx, out, t, {
    freq: 880, durMs: 60, type: 'square', gain: 0.18, attackMs: 1, releaseMs: 50,
  }),
  'ui.role_claim': (ctx, out, t) => chord(ctx, out, t, [523, 659, 784], {
    durMs: 260, gain: 0.35, type: 'triangle', spacingMs: 35,
  }),
  'ui.start_press': (ctx, out, t) => {
    chord(ctx, out, t, [440, 660], { durMs: 220, gain: 0.4, type: 'square', spacingMs: 50 });
    kick(ctx, out, t + 0.02, 0.4);
  },
  'ui.leave': (ctx, out, t) => tone(ctx, out, t, {
    freq: 520, sweepTo: 220, durMs: 240, type: 'triangle', gain: 0.25, releaseMs: 200,
  }),
  'ui.error': (ctx, out, t) => {
    tone(ctx, out, t, { freq: 220, durMs: 90, type: 'square', gain: 0.35, releaseMs: 70 });
    tone(ctx, out, t + 0.1, { freq: 180, durMs: 140, type: 'square', gain: 0.35, releaseMs: 110 });
  },

  // --- Game flow ------------------------------------------------------------
  'game.countdown_tick': (ctx, out, t) => tone(ctx, out, t, {
    freq: 660, durMs: 90, type: 'square', gain: 0.4, attackMs: 1, releaseMs: 70,
  }),
  'game.start': (ctx, out, t) => {
    chord(ctx, out, t, [440, 554, 659, 880], { durMs: 420, gain: 0.5, type: 'sawtooth', spacingMs: 45 });
    kick(ctx, out, t, 0.8);
  },
  'game.over': (ctx, out, t) => {
    chord(ctx, out, t, [392, 311, 233], { durMs: 700, gain: 0.45, type: 'sawtooth', spacingMs: 110 });
    noise(ctx, out, t + 0.2, { durMs: 600, gain: 0.2, lowpass: 1200, releaseMs: 400 });
  },

  // --- Combat: attacks ------------------------------------------------------
  'attack.melee': (ctx, out, t) => {
    noise(ctx, out, t, { durMs: 120, gain: 0.5, lowpass: 4500, attackMs: 1, releaseMs: 90 });
    tone(ctx, out, t, { freq: 280, sweepTo: 90, durMs: 130, type: 'square', gain: 0.3, releaseMs: 100 });
  },
  'attack.rotary': (ctx, out, t) => {
    // Buzzy stutter — three quick clicks
    for (let i = 0; i < 3; i++) {
      tone(ctx, out, t + i * 0.04, {
        freq: 520 + i * 60, durMs: 70, type: 'square', gain: 0.25, releaseMs: 50,
      });
    }
  },
  'attack.laser': (ctx, out, t) => tone(ctx, out, t, {
    freq: 1800, sweepTo: 600, durMs: 280, type: 'sawtooth', gain: 0.32, attackMs: 2, releaseMs: 180,
  }),
  'attack.bomb': (ctx, out, t) => {
    tone(ctx, out, t, { freq: 90, sweepTo: 30, durMs: 480, type: 'sine', gain: 0.55, releaseMs: 400 });
    noise(ctx, out, t, { durMs: 500, gain: 0.4, lowpass: 1800, releaseMs: 420 });
  },
  'attack.bomb_armed': (ctx, out, t) => {
    tone(ctx, out, t, { freq: 1200, durMs: 70, type: 'square', gain: 0.3 });
    tone(ctx, out, t + 0.18, { freq: 1200, durMs: 70, type: 'square', gain: 0.3 });
  },

  // --- Combat: feedback -----------------------------------------------------
  'damage.light': (ctx, out, t) => noise(ctx, out, t, {
    durMs: 140, gain: 0.3, lowpass: 2200, releaseMs: 120,
  }),
  'damage.heavy': (ctx, out, t) => {
    noise(ctx, out, t, { durMs: 320, gain: 0.55, lowpass: 1500, releaseMs: 260 });
    tone(ctx, out, t, { freq: 160, sweepTo: 60, durMs: 280, type: 'sawtooth', gain: 0.35, releaseMs: 220 });
  },
  'core.spawn': (ctx, out, t) => chord(ctx, out, t, [880, 1320], {
    durMs: 200, gain: 0.18, type: 'triangle', spacingMs: 25,
  }),
  'enemy.spawn': (ctx, out, t) => tone(ctx, out, t, {
    freq: 180, sweepTo: 320, durMs: 220, type: 'sawtooth', gain: 0.2, releaseMs: 180,
  }),
  'repair.tick': (ctx, out, t) => chord(ctx, out, t, [660, 990], {
    durMs: 180, gain: 0.22, type: 'triangle', spacingMs: 20,
  }),
} satisfies Record<string, VoiceFn>;

export type SfxName = keyof typeof SFX;
