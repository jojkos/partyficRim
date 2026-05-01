import { useEffect, useRef } from 'react';
import * as PIXI from 'pixi.js';
import type { DisplaySnapshot } from '@partyficrim/shared';

interface Props { snap: DisplaySnapshot; }

interface Layers {
  floor: PIXI.Graphics;
  obstacles: PIXI.Graphics;
  powerups: PIXI.Graphics;
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
    const powerups = new PIXI.Graphics();
    const robot = new PIXI.Graphics();
    const players = new PIXI.Container();
    app.stage.addChild(floor, obstacles, powerups, robot, players);
    layersRef.current = { floor, obstacles, powerups, robot, players };

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

  // powerups
  layers.powerups.clear();
  layers.powerups.beginFill(0xffe066);
  for (const u of snap.powerups) layers.powerups.drawCircle(tx(u.pos.x), ty(u.pos.y), ts(8));
  layers.powerups.endFill();

  // robot
  layers.robot.clear();
  layers.robot.beginFill(0x88ddaa);
  layers.robot.drawRoundedRect(tx(snap.robot.x) - ts(20), ty(snap.robot.y) - ts(20), ts(40), ts(40), ts(6));
  layers.robot.endFill();

  // on-foot players
  layers.players.removeChildren();
  for (const p of snap.players) {
    if (p.mode !== 'on_foot') continue;
    const g = new PIXI.Graphics();
    g.beginFill(p.role === 'X' ? 0xff5577 : 0x55c2ff);
    g.drawCircle(tx(p.pos.x), ty(p.pos.y), ts(10));
    g.endFill();
    layers.players.addChild(g);
  }
}
