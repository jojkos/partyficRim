# partyficRim MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the partyficRim MVP — a browser-based asymmetric coop arena game where two phones share control of a single robot rendered on a third "display" screen, with isometric 2D rendering, exit/enter mechanics, AABB collisions, and shared powerup pickup.

**Architecture:** Single repo with npm workspaces. Server is Node + Express + Socket.IO running an authoritative 30Hz simulation. Client is one Vite + React + TypeScript app with two routes (`/display`, `/play`), where the display uses PixiJS for the arena and React overlays for HUD, and the phone uses pure React + nipplejs. Phones send only input; server broadcasts canonical state.

**Tech Stack:** TypeScript, Node, Express, Socket.IO, Vite, React, PixiJS, nipplejs, qrcode, Vitest, mkcert.

**Spec:** [`docs/superpowers/specs/2026-05-01-partyficrim-mvp-design.md`](../specs/2026-05-01-partyficrim-mvp-design.md)

---

## Phase 0 — Repo and tooling setup

### Task 0.1: Initialize git and root package.json with workspaces

**Files:**
- Create: `.gitignore`
- Create: `package.json`
- Create: `tsconfig.base.json`

- [ ] **Step 1: Initialize git**

```bash
cd /Users/jonas/Work/partyficRim
git init
git branch -m main
```

- [ ] **Step 2: Create `.gitignore`**

```gitignore
node_modules/
dist/
build/
.env
.env.local
*.log
.DS_Store
.vite/
coverage/
.cert/
```

- [ ] **Step 3: Create root `package.json` with workspaces**

```json
{
  "name": "partyficrim",
  "private": true,
  "version": "0.0.0",
  "workspaces": ["shared", "server", "client"],
  "scripts": {
    "dev:server": "npm --workspace=server run dev",
    "dev:client": "npm --workspace=client run dev",
    "dev": "npm-run-all --parallel dev:server dev:client",
    "test": "npm --workspaces --if-present run test",
    "build": "npm --workspaces --if-present run build"
  },
  "devDependencies": {
    "npm-run-all": "^4.1.5",
    "typescript": "^5.4.0"
  }
}
```

- [ ] **Step 4: Create `tsconfig.base.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noUncheckedIndexedAccess": true
  }
}
```

- [ ] **Step 5: Install root deps**

Run: `npm install`
Expected: `node_modules/` created, no errors.

- [ ] **Step 6: Commit**

```bash
git add .gitignore package.json package-lock.json tsconfig.base.json
git commit -m "chore: initialize repo with npm workspaces"
```

---

### Task 0.2: Create the `shared` workspace with cross-cutting types

**Files:**
- Create: `shared/package.json`
- Create: `shared/tsconfig.json`
- Create: `shared/src/index.ts`
- Create: `shared/src/events.ts`
- Create: `shared/src/state.ts`

- [ ] **Step 1: Create `shared/package.json`**

```json
{
  "name": "@partyficrim/shared",
  "version": "0.0.0",
  "type": "module",
  "main": "src/index.ts",
  "types": "src/index.ts"
}
```

- [ ] **Step 2: Create `shared/tsconfig.json`**

```json
{
  "extends": "../tsconfig.base.json",
  "include": ["src"]
}
```

- [ ] **Step 3: Create `shared/src/state.ts`**

```ts
export type Role = 'X' | 'Y';
export type Mode = 'in_robot' | 'on_foot';
export type Phase = 'lobby' | 'countdown' | 'playing' | 'paused';

export interface Vec2 {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface PlayerState {
  id: string;
  role: Role;
  mode: Mode;
  pos: Vec2;
  connected: boolean;
}

export interface PowerupState {
  id: string;
  pos: Vec2;
}

export interface DisplaySnapshot {
  phase: Phase;
  countdownMsRemaining: number;
  robot: Vec2;
  players: PlayerState[];
  powerups: PowerupState[];
  obstacles: Rect[];
  score: number;
  arena: Rect;
  roomCode: string;
}

export interface PhoneSnapshot {
  phase: Phase;
  role: Role;
  mode: Mode;
  score: number;
  occupancy: Record<Role, Mode>;
  nearRobot: boolean;
}
```

- [ ] **Step 4: Create `shared/src/events.ts`**

```ts
import type { DisplaySnapshot, PhoneSnapshot, Role } from './state.js';

export interface ClientToServerEvents {
  'display:create_room': (cb: (res: { roomCode: string }) => void) => void;
  'display:join_room': (
    args: { roomCode: string },
    cb: (res: { ok: boolean; error?: string }) => void
  ) => void;
  'phone:join': (
    args: { roomCode: string; sessionId?: string },
    cb: (res: { ok: true; role: Role; sessionId: string } | { ok: false; error: string }) => void
  ) => void;
  'phone:input': (args: { dx: number; dy: number }) => void;
  'phone:button': () => void;
}

export interface ServerToClientEvents {
  'display:state': (snapshot: DisplaySnapshot) => void;
  'phone:state': (snapshot: PhoneSnapshot) => void;
}
```

- [ ] **Step 5: Create `shared/src/index.ts`**

```ts
export * from './state.js';
export * from './events.js';
```

- [ ] **Step 6: Commit**

```bash
git add shared
git commit -m "feat(shared): add cross-cutting state and event types"
```

---

### Task 0.3: Scaffold the `server` workspace

**Files:**
- Create: `server/package.json`
- Create: `server/tsconfig.json`
- Create: `server/vitest.config.ts`
- Create: `server/src/index.ts`

- [ ] **Step 1: Create `server/package.json`**

```json
{
  "name": "@partyficrim/server",
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "vitest run"
  },
  "dependencies": {
    "@partyficrim/shared": "*",
    "express": "^4.19.0",
    "socket.io": "^4.7.0"
  },
  "devDependencies": {
    "@types/express": "^4.17.0",
    "@types/node": "^20.0.0",
    "tsx": "^4.7.0",
    "typescript": "^5.4.0",
    "vitest": "^1.4.0"
  }
}
```

- [ ] **Step 2: Create `server/tsconfig.json`**

```json
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "module": "ESNext",
    "moduleResolution": "Bundler"
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create `server/vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
```

- [ ] **Step 4: Create `server/src/index.ts` (minimal hello-world)**

```ts
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from '@partyficrim/shared';

const app = express();
const httpServer = createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: { origin: true, credentials: true },
});

app.get('/health', (_req, res) => res.json({ ok: true }));

const PORT = Number(process.env.PORT ?? 3000);
httpServer.listen(PORT, () => {
  console.log(`server listening on :${PORT}`);
});
```

- [ ] **Step 5: Install and verify**

Run: `npm install`
Run: `npm --workspace=server run dev`
Expected: `server listening on :3000`. Verify `curl http://localhost:3000/health` returns `{"ok":true}`. Stop the server (Ctrl-C).

- [ ] **Step 6: Commit**

```bash
git add server
git commit -m "feat(server): scaffold express + socket.io server"
```

---

### Task 0.4: Scaffold the `client` workspace with Vite + React

**Files:**
- Create: `client/package.json`
- Create: `client/tsconfig.json`
- Create: `client/vite.config.ts`
- Create: `client/index.html`
- Create: `client/src/main.tsx`
- Create: `client/src/App.tsx`
- Create: `client/src/display/DisplayPage.tsx`
- Create: `client/src/play/PlayPage.tsx`

- [ ] **Step 1: Create `client/package.json`**

```json
{
  "name": "@partyficrim/client",
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest run"
  },
  "dependencies": {
    "@partyficrim/shared": "*",
    "nipplejs": "^0.10.2",
    "pixi.js": "^7.4.0",
    "qrcode": "^1.5.3",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.22.0",
    "socket.io-client": "^4.7.0"
  },
  "devDependencies": {
    "@types/qrcode": "^1.5.0",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@vitejs/plugin-react": "^4.2.0",
    "typescript": "^5.4.0",
    "vite": "^5.2.0",
    "vitest": "^1.4.0"
  }
}
```

- [ ] **Step 2: Create `client/tsconfig.json`**

```json
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "types": ["vite/client"]
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create `client/vite.config.ts`**

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/socket.io': {
        target: 'http://localhost:3000',
        ws: true,
      },
    },
  },
});
```

- [ ] **Step 4: Create `client/index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <title>partyficRim</title>
    <style>
      html, body, #root { margin: 0; padding: 0; height: 100%; width: 100%; overflow: hidden; background: #0a0a12; color: #fff; font-family: system-ui, sans-serif; }
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 5: Create `client/src/main.tsx`**

```tsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.js';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

- [ ] **Step 6: Create `client/src/App.tsx`**

```tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { DisplayPage } from './display/DisplayPage.js';
import { PlayPage } from './play/PlayPage.js';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/display" element={<DisplayPage />} />
        <Route path="/play" element={<PlayPage />} />
        <Route path="*" element={<Navigate to="/display" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
```

- [ ] **Step 7: Create `client/src/display/DisplayPage.tsx`**

```tsx
export function DisplayPage() {
  return <div style={{ padding: 24 }}><h1>partyficRim display</h1></div>;
}
```

- [ ] **Step 8: Create `client/src/play/PlayPage.tsx`**

```tsx
export function PlayPage() {
  return <div style={{ padding: 24 }}><h1>partyficRim phone</h1></div>;
}
```

- [ ] **Step 9: Install and verify**

Run: `npm install`
Run: `npm run dev`
Expected: server logs `:3000`, client logs `:5173`. Open `http://localhost:5173/display` → see "partyficRim display". Open `http://localhost:5173/play` → see "partyficRim phone". Stop with Ctrl-C.

- [ ] **Step 10: Commit**

```bash
git add client
git commit -m "feat(client): scaffold vite + react app with display/play routes"
```

---

