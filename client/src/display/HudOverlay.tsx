import type { DisplaySnapshot, Mode, Quadrant, Role } from '@partyficrim/shared';
import { ROLE_LABEL } from '@partyficrim/shared';

const ROLE_COLOR: Record<Role, string> = { defense: '#ff5577', repair: '#55c2ff', weapons: '#ffe066' };
const QUADRANTS: Quadrant[] = [0, 1, 2, 3];
const QUADRANT_LABEL = ['NW', 'NE', 'SW', 'SE'] as const;

function modeLabel(m: Mode): string {
  return m === 'in_robot' ? 'in robot' : 'on foot';
}

interface Props {
  snap: DisplaySnapshot;
  onResetRoom: () => void;
}

export function HudOverlay({ snap, onResetRoom }: Props) {
  return (
    <div style={{
      position: 'fixed', inset: 0, pointerEvents: 'none', padding: 24,
      display: 'grid', gridTemplateColumns: '1fr 1fr', alignItems: 'start',
    }}>
      <div style={{ display: 'flex', gap: 12, fontSize: 16, flexWrap: 'wrap', maxWidth: 620 }}>
        {(['defense', 'repair', 'weapons'] as Role[]).map((role) => {
          const p = snap.players.find((player) => player.role === role);
          return <Slot key={role} role={role} color={ROLE_COLOR[role]} mode={p?.mode} connected={p?.connected} />;
        })}
      </div>
      <div style={{ justifySelf: 'end', textAlign: 'right' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 72px)', gap: 8 }}>
          {QUADRANTS.map((q) => (
            <div key={q} style={{
              border: `2px solid ${snap.quadrantHp[q] < 25 ? '#ff5577' : 'rgba(255,255,255,0.22)'}`,
              borderRadius: 8,
              padding: 8,
              background: 'rgba(0,0,0,0.35)',
            }}>
              <div style={{ fontSize: 12, opacity: 0.65 }}>{QUADRANT_LABEL[q]}</div>
              <div style={{ fontSize: 24, fontWeight: 900 }}>{snap.quadrantHp[q]}</div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 14, opacity: 0.5, marginTop: 8 }}>Room {snap.roomCode}</div>
      </div>
      <button
        onClick={onResetRoom}
        style={{
          position: 'fixed', bottom: 16, right: 16, pointerEvents: 'auto',
          padding: '8px 14px', fontSize: 13,
          background: 'transparent', color: '#888',
          border: '1px solid #444', borderRadius: 6, cursor: 'pointer',
        }}
      >
        × end game
      </button>
      {snap.phase === 'paused' && <OverlayText text="Paused - waiting for reconnect" />}
      {snap.phase === 'gameover' && <GameOverOverlay onRestart={onResetRoom} />}
    </div>
  );
}

function Slot({ role, color, mode, connected }: { role: Role; color: string; mode: Mode | undefined; connected: boolean | undefined }) {
  return (
    <div style={{
      border: `2px solid ${color}`, borderRadius: 8, padding: '8px 12px',
      color, fontWeight: 700, background: 'rgba(0,0,0,0.32)',
      opacity: connected === false ? 0.45 : 1,
    }}>
      {ROLE_LABEL[role]}: {mode ? modeLabel(mode) : '-'}
    </div>
  );
}

function OverlayText({ text }: { text: string }) {
  return (
    <div style={{
      position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.65)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 48, color: '#fff', fontWeight: 900, letterSpacing: 4,
    }}>
      {text}
    </div>
  );
}

function GameOverOverlay({ onRestart }: { onRestart: () => void }) {
  return (
    <div style={{
      position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.65)',
      display: 'flex', flexDirection: 'column', gap: 24,
      alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontWeight: 900, letterSpacing: 4,
    }}>
      <div style={{ fontSize: 48 }}>ROBOT DESTROYED</div>
      <button
        onClick={onRestart}
        style={{
          pointerEvents: 'auto',
          padding: '16px 30px',
          borderRadius: 10,
          border: '2px solid #88ddaa',
          background: '#88ddaa',
          color: '#0a0a12',
          fontSize: 22,
          fontWeight: 900,
          letterSpacing: 2,
          cursor: 'pointer',
        }}
      >
        RESTART
      </button>
    </div>
  );
}
