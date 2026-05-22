import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ClientToServerEvents, ServerToClientEvents } from '@partyficrim/shared';
import { RoomManager } from './game/rooms.js';
import { registerHandlers, socketByPlayerId } from './net/handlers.js';
import { GameLoop } from './game/loop.js';
import { tickRoom, buildDisplaySnapshot, buildPhoneSnapshot } from './game/tick.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.resolve(__dirname, '../../client/dist');

const app = express();
const httpServer = createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: { origin: true, credentials: true },
});

const rooms = new RoomManager();
registerHandlers(io, rooms);

const loop = new GameLoop(30, (dt) => {
  for (const room of rooms.iterRooms()) {
    tickRoom(room, dt);
    io.to(`room:${room.code}:display`).emit('display:state', buildDisplaySnapshot(room));
    for (const p of room.players.values()) {
      const s = socketByPlayerId.get(p.id);
      if (s) s.emit('phone:state', buildPhoneSnapshot(room, p.id));
    }
  }
});
loop.start();

app.get('/health', (_req, res) => res.json({ ok: true }));

app.use(express.static(clientDist));
app.get('*', (_req, res) => res.sendFile(path.join(clientDist, 'index.html')));

const PORT = Number(process.env.PORT ?? 3000);
httpServer.listen(PORT, () => {
  console.log(`server listening on :${PORT}`);
});
