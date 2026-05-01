import type { DisplaySnapshot, PhoneSnapshot, Role, Mode, Phase, Quadrant } from '@partyficrim/shared';
import type { Room } from './rooms.js';
import { addAttack, playerForRole, roleClaims } from './rooms.js';
import { computeRobotVelocity, applyMovement, computeOnFootVelocity } from './movement.js';
import { resolveCollisions } from './collision.js';
import { handleButton, isNearRobot } from './exit_enter.js';
import { CORE_INTERVAL_MS, CORE_MAX, trySpawnCore, unavailableCoreTypes, processCorePickups, offeredCores } from './cores.js';
import { applyBombDamage } from './attacks.js';
import { applyEnemyContactDamage, ENEMY_INTERVAL_MS, ENEMY_MAX, killEnemiesInAttack, moveEnemies, trySpawnEnemy } from './enemies.js';
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
const COUNTDOWN_MS = 3000;

function allConnected(room: Room): boolean {
  for (const p of room.players.values()) if (!p.connected) return false;
  return true;
}

export function requestStart(room: Room): void {
  const claims = roleClaims(room);
  const allRolesClaimed = claims.defense && claims.repair && claims.weapons;
  if (room.phase === 'lobby' && room.players.size >= 3 && allConnected(room) && allRolesClaimed) {
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
    if (playerCount < 3 || !allConnected(room)) {
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

    const defense = playerForRole(room, 'defense');
    const repair = playerForRole(room, 'repair');
    if (!defense || !repair) return;

    // process pending button presses before movement
    for (const p of room.players.values()) {
      if (p.lastButtonAt > 0) {
        handleButton(p, room.robot, TILE);
        p.lastButtonAt = 0;
      }
    }

    const robotVel = computeRobotVelocity(
      { x: { input: defense.lastInput, mode: defense.mode },
        y: { input: repair.lastInput, mode: repair.mode } },
      ROBOT_SPEED
    );
    applyMovement(room.robot, robotVel, dt);
    resolveCollisions(room.robot, ROBOT_HALF, room.obstacles, room.arena);

    for (const p of room.players.values()) {
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

    const now = Date.now();
    moveEnemies(room, dt);
    applyEnemyContactDamage(room, now);
    room.attacks = room.attacks
      .map((attack) => ({ ...attack, ttlMsRemaining: attack.ttlMsRemaining - dtMs }))
      .filter((attack) => attack.ttlMsRemaining > 0);
    for (let i = room.bombs.length - 1; i >= 0; i--) {
      const bomb = room.bombs[i];
      if (!bomb) continue;
      bomb.fuseMsRemaining = Math.max(0, bomb.fuseAt - now);
      if (bomb.fuseMsRemaining <= 0) {
        room.bombs.splice(i, 1);
        addAttack(room, 'bomb', room.attackQuadrant ?? 1, [], bomb.pos);
        killEnemiesInAttack(room, 'bomb', room.attackQuadrant ?? 1, bomb.pos);
        applyBombDamage(room, bomb.pos);
      }
    }

    const spawned = trySpawnCore({
      now, lastSpawnAt: room.lastCoreSpawnAt, intervalMs: CORE_INTERVAL_MS,
      max: CORE_MAX, arena: room.arena, obstacles: room.obstacles, existing: room.cores,
      unavailableTypes: unavailableCoreTypes(room),
    });
    if (spawned) room.lastCoreSpawnAt = now;

    const enemySpawned = trySpawnEnemy({
      now, lastSpawnAt: room.lastEnemySpawnAt, intervalMs: ENEMY_INTERVAL_MS,
      max: ENEMY_MAX, arena: room.arena, obstacles: room.obstacles, existing: room.enemies,
    });
    if (enemySpawned) room.lastEnemySpawnAt = now;

    const pickers: { pos: { x: number; y: number }; half: number }[] = [
      { pos: room.robot, half: ROBOT_HALF },
    ];
    for (const p of room.players.values()) {
      if (p.mode === 'on_foot') pickers.push({ pos: p.pos, half: PLAYER_HALF });
    }
    processCorePickups(room, pickers, defense, repair);
    return;
  }

  if (room.phase === 'paused') {
    if (allConnected(room) && playerCount >= 3) {
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
    cores: [...room.cores.values()].map((u) => ({ id: u.id, type: u.type, pos: { x: u.pos.x, y: u.pos.y } })),
    enemies: [...room.enemies.values()].map((e) => ({ id: e.id, pos: { x: e.pos.x, y: e.pos.y }, vel: { x: e.vel.x, y: e.vel.y } })),
    obstacles: room.obstacles.map((o) => ({ ...o })),
    arena: { ...room.arena },
    roomCode: room.code,
    eventFeed: room.eventFeed.slice(),
    quadrantHp: { ...room.quadrantHp },
    shieldQuadrant: room.shieldQuadrant,
    attackQuadrant: room.attackQuadrant,
    bombs: room.bombs.map((b) => ({ id: b.id, pos: { x: b.pos.x, y: b.pos.y }, fuseMsRemaining: b.fuseMsRemaining, radius: b.radius })),
    attacks: room.attacks.map((a) => ({ ...a, pos: a.pos ? { x: a.pos.x, y: a.pos.y } : undefined })),
    roleClaims: roleClaims(room),
  };
}

export function buildPhoneSnapshot(room: Room, playerId: string): PhoneSnapshot {
  const occupancy: Record<Role, Mode | null> = { defense: null, repair: null, weapons: null };
  for (const p of room.players.values()) {
    if (p.connected && p.role) occupancy[p.role] = p.mode;
  }
  const me = room.players.get(playerId)!;
  const allOffered = offeredCores(room);
  const weaponSelectedCores = me.weaponSelectedCores.filter((type) => allOffered.includes(type));
  return {
    phase: room.phase,
    role: me.role,
    mode: me.mode,
    occupancy,
    nearRobot: me.mode === 'on_foot' ? isNearRobot(me.pos, room.robot, TILE) : true,
    playerCount: room.players.size,
    roleClaims: roleClaims(room),
    inventory: me.inventory.slice(),
    selectedCores: me.selectedCores.slice(),
    offeredCores: allOffered,
    weaponSelectedCores,
    selectedAttackKind: me.selectedAttackKind,
    quadrant: me.quadrant,
    quadrantHp: { ...room.quadrantHp },
  };
}
