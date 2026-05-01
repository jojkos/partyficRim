import type { PowerupState, Rect, Vec2 } from '@polararena/shared';
import { randomUUID } from 'node:crypto';

export const POWERUP_RADIUS = 8;

interface SpawnArgs {
  now: number;
  lastSpawnAt: number;
  intervalMs: number;
  max: number;
  arena: Rect;
  obstacles: Rect[];
  existing: Map<string, PowerupState>;
}

function rectsOverlap(a: { x: number; y: number; w: number; h: number },
                     b: { x: number; y: number; w: number; h: number }): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function trySpawnPowerup(args: SpawnArgs): PowerupState | null {
  if (args.now - args.lastSpawnAt < args.intervalMs) return null;
  if (args.existing.size >= args.max) return null;

  const margin = POWERUP_RADIUS + 4;
  for (let attempt = 0; attempt < 30; attempt++) {
    const x = args.arena.x + margin + Math.random() * (args.arena.w - margin * 2);
    const y = args.arena.y + margin + Math.random() * (args.arena.h - margin * 2);
    const box = { x: x - POWERUP_RADIUS, y: y - POWERUP_RADIUS, w: POWERUP_RADIUS * 2, h: POWERUP_RADIUS * 2 };
    if (args.obstacles.some((o) => rectsOverlap(box, o))) continue;
    let collision = false;
    for (const p of args.existing.values()) {
      if (Math.hypot(p.pos.x - x, p.pos.y - y) < POWERUP_RADIUS * 3) { collision = true; break; }
    }
    if (collision) continue;
    const id = randomUUID();
    const pwr: PowerupState = { id, pos: { x, y } };
    args.existing.set(id, pwr);
    return pwr;
  }
  return null;
}

export function processPickups(
  pwrs: Map<string, PowerupState>,
  pickers: { pos: Vec2; half: number }[]
): number {
  let count = 0;
  for (const [id, p] of pwrs) {
    for (const picker of pickers) {
      const dx = Math.abs(picker.pos.x - p.pos.x);
      const dy = Math.abs(picker.pos.y - p.pos.y);
      if (dx <= picker.half + POWERUP_RADIUS && dy <= picker.half + POWERUP_RADIUS) {
        pwrs.delete(id);
        count++;
        break;
      }
    }
  }
  return count;
}
