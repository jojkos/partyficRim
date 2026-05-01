import { describe, it, expect } from 'vitest';
import { trySpawnPowerup, processPickups, POWERUP_RADIUS } from './powerups.js';
import type { PowerupState, Rect, Vec2 } from '@partyficrim/shared';

describe('trySpawnPowerup', () => {
  it('spawns when interval elapsed and below cap', () => {
    const pwr = new Map<string, PowerupState>();
    const out = trySpawnPowerup({
      now: 5000, lastSpawnAt: 0, intervalMs: 3000, max: 5,
      arena: { x: 0, y: 0, w: 200, h: 200 }, obstacles: [], existing: pwr,
    });
    expect(out).not.toBeNull();
    expect(pwr.size).toBe(1);
  });

  it('does not spawn before interval', () => {
    const pwr = new Map<string, PowerupState>();
    const out = trySpawnPowerup({
      now: 1000, lastSpawnAt: 0, intervalMs: 3000, max: 5,
      arena: { x: 0, y: 0, w: 200, h: 200 }, obstacles: [], existing: pwr,
    });
    expect(out).toBeNull();
  });

  it('does not spawn when at cap', () => {
    const pwr = new Map<string, PowerupState>();
    for (let i = 0; i < 5; i++) pwr.set(`${i}`, { id: `${i}`, pos: { x: 50 + i * 10, y: 50 } });
    const out = trySpawnPowerup({
      now: 5000, lastSpawnAt: 0, intervalMs: 3000, max: 5,
      arena: { x: 0, y: 0, w: 200, h: 200 }, obstacles: [], existing: pwr,
    });
    expect(out).toBeNull();
  });
});

describe('processPickups', () => {
  it('removes powerups overlapping any pickup pos and returns count', () => {
    const pwr = new Map<string, PowerupState>([
      ['a', { id: 'a', pos: { x: 100, y: 100 } }],
      ['b', { id: 'b', pos: { x: 500, y: 500 } }],
    ]);
    const positions: { pos: Vec2; half: number }[] = [
      { pos: { x: 100, y: 100 }, half: 20 },
    ];
    const picked = processPickups(pwr, positions);
    expect(picked).toBe(1);
    expect(pwr.has('a')).toBe(false);
    expect(pwr.has('b')).toBe(true);
  });
});
