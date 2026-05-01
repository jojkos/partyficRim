import type { Server, Socket } from 'socket.io';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  Role,
} from '@polararena/shared';
import type { RoomManager, Room } from '../game/rooms.js';
import { requestStart } from '../game/tick.js';
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
    socket.on('display:create_room', (cb) => {
      // Idempotent per socket: if this socket already owns a live room, return it.
      // Prevents StrictMode / double-mount from creating duplicate rooms.
      const existing = (socket.data as { displayRoomCode?: string } | undefined)?.displayRoomCode;
      if (existing && mgr.getRoom(existing)) {
        cb({ roomCode: existing });
        return;
      }
      const room = mgr.createRoom();
      socket.join(`room:${room.code}:display`);
      socket.data = { ...(socket.data ?? {}), displayRoomCode: room.code };
      cb({ roomCode: room.code });
    });

    socket.on('display:join_room', ({ roomCode }, cb) => {
      const room = mgr.getRoom(roomCode);
      if (!room) return cb({ ok: false, error: 'no_such_room' });
      socket.join(`room:${room.code}:display`);
      cb({ ok: true });
    });

    socket.on('phone:join', ({ roomCode, sessionId }, cb) => {
      const room = mgr.getRoom(roomCode);
      if (!room) return cb({ ok: false, error: 'no_such_room' });

      // resume by sessionId
      if (sessionId) {
        for (const p of room.players.values()) {
          if (p.sessionId === sessionId) {
            p.connected = true;
            socket.data = { roomCode, playerId: p.id };
            socket.join(`room:${room.code}:phones`);
            socketByPlayerId.set(p.id, socket);
            return cb({ ok: true, role: p.role, sessionId });
          }
        }
      }

      const role = nextRole(room);
      if (!role) return cb({ ok: false, error: 'room_full' });

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
      cb({ ok: true, role, sessionId: newSessionId });
    });

    socket.on('phone:input', ({ dx, dy }) => {
      const data = socket.data as { roomCode?: string; playerId?: string } | undefined;
      if (!data?.roomCode || !data?.playerId) return;
      const room = mgr.getRoom(data.roomCode);
      const p = room?.players.get(data.playerId);
      if (!p) return;
      // clamp magnitude to 1; quantize per role/mode applied in tick
      const mag = Math.hypot(dx, dy);
      p.lastInput = mag > 1 ? { x: dx / mag, y: dy / mag } : { x: dx, y: dy };
    });

    socket.on('client:request_start', () => {
      // Anyone (display or phone) can press start. Honored only when room is in
      // lobby with both players connected. Otherwise silently ignored.
      const data = socket.data as { roomCode?: string; displayRoomCode?: string } | undefined;
      const code = data?.roomCode ?? data?.displayRoomCode;
      if (!code) return;
      const room = mgr.getRoom(code);
      if (!room) return;
      requestStart(room);
    });

    socket.on('phone:button', () => {
      const data = socket.data as { roomCode?: string; playerId?: string } | undefined;
      if (!data?.roomCode || !data?.playerId) return;
      const room = mgr.getRoom(data.roomCode);
      const p = room?.players.get(data.playerId);
      if (!p) return;
      p.lastButtonAt = Date.now();
    });

    socket.on('disconnect', () => {
      const data = socket.data as { roomCode?: string; playerId?: string } | undefined;
      if (!data?.roomCode || !data?.playerId) return;
      const room = mgr.getRoom(data.roomCode);
      const p = room?.players.get(data.playerId);
      if (p) p.connected = false;
      if (data.playerId) socketByPlayerId.delete(data.playerId);
    });
  });
}
