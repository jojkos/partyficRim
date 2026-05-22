import type { CoreState, DisplaySnapshot, EnemyState, Quadrant, Rect, Vec2 } from '@partyficrim/shared';
import { CORE_COLORS } from '@partyficrim/shared';
import { EnemySprite, Obstacle, PlayerAvatar, Robot, enemyKindFromId } from './Sprites.js';

/* ── Coordinate helpers ─────────────────────────────────────── */

function xPct(x: number, arena: Rect) { return (x - arena.x) / arena.w * 100; }
function yPct(y: number, arena: Rect) { return (y - arena.y) / arena.h * 100; }

/* ── Sandstone tile background ──────────────────────────────── */

const SAND = {
  base1: '#f6e4b8', base2: '#efd29a', dark: '#e6bf80',
  shadow: '#d8a866', crack: '#b88a4e', grass1: '#9bb86a', grass2: '#7a9a4c',
};

function SandstoneTiles() {
  let s = 7;
  const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };

  const tiles: Array<{
    pts: [number, number][];
    fill: string;
    damaged: boolean;
    cracked: boolean;
    grassy: boolean;
    cx: number;
    cy: number;
  }> = [];
  const W = 1600, H = 900, cols = 10, rows = 6;
  const cellW = W / cols, cellH = H / rows;

  for (let ry = -1; ry < rows + 1; ry++) {
    for (let rx = -1; rx < cols + 1; rx++) {
      const cx = rx * cellW + cellW / 2 + (rnd() - 0.5) * cellW * 0.6;
      const cy = ry * cellH + cellH / 2 + (rnd() - 0.5) * cellH * 0.6;
      const sides = 4 + Math.floor(rnd() * 3);
      const pts: [number, number][] = [];
      for (let i = 0; i < sides; i++) {
        const ang = (i / sides) * Math.PI * 2 + rnd() * 0.4;
        const r = cellW * 0.55 + rnd() * cellW * 0.25;
        pts.push([cx + Math.cos(ang) * r, cy + Math.sin(ang) * r * 0.85]);
      }
      const tone = rnd();
      const fill = tone < 0.25 ? SAND.dark : tone < 0.6 ? SAND.base2 : SAND.base1;
      tiles.push({ cx, cy, pts, fill, damaged: rnd() < 0.18, cracked: rnd() < 0.3, grassy: rnd() < 0.22 });
    }
  }

  return (
    <svg viewBox={`0 0 ${1600} ${900}`} preserveAspectRatio="xMidYMid slice"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
      <defs>
        <filter id="pf-rough" x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3" />
          <feDisplacementMap in="SourceGraphic" scale="3" />
        </filter>
        <radialGradient id="pf-sandGrad" cx="50%" cy="45%">
          <stop offset="0%" stopColor="#fbeec4" />
          <stop offset="55%" stopColor="#f1d9a0" />
          <stop offset="100%" stopColor="#e6c184" />
        </radialGradient>
      </defs>
      <rect width={1600} height={900} fill="url(#pf-sandGrad)" />
      <g filter="url(#pf-rough)">
        {tiles.map((t, i) => {
          const path = 'M ' + t.pts.map(p => p.join(',')).join(' L ') + ' Z';
          return (
            <g key={i}>
              <path d={path} fill="rgba(160,110,55,0.18)" transform="translate(2 3)" />
              <path d={path} fill={t.fill} stroke={SAND.crack} strokeWidth="1.6" strokeLinejoin="round" strokeOpacity="0.55" />
              <path d={path} fill="none" stroke="rgba(255,245,215,0.55)" strokeWidth="1.2" />
              {t.damaged && (
                <path d={`M ${t.cx - cellW * 0.3} ${t.cy + cellH * 0.1} L ${t.cx - cellW * 0.1} ${t.cy + cellH * 0.3} L ${t.cx + cellW * 0.05} ${t.cy + cellH * 0.15} Z`}
                  fill={SAND.shadow} opacity="0.35" />
              )}
              {t.cracked && (
                <g stroke={SAND.crack} strokeWidth="1.2" fill="none" opacity="0.45" strokeLinecap="round">
                  <path d={`M ${t.cx - cellW * 0.2} ${t.cy - cellH * 0.1} Q ${t.cx} ${t.cy} ${t.cx + cellW * 0.18} ${t.cy + cellH * 0.05}`} />
                  <path d={`M ${t.cx + cellW * 0.05} ${t.cy - cellH * 0.2} L ${t.cx} ${t.cy + cellH * 0.1}`} strokeWidth="1" />
                </g>
              )}
              {t.grassy && (
                <g>
                  <path d={`M ${t.cx - cellW * 0.15} ${t.cy + cellH * 0.2} L ${t.cx - cellW * 0.13} ${t.cy + cellH * 0.1} M ${t.cx - cellW * 0.12} ${t.cy + cellH * 0.2} L ${t.cx - cellW * 0.10} ${t.cy + cellH * 0.08} M ${t.cx - cellW * 0.09} ${t.cy + cellH * 0.2} L ${t.cx - cellW * 0.07} ${t.cy + cellH * 0.12}`}
                    stroke={SAND.grass1} strokeWidth="1.5" fill="none" strokeLinecap="round" />
                  <path d={`M ${t.cx + cellW * 0.18} ${t.cy + cellH * 0.18} L ${t.cx + cellW * 0.20} ${t.cy + cellH * 0.05} M ${t.cx + cellW * 0.22} ${t.cy + cellH * 0.18} L ${t.cx + cellW * 0.24} ${t.cy + cellH * 0.08}`}
                    stroke={SAND.grass2} strokeWidth="1.5" fill="none" strokeLinecap="round" />
                </g>
              )}
            </g>
          );
        })}
      </g>
      <g opacity="0.35">
        {Array.from({ length: 30 }, (_, i) => {
          const px = (i * 53) % 1600 + (i * 7 % 40);
          const py = (i * 91) % 900;
          return <circle key={i} cx={px} cy={py} r={1.5 + (i % 3)} fill={i % 2 ? SAND.shadow : SAND.crack} />;
        })}
      </g>
    </svg>
  );
}

