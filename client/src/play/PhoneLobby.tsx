import type { PhoneSnapshot, Role } from '@polararena/shared';
import type { AppSocket } from '../socket.js';
import { useLandscape } from './useLandscape.js';

const ROLE_COLOR: Record<Role, string> = { X: '#ff5577', Y: '#55c2ff' };

interface Props {
  socket: AppSocket;
  role: Role;
  roomCode: string;
  snap: PhoneSnapshot | null;
}

export function PhoneLobby({ socket, role, roomCode, snap }: Props) {
  const { enterFullscreenLandscape, canFullscreen, isIOS, isStandalone } = useLandscape();
  const color = ROLE_COLOR[role];

  const playerCount = snap?.playerCount ?? 1;
  const canStart = playerCount === 2 && snap?.phase === 'lobby';
  const showCountdown = snap?.phase === 'countdown';

  const onStart = () => socket.emit('client:request_start');

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      height: '100%', gap: 18, padding: 20, textAlign: 'center',
    }}>
      <div style={{ fontSize: 16, opacity: 0.7 }}>Room {roomCode}</div>
      <div style={{ fontSize: 26 }}>You are</div>
      <div style={{ fontSize: 72, fontWeight: 800, color }}>{role}-axis</div>

      {showCountdown ? (
        <div style={{ fontSize: 32, fontWeight: 700 }}>Starting…</div>
      ) : (
        <>
          {canFullscreen && !isStandalone && (
            <button onClick={enterFullscreenLandscape} style={{
              padding: '12px 24px', fontSize: 18, borderRadius: 10, border: 'none',
              background: 'rgba(255,255,255,0.1)', color: '#fff', fontWeight: 600,
            }}>
              Tap to enter fullscreen
            </button>
          )}
          {isIOS && !isStandalone && (
            <div style={{
              padding: '8px 14px', fontSize: 13, opacity: 0.7, maxWidth: 320,
              borderRadius: 10, background: 'rgba(255,255,255,0.04)',
            }}>
              iPhone tip: tap Share → "Add to Home Screen" and open from there for fullscreen.
              Otherwise, just rotate to landscape and play with the URL bar visible.
            </div>
          )}

          <button
            onClick={onStart}
            disabled={!canStart}
            style={{
              marginTop: 8,
              padding: '20px 40px',
              fontSize: 28,
              fontWeight: 800,
              letterSpacing: 3,
              borderRadius: 14,
              border: 'none',
              background: canStart ? '#88ddaa' : '#333',
              color: canStart ? '#0a0a12' : '#666',
              cursor: canStart ? 'pointer' : 'not-allowed',
            }}
          >
            START
          </button>

          <div style={{ fontSize: 14, opacity: 0.6 }}>
            {canStart
              ? 'Anyone can press START'
              : `Waiting for other player… (${playerCount}/2)`}
          </div>
        </>
      )}
    </div>
  );
}
