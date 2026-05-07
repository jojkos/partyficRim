import { useEffect, useState } from 'react';
import type { PhoneSnapshot, Role } from '@partyficrim/shared';
import type { AppSocket } from '../socket.js';
import { useLandscape } from './useLandscape.js';
import { PR } from '../ui/theme.js';

const ROLES: Role[] = ['defense', 'weapons', 'repair'];

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

  if (showCountdown) {
    return (
      <div style={{
        position: 'fixed', inset: 0,
        background: `linear-gradient(180deg, #2d1b4d 0%, ${PR.color.bg} 100%)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: PR.font.sans, color: PR.color.paper,
      }}>
        <div style={{
          font: `400 56px ${PR.font.display}`, color: PR.color.sun, letterSpacing: 4,
          textShadow: `3px 5px 0 ${PR.color.flameDk}, 6px 9px 0 ${PR.color.ink}`,
          animation: 'pr-pulse 1s ease-in-out infinite',
        }}>STARTING…</div>
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: `linear-gradient(180deg, #2d1b4d 0%, ${PR.color.bg} 100%)`,
      fontFamily: PR.font.sans, color: PR.color.paper,
      padding: '12px 16px', boxSizing: 'border-box', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', top: 10, left: 16,
        font: `700 11px ${PR.font.sans}`, letterSpacing: 2, color: PR.color.sun,
      }}>
        ROOM · {roomCode}
      </div>
      <button onClick={onLeave} style={{
        position: 'absolute', top: 8, right: 12,
        font: `700 11px ${PR.font.sans}`, letterSpacing: 1,
        color: PR.color.paper, opacity: 0.7,
        border: `1px solid ${PR.color.paper}33`, borderRadius: 6,
        padding: '4px 10px', background: 'transparent', cursor: 'pointer',
      }}>Leave</button>

      <div style={{ position: 'absolute', top: 36, left: 16, right: 16, textAlign: 'center' }}>
        <div style={{
          font: `400 24px ${PR.font.display}`, letterSpacing: 2,
          color: PR.color.paper, lineHeight: 1,
        }}>PICK YOUR STATION</div>
      </div>

      <div style={{
        position: 'absolute', top: 78, left: 16, right: 16,
        display: 'flex', gap: 10,
      }}>
        {ROLES.map((r) => {
          const claimedBy = claims?.[r] ?? null;
          const claimed = Boolean(claimedBy);
          const mine = (pendingRole ?? role) === r;
          const disabled = claimed && !mine;
          return (
            <PhoneRoleChip
              key={r}
              role={r}
              mine={mine}
              disabled={disabled}
              onClick={() => onClaim(r)}
            />
          );
        })}
      </div>

      {canFullscreen && !isStandalone && (
        <button onClick={enterFullscreenLandscape} style={{
          position: 'absolute', bottom: 56, left: '50%', transform: 'translateX(-50%)',
          padding: '6px 14px',
          font: `700 10px ${PR.font.sans}`, letterSpacing: 2,
          background: 'rgba(255,255,255,0.08)', color: PR.color.paper,
          border: `1px solid ${PR.color.paper}33`, borderRadius: 6, cursor: 'pointer',
        }}>
          ⛶ enter fullscreen
        </button>
      )}
      {isIOS && !isStandalone && (
        <div style={{
          position: 'absolute', bottom: 56, left: 16, right: 16, textAlign: 'center',
          font: `500 9px ${PR.font.sans}`, letterSpacing: 0.5, opacity: 0.55,
        }}>
          iPhone tip: Share → "Add to Home Screen" for fullscreen.
        </div>
      )}

      <button
        onClick={onStart}
        disabled={!canStart}
        className={canStart ? 'pr-bevel-btn' : undefined}
        style={{
          position: 'absolute', bottom: 18, left: '50%', transform: 'translateX(-50%)',
          background: canStart ? PR.color.leaf : '#33333a',
          color: canStart ? PR.color.ink : '#666',
          border: `3px solid ${canStart ? PR.color.ink : '#444'}`,
          borderRadius: PR.r.md,
          padding: '10px 44px',
          boxShadow: canStart ? PR.shadow(4, 5, PR.color.ink) : 'none',
          font: `400 22px ${PR.font.display}`, letterSpacing: 3,
          cursor: canStart ? 'pointer' : 'not-allowed',
        }}>
        START
      </button>
      <div style={{
        position: 'absolute', bottom: 4, left: 0, right: 0, textAlign: 'center',
        font: `500 9px ${PR.font.sans}`, letterSpacing: 1, opacity: 0.5,
      }}>
        {canStart
          ? 'anyone can press START'
          : `waiting for ${Math.max(0, 3 - playerCount)} more…`}
      </div>
    </div>
  );
}

interface ChipProps {
  role: Role;
  mine: boolean;
  disabled: boolean;
  onClick: () => void;
}

function PhoneRoleChip({ role, mine, disabled, onClick }: ChipProps) {
  const c = PR.role[role];
  let background: string;
  if (mine) background = c;
  else if (disabled) background = 'rgba(255,255,255,0.04)';
  else background = PR.color.panel;
  let statusLabel: string;
  if (mine) statusLabel = '★ YOU';
  else if (disabled) statusLabel = 'TAKEN';
  else statusLabel = 'OPEN';
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={!disabled ? 'pr-bevel-btn' : undefined}
      style={{
        flex: 1, minWidth: 0,
        background,
        border: `3px solid ${mine ? PR.color.ink : c}`,
        borderRadius: PR.r.md,
        padding: '10px 8px',
        boxShadow: mine ? PR.shadow(3, 4, PR.color.ink) : 'none',
        opacity: disabled ? 0.55 : 1,
        textAlign: 'center',
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      <div style={{
        width: 38, height: 38, margin: '0 auto 6px', borderRadius: '50%', background: c,
        border: `3px solid ${PR.color.ink}`, display: 'grid', placeItems: 'center',
        font: `400 20px ${PR.font.display}`, color: PR.color.ink,
      }}>{role.charAt(0).toUpperCase()}</div>
      <div style={{
        font: `700 11px ${PR.font.sans}`, letterSpacing: 1.5,
        color: mine ? PR.color.ink : c,
      }}>{PR.roleLabel[role]}</div>
      <div style={{
        font: `700 9px ${PR.font.sans}`, marginTop: 4, opacity: 0.7, letterSpacing: 1,
        color: mine ? PR.color.ink : PR.color.paper,
      }}>{statusLabel}</div>
    </button>
  );
}