/* ── Quadrant indicator ─────────────────────────────────────── */

/* Game quadrants: 0=NW, 1=NE, 2=SW, 3=SE — map to diagonal arc angles */
const Q_CENTER: Record<Quadrant, number> = { 0: 225, 1: 315, 2: 135, 3: 45 };
const HALF_ARC = 40; // degrees per side
const ARC_NEUTRAL = 'rgba(255,255,255,0.18)';
const ARC_ATTACK = '#ffe066';
const ARC_SHIELD = '#77ddff';

interface QuadrantIndicatorProps {
  activeQuadrant: Quadrant | null;
  shieldQuadrant: Quadrant | null;
}

function QuadrantIndicator({ activeQuadrant, shieldQuadrant }: QuadrantIndicatorProps) {
  const r = 105;
  const size = 260;
  const c = size / 2;
  const quads = ([0, 1, 2, 3] as Quadrant[]);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}
      style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', pointerEvents: 'none', zIndex: 2 }}>
      {/* subtle outer range ring */}
      <circle cx={c} cy={c} r={r} fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth="1.5" strokeDasharray="6 6" />
      {/* quadrant arcs — only highlight when active or shielded */}
      {quads.map((q) => {
        const a0 = (Q_CENTER[q] - HALF_ARC) * Math.PI / 180;
        const a1 = (Q_CENTER[q] + HALF_ARC) * Math.PI / 180;
        const x0 = c + r * Math.cos(a0), y0 = c + r * Math.sin(a0);
        const x1 = c + r * Math.cos(a1), y1 = c + r * Math.sin(a1);
        const isActive = activeQuadrant === q;
        const isShield = shieldQuadrant === q;
        const strokeColor = isShield ? ARC_SHIELD : isActive ? ARC_ATTACK : ARC_NEUTRAL;
        const highlighted = isActive || isShield;
        return (
          <path key={q}
            d={`M ${x0} ${y0} A ${r} ${r} 0 0 1 ${x1} ${y1}`}
            fill="none"
            stroke={strokeColor}
            strokeWidth={highlighted ? 8 : 2}
            strokeLinecap="round"
            opacity={highlighted ? 1 : 0.6}
            style={{
              filter: highlighted ? `drop-shadow(0 0 10px ${strokeColor})` : 'none',
              transition: 'all 0.3s',
            }}
          />
        );
      })}
    </svg>
  );
}

/* ── Entity components ─────────────────────────────────────── */

function arenaStyle(pos: Vec2, arena: Rect, halfW: number, halfH: number): React.CSSProperties {
  return {
    position: 'absolute',
    left: `calc(${xPct(pos.x, arena)}% - ${halfW}px)`,
    top:  `calc(${yPct(pos.y, arena)}% - ${halfH}px)`,
  };
}

