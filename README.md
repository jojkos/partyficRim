# partyficRIM

A cooperative arena game for one display and **three phones**. Defense steers
left/right and shields, repair steers up/down and repairs, and weapons chooses
cores and attacks. A pilot who exits the robot gets eight-way movement. Gameplay
rules, collision geometry, damage and spawn rates are server-authoritative.

## Develop

Use Node.js **22.12 or newer**.

```sh
npm ci
npm run dev
```

Open `http://localhost:5173/display` on the arena screen. Phones on the same Wi-Fi
open `http://<your-lan-ip>:5173/play` and enter the room code. When hosting locally,
open the display using the LAN IP too so its QR points at an address phones can
reach. Production serves the built client and Socket.IO from the same origin.

## Build and run

```sh
npm run build
PORT=3000 npm --workspace=server start
```

`PORT` defaults to 3000. `VITE_API_TARGET` configures the development proxy.
`ALLOWED_ORIGINS` is an optional comma-separated CORS allowlist for a separately
hosted client; same-origin hosting needs no CORS configuration.

## Architecture and connection lifecycle

- `shared` defines the protocol, snapshots and weapon geometry.
- `server/src/game` owns rules and the fixed 60 Hz simulation. Simulation steps
  are bounded during event-loop stalls. Active displays receive 30 snapshots/s,
  phones 20/s, and idle lobbies 5/s. Phase changes publish immediately.
- `server/src/net` validates packets with Zod and owns its connection registry.
  Host credentials are private and independent of the public four-letter code.
- Each browser view owns its Socket.IO connection. Phone session tokens restore
  stations after refresh/reconnect; moving a session to another tab explicitly
  informs the old controller. Navigating away disconnects the view.
- A missing required role pauses the game. Disconnect, pause, backgrounding and
  lost focus clear movement. Held controls send 20 heartbeats/s; input older than
  500 ms expires. Commands are never intentionally queued while offline.
- Empty rooms remain available for 15 minutes, then expire. Connected rooms do
  not expire. Rooms live in memory: a server restart ends existing rooms and the
  client offers a new lobby. Deploy as **one server instance**; horizontal scaling
  needs shared room ownership/state, not just a Socket.IO transport adapter.
- `client/src/display/GameArena.tsx` renders the complete scene in Pixi; React
  updates the HUD at 10 Hz. Coordinates retain the arena aspect ratio and moving
  actors interpolate between snapshots. Menus and canvas share vector artwork.
- `client/src/audio` provides soft procedural voices and 32-bar musical phrases,
  gain limiting, sound throttling and independent persisted music/effects volume.
  Audio starts after a user gesture and pauses when the page is hidden. Phones
  play their own UI cues; gameplay music and effects belong to the display.

## Verify

```sh
npm test
npm run build
npm audit --omit=dev
npm run test:e2e
```

The server suite includes real Socket.IO join, role, refresh and disconnect
regressions. Client tests cover input interruption, connection ownership and
coordinate mapping. The browser suite covers the current desktop/mobile UI.
The earlier MVP design is in
[docs/superpowers/specs/2026-05-01-partyficrim-mvp-design.md](docs/superpowers/specs/2026-05-01-partyficrim-mvp-design.md).
