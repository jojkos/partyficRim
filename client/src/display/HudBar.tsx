import type { DisplaySnapshot, Quadrant, Role } from '@partyficrim/shared';
import { ROLE_LABEL } from '@partyficrim/shared';
import { PlayerAvatar } from './Sprites.js';

/* ── Design tokens ──────────────────────────────────────────── */

const C = {
  bgDeep: '#0a0b14', bgPanel: '#14172a', bgPanel2: '#1d2140',
  border: '#2a2f55', borderSoft: '#1f2440',
  textPrimary: '#e8ecff', textSecondary: '#8a90b8', textDim: '#5a608a',
  team1: '#22d3ee',
  health: '#22c55e', healthMid: '#facc15', healthLow: '#ef4444',
  warn: '#fb923c',
} as const;

const QUADRANT_LABEL: Record<Quadrant, string> = { 0: 'NW', 1: 'NE', 2: 'SW', 3: 'SE' };
const QUADRANT_COLOR: Record<Quadrant, string> = { 0: '#22d3ee', 1: '#f472b6', 2: '#fbbf24', 3: '#a3e635' };
const QUADS = [0, 1, 2, 3] as Quadrant[];

const ROLE_COLORS: Record<Role, string> = {
  defense: '#ff5577',
  repair: '#55c2ff',
  weapons: '#ffe066',
};

const ROLE_SHORT: Record<Role, string> = {
  defense: 'DEF',
  repair: 'REP',
  weapons: 'WPN',
};

/* ── Sub-components ─────────────────────────────────────────── */

function HealthBar({ pct, color }: { pct: number; color: string }) {
  const cls = pct < 25 ? 'low' : pct < 55 ? 'mid' : 'ok';
  const fillColor = cls === 'low'
    ? `linear-gradient(90deg, ${C.healthLow}, #fb7185)`
    : cls === 'mid'
      ? `linear-gradient(90deg, ${C.healthMid}, #fde047)`
      : `linear-gradient(90deg, ${C.health}, #4ade80)`;

  return (
    <div style={{
      height: 10, background: '#0a0c18', border: `1px solid ${C.borderSoft}`,
      borderRadius: 3, overflow: 'hidden', position: 'relative', flex: 1,
    }}>
      <div style={{
        height: '100%', width: `${pct}%`,
        background: fillColor,
        transition: 'width 0.4s',
        animation: cls === 'low' ? 'pf-hud-pulse 0.8s infinite' : 'none',
        boxShadow: `0 0 6px ${color}66`,
      }} />
      {/* tick marks overlay */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: 'repeating-linear-gradient(90deg, transparent 0 9px, rgba(0,0,0,0.4) 9px 10px)',
      }} />
    </div>
  );
}

function PlayerChip({ role, name, connected, color }: {
  role: Role; name: string; connected: boolean; color: string;
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
      padding: '4px 6px 4px 4px',
      border: `1px solid ${C.borderSoft}`, borderRadius: 5,
      background: 'rgba(0,0,0,0.25)',
      opacity: connected ? 1 : 0.35,
    }}>
      <div style={{
        width: 28, height: 28, borderRadius: 5,
        background: color + '22',
        display: 'grid', placeItems: 'center', flexShrink: 0,
        boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.08)',
      }}>
        <PlayerAvatar role={role} size={22} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <span style={{
          fontFamily: "'Press Start 2P', monospace", fontSize: 8,
          color: C.textPrimary, letterSpacing: '0.03em', whiteSpace: 'nowrap',
        }}>{name}</span>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: 8,
          color, letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 2,
        }}>{ROLE_SHORT[role]}</span>
      </div>
    </div>
  );
}

function TeamCard({ snap, teamColor }: { snap: DisplaySnapshot; teamColor: string }) {
  const avgHp = Math.round(
    (snap.quadrantHp[0] + snap.quadrantHp[1] + snap.quadrantHp[2] + snap.quadrantHp[3]) / 4
  );
  const inDanger = avgHp < 25;
  const roles: Role[] = ['defense', 'repair', 'weapons'];

  return (
    <div style={{
      flex: 1, maxWidth: 600, minWidth: 280,
      display: 'flex', flexDirection: 'column', gap: 6,
      padding: '8px 12px',
      border: `1px solid ${teamColor}`,
      borderRadius: 8,
      background: `linear-gradient(180deg, ${teamColor}22 0%, ${C.bgPanel} 100%)`,
      position: 'relative',
      boxShadow: `0 0 0 1px ${C.bgDeep}, 0 0 24px -8px ${teamColor}`,
    }}>
      {/* top accent line */}
      <div style={{
        position: 'absolute', top: 0, left: 12, width: 32, height: 2,
        background: teamColor, borderRadius: '0 0 2px 2px',
        boxShadow: `0 0 8px ${teamColor}`,
      }} />
      {/* header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 11, color: teamColor, letterSpacing: '0.05em' }}>
          ALPHA
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: C.textSecondary }}>
          <span style={{
            width: 8, height: 8, borderRadius: '50%',
            background: inDanger ? C.healthLow : C.health,
            boxShadow: `0 0 8px ${inDanger ? C.healthLow : C.health}`,
            animation: 'pf-hud-statusDot 1.6s infinite',
            display: 'inline-block',
          }} />
          <span>{inDanger ? 'CRITICAL' : 'ONLINE'}</span>
        </div>
      </div>
      {/* body row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {/* hp */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
            fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
            color: C.textDim, letterSpacing: '0.18em',
          }}>
            <span>ROBOT-01</span>
            <span style={{ color: C.textPrimary, fontSize: 11, letterSpacing: '0.04em' }}>
              {avgHp}/100
            </span>
          </div>
          <HealthBar pct={avgHp} color={teamColor} />
        </div>
        {/* player chips */}
        <div style={{ display: 'flex', gap: 6 }}>
          {roles.map((role) => {
            const p = snap.players.find((pl) => pl.role === role);
            const claim = snap.roleClaims[role];
            const name = claim ? claim.slice(-4).toUpperCase() : '----';
            const color = ROLE_COLORS[role];
            return (
              <PlayerChip key={role} role={role} name={name} connected={p?.connected ?? false} color={color} />
            );
          })}
        </div>
      </div>
    </div>
  );
}

