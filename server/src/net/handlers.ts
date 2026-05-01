import type { Server, Socket } from 'socket.io';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  Role,
} from '@polararena/shared';
import type { RoomManager, Room } from '../game/rooms.js';
import { requestStart } from '../game/tick.js';
import { log } from '../log.js';
import { randomUUID } from 'node:crypto';

type IO = Server<ClientToServerEvents, ServerToClientEvents>;
type S = Socket<ClientToServerEvents, ServerToClientEvents>;

export const socketByPlayerId = new Map<string, S>();

function nextRole(room: Room): Role | undefined {
  const taken = new Set<Role>();
  for (const p of room.players.values()) taken.add(p.role);
  if (!taken.has('X')) return 'X';
  if (!taken.has('Y')) return 'Y';
  return undefined;
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

    socket.on('display:join_room', ({ roomCode }, cb) => {
      const room = mgr.getRoom(roomCode);
      if (!room) {
        log('room', `${roomCode} display join refused: no_such_room`);
        return cb({ ok: false, error: 'no_such_room' });
      }
      socket.join(`room:${room.code}:display`);
      log('room', `${roomCode} display joined`);
      cb({ ok: true });
    });

    socket.on('phone:join', ({ roomCode, sessionId }, cb) => {
      const room = mgr.getRoom(roomCode);
      if (!room) {
        log('room', `${roomCode} phone join refused: no_such_room (socket=${socket.id})`);
        return cb({ ok: false, error: 'no_such_room' });
      }

      if (sessionId) {
        for (const p of room.players.values()) {
          if (p.sessionId === sessionId) {
            p.connected = true;
            socket.data = { roomCode, playerId: p.id };
            socket.join(`room:${room.code}:phones`);
            socketByPlayerId.set(p.id, socket);
            log('room', `${roomCode} phone resume role=${p.role} (socket=${socket.id})`);
            return cb({ ok: true, role: p.role, sessionId });
          }
        }
      }

      const role = nextRole(room);
      if (!role) {
        log('room', `${roomCode} phone join refused: room_full (socket=${socket.id})`);
        return cb({ ok: false, error: 'room_full' });
      }

      const newSessionId = randomUUID();
      const id = randomUUID();
      room.players.set(id, {
        id,
        sessionId: newSessionId,
        role,
        mode: 'in_robot',
        pos: { x: room.robot.x, y: room.robot.y },
        connected: true,
        lastInput: { x: 0, y: 0 },
        lastButtonAt: 0,
      });
      socket.data = { roomCode, playerId: id };
      socket.join(`room:${room.code}:phones`);
      socketByPlayerId.set(id, socket);
      log('room', `${roomCode} phone joined role=${role} (count=${room.players.size}) (socket=${socket.id})`);
      cb({ ok: true, role, sessionId: newSessionId });
    });

    socket.on('phone:input', ({ dx, dy }) => {
      const data = socket.data as { roomCode?: string; playerId?: string } | undefined;
      if (!data?.roomCode || !data?.playerId) return;
      const room = mgr.getRoom(data.roomCode);
      const p = room?.players.get(data.playerId);
      if (!p) return;
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
      if (!p) return;
      p.lastButtonAt = Date.now();
      log('action', `${data.roomCode} button player=${p.role} mode=${p.mode}`);
    });

    socket.on('disconnect', () => {
      const data = socket.data as { roomCode?: string; playerId?: string; displayRoomCode?: string } | undefined;
      log('net', `disconnect ${socket.id}${data?.playerId ? ` player=${data.playerId.slice(0, 8)}` : ''}${data?.displayRoomCode ? ` display-of=${data.displayRoomCode}` : ''}`);
      if (!data?.roomCode || !data?.playerId) return;
      const room = mgr.getRoom(data.roomCode);
      const p = room?.players.get(data.playerId);
      if (p) {
        p.connected = false;
        log('room', `${data.roomCode} player ${p.role} disconnected`);
      }
      if (data.playerId) socketByPlayerId.delete(data.playerId);
    });
  });
}
