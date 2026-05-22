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
  // Match SvgArena's stretch mapping so attack visuals align with the robot sprite.
  const scaleX = sw / snap.arena.w;
  const scaleY = sh / snap.arena.h;
  const tx = (x: number) => (x - snap.arena.x) * scaleX;
  const ty = (y: number) => (y - snap.arena.y) * scaleY;
  const ts = (v: number) => v * Math.min(scaleX, scaleY);

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

function drawArc(
  g: PIXI.Graphics,
  origin: { x: number; y: number },
  quadrant: Quadrant,
  radius: number,
  color: number,
  alpha: number,
  thickness: number,
  arcFraction: number,
  tx: (v: number) => number,
  ty: (v: number) => number,
  ts: (v: number) => number
) {
  const { start, end } = quadrantAngles(quadrant);
  const center = (start + end) / 2;
  const span = (end - start) * arcFraction;
  const a0 = center - span / 2;
  const a1 = center + span / 2;
  const steps = 16;
  g.lineStyle(ts(thickness), color, alpha);
  g.moveTo(tx(origin.x + Math.cos(a0) * radius), ty(origin.y + Math.sin(a0) * radius));
  for (let i = 1; i <= steps; i++) {
    const a = a0 + (a1 - a0) * (i / steps);
    g.lineTo(tx(origin.x + Math.cos(a) * radius), ty(origin.y + Math.sin(a) * radius));
  }
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
  // Melee: a swing trail of concentric arcs, all bounded by MELEE_RADIUS so
  // the visual matches the actual hit range.
  drawSector(g, origin, quadrant, MELEE_RADIUS, colorAt(0), alpha * 0.6, tx, ty);
  const trails: Array<{ r: number; w: number; a: number; frac: number }> = [
    { r: 0.55, w: 2, a: 0.35, frac: 0.55 },
    { r: 0.72, w: 3, a: 0.55, frac: 0.70 },
    { r: 0.88, w: 4, a: 0.80, frac: 0.84 },
    { r: 1.00, w: 5, a: 1.00, frac: 0.95 },
  ];
  trails.forEach((t, i) => {
    drawArc(g, origin, quadrant, MELEE_RADIUS * t.r, colorAt(i), alpha * t.a, t.w, t.frac, tx, ty, ts);
  });
  // bright leading edge gleam
  drawArc(g, origin, quadrant, MELEE_RADIUS * 1.0, 0xffffff, alpha * 0.7, 1.5, 0.45, tx, ty, ts);
}

