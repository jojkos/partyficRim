import type { AttackKind, EnemyState, Quadrant, Rect, Vec2 } from '@partyficrim/shared';
import type { Room } from './rooms.js';
import { randomUUID } from 'node:crypto';
import { BOMB_DAMAGE_RADIUS, MELEE_RADIUS, ROTARY_RADIUS } from './weapon_geometry.js';
import { applyQuadrantDamage } from './attacks.js';

export const ENEMY_RADIUS = 12;
export const ENEMY_INTERVAL_MS = 2500;
export const ENEMY_MAX = 8;
const ENEMY_SPEED = 28;
const ROBOT_HALF = 20;
const CONTACT_DAMAGE = 5;
const CONTACT_INTERVAL_MS = 700;

interface SpawnArgs {
  now: number;
  lastSpawnAt: number;
  intervalMs: number;
  max: number;
  arena: Rect;
  obstacles: Rect[];
  existing: Map<string, EnemyState>;
}

function rectsOverlap(a: { x: number; y: number; w: number; h: number },
                     b: { x: number; y: number; w: number; h: number }): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function trySpawnEnemy(args: SpawnArgs): EnemyState | null {
  if (args.now - args.lastSpawnAt < args.intervalMs) return null;
  if (args.existing.size >= args.max) return null;

  const margin = ENEMY_RADIUS + 8;
  for (let attempt = 0; attempt < 30; attempt++) {
    const x = args.arena.x + margin + Math.random() * (args.arena.w - margin * 2);
    const y = args.arena.y + margin + Math.random() * (args.arena.h - margin * 2);
    const box = { x: x - ENEMY_RADIUS, y: y - ENEMY_RADIUS, w: ENEMY_RADIUS * 2, h: ENEMY_RADIUS * 2 };
    if (args.obstacles.some((o) => rectsOverlap(box, o))) continue;
    let collision = false;
    for (const enemy of args.existing.values()) {
      if (Math.hypot(enemy.pos.x - x, enemy.pos.y - y) < ENEMY_RADIUS * 4) {
        collision = true;
        break;
      }
    }
    if (collision) continue;

    const angle = Math.random() * Math.PI * 2;
    const enemy: EnemyState = {
      id: randomUUID(),
      pos: { x, y },
      vel: { x: Math.cos(angle) * ENEMY_SPEED, y: Math.sin(angle) * ENEMY_SPEED },
    };
    args.existing.set(enemy.id, enemy);
    return enemy;
  }
  return null;
}

export function moveEnemies(room: Room, dt: number): void {
  for (const enemy of room.enemies.values()) {
    if (Math.random() < 0.025) {
      const angle = Math.random() * Math.PI * 2;
      enemy.vel = { x: Math.cos(angle) * ENEMY_SPEED, y: Math.sin(angle) * ENEMY_SPEED };
    }
    enemy.pos.x += enemy.vel.x * dt;
    enemy.pos.y += enemy.vel.y * dt;

    if (enemy.pos.x < room.arena.x + ENEMY_RADIUS || enemy.pos.x > room.arena.x + room.arena.w - ENEMY_RADIUS) {
      enemy.vel.x *= -1;
      enemy.pos.x = Math.max(room.arena.x + ENEMY_RADIUS, Math.min(room.arena.x + room.arena.w - ENEMY_RADIUS, enemy.pos.x));
    }
    if (enemy.pos.y < room.arena.y + ENEMY_RADIUS || enemy.pos.y > room.arena.y + room.arena.h - ENEMY_RADIUS) {
      enemy.vel.y *= -1;
      enemy.pos.y = Math.max(room.arena.y + ENEMY_RADIUS, Math.min(room.arena.y + room.arena.h - ENEMY_RADIUS, enemy.pos.y));
    }
    for (const obstacle of room.obstacles) {
      const box = { x: enemy.pos.x - ENEMY_RADIUS, y: enemy.pos.y - ENEMY_RADIUS, w: ENEMY_RADIUS * 2, h: ENEMY_RADIUS * 2 };
      if (!rectsOverlap(box, obstacle)) continue;
      enemy.vel.x *= -1;
      enemy.vel.y *= -1;
      enemy.pos.x += enemy.vel.x * dt;
      enemy.pos.y += enemy.vel.y * dt;
      break;
    }
  }
}

function contactQuadrant(enemy: EnemyState, robot: Vec2): Quadrant {
  const east = enemy.pos.x >= robot.x;
  const south = enemy.pos.y >= robot.y;
  if (!east && !south) return 0;
  if (east && !south) return 1;
  if (!east && south) return 2;
  return 3;
}

export function applyEnemyContactDamage(room: Room, now: number): void {
  if (now - room.lastEnemyContactDamageAt < CONTACT_INTERVAL_MS) return;
  for (const enemy of room.enemies.values()) {
    const dx = Math.abs(enemy.pos.x - room.robot.x);
    const dy = Math.abs(enemy.pos.y - room.robot.y);
    if (dx > ROBOT_HALF + ENEMY_RADIUS || dy > ROBOT_HALF + ENEMY_RADIUS) continue;
    applyQuadrantDamage(room, contactQuadrant(enemy, room.robot), CONTACT_DAMAGE);
    room.lastEnemyContactDamageAt = now;
    return;
  }
}

function quadrantVector(q: Quadrant): Vec2 {
  if (q === 0) return { x: -1, y: -1 };
  if (q === 1) return { x: 1, y: -1 };
  if (q === 2) return { x: -1, y: 1 };
  return { x: 1, y: 1 };
}

function inAttackHitbox(origin: Vec2, target: Vec2, kind: AttackKind, quadrant: Quadrant): boolean {
  const dx = target.x - origin.x;
  const dy = target.y - origin.y;
  if (kind === 'bomb') return Math.hypot(dx, dy) <= BOMB_DAMAGE_RADIUS + ENEMY_RADIUS;

  const dir = quadrantVector(quadrant);
  if (dx * dir.x < -ENEMY_RADIUS || dy * dir.y < -ENEMY_RADIUS) return false;

  const dist = Math.hypot(dx, dy);
  if (kind === 'melee') return dist <= MELEE_RADIUS + ENEMY_RADIUS;
  if (kind === 'rotary') return dist <= ROTARY_RADIUS + ENEMY_RADIUS;
  if (kind === 'laser') return true;
  return false;
}

export function killEnemiesInAttack(room: Room, kind: AttackKind, quadrant: Quadrant, origin: Vec2): number {
  let killed = 0;
  for (const [id, enemy] of room.enemies) {
    if (!inAttackHitbox(origin, enemy.pos, kind, quadrant)) continue;
    room.enemies.delete(id);
    killed++;
  }
  return killed;
}