### Task 0.5: Local HTTPS via mkcert (so phone Safari can use camera + reach dev server)

**Files:**
- Modify: `client/vite.config.ts`
- Modify: `.gitignore` (already excludes `.cert/`)

- [ ] **Step 1: Install mkcert and generate cert**

```bash
brew install mkcert
mkcert -install
mkdir -p .cert
mkcert -key-file .cert/key.pem -cert-file .cert/cert.pem localhost 127.0.0.1 ::1 $(ipconfig getifaddr en0)
```

Expected: `.cert/cert.pem` and `.cert/key.pem` exist. The local IP is included so phones on the same Wi-Fi can connect over HTTPS.

- [ ] **Step 2: Update `client/vite.config.ts` to use HTTPS**

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';

const certDir = path.resolve(__dirname, '../.cert');
const httpsConfig = fs.existsSync(path.join(certDir, 'cert.pem'))
  ? {
      key: fs.readFileSync(path.join(certDir, 'key.pem')),
      cert: fs.readFileSync(path.join(certDir, 'cert.pem')),
    }
  : undefined;

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    https: httpsConfig,
    proxy: {
      '/socket.io': {
        target: 'http://localhost:3000',
        ws: true,
      },
    },
  },
});
```

- [ ] **Step 3: Verify**

Run: `npm run dev:client`
Expected: Vite logs `https://localhost:5173` and `https://<your-lan-ip>:5173`. Open the LAN URL on your phone — page loads with no cert warning (after running `mkcert -install` on the host machine).

- [ ] **Step 4: Commit**

```bash
git add client/vite.config.ts
git commit -m "chore(client): enable local https for phone access"
```

---

## Phase 1 — Room creation and lobby

### Task 1.1: Server room manager (TDD)

**Files:**
- Create: `server/src/game/rooms.ts`
- Create: `server/src/game/rooms.test.ts`

- [ ] **Step 1: Write the failing test**

`server/src/game/rooms.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { RoomManager } from './rooms.js';

describe('RoomManager', () => {
  let mgr: RoomManager;

  beforeEach(() => {
    mgr = new RoomManager();
  });

  it('creates a room with a 4-letter uppercase code', () => {
    const room = mgr.createRoom();
    expect(room.code).toMatch(/^[A-Z]{4}$/);
    expect(mgr.getRoom(room.code)).toBe(room);
  });

  it('does not collide codes', () => {
    const codes = new Set<string>();
    for (let i = 0; i < 100; i++) codes.add(mgr.createRoom().code);
    expect(codes.size).toBe(100);
  });

  it('returns undefined for unknown code', () => {
    expect(mgr.getRoom('ZZZZ')).toBeUndefined();
  });

  it('removes a room', () => {
    const room = mgr.createRoom();
    mgr.removeRoom(room.code);
    expect(mgr.getRoom(room.code)).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test, expect failure**

Run: `npm --workspace=server test`
Expected: FAIL — `Cannot find module './rooms.js'`

- [ ] **Step 3: Implement `server/src/game/rooms.ts`**

```ts
import type { Phase, PlayerState, PowerupState, Rect, Vec2 } from '@partyficrim/shared';

export interface Room {
  code: string;
  phase: Phase;
  countdownMsRemaining: number;
  robot: Vec2;
  players: Map<string, PlayerState & { sessionId: string; lastInput: Vec2; lastButtonAt: number }>;
  powerups: Map<string, PowerupState>;
  obstacles: Rect[];
  arena: Rect;
  score: number;
  createdAt: number;
}

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // omit I/O for readability

function randomCode(): string {
  let s = '';
  for (let i = 0; i < 4; i++) s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return s;
}

export class RoomManager {
  private rooms = new Map<string, Room>();

  createRoom(): Room {
    let code: string;
    do { code = randomCode(); } while (this.rooms.has(code));
    const room: Room = {
      code,
      phase: 'lobby',
      countdownMsRemaining: 0,
      robot: { x: 400, y: 300 },
      players: new Map(),
      powerups: new Map(),
      obstacles: [
        { x: 200, y: 150, w: 60, h: 60 },
        { x: 540, y: 400, w: 80, h: 40 },
        { x: 350, y: 480, w: 40, h: 80 },
      ],
      arena: { x: 0, y: 0, w: 800, h: 600 },
      score: 0,
      createdAt: Date.now(),
    };
    this.rooms.set(code, room);
    return room;
  }

  getRoom(code: string): Room | undefined {
    return this.rooms.get(code);
  }

  removeRoom(code: string): void {
    this.rooms.delete(code);
  }
}
```

- [ ] **Step 4: Run test, expect pass**

Run: `npm --workspace=server test`
Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add server/src/game/rooms.ts server/src/game/rooms.test.ts
git commit -m "feat(server): add RoomManager with code generation"
```

---

### Task 1.2: Wire `display:create_room` and `phone:join` socket handlers

**Files:**
- Create: `server/src/net/handlers.ts`
- Modify: `server/src/index.ts`

- [ ] **Step 1: Create `server/src/net/handlers.ts`**

```ts
import type { Server, Socket } from 'socket.io';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  Role,
} from '@partyficrim/shared';
import type { RoomManager, Room } from '../game/rooms.js';
import { randomUUID } from 'node:crypto';

type IO = Server<ClientToServerEvents, ServerToClientEvents>;
type S = Socket<ClientToServerEvents, ServerToClientEvents>;

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
      const room = mgr.createRoom();
      socket.join(`room:${room.code}:display`);
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
    });
  });
}
```

- [ ] **Step 2: Update `server/src/index.ts` to register handlers**

```ts
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from '@partyficrim/shared';
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
```

- [ ] **Step 3: Verify the server starts**

Run: `npm --workspace=server run dev`
Expected: `server listening on :3000`. No type errors. Stop.

- [ ] **Step 4: Commit**

```bash
git add server/src/net/handlers.ts server/src/index.ts
git commit -m "feat(server): handle room creation, phone join, input, disconnect"
```

---

### Task 1.3: Display lobby — create room, show code + QR

**Files:**
- Create: `client/src/socket.ts`
- Create: `client/src/display/DisplayLobby.tsx`
- Modify: `client/src/display/DisplayPage.tsx`

- [ ] **Step 1: Create `client/src/socket.ts`**

```ts
import { io, type Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '@partyficrim/shared';

export type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export function createSocket(): AppSocket {
  return io({ autoConnect: true });
}
```

- [ ] **Step 2: Create `client/src/display/DisplayLobby.tsx`**

```tsx
import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import type { AppSocket } from '../socket.js';

interface Props {
  socket: AppSocket;
  onRoomCreated: (code: string) => void;
}

export function DisplayLobby({ socket, onRoomCreated }: Props) {
  const [code, setCode] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    const onConnect = () => {
      socket.emit('display:create_room', ({ roomCode }) => {
        setCode(roomCode);
        onRoomCreated(roomCode);
        const joinUrl = `${window.location.origin}/play?room=${roomCode}`;
        QRCode.toDataURL(joinUrl, { width: 320, margin: 1 }).then(setQrDataUrl);
      });
    };
    if (socket.connected) onConnect();
    else socket.once('connect', onConnect);
    return () => { socket.off('connect', onConnect); };
  }, [socket, onRoomCreated]);

  if (!code) return <div style={{ padding: 24 }}>Connecting…</div>;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      gap: 64, height: '100vh', flexDirection: 'column',
    }}>
      <h1 style={{ fontSize: 96, margin: 0, letterSpacing: 16 }}>{code}</h1>
      {qrDataUrl && <img src={qrDataUrl} alt="join QR" width={320} height={320} />}
      <div style={{ fontSize: 24, opacity: 0.7 }}>
        Or visit <code>{window.location.host}/play</code>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Update `client/src/display/DisplayPage.tsx`**

```tsx
import { useMemo, useState } from 'react';
import { createSocket } from '../socket.js';
import { DisplayLobby } from './DisplayLobby.js';

export function DisplayPage() {
  const socket = useMemo(() => createSocket(), []);
  const [, setRoomCode] = useState<string | null>(null);
  return <DisplayLobby socket={socket} onRoomCreated={setRoomCode} />;
}
```

- [ ] **Step 4: Verify manually**

Run: `npm run dev`
Open `https://localhost:5173/display`. Expected: a 4-letter code and a QR image. Server log shows a connection. Stop.

- [ ] **Step 5: Commit**

```bash
git add client/src/socket.ts client/src/display
git commit -m "feat(display): show room code and QR on lobby"
```

---

### Task 1.4: Phone join — read room code from URL, join, persist sessionId

**Files:**
- Create: `client/src/play/PhoneLobby.tsx`
- Modify: `client/src/play/PlayPage.tsx`

- [ ] **Step 1: Update `client/src/play/PlayPage.tsx`**

```tsx
import { useEffect, useMemo, useState } from 'react';
import { createSocket } from '../socket.js';
import type { Role } from '@partyficrim/shared';
import { PhoneLobby } from './PhoneLobby.js';

const SESSION_KEY = 'partyficrim.sessionId';

export function PlayPage() {
  const socket = useMemo(() => createSocket(), []);
  const params = new URLSearchParams(window.location.search);
  const initialRoom = (params.get('room') ?? '').toUpperCase();
  const [roomCode, setRoomCode] = useState(initialRoom);
  const [role, setRole] = useState<Role | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!roomCode || roomCode.length !== 4) return;
    const sessionId = localStorage.getItem(SESSION_KEY) ?? undefined;
    socket.emit('phone:join', { roomCode, sessionId }, (res) => {
      if (!res.ok) { setError(res.error); return; }
      localStorage.setItem(SESSION_KEY, res.sessionId);
      setRole(res.role);
    });
  }, [socket, roomCode]);

  if (!roomCode || roomCode.length !== 4) {
    return (
      <form
        style={{ padding: 24 }}
        onSubmit={(e) => {
          e.preventDefault();
          const v = (new FormData(e.currentTarget).get('code') as string).toUpperCase();
          if (v.length === 4) setRoomCode(v);
        }}
      >
        <h1>Join a room</h1>
        <input name="code" maxLength={4} placeholder="ABCD" autoCapitalize="characters"
               style={{ fontSize: 48, padding: 12, width: 200, letterSpacing: 8 }} />
        <button type="submit" style={{ fontSize: 24, padding: 12, marginLeft: 12 }}>Join</button>
      </form>
    );
  }

  if (error) return <div style={{ padding: 24 }}>Error: {error}</div>;
  if (!role) return <div style={{ padding: 24 }}>Joining {roomCode}…</div>;
  return <PhoneLobby role={role} roomCode={roomCode} />;
}
```

