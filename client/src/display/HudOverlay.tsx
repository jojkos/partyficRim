import type { DisplaySnapshot, Mode, Role } from '@polararena/shared';

const ROLE_COLOR: Record<Role, string> = { X: '#ff5577', Y: '#55c2ff' };

function modeLabel(m: Mode): string {
  return m === 'in_robot' ? 'in robot' : 'on foot';
}

export function HudOverlay({ snap }: { snap: DisplaySnapshot }) {
  const x = snap.players.find((p) => p.role === 'X');
  const y = snap.players.find((p) => p.role === 'Y');

  return (
    <div style={{
      position: 'fixed', inset: 0, pointerEvents: 'none', padding: 24,
      display: 'grid', gridTemplateColumns: '1fr 1fr', alignItems: 'start',
    }}>
      <div style={{ display: 'flex', gap: 24, fontSize: 24 }}>
        <Slot role="X" color={ROLE_COLOR.X} mode={x?.mode} />
        <Slot role="Y" color={ROLE_COLOR.Y} mode={y?.mode} />
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontSize: 18, opacity: 0.6 }}>Score</div>
        <div style={{ fontSize: 64, fontWeight: 800 }}>{snap.score}</div>
        <div style={{ fontSize: 14, opacity: 0.5 }}>Room {snap.roomCode}</div>
      </div>
      {snap.phase === 'paused' && (
        <div style={{
          position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 48, color: '#fff',
        }}>
          Paused — waiting for reconnect
        </div>
      )}
    </div>
  );
}

function Slot({ role, color, mode }: { role: Role; color: string; mode: Mode | undefined }) {
  return (
    <div style={{
      border: `2px solid ${color}`, borderRadius: 8, padding: '8px 16px',
      color, fontWeight: 700,
    }}>
      {role}-axis: {mode ? modeLabel(mode) : '—'}
    </div>
  );
}
