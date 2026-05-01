import { describe, it, expect, beforeEach } from 'vitest';
import { RoomManager } from './rooms.js';

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
});
