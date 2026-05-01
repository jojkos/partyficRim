export type Role = 'defense' | 'repair' | 'weapons';
export type Mode = 'in_robot' | 'on_foot';
export type Phase = 'lobby' | 'countdown' | 'playing' | 'paused' | 'gameover';
export type Quadrant = 0 | 1 | 2 | 3;
export type AttackKind = 'melee' | 'rotary' | 'laser' | 'bomb';
export type CoreType = 'red' | 'orange' | 'yellow' | 'green' | 'cyan' | 'blue' | 'purple' | 'pink';

export const ROLE_LABEL: Record<Role, string> = {
  defense: 'DEFENSE OFFICER',
  repair: 'REPAIR ENGINEER',
  weapons: 'WEAPONS ENGINEER',
};

export const CORE_COLORS: Record<CoreType, string> = {
  red: '#ff4d5e',
  orange: '#ff9b3d',
  yellow: '#ffe45c',
  green: '#65e572',
  cyan: '#4ce6ff',
  blue: '#4b83ff',
  purple: '#a56bff',
  pink: '#ff6fd8',
};

export const CORE_TYPES: CoreType[] = ['red', 'orange', 'yellow', 'green', 'cyan', 'blue', 'purple', 'pink'];

export type EventKind = 'select' | 'quadrant' | 'action' | 'role' | 'fire' | 'repair' | 'core';

export interface FeedEvent {
  ts: number;
  role: Role | null;
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
  role: Role | null;
  mode: Mode;
  pos: Vec2;
  connected: boolean;
}

export interface CoreState {
  id: string;
  type: CoreType;
  pos: Vec2;
}

export interface EnemyState {
  id: string;
  pos: Vec2;
  vel: Vec2;
}

export interface PowerupState {
  id: string;
  pos: Vec2;
}

export type QuadrantHp = Record<Quadrant, number>;

export interface BombState {
  id: string;
  pos: Vec2;
  fuseMsRemaining: number;
  radius: number;
}

export interface AttackState {
  id: string;
  kind: AttackKind;
  quadrant: Quadrant;
  ttlMsRemaining: number;
  colors: string[];
  pos?: Vec2;
}

export interface DisplaySnapshot {
  phase: Phase;
  countdownMsRemaining: number;
  robot: Vec2;
  players: PlayerState[];
  cores: CoreState[];
  enemies: EnemyState[];
  obstacles: Rect[];
  arena: Rect;
  roomCode: string;
  eventFeed: FeedEvent[];
  quadrantHp: QuadrantHp;
  shieldQuadrant: Quadrant | null;
  attackQuadrant: Quadrant | null;
  bombs: BombState[];
  attacks: AttackState[];
  roleClaims: Record<Role, string | null>;
}

export interface PhoneSnapshot {
  phase: Phase;
  role: Role | null;
  mode: Mode;
  occupancy: Record<Role, Mode | null>;
  nearRobot: boolean;
  playerCount: number;
  roleClaims: Record<Role, string | null>;
  inventory: CoreType[];
  selectedCores: number[];
  offeredCores: CoreType[];
  weaponSelectedCores: CoreType[];
  selectedAttackKind: AttackKind | null;
  quadrant: Quadrant | null;
  quadrantHp: QuadrantHp;
}
