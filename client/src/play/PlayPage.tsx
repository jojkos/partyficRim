import { useEffect, useMemo, useRef, useState } from 'react';
import { createSocket } from '../socket.js';
import type { Role, PhoneSnapshot } from '@partyficrim/shared';
import { PhoneLobby } from './PhoneLobby.js';
import { PhoneGame } from './PhoneGame.js';
import { Robot } from '../display/Sprites.js';
import { PR, Wordmark, bevelButtonStyle } from '../ui/theme.js';

const SESSION_KEY = 'partyficrim.session';

interface StoredSession {
  roomCode: string;
  sessionId: string;
}

function loadSession(): StoredSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredSession>;
    if (typeof parsed.roomCode === 'string' && typeof parsed.sessionId === 'string') {
      return { roomCode: parsed.roomCode, sessionId: parsed.sessionId };
    }
  } catch { /* ignore corrupt storage */ }
  return null;
}

function saveSession(session: StoredSession): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
}

export function PlayPage() {
  const socket = useMemo(() => createSocket(), []);

  // URL room param takes precedence; fall back to stored room.
  const params = new URLSearchParams(window.location.search);
  const urlRoom = (params.get('room') ?? '').toUpperCase();
  const stored = loadSession();
  const initialRoom = urlRoom.length === 4 ? urlRoom : (stored?.roomCode ?? '');

  const [roomCode, setRoomCode] = useState(initialRoom);
  const [role, setRole] = useState<Role | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [snap, setSnap] = useState<PhoneSnapshot | null>(null);
  const joinSeqRef = useRef(0);

  useEffect(() => {
    if (!roomCode || roomCode.length !== 4) return;
    setSnap(null);
    setRole(null);
    const joinSeq = ++joinSeqRef.current;
    const session = loadSession();
    // Only send sessionId if it's tied to the same room we're joining.
    const sessionId = session?.roomCode === roomCode ? session.sessionId : undefined;

    socket.emit('phone:join', { roomCode, sessionId }, (res) => {
      if (joinSeq !== joinSeqRef.current) return;
      if (!res.ok) {
        clearSession();
        setError(res.error);
        return;
      }
      saveSession({ roomCode, sessionId: res.sessionId });
      setRole(res.role);
      setError(null);
    });
  }, [socket, roomCode]);

  useEffect(() => {
    let lastPhase = '';
    const h = (s: PhoneSnapshot) => {
      if (s.phase !== lastPhase) {
        console.log(`[phone] phase ${lastPhase || '(none)'} -> ${s.phase}`);
        lastPhase = s.phase;
      }
      setRole(s.role);
      setSnap(s);
    };
    socket.on('phone:state', h);
    return () => { socket.off('phone:state', h); };
  }, [socket]);

  const leaveRoom = () => {
    joinSeqRef.current++;
    socket.emit('phone:leave', () => {
      clearSession();
      window.history.replaceState({}, '', '/play');
      setRoomCode('');
      setRole(null);
      setSnap(null);
      setError(null);
    });
  };

  useEffect(() => {
    const onEnded = () => {
      console.log('[phone] room:ended received');
      clearSession();
      // Strip ?room= so a refresh doesn't try to rejoin the dead room.
      window.history.replaceState({}, '', '/play');
      setRoomCode('');
      setRole(null);
      setSnap(null);
      setError(null);
    };
    socket.on('room:ended', onEnded);
    return () => { socket.off('room:ended', onEnded); };
  }, [socket]);

  if (!roomCode || roomCode.length !== 4 || error) {
    return (
      <div style={{
        position: 'relative', width: '100%', height: '100%', overflow: 'hidden',
        background: `linear-gradient(180deg, #2d1b4d 0%, ${PR.color.bg} 100%)`,
        fontFamily: PR.font.sans, color: PR.color.paper,
      }}>
        <form
          style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 36, padding: 28,
          }}
          onSubmit={(e) => {
            e.preventDefault();
            const v = (new FormData(e.currentTarget).get('code') as string).toUpperCase();
            if (v.length === 4) {
              setError(null);
              setSnap(null);
              setRole(null);
              setRoomCode(v);
            }
          }}
        >
          <div style={{ flex: 1, maxWidth: 320 }}>
            <Wordmark size={30} />
            <div style={{
              font: `700 11px ${PR.font.sans}`, letterSpacing: 3,
              color: PR.color.sun, marginTop: 18, marginBottom: 10,
            }}>
              ENTER ROOM CODE
            </div>
            {error && (
              <div style={{
                marginBottom: 12, color: PR.color.cherry,
                font: `700 11px ${PR.font.sans}`, letterSpacing: 1,
              }}>
                Couldn't join {roomCode}: {error}.
              </div>
            )}
            <input
              name="code"
              maxLength={4}
              placeholder="CHIP"
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              style={{
                width: '100%', boxSizing: 'border-box',
                background: PR.color.cardCream, color: PR.color.ink,
                border: `3px solid ${PR.color.ink}`, borderRadius: PR.r.md,
                boxShadow: PR.shadow(3, 4, PR.color.ink),
                padding: '14px 18px',
                font: `400 40px ${PR.font.display}`, letterSpacing: 12, lineHeight: 1,
                textAlign: 'center', outline: 'none', textTransform: 'uppercase',
              }}
            />
            <button
              type="submit"
              className="pr-bevel-btn"
              style={{
                ...bevelButtonStyle({ bg: PR.color.flame, size: 'md' }),
                marginTop: 18, width: '100%', display: 'block',
                font: `400 24px ${PR.font.display}`, letterSpacing: 3,
                padding: '10px 0',
                border: `3px solid ${PR.color.ink}`,
              }}
            >
              JOIN GAME
            </button>
            <div style={{
              marginTop: 12,
              font: `500 11px ${PR.font.sans}`, opacity: 0.6, textAlign: 'center',
            }}>
              or scan the QR on the host screen
            </div>
          </div>
          <div style={{
            flex: '0 0 auto',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
          }}>
            <div style={{ animation: 'pr-bob-lg 2.4s ease-in-out infinite' }}>
              <Robot size={140} />
            </div>
            <div style={{
              font: `700 10px ${PR.font.sans}`, letterSpacing: 2, color: PR.color.sun,
            }}>YOUR PILOT AWAITS</div>
          </div>
        </form>
      </div>
    );
  }

  const effectiveRole = snap?.role ?? role;

  return snap?.phase === 'lobby' || snap?.phase === 'countdown' || snap === null
    ? <PhoneLobby socket={socket} role={effectiveRole} roomCode={roomCode} snap={snap} onLeave={leaveRoom} />
    : effectiveRole
      ? <PhoneGame socket={socket} role={effectiveRole} roomCode={roomCode} onLeave={leaveRoom} />
      : <PhoneLobby socket={socket} role={effectiveRole} roomCode={roomCode} snap={snap} onLeave={leaveRoom} />;
}
