import { useEffect, useState } from 'react';
import type { PhoneSnapshot, Role } from '@partyficrim/shared';
import { ROLE_LABEL } from '@partyficrim/shared';
import type { AppSocket } from '../socket.js';
import { useLandscape } from './useLandscape.js';

const ROLE_COLOR: Record<Role, string> = { defense: '#ff5577', repair: '#55c2ff', weapons: '#ffe066' };
const ROLES: Role[] = ['defense', 'repair', 'weapons'];

interface Props {
  socket: AppSocket;
  role: Role | null;
  roomCode: string;
  snap: PhoneSnapshot | null;
  onLeave: () => void;
}

export function PhoneLobby({ socket, role, roomCode, snap, onLeave }: Props) {
  const { enterFullscreenLandscape, canFullscreen, isIOS, isStandalone } = useLandscape();
  const [pendingRole, setPendingRole] = useState<Role | null>(null);
  const color = role ? ROLE_COLOR[role] : '#88ddaa';

  const playerCount = snap?.playerCount ?? 1;
  const claims = snap?.roleClaims;
  const allClaimed = Boolean(claims?.defense && claims.repair && claims.weapons);
  const canStart = playerCount >= 3 && allClaimed && snap?.phase === 'lobby';
  const showCountdown = snap?.phase === 'countdown';

  const onStart = () => socket.emit('client:request_start');
  const onClaim = (next: Role) => {
    const desired = role === next ? null : next;
    setPendingRole(desired);
    socket.emit('phone:claim_role', { role: desired }, (res) => {
      if (!res.ok) setPendingRole(null);
    });
  };

  useEffect(() => {
    if (pendingRole === role) setPendingRole(null);
  }, [pendingRole, role]);

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      height: '100%', gap: 18, padding: 20, textAlign: 'center',
    }}>
      <div style={{ fontSize: 16, opacity: 0.7 }}>Room {roomCode}</div>
      <button
        onClick={onLeave}
        style={{
          position: 'fixed', top: 12, right: 12,
          padding: '8px 12px', borderRadius: 8,
          border: '1px solid rgba(255,255,255,0.22)',
          background: 'rgba(255,255,255,0.06)', color: '#ddd',
          fontWeight: 700,
        }}
      >
        Leave
      </button>
      <div style={{ fontSize: 26 }}>Pick your station</div>

      {showCountdown ? (
        <div style={{ fontSize: 32, fontWeight: 700 }}>Starting…</div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(120px, 1fr))', gap: 12, width: 'min(680px, 100%)' }}>
            {ROLES.map((r) => {
              const claimedBy = claims?.[r] ?? null;
              const claimed = Boolean(claimedBy);
              const mine = (pendingRole ?? role) === r;
              const disabled = claimed && !mine;
              return (
                <button
                  key={r}
                  onClick={() => onClaim(r)}
                  disabled={disabled}
                  style={{
                    minHeight: 104,
                    padding: 12,
                    borderRadius: 10,
                    border: `2px solid ${mine ? ROLE_COLOR[r] : 'rgba(255,255,255,0.2)'}`,
                    background: mine ? ROLE_COLOR[r] : disabled ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.08)',
                    color: mine ? '#0a0a12' : disabled ? '#666' : '#fff',
                    fontSize: 14,
                    fontWeight: 800,
                    letterSpacing: 1,
                    cursor: disabled ? 'not-allowed' : 'pointer',
                  }}
                >
                  {ROLE_LABEL[r]}
                </button>
              );
            })}
          </div>
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
              : `Waiting for 3 roles… (${playerCount}/3)`}
          </div>
        </>
      )}
    </div>
  );
}
