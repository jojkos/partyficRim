import type { Server, Socket } from 'socket.io';
import type {
  CoreType,
  ClientToServerEvents,
  ServerToClientEvents,
  Role,
  Quadrant,
} from '@partyficrim/shared';
import type { RoomManager, Room } from '../game/rooms.js';
import { playerForRole, pushFeed, roleClaims } from '../game/rooms.js';
import { requestStart } from '../game/tick.js';
import { fireAttack, repairQuadrant } from '../game/attacks.js';
import { offeredCores } from '../game/cores.js';
import { log } from '../log.js';
import { randomUUID } from 'node:crypto';

type IO = Server<ClientToServerEvents, ServerToClientEvents>;
type S = Socket<ClientToServerEvents, ServerToClientEvents>;

export const socketByPlayerId = new Map<string, S>();

function roleIsClaimed(room: Room, role: Role, exceptPlayerId?: string): boolean {
  for (const p of room.players.values()) {
    if (p.id !== exceptPlayerId && p.connected && p.role === role) return true;
  }
  return false;
}

function pruneDisconnectedUnclaimed(room: Room): void {
  for (const [id, p] of room.players) {
    if (!p.connected && p.role === null) {
      room.players.delete(id);
      socketByPlayerId.delete(id);
    }
  }
}

function removeDisconnectedPlayer(room: Room, playerId: string): void {
  const p = room.players.get(playerId);
  if (!p || p.connected) return;
  const oldRole = p.role;
  room.players.delete(playerId);
  socketByPlayerId.delete(playerId);
  if (oldRole === 'defense') room.shieldQuadrant = null;
  if (oldRole === 'weapons') room.attackQuadrant = null;
}

function pruneDisconnectedPlayerForFreshJoin(room: Room): boolean {
  pruneDisconnectedUnclaimed(room);
  if (room.players.size < 3) return true;
  if (room.phase !== 'lobby') return false;

  for (const [id, p] of room.players) {
    if (!p.connected) {
      removeDisconnectedPlayer(room, id);
      return true;
    }
  }
  return false;
}

function cleanWeaponCoreSelection(room: Room): void {
  const available = new Set(offeredCores(room));
  const weapons = playerForRole(room, 'weapons');
  if (!weapons) return;
  weapons.weaponSelectedCores = weapons.weaponSelectedCores.filter((type) => available.has(type));
}

function bindPhoneSocket(socket: S, room: Room, playerId: string): void {
  const previous = socketByPlayerId.get(playerId);
  if (previous && previous.id !== socket.id) {
    previous.leave(`room:${room.code}:phones`);
    previous.data = {};
  }
  socket.data = { ...(socket.data ?? {}), roomCode: room.code, playerId };
  socket.join(`room:${room.code}:phones`);
  socketByPlayerId.set(playerId, socket);
}

function removePhoneFromRoom(socket: S, mgr: RoomManager): boolean {
  const data = socket.data as { roomCode?: string; playerId?: string } | undefined;
  if (!data?.roomCode || !data?.playerId) return false;
  const room = mgr.getRoom(data.roomCode);
  const p = room?.players.get(data.playerId);
  if (room && p) {
    const oldRole = p.role;
    room.players.delete(data.playerId);
    if (oldRole === 'defense') room.shieldQuadrant = null;
    if (oldRole === 'weapons') room.attackQuadrant = null;
    if (room.phase === 'countdown') {
      room.phase = 'lobby';
      room.countdownMsRemaining = 0;
    } else if (room.phase === 'playing') {
      room.phase = 'paused';
    }
    cleanWeaponCoreSelection(room);
    pushFeed(room, { ts: Date.now(), role: oldRole, kind: 'role', detail: 'left room' });
  }
  socketByPlayerId.delete(data.playerId);
  socket.leave(`room:${data.roomCode}:phones`);
  socket.data = {};
  return true;
}

function restartRoom(io: IO, mgr: RoomManager, oldCode: string): { ok: boolean; newRoomCode?: string; error?: string } {
  const oldRoom = mgr.getRoom(oldCode);
  if (!oldRoom) return { ok: false, error: 'no_such_room' };

  const room = mgr.createRoom();
  io.to(`room:${oldCode}:phones`).emit('room:ended');
  io.to(`room:${oldCode}:display`).emit('display:room_restarted', { newRoomCode: room.code });
  for (const [pid, s] of socketByPlayerId) {
    const sd = s.data as { roomCode?: string } | undefined;
    if (sd?.roomCode === oldCode) {
      socketByPlayerId.delete(pid);
      s.data = {};
      s.leave(`room:${oldCode}:phones`);
    }
  }
  mgr.removeRoom(oldCode);
  log('room', `${oldCode} restarted -> ${room.code}`);
  return { ok: true, newRoomCode: room.code };
}

