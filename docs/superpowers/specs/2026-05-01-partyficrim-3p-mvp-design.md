# partyficRim 3-Player MVP — Design

## 1. Goal

Bring the game from the 2-player POC to the full 3-player MVP, with all robot mechanics functional in a closed self-feedback loop. **No enemies yet** — damage comes only from the robot's own attacks (Laser ray, Bomb), and the system loop is: Weapons fires → Robot takes self-damage → Repair patches it → Defense routes incoming damage through shields. This validates every action visibly without requiring an enemy AI.

## 2. Roles (3 players)

Each player joins via phone and picks one of three roles in the lobby. All roles share the standard layout (header, 3 columns, ACTION button) but each column's contents differ by role.

### 2.1 Defense Technical Officer (X-axis)

| Column | Control |
|---|---|
| Left | Joystick (X-axis lock when in robot, free when on foot) + ACTION (Exit/Enter) button |
| Middle | 4 inventory slots showing the **cores Defense currently holds** with their colors. Toggle ON to "offer" to Weapons (max 2 active at a time; must toggle one off before activating a third). |
| Right | 4-quadrant grid. Single-select. Activates a permanent shield in the chosen quadrant: 80% damage reduction to that quadrant. Tap the same quadrant to clear (no shield). |

### 2.2 Senior Repair Engineer (Y-axis)

| Column | Control |
|---|---|
| Left | Joystick (Y-axis lock when in robot, free when on foot) + ACTION button |
| Middle | 4 inventory slots showing the **cores Repair currently holds**. Toggle ON to offer to Weapons (max 2 active). |
| Right | 4 quadrants displayed as **HP bars** for the robot's 4 quadrants (0–100 each). Tap a quadrant to repair: each tap adds +5 HP to that quadrant, no cooldown, capped at 100. Quadrants below 25% HP are visually highlighted. |

### 2.3 Weapons Engineer

| Column | Control |
|---|---|
| Left | 4 toggles showing the **cores currently offered** by Defense + Repair (max 4 visible: up to 2 from each). Toggle ON the cores you want active for the next attack. Any combination allowed. Empty slots show as inert. |
| Middle | 4 attack-type buttons: **MELEE / ROTARY / LASER / BOMB**. Tap to fire immediately (no charge, no cooldown for MVP). |
| Right | 4-quadrant grid. Single-select. Picks the direction the robot's attack focuses on. Tap same to clear. |
| ACTION button | Same Exit/Enter as the others. Replaces the joystick row's bottom button — placed under the left-column toggles. |

The Weapons Engineer has **no joystick** — they don't move the robot. (Per GDD: only Defense and Repair drive the robot, on their respective axes.)

## 3. Robot state model

### 3.1 Quadrants

The robot has **4 quadrants**: NW (top-left), NE (top-right), SW (bottom-left), SE (bottom-right).

- Each quadrant has independent HP (0–100). Starts at 100.
- Top quadrants (NW, NE) represent arms; bottom (SW, SE) represent legs. (For MVP, the per-quadrant gameplay penalties — reduced damage from broken arms, reduced speed from broken legs — are *displayed* but **not applied to gameplay**. We hook those up post-MVP.)

### 3.2 Game over

- Game ends when **any one quadrant reaches 0 HP**.
- Display shows `ROBOT DESTROYED` overlay. Phones show "Game Over."
- The `× end game` button resets back to lobby (server creates a new room as today).

### 3.3 Visual representation on display

The four quadrants must be **visibly drawn around the robot** in the arena view:

