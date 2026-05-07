import { useEffect, useState } from 'react';
import type { DisplaySnapshot, Role } from '@partyficrim/shared';
import type { AppSocket } from '../socket.js';
import { PR, Starfield, Wordmark } from '../ui/theme.js';

interface Props {
  socket: AppSocket;
  roomCode: string | null;
  snap: DisplaySnapshot | null;
  onResetRoom: () => void;
}

const ROLES: Role[] = ['defense', 'weapons', 'repair'];

export function DisplayLobby({ socket, roomCode, snap, onResetRoom }: Props) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!roomCode) {
      setQrDataUrl(null);
      return;
    }
    const joinUrl = `${window.location.origin}/play?room=${roomCode}`;
    let cancelled = false;
    import('qrcode').then(({ default: QRCode }) => {
      QRCode.toDataURL(joinUrl, { width: 320, margin: 1 }).then((url) => {
        if (!cancelled) setQrDataUrl(url);
      });
    });
    return () => { cancelled = true; };
  }, [roomCode]);

  const playerCount = snap?.players.length ?? 0;
  const claims = snap?.roleClaims;
  const roleCount = (['defense', 'weapons', 'repair'] as Role[])
    .filter((r) => claims?.[r]).length;
  const allClaimed = Boolean(claims?.defense && claims.repair && claims.weapons);
  const canStart = playerCount >= 3 && allClaimed && snap?.phase === 'lobby';
  const code = roomCode ?? '----';

  const onStart = () => socket.emit('client:request_start');

  return (
    <div style={{
      position: 'relative', width: '100%', height: '100%', overflow: 'hidden',
      background: `radial-gradient(ellipse at center, #2d1b4d 0%, ${PR.color.bg} 70%, ${PR.color.bgDeep} 100%)`,
      fontFamily: PR.font.sans, color: PR.color.paper,
    }}>
      <Starfield count={28} />

      {/* corner: tiny logo */}
      <div style={{ position: 'absolute', top: 28, left: 40 }}>
        <Wordmark size={28} />
      </div>

      {/* corner: × new game */}
      <button onClick={onResetRoom} style={{
        position: 'absolute', top: 28, right: 40,
        font: `700 12px ${PR.font.sans}`, letterSpacing: 2,
        color: PR.color.paper, opacity: 0.6,
        border: `1px solid ${PR.color.paper}33`, borderRadius: 6,
        padding: '6px 12px', background: 'transparent', cursor: 'pointer',
      }}>
        × new game
      </button>

      {/* LEFT — room code huge + QR */}
      <div style={{
        position: 'absolute', top: 100, left: 60,
        display: 'flex', flexDirection: 'column', gap: 26,
      }}>
        <div>
          <div style={{
            font: `700 13px ${PR.font.sans}`, letterSpacing: 4,
            color: PR.color.sun, marginBottom: 10,
          }}>
            ROOM CODE
          </div>
          <div style={{
            display: 'inline-block', background: PR.color.cardCream, color: PR.color.ink,
            border: `6px solid ${PR.color.ink}`, borderRadius: PR.r.lg,
            padding: '20px 40px', boxShadow: PR.shadow(8, 10, PR.color.ink),
          }}>
            <div style={{
              font: `400 132px ${PR.font.display}`, letterSpacing: 18, lineHeight: 0.95,
            }}>{code}</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <div style={{
            width: 200, height: 200, background: '#fff',
            border: `5px solid ${PR.color.ink}`, borderRadius: PR.r.md,
            boxShadow: PR.shadow(5, 7, PR.color.ink), padding: 10, boxSizing: 'border-box',
            display: 'grid', placeItems: 'center',
          }}>
            {qrDataUrl
              ? <img src={qrDataUrl} alt="join QR" style={{ width: '100%', height: '100%' }} />
              : <div style={{ font: `500 11px ${PR.font.mono}`, color: PR.color.ink, opacity: 0.4 }}>generating…</div>}
          </div>
          <div>
            <div style={{
              font: `700 13px ${PR.font.sans}`, letterSpacing: 3,
              color: PR.color.sun, marginBottom: 6,
            }}>
              SCAN ON YOUR PHONE
            </div>
            <div style={{
              font: `500 14px ${PR.font.mono}`, color: PR.color.paper,
              opacity: 0.8, lineHeight: 1.6,
            }}>
              or visit<br />
              <span style={{ color: PR.color.sun, fontWeight: 700, fontSize: 16 }}>
                {window.location.host}/play
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT — stations + START */}
      <div style={{ position: 'absolute', top: 100, right: 60, width: 480 }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
          marginBottom: 14,
        }}>
          <div style={{
            font: `700 13px ${PR.font.sans}`, letterSpacing: 4, color: PR.color.sun,
          }}>STATIONS</div>
          <div style={{
            font: `400 32px ${PR.font.display}`, color: PR.color.paper,
            letterSpacing: 1, lineHeight: 1,
          }}>
            {roleCount}<span style={{ opacity: 0.4 }}>/3</span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {ROLES.map((r) => (
            <RoleSlot key={r} role={r} name={claims?.[r] ?? null} />
          ))}
        </div>

        <button
          onClick={onStart}
          disabled={!canStart}
          className={canStart ? 'pr-bevel-btn' : undefined}
          style={{
            marginTop: 24, width: '100%', display: 'block',
            background: canStart ? PR.color.leaf : '#33333a',
            color: canStart ? PR.color.ink : '#666',
            border: `5px solid ${canStart ? PR.color.ink : '#444'}`,
            borderRadius: PR.r.lg,
            padding: '16px 0', textAlign: 'center',
            boxShadow: canStart ? PR.shadow(6, 8, PR.color.ink) : 'none',
            font: `400 44px ${PR.font.display}`, letterSpacing: 6,
            cursor: canStart ? 'pointer' : 'not-allowed',
          }}>
          START
        </button>
        <div style={{
          textAlign: 'center', marginTop: 10,
          font: `500 12px ${PR.font.sans}`, letterSpacing: 1, opacity: 0.55,
        }}>
          {canStart
            ? 'anyone can press start (display or phone)'
            : `waiting for ${Math.max(0, 3 - roleCount)} more pilot${(3 - roleCount) === 1 ? '' : 's'}…`}
        </div>
      </div>
    </div>
  );
}

