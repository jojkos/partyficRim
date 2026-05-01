import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createServer, type Server as HttpServer } from 'node:http';
import { Server, type Socket as ServerSocket } from 'socket.io';
import { io as ioClient, type Socket as ClientSocket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents, Role } from '@partyficrim/shared';
import { RoomManager } from '../game/rooms.js';
import { registerHandlers, socketByPlayerId } from './handlers.js';

type IO = Server<ClientToServerEvents, ServerToClientEvents>;
type CSocket = ClientSocket<ServerToClientEvents, ClientToServerEvents>;

let httpServer: HttpServer;
let io: IO;
let port: number;
let mgr: RoomManager;
let clients: CSocket[] = [];

beforeEach(async () => {
  socketByPlayerId.clear();
  httpServer = createServer();
  io = new Server(httpServer);
  mgr = new RoomManager();
  registerHandlers(io, mgr);
  await new Promise<void>((resolve) => {
    httpServer.listen(0, () => resolve());
  });
  const addr = httpServer.address();
  if (typeof addr === 'object' && addr && addr.port) port = addr.port;
});

afterEach(async () => {
  for (const c of clients) c.disconnect();
  clients = [];
  socketByPlayerId.clear();
  await new Promise<void>((resolve) => io.close(() => resolve()));
  if (httpServer.listening) {
    await new Promise<void>((resolve) => {
      httpServer.close(() => resolve());
    });
  }
});

async function connect(): Promise<CSocket> {
  const sock = ioClient(`http://localhost:${port}`, {
    transports: ['websocket'],
    forceNew: true,
  }) as CSocket;
  clients.push(sock);
  await new Promise<void>((resolve) => {
    sock.on('connect', () => resolve());
  });
  return sock;
}

function serverSocketFor(client: CSocket): ServerSocket | undefined {
  const id = client.id;
  return id ? io.sockets.sockets.get(id) as ServerSocket | undefined : undefined;
}

function isInRoom(serverSock: ServerSocket | undefined, channel: string): boolean {
  return serverSock?.rooms.has(channel) ?? false;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((r) => { setTimeout(r, ms); });
}

async function emitCreateRoom(c: CSocket): Promise<string> {
  return new Promise((resolve) => {
    c.emit('display:create_room', ({ roomCode }) => resolve(roomCode));
  });
}

async function emitJoinRoom(
  c: CSocket,
  roomCode: string
): Promise<{ ok: boolean; error?: string }> {
  return new Promise((resolve) => {
    c.emit('display:join_room', { roomCode }, (res) => resolve(res));
  });
}

async function emitEndRoom(c: CSocket): Promise<string> {
  return new Promise((resolve) => {
    c.emit('display:end_room', ({ newRoomCode }) => resolve(newRoomCode));
  });
}

async function emitPhoneJoin(
  c: CSocket,
  roomCode: string,
  sessionId?: string
): Promise<
  { ok: true; role: Role | null; sessionId: string } | { ok: false; error: string }
> {
  return new Promise((resolve) => {
    c.emit('phone:join', { roomCode, sessionId }, (res) => resolve(res));
  });
}

async function claimRole(c: CSocket, role: Role | null): Promise<void> {
  c.emit('phone:claim_role', { role });
  await sleep(50);
}

async function joinAndClaim(c: CSocket, roomCode: string, role: Role) {
  const res = await emitPhoneJoin(c, roomCode);
  expect(res.ok).toBe(true);
  await claimRole(c, role);
  return res;
}

