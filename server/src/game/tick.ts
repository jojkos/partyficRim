import type { DisplaySnapshot, PhoneSnapshot, Role, Mode } from '@polararena/shared';
import type { Room } from './rooms.js';
import { computeRobotVelocity, applyMovement, computeOnFootVelocity } from './movement.js';
import { resolveCollisions } from './collision.js';

const ROBOT_SPEED = 200;
const PLAYER_SPEED = 200;
const ROBOT_HALF = 20;
const PLAYER_HALF = 10;

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

    const xPlayer = [...room.players.values()].find((p) => p.role === 'X');
    const yPlayer = [...room.players.values()].find((p) => p.role === 'Y');
    if (!xPlayer || !yPlayer) return;

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
