export type Role = 'X' | 'Y';
export type Mode = 'in_robot' | 'on_foot';
export type Phase = 'lobby' | 'countdown' | 'playing' | 'paused';

export const ROLE_LABEL: Record<Role, string> = {
  X: 'DEFENSE OFFICER',
  Y: 'REPAIR ENGINEER',
};

export type EventKind = 'select' | 'quadrant' | 'action';

export interface FeedEvent {
  ts: number;
  role: Role;
  kind: EventKind;
  detail: string;
}

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
  eventFeed: FeedEvent[];
}

export interface PhoneSnapshot {
  phase: Phase;
  role: Role;
  mode: Mode;
  score: number;
  occupancy: Record<Role, Mode>;
  nearRobot: boolean;
  playerCount: number;
  selected: [boolean, boolean, boolean, boolean];
  quadrant: number | null;
}
