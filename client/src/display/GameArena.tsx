import { useEffect, useRef } from "react";
import * as P from "pixi.js";
import {
  CORE_COLORS,
  MELEE_RADIUS,
  ROTARY_RADIUS,
  BOMB_DAMAGE_RADIUS,
  type DisplaySnapshot,
  type Quadrant,
  type Vec2,
} from "@partyficrim/shared";
import { artUrl, enemyKindFromId, ROLE_COLOR } from "../ui/art.js";
import type { FrameRef } from "./useDisplayState.js";
import { interpolate, viewportTransform } from "./sceneMath.js";
interface Entity {
  container: P.Container;
  sprite?: P.Sprite;
  shadow?: P.Graphics;
  seed: number;
  born: number;
}
const INK = 0x28283d;
const color = (hex: string) => Number.parseInt(hex.replace("#", ""), 16);
function shadow(width: number, height: number) {
  const g = new P.Graphics();
  g.beginFill(0x151424, 0.25).drawEllipse(0, 0, width, height).endFill();
  return g;
}
export default function GameArena({ frames }: { frames: FrameRef }) {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!host.current) return;
    const node = host.current;
    const app = new P.Application({
      resizeTo: node,
      backgroundColor: 0x211d35,
      antialias: true,
      resolution: Math.min(2, devicePixelRatio || 1),
      autoDensity: true,
    });
    node.appendChild(app.view as HTMLCanvasElement);
    (app.view as HTMLCanvasElement).setAttribute(
      "aria-label",
      "Cooperative robot arena",
    );
    (app.view as HTMLCanvasElement).setAttribute("role", "img");
    const world = new P.Container(),
      floor = new P.Graphics(),
      props = new P.Graphics(),
      actors = new P.Container(),
      fx = new P.Graphics();
    app.stage.addChild(world);
    world.addChild(floor, props, actors, fx);
    const textures = new Map<string, P.Texture>();
    const texture = (kind: string) => {
      let t = textures.get(kind);
      if (!t) {
        t = P.Texture.from(artUrl(kind));
        textures.set(kind, t);
      }
      return t;
    };
    const robot = new P.Container(),
      robotBody = new P.Sprite(texture("robot")),
      robotShadow = shadow(23, 8),
      robotEyes = new P.Graphics();
    robotShadow.y = 25;
    robotBody.anchor.set(0.5);
    robotBody.width = 86;
    robotBody.height = 86;
    robot.addChild(robotShadow, robotBody, robotEyes);
    actors.addChild(robot);
    const entities = new Map<string, Entity>();
    let roomKey = "",
      oldHp = 400,
      hitAt = -1000,
      lastAt = performance.now(),
      smoothMotion = 0;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    function entity(id: string, kind: string, now: number): Entity {
      let e = entities.get(id);
      if (e) return e;
      const container = new P.Container();
      let sprite: P.Sprite | undefined;
      if (kind.startsWith("pilot:")) {
        const role = kind.split(":")[1] as keyof typeof ROLE_COLOR;
        const g = new P.Graphics();
        g.lineStyle(1.5, INK)
          .beginFill(color(ROLE_COLOR[role]))
          .drawRoundedRect(-9, -11, 18, 21, 7)
          .endFill();
        g.lineStyle(0)
          .beginFill(0x393d52)
          .drawRoundedRect(-7, -6, 14, 8, 4)
          .endFill();
        g.lineStyle(1.4, 0xfff1d8)
          .moveTo(-4, -2)
          .lineTo(-2, -2)
          .moveTo(2, -2)
          .lineTo(4, -2);
        container.addChild(shadow(9, 4), g);
      } else if (kind.startsWith("core:")) {
        const c = color(
          CORE_COLORS[kind.split(":")[1] as keyof typeof CORE_COLORS],
        );
        const g = new P.Graphics();
        g.lineStyle(1.3, INK)
          .beginFill(c)
          .drawPolygon([0, -11, 9, -5, 9, 5, 0, 11, -9, 5, -9, -5])
          .endFill();
        g.lineStyle(0)
          .beginFill(0xffffff, 0.32)
          .drawPolygon([0, -11, 9, -5, 0, 0, -9, -5])
          .endFill();
        g.lineStyle(1, 0xffffff, 0.5).moveTo(0, 0).lineTo(0, 9);
        container.addChild(g);
      } else {
        const sh = shadow(13, 4);
        sh.y = 14;
        sprite = new P.Sprite(texture(kind));
        sprite.anchor.set(0.5);
        sprite.width = 50;
        sprite.height = 50;
        container.addChild(sh, sprite);
      }
      actors.addChild(container);
      e = { container, sprite, seed: entities.size * 1.7, born: now };
      entities.set(id, e);
      return e;
    }
    function backdrop(s: DisplaySnapshot) {
      floor.clear();
      floor
        .lineStyle(4, 0x60526e)
        .beginFill(0x686477)
        .drawRoundedRect(0, 0, s.arena.w, s.arena.h, 14)
        .endFill();
      // Quiet, offset deck tiles and a few inset markings leave the action readable.
      for (let y = 0; y < s.arena.h; y += 50)
        for (let x = 0; x < s.arena.w; x += 50) {
          const n = ((x * 3 + y * 7) % 13) / 13;
          floor
            .lineStyle(1, 0x29273e, 0.18)
            .beginFill(n > 0.6 ? 0x756e81 : 0x6c667c, 0.6)
            .drawRoundedRect(x + 2, y + 2, 46, 46, 5)
            .endFill();
          if (n > 0.72) {
            floor
              .lineStyle(1, 0xb4a28a, 0.25)
              .moveTo(x + 9, y + 13)
              .lineTo(x + 20, y + 13);
          }
        }
      floor
        .lineStyle(1, 0xcab78e, 0.25)
        .drawRoundedRect(12, 12, s.arena.w - 24, s.arena.h - 24, 9);
      props.clear();
      for (const o of s.obstacles) {
        const x = o.x - s.arena.x,
          y = o.y - s.arena.y;
        props
          .lineStyle(0)
          .beginFill(0x242336, 0.3)
          .drawRoundedRect(x + 3, y + 5, o.w, o.h, 6)
          .endFill();
        props
          .lineStyle(2, INK)
          .beginFill(0x9991a1)
          .drawRoundedRect(x, y, o.w, o.h, 5)
          .endFill();
        props
          .lineStyle(0)
          .beginFill(0xb8abaf)
          .drawRoundedRect(x + 3, y + 3, o.w - 6, Math.max(5, o.h * 0.28), 3)
          .endFill();
        props
          .lineStyle(2, 0x756a80)
          .drawRoundedRect(x + 6, y + 8, o.w - 12, o.h - 14, 3);
        props
          .lineStyle(2, 0xd6c6a7, 0.6)
          .moveTo(x + 10, y + 12)
          .lineTo(x + Math.min(25, o.w - 8), y + 12);
        for (const [dx, dy] of [
          [6, 6],
          [o.w - 6, 6],
          [6, o.h - 6],
          [o.w - 6, o.h - 6],
        ])
          props
            .lineStyle(0)
            .beginFill(INK, 0.65)
            .drawCircle(x + dx!, y + dy!, 1.4)
            .endFill();
      }
    }
    function sector(
      origin: Vec2,
      q: Quadrant,
      r: number,
      c: number,
      alpha: number,
    ) {
      const a0 =
        q === 0 ? Math.PI : q === 1 ? -Math.PI / 2 : q === 2 ? Math.PI / 2 : 0;
      fx.lineStyle(2, c, alpha)
        .beginFill(c, 0.12 * alpha)
        .moveTo(origin.x, origin.y);
      for (let i = 0; i <= 20; i++) {
        const a = a0 + ((i / 20) * Math.PI) / 2;
        fx.lineTo(origin.x + Math.cos(a) * r, origin.y + Math.sin(a) * r);
      }
      fx.lineTo(origin.x, origin.y).endFill();
    }
    const render = () => {
      const now = performance.now(),
        f = frames.current,
        s = f.current;
      if (!s) return;
      const prev = f.previous ?? s,
        dt = Math.min(0.1, (now - lastAt) / 1000);
      lastAt = now;
      const transform = viewportTransform(
        app.screen.width,
        app.screen.height,
        s.arena,
      );
      world.scale.set(transform.scale);
      world.position.set(transform.x, transform.y);
      if (roomKey !== s.roomCode) {
        roomKey = s.roomCode;
        for (const e of entities.values())
          e.container.destroy({ children: true });
        entities.clear();
        backdrop(s);
        oldHp = 400;
      }
      const t =
        s.phase === "playing"
          ? Math.min(1, Math.max(0, (now - f.receivedAt) / f.interval))
          : 1;
      const pos = interpolate(prev.robot, s.robot, t);
      const speed = Math.hypot(
        s.robot.x - prev.robot.x,
        s.robot.y - prev.robot.y,
      );
      smoothMotion +=
        (speed > 0.1 ? 1 - smoothMotion : -smoothMotion) * Math.min(1, dt * 10);
      robot.position.set(pos.x - s.arena.x, pos.y - s.arena.y);
      const hp = Object.values(s.quadrantHp).reduce((a, b) => a + b, 0);
      if (hp < oldHp) hitAt = now;
      oldHp = hp;
      const active = s.phase === "playing" && !reduced.matches;
      robotBody.rotation = active
        ? Math.sin(now * 0.014) * 0.025 * smoothMotion
        : 0;
      robotBody.y = active ? Math.sin(now * 0.018) * 1.1 * smoothMotion : 0;
      robotBody.tint = now - hitAt < 150 ? 0xffbec6 : 0xffffff;
      robotEyes.clear();
      if (active && now % 4800 > 4590) {
        robotEyes
          .lineStyle(2, 0x31364e)
          .moveTo(-11, -8)
          .lineTo(-5, -8)
          .moveTo(5, -8)
          .lineTo(11, -8);
      }
      const live = new Set<string>();
      for (const enemy of s.enemies) {
        live.add(enemy.id);
        const e = entity(enemy.id, enemyKindFromId(enemy.id), now),
          before = prev.enemies.find((p) => p.id === enemy.id),
          p = interpolate(before?.pos ?? enemy.pos, enemy.pos, t);
        e.container.position.set(p.x - s.arena.x, p.y - s.arena.y);
        if (e.sprite) {
          e.sprite.y = active ? Math.sin(now * 0.008 + e.seed) * 2 : 0;
          e.sprite.rotation = active
            ? Math.sin(now * 0.006 + e.seed) * 0.055
            : 0;
          e.sprite.height =
            50 * (active ? 1 + Math.sin(now * 0.008 + e.seed) * 0.025 : 1);
        }
        e.container.alpha = Math.min(1, (now - e.born) / 180);
      }
      for (const core of s.cores) {
        live.add(core.id);
        const e = entity(core.id, `core:${core.type}`, now);
        e.container.position.set(
          core.pos.x - s.arena.x,
          core.pos.y -
            s.arena.y +
            (active ? Math.sin(now * 0.002 + e.seed) * 1.4 : 0),
        );
        e.container.alpha = 0.9;
      }
      for (const p of s.players) {
        if (p.mode !== "on_foot" || !p.connected || !p.role) continue;
        live.add(p.id);
        const e = entity(p.id, `pilot:${p.role}`, now),
          before = prev.players.find((v) => v.id === p.id),
          v = interpolate(before?.pos ?? p.pos, p.pos, t);
        e.container.position.set(v.x - s.arena.x, v.y - s.arena.y);
      }
      for (const [id, e] of entities)
        if (!live.has(id)) {
          e.container.destroy({ children: true });
          entities.delete(id);
        }
      fx.clear();
      const origin = { x: pos.x - s.arena.x, y: pos.y - s.arena.y };
      if (s.shieldQuadrant !== null) {
        const q = s.shieldQuadrant,
          a0 =
            q === 0
              ? Math.PI
              : q === 1
                ? -Math.PI / 2
                : q === 2
                  ? Math.PI / 2
                  : 0;
        fx.lineStyle(8, 0xff8ca4, 0.18).arc(
          origin.x,
          origin.y,
          33,
          a0 + 0.1,
          a0 + Math.PI / 2 - 0.1,
        );
        fx.lineStyle(3, 0xffaac0, 0.9).arc(
          origin.x,
          origin.y,
          33,
          a0 + 0.1,
          a0 + Math.PI / 2 - 0.1,
        );
      }
      for (const bomb of s.bombs) {
        const x = bomb.pos.x - s.arena.x,
          y = bomb.pos.y - s.arena.y;
        fx.lineStyle(1.5, 0xffd477, 0.45)
          .beginFill(0xffd477, 0.06)
          .drawCircle(x, y, bomb.radius)
          .endFill();
        fx.lineStyle(2, INK).beginFill(0x51445c).drawCircle(x, y, 9).endFill();
        fx.lineStyle(2, 0xffd477)
          .moveTo(x + 3, y - 7)
          .lineTo(x + 7, y - 13);
        fx.lineStyle(0)
          .beginFill(0xffd477, Math.floor(now / 180) % 2 ? 0.95 : 0.4)
          .drawCircle(x + 7, y - 14, 2.5)
          .endFill();
      }
      for (const a of s.attacks) {
        const duration = a.kind === "bomb" ? 900 : 450,
          alpha = Math.max(0, Math.min(1, a.ttlMsRemaining / duration)),
          c = color(a.colors[0] ?? "#ffd477"),
          o = a.pos
            ? { x: a.pos.x - s.arena.x, y: a.pos.y - s.arena.y }
            : origin;
        if (a.kind === "bomb") {
          const r = BOMB_DAMAGE_RADIUS * (1 - alpha * 0.6);
          fx.lineStyle(3, c, alpha)
            .beginFill(c, 0.09 * alpha)
            .drawCircle(o.x, o.y, r)
            .endFill();
          fx.lineStyle(1, 0xfff1d8, alpha * 0.6).drawCircle(o.x, o.y, r * 0.7);
        } else {
          const radius =
            a.kind === "melee"
              ? MELEE_RADIUS
              : a.kind === "rotary"
                ? ROTARY_RADIUS
                : Math.hypot(s.arena.w, s.arena.h);
          sector(o, a.quadrant, radius, c, alpha);
          const angle =
            (a.quadrant === 0
              ? Math.PI
              : a.quadrant === 1
                ? -Math.PI / 2
                : a.quadrant === 2
                  ? Math.PI / 2
                  : 0) +
            Math.PI / 4;
          if (a.kind === "rotary")
            for (let i = 0; i < 7; i++) {
              const r = 30 + ((i * 15 + now * 0.15) % 90),
                angle2 = angle + ((i % 3) - 1) * 0.18;
              fx.lineStyle(3, c, alpha)
                .moveTo(o.x + Math.cos(angle2) * r, o.y + Math.sin(angle2) * r)
                .lineTo(
                  o.x + Math.cos(angle2) * (r + 6),
                  o.y + Math.sin(angle2) * (r + 6),
                );
            }
        }
      }
      if (active && smoothMotion > 0.15) {
        for (let i = 0; i < 3; i++) {
          const age = (now / 200 + i / 3) % 1;
          fx.lineStyle(0)
            .beginFill(0xd6c6a7, (1 - age) * 0.2 * smoothMotion)
            .drawCircle(
              origin.x - 10 + i * 10,
              origin.y + 28 + age * 10,
              1 + age * 2,
            )
            .endFill();
        }
      }
    };
    app.ticker.add(render);
    return () => {
      app.ticker.remove(render);
      app.destroy(true, { children: true });
      for (const t of textures.values()) t.destroy(true);
    };
  }, [frames]);
  return <div ref={host} className="arena-canvas" />;
}
