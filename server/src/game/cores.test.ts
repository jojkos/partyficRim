import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  trySpawnCore,
  unavailableCoreTypes,
  offeredCores,
  processCorePickups,
  CORE_RADIUS,
  CORE_INTERVAL_MS,
  CORE_MAX,
} from './cores.js';
import { RoomManager, type Room, type RoomPlayer } from './rooms.js';
import type { CoreState, CoreType, Rect, Vec2 } from '@partyficrim/shared';

const ARENA: Rect = { x: 0, y: 0, w: 800, h: 600 };

function makePlayer(role: 'defense' | 'repair' | 'weapons', overrides?: Partial<RoomPlayer>): RoomPlayer {
  return {
    id: `p-${role}`, sessionId: `s-${role}`, role,
    mode: 'in_robot', pos: { x: 400, y: 300 }, connected: true,
    lastInput: { x: 0, y: 0 }, lastButtonAt: 0,
    inventory: [], selectedCores: [], weaponSelectedCores: [],
    selectedAttackKind: null, quadrant: null,
    ...overrides,
  };
}

describe('trySpawnCore', () => {
  it('spawns when interval elapsed and below cap', () => {
    const existing = new Map<string, CoreState>();
    const core = trySpawnCore({
      now: 5000, lastSpawnAt: 0, intervalMs: CORE_INTERVAL_MS,
      max: CORE_MAX, arena: ARENA, obstacles: [], existing,
      unavailableTypes: new Set(),
    });
    expect(core).not.toBeNull();
    expect(existing.size).toBe(1);
  });

  it('does not spawn before interval', () => {
    const existing = new Map<string, CoreState>();
    const core = trySpawnCore({
      now: 1000, lastSpawnAt: 0, intervalMs: CORE_INTERVAL_MS,
      max: CORE_MAX, arena: ARENA, obstacles: [], existing,
      unavailableTypes: new Set(),
    });
    expect(core).toBeNull();
    expect(existing.size).toBe(0);
  });

  it('does not spawn when at cap', () => {
    const existing = new Map<string, CoreState>();
    for (let i = 0; i < CORE_MAX; i++) {
      existing.set(`c${i}`, { id: `c${i}`, type: 'red', pos: { x: 50 + i * 30, y: 50 } });
    }
    const core = trySpawnCore({
      now: 5000, lastSpawnAt: 0, intervalMs: CORE_INTERVAL_MS,
      max: CORE_MAX, arena: ARENA, obstacles: [], existing,
      unavailableTypes: new Set(),
    });
    expect(core).toBeNull();
  });

  it('avoids spawning unavailable types', () => {
    const existing = new Map<string, CoreState>();
    // Mark all types except 'pink' as unavailable
    const unavailable = new Set<CoreType>(['red', 'orange', 'yellow', 'green', 'cyan', 'blue', 'purple']);
    const core = trySpawnCore({
      now: 5000, lastSpawnAt: 0, intervalMs: CORE_INTERVAL_MS,
      max: CORE_MAX, arena: ARENA, obstacles: [], existing,
      unavailableTypes: unavailable,
    });
    expect(core).not.toBeNull();
    expect(core!.type).toBe('pink');
  });

  it('returns null when all types are unavailable', () => {
    const existing = new Map<string, CoreState>();
    const allTypes = new Set<CoreType>(['red', 'orange', 'yellow', 'green', 'cyan', 'blue', 'purple', 'pink']);
    const core = trySpawnCore({
      now: 5000, lastSpawnAt: 0, intervalMs: CORE_INTERVAL_MS,
      max: CORE_MAX, arena: ARENA, obstacles: [], existing,
      unavailableTypes: allTypes,
    });
    expect(core).toBeNull();
  });

  it('spawns within arena bounds', () => {
    const existing = new Map<string, CoreState>();
    const core = trySpawnCore({
      now: 5000, lastSpawnAt: 0, intervalMs: CORE_INTERVAL_MS,
      max: CORE_MAX, arena: ARENA, obstacles: [], existing,
      unavailableTypes: new Set(),
    });
    expect(core).not.toBeNull();
    expect(core!.pos.x).toBeGreaterThanOrEqual(CORE_RADIUS + 4);
    expect(core!.pos.x).toBeLessThanOrEqual(ARENA.w - CORE_RADIUS - 4);
    expect(core!.pos.y).toBeGreaterThanOrEqual(CORE_RADIUS + 4);
    expect(core!.pos.y).toBeLessThanOrEqual(ARENA.h - CORE_RADIUS - 4);
  });
});

