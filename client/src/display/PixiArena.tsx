import { useEffect, useRef } from 'react';
import * as PIXI from 'pixi.js';
import { type DisplaySnapshot, type Quadrant } from '@partyficrim/shared';

const WEAPON_RADIUS_100 = 160;
const MELEE_RADIUS = WEAPON_RADIUS_100 * 0.25;
const ROTARY_RADIUS = WEAPON_RADIUS_100 * 0.75;
const BOMB_RADIUS = WEAPON_RADIUS_100 * 0.5;

interface Props { snap: DisplaySnapshot; }

interface Layers {
  attacks: PIXI.Graphics;
}

export function PixiArena({ snap }: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const appRef = useRef<PIXI.Application | null>(null);
  const layersRef = useRef<Layers | null>(null);
  const snapRef = useRef(snap);

  useEffect(() => {
    if (!hostRef.current) return;
    const app = new PIXI.Application({
      resizeTo: hostRef.current,
      backgroundAlpha: 0,
      antialias: true,
    });
    hostRef.current.appendChild(app.view as HTMLCanvasElement);
    appRef.current = app;

    const attacks = new PIXI.Graphics();
    app.stage.addChild(attacks);
    layersRef.current = { attacks };

    app.ticker.add(() => render(snapRef.current, layersRef.current!, app));

    return () => { app.destroy(true, { children: true }); appRef.current = null; };
  }, []);

  useEffect(() => { snapRef.current = snap; }, [snap]);

  return (
    <div ref={hostRef} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 6 }} />
  );
}

function render(snap: DisplaySnapshot, layers: Layers, app: PIXI.Application) {
  const sw = app.screen.width;
  const sh = app.screen.height;
  const margin = 0; // no margin — arena fills container
  const scaleX = (sw - margin * 2) / snap.arena.w;
  const scaleY = (sh - margin * 2) / snap.arena.h;
  const scale = Math.min(scaleX, scaleY);
  const offsetX = (sw - snap.arena.w * scale) / 2;
  const offsetY = (sh - snap.arena.h * scale) / 2;

  const tx = (x: number) => offsetX + (x - snap.arena.x) * scale;
  const ty = (y: number) => offsetY + (y - snap.arena.y) * scale;
  const ts = (v: number) => v * scale;

  // attacks & bombs only
  layers.attacks.clear();
  for (const bomb of snap.bombs) {
    layers.attacks.beginFill(0xffe066, 0.08).drawCircle(tx(bomb.pos.x), ty(bomb.pos.y), ts(bomb.radius)).endFill();
    layers.attacks.lineStyle(2, 0xffe066, 0.45).drawCircle(tx(bomb.pos.x), ty(bomb.pos.y), ts(bomb.radius));
    layers.attacks.lineStyle(3, 0xffe066, 0.9).drawCircle(tx(bomb.pos.x), ty(bomb.pos.y), ts(14));
    const fuse = Math.ceil(bomb.fuseMsRemaining / 1000);
    layers.attacks.beginFill(0xffe066, 0.2).drawCircle(tx(bomb.pos.x), ty(bomb.pos.y), ts(18 + fuse)).endFill();
  }
  for (const attack of snap.attacks) {
    const alpha = Math.max(0.15, attack.ttlMsRemaining / 500);
    const colors = attack.colors.length > 0 ? attack.colors.map(parseColor) : [0xeeeeee];
    drawAttack(layers.attacks, snap, attack.kind, attack.quadrant, colors, alpha, tx, ty, ts, attack.pos);
  }
}

function parseColor(color: string): number {
  return Number.parseInt(color.replace('#', ''), 16);
}

function quadrantVector(q: Quadrant): { x: number; y: number } {
  if (q === 0) return { x: -1, y: -1 };
  if (q === 1) return { x: 1, y: -1 };
  if (q === 2) return { x: -1, y: 1 };
  return { x: 1, y: 1 };
}

function quadrantAngles(q: Quadrant): { start: number; end: number } {
  if (q === 1) return { start: -Math.PI / 2, end: 0 };
  if (q === 3) return { start: 0, end: Math.PI / 2 };
  if (q === 2) return { start: Math.PI / 2, end: Math.PI };
  return { start: Math.PI, end: Math.PI * 1.5 };
}