- [ ] **Step 2: Create `client/src/play/PhoneLobby.tsx`**

```tsx
import type { Role } from '@partyficrim/shared';

const ROLE_COLOR: Record<Role, string> = { X: '#ff5577', Y: '#55c2ff' };

export function PhoneLobby({ role, roomCode }: { role: Role; roomCode: string }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      height: '100vh', gap: 24, padding: 24, textAlign: 'center',
    }}>
      <div style={{ fontSize: 18, opacity: 0.7 }}>Room {roomCode}</div>
      <div style={{ fontSize: 36 }}>You are</div>
      <div style={{
        fontSize: 96, fontWeight: 800, color: ROLE_COLOR[role],
      }}>{role}-axis</div>
      <div style={{ fontSize: 18, opacity: 0.7 }}>Waiting for the other player…</div>
    </div>
  );
}
```

- [ ] **Step 3: Verify manually**

Run: `npm run dev`
- Open `https://localhost:5173/display` on laptop, note the code.
- Open `https://<lan-ip>:5173/play?room=<code>` on phone (or scan the QR). Expected: phone shows "You are X-axis" with red color. Open a second phone or another tab → "Y-axis" in blue.
- Refresh phone — should re-join same role (sessionId resume).

- [ ] **Step 4: Commit**

```bash
git add client/src/play
git commit -m "feat(phone): join flow with role assignment and session resume"
```

---

### Task 1.5: Display shows live player count by listening to room state

This task is the bridge between "lobby with no awareness" and "real game state broadcasts." We will introduce the tick loop and broadcast in the next phase, but to make the lobby useful right now, we add a lightweight `display:lobby_status` server event triggered whenever player count changes.

To keep the protocol minimal, we will **skip** a separate event and instead let the next phase's tick loop handle this — the display will show "Waiting (N/2)" once the snapshot stream begins. Therefore, this task is intentionally empty; mark it done.

- [ ] **Step 1: No-op acknowledgement**

This task exists to call out the deferral. The next phase delivers the player count via the state snapshot.

---

## Phase 2 — Server tick loop and state broadcast

### Task 2.1: Game loop skeleton (TDD)

**Files:**
- Create: `server/src/game/loop.ts`
- Create: `server/src/game/loop.test.ts`

- [ ] **Step 1: Write the failing test**

`server/src/game/loop.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GameLoop } from './loop.js';

describe('GameLoop', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('calls onTick at ~30Hz', () => {
    const onTick = vi.fn();
    const loop = new GameLoop(30, onTick);
    loop.start();
    vi.advanceTimersByTime(1000);
    loop.stop();
    expect(onTick.mock.calls.length).toBeGreaterThanOrEqual(28);
    expect(onTick.mock.calls.length).toBeLessThanOrEqual(32);
  });

  it('passes dt in seconds', () => {
    const onTick = vi.fn();
    const loop = new GameLoop(30, onTick);
    loop.start();
    vi.advanceTimersByTime(100);
    loop.stop();
    const firstDt = onTick.mock.calls[0]?.[0] as number;
    expect(firstDt).toBeGreaterThan(0);
    expect(firstDt).toBeLessThan(0.1);
  });

  it('stop prevents further ticks', () => {
    const onTick = vi.fn();
    const loop = new GameLoop(30, onTick);
    loop.start();
    vi.advanceTimersByTime(100);
    const callsAtStop = onTick.mock.calls.length;
    loop.stop();
    vi.advanceTimersByTime(500);
    expect(onTick.mock.calls.length).toBe(callsAtStop);
  });
});
```

- [ ] **Step 2: Run, expect failure**

Run: `npm --workspace=server test`
Expected: FAIL — `Cannot find module './loop.js'`

- [ ] **Step 3: Implement `server/src/game/loop.ts`**

```ts
export type TickFn = (dt: number) => void;

export class GameLoop {
  private timer: NodeJS.Timeout | null = null;
  private last = 0;
  constructor(private hz: number, private onTick: TickFn) {}

  start(): void {
    this.last = Date.now();
    const intervalMs = 1000 / this.hz;
    this.timer = setInterval(() => {
      const now = Date.now();
      const dt = (now - this.last) / 1000;
      this.last = now;
      this.onTick(dt);
    }, intervalMs);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }
}
```

- [ ] **Step 4: Run, expect pass**

Run: `npm --workspace=server test`
Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add server/src/game/loop.ts server/src/game/loop.test.ts
git commit -m "feat(server): add fixed-interval game loop"
```

---

### Task 2.2: Phase machine and snapshot building

**Files:**
- Create: `server/src/game/tick.ts`
- Create: `server/src/game/tick.test.ts`

- [ ] **Step 1: Write the failing test**

`server/src/game/tick.test.ts`:

```ts
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
```

- [ ] **Step 2: Run, expect failure**

Run: `npm --workspace=server test`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `server/src/game/tick.ts`**

```ts
import type { DisplaySnapshot, PhoneSnapshot, Role, Mode } from '@partyficrim/shared';
import type { Room } from './rooms.js';

const COUNTDOWN_MS = 3000;

function allConnected(room: Room): boolean {
  for (const p of room.players.values()) if (!p.connected) return false;
  return true;
}

export function tickRoom(room: Room, dt: number): void {
  const dtMs = dt * 1000;
  const playerCount = room.players.size;

  if (room.phase === 'lobby') {
    if (playerCount === 2) {
      room.phase = 'countdown';
      room.countdownMsRemaining = COUNTDOWN_MS;
    }
    return;
  }

  if (room.phase === 'countdown') {
    if (playerCount < 2 || !allConnected(room)) {
      room.phase = 'lobby';
      room.countdownMsRemaining = 0;
      return;
    }
    room.countdownMsRemaining -= dtMs;
    if (room.countdownMsRemaining <= 0) {
      room.phase = 'playing';
      room.countdownMsRemaining = 0;
    }
    return;
  }

  if (room.phase === 'playing') {
    if (!allConnected(room)) {
      room.phase = 'paused';
      return;
    }
    // movement / collision / powerups handled in later tasks
    return;
  }

  if (room.phase === 'paused') {
    if (allConnected(room) && playerCount === 2) {
      room.phase = 'playing';
    }
    return;
  }
}

export function buildDisplaySnapshot(room: Room): DisplaySnapshot {
  return {
    phase: room.phase,
    countdownMsRemaining: room.countdownMsRemaining,
    robot: { x: room.robot.x, y: room.robot.y },
    players: [...room.players.values()].map((p) => ({
      id: p.id, role: p.role, mode: p.mode, pos: { x: p.pos.x, y: p.pos.y }, connected: p.connected,
    })),
    powerups: [...room.powerups.values()].map((u) => ({ id: u.id, pos: { x: u.pos.x, y: u.pos.y } })),
    obstacles: room.obstacles.map((o) => ({ ...o })),
    score: room.score,
    arena: { ...room.arena },
    roomCode: room.code,
  };
}

export function buildPhoneSnapshot(room: Room, playerId: string): PhoneSnapshot {
  const occupancy: Record<Role, Mode> = { X: 'in_robot', Y: 'in_robot' };
  for (const p of room.players.values()) occupancy[p.role] = p.mode;
  const me = room.players.get(playerId)!;
  return {
    phase: room.phase,
    role: me.role,
    mode: me.mode,
    score: room.score,
    occupancy,
    nearRobot: false, // updated in re-entry phase
  };
}
```

- [ ] **Step 4: Run, expect pass**

Run: `npm --workspace=server test`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add server/src/game/tick.ts server/src/game/tick.test.ts
git commit -m "feat(server): add phase machine and snapshot builders"
```

---

### Task 2.3: Wire the loop into the server, broadcast state

**Files:**
- Modify: `server/src/index.ts`

- [ ] **Step 1: Replace `server/src/index.ts`**

```ts
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from '@partyficrim/shared';
import { RoomManager } from './game/rooms.js';
import { registerHandlers } from './net/handlers.js';
import { GameLoop } from './game/loop.js';
import { tickRoom, buildDisplaySnapshot, buildPhoneSnapshot } from './game/tick.js';

const app = express();
const httpServer = createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: { origin: true, credentials: true },
});

const rooms = new RoomManager();
registerHandlers(io, rooms);

const loop = new GameLoop(30, (dt) => {
  for (const room of (rooms as unknown as { rooms: Map<string, ReturnType<RoomManager['createRoom']>> }).rooms.values()) {
    tickRoom(room, dt);
    io.to(`room:${room.code}:display`).emit('display:state', buildDisplaySnapshot(room));
    for (const p of room.players.values()) {
      if (!p.connected) continue;
      io.to(`room:${room.code}:phones`).emit('phone:state', buildPhoneSnapshot(room, p.id));
    }
  }
});
loop.start();

app.get('/health', (_req, res) => res.json({ ok: true }));

const PORT = Number(process.env.PORT ?? 3000);
httpServer.listen(PORT, () => {
  console.log(`server listening on :${PORT}`);
});
```

