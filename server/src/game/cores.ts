import { CORE_TYPES, type CoreState, type CoreType, type Rect, type Vec2 } from '@partyficrim/shared';
import type { Room, RoomPlayer } from './rooms.js';
import { randomUUID } from 'node:crypto';

export const CORE_RADIUS = 8;
export const CORE_INTERVAL_MS = 3000;
export const CORE_MAX = 8;

interface SpawnArgs {
  now: number;
  lastSpawnAt: number;
  intervalMs: number;
  max: number;
  arena: Rect;
  obstacles: Rect[];
  existing: Map<string, CoreState>;
  unavailableTypes: Set<CoreType>;
}

function rectsOverlap(a: { x: number; y: number; w: number; h: number },
                     b: { x: number; y: number; w: number; h: number }): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function trySpawnCore(args: SpawnArgs): CoreState | null {
  if (args.now - args.lastSpawnAt < args.intervalMs) return null;
  if (args.existing.size >= args.max) return null;

  const available = CORE_TYPES.filter((type) => !args.unavailableTypes.has(type));
  if (available.length === 0) return null;
  const type = available[Math.floor(Math.random() * available.length)];
  if (!type) return null;

  const margin = CORE_RADIUS + 4;
  for (let attempt = 0; attempt < 30; attempt++) {
    const x = args.arena.x + margin + Math.random() * (args.arena.w - margin * 2);
    const y = args.arena.y + margin + Math.random() * (args.arena.h - margin * 2);
    const box = { x: x - CORE_RADIUS, y: y - CORE_RADIUS, w: CORE_RADIUS * 2, h: CORE_RADIUS * 2 };
    if (args.obstacles.some((o) => rectsOverlap(box, o))) continue;
    let collision = false;
    for (const c of args.existing.values()) {
      if (Math.hypot(c.pos.x - x, c.pos.y - y) < CORE_RADIUS * 3) {
        collision = true;
        break;
      }
    }
    if (collision) continue;
    const core: CoreState = { id: randomUUID(), type, pos: { x, y } };
    args.existing.set(core.id, core);
    return core;
  }
  return null;
}

function targetInventoryPlayer(defense: RoomPlayer | undefined, repair: RoomPlayer | undefined): RoomPlayer | null {
  if (!defense || !repair) return null;
  if (defense.inventory.length >= 4 && repair.inventory.length >= 4) return null;
  if (defense.inventory.length <= repair.inventory.length && defense.inventory.length < 4) return defense;
  if (repair.inventory.length < 4) return repair;
  return defense.inventory.length < 4 ? defense : null;
}

export function unavailableCoreTypes(room: Room): Set<CoreType> {
  const types = new Set<CoreType>();
  for (const core of room.cores.values()) types.add(core.type);
  for (const p of room.players.values()) {
    for (const type of p.inventory) types.add(type);
  }
  return types;
}

export function offeredCores(room: Room): CoreType[] {
  const offered: CoreType[] = [];
  for (const role of ['defense', 'repair'] as const) {
    const p = [...room.players.values()].find((player) => player.role === role);
    if (!p) continue;
    for (const index of p.selectedCores) {
      const type = p.inventory[index];
      if (type) offered.push(type);
    }
  }
  return offered;
}

export function processCorePickups(
  room: Room,
  pickers: { pos: Vec2; half: number }[],
  defense: RoomPlayer | undefined,
  repair: RoomPlayer | undefined
): CoreType[] {
  const picked: CoreType[] = [];
  for (const [id, core] of room.cores) {
    let overlaps = false;
    for (const picker of pickers) {
      const dx = Math.abs(picker.pos.x - core.pos.x);
      const dy = Math.abs(picker.pos.y - core.pos.y);
      if (dx <= picker.half + CORE_RADIUS && dy <= picker.half + CORE_RADIUS) {
        overlaps = true;
        break;
      }
    }
    if (!overlaps) continue;

    const target = targetInventoryPlayer(defense, repair);
    if (!target) continue;
    target.inventory.push(core.type);
    room.cores.delete(id);
    picked.push(core.type);
  }
  return picked;
}
