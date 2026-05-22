import { useEffect, useRef } from 'react';
import type { DisplaySnapshot, Vec2 } from '@partyficrim/shared';

// Half-life of the exponential lerp toward the server position, in ms.
// 30 ms feels native: steady motion has zero offset; direction changes
// catch up in ~100 ms (3 half-lives) without overshoot.
const HALF_LIFE_MS = 30;

export type RobotPosRef = { readonly current: Vec2 };

/**
 * Drives a single rAF loop that smooths the robot's rendered position toward
 * the latest server snapshot. Returns a ref both arenas can read each frame
 * without triggering React renders. Sharing one ref keeps the robot sprite
 * (SvgArena) and the attack origin (PixiArena) visually aligned.
 */
export function useSmoothedRobot(snap: DisplaySnapshot | null): RobotPosRef {
  const out = useRef<Vec2>({ x: 0, y: 0 });
  const target = useRef<Vec2>({ x: 0, y: 0 });
  const initialized = useRef(false);

  // Track the latest server position as the smoothing target.
  useEffect(() => {
    if (!snap) return;
    target.current = { x: snap.robot.x, y: snap.robot.y };
    if (!initialized.current) {
      out.current = { x: snap.robot.x, y: snap.robot.y };
      initialized.current = true;
    }
  }, [snap?.robot.x, snap?.robot.y]);

  // Single rAF loop that lerps the displayed position toward the target.
  useEffect(() => {
    let raf = 0;
    let lastTs = performance.now();
    const tick = (ts: number) => {
      const dt = ts - lastTs;
      lastTs = ts;
      // k = 1 - 0.5^(dt / halfLife) — frame-rate-independent exponential lerp.
      const k = 1 - Math.pow(0.5, dt / HALF_LIFE_MS);
      out.current = {
        x: out.current.x + (target.current.x - out.current.x) * k,
        y: out.current.y + (target.current.y - out.current.y) * k,
      };
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return out;
}
