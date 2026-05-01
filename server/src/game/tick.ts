import type { DisplaySnapshot, PhoneSnapshot, Role, Mode, Phase } from '@partyficrim/shared';
import type { Room } from './rooms.js';
import { computeRobotVelocity, applyMovement, computeOnFootVelocity } from './movement.js';
import { resolveCollisions } from './collision.js';
import { handleButton, isNearRobot } from './exit_enter.js';
import { trySpawnPowerup, processPickups, POWERUP_RADIUS } from './powerups.js';
import { log } from '../log.js';

function setPhase(room: Room, next: Phase): void {
  if (room.phase === next) return;
  log('phase', `${room.code} ${room.phase} -> ${next}`);
  room.phase = next;
}

const ROBOT_SPEED = 200;
const PLAYER_SPEED = 200;
const ROBOT_HALF = 20;
const PLAYER_HALF = 10;
const TILE = 32;
const POWERUP_INTERVAL_MS = 3000;
const POWERUP_MAX = 5;

const COUNTDOWN_MS = 3000;

function allConnected(room: Room): boolean {
  for (const p of room.players.values()) if (!p.connected) return false;
  return true;
}

export function requestStart(room: Room): void {
  if (room.phase === 'lobby' && room.players.size === 2 && allConnected(room)) {
    setPhase(room, 'countdown');
    room.countdownMsRemaining = COUNTDOWN_MS;
  }
}

export function tickRoom(room: Room, dt: number): void {
  const dtMs = dt * 1000;
  const playerCount = room.players.size;

  if (room.phase === 'lobby') {
    // start is now manual via requestStart(); the lobby just sits here.
    return;
  }

  if (room.phase === 'countdown') {
    if (playerCount < 2 || !allConnected(room)) {
      setPhase(room, 'lobby');
      room.countdownMsRemaining = 0;
      return;
    }
    room.countdownMsRemaining -= dtMs;
    if (room.countdownMsRemaining <= 0) {
      setPhase(room, 'playing');
      room.countdownMsRemaining = 0;
    }
    return;
  }

  if (room.phase === 'playing') {
    if (!allConnected(room)) {
      setPhase(room, 'paused');
      return;
    }

    const xPlayer = [...room.players.values()].find((p) => p.role === 'X');
    const yPlayer = [...room.players.values()].find((p) => p.role === 'Y');
    if (!xPlayer || !yPlayer) return;

    // process pending button presses before movement
    for (const p of [xPlayer, yPlayer]) {
      if (p.lastButtonAt > 0) {
        handleButton(p, room.robot, TILE);
        p.lastButtonAt = 0;
      }
    }

    const robotVel = computeRobotVelocity(
      { x: { input: xPlayer.lastInput, mode: xPlayer.mode },
        y: { input: yPlayer.lastInput, mode: yPlayer.mode } },
      ROBOT_SPEED
    );
    applyMovement(room.robot, robotVel, dt);
    resolveCollisions(room.robot, ROBOT_HALF, room.obstacles, room.arena);

    for (const p of [xPlayer, yPlayer]) {
      if (p.mode === 'on_foot') {
        const v = computeOnFootVelocity(p.lastInput, PLAYER_SPEED);
        applyMovement(p.pos, v, dt);
        resolveCollisions(p.pos, PLAYER_HALF, room.obstacles, room.arena);
      } else {
        // in_robot players follow robot position
        p.pos.x = room.robot.x;
        p.pos.y = room.robot.y;
      }
    }

    // spawn + pickup powerups
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
    return;
  }

  if (room.phase === 'paused') {
    if (allConnected(room) && playerCount === 2) {
      setPhase(room, 'playing');
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
    eventFeed: room.eventFeed.slice(),
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
    nearRobot: me.mode === 'on_foot' ? isNearRobot(me.pos, room.robot, TILE) : true,
    playerCount: room.players.size,
    selected: [me.selected[0], me.selected[1], me.selected[2], me.selected[3]],
    quadrant: me.quadrant,
  };
}