describe('display:create_room', () => {
  it('creates a 4-letter room and stores the code on socket.data', async () => {
    const c = await connect();
    const code = await emitCreateRoom(c);
    expect(code).toMatch(/^[A-Z]{4}$/);
    expect(mgr.getRoom(code)).toBeDefined();

    const ssock = serverSocketFor(c);
    expect((ssock?.data as { displayRoomCode?: string }).displayRoomCode).toBe(code);
  });

  it('puts the socket in the display channel for the new room', async () => {
    const c = await connect();
    const code = await emitCreateRoom(c);
    expect(isInRoom(serverSocketFor(c), `room:${code}:display`)).toBe(true);
  });

  it('is idempotent for the same socket', async () => {
    const c = await connect();
    const a = await emitCreateRoom(c);
    const b = await emitCreateRoom(c);
    expect(a).toBe(b);
    // Server should still have only one room from this socket.
    expect(mgr.getRoom(a)).toBeDefined();
  });

  it('returns different codes for different sockets', async () => {
    const a = await connect();
    const b = await connect();
    const codeA = await emitCreateRoom(a);
    const codeB = await emitCreateRoom(b);
    expect(codeA).not.toBe(codeB);
  });
});

describe('display:join_room', () => {
  it('returns no_such_room for an unknown code', async () => {
    const c = await connect();
    const res = await emitJoinRoom(c, 'ZZZZ');
    expect(res.ok).toBe(false);
    expect(res.error).toBe('no_such_room');
  });

  it('joins the display channel and sets displayRoomCode (regression: end_room cleanup)', async () => {
    const a = await connect();
    const code = await emitCreateRoom(a);

    const b = await connect();
    const res = await emitJoinRoom(b, code);
    expect(res.ok).toBe(true);

    const ssock = serverSocketFor(b);
    expect(isInRoom(ssock, `room:${code}:display`)).toBe(true);
    // Critical: this was the bug. Without setting displayRoomCode here,
    // a later end_room from this socket couldn't find the old room.
    expect((ssock?.data as { displayRoomCode?: string }).displayRoomCode).toBe(code);
  });

  it('leaves the previous display channel when joining a different room', async () => {
    const a = await connect();
    const code1 = await emitCreateRoom(a);

    const b = await connect();
    const code2 = await emitCreateRoom(b);

    const c = await connect();
    await emitJoinRoom(c, code1);
    await emitJoinRoom(c, code2);

    const ssock = serverSocketFor(c);
    expect(isInRoom(ssock, `room:${code1}:display`)).toBe(false);
    expect(isInRoom(ssock, `room:${code2}:display`)).toBe(true);
    expect((ssock?.data as { displayRoomCode?: string }).displayRoomCode).toBe(code2);
  });
});

