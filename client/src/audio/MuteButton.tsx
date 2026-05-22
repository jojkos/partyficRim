// Small floating audio toggle. Click to mute master. Long-press / Shift-click
// to also reset volumes to defaults. Visually unobtrusive — fits the existing
// theme's hand-drawn bevel style.

import { useEffect, useState, type CSSProperties } from 'react';
import { audio } from './engine.js';
import { PR } from '../ui/theme.js';

interface Props {
  style?: CSSProperties;
  size?: number;
}

export function MuteButton({ style, size = 38 }: Props) {
  const [, force] = useState(0);
  useEffect(() => audio.subscribe(() => force((x) => x + 1)), []);
  const muted = audio.isMuted('master');

  return (
    <button
      onClick={() => {
        audio.setMuted('master', !muted);
        if (muted) audio.play('ui.tap'); // we just turned it on — give feedback
      }}
      aria-label={muted ? 'Unmute' : 'Mute'}
      title={muted ? 'Unmute' : 'Mute'}
      style={{
        width: size, height: size,
        display: 'grid', placeItems: 'center',
        background: muted ? 'rgba(255,255,255,0.04)' : PR.color.panel,
        color: muted ? '#888' : PR.color.paper,
        border: `2px solid ${muted ? '#444' : PR.color.paper}55`,
        borderRadius: 999,
        font: `400 18px ${PR.font.display}`,
        cursor: 'pointer',
        padding: 0,
        ...style,
      }}
    >
      {muted ? '🔇' : '🔊'}
    </button>
  );
}
