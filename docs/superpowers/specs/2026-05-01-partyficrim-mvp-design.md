# partyficRim MVP — Design

## 1. Concept

partyficRim is an asymmetric cooperative party game played in a browser. One **display** screen (TV, monitor, or browser window) shows the isometric arena and is where everyone watches the action. Two players join from their phones and share control of a single robot — one player controls movement on the X axis, the other on the Y axis. Either player can exit the robot at any time and run around freely on foot.

The MVP has no enemies, no waves, and no win condition. It exists to validate the core mechanics: split-axis robot control, exit/re-enter, and shared powerup collection on a server-authoritative isometric arena.

## 2. Tech stack

| Concern | Choice | Notes |
|---|---|---|
| Bundler / dev server | Vite + TypeScript | Fast dev loop, zero-config TS, HTTPS via mkcert |
| Display rendering | PixiJS canvas + thin React overlay | Canvas does the arena; React does room code, QR, occupancy panel, score |
| Phone UI | React (DOM only, no canvas) | Reactive forms, simple to build and style |
| Joystick component | `nipplejs` | Mobile-tested, supports axis-locking out of the box |
| QR code generation | `qrcode` npm package | Used on display |
| Server runtime | Node + Express + Socket.IO, TypeScript | Real-time bidirectional, room/namespace abstractions |
| Local HTTPS | `mkcert` | Required so phone Safari allows camera (QR scan) on local IP |
| Post-MVP deploy | Render | Free tier sufficient; not a day-one task |

No database. Rooms live in server memory and disappear on restart.

## 3. Repository layout

```
partyficRim/
  client/                     # Vite + React + Pixi
    src/
      display/                # /display route — Pixi canvas + overlays
      play/                   # /play route — phone UI
      shared/                 # client-side helpers / hooks
  server/                     # Node + Express + Socket.IO
    src/
      game/                   # game loop, collision, spawn logic
      net/                    # socket handlers, room management
  shared/                     # cross-cutting types (events, state shape)
  package.json                # workspaces root
```

A single `package.json` with pnpm/npm workspaces. One repo, one deployment artifact eventually.

## 4. Architecture

The server is **fully authoritative**. The display is a dumb renderer of server state. Phones are dumb input controllers.

### 4.1 Server game loop

- Fixed tick at **30Hz**.
- Each tick: read latest input from each connected phone, advance simulation, run collision resolution, spawn/despawn powerups, broadcast snapshot to the display, send lighter per-player updates to phones.
- Canonical state held in memory per room:
  - `robot: { x, y }`
  - `players: [{ id, sessionId, role: 'X' | 'Y', mode: 'in_robot' | 'on_foot', x, y }]`
  - `powerups: [{ id, x, y }]`
  - `score: number`
  - `obstacles: [{ x, y, w, h }]` — static, defined per arena
  - `phase: 'lobby' | 'countdown' | 'playing' | 'paused'`
  - `lastInputs: { [playerId]: { dx, dy, buttonPressed } }`

### 4.2 Wire protocol (Socket.IO events)

Display → server:
- `display:create_room` → server returns `{ roomCode }`

Phone → server:
- `phone:join` `{ roomCode, sessionId? }` → server returns `{ role, sessionId }` or error
- `phone:input` `{ dx, dy }` — analog vector from joystick (server quantizes)
- `phone:button` — exit/enter request

Server → display:
- `display:state` — full snapshot every tick (positions, score, occupancy, phase, powerups)

Server → phones:
- `phone:state` — lighter update: own role, occupancy summary, score, phase

### 4.3 Rendering

- Display: Pixi stage with isometric tile background, obstacle sprites, robot sprite, on-foot player sprite(s), powerup orbs. React overlays sit on top: room code, QR, occupancy panel ("X-axis: 🤖 in robot", "Y-axis: 🏃 on foot"), shared score, "waiting" / "paused" banners.
- Phone: React-only, **landscape-orientation only**, **fullscreen** on first tap. The screen is split into two halves: the **left half is the joystick zone**, the **right half is the exit/enter button zone**. The joystick uses nipplejs's **dynamic mode** — it appears wherever the user first touches inside the left half and follows that finger, so the player can place their thumb anywhere comfortable without looking at the phone. The right half is a single large tap-anywhere button. Joystick is locked to assigned axis when in the robot, unlocked when on foot. Score and role label live in a small top-center header. If the phone is held in portrait, the page shows a "Rotate your phone" prompt and the joystick is hidden until landscape is detected. Fullscreen is requested via `document.documentElement.requestFullscreen()` on the first user gesture (the "Tap to start" button shown after joining the lobby). Orientation lock is attempted via `screen.orientation.lock('landscape')` after fullscreen is granted; if the platform refuses (iOS Safari does), the rotate prompt remains the fallback.
- No client-side prediction or interpolation. Latest snapshot is rendered as-is.