describe('phone:join', () => {
  it('returns no_such_room for an unknown code', async () => {
    const phone = await connect();
    const res = await emitPhoneJoin(phone, 'ZZZZ');
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toBe('no_such_room');
  });

  it('phones join unclaimed until they pick roles', async () => {
    const display = await connect();
    const code = await emitCreateRoom(display);

    const p1 = await connect();
    const p2 = await connect();
    const r1 = await emitPhoneJoin(p1, code);
    const r2 = await emitPhoneJoin(p2, code);

    expect(r1.ok).toBe(true);
    expect(r2.ok).toBe(true);
    if (r1.ok && r2.ok) {
      expect(r1.role).toBeNull();
      expect(r2.role).toBeNull();
      expect(r1.sessionId).not.toBe(r2.sessionId);
    }
  });

  it('allows exactly three phone joiners', async () => {
    const display = await connect();
    const code = await emitCreateRoom(display);

    const p1 = await connect();
    const p2 = await connect();
    const p3 = await connect();
    const p4 = await connect();
    await emitPhoneJoin(p1, code);
    await emitPhoneJoin(p2, code);
    const r3 = await emitPhoneJoin(p3, code);
    const r4 = await emitPhoneJoin(p4, code);

    expect(r3.ok).toBe(true);
    expect(r4.ok).toBe(false);
    if (!r4.ok) expect(r4.error).toBe('room_full');
  });

  it('resumes by sessionId even when both slots appear filled', async () => {
    const display = await connect();
    const code = await emitCreateRoom(display);

    const p1 = await connect();
    const r1 = await emitPhoneJoin(p1, code);
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;
    const sessionId1 = r1.sessionId;
    const role1 = r1.role;

    // Simulate p1 going away (server records connected=false but slot stays).
    p1.disconnect();
    await sleep(50);

    const p2 = await connect();
    await emitPhoneJoin(p2, code);
    const p3 = await connect();
    await emitPhoneJoin(p3, code);

    // p1 returns on a fresh socket using the same sessionId. Should resume the same role.
    const p1b = await connect();
    const r1b = await emitPhoneJoin(p1b, code, sessionId1);
    expect(r1b.ok).toBe(true);
    if (r1b.ok) expect(r1b.role).toBe(role1);
  });

  it('treats unknown sessionId as a fresh join in a half-empty room', async () => {
    const display = await connect();
    const code = await emitCreateRoom(display);

    const phone = await connect();
    const res = await emitPhoneJoin(phone, code, 'fake-uuid-not-in-room');
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.role).toBeNull();
      expect(res.sessionId).not.toBe('fake-uuid-not-in-room');
    }
  });

  it('puts the phone in the room phones channel and tracks playerId', async () => {
    const display = await connect();
    const code = await emitCreateRoom(display);

    const phone = await connect();
    await emitPhoneJoin(phone, code);

    const ssock = serverSocketFor(phone);
    expect(isInRoom(ssock, `room:${code}:phones`)).toBe(true);
    const sd = ssock?.data as { roomCode?: string; playerId?: string };
    expect(sd.roomCode).toBe(code);
    expect(sd.playerId).toBeTypeOf('string');
    expect(socketByPlayerId.has(sd.playerId!)).toBe(true);
  });

  it('prunes disconnected unclaimed players so a real phone can join', async () => {
    const display = await connect();
    const code = await emitCreateRoom(display);

    const p1 = await connect();
    const p2 = await connect();
    const p3 = await connect();
    await emitPhoneJoin(p1, code);
    await emitPhoneJoin(p2, code);
    await emitPhoneJoin(p3, code);
    p3.disconnect();
    await sleep(50);

    const p4 = await connect();
    const r4 = await emitPhoneJoin(p4, code);

    expect(r4.ok).toBe(true);
    expect(mgr.getRoom(code)?.players.size).toBe(3);
  });

  it('allows a disconnected claimed role to be claimed by a connected player', async () => {
    const display = await connect();
    const code = await emitCreateRoom(display);

    const p1 = await connect();
    await emitPhoneJoin(p1, code);
    await claimRole(p1, 'defense');
    p1.disconnect();
    await sleep(50);

    const p2 = await connect();
    await emitPhoneJoin(p2, code);
    await claimRole(p2, 'defense');

    const room = mgr.getRoom(code)!;
    const connectedDefense = [...room.players.values()].find((p) => p.connected && p.role === 'defense');
    expect(connectedDefense).toBeDefined();
  });
});

describe('role controls', () => {
  it('defense quadrant toggles exactly one shield quadrant at a time', async () => {
    const display = await connect();
    const code = await emitCreateRoom(display);
    const defense = await connect();
    await joinAndClaim(defense, code, 'defense');

    defense.emit('phone:quadrant', { index: 0 });
    await sleep(50);
    expect(mgr.getRoom(code)?.shieldQuadrant).toBe(0);

    defense.emit('phone:quadrant', { index: 2 });
    await sleep(50);
    expect(mgr.getRoom(code)?.shieldQuadrant).toBe(2);

    defense.emit('phone:quadrant', { index: 2 });
    await sleep(50);
    expect(mgr.getRoom(code)?.shieldQuadrant).toBeNull();
  });

  it('weapons selects an attack type, then fires by tapping a direction', async () => {
    const display = await connect();
    const code = await emitCreateRoom(display);
    const defense = await connect();
    const repair = await connect();
    const weapons = await connect();
    await joinAndClaim(defense, code, 'defense');
    await joinAndClaim(repair, code, 'repair');
    await joinAndClaim(weapons, code, 'weapons');
    const room = mgr.getRoom(code)!;
    room.phase = 'playing';

    weapons.emit('phone:select_attack', { kind: 'rotary' });
    await sleep(50);
    expect([...room.players.values()].find((p) => p.role === 'weapons')?.selectedAttackKind).toBe('rotary');

    weapons.emit('phone:quadrant', { index: 1 });
    await sleep(50);

    expect(room.attackQuadrant).toBe(1);
    expect(room.attacks.at(-1)?.kind).toBe('rotary');
    expect(room.attacks.at(-1)?.quadrant).toBe(1);
  });
});

