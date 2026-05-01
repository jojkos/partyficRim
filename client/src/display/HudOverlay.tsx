import type { DisplaySnapshot, Mode, Role } from '@polararena/shared';

const ROLE_COLOR: Record<Role, string> = { X: '#ff5577', Y: '#55c2ff' };

function modeLabel(m: Mode): string {
  return m === 'in_robot' ? 'in robot' : 'on foot';
}

interface Props {
  snap: DisplaySnapshot;
  onResetRoom: () => void;
}

export function HudOverlay({ snap, onResetRoom }: Props) {
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
