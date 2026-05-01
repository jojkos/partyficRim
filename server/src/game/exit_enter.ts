import type { Mode, Vec2 } from '@partyficrim/shared';

export function isNearRobot(pos: Vec2, robot: Vec2, tile: number): boolean {
  return Math.hypot(pos.x - robot.x, pos.y - robot.y) <= tile;
}

export interface MutablePlayer {
  mode: Mode;
  pos: Vec2;
}

export function handleButton(player: MutablePlayer, robot: Vec2, tile: number): void {
  if (player.mode === 'in_robot') {
    player.mode = 'on_foot';
    player.pos.x = robot.x + tile; // offset 1 tile right
    player.pos.y = robot.y;
    return;
  }
  if (player.mode === 'on_foot' && isNearRobot(player.pos, robot, tile)) {
    player.mode = 'in_robot';
  }
}
