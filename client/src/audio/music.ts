// Procedural music tracks. Each track defines `scheduleBar(ctx, out, t0, n)`
// — schedules one bar of notes and returns when it ends. `n` is a 0-based bar
// counter the engine maintains so voices can vary content across a phrase.
// The engine loops by calling repeatedly. Replace with
// AudioBufferSourceNode/HTMLAudioElement-backed loops of real files later.

import { tone } from './synth.js';
import type { MusicVoice } from './engine.js';

export type MusicTrack = 'menu' | 'game';

// degree→hz from a root, in semitones.
function hz(root: number, semis: number): number {
  return root * 2 ** (semis / 12);
}

// --- MENU ---------------------------------------------------------------
// Slow, cheerful arpeggio over a sub. 4-bar phrase with a small lift.
const menu: MusicVoice = {
  scheduleBar(ctx, out, t0, n) {
    const bpm = 92;
    const beat = 60 / bpm;
    const aRoot = 220; // A3
    // Two-chord phrase: Am → C, swap each bar; every 4 bars lift the top.
    const phase = n % 4;
    const top = phase >= 2 ? 19 : 16; // little melodic lift
    const chord = phase % 2 === 0
      ? [0, 7, 12, top]            // Am-ish
      : [3, 10, 15, top + 3];      // C-ish
    const eighth = beat / 2;
    for (let i = 0; i < 8; i++) {
      const semi = chord[i % chord.length] ?? 0;
      tone(ctx, out, t0 + i * eighth, {
        freq: hz(aRoot, semi), durMs: eighth * 1000 * 0.9,
        type: 'triangle', gain: 0.16, attackMs: 6, releaseMs: 140,
      });
    }
    // Bass on 1 and 3.
    const bassA = phase % 2 === 0 ? -12 : -9;
    const bassB = phase % 2 === 0 ? -5 : -2;
    tone(ctx, out, t0, {
      freq: hz(aRoot, bassA), durMs: beat * 1.8 * 1000,
      type: 'sine', gain: 0.30, attackMs: 6, releaseMs: 220,
    });
    tone(ctx, out, t0 + beat * 2, {
      freq: hz(aRoot, bassB), durMs: beat * 1.8 * 1000,
      type: 'sine', gain: 0.30, attackMs: 6, releaseMs: 220,
    });
    return t0 + beat * 4;
  },
};

// --- GAME ---------------------------------------------------------------
// Chill driving loop — no four-on-the-floor kick, soft pulse instead.
// 8-bar phrase with two contrasting halves so it doesn't feel repetitive.
const game: MusicVoice = {
  scheduleBar(ctx, out, t0, n) {
    const bpm = 104;
    const beat = 60 / bpm;
    const root = hz(220, -5); // E3-ish, minor-feeling
    const phase = n % 8;
    const halfB = phase >= 4; // second half = contrast

    // ── Sub-bass pulse: only on beat 1 (and a soft pickup on "and-of-4"
    //    for the contrast half). No kick on every beat.
    tone(ctx, out, t0, {
      freq: hz(root, -12), durMs: beat * 2.6 * 1000,
      type: 'sine', gain: 0.36, attackMs: 12, releaseMs: 600,
    });
    if (halfB) {
      tone(ctx, out, t0 + beat * 3.5, {
        freq: hz(root, -12), durMs: beat * 0.6 * 1000,
        type: 'sine', gain: 0.22, attackMs: 8, releaseMs: 240,
      });
    }

    // ── Soft "tick" on the off-beats — closed hat feel, low volume.
    //    Half-time so it's not aggressive: beat 2 and beat 4 only.
    [1, 3].forEach((b) => {
      tone(ctx, out, t0 + b * beat, {
        freq: 7000, durMs: 30, type: 'square', gain: 0.04, attackMs: 1, releaseMs: 25,
      });
    });

    // ── Sparse, breathy chord pad — held across the bar.
    //    Phrase varies: A→C→F→G across 8 bars.
    const chords = [
      [0, 7, 12],  // Am
      [0, 7, 12],
      [3, 10, 15], // C
      [3, 10, 15],
      [-4, 3, 8],  // F
      [-4, 3, 8],
      [-2, 5, 10], // G
      [-2, 5, 10],
    ];
    const ch = chords[phase] ?? chords[0]!;
    for (const semi of ch) {
      tone(ctx, out, t0 + beat * 0.1, {
        freq: hz(root, semi), durMs: beat * 3.6 * 1000,
        type: 'triangle', gain: 0.07, attackMs: 80, releaseMs: 400,
      });
    }

    // ── Sparse melodic motif — only on the contrast half, on beat 2.
    if (halfB) {
      const motif = phase === 5 ? [12, 15] : phase === 7 ? [10, 12] : [12];
      motif.forEach((semi, i) => {
        tone(ctx, out, t0 + beat * (2 + i * 0.5), {
          freq: hz(root, semi), durMs: beat * 0.8 * 1000,
          type: 'sine', gain: 0.10, attackMs: 10, releaseMs: 300,
        });
      });
    }

    return t0 + beat * 4;
  },
};

export const MUSIC: Record<MusicTrack, MusicVoice> = { menu, game };