describe('client:request_start', () => {
  it('honored when room has 3 connected players with claimed roles in lobby', async () => {
    const display = await connect();
    const code = await emitCreateRoom(display);

    const p1 = await connect();
    const p2 = await connect();
    const p3 = await connect();
    await joinAndClaim(p1, code, 'defense');
    await joinAndClaim(p2, code, 'repair');
    await joinAndClaim(p3, code, 'weapons');

    p1.emit('client:request_start');
    await sleep(50);

    const room = mgr.getRoom(code);
    expect(room?.phase).toBe('countdown');
  });

  it('ignored with only 1 player', async () => {
    const display = await connect();
    const code = await emitCreateRoom(display);

    const p1 = await connect();
    await emitPhoneJoin(p1, code);

    p1.emit('client:request_start');
    await sleep(50);

    expect(mgr.getRoom(code)?.phase).toBe('lobby');
  });

  it('honored when triggered from the display side too', async () => {
    const display = await connect();
    const code = await emitCreateRoom(display);

    const p1 = await connect();
    const p2 = await connect();
    const p3 = await connect();
    await joinAndClaim(p1, code, 'defense');
    await joinAndClaim(p2, code, 'repair');
    await joinAndClaim(p3, code, 'weapons');

    display.emit('client:request_start');
    await sleep(50);

    expect(mgr.getRoom(code)?.phase).toBe('countdown');
  });

  it('ignored without a room context', async () => {
    const orphan = await connect();
    orphan.emit('client:request_start');
    await sleep(50);
    // Nothing to assert beyond "no crash" — server has no room for this socket.
    expect(true).toBe(true);
  });
});

describe('display:end_room', () => {
  it('destroys the old room and creates a new one', async () => {
    const display = await connect();
    const oldCode = await emitCreateRoom(display);
    expect(mgr.getRoom(oldCode)).toBeDefined();

    const newCode = await emitEndRoom(display);
    expect(newCode).not.toBe(oldCode);
    expect(mgr.getRoom(oldCode)).toBeUndefined();
    expect(mgr.getRoom(newCode)).toBeDefined();
  });

  it('after end_room the socket is only in the NEW display channel (regression: flicker)', async () => {
    const display = await connect();
    const oldCode = await emitCreateRoom(display);
    const newCode = await emitEndRoom(display);

    const ssock = serverSocketFor(display);
    expect(isInRoom(ssock, `room:${oldCode}:display`)).toBe(false);
    expect(isInRoom(ssock, `room:${newCode}:display`)).toBe(true);
    expect((ssock?.data as { displayRoomCode?: string }).displayRoomCode).toBe(newCode);
  });

  it('also works when display first resumed via display:join_room (regression for the actual bug)', async () => {
    // Simulate the F5-resume path: a fresh display socket joins a stored room
    // via display:join_room, then later the user clicks × end game.
    const seed = await connect();
    const code = await emitCreateRoom(seed);

    const display = await connect();
    const res = await emitJoinRoom(display, code);
    expect(res.ok).toBe(true);

    const newCode = await emitEndRoom(display);
    expect(newCode).not.toBe(code);
    expect(mgr.getRoom(code)).toBeUndefined();

    const ssock = serverSocketFor(display);
    expect(isInRoom(ssock, `room:${code}:display`)).toBe(false);
    expect(isInRoom(ssock, `room:${newCode}:display`)).toBe(true);
  });

  it('emits room:ended to all phones in the old room', async () => {
    const display = await connect();
    const code = await emitCreateRoom(display);

    const p1 = await connect();
    const p2 = await connect();
    const p3 = await connect();
    await emitPhoneJoin(p1, code);
    await emitPhoneJoin(p2, code);
    await emitPhoneJoin(p3, code);

    const ended1 = new Promise<void>((resolve) => p1.once('room:ended', () => resolve()));
    const ended2 = new Promise<void>((resolve) => p2.once('room:ended', () => resolve()));

    await emitEndRoom(display);

    await Promise.race([
      Promise.all([ended1, ended2]),
      sleep(500).then(() => Promise.reject(new Error('room:ended not received'))),
    ]);
  });

  it('clears phone player records, socketByPlayerId, and phones channel for the old room', async () => {
    const display = await connect();
    const code = await emitCreateRoom(display);

    const p1 = await connect();
    await emitPhoneJoin(p1, code);
    const phoneSSock = serverSocketFor(p1);
    const playerId = (phoneSSock?.data as { playerId?: string }).playerId!;
    expect(socketByPlayerId.has(playerId)).toBe(true);

    await emitEndRoom(display);

    expect(socketByPlayerId.has(playerId)).toBe(false);
    const sd = phoneSSock?.data as { roomCode?: string; playerId?: string };
    expect(sd.roomCode).toBeUndefined();
    expect(sd.playerId).toBeUndefined();
    expect(isInRoom(phoneSSock, `room:${code}:phones`)).toBe(false);
  });
});