function QuadrantMiniGrid({ snap }: { snap: DisplaySnapshot }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 48px)', gap: 4 }}>
      {QUADS.map((q) => {
        const hp = snap.quadrantHp[q];
        const low = hp < 25;
        const qColor = QUADRANT_COLOR[q];
        return (
          <div key={q} style={{
            border: `1px solid ${low ? C.healthLow : C.border}`,
            borderRadius: 5, padding: '4px 6px',
            background: C.bgPanel2,
            boxShadow: low ? `0 0 8px ${C.healthLow}55` : 'none',
          }}>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, color: qColor, letterSpacing: '0.1em' }}>
              {QUADRANT_LABEL[q]}
            </div>
            <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 10, color: low ? C.healthLow : C.textPrimary, marginTop: 2 }}>
              {hp}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── HUD animations (injected once) ────────────────────────── */

const HUD_STYLE = `
  @keyframes pf-hud-pulse { 0%, 100% { filter: brightness(1); } 50% { filter: brightness(1.4); } }
  @keyframes pf-hud-statusDot { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
`;

/* ── Main export ────────────────────────────────────────────── */

interface Props {
  snap: DisplaySnapshot;
  elapsed: number;
}

export function HudBar({ snap, elapsed }: Props) {
  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const ss = String(elapsed % 60).padStart(2, '0');
  const timeStr = `${mm}:${ss}`;

  return (
    <>
      <style>{HUD_STYLE}</style>
      <header style={{
        height: 100, flexShrink: 0,
        background: 'linear-gradient(180deg, rgba(20,23,42,0.96) 0%, rgba(20,23,42,0.78) 100%)',
        borderBottom: `1px solid ${C.border}`,
        backdropFilter: 'blur(16px)',
        display: 'flex', alignItems: 'stretch',
        padding: '10px 18px', gap: 14,
        position: 'relative', zIndex: 10,
      }}>
        {/* bottom gradient border */}
        <div style={{
          position: 'absolute', left: 0, right: 0, bottom: -1, height: 1,
          background: `linear-gradient(90deg, transparent, ${C.team1} 20%, #f472b6 50%, #a3e635 80%, transparent)`,
          opacity: 0.5,
        }} />

        {/* left: brand + enemy count */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '0 12px' }}>
            <div style={{
              fontFamily: "'Press Start 2P', monospace", fontSize: 16, letterSpacing: '0.06em',
              background: `linear-gradient(90deg, ${C.team1}, #f472b6)`,
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              PARTYFICRIM
            </div>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
              letterSpacing: '0.2em', color: C.textDim, textTransform: 'uppercase',
            }}>
              CO-OP // ARENA
            </div>
          </div>
          {/* enemy count */}
          <div style={{
            display: 'flex', flexDirection: 'column', justifyContent: 'center',
            padding: '8px 14px', border: `1px solid ${C.border}`, borderRadius: 6,
            background: C.bgPanel2, minWidth: 100,
          }}>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: C.textDim, letterSpacing: '0.2em' }}>
              ENEMIES
            </span>
            <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 14, color: C.warn, marginTop: 4 }}>
              {String(snap.enemies.length).padStart(2, '0')}
            </span>
          </div>
        </div>

        {/* center: team card */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'stretch', justifyContent: 'center', gap: 14, minWidth: 0 }}>
          <TeamCard snap={snap} teamColor={C.team1} />
        </div>

        {/* right: quadrant HP + timer */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          <QuadrantMiniGrid snap={snap} />
          <div style={{
            display: 'flex', flexDirection: 'column', justifyContent: 'center',
            padding: '8px 14px', border: `1px solid ${C.border}`, borderRadius: 6,
            background: C.bgPanel2, textAlign: 'right', minWidth: 110,
          }}>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: C.textDim, letterSpacing: '0.2em' }}>
              SURVIVED
            </span>
            <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 14, color: C.textPrimary, marginTop: 4 }}>
              {timeStr}
            </span>
          </div>
        </div>
      </header>
    </>
  );
}
