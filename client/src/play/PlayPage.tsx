import { useEffect, useMemo, useRef, useState } from 'react';
import { createSocket } from '../socket.js';
import type { PhoneSnapshot } from '@partyficrim/shared';
import { PhoneLobby } from './PhoneLobby.js';
import { PhoneGame } from './PhoneGame.js';
import { Robot } from '../display/Sprites.js';
import { PR, Wordmark, bevelButtonStyle } from '../ui/theme.js';
import { usePhoneAudio } from '../audio/usePhoneAudio.js';
import { MuteButton } from '../audio/MuteButton.js';
import { audio } from '../audio/engine.js';

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
  const [error, setError] = useState<string | null>(null);
  const [snap, setSnap] = useState<PhoneSnapshot | null>(null);

  // StrictMode-safe join guard. Tracks the room we have already issued a
  // phone:join for (or are in-flight on) so React's double-effect doesn't
  // create a duplicate player record. Cleared on leave/room:ended.
  const joinedForRef = useRef<string | null>(null);

  useEffect(() => {
    if (!roomCode || roomCode.length !== 4) return;
    if (joinedForRef.current === roomCode) return; // already joining/joined
    joinedForRef.current = roomCode;
    setSnap(null);
    const session = loadSession();
    const sessionId = session?.roomCode === roomCode ? session.sessionId : undefined;

    socket.emit('phone:join', { roomCode, sessionId }, (res) => {
      if (joinedForRef.current !== roomCode) return; // user left mid-flight
      if (!res.ok) {
        // Drop the guard so the user can retry by re-submitting the form.
        joinedForRef.current = null;
        clearSession();
        setError(res.error);
        return;
      }
      saveSession({ roomCode, sessionId: res.sessionId });
      setError(null);
    });
  }, [socket, roomCode]);

  // If the socket itself drops & reconnects (network blip), re-issue join
  // with our sessionId so the server can resume us under the new socket.id.
  useEffect(() => {
    const onReconnect = () => {
      const session = loadSession();
      if (!session || session.roomCode !== roomCode || !roomCode) return;
      socket.emit('phone:join', { roomCode, sessionId: session.sessionId }, (res) => {
        if (!res.ok) {
          joinedForRef.current = null;
          clearSession();
          setError(res.error);
        }
      });
    };
    socket.on('connect', onReconnect);
    return () => { socket.off('connect', onReconnect); };
  }, [socket, roomCode]);

  useEffect(() => {
    let lastPhase = '';
    const h = (s: PhoneSnapshot) => {
      if (s.phase !== lastPhase) {
        console.log(`[phone] phase ${lastPhase || '(none)'} -> ${s.phase}`);
        lastPhase = s.phase;
      }
      setSnap(s);
    };
    socket.on('phone:state', h);
    return () => { socket.off('phone:state', h); };
  }, [socket]);

  const leaveRoom = () => {
    joinedForRef.current = null;
    socket.emit('phone:leave', () => {
      clearSession();
      window.history.replaceState({}, '', '/play');
      setRoomCode('');
      setSnap(null);
      setError(null);
    });
  };

  useEffect(() => {
    const onEnded = () => {
      console.log('[phone] room:ended received');
      joinedForRef.current = null;
      clearSession();
      // Strip ?room= so a refresh doesn't try to rejoin the dead room.
      window.history.replaceState({}, '', '/play');
      setRoomCode('');
      setSnap(null);
      setError(null);
    };
    socket.on('room:ended', onEnded);
    return () => { socket.off('room:ended', onEnded); };
  }, [socket]);

  usePhoneAudio(snap);

  // Audible feedback for connection errors (room_full etc.).
  useEffect(() => {
    if (error) audio.play('ui.error');
  }, [error]);

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
              // Reset the join guard so the effect re-fires even when the
              // resubmitted code equals the previous one (the previous attempt
              // failed and we want to retry).
              joinedForRef.current = null;
              setError(null);
              setSnap(null);
              if (v === roomCode) {
                // Same code — state-set is a no-op; force the effect by
                // clearing then re-setting on next tick.
                setRoomCode('');
                queueMicrotask(() => setRoomCode(v));
              } else {
                setRoomCode(v);
              }
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
              onClick={() => audio.play('ui.tap')}
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
        <MuteButton style={{ position: 'absolute', top: 10, right: 12 }} />
      </div>
    );
  }

  // Single source of truth: the server snapshot. No local role mirror.
  const snapshotRole = snap?.role ?? null;

  return snap?.phase === 'lobby' || snap?.phase === 'countdown' || snap === null
    ? <PhoneLobby socket={socket} role={snapshotRole} roomCode={roomCode} snap={snap} onLeave={leaveRoom} />
    : snapshotRole
      ? <PhoneGame socket={socket} role={snapshotRole} roomCode={roomCode} onLeave={leaveRoom} />
      : <PhoneLobby socket={socket} role={snapshotRole} roomCode={roomCode} snap={snap} onLeave={leaveRoom} />;
}