describe('disconnect cleanup', () => {
  it('phone disconnect marks the player as disconnected but keeps the slot reserved', async () => {
    const display = await connect();
    const code = await emitCreateRoom(display);

    const phone = await connect();
    const res = await emitPhoneJoin(phone, code);
    expect(res.ok).toBe(true);

    phone.disconnect();
    await sleep(50);

    const room = mgr.getRoom(code);
    expect(room).toBeDefined();
    expect(room!.players.size).toBe(1); // slot still there
    const player = [...(room?.players.values() ?? [])][0];
    expect(player?.connected).toBe(false);
  });

  it('display disconnect leaves the room intact so F5 can resume it', async () => {
    const display = await connect();
    const code = await emitCreateRoom(display);
    expect(mgr.getRoom(code)).toBeDefined();

    display.disconnect();
    await sleep(50);

    // Room must persist for display:join_room to find it on F5.
    expect(mgr.getRoom(code)).toBeDefined();
  });

  it('a fresh display socket can resume the same room after the previous display disconnects (F5 flow)', async () => {
    const display1 = await connect();
    const code = await emitCreateRoom(display1);

    display1.disconnect();
    await sleep(50);

    const display2 = await connect();
    const res = await emitJoinRoom(display2, code);
    expect(res.ok).toBe(true);
    expect((serverSocketFor(display2)?.data as { displayRoomCode?: string }).displayRoomCode).toBe(code);
  });

  it('phone players keep their connected=true state when the display refreshes', async () => {
    const display1 = await connect();
    const code = await emitCreateRoom(display1);

    const p1 = await connect();
    const p2 = await connect();
    const p3 = await connect();
    await joinAndClaim(p1, code, 'defense');
    await joinAndClaim(p2, code, 'repair');
    await joinAndClaim(p3, code, 'weapons');

    // Display refresh: old socket goes away, fresh socket resumes via join_room.
    display1.disconnect();
    await sleep(50);
    const display2 = await connect();
    await emitJoinRoom(display2, code);

    const room = mgr.getRoom(code);
    expect(room).toBeDefined();
    const players = [...(room?.players.values() ?? [])];
    expect(players.length).toBe(3);
    expect(players.every((p) => p.connected)).toBe(true);

    // request_start must be honored — this is the bug the user just reported.
    display2.emit('client:request_start');
    await sleep(50);
    expect(mgr.getRoom(code)?.phase).toBe('countdown');
  });
});

