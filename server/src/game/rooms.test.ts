import { describe, it, expect, beforeEach } from 'vitest';
import { RoomManager, pushFeed, roleClaims, playerForRole, addAttack } from './rooms.js';
import type { Role } from '@partyficrim/shared';

describe('RoomManager', () => {
  let mgr: RoomManager;

  beforeEach(() => {
    mgr = new RoomManager();
  });

  it('creates a room with a 4-letter uppercase code', () => {
    const room = mgr.createRoom();
    expect(room.code).toMatch(/^[A-Z]{4}$/);
    expect(mgr.getRoom(room.code)).toBe(room);
  });

  it('does not collide codes', () => {
    const codes = new Set<string>();
    for (let i = 0; i < 100; i++) codes.add(mgr.createRoom().code);
    expect(codes.size).toBe(100);
  });

  it('returns undefined for unknown code', () => {
    expect(mgr.getRoom('ZZZZ')).toBeUndefined();
  });

  it('removes a room', () => {
    const room = mgr.createRoom();
    mgr.removeRoom(room.code);
    expect(mgr.getRoom(room.code)).toBeUndefined();
  });

  it('iterRooms yields all rooms', () => {
    mgr.createRoom();
    mgr.createRoom();
    const rooms = [...mgr.iterRooms()];
    expect(rooms.length).toBe(2);
  });
});

function addPlayer(room: ReturnType<RoomManager['createRoom']>, id: string, role: Role | null, connected = true) {
  room.players.set(id, {
    id, sessionId: `s-${id}`, role, mode: 'in_robot',
    pos: { x: 0, y: 0 }, connected,
    lastInput: { x: 0, y: 0 }, lastButtonAt: 0,
    inventory: [], selectedCores: [], weaponSelectedCores: [],
    selectedAttackKind: null, quadrant: null,
  });
}

describe('pushFeed', () => {
  it('adds events and caps at 12', () => {
    const room = new RoomManager().createRoom();
    for (let i = 0; i < 20; i++) {
      pushFeed(room, { ts: i, role: null, kind: 'action', detail: `event ${i}` });
    }
    expect(room.eventFeed.length).toBe(12);
    expect(room.eventFeed[0]!.detail).toBe('event 8');
    expect(room.eventFeed[11]!.detail).toBe('event 19');
  });
});

describe('roleClaims', () => {
  it('returns connected role holders', () => {
    const room = new RoomManager().createRoom();
    addPlayer(room, 'p1', 'defense', true);
    addPlayer(room, 'p2', 'repair', false); // disconnected
    addPlayer(room, 'p3', 'weapons', true);

    const claims = roleClaims(room);
    expect(claims.defense).toBe('p1');
    expect(claims.repair).toBeNull(); // disconnected
    expect(claims.weapons).toBe('p3');
  });

  it('returns null for unclaimed roles', () => {
    const room = new RoomManager().createRoom();
    const claims = roleClaims(room);
    expect(claims).toEqual({ defense: null, repair: null, weapons: null });
  });
});

describe('playerForRole', () => {
  it('finds the player with the given role', () => {
    const room = new RoomManager().createRoom();
    addPlayer(room, 'p1', 'repair');
    const found = playerForRole(room, 'repair');
    expect(found?.id).toBe('p1');
  });

  it('returns undefined when role is not assigned', () => {
    const room = new RoomManager().createRoom();
    expect(playerForRole(room, 'weapons')).toBeUndefined();
  });
});

describe('addAttack', () => {
  it('creates a melee attack with 450ms TTL', () => {
    const room = new RoomManager().createRoom();
    addAttack(room, 'melee', 0, ['#ff0000']);
    expect(room.attacks.length).toBe(1);
    expect(room.attacks[0]!.kind).toBe('melee');
    expect(room.attacks[0]!.quadrant).toBe(0);
    expect(room.attacks[0]!.ttlMsRemaining).toBe(450);
    expect(room.attacks[0]!.colors).toEqual(['#ff0000']);
  });

  it('creates a bomb attack with 900ms TTL and position', () => {
    const room = new RoomManager().createRoom();
    addAttack(room, 'bomb', 2, [], { x: 100, y: 200 });
    expect(room.attacks[0]!.kind).toBe('bomb');
    expect(room.attacks[0]!.ttlMsRemaining).toBe(900);
    expect(room.attacks[0]!.pos).toEqual({ x: 100, y: 200 });
  });
});

