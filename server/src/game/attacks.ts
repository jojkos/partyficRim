import { CORE_COLORS, type AttackKind, type CoreType, type Quadrant } from '@partyficrim/shared';
import type { Room } from './rooms.js';
import { addAttack } from './rooms.js';
import { killEnemiesInAttack } from './enemies.js';
import { BOMB_DAMAGE_RADIUS } from './weapon_geometry.js';

export const BOMB_FUSE_MS = 5000;
const ROBOT_HALF = 20;

function clampHp(v: number): number {
  return Math.max(0, Math.min(100, v));
}

export function coreColors(types: CoreType[]): string[] {
  return types.map((type) => CORE_COLORS[type]);
}

export function repairQuadrant(room: Room, quadrant: Quadrant): void {
  room.quadrantHp[quadrant] = clampHp(room.quadrantHp[quadrant] + 5);
}

export function applySelfDamage(room: Room, damage: number): void {
  for (const q of [0, 1, 2, 3] as const) {
    const applied = room.shieldQuadrant === q ? Math.round(damage * 0.2) : damage;
    room.quadrantHp[q] = clampHp(room.quadrantHp[q] - applied);
  }
  if ([0, 1, 2, 3].some((q) => room.quadrantHp[q as Quadrant] <= 0)) {
    room.phase = 'gameover';
  }
}

export function applyQuadrantDamage(room: Room, quadrant: Quadrant, damage: number): void {
  const applied = room.shieldQuadrant === quadrant ? Math.round(damage * 0.2) : damage;
  room.quadrantHp[quadrant] = clampHp(room.quadrantHp[quadrant] - applied);
  if (room.quadrantHp[quadrant] <= 0) room.phase = 'gameover';
}

export function applyBombDamage(room: Room, pos: { x: number; y: number }): void {
  const dx = Math.max(Math.abs(room.robot.x - pos.x) - ROBOT_HALF, 0);
  const dy = Math.max(Math.abs(room.robot.y - pos.y) - ROBOT_HALF, 0);
  if (Math.hypot(dx, dy) > BOMB_DAMAGE_RADIUS) return;
  applySelfDamage(room, 50);
}

export function fireAttack(room: Room, kind: AttackKind, quadrant: Quadrant, selectedCores: CoreType[]): boolean {
  const colors = coreColors(selectedCores);
  if (kind !== 'bomb') killEnemiesInAttack(room, kind, quadrant, room.robot);
  if (kind === 'rotary') {
    addAttack(room, kind, quadrant, colors);
    if (room.shieldQuadrant === quadrant) applyQuadrantDamage(room, quadrant, 10);
    return true;
  }
  if (kind === 'laser') {
    addAttack(room, kind, quadrant, colors);
    applySelfDamage(room, 25);
    return true;
  }
  if (kind === 'bomb') {
    room.bombs.push({
      id: `${Date.now()}-${Math.random()}`,
      pos: { x: room.robot.x, y: room.robot.y },
      fuseAt: Date.now() + BOMB_FUSE_MS,
      fuseMsRemaining: BOMB_FUSE_MS,
      radius: BOMB_DAMAGE_RADIUS,
    });
    addAttack(room, kind, quadrant, colors, room.robot);
    return true;
  }
  addAttack(room, kind, quadrant, colors);
  return true;
}
