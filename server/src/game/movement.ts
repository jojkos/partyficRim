import type { Mode, Vec2 } from '@partyficrim/shared';

export interface RoleInput {
  input: Vec2; // raw input vector (already magnitude-clamped to <= 1)
  mode: Mode;
}

export function computeRobotVelocity(
  inputs: { x: RoleInput; y: RoleInput },
  speed: number
): Vec2 {
  // X-axis component comes only from X-role player and only if in robot
  const vx = inputs.x.mode === 'in_robot' ? Math.sign(inputs.x.input.x) * Math.min(1, Math.abs(inputs.x.input.x)) : 0;
  const vy = inputs.y.mode === 'in_robot' ? Math.sign(inputs.y.input.y) * Math.min(1, Math.abs(inputs.y.input.y)) : 0;
  // Discrete-style: full speed on each active axis (no magnitude scaling)
  return {
    x: vx === 0 ? 0 : Math.sign(vx) * speed,
    y: vy === 0 ? 0 : Math.sign(vy) * speed,
  };
}

export function applyMovement(pos: Vec2, vel: Vec2, dt: number): void {
  pos.x += vel.x * dt;
  pos.y += vel.y * dt;
}

export function computeOnFootVelocity(input: Vec2, speed: number): Vec2 {
  const m = Math.hypot(input.x, input.y);
  if (m < 0.01) return { x: 0, y: 0 };
  return { x: (input.x / m) * speed, y: (input.y / m) * speed };
}