function drawSector(
  g: PIXI.Graphics,
  origin: { x: number; y: number },
  quadrant: Quadrant,
  radius: number,
  color: number,
  alpha: number,
  tx: (v: number) => number,
  ty: (v: number) => number
) {
  const { start, end } = quadrantAngles(quadrant);
  const steps = 18;
  g.beginFill(color, 0.08 * alpha);
  g.moveTo(tx(origin.x), ty(origin.y));
  for (let i = 0; i <= steps; i++) {
    const a = start + (end - start) * (i / steps);
    g.lineTo(tx(origin.x + Math.cos(a) * radius), ty(origin.y + Math.sin(a) * radius));
  }
  g.closePath();
  g.endFill();
  g.lineStyle(2, color, 0.42 * alpha);
  g.moveTo(tx(origin.x), ty(origin.y));
  g.lineTo(tx(origin.x + Math.cos(start) * radius), ty(origin.y + Math.sin(start) * radius));
  for (let i = 0; i <= steps; i++) {
    const a = start + (end - start) * (i / steps);
    g.lineTo(tx(origin.x + Math.cos(a) * radius), ty(origin.y + Math.sin(a) * radius));
  }
  g.lineTo(tx(origin.x), ty(origin.y));
}

function drawAttack(
  g: PIXI.Graphics,
  snap: DisplaySnapshot,
  kind: string,
  quadrant: Quadrant,
  colors: number[],
  alpha: number,
  tx: (v: number) => number,
  ty: (v: number) => number,
  ts: (v: number) => number,
  pos?: { x: number; y: number }
) {
  const origin = pos ?? snap.robot;
  const dir = quadrantVector(quadrant);
  const ox = tx(origin.x);
  const oy = ty(origin.y);
  const colorAt = (i: number) => colors[i % colors.length] ?? 0xeeeeee;
  if (kind === 'laser') {
    const far = Math.max(snap.arena.w, snap.arena.h) * 1.5;
    drawSector(g, origin, quadrant, far, colorAt(0), alpha, tx, ty);
    colors.forEach((color, i) => drawSector(g, origin, quadrant, far - i * 14, color, alpha * 0.55, tx, ty));
    return;
  }
  if (kind === 'rotary') {
    drawSector(g, origin, quadrant, ROTARY_RADIUS, colorAt(0), alpha, tx, ty);
    for (let i = 0; i < 10; i++) {
      const spread = (i - 4.5) * 8;
      const start = 46 + (i % 3) * 8;
      const end = start + 22;
      g.lineStyle(ts(3), colorAt(i), alpha)
        .moveTo(tx(origin.x + dir.x * start + -dir.y * spread), ty(origin.y + dir.y * start + dir.x * spread))
        .lineTo(tx(origin.x + dir.x * end + -dir.y * spread), ty(origin.y + dir.y * end + dir.x * spread));
    }
    return;
  }
  if (kind === 'bomb') {
    colors.forEach((color, i) => {
      g.lineStyle(ts(3), color, alpha).drawCircle(ox, oy, ts(BOMB_RADIUS - i * 5));
    });
    g.beginFill(colorAt(0), 0.16 * alpha).drawCircle(ox, oy, ts(BOMB_RADIUS)).endFill();
    return;
  }
  drawSector(g, origin, quadrant, MELEE_RADIUS, colorAt(0), alpha, tx, ty);
  for (let i = 0; i < 4; i++) {
    const spread = (i - 1.5) * 11;
    g.lineStyle(ts(5), colorAt(i), alpha)
      .moveTo(tx(origin.x + dir.x * 20 + -dir.y * spread), ty(origin.y + dir.y * 20 + dir.x * spread))
      .quadraticCurveTo(
        tx(origin.x + dir.x * 44 + -dir.y * spread * 1.8),
        ty(origin.y + dir.y * 44 + dir.x * spread * 1.8),
        tx(origin.x + dir.x * 72 + -dir.y * spread * 0.4),
        ty(origin.y + dir.y * 72 + dir.x * spread * 0.4)
      );
  }
  g.lineStyle(ts(2), 0xffffff, alpha).drawCircle(tx(origin.x + dir.x * 72), ty(origin.y + dir.y * 72), ts(11));
}

