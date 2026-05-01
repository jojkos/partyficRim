import { useEffect, useState, useCallback } from 'react';
import type { PhoneSnapshot, Role } from '@partyficrim/shared';
import type { AppSocket } from '../socket.js';
import { Joystick } from './Joystick.js';
import { useLandscape } from './useLandscape.js';

const ROLE_COLOR: Record<Role, string> = { X: '#ff5577', Y: '#55c2ff' };

interface Props { socket: AppSocket; role: Role; roomCode: string; }

export function PhoneGame({ socket, role, roomCode }: Props) {
  const [snap, setSnap] = useState<PhoneSnapshot | null>(null);
  const { isLandscape, enterFullscreenLandscape, canFullscreen, isStandalone } = useLandscape();

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

  if (!isLandscape) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        height: '100%', padding: 24, textAlign: 'center', gap: 16,
      }}>
        <div style={{ fontSize: 64 }}>🔄</div>
        <div style={{ fontSize: 28, fontWeight: 700, color }}>Rotate your phone</div>
        <div style={{ fontSize: 18, opacity: 0.6 }}>partyficRim is played in landscape</div>
        {canFullscreen && !isStandalone && (
          <button onClick={enterFullscreenLandscape} style={{
            marginTop: 12, padding: '12px 24px', fontSize: 18, borderRadius: 10,
            border: 'none', background: color, color: '#fff', fontWeight: 700,
          }}>
            Enter fullscreen
          </button>
        )}
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, width: '100%', height: '100%',
      touchAction: 'none', userSelect: 'none', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', top: 8, left: 0, right: 0, textAlign: 'center',
        color, fontSize: 18, fontWeight: 800, letterSpacing: 1, zIndex: 2,
      }}>
        {role}-axis · Score {snap?.score ?? 0}
      </div>
      {/* left half is the joystick zone (component positions itself absolutely) */}
      <Joystick lockAxis={lockAxis} onMove={onMove} color={color} />
      {/* right half: tap-anywhere button */}
      <button
        onClick={onButton}
        disabled={enterDisabled}
        style={{
          position: 'absolute', top: 0, bottom: 0, right: 0, width: '50%',
          border: 'none',
          background: enterDisabled ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.06)',
          color: enterDisabled ? '#666' : color,
          fontSize: 48, fontWeight: 900, letterSpacing: 4,
          touchAction: 'none', cursor: 'pointer',
        }}
      >
        {snap?.mode === 'on_foot' ? 'ENTER' : 'EXIT'}
      </button>
    </div>
  );
}
