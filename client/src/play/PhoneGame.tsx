import { useEffect, useState, useCallback } from 'react';
import type { PhoneSnapshot, Role } from '@polararena/shared';
import type { AppSocket } from '../socket.js';
import { Joystick } from './Joystick.js';

const ROLE_COLOR: Record<Role, string> = { X: '#ff5577', Y: '#55c2ff' };

interface Props { socket: AppSocket; role: Role; roomCode: string; }

export function PhoneGame({ socket, role, roomCode }: Props) {
  const [snap, setSnap] = useState<PhoneSnapshot | null>(null);

  useEffect(() => {
    const h = (s: PhoneSnapshot) => setSnap(s);
    socket.on('phone:state', h);
    return () => { socket.off('phone:state', h); };
  }, [socket]);

  const onMove = useCallback((dx: number, dy: number) => {
    socket.emit('phone:input', { dx, dy });
  }, [socket]);

  const onButton = useCallback(() => socket.emit('phone:button'), [socket]);

  const lockAxis = snap?.mode === 'on_foot' ? null : (role === 'X' ? 'x' : 'y');
  const color = ROLE_COLOR[role];
  const enterDisabled = snap?.mode === 'on_foot' && !snap.nearRobot;

  return (
    <div style={{
      position: 'fixed', inset: 0, width: '100vw', height: '100vh',
      touchAction: 'none', userSelect: 'none', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', top: 8, left: 0, right: 0, textAlign: 'center',
        color, fontSize: 18, fontWeight: 700, letterSpacing: 1, zIndex: 2,
      }}>
        {role}-axis · Score {snap?.score ?? 0} · Room {roomCode}
      </div>
      <Joystick lockAxis={lockAxis} onMove={onMove} color={color} />
      <button
        onClick={onButton}
        disabled={enterDisabled}
        style={{
          width: 160, height: 160, borderRadius: '50%', border: 'none',
          background: enterDisabled ? '#444' : color, color: '#fff', fontSize: 24, fontWeight: 700,
          opacity: enterDisabled ? 0.5 : 1,
        }}
      >
        {snap?.mode === 'on_foot' ? 'ENTER' : 'EXIT'}
      </button>
    </div>
  );
}
