import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'node:path';
import os from 'node:os';
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
const CLIENT_DEV_PORT = Number(process.env.CLIENT_DEV_PORT ?? 5173);

function lanAddresses(): string[] {
  const out: string[] = [];
  for (const ifaces of Object.values(os.networkInterfaces())) {
    for (const iface of ifaces ?? []) {
      if (iface.family === 'IPv4' && !iface.internal) out.push(iface.address);
    }
  }
  return out;
}

function printBanner(): void {
  const ips = lanAddresses();
  const lines: string[] = [
    '',
    '──────────────────────────────────────────────',
    `  partyficRim  ·  server ready on :${PORT}`,
    '──────────────────────────────────────────────',
    `  display (dev)   →  http://localhost:${CLIENT_DEV_PORT}`,
    `  server (api)    →  http://localhost:${PORT}`,
  ];
  if (ips.length) {
    lines.push('  LAN — open these on your phone:');
    for (const ip of ips) {
      lines.push(`    • http://${ip}:${CLIENT_DEV_PORT}   (client dev)`);
      lines.push(`    • http://${ip}:${PORT}              (server prod)`);
    }
  }
  lines.push('──────────────────────────────────────────────', '');
  console.log(lines.join('\n'));
}

httpServer.listen(PORT, () => {
  // Print immediately so the log appears even if run standalone…
  console.log(`server listening on :${PORT}`);
  // …then re-print a full banner after a delay so it survives vite's
  // terminal clear when running `npm run dev` (server + client in parallel).
  setTimeout(printBanner, 1200);
});
