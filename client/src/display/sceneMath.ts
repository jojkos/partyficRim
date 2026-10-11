import type { Rect, Vec2 } from "@partyficrim/shared";
export function viewportTransform(width: number, height: number, arena: Rect) {
  const scale = Math.min(width / arena.w, height / arena.h);
  return {
    scale,
    x: (width - arena.w * scale) / 2,
    y: (height - arena.h * scale) / 2,
  };
}
export function interpolate(before: Vec2, after: Vec2, t: number): Vec2 {
  const fraction = Math.max(0, Math.min(1, t));
  return {
    x: before.x + (after.x - before.x) * fraction,
    y: before.y + (after.y - before.y) * fraction,
  };
}