The cast to access `rooms.rooms` is a deliberate shortcut for MVP. We'll fix in Step 2 by exposing an iterator.

- [ ] **Step 2: Add `iterRooms()` to `server/src/game/rooms.ts`**

Inside the `RoomManager` class, add:

```ts
  iterRooms(): IterableIterator<Room> {
    return this.rooms.values();
  }
```

Then in `server/src/index.ts`, replace the loop body's first line:

```ts
  for (const room of rooms.iterRooms()) {
```

- [ ] **Step 3: Phone snapshot is per-player; fix the broadcast**

Replace the inner phone loop in `server/src/index.ts` to emit per-socket. Since we don't track sockets-by-player here, emit to the whole `:phones` room with the snapshot for player p — that means each phone receives both snapshots. We need per-socket emission. Update by tracking sockets per player via a side map:

In `server/src/net/handlers.ts`, add an exported `socketByPlayerId` map:

```ts
export const socketByPlayerId = new Map<string, S>();
```

Inside `phone:join` after assigning `socket.data.playerId`:

```ts
socketByPlayerId.set(id /* or p.id on resume */, socket);
```

For the resume branch, replace `id` with `p.id`. For the new-player branch, use the local `id`. Inside `disconnect`:

```ts
if (data?.playerId) socketByPlayerId.delete(data.playerId);
```

Update `server/src/index.ts` to use it:

```ts
import { socketByPlayerId } from './net/handlers.js';
// ...
for (const p of room.players.values()) {
  const s = socketByPlayerId.get(p.id);
  if (s) s.emit('phone:state', buildPhoneSnapshot(room, p.id));
}
```

- [ ] **Step 4: Manually verify**

Run: `npm run dev`
- Open `/display` → join from two phones → display console should be silent (we don't render snapshots yet) but server emits at 30Hz. Use browser devtools network panel to confirm `socket.io` traffic.
- Stop with Ctrl-C.

- [ ] **Step 5: Commit**

```bash
git add server
git commit -m "feat(server): drive loop, broadcast display + phone snapshots"
```

---

### Task 2.4: Display consumes snapshot, shows player count and countdown

**Files:**
- Create: `client/src/display/useDisplayState.ts`
- Modify: `client/src/display/DisplayPage.tsx`
- Modify: `client/src/display/DisplayLobby.tsx`

- [ ] **Step 1: Create `client/src/display/useDisplayState.ts`**

```ts
import { useEffect, useState } from 'react';
import type { DisplaySnapshot } from '@partyficrim/shared';
import type { AppSocket } from '../socket.js';

export function useDisplayState(socket: AppSocket): DisplaySnapshot | null {
  const [snap, setSnap] = useState<DisplaySnapshot | null>(null);
  useEffect(() => {
    const handler = (s: DisplaySnapshot) => setSnap(s);
    socket.on('display:state', handler);
    return () => { socket.off('display:state', handler); };
  }, [socket]);
  return snap;
}
```

- [ ] **Step 2: Replace `client/src/display/DisplayPage.tsx`**

```tsx
import { useMemo } from 'react';
import { createSocket } from '../socket.js';
import { DisplayLobby } from './DisplayLobby.js';
import { useDisplayState } from './useDisplayState.js';

export function DisplayPage() {
  const socket = useMemo(() => createSocket(), []);
  const snap = useDisplayState(socket);

  if (!snap || snap.phase === 'lobby' || snap.phase === 'countdown') {
    return <DisplayLobby socket={socket} snap={snap} />;
  }
  return <div style={{ padding: 24 }}>Game running (renderer comes next)</div>;
}
```

- [ ] **Step 3: Replace `client/src/display/DisplayLobby.tsx`**

```tsx
import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import type { DisplaySnapshot } from '@partyficrim/shared';
import type { AppSocket } from '../socket.js';

interface Props {
  socket: AppSocket;
  snap: DisplaySnapshot | null;
}

export function DisplayLobby({ socket, snap }: Props) {
  const [code, setCode] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    const ensureRoom = () => {
      if (code) return;
      socket.emit('display:create_room', ({ roomCode }) => {
        setCode(roomCode);
        const joinUrl = `${window.location.origin}/play?room=${roomCode}`;
        QRCode.toDataURL(joinUrl, { width: 320, margin: 1 }).then(setQrDataUrl);
      });
    };
    if (socket.connected) ensureRoom();
    else socket.once('connect', ensureRoom);
  }, [socket, code]);

  const playerCount = snap?.players.length ?? 0;
  const countdown = snap?.phase === 'countdown'
    ? Math.ceil(snap.countdownMsRemaining / 1000) : null;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      gap: 32, height: '100vh', flexDirection: 'column',
    }}>
      {countdown !== null ? (
        <div style={{ fontSize: 200, fontWeight: 800 }}>{countdown}</div>
      ) : (
        <>
          <h1 style={{ fontSize: 96, margin: 0, letterSpacing: 16 }}>{code ?? '—'}</h1>
          {qrDataUrl && <img src={qrDataUrl} alt="join QR" width={320} height={320} />}
          <div style={{ fontSize: 24, opacity: 0.7 }}>
            Or visit <code>{window.location.host}/play</code>
          </div>
          <div style={{ fontSize: 28 }}>Waiting for players ({playerCount}/2)</div>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Verify**

Run: `npm run dev`
- Open `/display` → see code, QR, "Waiting for players (0/2)".
- Join from one phone → display says "1/2".
- Join from second phone → display flips to a 3-2-1 countdown then says "Game running (renderer comes next)".

- [ ] **Step 5: Commit**

```bash
git add client/src/display
git commit -m "feat(display): show live player count and countdown"
```

---

## Phase 3 — Movement and rendering

### Task 3.1: Phone joystick (axis-locked) sends input

**Files:**
- Create: `client/src/play/Joystick.tsx`
- Create: `client/src/play/PhoneGame.tsx`
- Modify: `client/src/play/PlayPage.tsx`

- [ ] **Step 1: Create `client/src/play/Joystick.tsx` (dynamic mode — joystick appears at first touch position inside zone)**

```tsx
import { useEffect, useRef } from 'react';
import nipplejs, { type JoystickManager } from 'nipplejs';

interface Props {
  lockAxis: 'x' | 'y' | null;
  onMove: (dx: number, dy: number) => void;
  color: string;
}

export function Joystick({ lockAxis, onMove, color }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    const manager: JoystickManager = nipplejs.create({
      zone: ref.current,
      mode: 'dynamic',     // appears wherever the user first touches inside the zone
      color,
      size: 140,
      lockX: lockAxis === 'x',
      lockY: lockAxis === 'y',
      restJoystick: true,
    });
    manager.on('move', (_e, data) => {
      const v = data.vector;
      onMove(v.x, -v.y); // nipple y is up-positive; we want down-positive
    });
    manager.on('end', () => onMove(0, 0));
    return () => manager.destroy();
  }, [lockAxis, color, onMove]);

  // Zone fills the entire left half of the screen — touch anywhere activates the stick at that point.
  return (
    <div
      ref={ref}
      style={{
        position: 'absolute', top: 0, bottom: 0, left: 0, width: '50%',
        touchAction: 'none', userSelect: 'none',
      }}
    />
  );
}
```

- [ ] **Step 2: Create `client/src/play/PhoneGame.tsx`**

```tsx
import { useEffect, useState, useCallback } from 'react';
import type { PhoneSnapshot, Role } from '@partyficrim/shared';
import type { AppSocket } from '../socket.js';
import { Joystick } from './Joystick.js';

const ROLE_COLOR: Record<Role, string> = { X: '#ff5577', Y: '#55c2ff' };

interface Props { socket: AppSocket; role: Role; roomCode: string; }

