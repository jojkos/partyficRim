// Visual system — vibrant playful arcade tokens shared across all UI screens.
// Mirrors the design canvas tokens (PR.*) so the implementation matches the
// handoff bundle 1:1.

import type { CSSProperties } from 'react';

export const PR = {
  color: {
    bg: '#1c1326',
    bgDeep: '#120a1a',
    panel: '#26183a',
    panelHi: '#382458',
    cardCream: '#fff4dc',
    cardCreamLo: '#f0dfb5',

    flame: '#ff7b3a',
    flameDk: '#c8451c',
    sun: '#ffd24a',
    leaf: '#8fd14f',
    sky: '#5cc9ff',
    sea: '#3d8fd6',
    rose: '#ff5f8a',
    plum: '#a96bff',
    cherry: '#ff3b5e',
    mint: '#67e3a8',

    ink: '#1a0e2c',
    paper: '#fff7e6',
  },
  font: {
    display: '"Bagel Fat One", "Fredoka", system-ui, sans-serif',
    sans: '"Inter", system-ui, -apple-system, sans-serif',
    mono: '"JetBrains Mono", ui-monospace, monospace',
  },
  shadow: (x = 4, y = 6, c = '#1a0e2c') => `${x}px ${y}px 0 ${c}`,
  ink: { sm: 2, md: 3, lg: 4, xl: 6 },
  r: { sm: 6, md: 10, lg: 16, xl: 22, pill: 999 },
  role: {
    defense: '#ff5f8a',
    repair: '#8fd14f',
    weapons: '#ffd24a',
  } as Record<'defense' | 'repair' | 'weapons', string>,
  roleLabel: {
    defense: 'DEFENSE',
    repair: 'REPAIR',
    weapons: 'WEAPONS',
  } as Record<'defense' | 'repair' | 'weapons', string>,
};

// Global keyframes + small button bevel utility. Mounted once at app root.
export function PRStyles() {
  return (
    <style>{`
      .pr-bevel-btn { transition: transform .08s ease, box-shadow .08s ease; }
      .pr-bevel-btn:active:not(:disabled) {
        transform: translate(2px, 3px);
        box-shadow: 2px 3px 0 ${PR.color.ink} !important;
      }
      @keyframes pr-bob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
      @keyframes pr-bob-lg { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
      @keyframes pr-pulse { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.08); opacity: .85; } }
      @keyframes pr-blink { 0%, 92%, 100% { transform: scaleY(1); } 96% { transform: scaleY(0.1); } }
      @keyframes pr-blip { 0%, 100% { opacity: 0.4; } 50% { opacity: 1; } }
      @keyframes pr-shake {
        0%, 100% { transform: translate(0, 0); }
        25% { transform: translate(-1px, 1px); }
        50% { transform: translate(1px, -1px); }
        75% { transform: translate(-1px, -1px); }
      }
      @keyframes pr-rotate-hint {
        0%, 100% { transform: rotate(-12deg); }
        50% { transform: rotate(78deg); }
      }
      @keyframes pr-jiggle {
        0%, 100% { transform: scale(1, 1); }
        30% { transform: scale(1.06, 0.94); }
        60% { transform: scale(0.96, 1.04); }
      }
      @keyframes pr-hop {
        0%, 100% { transform: translateY(0) scaleY(1); }
        40% { transform: translateY(-10px) scaleY(1.05); }
        45% { transform: translateY(-12px) scaleY(0.95); }
      }
    `}</style>
  );
}

// Twinkly starfield used in landing / lobby / phone-join backdrops.
export function Starfield({ count = 36, w = 1280, h = 720 }: { count?: number; w?: number; h?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => {
        const x = (i * 137) % w;
        const y = (i * 71) % h;
        const dur = 1.4 + (i % 5) * 0.3;
        return (
          <div
            key={i}
            style={{
              position: 'absolute', left: x, top: y, width: 2, height: 2,
              background: '#fff', borderRadius: '50%',
              opacity: 0.3 + (i % 3) * 0.2,
              animation: `pr-blip ${dur}s ease-in-out infinite`,
              animationDelay: `${(i % 7) * 0.2}s`,
              pointerEvents: 'none',
            }}
          />
        );
      })}
    </>
  );
}

// "partyficRim" wordmark — display-font with chunky offset shadows.
export function Wordmark({ size = 132 }: { size?: number }) {
  const tinyShadow = size <= 36 ? `2px 3px 0 ${PR.color.flameDk}, 4px 5px 0 ${PR.color.ink}`
    : size <= 64 ? `3px 5px 0 ${PR.color.flameDk}, 6px 8px 0 ${PR.color.ink}`
    : `5px 7px 0 ${PR.color.flameDk}, 10px 12px 0 ${PR.color.ink}`;
  return (
    <h1 style={{
      font: `400 ${size}px ${PR.font.display}`,
      margin: 0, letterSpacing: 2,
      color: PR.color.sun,
      textShadow: tinyShadow,
      lineHeight: 1,
    }}>
      partyfic<span style={{ color: PR.color.flame }}>RIM</span>
    </h1>
  );
}

// Big bevel button (HOST / JOIN / RESTART). The link/button choice is left to caller via `as`.
export function bevelButtonStyle(opts: {
  bg: string;
  fg?: string;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
}): CSSProperties {
  const { bg, fg = PR.color.ink, size = 'md', disabled } = opts;
  const pad = size === 'lg' ? '20px 48px' : size === 'sm' ? '10px 22px' : '14px 32px';
  const fontSize = size === 'lg' ? 60 : size === 'sm' ? 22 : 36;
  const sx = size === 'lg' ? 6 : size === 'sm' ? 3 : 4;
  const sy = size === 'lg' ? 8 : size === 'sm' ? 4 : 5;
  return {
    display: 'inline-block',
    background: disabled ? '#33333a' : bg,
    color: disabled ? '#666' : fg,
    border: `${size === 'lg' ? 5 : 3}px solid ${disabled ? '#444' : PR.color.ink}`,
    borderRadius: PR.r.lg,
    boxShadow: disabled ? 'none' : PR.shadow(sx, sy, PR.color.ink),
    padding: pad,
    font: `400 ${fontSize}px ${PR.font.display}`,
    letterSpacing: size === 'lg' ? 4 : 3,
    textAlign: 'center',
    textDecoration: 'none',
    cursor: disabled ? 'not-allowed' : 'pointer',
    lineHeight: 1,
  };
}
