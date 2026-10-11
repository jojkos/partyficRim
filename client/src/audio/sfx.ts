import { chord, keys, noise, tone } from "./synth.js";
import type { VoiceFn } from "./engine.js";
export const SFX = {
  "ui.tap": (c, o, t) => keys(c, o, t, { freq: 460, durMs: 95, gain: 0.1 }),
  "ui.role_claim": (c, o, t) => {
    keys(c, o, t, { freq: 293.66, durMs: 240, gain: 0.11 });
    keys(c, o, t + 0.08, { freq: 440, durMs: 330, gain: 0.08 });
  },
  "ui.start_press": (c, o, t) =>
    chord(c, o, t, [293.66, 369.99, 440], {
      durMs: 320,
      gain: 0.15,
      type: "sine",
      spacingMs: 45,
    }),
  "ui.leave": (c, o, t) =>
    keys(c, o, t, { freq: 293.66, durMs: 190, gain: 0.085 }),
  "ui.error": (c, o, t) => {
    keys(c, o, t, { freq: 220, durMs: 170, gain: 0.11 });
    keys(c, o, t + 0.12, { freq: 196, durMs: 220, gain: 0.08 });
  },
  "game.countdown_tick": (c, o, t) =>
    keys(c, o, t, { freq: 440, durMs: 170, gain: 0.15 }),
  "game.start": (c, o, t) => {
    [293.66, 369.99, 440, 587.33].forEach((f, i) =>
      keys(c, o, t + i * 0.07, { freq: f, durMs: 440, gain: 0.11 }),
    );
    tone(c, o, t, {
      freq: 90,
      sweepTo: 45,
      durMs: 230,
      gain: 0.13,
      type: "sine",
      releaseMs: 210,
    });
  },
  "game.over": (c, o, t) => {
    [440, 369.99, 293.66].forEach((f, i) =>
      keys(c, o, t + i * 0.14, { freq: f, durMs: 600, gain: 0.12 }),
    );
  },
  "attack.melee": (c, o, t) => {
    noise(c, o, t, {
      durMs: 150,
      gain: 0.16,
      lowpass: 2100,
      attackMs: 15,
      releaseMs: 110,
    });
    tone(c, o, t, {
      freq: 140,
      sweepTo: 70,
      durMs: 160,
      type: "sine",
      gain: 0.11,
      attackMs: 5,
      releaseMs: 135,
    });
  },
  "attack.rotary": (c, o, t) => {
    for (let i = 0; i < 3; i++) {
      noise(c, o, t + i * 0.045, {
        durMs: 50,
        gain: 0.1,
        lowpass: 1400,
        attackMs: 3,
        releaseMs: 40,
      });
      tone(c, o, t + i * 0.045, {
        freq: 150,
        durMs: 65,
        type: "sine",
        gain: 0.045,
        releaseMs: 55,
      });
    }
  },
  "attack.laser": (c, o, t) => {
    tone(c, o, t, {
      freq: 760,
      sweepTo: 240,
      durMs: 240,
      type: "sine",
      gain: 0.15,
      attackMs: 12,
      releaseMs: 210,
    });
    noise(c, o, t, { durMs: 150, gain: 0.04, lowpass: 1100, releaseMs: 135 });
  },
  "attack.bomb": (c, o, t) => {
    tone(c, o, t, {
      freq: 76,
      sweepTo: 34,
      durMs: 440,
      type: "sine",
      gain: 0.21,
      attackMs: 8,
      releaseMs: 380,
    });
    noise(c, o, t, {
      durMs: 420,
      gain: 0.15,
      lowpass: 850,
      attackMs: 12,
      releaseMs: 380,
    });
  },
  "attack.bomb_armed": (c, o, t) =>
    keys(c, o, t, { freq: 349.23, durMs: 170, gain: 0.09 }),
  "damage.light": (c, o, t) =>
    noise(c, o, t, {
      durMs: 130,
      gain: 0.11,
      lowpass: 1250,
      attackMs: 6,
      releaseMs: 110,
    }),
  "damage.heavy": (c, o, t) => {
    noise(c, o, t, {
      durMs: 220,
      gain: 0.16,
      lowpass: 900,
      attackMs: 7,
      releaseMs: 190,
    });
    tone(c, o, t, {
      freq: 100,
      sweepTo: 58,
      durMs: 200,
      type: "sine",
      gain: 0.13,
      attackMs: 6,
      releaseMs: 175,
    });
  },
  "core.spawn": (c, o, t) =>
    keys(c, o, t, { freq: 587.33, durMs: 280, gain: 0.045 }),
  "enemy.spawn": (c, o, t) =>
    noise(c, o, t, {
      durMs: 120,
      gain: 0.025,
      lowpass: 600,
      attackMs: 35,
      releaseMs: 80,
    }),
  "repair.tick": (c, o, t) => {
    keys(c, o, t, { freq: 349.23, durMs: 190, gain: 0.1 });
    keys(c, o, t + 0.055, { freq: 523.25, durMs: 240, gain: 0.065 });
  },
} satisfies Record<string, VoiceFn>;
export type SfxName = keyof typeof SFX;