describe('phone:input safety', () => {
  it('ignores input from a socket with no room context', async () => {
    const orphan = await connect();
    orphan.emit('phone:input', { dx: 1, dy: 0 });
    await sleep(20);
    // No room exists yet, no crash, no state mutation.
    expect(true).toBe(true);
  });

  it('updates lastInput on the player record', async () => {
    const display = await connect();
    const code = await emitCreateRoom(display);

    const phone = await connect();
    const res = await emitPhoneJoin(phone, code);
    expect(res.ok).toBe(true);
    await claimRole(phone, 'defense');

    phone.emit('phone:input', { dx: 0.7, dy: 0 });
    await sleep(50);

    const room = mgr.getRoom(code);
    const player = [...(room?.players.values() ?? [])][0];
    expect(player?.lastInput.x).toBeCloseTo(0.7, 5);
    expect(player?.lastInput.y).toBe(0);
  });

  it('clamps input magnitude to 1', async () => {
    const display = await connect();
    const code = await emitCreateRoom(display);
    const phone = await connect();
    await emitPhoneJoin(phone, code);
    await claimRole(phone, 'defense');

    phone.emit('phone:input', { dx: 3, dy: 4 }); // magnitude 5
    await sleep(50);

    const player = [...(mgr.getRoom(code)!.players.values())][0];
    const m = Math.hypot(player.lastInput.x, player.lastInput.y);
    expect(m).toBeCloseTo(1, 5);
  });
});

describe('client:restart_room', () => {
  it('resets the room in place and returns the same code', async () => {
    const display = await connect();
    const code = await emitCreateRoom(display);

    const p1 = await connect();
    const p2 = await connect();
    const p3 = await connect();
    await joinAndClaim(p1, code, 'defense');
    await joinAndClaim(p2, code, 'repair');
    await joinAndClaim(p3, code, 'weapons');

    const room = mgr.getRoom(code)!;
    room.phase = 'gameover';
    room.quadrantHp = { 0: 0, 1: 15, 2: 30, 3: 45 };

    const res = await new Promise<{ ok: boolean; newRoomCode?: string }>((resolve) => {
      display.emit('client:restart_room', (r) => resolve(r));
    });

    expect(res.ok).toBe(true);
    expect(res.newRoomCode).toBe(code); // same code
    expect(room.phase).toBe('lobby');
    expect(room.quadrantHp).toEqual({ 0: 100, 1: 100, 2: 100, 3: 100 });
  });

  it('resets player state (mode, inventory, etc)', async () => {
    const display = await connect();
    const code = await emitCreateRoom(display);

    const p1 = await connect();
    await joinAndClaim(p1, code, 'defense');

    const room = mgr.getRoom(code)!;
    const player = [...room.players.values()][0]!;
    player.mode = 'on_foot';
    player.inventory = ['red', 'blue'];
    player.selectedCores = [0, 1];

    await new Promise<void>((resolve) => {
      display.emit('client:restart_room', () => resolve());
    });

    expect(player.mode).toBe('in_robot');
    expect(player.inventory).toEqual([]);
    expect(player.selectedCores).toEqual([]);
  });

  it('returns error when room does not exist', async () => {
    const orphan = await connect();
    const res = await new Promise<{ ok: boolean; error?: string }>((resolve) => {
      orphan.emit('client:restart_room', (r) => resolve(r));
    });
    expect(res.ok).toBe(false);
  });
});

describe('phone:leave', () => {
  it('removes the player from the room', async () => {
    const display = await connect();
    const code = await emitCreateRoom(display);

    const phone = await connect();
    const joinRes = await emitPhoneJoin(phone, code);
    expect(joinRes.ok).toBe(true);
    expect(mgr.getRoom(code)!.players.size).toBe(1);

    const leaveRes = await new Promise<{ ok: boolean }>((resolve) => {
      phone.emit('phone:leave', (r) => resolve(r));
    });
    expect(leaveRes.ok).toBe(true);
    expect(mgr.getRoom(code)!.players.size).toBe(0);
  });

  it('reverts countdown to lobby when a player leaves', async () => {
    const display = await connect();
    const code = await emitCreateRoom(display);

    const p1 = await connect();
    const p2 = await connect();
    const p3 = await connect();
    await joinAndClaim(p1, code, 'defense');
    await joinAndClaim(p2, code, 'repair');
    await joinAndClaim(p3, code, 'weapons');

    p1.emit('client:request_start');
    await sleep(50);
    expect(mgr.getRoom(code)!.phase).toBe('countdown');

    await new Promise<void>((resolve) => {
      p3.emit('phone:leave', () => resolve());
    });
    expect(mgr.getRoom(code)!.phase).toBe('lobby');
  });
});

