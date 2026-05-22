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

  // Per-chip "in flight" — true between click and the server's ack.
  // Single source of truth for "mine" remains `role` (the snapshot).
  const [inFlight, setInFlight] = useState<Role | 'release' | null>(null);

  const playerCount = snap?.playerCount ?? 1;
  const claims = snap?.roleClaims;
  const allClaimed = Boolean(claims?.defense && claims.repair && claims.weapons);
  const canStart = playerCount >= 3 && allClaimed && snap?.phase === 'lobby';
  const showCountdown = snap?.phase === 'countdown';

  const onStart = () => socket.emit('client:request_start');
  const onClaim = (next: Role) => {
    if (inFlight) return; // ignore rapid double-tap until server confirms
    const desired = role === next ? null : next;
    setInFlight(desired === null ? 'release' : desired);
    socket.emit('phone:claim_role', { role: desired }, () => {
      // Clear regardless of ok/!ok — snapshot is authoritative.
      // If !ok, snap.role stays the same and inFlight clears, so UI rolls
      // back to truth (no flicker because we never lied about "mine").
      setInFlight(null);
    });
  };

  // Safety: if a snap arrives and our snapshot already matches our intent,
  // clear inFlight even if the ack hasn't arrived yet.
  useEffect(() => {
    if (!inFlight) return;
    if (inFlight === 'release' && role === null) setInFlight(null);
    else if (inFlight === role) setInFlight(null);
  }, [inFlight, role]);

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

  const waitingMsg = canStart
    ? 'anyone can press START'
    : `waiting for ${Math.max(0, 3 - playerCount)} more…`;

  // Flex column layout. No absolute positioning between sections, so the
  // START button can never overlap the waiting hint or the fullscreen tip.
  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: `linear-gradient(180deg, #2d1b4d 0%, ${PR.color.bg} 100%)`,
      fontFamily: PR.font.sans, color: PR.color.paper,
      display: 'flex', flexDirection: 'column',
      padding: '10px 16px 12px',
      boxSizing: 'border-box', overflow: 'hidden',
    }}>
      {/* Top bar — room code + leave button */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flex: '0 0 auto',
      }}>
        <div style={{
          font: `700 11px ${PR.font.sans}`, letterSpacing: 2, color: PR.color.sun,
        }}>
          ROOM · {roomCode}
        </div>
        <button onClick={onLeave} style={{
          font: `700 11px ${PR.font.sans}`, letterSpacing: 1,
          color: PR.color.paper, opacity: 0.7,
          border: `1px solid ${PR.color.paper}33`, borderRadius: 6,
          padding: '4px 10px', background: 'transparent', cursor: 'pointer',
        }}>Leave</button>
      </div>

      {/* Heading */}
      <div style={{
        textAlign: 'center', marginTop: 12, flex: '0 0 auto',
        font: `400 24px ${PR.font.display}`, letterSpacing: 2,
        color: PR.color.paper, lineHeight: 1,
      }}>PICK YOUR STATION</div>

      {/* Role chips */}
      <div style={{
        marginTop: 14, display: 'flex', gap: 10, flex: '0 0 auto',
      }}>
        {ROLES.map((r) => {
          const claimedBy = claims?.[r] ?? null;
          const claimed = Boolean(claimedBy);
          const mine = role === r;
          // Disabled if someone else owns it; clicking your own chip = release
          const disabled = (claimed && !mine) || (inFlight !== null && !mine);
          const pending = inFlight === r || (mine && inFlight === 'release');
          return (
            <PhoneRoleChip
              key={r}
              role={r}
              mine={mine}
              pending={pending}
              disabled={disabled}
              onClick={() => onClaim(r)}
            />
          );
        })}
      </div>

      {/* Flexible spacer pushes the footer cluster down */}
      <div style={{ flex: 1 }} />

      {/* Fullscreen / iOS tip */}
      {canFullscreen && !isStandalone && (
        <button onClick={enterFullscreenLandscape} style={{
          alignSelf: 'center', marginBottom: 10,
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
          textAlign: 'center', marginBottom: 10,
          font: `500 9px ${PR.font.sans}`, letterSpacing: 0.5, opacity: 0.55,
        }}>
          iPhone tip: Share → "Add to Home Screen" for fullscreen.
        </div>
      )}

      {/* START button + hint stack — always in flow, never overlapping */}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
        flex: '0 0 auto',
      }}>
        <button
          onClick={onStart}
          disabled={!canStart}
          className={canStart ? 'pr-bevel-btn' : undefined}
          style={{
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
          font: `500 9px ${PR.font.sans}`, letterSpacing: 1, opacity: 0.5,
          textAlign: 'center',
        }}>
          {waitingMsg}
        </div>
      </div>
    </div>
  );
}

interface ChipProps {
  role: Role;
  mine: boolean;
  pending: boolean;
  disabled: boolean;
  onClick: () => void;
}

function PhoneRoleChip({ role, mine, pending, disabled, onClick }: ChipProps) {
  const c = PR.role[role];
  let background: string;
  if (mine) background = c;
  else if (disabled) background = 'rgba(255,255,255,0.04)';
  else background = PR.color.panel;
  let statusLabel: string;
  if (pending) statusLabel = '…';
  else if (mine) statusLabel = '★ YOU';
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
        opacity: disabled ? 0.55 : (pending ? 0.75 : 1),
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
