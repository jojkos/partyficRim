// Display-side audio reactor. Diffs successive DisplaySnapshots and triggers
// SFX + music transitions. Pure side-effect hook; no rendering.
//
// The diffs intentionally compare by id for collections (attacks/bombs/cores/
// enemies) so we can detect *new* arrivals without playing for ones that
// already existed last tick.

import { useEffect, useRef } from 'react';
import type { DisplaySnapshot, Quadrant } from '@partyficrim/shared';
import { audio } from './engine.js';

const QUADRANTS: Quadrant[] = [0, 1, 2, 3];

export function useGameAudio(snap: DisplaySnapshot | null | undefined): void {
  const prev = useRef<DisplaySnapshot | null>(null);
  const seenAttacks = useRef(new Set<string>());
  const seenBombs = useRef(new Set<string>());
  const seenCores = useRef(new Set<string>());
  const seenEnemies = useRef(new Set<string>());
  const lastCountdownSec = useRef<number | null>(null);

  useEffect(() => {
    if (!snap) return;
    const p = prev.current;

    // --- music + phase stings -------------------------------------------
    if (!p || p.phase !== snap.phase) {
      switch (snap.phase) {
        case 'lobby':
          audio.music('menu');
          break;
        case 'countdown':
          audio.music('menu'); // keep menu music under countdown
          break;
        case 'playing':
          if (p?.phase === 'countdown') audio.play('game.start');
          audio.music('game');
          break;
        case 'gameover':
          audio.play('game.over');
          audio.music(null);
          break;
        case 'paused':
          audio.music(null);
          break;
      }
    }

    // --- countdown ticks (once per second) ------------------------------
    if (snap.phase === 'countdown') {
      const sec = Math.ceil(snap.countdownMsRemaining / 1000);
      if (lastCountdownSec.current !== sec && sec > 0) {
        audio.play('game.countdown_tick');
        lastCountdownSec.current = sec;
      }
    } else {
      lastCountdownSec.current = null;
    }

    // --- new attacks -----------------------------------------------------
    if (p?.phase !== snap.phase && snap.phase === 'lobby') {
      // Reset id sets when we re-enter lobby (room restart etc).
      seenAttacks.current.clear();
      seenBombs.current.clear();
      seenCores.current.clear();
      seenEnemies.current.clear();
    }
    const liveAttackIds = new Set<string>();
    for (const a of snap.attacks) {
      liveAttackIds.add(a.id);
      if (!seenAttacks.current.has(a.id)) {
        seenAttacks.current.add(a.id);
        audio.play(`attack.${a.kind}` as const);
      }
    }
    for (const id of seenAttacks.current) if (!liveAttackIds.has(id)) seenAttacks.current.delete(id);

    // --- new bombs (armed beep on appearance) ---------------------------
    const liveBombIds = new Set<string>();
    for (const b of snap.bombs) {
      liveBombIds.add(b.id);
      if (!seenBombs.current.has(b.id)) {
        seenBombs.current.add(b.id);
        audio.play('attack.bomb_armed');
      }
    }
    for (const id of seenBombs.current) if (!liveBombIds.has(id)) seenBombs.current.delete(id);

    // --- new cores / enemies --------------------------------------------
    const liveCoreIds = new Set<string>();
    for (const c of snap.cores) {
      liveCoreIds.add(c.id);
      if (!seenCores.current.has(c.id)) {
        seenCores.current.add(c.id);
        // Throttle spam: only ping the first new core per tick.
        // (Subsequent will register in the set so we don't repeat for them.)
      }
    }
    if (p) {
      // play core.spawn only if at least one is new this tick
      let anyNew = false;
      for (const c of snap.cores) if (!p.cores.some((pc) => pc.id === c.id)) { anyNew = true; break; }
      if (anyNew) audio.play('core.spawn');
    }
    for (const id of seenCores.current) if (!liveCoreIds.has(id)) seenCores.current.delete(id);

    const liveEnemyIds = new Set<string>();
    for (const e of snap.enemies) {
      liveEnemyIds.add(e.id);
      if (!seenEnemies.current.has(e.id)) seenEnemies.current.add(e.id);
    }
    if (p) {
      let anyNew = false;
      for (const e of snap.enemies) if (!p.enemies.some((pe) => pe.id === e.id)) { anyNew = true; break; }
      if (anyNew) audio.play('enemy.spawn');
    }
    for (const id of seenEnemies.current) if (!liveEnemyIds.has(id)) seenEnemies.current.delete(id);

    // --- damage (quadrant hp drops) -------------------------------------
    if (p && snap.phase === 'playing') {
      let totalDrop = 0;
      for (const q of QUADRANTS) {
        const before = p.quadrantHp[q];
        const after = snap.quadrantHp[q];
        if (after < before) totalDrop += before - after;
      }
      if (totalDrop > 0) audio.play(totalDrop >= 8 ? 'damage.heavy' : 'damage.light');
    }

    // --- repair feed events ---------------------------------------------
    if (p) {
      const prevLatest = p.eventFeed[p.eventFeed.length - 1]?.ts ?? 0;
      for (const ev of snap.eventFeed) {
        if (ev.ts <= prevLatest) continue;
        if (ev.kind === 'repair') audio.play('repair.tick');
      }
    }

    prev.current = snap;
  }, [snap]);
}
