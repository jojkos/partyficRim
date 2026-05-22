// Procedural music tracks. Each track defines `scheduleBar(ctx, out, t0)` —
// schedules one bar of notes and returns when it ends. The engine loops by
// calling repeatedly. Replace with HTMLAudioElement-backed loops or
// AudioBufferSourceNode of a real file later.

import { tone } from './synth.js';
import type { MusicVoice } from './engine.js';

export type MusicTrack = 'menu' | 'game';

// Tiny utility: degree→hz from a root, in semitones.
function hz(root: number, semis: number): number {
  return root * 2 ** (semis / 12);
}

// Menu loop — slow, cheerful arpeggio over a sub.
const menu: MusicVoice = {
  scheduleBar(ctx, out, t0) {
    const bpm = 96;
    const beat = 60 / bpm;
    const root = 261.63; // C4
    // 8 eighths, A minor 7-ish: A C E G repeated rising/falling
    const pattern = [0, 7, 12, 16, 7, 12, 16, 19]; // semitone offsets from A3
    const aRoot = root * 2 ** ((-3) / 12); // A3 ≈ 220
    const eighth = beat / 2;
    for (let i = 0; i < pattern.length; i++) {
      tone(ctx, out, t0 + i * eighth, {
        freq: hz(aRoot, pattern[i]), durMs: eighth * 1000 * 0.9,
        type: 'triangle', gain: 0.18, attackMs: 5, releaseMs: 120,
      });
    }
    // Bass on 1 and 3
    tone(ctx, out, t0, {
      freq: hz(aRoot, -12), durMs: beat * 1.8 * 1000,
      type: 'sine', gain: 0.32, attackMs: 4, releaseMs: 200,
    });
    tone(ctx, out, t0 + beat * 2, {
      freq: hz(aRoot, -7), durMs: beat * 1.8 * 1000,
      type: 'sine', gain: 0.32, attackMs: 4, releaseMs: 200,
    });
    return t0 + beat * 4;
  },
};

// Gameplay loop — driving, dissonant, faster.
const game: MusicVoice = {
  scheduleBar(ctx, out, t0) {
    const bpm = 138;
    const beat = 60 / bpm;
    const sixteenth = beat / 4;
    const root = 220 * 2 ** ((-2) / 12); // ~196 (G3)
    // Kick on every beat
    for (let i = 0; i < 4; i++) {
      tone(ctx, out, t0 + i * beat, {
        freq: 90, sweepTo: 38, durMs: 180, type: 'sine', gain: 0.45, attackMs: 1, releaseMs: 160,
      });
    }
    // Bass riff (16ths)
    const riff = [0, 0, 12, 0, 5, 0, 12, 0, 0, 0, 10, 0, 7, 0, 3, 0];
    for (let i = 0; i < riff.length; i++) {
      if (riff[i] === 0 && i % 4 !== 0) continue; // sparse
      tone(ctx, out, t0 + i * sixteenth, {
        freq: hz(root, riff[i] - 12), durMs: sixteenth * 1000 * 0.9,
        type: 'sawtooth', gain: 0.16, attackMs: 2, releaseMs: 60,
      });
    }
    // Lead chime on beat 2 and 4
    [1, 3].forEach((b) => {
      tone(ctx, out, t0 + b * beat, {
        freq: hz(root, 19), durMs: beat * 500, type: 'square', gain: 0.14, releaseMs: 300,
      });
    });
    return t0 + beat * 4;
  },
};

export const MUSIC: Record<MusicTrack, MusicVoice> = { menu, game };
