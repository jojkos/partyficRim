import type { Rect, Vec2 } from '@polararena/shared';

export function resolveCollisions(pos: Vec2, half: number, obstacles: Rect[], arena: Rect): void {
  // clamp to arena
  pos.x = Math.max(arena.x + half, Math.min(arena.x + arena.w - half, pos.x));
  pos.y = Math.max(arena.y + half, Math.min(arena.y + arena.h - half, pos.y));

  // push out of obstacles
  for (const o of obstacles) {
    const left = o.x, right = o.x + o.w, top = o.y, bottom = o.y + o.h;
    const eLeft = pos.x - half, eRight = pos.x + half, eTop = pos.y - half, eBottom = pos.y + half;
    if (eRight <= left || eLeft >= right || eBottom <= top || eTop >= bottom) continue;

    const penLeft = eRight - left;
    const penRight = right - eLeft;
    const penTop = eBottom - top;
    const penBottom = bottom - eTop;
    const minPen = Math.min(penLeft, penRight, penTop, penBottom);
    if (minPen === penLeft) pos.x -= penLeft;
    else if (minPen === penRight) pos.x += penRight;
    else if (minPen === penTop) pos.y -= penTop;
    else pos.y += penBottom;
  }
}
