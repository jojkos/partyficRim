import { describe, it, expect } from 'vitest';
import { RoomManager } from './rooms.js';
import { tickRoom, buildDisplaySnapshot, buildPhoneSnapshot, requestStart } from './tick.js';

function makeRoomWithPlayers(count: 0 | 1 | 2) {
  const mgr = new RoomManager();
  const room = mgr.createRoom();
  if (count >= 1) {
    room.players.set('p1', {
      id: 'p1', sessionId: 's1', role: 'X', mode: 'in_robot',
      pos: { x: room.robot.x, y: room.robot.y }, connected: true,
      lastInput: { x: 0, y: 0 }, lastButtonAt: 0,
    });
  }
  if (count >= 2) {
    room.players.set('p2', {
      id: 'p2', sessionId: 's2', role: 'Y', mode: 'in_robot',
      pos: { x: room.robot.x, y: room.robot.y }, connected: true,
      lastInput: { x: 0, y: 0 }, lastButtonAt: 0,
    });
  }
  return { mgr, room };
}

describe('phase transitions', () => {
  it('stays in lobby with 0, 1, or 2 players (no auto-start)', () => {
    const { room: r1 } = makeRoomWithPlayers(1);
    tickRoom(r1, 0.033);
    expect(r1.phase).toBe('lobby');

    const { room: r2 } = makeRoomWithPlayers(2);
    tickRoom(r2, 0.033);
    expect(r2.phase).toBe('lobby');
  });

  it('requestStart only transitions to countdown when 2 players are connected', () => {
    const { room: r1 } = makeRoomWithPlayers(1);
    requestStart(r1);
    expect(r1.phase).toBe('lobby');

    const { room: r2 } = makeRoomWithPlayers(2);
    requestStart(r2);
    expect(r2.phase).toBe('countdown');
    expect(r2.countdownMsRemaining).toBeGreaterThan(0);
  });

  it('transitions to playing after countdown finishes', () => {
    const { room } = makeRoomWithPlayers(2);
    requestStart(room);
    expect(room.phase).toBe('countdown');
    for (let i = 0; i < 110; i++) tickRoom(room, 0.033);
    expect(room.phase).toBe('playing');
  });

  it('pauses when a player disconnects mid-game', () => {
    const { room } = makeRoomWithPlayers(2);
    requestStart(room);
    for (let i = 0; i < 200; i++) tickRoom(room, 0.033);
    expect(room.phase).toBe('playing');
    const p1 = room.players.get('p1');
    if (p1) p1.connected = false;
    tickRoom(room, 0.033);
    expect(room.phase).toBe('paused');
  });

  it('resumes when player reconnects', () => {
    const { room } = makeRoomWithPlayers(2);
    requestStart(room);
    for (let i = 0; i < 200; i++) tickRoom(room, 0.033);
    const p1 = room.players.get('p1');
    if (p1) p1.connected = false;
    tickRoom(room, 0.033);
    expect(room.phase).toBe('paused');
    const p1b = room.players.get('p1');
    if (p1b) p1b.connected = true;
    tickRoom(room, 0.033);
    expect(room.phase).toBe('playing');
  });
});

describe('snapshots', () => {
  it('buildDisplaySnapshot exposes room code, robot, players, phase', () => {
    const { room } = makeRoomWithPlayers(2);
    const snap = buildDisplaySnapshot(room);
    expect(snap.roomCode).toBe(room.code);
    expect(snap.robot).toEqual(room.robot);
    expect(snap.players.length).toBe(2);
    expect(snap.phase).toBe('lobby');
  });

  it('buildPhoneSnapshot includes own role and occupancy', () => {
    const { room } = makeRoomWithPlayers(2);
    const snap = buildPhoneSnapshot(room, 'p1');
    expect(snap.role).toBe('X');
    expect(snap.mode).toBe('in_robot');
    expect(snap.occupancy.X).toBe('in_robot');
    expect(snap.occupancy.Y).toBe('in_robot');
  });
});