## 5. Game mechanics

### 5.1 Movement

- One fixed speed for everyone. No magnitude — joystick provides a direction only.
- In robot: phone joystick is axis-locked. X-role player's input contributes only to robot's X velocity; Y-role player's input contributes only to robot's Y velocity. The robot's velocity each tick is `(xPlayerInput.dx, yPlayerInput.dy)` normalized to fixed speed per axis.
- On foot: joystick is unlocked. Player moves in the direction of the joystick at the same fixed speed.
- A player's joystick controls **either** the robot **or** their on-foot character based on `mode`, never both. When a player exits the robot, the robot loses input on that player's axis and stops moving on that axis (zero velocity component). The other axis, owned by the player still in the robot, continues to function normally. When the player re-enters, robot input on their axis resumes. (Per design discussion Q3-B.)

### 5.2 Exit and re-entry

- Exit: pressing the button while `mode === 'in_robot'` immediately spawns the on-foot character at the robot's current position (offset by ~1 tile to avoid overlap), sets `mode = 'on_foot'`. The robot stops on this player's axis; the other axis remains controlled by the in-robot player.
- Re-entry: pressing the button while `mode === 'on_foot'` is only honored if the player's on-foot position is within `1 tile` (Euclidean distance) of the robot. On success, the on-foot character is removed and `mode = 'in_robot'`. Otherwise the press is ignored.
- The phone UI label and icon flip between "Exit" and "Enter" based on `mode`.

### 5.3 Collisions

- Hand-rolled axis-aligned bounding box (AABB) resolution on the server.
- Each tick, after applying intended velocity, the entity's AABB is checked against every obstacle's AABB. Overlap is resolved by pushing the entity back along the smallest axis of penetration.
- Same logic applies to the robot and to on-foot players. Robot and on-foot players do not collide with each other.
- A spatial hash is **not** required for MVP — entity count is small.

### 5.4 Powerups

- Spawn rate: one every 3 seconds while `phase === 'playing'`.
- Max simultaneous: 5 on the map.
- Spawn position: uniformly random within arena bounds, rejection-sampled to avoid overlapping obstacles or other powerups.
- Pickup: on AABB overlap with the robot or any on-foot player. Increments `score` (shared counter). Removed from the map.
- Visual: glowing colored circle, easy to spot.

### 5.5 No game-over

The MVP has no end state. Players play indefinitely. The host can refresh the display to start a new room.

## 6. Lobby and game flow

1. Host opens `https://<host>:3000/display`. Display emits `display:create_room`. Server returns a 4-letter alphanumeric room code (e.g. `ABCD`). Display shows code + QR (encoding `https://<host>:3000/play?room=ABCD`) + "Waiting for players (0/2)". Phase: `lobby`.
2. Player scans QR or types code at `/play`. Phone emits `phone:join`. If `sessionId` is present in `localStorage`, it is sent and used to resume an existing slot. Otherwise the server assigns the next free role (X first, then Y) and a fresh `sessionId`, returned to the phone for storage.
3. When 2 players are joined, server transitions to `countdown` phase. Display shows "Starting in 3… 2… 1…". After 3 seconds: `phase = 'playing'` and the game loop runs.
4. During play: phone shows joystick + button + score + role label. Display shows arena + robot + players + powerups + occupancy panel + score.
5. On any disconnect during `playing`: `phase = 'paused'`. Display shows "Player N disconnected — waiting for reconnect." Game loop continues to tick (no movement, just timekeeping). When that `sessionId` rejoins, `phase = 'playing'` again.

### Role assignment

By join order. P1 = X-axis, P2 = Y-axis. Roles are sticky per `sessionId`.

## 7. Out of scope for MVP

These are explicitly deferred:

- Enemies, waves, AI, pathfinding
- Win or lose conditions
- Powerup effects beyond incrementing the counter
- More than 2 players per room
- More than 1 active room at a time on a single server (we can accept this limitation initially; the code should not preclude multi-room but does not need to be tested for it)
- Sound, music, animations beyond basic sprite movement
- Persistence, accounts, leaderboards
- Custom arenas / level editor
- Mobile fullscreen / install prompt / PWA shell
- Accessibility passes beyond what React+Pixi give for free
- Internationalization

## 8. Risks and open items

- **Latency on cellular**: not a concern for local Wi-Fi MVP. If we deploy to Render later, on-foot input may feel laggy without interpolation. Acceptable for MVP demo; revisit if it becomes painful.
- **iOS Safari and HTTPS**: phone camera (for QR scan) requires HTTPS. `mkcert` is the local solution. Manual room-code entry is the fallback.
- **Sprite assets**: starting with primitives or AI-generated/Kenney.nl free isometric assets. Visual polish is post-MVP.
