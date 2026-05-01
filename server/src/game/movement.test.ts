import { describe, it, expect } from 'vitest';
import { computeRobotVelocity, applyMovement } from './movement.js';
import type { Vec2 } from '@polararena/shared';

const SPEED = 200;

describe('computeRobotVelocity', () => {
  it('uses x-input only from X-role player when in robot', () => {
    const v = computeRobotVelocity({
      x: { input: { x: 1, y: 0.7 }, mode: 'in_robot' },
      y: { input: { x: 0.9, y: 1 }, mode: 'in_robot' },
    }, SPEED);
    expect(v.x).toBeCloseTo(SPEED, 5);
    expect(v.y).toBeCloseTo(SPEED, 5);
  });

  it('zeroes the X axis when X-role player is on foot', () => {
    const v = computeRobotVelocity({
      x: { input: { x: 1, y: 0 }, mode: 'on_foot' },
      y: { input: { x: 0, y: 1 }, mode: 'in_robot' },
    }, SPEED);
    expect(v.x).toBe(0);
    expect(v.y).toBeCloseTo(SPEED, 5);
  });

  it('zeroes both axes when both players are on foot', () => {
    const v = computeRobotVelocity({
      x: { input: { x: 1, y: 0 }, mode: 'on_foot' },
      y: { input: { x: 0, y: 1 }, mode: 'on_foot' },
    }, SPEED);
    expect(v).toEqual({ x: 0, y: 0 });
  });
});

describe('applyMovement', () => {
  it('moves position by velocity * dt', () => {
    const pos: Vec2 = { x: 100, y: 100 };
    applyMovement(pos, { x: 200, y: 0 }, 0.1);
    expect(pos.x).toBeCloseTo(120, 5);
    expect(pos.y).toBe(100);
  });
});
