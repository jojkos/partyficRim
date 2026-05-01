import type {
  AttackKind,
  AttackState,
  BombState,
  CoreState,
  CoreType,
  EnemyState,
  FeedEvent,
  Phase,
  PlayerState,
  Quadrant,
  QuadrantHp,
  Rect,
  Role,
  Vec2,
} from '@partyficrim/shared';

export interface RoomPlayer extends PlayerState {
  sessionId: string;
  lastInput: Vec2;
  lastButtonAt: number;
  inventory: CoreType[];
  selectedCores: number[];
  weaponSelectedCores: CoreType[];
  selectedAttackKind: AttackKind | null;
  quadrant: Quadrant | null;
}

export interface Room {
  code: string;
  phase: Phase;
  countdownMsRemaining: number;
  robot: Vec2;
  players: Map<string, RoomPlayer>;
  cores: Map<string, CoreState>;
  enemies: Map<string, EnemyState>;
  obstacles: Rect[];
  arena: Rect;
  quadrantHp: QuadrantHp;
  shieldQuadrant: Quadrant | null;
  attackQuadrant: Quadrant | null;
  bombs: Array<BombState & { fuseAt: number }>;
  attacks: AttackState[];
  createdAt: number;
  lastCoreSpawnAt: number;
  lastEnemySpawnAt: number;
  lastEnemyContactDamageAt: number;
  eventFeed: FeedEvent[];
}

const FEED_MAX = 12;

export function pushFeed(room: Room, e: FeedEvent): void {
  room.eventFeed.push(e);
  if (room.eventFeed.length > FEED_MAX) {
    room.eventFeed.splice(0, room.eventFeed.length - FEED_MAX);
  }
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
      cores: new Map(),
      enemies: new Map(),
      obstacles: [
        { x: 200, y: 150, w: 60, h: 60 },
        { x: 540, y: 400, w: 80, h: 40 },
        { x: 350, y: 480, w: 40, h: 80 },
      ],
      arena: { x: 0, y: 0, w: 800, h: 600 },
      quadrantHp: { 0: 100, 1: 100, 2: 100, 3: 100 },
      shieldQuadrant: null,
      attackQuadrant: null,
      bombs: [],
      attacks: [],
      createdAt: Date.now(),
      lastCoreSpawnAt: 0,
      lastEnemySpawnAt: 0,
      lastEnemyContactDamageAt: 0,
      eventFeed: [],
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

  iterRooms(): IterableIterator<Room> {
    return this.rooms.values();
  }
}

export function roleClaims(room: Room): Record<Role, string | null> {
  return {
    defense: [...room.players.values()].find((p) => p.connected && p.role === 'defense')?.id ?? null,
    repair: [...room.players.values()].find((p) => p.connected && p.role === 'repair')?.id ?? null,
    weapons: [...room.players.values()].find((p) => p.connected && p.role === 'weapons')?.id ?? null,
  };
}

export function playerForRole(room: Room, role: Role): RoomPlayer | undefined {
  return [...room.players.values()].find((p) => p.role === role);
}

export function addAttack(room: Room, kind: AttackKind, quadrant: Quadrant, colors: string[], pos?: Vec2): void {
  room.attacks.push({
    id: `${Date.now()}-${Math.random()}`,
    kind,
    quadrant,
    ttlMsRemaining: kind === 'bomb' ? 900 : 450,
    colors,
    pos: pos ? { x: pos.x, y: pos.y } : undefined,
  });
}