describe('phone:select', () => {
  it('defense can toggle core selection', async () => {
    const display = await connect();
    const code = await emitCreateRoom(display);
    const defense = await connect();
    await joinAndClaim(defense, code, 'defense');

    // Give inventory to the player
    const room = mgr.getRoom(code)!;
    const player = [...room.players.values()].find((p) => p.role === 'defense')!;
    player.inventory = ['red', 'blue', 'green', 'yellow'];

    defense.emit('phone:select', { index: 0, on: true });
    await sleep(50);
    expect(player.selectedCores).toContain(0);

    defense.emit('phone:select', { index: 2, on: true });
    await sleep(50);
    expect(player.selectedCores).toEqual([0, 2]);

    // deselect
    defense.emit('phone:select', { index: 0, on: false });
    await sleep(50);
    expect(player.selectedCores).toEqual([2]);
  });

  it('capped at 2 selected cores', async () => {
    const display = await connect();
    const code = await emitCreateRoom(display);
    const defense = await connect();
    await joinAndClaim(defense, code, 'defense');

    const room = mgr.getRoom(code)!;
    const player = [...room.players.values()].find((p) => p.role === 'defense')!;
    player.inventory = ['red', 'blue', 'green', 'yellow'];

    defense.emit('phone:select', { index: 0, on: true });
    defense.emit('phone:select', { index: 1, on: true });
    defense.emit('phone:select', { index: 2, on: true }); // should be ignored
    await sleep(100);
    expect(player.selectedCores.length).toBe(2);
  });

  it('ignores select when player is on foot', async () => {
    const display = await connect();
    const code = await emitCreateRoom(display);
    const defense = await connect();
    await joinAndClaim(defense, code, 'defense');

    const room = mgr.getRoom(code)!;
    const player = [...room.players.values()].find((p) => p.role === 'defense')!;
    player.inventory = ['red', 'blue'];
    player.mode = 'on_foot';

    defense.emit('phone:select', { index: 0, on: true });
    await sleep(50);
    expect(player.selectedCores).toEqual([]);
  });
});

describe('phone:fire', () => {
  it('fires an attack when playing with a quadrant selected', async () => {
    const display = await connect();
    const code = await emitCreateRoom(display);
    const defense = await connect();
    const repair = await connect();
    const weapons = await connect();
    await joinAndClaim(defense, code, 'defense');
    await joinAndClaim(repair, code, 'repair');
    await joinAndClaim(weapons, code, 'weapons');

    const room = mgr.getRoom(code)!;
    room.phase = 'playing';

    const weaponsPlayer = [...room.players.values()].find((p) => p.role === 'weapons')!;
    weaponsPlayer.quadrant = 2;

    weapons.emit('phone:fire', { kind: 'melee' });
    await sleep(50);
    expect(room.attacks.length).toBeGreaterThanOrEqual(1);
    expect(room.attacks.at(-1)?.kind).toBe('melee');
  });

  it('ignores fire when not in playing phase', async () => {
    const display = await connect();
    const code = await emitCreateRoom(display);
    const weapons = await connect();
    await joinAndClaim(weapons, code, 'weapons');

    const room = mgr.getRoom(code)!;
    room.phase = 'lobby';

    weapons.emit('phone:fire', { kind: 'melee' });
    await sleep(50);
    expect(room.attacks.length).toBe(0);
  });

  it('ignores fire when no quadrant is selected', async () => {
    const display = await connect();
    const code = await emitCreateRoom(display);
    const defense = await connect();
    const repair = await connect();
    const weapons = await connect();
    await joinAndClaim(defense, code, 'defense');
    await joinAndClaim(repair, code, 'repair');
    await joinAndClaim(weapons, code, 'weapons');

    const room = mgr.getRoom(code)!;
    room.phase = 'playing';
    // quadrant is null by default

    weapons.emit('phone:fire', { kind: 'melee' });
    await sleep(50);
    expect(room.attacks.length).toBe(0);
  });
});