- A square or circular bounding-region centered on the robot, divided into NW/NE/SW/SE.
- Each quadrant's color/alpha reflects its HP (full = solid role color; below 25% = pulsing red).
- The shield quadrant (Defense's pick) renders a glowing border on that quadrant.
- Attacks render *inside* their target quadrant region (see §4.3).

## 4. Attacks

When Weapons taps an attack type, the robot fires immediately in the quadrant Weapons currently has selected. If no quadrant is selected, the attack fires omnidirectionally (Bomb), or in a default direction (we pick NE for non-bomb), or simply doesn't fire — proposing the latter for clarity: **no quadrant selected = attack fires, defaulting to all 4 quadrants for visuals (Melee, Rotary)** or **doesn't fire (Laser, Bomb)**. We'll go with the simpler rule: any attack requires a quadrant. The button is disabled if no quadrant is selected.

### 4.1 Melee

- Range: inner 0–25% of the quadrant arc around the robot.
- Visual: short arc/swipe close to the robot, in the chosen quadrant.
- Self-damage: none.

### 4.2 Rotary

- Range: 25–75% of the quadrant.
- Visual: a rotating donut sector in the chosen quadrant, mid-distance.
- Self-damage: none.

### 4.3 Laser ray

- Range: full 0–100% of the chosen quadrant (a long beam).
- Visual: a beam extending from the robot's center to the arena edge in the quadrant.
- Self-damage: **25 HP to each of the 4 quadrants** (per GDD's "25% all limbs"). Defense's shield reduces it to **5 HP** on the shielded quadrant.

### 4.4 Bomb

- Range: dropped at the robot's current position when fired.
- Visual: a placed bomb sprite that ticks down 5 seconds, then explodes (radial blast effect at that location).
- Self-damage on explosion: **50 HP to each of the 4 quadrants**. Shield reduces it to **10 HP** on the shielded quadrant.
- Bomb continues to tick even if the robot moves away. Explosion location is wherever it was placed.

### 4.5 Core tinting

Whatever cores Weapons currently has toggled ON tint the attack visual. Each core has a distinct color. The attack color is a blend (or stripe) of the active cores' colors. With zero cores active, the attack still fires but uses a default white/gray tint.

For MVP, the simplest implementation: take all active core colors, average them (or stripe them across the visual). No gameplay damage difference — purely visual. The wiring is set up so that elemental damage rules can plug in later.

## 5. Cores

### 5.1 Types and visuals

- **8 core types**, each with a distinct color. Suggested palette: red, orange, yellow, green, cyan, blue, purple, pink. (Final colors picked at implementation.)
- Each core type spawns at most once. (No duplicate types coexist.)

### 5.2 Spawn

- Cores **fully replace the existing powerup system** on the map.
- Spawn at random arena positions (avoiding obstacles), one at a time.
- Spawn rate: same as current powerups (every ~3 seconds).
- Cap: max 8 cores on the map at any time. (Once all 8 types are picked up or distributed, no more spawn.)
- Post-MVP: cores recharge / reshuffle. For MVP, once distributed they stay with their player.

### 5.3 Pickup

- Anyone can pick up — robot or any on-foot player. Walking over the core triggers pickup (AABB overlap, same as today's powerups).
- **Distribution:** alternates between Defense and Repair to keep counts balanced.
  - On pickup: assign to whichever of Defense/Repair currently has fewer cores in inventory.
  - Tie-break (both equal): pick the one whose role is X (Defense). Deterministic.
- **Inventory cap:** each player has 4 inventory slots. If both already have 4 (= 8 total cores held), the picked core stays on the floor (pickup is refused at server level). Should not happen in practice since there are exactly 8 types.

### 5.4 Activation

- Defense and Repair each toggle which of their 4 inventory cores are "active" (offered to Weapons).
- **Max 2 active per player at a time.** UI enforces this: tapping a third inactive core when 2 are already active does nothing (or shows a brief "release another first" hint). Server enforces too.
- Weapons sees up to 4 cores in their left column — the union of Defense's actives and Repair's actives. Weapons toggles which of those 4 to use for the next attack. Any subset allowed.

## 6. Lobby (3 players, role-pick)

- Display creates a room as today.
- Phones join. Phone shows three role cards: **Defense Officer**, **Repair Engineer**, **Weapons Engineer**.
- Tap a card to claim. If already claimed by another player, the card is disabled/grayed.
- Tap your own claimed card to release.
- START button (display + phones) becomes enabled once **all 3 roles are claimed by 3 different players**. Anyone can press it.
- Countdown 3-2-1 → playing.
- If a player disconnects mid-game, room pauses (existing behavior). Reconnect → resume.

## 7. Server state changes

### 7.1 RoomPlayer

Adds (on top of the existing `selected` and `quadrant`):

- `inventory: CoreType[]` — up to 4 core types this player holds (Defense, Repair only; empty for Weapons).
- `selectedCores: number[]` — indices into `inventory` of cores currently active (max 2).

### 7.2 Room

Adds:

- `quadrantHp: { NW, NE, SW, SE }` — each 0–100.
- `shieldQuadrant: 0..3 | null` — the quadrant Defense has shielded (mirrors Defense's `quadrant` field; convenience).
- `attackQuadrant: 0..3 | null` — the quadrant Weapons has selected (mirrors WE's `quadrant`).
- `cores: Map<id, { type: CoreType, pos: Vec2 }>` — replaces `powerups`. Score is removed (no enemies, no points yet).
- `bombs: Array<{ pos: Vec2, fuseAt: number }>` — pending bombs.
- `attacks: Array<{ kind, quadrant, ttl, colors }>` — short-lived attack visuals to broadcast for rendering. Server enforces TTL and removes them.
- `phase: 'lobby' | 'role_pick' | 'countdown' | 'playing' | 'paused' | 'gameover'`.
  - New phase `role_pick` gates START on all-3-roles-picked. `lobby` can be merged into `role_pick` for simplicity — proposing: rename `lobby` semantics to "waiting for 3 phones to connect AND claim roles." Player UI handles the connect-but-not-claimed state.

### 7.3 New / changed events

- `phone:claim_role` `{ role: 'defense' | 'repair' | 'weapons' | null }` — claim or release. `null` releases.
- `phone:select` extended: now operates on inventory cores, not generic OPT slots.
- `phone:fire` `{ kind: 'melee' | 'rotary' | 'laser' | 'bomb' }` — Weapons fires the attack.
- `phone:repair` `{ quadrant: 0..3 }` — Repair Engineer's tap. (Folds into the existing `phone:quadrant` for Repair? Probably better as its own event for clarity.)
- `phone:quadrant` semantics depend on role: Defense → set shield, Weapons → set attack direction, Repair → repair tap (one HP increment).
- Existing `phone:button` (Action) still toggles in/out of robot.

### 7.4 Damage application

- On Laser fire: subtract 25 from each quadrant's HP (5 if it's the shielded one).
- On Bomb explosion (5s after fire): subtract 50 from each quadrant (10 if shielded).
- Repair tap: add 5 to that quadrant, capped at 100.
- After every change: if any quadrant ≤ 0 → `phase = 'gameover'`.

## 8. Display rendering additions

- **Quadrant overlay around the robot:** 4 colored sectors (NW/NE/SW/SE) drawn as a ring or square frame around the robot. Each sector's color/opacity reflects its HP. Below 25% pulses red.
- **Shield indicator:** the shielded quadrant has a glowing outer rim.
- **Attack visuals per quadrant:**
  - Melee: short arc near the robot in the quadrant.
  - Rotary: rotating donut sector at mid-radius.
  - Laser: long beam to the arena edge in the quadrant.
  - Bomb: dropped sprite, fuse countdown number on top, expanding shockwave on explosion.
  - Each tinted by the active cores' colors (averaged or striped).
- **Cores on the floor:** small colored circles (one color per type) at their spawn position, visible until picked up.
- **Game over overlay:** centered `ROBOT DESTROYED` text dimming the arena.

## 9. Out of scope (deferred)

- Enemies / waves / AI.
- Per-quadrant gameplay penalties (broken arms = lower damage, broken legs = slower) — visible only.
- Elemental core combinations affecting damage type.
- Score / progression / win condition beyond "don't die."
- Rich attack animations / particle effects.
- Sound and music.
- Robot pickup/throwing of on-foot players (some GDD references hint at this — out for MVP).
- Lobby polish (avatars, names) — just role cards.
- Multi-robot per game (only 1 robot for MVP per user's earlier statement).
