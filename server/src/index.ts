import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from "@partyficrim/shared";
import { RoomManager } from "./game/rooms.js";
import { registerHandlers } from "./net/handlers.js";
import { GameLoop } from "./game/loop.js";
import {
  tickRoom,
  buildDisplaySnapshot,
  buildPhoneSnapshot,
} from "./game/tick.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.resolve(__dirname, "../../client/dist");

const app = express();
const httpServer = createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: { origin: process.env.ALLOWED_ORIGINS?.split(",") ?? false },
  maxHttpBufferSize: 16_384,
});

const rooms = new RoomManager();
const { socketByPlayerId } = registerHandlers(io, rooms);

let lastSweep = 0;
const lastBroadcast = new Map<
  string,
  { display: number; phone: number; phase: string }
>();
const loop = new GameLoop(60, (dt) => {
  const now = performance.now();
  for (const room of rooms.iterRooms()) {
    tickRoom(room, dt);
    const previous = lastBroadcast.get(room.code) ?? {
      display: -Infinity,
      phone: -Infinity,
      phase: "",
    };
    const changed = previous.phase !== room.phase;
    const displayInterval =
      room.phase === "playing"
        ? 1000 / 30
        : room.phase === "countdown"
          ? 100
          : 200;
    const phoneInterval = room.phase === "playing" ? 50 : 200;
    const advance = (last: number, interval: number) =>
      !Number.isFinite(last) || now - last > 1000
        ? now
        : last + Math.floor((now - last) / interval) * interval;
    if (changed || now - previous.display >= displayInterval) {
      io.to(`room:${room.code}:display`).volatile.emit(
        "display:state",
        buildDisplaySnapshot(room),
      );
      previous.display = changed
        ? now
        : advance(previous.display, displayInterval);
    }
    if (changed || now - previous.phone >= phoneInterval) {
      for (const p of room.players.values()) {
        const s = socketByPlayerId.get(p.id);
        if (s) s.volatile.emit("phone:state", buildPhoneSnapshot(room, p.id));
      }
      previous.phone = changed ? now : advance(previous.phone, phoneInterval);
    }
    previous.phase = room.phase;
    lastBroadcast.set(room.code, previous);
  }
  if (now - lastSweep >= 30_000) {
    for (const code of rooms.prune()) lastBroadcast.delete(code);
    lastSweep = now;
  }
});
loop.start();

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use(express.static(clientDist));
app.get("*", (_req, res) => res.sendFile(path.join(clientDist, "index.html")));

const PORT = Number(process.env.PORT ?? 3000);
const CLIENT_DEV_PORT = Number(process.env.CLIENT_DEV_PORT ?? 5173);

function lanAddresses(): string[] {
  const out: string[] = [];
  for (const ifaces of Object.values(os.networkInterfaces())) {
    for (const iface of ifaces ?? []) {
      if (iface.family === "IPv4" && !iface.internal) out.push(iface.address);
    }
  }
  return out;
}

function printBanner(): void {
  const ips = lanAddresses();
  const lines: string[] = [
    "",
    "──────────────────────────────────────────────",
    `  partyficRim  ·  server ready on :${PORT}`,
    "──────────────────────────────────────────────",
    `  display (dev)   →  http://localhost:${CLIENT_DEV_PORT}`,
    `  server (api)    →  http://localhost:${PORT}`,
  ];
  if (ips.length) {
    lines.push("  LAN — open these on your phone:");
    for (const ip of ips) {
      lines.push(`    • http://${ip}:${CLIENT_DEV_PORT}   (client dev)`);
      lines.push(`    • http://${ip}:${PORT}              (server prod)`);
    }
  }
  lines.push("──────────────────────────────────────────────", "");
  console.log(lines.join("\n"));
}

httpServer.listen(PORT, () => {
  // Print immediately so the log appears even if run standalone…
  console.log(`server listening on :${PORT}`);
  // …then re-print a full banner after a delay so it survives vite's
  // terminal clear when running `npm run dev` (server + client in parallel).
  setTimeout(printBanner, 1200);
});
