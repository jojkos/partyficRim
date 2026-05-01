import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from '@polararena/shared';
import { RoomManager } from './game/rooms.js';
import { registerHandlers } from './net/handlers.js';

const app = express();
const httpServer = createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: { origin: true, credentials: true },
});

const rooms = new RoomManager();
registerHandlers(io, rooms);

app.get('/health', (_req, res) => res.json({ ok: true }));

const PORT = Number(process.env.PORT ?? 3000);
httpServer.listen(PORT, () => {
  console.log(`server listening on :${PORT}`);
});
