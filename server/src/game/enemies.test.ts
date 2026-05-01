import { describe, it, expect } from 'vitest';
import {
  trySpawnEnemy,
  moveEnemies,
  applyEnemyContactDamage,
  killEnemiesInAttack,
  ENEMY_RADIUS,
  ENEMY_INTERVAL_MS,
  ENEMY_MAX,
} from './enemies.js';
import { RoomManager } from './rooms.js';
import type { EnemyState, Rect } from '@partyficrim/shared';

const ARENA: Rect = { x: 0, y: 0, w: 800, h: 600 };

describe('trySpawnEnemy', () => {
  it('spawns when interval elapsed and below cap', () => {
    const existing = new Map<string, EnemyState>();
    const enemy = trySpawnEnemy({
      now: 5000, lastSpawnAt: 0, intervalMs: ENEMY_INTERVAL_MS,
      max: ENEMY_MAX, arena: ARENA, obstacles: [], existing,
    });
    expect(enemy).not.toBeNull();
    expect(existing.size).toBe(1);
    expect(enemy!.vel.x !== 0 || enemy!.vel.y !== 0).toBe(true);
  });

  it('does not spawn before interval', () => {
    const existing = new Map<string, EnemyState>();
    const enemy = trySpawnEnemy({
      now: 1000, lastSpawnAt: 0, intervalMs: ENEMY_INTERVAL_MS,
      max: ENEMY_MAX, arena: ARENA, obstacles: [], existing,
    });
    expect(enemy).toBeNull();
  });

  it('does not spawn when at cap', () => {
    const existing = new Map<string, EnemyState>();
    for (let i = 0; i < ENEMY_MAX; i++) {
      existing.set(`e${i}`, { id: `e${i}`, pos: { x: 50 + i * 40, y: 50 }, vel: { x: 10, y: 0 } });
    }
    const enemy = trySpawnEnemy({
      now: 5000, lastSpawnAt: 0, intervalMs: ENEMY_INTERVAL_MS,
      max: ENEMY_MAX, arena: ARENA, obstacles: [], existing,
    });
    expect(enemy).toBeNull();
  });

  it('spawns within arena bounds', () => {
    const existing = new Map<string, EnemyState>();
    const enemy = trySpawnEnemy({
      now: 5000, lastSpawnAt: 0, intervalMs: ENEMY_INTERVAL_MS,
      max: ENEMY_MAX, arena: ARENA, obstacles: [], existing,
    });
    expect(enemy).not.toBeNull();
    expect(enemy!.pos.x).toBeGreaterThanOrEqual(ENEMY_RADIUS + 8);
    expect(enemy!.pos.x).toBeLessThanOrEqual(ARENA.w - ENEMY_RADIUS - 8);
    expect(enemy!.pos.y).toBeGreaterThanOrEqual(ENEMY_RADIUS + 8);
    expect(enemy!.pos.y).toBeLessThanOrEqual(ARENA.h - ENEMY_RADIUS - 8);
  });
});

describe('moveEnemies', () => {
  it('moves enemies by velocity * dt', () => {
    const room = new RoomManager().createRoom();
    room.enemies.set('e1', { id: 'e1', pos: { x: 400, y: 300 }, vel: { x: 100, y: 0 } });

    // Disable random direction changes for deterministic test
    const origRandom = Math.random;
    Math.random = () => 0.5; // > 0.025, so no direction change
    moveEnemies(room, 0.1);
    Math.random = origRandom;

    const e = room.enemies.get('e1')!;
    expect(e.pos.x).toBeCloseTo(410, 0);
    expect(e.pos.y).toBeCloseTo(300, 0);
  });

  it('bounces off arena walls', () => {
    const room = new RoomManager().createRoom();
    // Place enemy near right wall, moving right
    room.enemies.set('e1', {
      id: 'e1',
      pos: { x: room.arena.w - ENEMY_RADIUS - 1, y: 300 },
      vel: { x: 200, y: 0 },
    });

    const origRandom = Math.random;
    Math.random = () => 0.5;
    moveEnemies(room, 0.1);
    Math.random = origRandom;

    const e = room.enemies.get('e1')!;
    // Velocity should have been negated (bounced)
    expect(e.vel.x).toBeLessThan(0);
  });

  it('bounces off obstacles', () => {
    const room = new RoomManager().createRoom();
    const obstacle = room.obstacles[0]!; // { x: 200, y: 150, w: 60, h: 60 }
    // Place enemy just outside obstacle, moving into it
    room.enemies.set('e1', {
      id: 'e1',
      pos: { x: obstacle.x - ENEMY_RADIUS + 2, y: obstacle.y + obstacle.h / 2 },
      vel: { x: 200, y: 0 },
    });

    const origRandom = Math.random;
    Math.random = () => 0.5;
    moveEnemies(room, 0.1);
    Math.random = origRandom;

    const e = room.enemies.get('e1')!;
    // Velocity should have been negated (bounced off obstacle)
    expect(e.vel.x).toBeLessThan(0);
  });
});

