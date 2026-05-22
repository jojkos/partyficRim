// Phone-side audio reactor. Sparing on its own — the display is the source of
// truth for music + most SFX. The phone only plays:
//   - menu music while in the lobby (so the room-code screen has presence)
//   - role-claim confirmation when our snap.role flips to a non-null value
//   - nothing during gameplay; the display covers it
//
// Local UI sounds (tap, leave, error) are fired imperatively by callers,
// e.g. `audio.play('ui.tap')` from a button's onClick.

import { useEffect, useRef } from 'react';
import type { PhoneSnapshot } from '@partyficrim/shared';
import { audio } from './engine.js';

export function usePhoneAudio(snap: PhoneSnapshot | null | undefined): void {
  const prevPhase = useRef<string | null>(null);
  const prevRole = useRef<string | null>(null);

  useEffect(() => {
    if (!snap) {
      // Pre-join "enter room code" screen: play menu music too.
      audio.music('menu');
      return;
    }

    if (prevPhase.current !== snap.phase) {
      switch (snap.phase) {
        case 'lobby':
        case 'countdown':
          audio.music('menu');
          break;
        case 'playing':
        case 'gameover':
        case 'paused':
          audio.music(null);
          break;
      }
      prevPhase.current = snap.phase;
    }

    if (prevRole.current !== snap.role) {
      if (snap.role && prevRole.current !== snap.role) audio.play('ui.role_claim');
      prevRole.current = snap.role;
    }
  }, [snap]);
}