function EnemyEntity({ enemy, arena }: { enemy: EnemyState; arena: Rect }) {
  const kind = enemyKindFromId(enemy.id);
  return (
    <div style={{ ...arenaStyle(enemy.pos, arena, 36, 36), width: 72, height: 72, zIndex: 3 }}>
      <EnemySprite kind={kind} size={72} />
      <div style={{
        position: 'absolute', bottom: 4, left: '50%', transform: 'translateX(-50%)',
        width: 40, height: 5, background: 'rgba(0,0,0,0.5)',
        borderRadius: 3, overflow: 'hidden',
      }}>
        <div style={{ height: '100%', width: '60%', background: '#ef4444' }} />
      </div>
    </div>
  );
}

function ObstacleEntity({ obs, arena }: { obs: Rect; arena: Rect }) {
  const cx = obs.x + obs.w / 2;
  const cy = obs.y + obs.h / 2;
  return (
    <div style={{ ...arenaStyle({ x: cx, y: cy }, arena, 28, 28), zIndex: 2 }}>
      <Obstacle kind="rock" size={56} />
    </div>
  );
}

function CoreDot({ core, arena }: { core: CoreState; arena: Rect }) {
  const color = CORE_COLORS[core.type];
  return (
    <div style={{
      ...arenaStyle(core.pos, arena, 10, 10),
      width: 20, height: 20, borderRadius: '50%',
      background: color,
      border: '2px solid rgba(255,255,255,0.6)',
      boxShadow: `0 0 8px ${color}`,
      zIndex: 2,
    }} />
  );
}

interface RobotEntityProps {
  pos: Vec2;
  arena: Rect;
  attackQuadrant: Quadrant | null;
  shieldQuadrant: Quadrant | null;
  bodyColor?: string;
  glow?: string;
}

function RobotEntity({ pos, arena, attackQuadrant, shieldQuadrant, bodyColor = '#7fb86b', glow = '#22d3ee' }: RobotEntityProps) {
  return (
    <div style={{ ...arenaStyle(pos, arena, 120, 120), width: 240, height: 240, zIndex: 4 }}>
      <QuadrantIndicator activeQuadrant={attackQuadrant} shieldQuadrant={shieldQuadrant} />
      <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', animation: 'pf-bob 2s ease-in-out infinite' }}>
        <Robot size={110} glow={glow} bodyColor={bodyColor} />
        <div style={{
          position: 'absolute', bottom: -4, left: '50%', transform: 'translateX(-50%)',
          width: 88, height: 16,
          background: 'radial-gradient(ellipse, rgba(0,0,0,0.55) 0%, transparent 70%)',
          filter: 'blur(2px)',
        }} />
      </div>
    </div>
  );
}

function PlayerMarker({ pos, arena, role }: { pos: Vec2; arena: Rect; role: string }) {
  return (
    <div style={{ ...arenaStyle(pos, arena, 16, 16), zIndex: 5 }}>
      <PlayerAvatar role={role as 'defense' | 'repair' | 'weapons'} size={32} />
    </div>
  );
}

/* ── Global animation keyframes ─────────────────────────────── */

const STYLE = `
  @keyframes pf-bob { 0%, 100% { transform: translate(-50%, -50%) translateY(0); } 50% { transform: translate(-50%, -50%) translateY(-4px); } }
  @keyframes pf-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
  @keyframes pf-wobble { 0%, 100% { transform: scaleX(1) scaleY(1); } 50% { transform: scaleX(1.06) scaleY(0.94); } }
`;

/* ── Main export ────────────────────────────────────────────── */

interface Props { snap: DisplaySnapshot; }

export function SvgArena({ snap }: Props) {
  return (
    <>
      <style>{STYLE}</style>
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
        {/* sandstone floor */}
        <SandstoneTiles />
        {/* vignette */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 5,
          background: 'radial-gradient(ellipse at center, transparent 60%, rgba(184,138,78,0.18) 100%)',
        }} />
        {/* obstacles */}
        {snap.obstacles.map((o, i) => <ObstacleEntity key={`obs-${i}`} obs={o} arena={snap.arena} />)}
        {/* cores */}
        {snap.cores.map((c) => <CoreDot key={`core-${c.id}`} core={c} arena={snap.arena} />)}
        {/* enemies */}
        {snap.enemies.map((e) => <EnemyEntity key={`enemy-${e.id}`} enemy={e} arena={snap.arena} />)}
        {/* robot */}
        <RobotEntity
          pos={snap.robot} arena={snap.arena}
          attackQuadrant={snap.attackQuadrant}
          shieldQuadrant={snap.shieldQuadrant}
        />
        {/* on-foot players */}
        {snap.players
          .filter((p) => p.mode === 'on_foot' && p.role)
          .map((p) => (
            <PlayerMarker key={p.id} pos={p.pos} arena={snap.arena} role={p.role!} />
          ))}
      </div>
    </>
  );
}
