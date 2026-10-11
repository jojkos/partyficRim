import { keys, noise, tone } from "./synth.js";
import type { MusicVoice } from "./engine.js";
export type MusicTrack = "menu" | "game";
const frequency = (root: number, semitones: number) =>
  root * 2 ** (semitones / 12);
// A 32-bar arrangement: soft electric keys, rounded bass and brushed percussion.
// Phrases leave space; the second half answers the first instead of repeating an arpeggio.
const progression = [
  { root: 0, notes: [0, 4, 7, 11, 14] },
  { root: -3, notes: [0, 3, 7, 10, 14] },
  { root: 5, notes: [0, 4, 7, 11, 14] },
  { root: 7, notes: [0, 4, 7, 9, 14] },
  { root: 0, notes: [0, 4, 7, 11, 14] },
  { root: 9, notes: [0, 3, 7, 10, 14] },
  { root: 5, notes: [0, 4, 7, 11, 14] },
  { root: 7, notes: [0, 4, 7, 9, 14] },
];
function track(game: boolean): MusicVoice {
  return {
    scheduleBar(ctx, out, t0, n) {
      const bar = n % 32,
        beat = 60 / (game ? 96 : 86),
        chord = progression[Math.floor(bar / 4)]!,
        root = frequency(146.832, chord.root),
        quiet = bar % 16 >= 14;
      const variation = 0.91 + ((n * 7) % 9) * 0.015;
      // Warm chord voicings, lightly rolled. Alternate inversions every phrase.
      const voicing =
        bar >= 16 ? chord.notes.slice(1) : chord.notes.slice(0, 4);
      if (bar % 2 === 0)
        voicing.forEach((v, i) =>
          keys(ctx, out, t0 + i * 0.035, {
            freq: frequency(root, v),
            durMs: beat * 6.8 * 1000,
            gain: 3 * (quiet ? 0.016 : 0.025) * variation,
            pad: true,
          }),
        );
      keys(ctx, out, t0 + 0.01, {
        freq: frequency(root, -12),
        durMs: beat * 2.1 * 1000,
        gain: 3 * (quiet ? 0.04 : 0.065),
        bass: true,
      });
      if (!quiet && bar % 4 !== 3)
        keys(ctx, out, t0 + beat * 2.5, {
          freq: frequency(root, bar % 2 ? -5 : -12),
          durMs: beat * 0.9 * 1000,
          gain: 3 * 0.037,
          bass: true,
        });
      // Phrases have different rhythms and deliberate rests. No constant eighth-note loop.
      const phrases: number[][] = [
        [7, 11, 14],
        [12, 7],
        [14, 11, 7],
        [],
        [7, 9],
        [12, 14, 11],
        [],
        [7, 4],
      ];
      const phrase = phrases[(bar + (bar >= 16 ? 3 : 0)) % 8]!;
      if (!quiet && bar % 2 === (game ? 1 : 0))
        phrase.forEach((v, i) =>
          keys(ctx, out, t0 + beat * (0.75 + i * (bar % 3 === 0 ? 0.65 : 1)), {
            freq: frequency(root, v + (bar >= 16 ? -12 : 0)),
            durMs: beat * (i === phrase.length - 1 ? 1.65 : 0.85) * 1000,
            gain: 3 * (game ? 0.036 : 0.045) * variation,
          }),
        );
      if (game && !quiet) {
        tone(ctx, out, t0, {
          freq: 83,
          sweepTo: 43,
          durMs: 160,
          type: "sine",
          gain: 3 * 0.064,
          attackMs: 5,
          releaseMs: 145,
        });
        for (const b of [1, 3])
          noise(ctx, out, t0 + beat * b, {
            durMs: 110,
            gain: 3 * 0.019,
            lowpass: 1600,
            attackMs: 12,
            releaseMs: 95,
          });
        if (bar % 4 === 2)
          noise(ctx, out, t0 + beat * 3.5, {
            durMs: 70,
            gain: 3 * 0.011,
            lowpass: 1100,
            attackMs: 8,
            releaseMs: 60,
          });
      }
      return t0 + beat * 4;
    },
  };
}
export const MUSIC: Record<MusicTrack, MusicVoice> = {
  menu: track(false),
  game: track(true),
};
