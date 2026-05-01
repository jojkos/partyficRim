import { describe, it, expect } from 'vitest';
import { resolveCollisions } from './collision.js';
import type { Rect, Vec2 } from '@polararena/shared';

describe('resolveCollisions', () => {
  const arena: Rect = { x: 0, y: 0, w: 800, h: 600 };
  const half = 20;

  it('clamps to arena bounds', () => {
    const pos: Vec2 = { x: -10, y: 700 };
    resolveCollisions(pos, half, [], arena);
    expect(pos.x).toBe(half);
    expect(pos.y).toBe(arena.h - half);
  });

  it('pushes out of an obstacle along smaller axis', () => {
    const pos: Vec2 = { x: 105, y: 100 };
    const obstacles: Rect[] = [{ x: 100, y: 80, w: 60, h: 60 }]; // x∈[100,160], y∈[80,140]
    resolveCollisions(pos, half, obstacles, arena);
    // overlap on x=5 to right edge 160-(105-20)=75, so pen-x to right=75 vs left=(105+20)-100=25; smaller -> push left to x = 100 - half = 80
    expect(pos.x).toBeLessThanOrEqual(80 + 0.001);
  });

  it('does nothing when no overlap', () => {
    const pos: Vec2 = { x: 50, y: 50 };
    const obstacles: Rect[] = [{ x: 200, y: 200, w: 60, h: 60 }];
    resolveCollisions(pos, half, obstacles, arena);
    expect(pos).toEqual({ x: 50, y: 50 });
  });
});
