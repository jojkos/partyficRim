// Placeholder synthesis primitives. Each fn schedules nodes on the given
// AudioContext, routed to `out`. All sounds are short (< 1.5s) and self-clean
// (oscillators stop themselves, GC reclaims nodes).
//
// These exist so we have working sound NOW without any asset files. Replacing
// any sound with a real sample later means swapping its registry entry in
// src/audio/sfx.ts — no call site changes.

export function tone(
  ctx: AudioContext, out: AudioNode, t0: number,
  opts: {
    freq: number;
    durMs: number;
    type?: OscillatorType;
    gain?: number;
    attackMs?: number;
    releaseMs?: number;
    detune?: number;
    sweepTo?: number; // optional pitch slide
  },
): void {
  const dur = opts.durMs / 1000;
  const attack = (opts.attackMs ?? 8) / 1000;
  const release = (opts.releaseMs ?? 80) / 1000;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(opts.gain ?? 0.3, t0 + attack);
  g.gain.setValueAtTime(opts.gain ?? 0.3, t0 + Math.max(attack, dur - release));
  g.gain.linearRampToValueAtTime(0, t0 + dur);
  g.connect(out);

  const osc = ctx.createOscillator();
  osc.type = opts.type ?? 'square';
  osc.frequency.setValueAtTime(opts.freq, t0);
  if (opts.detune) osc.detune.setValueAtTime(opts.detune, t0);
  if (opts.sweepTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, opts.sweepTo), t0 + dur);
  osc.connect(g);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

export function noise(
  ctx: AudioContext, out: AudioNode, t0: number,
  opts: { durMs: number; gain?: number; lowpass?: number; attackMs?: number; releaseMs?: number },
): void {
  const dur = opts.durMs / 1000;
  const attack = (opts.attackMs ?? 2) / 1000;
  const release = (opts.releaseMs ?? 60) / 1000;
  const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;

  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(opts.gain ?? 0.3, t0 + attack);
  g.gain.setValueAtTime(opts.gain ?? 0.3, t0 + Math.max(attack, dur - release));
  g.gain.linearRampToValueAtTime(0, t0 + dur);

  let last: AudioNode = src;
  if (opts.lowpass) {
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = opts.lowpass;
    last.connect(lp);
    last = lp;
  }
  last.connect(g);
  g.connect(out);
  src.start(t0);
  src.stop(t0 + dur + 0.02);
}

// Short percussive "kick" — body sine + click noise.
export function kick(ctx: AudioContext, out: AudioNode, t0: number, gain = 0.6): void {
  tone(ctx, out, t0, { freq: 110, sweepTo: 35, durMs: 220, type: 'sine', gain, attackMs: 1, releaseMs: 180 });
  noise(ctx, out, t0, { durMs: 40, gain: gain * 0.25, lowpass: 3000, attackMs: 1, releaseMs: 30 });
}

// Two-tone arpeggio for UI affirmations.
export function chord(
  ctx: AudioContext, out: AudioNode, t0: number,
  freqs: number[], opts: { durMs: number; gain?: number; type?: OscillatorType; spacingMs?: number } = { durMs: 220 },
): void {
  const space = (opts.spacingMs ?? 0) / 1000;
  freqs.forEach((f, i) => {
    tone(ctx, out, t0 + i * space, {
      freq: f, durMs: opts.durMs, gain: (opts.gain ?? 0.25) / Math.sqrt(freqs.length),
      type: opts.type ?? 'triangle', attackMs: 4, releaseMs: 120,
    });
  });
}