export function PhoneGame({ socket, role, roomCode }: Props) {
  const [snap, setSnap] = useState<PhoneSnapshot | null>(null);

  useEffect(() => {
    const h = (s: PhoneSnapshot) => setSnap(s);
    socket.on('phone:state', h);
    return () => { socket.off('phone:state', h); };
  }, [socket]);

  const onMove = useCallback((dx: number, dy: number) => {
    socket.emit('phone:input', { dx, dy });
  }, [socket]);

  const onButton = useCallback(() => socket.emit('phone:button'), [socket]);

  const lockAxis = snap?.mode === 'on_foot' ? null : (role === 'X' ? 'x' : 'y');
  const color = ROLE_COLOR[role];

  return (
    <div style={{
      position: 'fixed', inset: 0, width: '100vw', height: '100vh',
      touchAction: 'none', userSelect: 'none', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', top: 8, left: 0, right: 0, textAlign: 'center',
        color, fontSize: 18, fontWeight: 700, letterSpacing: 1, zIndex: 2,
      }}>
        {role}-axis · Score {snap?.score ?? 0} · Room {roomCode}
      </div>
      <Joystick lockAxis={lockAxis} onMove={onMove} color={color} />
      <button onClick={onButton} style={{
        position: 'absolute', top: 0, bottom: 0, right: 0, width: '50%',
        border: 'none', background: 'rgba(255,255,255,0.06)',
        color, fontSize: 48, fontWeight: 900, letterSpacing: 4,
      }}>
        {snap?.mode === 'on_foot' ? 'ENTER' : 'EXIT'}
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Update `client/src/play/PlayPage.tsx`**

Replace the final `return <PhoneLobby ...` line with:

```tsx
  return snap?.phase === 'lobby' || snap?.phase === 'countdown'
    ? <PhoneLobby role={role} roomCode={roomCode} />
    : <PhoneGame socket={socket} role={role} roomCode={roomCode} />;
```

For this to compile, we need to track phone snapshot state in `PlayPage.tsx`. Add at the top of the component:

```tsx
const [snap, setSnap] = useState<PhoneSnapshot | null>(null);
useEffect(() => {
  const h = (s: PhoneSnapshot) => setSnap(s);
  socket.on('phone:state', h);
  return () => { socket.off('phone:state', h); };
}, [socket]);
```

Add the import:

```tsx
import type { PhoneSnapshot } from '@partyficrim/shared';
import { PhoneGame } from './PhoneGame.js';
```

- [ ] **Step 4: Verify manually**

Run: `npm run dev`
- Open `/display`, join from two phones, wait for countdown.
- Each phone shows joystick + button. X-axis player's joystick should only deflect horizontally; Y-axis only vertically.
- Server log: input events arriving (add `console.log` in `phone:input` if you want to see — remove after).

- [ ] **Step 5: Commit**

```bash
git add client/src/play
git commit -m "feat(phone): axis-locked joystick + button, sends input"
```

---

### Task 3.2: Server applies input to robot velocity (TDD)

**Files:**
- Create: `server/src/game/movement.ts`
- Create: `server/src/game/movement.test.ts`
- Modify: `server/src/game/tick.ts`

- [ ] **Step 1: Write the failing test**

`server/src/game/movement.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { computeRobotVelocity, applyMovement } from './movement.js';
import type { Vec2 } from '@partyficrim/shared';

const SPEED = 200;

describe('computeRobotVelocity', () => {
  it('uses x-input only from X-role player when in robot', () => {
    const v = computeRobotVelocity({
      x: { input: { x: 1, y: 0.7 }, mode: 'in_robot' },
      y: { input: { x: 0.9, y: 1 }, mode: 'in_robot' },
    }, SPEED);
    expect(v.x).toBeCloseTo(SPEED, 5);
    expect(v.y).toBeCloseTo(SPEED, 5);
  });

  it('zeroes the X axis when X-role player is on foot', () => {
    const v = computeRobotVelocity({
      x: { input: { x: 1, y: 0 }, mode: 'on_foot' },
      y: { input: { x: 0, y: 1 }, mode: 'in_robot' },
    }, SPEED);
    expect(v.x).toBe(0);
    expect(v.y).toBeCloseTo(SPEED, 5);
  });

  it('zeroes both axes when both players are on foot', () => {
    const v = computeRobotVelocity({
      x: { input: { x: 1, y: 0 }, mode: 'on_foot' },
      y: { input: { x: 0, y: 1 }, mode: 'on_foot' },
    }, SPEED);
    expect(v).toEqual({ x: 0, y: 0 });
  });
});

describe('applyMovement', () => {
  it('moves position by velocity * dt', () => {
    const pos: Vec2 = { x: 100, y: 100 };
    applyMovement(pos, { x: 200, y: 0 }, 0.1);
    expect(pos.x).toBeCloseTo(120, 5);
    expect(pos.y).toBe(100);
  });
});
```

- [ ] **Step 2: Run, expect failure**

Run: `npm --workspace=server test`
Expected: FAIL — module missing.

- [ ] **Step 3: Create `server/src/game/movement.ts`**

```ts
import type { Mode, Vec2 } from '@partyficrim/shared';

export interface RoleInput {
  input: Vec2; // raw input vector (already magnitude-clamped to <= 1)
  mode: Mode;
}

export function computeRobotVelocity(
  inputs: { x: RoleInput; y: RoleInput },
  speed: number
): Vec2 {
  // X-axis component comes only from X-role player and only if in robot
  const vx = inputs.x.mode === 'in_robot' ? Math.sign(inputs.x.input.x) * Math.min(1, Math.abs(inputs.x.input.x)) : 0;
  const vy = inputs.y.mode === 'in_robot' ? Math.sign(inputs.y.input.y) * Math.min(1, Math.abs(inputs.y.input.y)) : 0;
  // Discrete-style: full speed on each active axis (no magnitude scaling)
  return {
    x: vx === 0 ? 0 : Math.sign(vx) * speed,
    y: vy === 0 ? 0 : Math.sign(vy) * speed,
  };
}

export function applyMovement(pos: Vec2, vel: Vec2, dt: number): void {
  pos.x += vel.x * dt;
  pos.y += vel.y * dt;
}

export function computeOnFootVelocity(input: Vec2, speed: number): Vec2 {
  const m = Math.hypot(input.x, input.y);
  if (m < 0.01) return { x: 0, y: 0 };
  return { x: (input.x / m) * speed, y: (input.y / m) * speed };
}
```

- [ ] **Step 4: Wire into `tickRoom`**

Update `server/src/game/tick.ts` `playing` branch:

```ts
import { computeRobotVelocity, applyMovement, computeOnFootVelocity } from './movement.js';

const ROBOT_SPEED = 200;
const PLAYER_SPEED = 200;

// ...

  if (room.phase === 'playing') {
    if (!allConnected(room)) {
      room.phase = 'paused';
      return;
    }

    const xPlayer = [...room.players.values()].find((p) => p.role === 'X');
    const yPlayer = [...room.players.values()].find((p) => p.role === 'Y');
    if (!xPlayer || !yPlayer) return;

    const robotVel = computeRobotVelocity(
      { x: { input: xPlayer.lastInput, mode: xPlayer.mode },
        y: { input: yPlayer.lastInput, mode: yPlayer.mode } },
      ROBOT_SPEED
    );
    applyMovement(room.robot, robotVel, dt);

    for (const p of [xPlayer, yPlayer]) {
      if (p.mode === 'on_foot') {
        const v = computeOnFootVelocity(p.lastInput, PLAYER_SPEED);
        applyMovement(p.pos, v, dt);
      } else {
        // on-foot players inside robot follow robot position
        p.pos.x = room.robot.x;
        p.pos.y = room.robot.y;
      }
    }
    return;
  }
```

- [ ] **Step 5: Run movement tests, expect pass**

Run: `npm --workspace=server test`
Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add server/src/game
git commit -m "feat(server): apply phone input to robot and on-foot velocity"
```

---

### Task 3.3: Pixi renderer for the arena (display)

**Files:**
- Create: `client/src/display/PixiArena.tsx`
- Modify: `client/src/display/DisplayPage.tsx`

- [ ] **Step 1: Create `client/src/display/PixiArena.tsx`**

```tsx
import { useEffect, useRef } from 'react';
import * as PIXI from 'pixi.js';
import type { DisplaySnapshot } from '@partyficrim/shared';

interface Props { snap: DisplaySnapshot; }

interface Layers {
  floor: PIXI.Graphics;
  obstacles: PIXI.Graphics;
  powerups: PIXI.Graphics;
  robot: PIXI.Graphics;
  players: PIXI.Container;
}

export function PixiArena({ snap }: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const appRef = useRef<PIXI.Application | null>(null);
  const layersRef = useRef<Layers | null>(null);
  const snapRef = useRef(snap);

  // mount once
  useEffect(() => {
    if (!hostRef.current) return;
    const app = new PIXI.Application({
      resizeTo: hostRef.current, background: '#0a0a12', antialias: true,
    });
    hostRef.current.appendChild(app.view as HTMLCanvasElement);
    appRef.current = app;

    const floor = new PIXI.Graphics();
    const obstacles = new PIXI.Graphics();
    const powerups = new PIXI.Graphics();
    const robot = new PIXI.Graphics();
    const players = new PIXI.Container();
    app.stage.addChild(floor, obstacles, powerups, robot, players);
    layersRef.current = { floor, obstacles, powerups, robot, players };

    app.ticker.add(() => render(snapRef.current, layersRef.current!, app));

    return () => { app.destroy(true, { children: true }); appRef.current = null; };
  }, []);

  // keep latest snapshot in ref
  useEffect(() => { snapRef.current = snap; }, [snap]);

  return <div ref={hostRef} style={{ position: 'fixed', inset: 0 }} />;
}

function render(snap: DisplaySnapshot, layers: Layers, app: PIXI.Application) {
  const sw = app.screen.width;
  const sh = app.screen.height;
  const margin = 40;
  const scaleX = (sw - margin * 2) / snap.arena.w;
  const scaleY = (sh - margin * 2) / snap.arena.h;
  const scale = Math.min(scaleX, scaleY);
  const offsetX = (sw - snap.arena.w * scale) / 2;
  const offsetY = (sh - snap.arena.h * scale) / 2;

  const tx = (x: number) => offsetX + x * scale;
  const ty = (y: number) => offsetY + y * scale;
  const ts = (v: number) => v * scale;

  // floor
  layers.floor.clear();
  layers.floor.beginFill(0x1a1a26);
  layers.floor.drawRect(tx(0), ty(0), ts(snap.arena.w), ts(snap.arena.h));
  layers.floor.endFill();
  layers.floor.lineStyle(2, 0x444466).drawRect(tx(0), ty(0), ts(snap.arena.w), ts(snap.arena.h));

  // obstacles
  layers.obstacles.clear();
  layers.obstacles.beginFill(0x444466);
  for (const o of snap.obstacles) layers.obstacles.drawRect(tx(o.x), ty(o.y), ts(o.w), ts(o.h));
  layers.obstacles.endFill();

  // powerups
  layers.powerups.clear();
  layers.powerups.beginFill(0xffe066);
  for (const u of snap.powerups) layers.powerups.drawCircle(tx(u.pos.x), ty(u.pos.y), ts(8));
  layers.powerups.endFill();

  // robot
  layers.robot.clear();
  layers.robot.beginFill(0x88ddaa);
  layers.robot.drawRoundedRect(tx(snap.robot.x) - ts(20), ty(snap.robot.y) - ts(20), ts(40), ts(40), ts(6));
  layers.robot.endFill();

  // on-foot players
  layers.players.removeChildren();
  for (const p of snap.players) {
    if (p.mode !== 'on_foot') continue;
    const g = new PIXI.Graphics();
    g.beginFill(p.role === 'X' ? 0xff5577 : 0x55c2ff);
    g.drawCircle(tx(p.pos.x), ty(p.pos.y), ts(10));
    g.endFill();
    layers.players.addChild(g);
  }
}
```

- [ ] **Step 2: Update `client/src/display/DisplayPage.tsx`**

```tsx
import { useMemo } from 'react';
import { createSocket } from '../socket.js';
import { DisplayLobby } from './DisplayLobby.js';
import { useDisplayState } from './useDisplayState.js';
import { PixiArena } from './PixiArena.js';

export function DisplayPage() {
  const socket = useMemo(() => createSocket(), []);
  const snap = useDisplayState(socket);

  if (!snap || snap.phase === 'lobby' || snap.phase === 'countdown') {
    return <DisplayLobby socket={socket} snap={snap} />;
  }
  return <PixiArena snap={snap} />;
}
```

- [ ] **Step 3: Verify manually**

Run: `npm run dev`
- Two phones join → countdown → display now shows the arena, robot at center, three obstacles.
- Move joysticks → robot moves on the appropriate axis. Walls don't block yet (next task).

- [ ] **Step 4: Commit**

```bash
git add client/src/display
git commit -m "feat(display): render arena, robot, obstacles, powerups via Pixi"
```

---

## Phase 4 — Collisions, exit/enter, powerups

### Task 4.1: AABB collision resolution (TDD)

**Files:**
- Create: `server/src/game/collision.ts`
- Create: `server/src/game/collision.test.ts`
- Modify: `server/src/game/tick.ts`

- [ ] **Step 1: Write the failing test**

`server/src/game/collision.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { resolveCollisions } from './collision.js';
import type { Rect, Vec2 } from '@partyficrim/shared';

describe('resolveCollisions', () => {
  const arena: Rect = { x: 0, y: 0, w: 800, h: 600 };
  const half = 20;

  it('clamps to arena bounds', () => {
    const pos: Vec2 = { x: -10, y: 700 };
    resolveCollisions(pos, half, [], arena);
    expect(pos.x).toBe(half);
    expect(pos.y).toBe(arena.h - half);
  });

  it('pushes out of an obstacle along smaller axis', () => {
    const pos: Vec2 = { x: 105, y: 100 };
    const obstacles: Rect[] = [{ x: 100, y: 80, w: 60, h: 60 }]; // x∈[100,160], y∈[80,140]
    resolveCollisions(pos, half, obstacles, arena);
    // overlap on x=5 to right edge 160-(105-20)=75, so pen-x to right=75 vs left=(105+20)-100=25; smaller -> push left to x = 100 - half = 80
    expect(pos.x).toBeLessThanOrEqual(80 + 0.001);
  });

  it('does nothing when no overlap', () => {
    const pos: Vec2 = { x: 50, y: 50 };
    const obstacles: Rect[] = [{ x: 200, y: 200, w: 60, h: 60 }];
    resolveCollisions(pos, half, obstacles, arena);
    expect(pos).toEqual({ x: 50, y: 50 });
  });
});
```

- [ ] **Step 2: Run, expect failure**

Run: `npm --workspace=server test`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `server/src/game/collision.ts`**

```ts
import type { Rect, Vec2 } from '@partyficrim/shared';

export function resolveCollisions(pos: Vec2, half: number, obstacles: Rect[], arena: Rect): void {
  // clamp to arena
  pos.x = Math.max(arena.x + half, Math.min(arena.x + arena.w - half, pos.x));
  pos.y = Math.max(arena.y + half, Math.min(arena.y + arena.h - half, pos.y));

  // push out of obstacles
  for (const o of obstacles) {
    const left = o.x, right = o.x + o.w, top = o.y, bottom = o.y + o.h;
    const eLeft = pos.x - half, eRight = pos.x + half, eTop = pos.y - half, eBottom = pos.y + half;
    if (eRight <= left || eLeft >= right || eBottom <= top || eTop >= bottom) continue;

    const penLeft = eRight - left;
    const penRight = right - eLeft;
    const penTop = eBottom - top;
    const penBottom = bottom - eTop;
    const minPen = Math.min(penLeft, penRight, penTop, penBottom);
    if (minPen === penLeft) pos.x -= penLeft;
    else if (minPen === penRight) pos.x += penRight;
    else if (minPen === penTop) pos.y -= penTop;
    else pos.y += penBottom;
  }
}
```

- [ ] **Step 4: Run, expect pass**

Run: `npm --workspace=server test`
Expected: all PASS.

- [ ] **Step 5: Wire into `tickRoom` `playing` branch**

In `server/src/game/tick.ts`, after `applyMovement` calls, add collision resolution:

```ts
import { resolveCollisions } from './collision.js';

const ROBOT_HALF = 20;
const PLAYER_HALF = 10;

// inside playing branch, after applyMovement(room.robot, ...):
resolveCollisions(room.robot, ROBOT_HALF, room.obstacles, room.arena);

// inside the player loop, after applyMovement on on_foot:
resolveCollisions(p.pos, PLAYER_HALF, room.obstacles, room.arena);
```

- [ ] **Step 6: Manual smoke test**

Run: `npm run dev`. Drive the robot into walls and obstacles — it should stop, not pass through.

- [ ] **Step 7: Commit**

```bash
git add server/src/game
git commit -m "feat(server): AABB collision resolution for robot and players"
```

---

### Task 4.2: Exit / enter robot with proximity check (TDD)

**Files:**
- Create: `server/src/game/exit_enter.ts`
- Create: `server/src/game/exit_enter.test.ts`
- Modify: `server/src/game/tick.ts`

- [ ] **Step 1: Write the failing test**

`server/src/game/exit_enter.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { handleButton, isNearRobot } from './exit_enter.js';
import type { Vec2 } from '@partyficrim/shared';

const ROBOT_POS: Vec2 = { x: 100, y: 100 };
const TILE = 32;

describe('isNearRobot', () => {
  it('true within 1 tile', () => {
    expect(isNearRobot({ x: 110, y: 110 }, ROBOT_POS, TILE)).toBe(true);
  });
  it('false beyond 1 tile', () => {
    expect(isNearRobot({ x: 200, y: 200 }, ROBOT_POS, TILE)).toBe(false);
  });
});

describe('handleButton', () => {
  it('exits when in_robot — sets mode to on_foot and offsets pos', () => {
    const player = { mode: 'in_robot' as const, pos: { x: ROBOT_POS.x, y: ROBOT_POS.y } };
    handleButton(player, ROBOT_POS, TILE);
    expect(player.mode).toBe('on_foot');
    expect(Math.hypot(player.pos.x - ROBOT_POS.x, player.pos.y - ROBOT_POS.y)).toBeGreaterThan(0);
  });

  it('enters when on_foot AND near robot', () => {
    const player = { mode: 'on_foot' as const, pos: { x: ROBOT_POS.x + 10, y: ROBOT_POS.y } };
    handleButton(player, ROBOT_POS, TILE);
    expect(player.mode).toBe('in_robot');
  });

  it('does not enter when on_foot AND far from robot', () => {
    const player = { mode: 'on_foot' as const, pos: { x: 500, y: 500 } };
    handleButton(player, ROBOT_POS, TILE);
    expect(player.mode).toBe('on_foot');
  });
});
```

- [ ] **Step 2: Run, expect failure**

Run: `npm --workspace=server test`

- [ ] **Step 3: Implement `server/src/game/exit_enter.ts`**

```ts
import type { Mode, Vec2 } from '@partyficrim/shared';

export function isNearRobot(pos: Vec2, robot: Vec2, tile: number): boolean {
  return Math.hypot(pos.x - robot.x, pos.y - robot.y) <= tile;
}

export interface MutablePlayer {
  mode: Mode;
  pos: Vec2;
}

export function handleButton(player: MutablePlayer, robot: Vec2, tile: number): void {
  if (player.mode === 'in_robot') {
    player.mode = 'on_foot';
    player.pos.x = robot.x + tile; // offset 1 tile right
    player.pos.y = robot.y;
    return;
  }
  if (player.mode === 'on_foot' && isNearRobot(player.pos, robot, tile)) {
    player.mode = 'in_robot';
  }
}
```

- [ ] **Step 4: Wire into the tick**

In `server/src/game/tick.ts`, before the per-player movement loop in the `playing` branch, process pending button presses:

```ts
import { handleButton, isNearRobot } from './exit_enter.js';

const TILE = 32;

// after the role lookup:
for (const p of [xPlayer, yPlayer]) {
  if (p.lastButtonAt > 0) {
    handleButton(p, room.robot, TILE);
    p.lastButtonAt = 0;
  }
}
```

Also update `buildPhoneSnapshot` to set `nearRobot`:

```ts
import { isNearRobot } from './exit_enter.js';
const TILE = 32;

export function buildPhoneSnapshot(room: Room, playerId: string): PhoneSnapshot {
  // ...existing...
  const me = room.players.get(playerId)!;
  return {
    // ...
    nearRobot: me.mode === 'on_foot' ? isNearRobot(me.pos, room.robot, TILE) : true,
  };
}
```

- [ ] **Step 5: Run tests, expect pass**

Run: `npm --workspace=server test`

- [ ] **Step 6: Update phone UI to grey out the ENTER button when not near**

In `client/src/play/PhoneGame.tsx`, change the button:

```tsx
const enterDisabled = snap?.mode === 'on_foot' && !snap.nearRobot;
// ...
<button
  onClick={onButton}
  disabled={enterDisabled}
  style={{
    width: 160, height: 160, borderRadius: '50%', border: 'none',
    background: enterDisabled ? '#444' : color, color: '#fff', fontSize: 24, fontWeight: 700,
    opacity: enterDisabled ? 0.5 : 1,
  }}
>
  {snap?.mode === 'on_foot' ? 'ENTER' : 'EXIT'}
</button>
```

- [ ] **Step 7: Manual smoke test**

Run: `npm run dev`. Press EXIT — your role color appears next to the robot, joystick unlocks, button shows ENTER. Walk away → ENTER greys out. Walk back → ENTER lights up. Press ENTER → re-enters robot. The other player can keep moving the robot on their axis the whole time.

- [ ] **Step 8: Commit**

```bash
git add server/src/game client/src/play/PhoneGame.tsx
git commit -m "feat: exit/enter robot with proximity check and disabled button"
```

---

### Task 4.3: Powerup spawn and pickup (TDD)

**Files:**
- Create: `server/src/game/powerups.ts`
- Create: `server/src/game/powerups.test.ts`
- Modify: `server/src/game/tick.ts`

- [ ] **Step 1: Write the failing test**

`server/src/game/powerups.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { trySpawnPowerup, processPickups, POWERUP_RADIUS } from './powerups.js';
import type { PowerupState, Rect, Vec2 } from '@partyficrim/shared';

describe('trySpawnPowerup', () => {
  it('spawns when interval elapsed and below cap', () => {
    const pwr = new Map<string, PowerupState>();
    const out = trySpawnPowerup({
      now: 5000, lastSpawnAt: 0, intervalMs: 3000, max: 5,
      arena: { x: 0, y: 0, w: 200, h: 200 }, obstacles: [], existing: pwr,
    });
    expect(out).not.toBeNull();
    expect(pwr.size).toBe(1);
  });

  it('does not spawn before interval', () => {
    const pwr = new Map<string, PowerupState>();
    const out = trySpawnPowerup({
      now: 1000, lastSpawnAt: 0, intervalMs: 3000, max: 5,
      arena: { x: 0, y: 0, w: 200, h: 200 }, obstacles: [], existing: pwr,
    });
    expect(out).toBeNull();
  });

  it('does not spawn when at cap', () => {
    const pwr = new Map<string, PowerupState>();
    for (let i = 0; i < 5; i++) pwr.set(`${i}`, { id: `${i}`, pos: { x: 50 + i * 10, y: 50 } });
    const out = trySpawnPowerup({
      now: 5000, lastSpawnAt: 0, intervalMs: 3000, max: 5,
      arena: { x: 0, y: 0, w: 200, h: 200 }, obstacles: [], existing: pwr,
    });
    expect(out).toBeNull();
  });
});

describe('processPickups', () => {
  it('removes powerups overlapping any pickup pos and returns count', () => {
    const pwr = new Map<string, PowerupState>([
      ['a', { id: 'a', pos: { x: 100, y: 100 } }],
      ['b', { id: 'b', pos: { x: 500, y: 500 } }],
    ]);
    const positions: { pos: Vec2; half: number }[] = [
      { pos: { x: 100, y: 100 }, half: 20 },
    ];
    const picked = processPickups(pwr, positions);
    expect(picked).toBe(1);
    expect(pwr.has('a')).toBe(false);
    expect(pwr.has('b')).toBe(true);
  });
});
```

- [ ] **Step 2: Run, expect failure**

- [ ] **Step 3: Implement `server/src/game/powerups.ts`**

```ts
import type { PowerupState, Rect, Vec2 } from '@partyficrim/shared';
import { randomUUID } from 'node:crypto';

export const POWERUP_RADIUS = 8;

interface SpawnArgs {
  now: number;
  lastSpawnAt: number;
  intervalMs: number;
  max: number;
  arena: Rect;
  obstacles: Rect[];
  existing: Map<string, PowerupState>;
}

function rectsOverlap(a: { x: number; y: number; w: number; h: number },
                     b: { x: number; y: number; w: number; h: number }): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function trySpawnPowerup(args: SpawnArgs): PowerupState | null {
  if (args.now - args.lastSpawnAt < args.intervalMs) return null;
  if (args.existing.size >= args.max) return null;

  const margin = POWERUP_RADIUS + 4;
  for (let attempt = 0; attempt < 30; attempt++) {
    const x = args.arena.x + margin + Math.random() * (args.arena.w - margin * 2);
    const y = args.arena.y + margin + Math.random() * (args.arena.h - margin * 2);
    const box = { x: x - POWERUP_RADIUS, y: y - POWERUP_RADIUS, w: POWERUP_RADIUS * 2, h: POWERUP_RADIUS * 2 };
    if (args.obstacles.some((o) => rectsOverlap(box, o))) continue;
    let collision = false;
    for (const p of args.existing.values()) {
      if (Math.hypot(p.pos.x - x, p.pos.y - y) < POWERUP_RADIUS * 3) { collision = true; break; }
    }
    if (collision) continue;
    const id = randomUUID();
    const pwr: PowerupState = { id, pos: { x, y } };
    args.existing.set(id, pwr);
    return pwr;
  }
  return null;
}

export function processPickups(
  pwrs: Map<string, PowerupState>,
  pickers: { pos: Vec2; half: number }[]
): number {
  let count = 0;
  for (const [id, p] of pwrs) {
    for (const picker of pickers) {
      const dx = Math.abs(picker.pos.x - p.pos.x);
      const dy = Math.abs(picker.pos.y - p.pos.y);
      if (dx <= picker.half + POWERUP_RADIUS && dy <= picker.half + POWERUP_RADIUS) {
        pwrs.delete(id);
        count++;
        break;
      }
    }
  }
  return count;
}
```

- [ ] **Step 4: Run tests, expect pass**

Run: `npm --workspace=server test`

- [ ] **Step 5: Wire into `tickRoom` and `Room`**

Add `lastPowerupSpawnAt` to the Room. In `server/src/game/rooms.ts` add the field to the `Room` interface and initialize to `0`:

```ts
export interface Room {
  // ...existing...
  lastPowerupSpawnAt: number;
}
```

In `createRoom`:

```ts
lastPowerupSpawnAt: 0,
```

In `server/src/game/tick.ts`, inside the `playing` branch after collision resolution:

```ts
import { trySpawnPowerup, processPickups, POWERUP_RADIUS } from './powerups.js';
const POWERUP_INTERVAL_MS = 3000;
const POWERUP_MAX = 5;

// after movement+collision in playing branch:
const now = Date.now();
const spawned = trySpawnPowerup({
  now, lastSpawnAt: room.lastPowerupSpawnAt, intervalMs: POWERUP_INTERVAL_MS,
  max: POWERUP_MAX, arena: room.arena, obstacles: room.obstacles, existing: room.powerups,
});
if (spawned) room.lastPowerupSpawnAt = now;

const pickers: { pos: { x: number; y: number }; half: number }[] = [
  { pos: room.robot, half: ROBOT_HALF },
];
for (const p of [xPlayer, yPlayer]) {
  if (p.mode === 'on_foot') pickers.push({ pos: p.pos, half: PLAYER_HALF });
}
const picked = processPickups(room.powerups, pickers);
room.score += picked;
```

- [ ] **Step 6: Manual smoke test**

Run: `npm run dev`. Wait — yellow orbs appear every ~3s. Drive into one → it disappears. Score on phone increments. Maximum 5 on screen at any time.

- [ ] **Step 7: Commit**

```bash
git add server/src/game
git commit -m "feat(server): powerup spawn (3s, max 5) and pickup with shared score"
```

---

### Task 4.4: Phone landscape lock + fullscreen + portrait warning

**Files:**
- Create: `client/src/play/useLandscape.ts`
- Modify: `client/src/play/PhoneGame.tsx`
- Modify: `client/src/play/PhoneLobby.tsx`

- [ ] **Step 1: Create `client/src/play/useLandscape.ts`**

```ts
import { useEffect, useState, useCallback } from 'react';

export function useLandscape() {
  const [isLandscape, setIsLandscape] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(orientation: landscape)').matches
  );

  useEffect(() => {
    const mq = window.matchMedia('(orientation: landscape)');
    const onChange = () => setIsLandscape(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const enterFullscreenLandscape = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      }
    } catch { /* ignore — Safari may refuse */ }
    try {
      // Not in standard TS DOM lib for some targets
      const so = (screen as unknown as { orientation?: { lock?: (o: string) => Promise<void> } }).orientation;
      if (so?.lock) await so.lock('landscape');
    } catch { /* iOS refuses; user must rotate manually */ }
  }, []);

  return { isLandscape, enterFullscreenLandscape };
}
```

- [ ] **Step 2: Update `client/src/play/PhoneLobby.tsx` to add a "Tap to start" button that triggers fullscreen+orientation**

```tsx
import type { Role } from '@partyficrim/shared';
import { useLandscape } from './useLandscape.js';

