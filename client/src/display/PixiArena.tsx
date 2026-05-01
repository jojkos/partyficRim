import { useEffect, useRef } from 'react';
import * as PIXI from 'pixi.js';
import { CORE_COLORS, type DisplaySnapshot, type Quadrant } from '@partyficrim/shared';

const WEAPON_RADIUS_100 = 160;
const MELEE_RADIUS = WEAPON_RADIUS_100 * 0.25;
const ROTARY_RADIUS = WEAPON_RADIUS_100 * 0.75;
const BOMB_RADIUS = WEAPON_RADIUS_100 * 0.5;

interface Props { snap: DisplaySnapshot; }

interface Layers {
  floor: PIXI.Graphics;
  obstacles: PIXI.Graphics;
  cores: PIXI.Graphics;
  enemies: PIXI.Graphics;
  attacks: PIXI.Graphics;
  robot: PIXI.Graphics;
  players: PIXI.Container;
}

export function PixiArena({ snap }: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const appRef = useRef<PIXI.Application | null>(null);
  const layersRef = useRef<Layers | null>(null);
  const snapRef = useRef(snap);

  // mount once
  useEffect(() => {
    if (!hostRef.current) return;
    const app = new PIXI.Application({
      resizeTo: hostRef.current, background: '#0a0a12', antialias: true,
    });
    hostRef.current.appendChild(app.view as HTMLCanvasElement);
    appRef.current = app;

    const floor = new PIXI.Graphics();
    const obstacles = new PIXI.Graphics();
    const cores = new PIXI.Graphics();
    const enemies = new PIXI.Graphics();
    const attacks = new PIXI.Graphics();
    const robot = new PIXI.Graphics();
    const players = new PIXI.Container();
    app.stage.addChild(floor, obstacles, cores, enemies, attacks, robot, players);
    layersRef.current = { floor, obstacles, cores, enemies, attacks, robot, players };

    app.ticker.add(() => render(snapRef.current, layersRef.current!, app));

    return () => { app.destroy(true, { children: true }); appRef.current = null; };
  }, []);

  // keep latest snapshot in ref
  useEffect(() => { snapRef.current = snap; }, [snap]);

  return <div ref={hostRef} style={{ position: 'fixed', inset: 0 }} />;
}

function render(snap: DisplaySnapshot, layers: Layers, app: PIXI.Application) {
  const sw = app.screen.width;
  const sh = app.screen.height;
  const margin = 40;
  const scaleX = (sw - margin * 2) / snap.arena.w;
  const scaleY = (sh - margin * 2) / snap.arena.h;
  const scale = Math.min(scaleX, scaleY);
  const offsetX = (sw - snap.arena.w * scale) / 2;
  const offsetY = (sh - snap.arena.h * scale) / 2;

  const tx = (x: number) => offsetX + x * scale;
  const ty = (y: number) => offsetY + y * scale;
  const ts = (v: number) => v * scale;

  // floor
  layers.floor.clear();
  layers.floor.beginFill(0x1a1a26);
  layers.floor.drawRect(tx(0), ty(0), ts(snap.arena.w), ts(snap.arena.h));
  layers.floor.endFill();
  layers.floor.lineStyle(2, 0x444466).drawRect(tx(0), ty(0), ts(snap.arena.w), ts(snap.arena.h));

  // obstacles
  layers.obstacles.clear();
  layers.obstacles.beginFill(0x444466);
  for (const o of snap.obstacles) layers.obstacles.drawRect(tx(o.x), ty(o.y), ts(o.w), ts(o.h));
  layers.obstacles.endFill();

  layers.cores.clear();
  for (const c of snap.cores) {
    layers.cores.beginFill(parseColor(CORE_COLORS[c.type]));
    layers.cores.drawCircle(tx(c.pos.x), ty(c.pos.y), ts(8));
    layers.cores.endFill();
    layers.cores.lineStyle(2, 0xffffff, 0.45).drawCircle(tx(c.pos.x), ty(c.pos.y), ts(10));
  }

  layers.enemies.clear();
  for (const enemy of snap.enemies) {
    layers.enemies.beginFill(0xff4455, 0.95);
    layers.enemies.drawCircle(tx(enemy.pos.x), ty(enemy.pos.y), ts(12));
    layers.enemies.endFill();
    layers.enemies.lineStyle(2, 0xffffff, 0.65).drawCircle(tx(enemy.pos.x), ty(enemy.pos.y), ts(14));
    layers.enemies.lineStyle(2, 0x220000, 0.85)
      .moveTo(tx(enemy.pos.x - 6), ty(enemy.pos.y - 6))
      .lineTo(tx(enemy.pos.x + 6), ty(enemy.pos.y + 6))
      .moveTo(tx(enemy.pos.x + 6), ty(enemy.pos.y - 6))
      .lineTo(tx(enemy.pos.x - 6), ty(enemy.pos.y + 6));
  }

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

  // robot
  layers.robot.clear();
  layers.robot.beginFill(0x88ddaa);
  layers.robot.drawRoundedRect(tx(snap.robot.x) - ts(20), ty(snap.robot.y) - ts(20), ts(40), ts(40), ts(6));
  layers.robot.endFill();
  drawQuadrantOverlay(layers.robot, snap, tx, ty, ts);

  // on-foot players
  layers.players.removeChildren();
  for (const p of snap.players) {
    if (p.mode !== 'on_foot') continue;
    const g = new PIXI.Graphics();
    g.beginFill(p.role === 'defense' ? 0xff5577 : p.role === 'repair' ? 0x55c2ff : 0xffe066);
    g.drawCircle(tx(p.pos.x), ty(p.pos.y), ts(10));
    g.endFill();
    layers.players.addChild(g);
  }
}

function parseColor(color: string): number {
  return Number.parseInt(color.replace('#', ''), 16);
}

function hpColor(hp: number): number {
  if (hp < 25) return 0xff334f;
  if (hp < 60) return 0xffe066;
  return 0x88ddaa;
}

function drawQuadrantOverlay(
  g: PIXI.Graphics,
  snap: DisplaySnapshot,
  tx: (v: number) => number,
  ty: (v: number) => number,
  ts: (v: number) => number
) {
  const x = snap.robot.x;
  const y = snap.robot.y;
  const size = 74;
  const half = size / 2;
  const cells: Array<[Quadrant, number, number]> = [
    [0, x - half, y - half],
    [1, x, y - half],
    [2, x - half, y],
    [3, x, y],
  ];
  for (const [q, cx, cy] of cells) {
    const hp = snap.quadrantHp[q];
    g.beginFill(hpColor(hp), hp < 25 ? 0.38 : 0.18);
    g.drawRect(tx(cx), ty(cy), ts(size / 2), ts(size / 2));
    g.endFill();
    g.lineStyle(1, 0xffffff, 0.25);
    g.drawRect(tx(cx), ty(cy), ts(size / 2), ts(size / 2));
  }
  if (snap.shieldQuadrant !== null) {
    const selected = cells.find(([q]) => q === snap.shieldQuadrant);
    if (selected) {
      const [, cx, cy] = selected;
      const inset = 5;
      const shieldSize = size / 2 - inset * 2;
      g.lineStyle(4, 0x77ddff, 0.98);
      g.drawRoundedRect(tx(cx + inset), ty(cy + inset), ts(shieldSize), ts(shieldSize), ts(5));
      g.lineStyle(2, 0xffffff, 0.75);
      g.drawRoundedRect(tx(cx + inset + 4), ty(cy + inset + 4), ts(shieldSize - 8), ts(shieldSize - 8), ts(3));
    }
  }
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
