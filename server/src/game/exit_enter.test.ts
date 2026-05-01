import { describe, it, expect } from 'vitest';
import { handleButton, isNearRobot } from './exit_enter.js';
import type { Vec2 } from '@partyficrim/shared';

const ROBOT_POS: Vec2 = { x: 100, y: 100 };
const TILE = 32;

describe('isNearRobot', () => {
  it('true within 1 tile', () => {
    expect(isNearRobot({ x: 110, y: 110 }, ROBOT_POS, TILE)).toBe(true);
  });
  it('false beyond 1 tile', () => {
    expect(isNearRobot({ x: 200, y: 200 }, ROBOT_POS, TILE)).toBe(false);
  });
});

describe('handleButton', () => {
  it('exits when in_robot — sets mode to on_foot and offsets pos', () => {
    const player = { mode: 'in_robot' as const, pos: { x: ROBOT_POS.x, y: ROBOT_POS.y } };
    handleButton(player, ROBOT_POS, TILE);
    expect(player.mode).toBe('on_foot');
    expect(Math.hypot(player.pos.x - ROBOT_POS.x, player.pos.y - ROBOT_POS.y)).toBeGreaterThan(0);
  });

  it('enters when on_foot AND near robot', () => {
    const player = { mode: 'on_foot' as const, pos: { x: ROBOT_POS.x + 10, y: ROBOT_POS.y } };
    handleButton(player, ROBOT_POS, TILE);
    expect(player.mode).toBe('in_robot');
  });

  it('does not enter when on_foot AND far from robot', () => {
    const player = { mode: 'on_foot' as const, pos: { x: 500, y: 500 } };
    handleButton(player, ROBOT_POS, TILE);
    expect(player.mode).toBe('on_foot');
  });
});