describe('applyEnemyContactDamage', () => {
  it('damages the correct quadrant when enemy contacts robot', () => {
    const room = new RoomManager().createRoom();
    // Place enemy right on top of robot (NE quadrant: x > robot.x, y < robot.y)
    room.enemies.set('e1', {
      id: 'e1',
      pos: { x: room.robot.x + 10, y: room.robot.y - 10 },
      vel: { x: 0, y: 0 },
    });

    applyEnemyContactDamage(room, 1000);
    expect(room.quadrantHp[1]).toBe(95); // NE quadrant, 5 damage
    expect(room.quadrantHp[0]).toBe(100);
    expect(room.quadrantHp[2]).toBe(100);
    expect(room.quadrantHp[3]).toBe(100);
  });

  it('respects the contact damage cooldown interval', () => {
    const room = new RoomManager().createRoom();
    room.enemies.set('e1', {
      id: 'e1',
      pos: { x: room.robot.x + 5, y: room.robot.y + 5 },
      vel: { x: 0, y: 0 },
    });

    applyEnemyContactDamage(room, 1000);
    expect(room.quadrantHp[3]).toBe(95);

    // Try again too soon — should not damage
    applyEnemyContactDamage(room, 1100);
    expect(room.quadrantHp[3]).toBe(95);
  });

  it('does not damage when enemy is far from robot', () => {
    const room = new RoomManager().createRoom();
    room.enemies.set('e1', {
      id: 'e1',
      pos: { x: room.robot.x + 200, y: room.robot.y + 200 },
      vel: { x: 0, y: 0 },
    });

    applyEnemyContactDamage(room, 1000);
    expect(room.quadrantHp).toEqual({ 0: 100, 1: 100, 2: 100, 3: 100 });
  });

  it('reduces damage on shielded quadrant', () => {
    const room = new RoomManager().createRoom();
    room.shieldQuadrant = 1; // shield NE
    room.enemies.set('e1', {
      id: 'e1',
      pos: { x: room.robot.x + 10, y: room.robot.y - 10 },
      vel: { x: 0, y: 0 },
    });

    applyEnemyContactDamage(room, 1000);
    // Shielded quadrant gets 20% of 5 = 1
    expect(room.quadrantHp[1]).toBe(99);
  });
});

describe('killEnemiesInAttack', () => {
  it('kills enemies inside melee range in the correct quadrant', () => {
    const room = new RoomManager().createRoom();
    // Enemy in NE quadrant, close to robot
    room.enemies.set('near-ne', {
      id: 'near-ne', pos: { x: room.robot.x + 25, y: room.robot.y - 25 }, vel: { x: 0, y: 0 },
    });
    // Enemy in NW quadrant
    room.enemies.set('near-nw', {
      id: 'near-nw', pos: { x: room.robot.x - 25, y: room.robot.y - 25 }, vel: { x: 0, y: 0 },
    });

    const killed = killEnemiesInAttack(room, 'melee', 1, room.robot);
    expect(killed).toBe(1);
    expect(room.enemies.has('near-ne')).toBe(false);
    expect(room.enemies.has('near-nw')).toBe(true);
  });

  it('kills enemies inside rotary range', () => {
    const room = new RoomManager().createRoom();
    room.enemies.set('mid', {
      id: 'mid', pos: { x: room.robot.x + 80, y: room.robot.y - 20 }, vel: { x: 0, y: 0 },
    });

    const killed = killEnemiesInAttack(room, 'rotary', 1, room.robot);
    expect(killed).toBe(1);
    expect(room.enemies.has('mid')).toBe(false);
  });

  it('laser kills enemies at any distance in the correct quadrant', () => {
    const room = new RoomManager().createRoom();
    // Far enemy in NE quadrant
    room.enemies.set('far-ne', {
      id: 'far-ne', pos: { x: room.robot.x + 350, y: room.robot.y - 250 }, vel: { x: 0, y: 0 },
    });
    // Far enemy in SW quadrant — should NOT be killed by NE laser
    room.enemies.set('far-sw', {
      id: 'far-sw', pos: { x: room.robot.x - 350, y: room.robot.y + 250 }, vel: { x: 0, y: 0 },
    });

    const killed = killEnemiesInAttack(room, 'laser', 1, room.robot);
    expect(killed).toBe(1);
    expect(room.enemies.has('far-ne')).toBe(false);
    expect(room.enemies.has('far-sw')).toBe(true);
  });

  it('bomb kills enemies within blast radius regardless of quadrant', () => {
    const room = new RoomManager().createRoom();
    const bombPos = { x: 300, y: 300 };
    room.enemies.set('close', {
      id: 'close', pos: { x: 310, y: 310 }, vel: { x: 0, y: 0 },
    });
    room.enemies.set('far', {
      id: 'far', pos: { x: 600, y: 600 }, vel: { x: 0, y: 0 },
    });

    const killed = killEnemiesInAttack(room, 'bomb', 1, bombPos);
    expect(killed).toBe(1);
    expect(room.enemies.has('close')).toBe(false);
    expect(room.enemies.has('far')).toBe(true);
  });
});
