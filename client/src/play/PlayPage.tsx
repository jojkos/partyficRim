import { useEffect, useMemo, useState } from 'react';
import { createSocket } from '../socket.js';
import type { Role, PhoneSnapshot } from '@polararena/shared';
import { PhoneLobby } from './PhoneLobby.js';
import { PhoneGame } from './PhoneGame.js';

const SESSION_KEY = 'polararena.session';

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

  useEffect(() => {
    if (!roomCode || roomCode.length !== 4) return;
    const session = loadSession();
    // Only send sessionId if it's tied to the same room we're joining.
    const sessionId = session?.roomCode === roomCode ? session.sessionId : undefined;

    socket.emit('phone:join', { roomCode, sessionId }, (res) => {
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
    const h = (s: PhoneSnapshot) => setSnap(s);
    socket.on('phone:state', h);
    return () => { socket.off('phone:state', h); };
  }, [socket]);

  if (!roomCode || roomCode.length !== 4 || error) {
    return (
      <form
        style={{ padding: 24 }}
        onSubmit={(e) => {
          e.preventDefault();
          const v = (new FormData(e.currentTarget).get('code') as string).toUpperCase();
          if (v.length === 4) {
            setError(null);
            setRoomCode(v);
          }
        }}
      >
        <h1>Join a room</h1>
        {error && (
          <div style={{ marginBottom: 16, color: '#ff8888' }}>
            Couldn't join {roomCode}: {error}. Try a different code.
          </div>
        )}
        <input name="code" maxLength={4} placeholder="ABCD" autoCapitalize="characters"
               style={{ fontSize: 48, padding: 12, width: 200, letterSpacing: 8 }} />
        <button type="submit" style={{ fontSize: 24, padding: 12, marginLeft: 12 }}>Join</button>
      </form>
    );
  }

  if (!role) return <div style={{ padding: 24 }}>Joining {roomCode}…</div>;
  return snap?.phase === 'lobby' || snap?.phase === 'countdown' || snap === null
    ? <PhoneLobby socket={socket} role={role} roomCode={roomCode} snap={snap} />
    : <PhoneGame socket={socket} role={role} roomCode={roomCode} />;
}
