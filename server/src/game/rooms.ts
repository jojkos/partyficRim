import type { FeedEvent, Phase, PlayerState, PowerupState, Rect, Vec2 } from '@partyficrim/shared';

export type Quadrant = 0 | 1 | 2 | 3;

export interface RoomPlayer extends PlayerState {
  sessionId: string;
  lastInput: Vec2;
  lastButtonAt: number;
  selected: [boolean, boolean, boolean, boolean];
  quadrant: number | null;
}

export interface Room {
  code: string;
  phase: Phase;
  countdownMsRemaining: number;
  robot: Vec2;
  players: Map<string, RoomPlayer>;
  powerups: Map<string, PowerupState>;
  obstacles: Rect[];
  arena: Rect;
  score: number;
  createdAt: number;
  lastPowerupSpawnAt: number;
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
      powerups: new Map(),
      obstacles: [
        { x: 200, y: 150, w: 60, h: 60 },
        { x: 540, y: 400, w: 80, h: 40 },
        { x: 350, y: 480, w: 40, h: 80 },
      ],
      arena: { x: 0, y: 0, w: 800, h: 600 },
      score: 0,
      createdAt: Date.now(),
      lastPowerupSpawnAt: 0,
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
