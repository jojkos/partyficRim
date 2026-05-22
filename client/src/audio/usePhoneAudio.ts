// Phone-side audio reactor.
//
// Policy: the phone never plays music or game-event SFX — those live on the
// display (host screen). The phone only reacts to ITS OWN actions:
//   - role-claim confirmation when our own snap.role flips to a new role
//   - UI taps / errors / leave are fired imperatively from button handlers
//     via `audio.play('ui.tap')` etc.
//
// This hook exists to translate one snapshot transition (own role change)
// into a sound. Everything else is direct.

import { useEffect, useRef } from 'react';
import type { PhoneSnapshot } from '@partyficrim/shared';
import { audio } from './engine.js';

export function usePhoneAudio(snap: PhoneSnapshot | null | undefined): void {
  const prevRole = useRef<string | null>(null);

  useEffect(() => {
    if (!snap) return;
    if (prevRole.current !== snap.role) {
      // Only ding when transitioning TO a claimed role (not on release).
      if (snap.role && prevRole.current !== snap.role) audio.play('ui.role_claim');
      prevRole.current = snap.role;
    }
  }, [snap]);
}