function RoleSlot({ role, name }: { role: Role; name: string | null }) {
  const c = PR.role[role];
  const filled = !!name;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14,
      background: filled ? c : 'rgba(255,255,255,0.05)',
      border: `4px solid ${filled ? PR.color.ink : c}`,
      borderRadius: PR.r.md, padding: '12px 16px',
      boxShadow: filled ? PR.shadow(3, 4, PR.color.ink) : 'none',
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: 8,
        background: filled ? PR.color.ink : c,
        border: `3px solid ${PR.color.ink}`, display: 'grid', placeItems: 'center',
        font: `400 22px ${PR.font.display}`, color: filled ? c : PR.color.ink,
      }}>
        {filled ? (name as string).slice(0, 1).toUpperCase() : '?'}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          font: `700 16px ${PR.font.sans}`, letterSpacing: 2,
          color: filled ? PR.color.ink : c,
        }}>{PR.roleLabel[role]}</div>
        <div style={{
          font: `500 11px ${PR.font.sans}`, letterSpacing: 1,
          color: filled ? PR.color.ink : PR.color.paper,
          opacity: 0.7, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {filled ? `${name} · connected` : 'WAITING…'}
        </div>
      </div>
      <div style={{
        font: `700 11px ${PR.font.sans}`, letterSpacing: 2,
        padding: '4px 10px', borderRadius: PR.r.pill,
        background: filled ? PR.color.ink : 'transparent',
        color: filled ? c : PR.color.paper,
        border: filled ? 'none' : `2px dashed ${c}`,
        opacity: filled ? 1 : 0.7,
      }}>{filled ? '✓ READY' : 'OPEN'}</div>
    </div>
  );
}