const ROLE_COLOR: Record<Role, string> = { X: '#ff5577', Y: '#55c2ff' };

export function PhoneLobby({ role, roomCode }: { role: Role; roomCode: string }) {
  const { enterFullscreenLandscape } = useLandscape();
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      height: '100vh', gap: 24, padding: 24, textAlign: 'center',
    }}>
      <div style={{ fontSize: 18, opacity: 0.7 }}>Room {roomCode}</div>
      <div style={{ fontSize: 36 }}>You are</div>
      <div style={{ fontSize: 96, fontWeight: 800, color: ROLE_COLOR[role] }}>{role}-axis</div>
      <button onClick={enterFullscreenLandscape} style={{
        padding: '16px 32px', fontSize: 24, borderRadius: 12, border: 'none',
        background: ROLE_COLOR[role], color: '#fff', fontWeight: 700,
      }}>
        Tap to enter fullscreen
      </button>
      <div style={{ fontSize: 16, opacity: 0.6 }}>Hold phone in landscape · waiting for other player…</div>
    </div>
  );
}
```

- [ ] **Step 3: Update `client/src/play/PhoneGame.tsx` for landscape layout + portrait warning**

```tsx
import { useEffect, useState, useCallback } from 'react';
import type { PhoneSnapshot, Role } from '@partyficrim/shared';
import type { AppSocket } from '../socket.js';
import { Joystick } from './Joystick.js';
import { useLandscape } from './useLandscape.js';

