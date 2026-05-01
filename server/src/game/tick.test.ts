import { describe, it, expect } from 'vitest';
import { RoomManager } from './rooms.js';
import { tickRoom, buildDisplaySnapshot, buildPhoneSnapshot } from './tick.js';

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
  it('stays in lobby with 0 or 1 players', () => {
    const { room } = makeRoomWithPlayers(1);
    tickRoom(room, 0.033);
    expect(room.phase).toBe('lobby');
  });

  it('transitions to countdown with 2 players', () => {
    const { room } = makeRoomWithPlayers(2);
    tickRoom(room, 0.033);
    expect(room.phase).toBe('countdown');
    expect(room.countdownMsRemaining).toBeGreaterThan(0);
  });

  it('transitions to playing after countdown finishes', () => {
    const { room } = makeRoomWithPlayers(2);
    tickRoom(room, 0.033); // -> countdown
    expect(room.phase).toBe('countdown');
    // simulate ~3.5s of ticks
    for (let i = 0; i < 110; i++) tickRoom(room, 0.033);
    expect(room.phase).toBe('playing');
  });

  it('pauses when a player disconnects mid-game', () => {
    const { room } = makeRoomWithPlayers(2);
    for (let i = 0; i < 200; i++) tickRoom(room, 0.033);
    expect(room.phase).toBe('playing');
    room.players.get('p1')!.connected = false;
    tickRoom(room, 0.033);
    expect(room.phase).toBe('paused');
  });

  it('resumes when player reconnects', () => {
    const { room } = makeRoomWithPlayers(2);
    for (let i = 0; i < 200; i++) tickRoom(room, 0.033);
    room.players.get('p1')!.connected = false;
    tickRoom(room, 0.033);
    expect(room.phase).toBe('paused');
    room.players.get('p1')!.connected = true;
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