describe('unavailableCoreTypes', () => {
  it('collects types from field cores and player inventories', () => {
    const room = new RoomManager().createRoom();
    room.cores.set('c1', { id: 'c1', type: 'red', pos: { x: 100, y: 100 } });
    room.cores.set('c2', { id: 'c2', type: 'blue', pos: { x: 200, y: 200 } });

    const player = makePlayer('defense', { inventory: ['green', 'pink'] });
    room.players.set(player.id, player);

    const types = unavailableCoreTypes(room);
    expect(types.has('red')).toBe(true);
    expect(types.has('blue')).toBe(true);
    expect(types.has('green')).toBe(true);
    expect(types.has('pink')).toBe(true);
    expect(types.has('yellow')).toBe(false);
  });
});

describe('offeredCores', () => {
  it('returns cores at selectedCores indices for defense and repair', () => {
    const room = new RoomManager().createRoom();
    const defense = makePlayer('defense', {
      inventory: ['red', 'blue', 'green', 'yellow'],
      selectedCores: [0, 2],
    });
    const repair = makePlayer('repair', {
      inventory: ['cyan', 'pink'],
      selectedCores: [1],
    });
    room.players.set(defense.id, defense);
    room.players.set(repair.id, repair);

    const offered = offeredCores(room);
    expect(offered).toEqual(['red', 'green', 'pink']);
  });

  it('returns empty when no cores are selected', () => {
    const room = new RoomManager().createRoom();
    const defense = makePlayer('defense', {
      inventory: ['red', 'blue'],
      selectedCores: [],
    });
    room.players.set(defense.id, defense);

    expect(offeredCores(room)).toEqual([]);
  });

  it('skips undefined indices', () => {
    const room = new RoomManager().createRoom();
    const defense = makePlayer('defense', {
      inventory: ['red'],
      selectedCores: [0, 3], // index 3 doesn't exist
    });
    room.players.set(defense.id, defense);

    expect(offeredCores(room)).toEqual(['red']);
  });
});

describe('processCorePickups', () => {
  it('picks up cores overlapping a picker', () => {
    const room = new RoomManager().createRoom();
    room.cores.set('near', { id: 'near', type: 'red', pos: { x: 100, y: 100 } });
    room.cores.set('far', { id: 'far', type: 'blue', pos: { x: 600, y: 500 } });

    const defense = makePlayer('defense');
    const repair = makePlayer('repair');
    room.players.set(defense.id, defense);
    room.players.set(repair.id, repair);

    const pickers = [{ pos: { x: 100, y: 100 }, half: 20 }];
    const picked = processCorePickups(room, pickers, defense, repair);

    expect(picked).toEqual(['red']);
    expect(room.cores.has('near')).toBe(false);
    expect(room.cores.has('far')).toBe(true);
  });

  it('distributes to the player with fewer inventory items', () => {
    const room = new RoomManager().createRoom();
    room.cores.set('c1', { id: 'c1', type: 'red', pos: { x: 100, y: 100 } });

    const defense = makePlayer('defense', { inventory: ['blue', 'green'] });
    const repair = makePlayer('repair', { inventory: [] });
    room.players.set(defense.id, defense);
    room.players.set(repair.id, repair);

    const pickers = [{ pos: { x: 100, y: 100 }, half: 20 }];
    processCorePickups(room, pickers, defense, repair);

    expect(repair.inventory).toContain('red');
    expect(defense.inventory).not.toContain('red');
  });

  it('respects 4-slot inventory cap', () => {
    const room = new RoomManager().createRoom();
    room.cores.set('c1', { id: 'c1', type: 'red', pos: { x: 100, y: 100 } });

    const defense = makePlayer('defense', { inventory: ['red', 'blue', 'green', 'yellow'] });
    const repair = makePlayer('repair', { inventory: ['cyan', 'pink', 'purple', 'orange'] });
    room.players.set(defense.id, defense);
    room.players.set(repair.id, repair);

    const pickers = [{ pos: { x: 100, y: 100 }, half: 20 }];
    const picked = processCorePickups(room, pickers, defense, repair);

    // Both players at cap — nothing should be picked up
    expect(picked).toEqual([]);
    expect(room.cores.has('c1')).toBe(true);
  });
});