function resetRoomInPlace(room: Room): void {
  room.phase = 'lobby';
  room.countdownMsRemaining = 0;
  room.robot = { x: 400, y: 300 };
  room.cores.clear();
  room.enemies.clear();
  room.bombs = [];
  room.attacks = [];
  room.quadrantHp = { 0: 100, 1: 100, 2: 100, 3: 100 };
  room.shieldQuadrant = null;
  room.attackQuadrant = null;
  room.lastCoreSpawnAt = 0;
  room.lastEnemySpawnAt = 0;
  room.lastEnemyContactDamageAt = 0;
  room.eventFeed = [];
  for (const p of room.players.values()) {
    p.mode = 'in_robot';
    p.pos = { x: room.robot.x, y: room.robot.y };
    p.lastInput = { x: 0, y: 0 };
    p.lastButtonAt = 0;
    p.inventory = [];
    p.selectedCores = [];
    p.weaponSelectedCores = [];
    p.selectedAttackKind = null;
    p.quadrant = null;
  }
}

export function registerHandlers(io: IO, mgr: RoomManager) {
  io.on('connection', (socket: S) => {
    log('net', `connect ${socket.id}`);

    socket.on('display:create_room', (cb) => {
      const existing = (socket.data as { displayRoomCode?: string } | undefined)?.displayRoomCode;
      if (existing && mgr.getRoom(existing)) {
        log('room', `${existing} create_room idempotent (socket=${socket.id})`);
        cb({ roomCode: existing });
        return;
      }
      const room = mgr.createRoom();
      socket.join(`room:${room.code}:display`);
      socket.data = { ...(socket.data ?? {}), displayRoomCode: room.code };
      log('room', `${room.code} created (socket=${socket.id})`);
      cb({ roomCode: room.code });
    });

    socket.on('display:end_room', (cb) => {
      const data = socket.data as { displayRoomCode?: string } | undefined;
      const oldCode = data?.displayRoomCode;

      if (oldCode) {
        const oldRoom = mgr.getRoom(oldCode);
        if (oldRoom) {
          io.to(`room:${oldCode}:phones`).emit('room:ended');
          for (const [pid, s] of socketByPlayerId) {
            const sd = s.data as { roomCode?: string } | undefined;
            if (sd?.roomCode === oldCode) {
              socketByPlayerId.delete(pid);
              s.data = {};
              s.leave(`room:${oldCode}:phones`);
            }
          }
          mgr.removeRoom(oldCode);
        }
        socket.leave(`room:${oldCode}:display`);
        log('room', `${oldCode} ended by display`);
      }

      const room = mgr.createRoom();
      socket.join(`room:${room.code}:display`);
      socket.data = { ...(socket.data ?? {}), displayRoomCode: room.code };
      log('room', `${room.code} created (replacement for ${oldCode ?? 'none'})`);
      cb({ newRoomCode: room.code });
    });

    socket.on('client:restart_room', (cb) => {
      const data = socket.data as { roomCode?: string; displayRoomCode?: string } | undefined;
      const code = data?.roomCode ?? data?.displayRoomCode;
      if (!code) return cb?.({ ok: false, error: 'no_room' });
      const room = mgr.getRoom(code);
      if (!room) return cb?.({ ok: false, error: 'no_such_room' });
      resetRoomInPlace(room);
      cb?.({ ok: true, newRoomCode: code });
    });

    socket.on('display:join_room', ({ roomCode }, cb) => {
      const room = mgr.getRoom(roomCode);
      if (!room) {
        log('room', `${roomCode} display join refused: no_such_room`);
        return cb({ ok: false, error: 'no_such_room' });
      }

      // Leave any previous display channel + remember the new code so end_room
      // can find and tear down THIS room later.
      const prev = (socket.data as { displayRoomCode?: string } | undefined)?.displayRoomCode;
      if (prev && prev !== room.code) {
        socket.leave(`room:${prev}:display`);
        log('room', `${prev} display channel left during join_room`);
      }

      socket.join(`room:${room.code}:display`);
      socket.data = { ...(socket.data ?? {}), displayRoomCode: room.code };
      log('room', `${roomCode} display joined`);
      cb({ ok: true });
    });

    socket.on('phone:join', ({ roomCode, sessionId }, cb) => {
      const room = mgr.getRoom(roomCode);
      if (!room) {
        log('room', `${roomCode} phone join refused: no_such_room (socket=${socket.id})`);
        return cb({ ok: false, error: 'no_such_room' });
      }

      const existingData = socket.data as { roomCode?: string; playerId?: string } | undefined;
      if (existingData?.roomCode && existingData.playerId) {
        if (existingData.roomCode === room.code) {
          const existingPlayer = room.players.get(existingData.playerId);
          if (existingPlayer) {
            existingPlayer.connected = true;
            bindPhoneSocket(socket, room, existingPlayer.id);
            log('room', `${roomCode} phone join idempotent role=${existingPlayer.role} (socket=${socket.id})`);
            return cb({ ok: true, role: existingPlayer.role, sessionId: existingPlayer.sessionId });
          }
          socket.leave(`room:${room.code}:phones`);
          socket.data = {};
        } else {
          removePhoneFromRoom(socket, mgr);
        }
      }

      pruneDisconnectedUnclaimed(room);

      if (sessionId) {
        for (const p of room.players.values()) {
          if (p.sessionId === sessionId) {
            p.connected = true;
            bindPhoneSocket(socket, room, p.id);
            log('room', `${roomCode} phone resume role=${p.role} (socket=${socket.id})`);
            return cb({ ok: true, role: p.role, sessionId });
          }
        }
      }

      if (!pruneDisconnectedPlayerForFreshJoin(room)) {
        log('room', `${roomCode} phone join refused: room_full (socket=${socket.id})`);
        return cb({ ok: false, error: 'room_full' });
      }

      const newSessionId = randomUUID();
      const id = randomUUID();
      room.players.set(id, {
        id,
        sessionId: newSessionId,
        role: null,
        mode: 'in_robot',
        pos: { x: room.robot.x, y: room.robot.y },
        connected: true,
        lastInput: { x: 0, y: 0 },
        lastButtonAt: 0,
        inventory: [],
        selectedCores: [],
        weaponSelectedCores: [],
        selectedAttackKind: null,
        quadrant: null,
      });
      bindPhoneSocket(socket, room, id);
      log('room', `${roomCode} phone joined unclaimed (count=${room.players.size}) (socket=${socket.id})`);
      cb({ ok: true, role: null, sessionId: newSessionId });
    });

    socket.on('phone:leave', (cb) => {
      const ok = removePhoneFromRoom(socket, mgr);
      cb?.({ ok });
    });

    socket.on('phone:claim_role', ({ role }, cb) => {
      const data = socket.data as { roomCode?: string; playerId?: string } | undefined;
      if (!data?.roomCode || !data?.playerId) return cb?.({ ok: false, role: null, error: 'not_joined' });
      const room = mgr.getRoom(data.roomCode);
      const p = room?.players.get(data.playerId);
      if (!p || !room) return cb?.({ ok: false, role: null, error: 'not_joined' });
      if (room.phase !== 'lobby') return cb?.({ ok: false, role: p.role, error: 'not_lobby' });

      if (role === null) {
        pushFeed(room, { ts: Date.now(), role: p.role, kind: 'role', detail: 'released role' });
        p.role = null;
        p.inventory = [];
        p.selectedCores = [];
        p.weaponSelectedCores = [];
        p.selectedAttackKind = null;
        p.quadrant = null;
        cleanWeaponCoreSelection(room);
        return cb?.({ ok: true, role: null });
      }
      if (!['defense', 'repair', 'weapons'].includes(role)) return cb?.({ ok: false, role: p.role, error: 'bad_role' });
      if (roleIsClaimed(room, role, p.id)) return cb?.({ ok: false, role: p.role, error: 'claimed' });
      for (const other of [...room.players.values()]) {
        if (other.id !== p.id && other.role === role && !other.connected) {
          removeDisconnectedPlayer(room, other.id);
        }
      }

      pushFeed(room, { ts: Date.now(), role, kind: 'role', detail: `claimed ${role}` });
      p.role = role;
      p.mode = 'in_robot';
      p.pos = { x: room.robot.x, y: room.robot.y };
      p.inventory = role === 'weapons' ? [] : p.inventory;
      p.selectedCores = role === 'weapons' ? [] : p.selectedCores.slice(0, 2);
      p.weaponSelectedCores = role === 'weapons' ? p.weaponSelectedCores : [];
      p.selectedAttackKind = role === 'weapons' ? p.selectedAttackKind : null;
      p.quadrant = null;
      log('room', `${data.roomCode} role claimed ${role} claims=${JSON.stringify(roleClaims(room))}`);
      cb?.({ ok: true, role });
    });

    socket.on('phone:input', ({ dx, dy }) => {
      const data = socket.data as { roomCode?: string; playerId?: string } | undefined;
      if (!data?.roomCode || !data?.playerId) return;
      const room = mgr.getRoom(data.roomCode);
      const p = room?.players.get(data.playerId);
      if (!p || !p.role) return;
      if (p.role === 'weapons' && p.mode === 'in_robot') {
        p.lastInput = { x: 0, y: 0 };
        return;
      }
      const mag = Math.hypot(dx, dy);
      p.lastInput = mag > 1 ? { x: dx / mag, y: dy / mag } : { x: dx, y: dy };
    });

    socket.on('client:request_start', () => {
      const data = socket.data as { roomCode?: string; displayRoomCode?: string } | undefined;
      const code = data?.roomCode ?? data?.displayRoomCode;
      if (!code) {
        log('phase', `request_start ignored: no room context (socket=${socket.id})`);
        return;
      }
      const room = mgr.getRoom(code);
      if (!room) {
        log('phase', `${code} request_start ignored: no such room`);
        return;
      }
      const before = room.phase;
      requestStart(room);
      if (room.phase !== before) {
        log('phase', `${code} START honored: ${before} -> ${room.phase}`);
      } else {
        log('phase', `${code} START ignored (phase=${room.phase}, players=${room.players.size})`);
      }
    });

    socket.on('phone:button', () => {
      const data = socket.data as { roomCode?: string; playerId?: string } | undefined;
      if (!data?.roomCode || !data?.playerId) return;
      const room = mgr.getRoom(data.roomCode);
      const p = room?.players.get(data.playerId);
      if (!p || !room) return;
      p.lastButtonAt = Date.now();
      if (!p.role) return;
      pushFeed(room, { ts: Date.now(), role: p.role, kind: 'action', detail: p.mode === 'in_robot' ? 'EXIT' : 'ENTER' });
      log('action', `${data.roomCode} button player=${p.role} mode=${p.mode}`);
    });

    socket.on('phone:select', ({ index, on }) => {
      const data = socket.data as { roomCode?: string; playerId?: string } | undefined;
      if (!data?.roomCode || !data?.playerId) return;
      const room = mgr.getRoom(data.roomCode);
      const p = room?.players.get(data.playerId);
      if (!p || !room || !p.role) return;
      if (index < 0 || index > 3) return;
      if (p.mode === 'on_foot') return; // robot controls are inert while on foot
      if (p.role === 'defense' || p.role === 'repair') {
        if (!p.inventory[index]) return;
        if (on) {
          if (!p.selectedCores.includes(index) && p.selectedCores.length < 2) p.selectedCores.push(index);
        } else {
          p.selectedCores = p.selectedCores.filter((i) => i !== index);
        }
        cleanWeaponCoreSelection(room);
        pushFeed(room, { ts: Date.now(), role: p.role, kind: 'select', detail: `CORE ${index + 1} ${on ? 'OFFER' : 'OFF'}` });
        return;
      }
      if (p.role === 'weapons') {
        const type = offeredCores(room)[index];
        if (!type) return;
        if (on) {
          if (!p.weaponSelectedCores.includes(type)) p.weaponSelectedCores.push(type);
        } else {
          p.weaponSelectedCores = p.weaponSelectedCores.filter((core) => core !== type);
        }
        pushFeed(room, { ts: Date.now(), role: p.role, kind: 'select', detail: `${type.toUpperCase()} ${on ? 'ARMED' : 'OFF'}` });
      }
    });

    socket.on('phone:quadrant', ({ index }) => {
      const data = socket.data as { roomCode?: string; playerId?: string } | undefined;
      if (!data?.roomCode || !data?.playerId) return;
      const room = mgr.getRoom(data.roomCode);
      const p = room?.players.get(data.playerId);
      if (!p || !room || !p.role) return;
      if (index < 0 || index > 3) return;
      if (p.mode === 'on_foot') return; // robot controls are inert while on foot
      const q = index as Quadrant;
      if (p.role === 'repair') {
        repairQuadrant(room, q);
        pushFeed(room, { ts: Date.now(), role: p.role, kind: 'repair', detail: `+5 ${['NW', 'NE', 'SW', 'SE'][index]}` });
        return;
      }
      if (p.role === 'defense') {
        p.quadrant = p.quadrant === q ? null : q;
        room.shieldQuadrant = p.quadrant;
        const labels = ['NW', 'NE', 'SW', 'SE'];
        pushFeed(room, { ts: Date.now(), role: p.role, kind: 'quadrant', detail: p.quadrant === null ? 'SHIELD OFF' : `SHIELD ${labels[index]}` });
        log('action', `${data.roomCode} shield player=${p.role} -> ${p.quadrant}`);
        return;
      }
      if (p.role === 'weapons') {
        p.quadrant = q;
        room.attackQuadrant = q;
        if (room.phase === 'playing' && p.selectedAttackKind) {
          const available = new Set<CoreType>(offeredCores(room));
          const selected = p.weaponSelectedCores.filter((type) => available.has(type));
          fireAttack(room, p.selectedAttackKind, q, selected);
          pushFeed(room, { ts: Date.now(), role: p.role, kind: 'fire', detail: `${p.selectedAttackKind.toUpperCase()} ${['NW', 'NE', 'SW', 'SE'][index]}` });
        }
        return;
      }
    });

    socket.on('phone:select_attack', ({ kind }) => {
      const data = socket.data as { roomCode?: string; playerId?: string } | undefined;
      if (!data?.roomCode || !data?.playerId) return;
      const room = mgr.getRoom(data.roomCode);
      const p = room?.players.get(data.playerId);
      if (!p || !room || p.role !== 'weapons') return;
      if (kind !== null && !['melee', 'rotary', 'laser', 'bomb'].includes(kind)) return;
      p.selectedAttackKind = p.selectedAttackKind === kind ? null : kind;
      pushFeed(room, { ts: Date.now(), role: p.role, kind: 'select', detail: p.selectedAttackKind ? `${p.selectedAttackKind.toUpperCase()} ARMED` : 'ATTACK OFF' });
    });

    socket.on('phone:repair', ({ quadrant }) => {
      const data = socket.data as { roomCode?: string; playerId?: string } | undefined;
      if (!data?.roomCode || !data?.playerId) return;
      const room = mgr.getRoom(data.roomCode);
      const p = room?.players.get(data.playerId);
      if (!p || !room || p.role !== 'repair' || p.mode === 'on_foot') return;
      if (quadrant < 0 || quadrant > 3) return;
      repairQuadrant(room, quadrant as Quadrant);
      pushFeed(room, { ts: Date.now(), role: p.role, kind: 'repair', detail: `+5 ${['NW', 'NE', 'SW', 'SE'][quadrant]}` });
    });

    socket.on('phone:fire', ({ kind }) => {
      const data = socket.data as { roomCode?: string; playerId?: string } | undefined;
      if (!data?.roomCode || !data?.playerId) return;
      const room = mgr.getRoom(data.roomCode);
      const p = room?.players.get(data.playerId);
      if (!p || !room || p.role !== 'weapons' || p.mode === 'on_foot') return;
      if (room.phase !== 'playing') return;
      if (!['melee', 'rotary', 'laser', 'bomb'].includes(kind)) return;
      if (p.quadrant === null) return;
      const available = new Set<CoreType>(offeredCores(room));
      const selected = p.weaponSelectedCores.filter((type) => available.has(type));
      fireAttack(room, kind, p.quadrant, selected);
      pushFeed(room, { ts: Date.now(), role: p.role, kind: 'fire', detail: kind.toUpperCase() });
    });

    socket.on('disconnect', () => {
      const data = socket.data as { roomCode?: string; playerId?: string; displayRoomCode?: string } | undefined;
      log('net', `disconnect ${socket.id}${data?.playerId ? ` player=${data.playerId.slice(0, 8)}` : ''}${data?.displayRoomCode ? ` display-of=${data.displayRoomCode}` : ''}`);

      // Rooms persist across display disconnects so F5 / reconnect can resume
      // them via display:join_room. Use the × end game button or the
      // /display?new=1 path to explicitly destroy a room.

      if (data?.playerId) {
        const current = socketByPlayerId.get(data.playerId);
        if (current && current.id !== socket.id) {
          log('room', `${data.roomCode} stale disconnect ignored for player ${data.playerId.slice(0, 8)}`);
          return;
        }
        const room = mgr.getRoom(data.roomCode ?? '');
        const p = room?.players.get(data.playerId);
        if (p) {
          p.connected = false;
          log('room', `${data.roomCode} player ${p.role} disconnected`);
        }
        socketByPlayerId.delete(data.playerId);
      }
    });
  });
}
