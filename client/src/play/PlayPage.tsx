import { useEffect, useMemo, useState } from 'react';
import { createSocket } from '../socket.js';
import type { Role } from '@polararena/shared';
import type { PhoneSnapshot } from '@polararena/shared';
import { PhoneLobby } from './PhoneLobby.js';
import { PhoneGame } from './PhoneGame.js';

const SESSION_KEY = 'polararena.sessionId';

export function PlayPage() {
  const socket = useMemo(() => createSocket(), []);
  const params = new URLSearchParams(window.location.search);
  const initialRoom = (params.get('room') ?? '').toUpperCase();
  const [roomCode, setRoomCode] = useState(initialRoom);
  const [role, setRole] = useState<Role | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [snap, setSnap] = useState<PhoneSnapshot | null>(null);

  useEffect(() => {
    if (!roomCode || roomCode.length !== 4) return;
    const sessionId = localStorage.getItem(SESSION_KEY) ?? undefined;
    socket.emit('phone:join', { roomCode, sessionId }, (res) => {
      if (!res.ok) { setError(res.error); return; }
      localStorage.setItem(SESSION_KEY, res.sessionId);
      setRole(res.role);
    });
  }, [socket, roomCode]);

  useEffect(() => {
    const h = (s: PhoneSnapshot) => setSnap(s);
    socket.on('phone:state', h);
    return () => { socket.off('phone:state', h); };
  }, [socket]);

  if (!roomCode || roomCode.length !== 4) {
    return (
      <form
        style={{ padding: 24 }}
        onSubmit={(e) => {
          e.preventDefault();
          const v = (new FormData(e.currentTarget).get('code') as string).toUpperCase();
          if (v.length === 4) setRoomCode(v);
        }}
      >
        <h1>Join a room</h1>
        <input name="code" maxLength={4} placeholder="ABCD" autoCapitalize="characters"
               style={{ fontSize: 48, padding: 12, width: 200, letterSpacing: 8 }} />
        <button type="submit" style={{ fontSize: 24, padding: 12, marginLeft: 12 }}>Join</button>
      </form>
    );
  }

  if (error) return <div style={{ padding: 24 }}>Error: {error}</div>;
  if (!role) return <div style={{ padding: 24 }}>Joining {roomCode}…</div>;
  return snap?.phase === 'lobby' || snap?.phase === 'countdown'
    ? <PhoneLobby role={role} roomCode={roomCode} />
    : <PhoneGame socket={socket} role={role} roomCode={roomCode} />;
}