const ROLE_COLOR: Record<Role, string> = { X: '#ff5577', Y: '#55c2ff' };

interface Props { socket: AppSocket; role: Role; roomCode: string; }

export function PhoneGame({ socket, role, roomCode }: Props) {
  const [snap, setSnap] = useState<PhoneSnapshot | null>(null);
  const { isLandscape, enterFullscreenLandscape } = useLandscape();

  useEffect(() => {
    const h = (s: PhoneSnapshot) => setSnap(s);
    socket.on('phone:state', h);
    return () => { socket.off('phone:state', h); };
  }, [socket]);

  const onMove = useCallback((dx: number, dy: number) => {
    socket.emit('phone:input', { dx, dy });
  }, [socket]);

  const onButton = useCallback(() => socket.emit('phone:button'), [socket]);

  const lockAxis = snap?.mode === 'on_foot' ? null : (role === 'X' ? 'x' : 'y');
  const color = ROLE_COLOR[role];
  const enterDisabled = snap?.mode === 'on_foot' && !snap.nearRobot;

  if (!isLandscape) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        height: '100vh', padding: 24, textAlign: 'center', gap: 16,
      }}>
        <div style={{ fontSize: 64 }}>🔄</div>
        <div style={{ fontSize: 28, fontWeight: 700, color }}>Rotate your phone</div>
        <div style={{ fontSize: 18, opacity: 0.6 }}>partyficRim is played in landscape</div>
        <button onClick={enterFullscreenLandscape} style={{
          marginTop: 12, padding: '12px 24px', fontSize: 18, borderRadius: 10,
          border: 'none', background: color, color: '#fff', fontWeight: 700,
        }}>
          Enter fullscreen
        </button>
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, width: '100vw', height: '100vh',
      touchAction: 'none', userSelect: 'none', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', top: 8, left: 0, right: 0, textAlign: 'center',
        color, fontSize: 18, fontWeight: 800, letterSpacing: 1, zIndex: 2,
      }}>
        {role}-axis · Score {snap?.score ?? 0}
      </div>
      {/* left half is the joystick zone (component positions itself absolutely) */}
      <Joystick lockAxis={lockAxis} onMove={onMove} color={color} />
      {/* right half: tap-anywhere button */}
      <button
        onClick={onButton}
        disabled={enterDisabled}
        style={{
          position: 'absolute', top: 0, bottom: 0, right: 0, width: '50%',
          border: 'none',
          background: enterDisabled ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.06)',
          color: enterDisabled ? '#666' : color,
          fontSize: 48, fontWeight: 900, letterSpacing: 4,
          touchAction: 'none', cursor: 'pointer',
        }}
      >
        {snap?.mode === 'on_foot' ? 'ENTER' : 'EXIT'}
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Manual verify**

Run: `npm run dev`. On a phone:
- Joining shows "Tap to enter fullscreen" — tap it, page goes fullscreen.
- Holding portrait shows the rotate warning. Rotating to landscape brings up the joystick + button.
- iOS Safari may refuse orientation lock; the rotate warning remains the fallback. Document in README.

- [ ] **Step 5: Commit**

```bash
git add client/src/play
git commit -m "feat(phone): landscape lock, fullscreen on tap, portrait warning"
```

---

## Phase 5 — HUD polish

### Task 5.1: Display HUD overlay (occupancy, score, room code)

**Files:**
- Create: `client/src/display/HudOverlay.tsx`
- Modify: `client/src/display/DisplayPage.tsx`

- [ ] **Step 1: Create `client/src/display/HudOverlay.tsx`**

```tsx
import type { DisplaySnapshot, Mode, Role } from '@partyficrim/shared';

const ROLE_COLOR: Record<Role, string> = { X: '#ff5577', Y: '#55c2ff' };

function modeLabel(m: Mode): string {
  return m === 'in_robot' ? 'in robot' : 'on foot';
}

export function HudOverlay({ snap }: { snap: DisplaySnapshot }) {
  const x = snap.players.find((p) => p.role === 'X');
  const y = snap.players.find((p) => p.role === 'Y');

  return (
    <div style={{
      position: 'fixed', inset: 0, pointerEvents: 'none', padding: 24,
      display: 'grid', gridTemplateColumns: '1fr 1fr', alignItems: 'start',
    }}>
      <div style={{ display: 'flex', gap: 24, fontSize: 24 }}>
        <Slot role="X" color={ROLE_COLOR.X} mode={x?.mode} />
        <Slot role="Y" color={ROLE_COLOR.Y} mode={y?.mode} />
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontSize: 18, opacity: 0.6 }}>Score</div>
        <div style={{ fontSize: 64, fontWeight: 800 }}>{snap.score}</div>
        <div style={{ fontSize: 14, opacity: 0.5 }}>Room {snap.roomCode}</div>
      </div>
      {snap.phase === 'paused' && (
        <div style={{
          position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 48, color: '#fff',
        }}>
          Paused — waiting for reconnect
        </div>
      )}
    </div>
  );
}

function Slot({ role, color, mode }: { role: Role; color: string; mode: Mode | undefined }) {
  return (
    <div style={{
      border: `2px solid ${color}`, borderRadius: 8, padding: '8px 16px',
      color, fontWeight: 700,
    }}>
      {role}-axis: {mode ? modeLabel(mode) : '—'}
    </div>
  );
}
```

- [ ] **Step 2: Update `client/src/display/DisplayPage.tsx`**

```tsx
import { useMemo } from 'react';
import { createSocket } from '../socket.js';
import { DisplayLobby } from './DisplayLobby.js';
import { useDisplayState } from './useDisplayState.js';
import { PixiArena } from './PixiArena.js';
import { HudOverlay } from './HudOverlay.js';

export function DisplayPage() {
  const socket = useMemo(() => createSocket(), []);
  const snap = useDisplayState(socket);

  if (!snap || snap.phase === 'lobby' || snap.phase === 'countdown') {
    return <DisplayLobby socket={socket} snap={snap} />;
  }
  return (
    <>
      <PixiArena snap={snap} />
      <HudOverlay snap={snap} />
    </>
  );
}
```

- [ ] **Step 3: Manual verify**

Run: `npm run dev`. Score panel and occupancy slots are visible during play. Disconnect a phone → "Paused" overlay. Reconnect → resumes.

- [ ] **Step 4: Commit**

```bash
git add client/src/display
git commit -m "feat(display): HUD overlay with occupancy, score, paused banner"
```

---

### Task 5.2: Phone reconnect smoke test + pickup-counter polish

**Files:**
- (No new files; manual verification only)

- [ ] **Step 1: Reconnect test**

- Start two phones playing.
- Force-quit the browser tab on one phone, reopen `https://<lan-ip>:5173/play`. The phone has the room code in localStorage history; if not, it should re-enter via the previous URL still in history. Verify it auto-rejoins as the same role and the game resumes.

If the reconnect requires re-entering the room code, this is acceptable for MVP — write down a note in `README.md`.

- [ ] **Step 2: Optional — tighten the score number font on phones**

In `client/src/play/PhoneGame.tsx`, increase the top bar prominence:

```tsx
<div style={{
  position: 'absolute', top: 12, left: 0, right: 0, textAlign: 'center',
  color, fontSize: 22, fontWeight: 800, letterSpacing: 1,
}}>
  {role}-axis · Score {snap?.score ?? 0}
</div>
```

- [ ] **Step 3: Commit any tweaks**

```bash
git add -u
git diff --cached --quiet || git commit -m "chore(phone): polish header"
```

---

## Phase 6 — Wrap-up

### Task 6.1: README with run instructions

**Files:**
- Create: `README.md`

- [ ] **Step 1: Create `README.md`**

```markdown
# partyficRim

Asymmetric coop arena game (MVP). One display + two phones.

## Setup

```
brew install mkcert
mkcert -install
mkdir -p .cert
mkcert -key-file .cert/key.pem -cert-file .cert/cert.pem localhost 127.0.0.1 ::1 $(ipconfig getifaddr en0)
npm install
```

## Run

```
npm run dev
```

Then:
- On the laptop, open `https://localhost:5173/display`.
- On phones (same Wi-Fi), scan the QR or visit `https://<your-lan-ip>:5173/play`.

## Architecture

See [docs/superpowers/specs/2026-05-01-partyficrim-mvp-design.md](docs/superpowers/specs/2026-05-01-partyficrim-mvp-design.md).

## Tests

```
npm test
```
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add README with setup and run instructions"
```

---

### Task 6.2: Final smoke test against acceptance criteria

- [ ] **Step 1: Run through the spec acceptance**

Confirm by playing for ~2 minutes:

- [ ] Open display → 4-letter code + QR appear
- [ ] Two phones join → countdown → arena appears
- [ ] Each phone's joystick locks to its axis when in robot
- [ ] Pressing EXIT spawns role-colored character; joystick unlocks
- [ ] Robot can still be moved on the other axis by the in-robot player
- [ ] Walking far → ENTER button greys out
- [ ] Walking back → ENTER button lights up; pressing it returns to robot
- [ ] Yellow powerups spawn every ~3s, capped at 5; pickup increments shared score
- [ ] Disconnecting a phone pauses the game; reconnecting resumes it
- [ ] Robot and on-foot players collide with arena bounds and obstacles

If any item fails, file it as a follow-up task and fix before declaring MVP done.

- [ ] **Step 2: Tag the MVP**

```bash
git tag -a mvp -m "partyficRim MVP feature-complete"
```

---

## Acceptance summary

When all phases pass their manual smoke tests and `npm test` is green, the MVP is complete.
