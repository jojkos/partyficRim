import { useEffect, useState, useCallback } from 'react';
import type { PhoneSnapshot, Role } from '@partyficrim/shared';
import { ROLE_LABEL } from '@partyficrim/shared';
import type { AppSocket } from '../socket.js';
import { Joystick } from './Joystick.js';
import { useLandscape } from './useLandscape.js';

const ROLE_COLOR: Record<Role, string> = { X: '#ff5577', Y: '#55c2ff' };
const ROLE_NUMBER: Record<Role, number> = { X: 1, Y: 2 };

const QUADRANT_ARROW = ['↖', '↗', '↙', '↘'] as const;

interface Props { socket: AppSocket; role: Role; roomCode: string; }

export function PhoneGame({ socket, role, roomCode: _roomCode }: Props) {
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

  const onAction = useCallback(() => socket.emit('phone:button'), [socket]);
  const onSelect = useCallback((index: number) => {
    const next = !(snap?.selected[index] ?? false);
    socket.emit('phone:select', { index, on: next });
  }, [socket, snap]);
  const onQuadrant = useCallback((index: number) => {
    socket.emit('phone:quadrant', { index });
  }, [socket]);

  const onFoot = snap?.mode === 'on_foot';
  const lockAxis = onFoot ? null : (role === 'X' ? 'x' : 'y');
  const color = ROLE_COLOR[role];
  const actionLabel = onFoot ? 'ENTER' : 'EXIT';
  const actionDisabled = onFoot && !snap?.nearRobot;
  // Selection / quadrant grids are robot controls — disabled while on foot.
  const controlsDisabled = onFoot;

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
      display: 'grid',
      gridTemplateRows: '36px 1fr',
      background: '#0a0a12',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 16, paddingInline: 16, fontSize: 14, fontWeight: 800, letterSpacing: 2,
        color, borderBottom: '1px solid rgba(255,255,255,0.08)',
      }}>
        <span style={{ background: color, width: 12, height: 12, display: 'inline-block', borderRadius: 2 }} />
        <span>PLAYER {ROLE_NUMBER[role]}</span>
        <span style={{ opacity: 0.6 }}>·</span>
        <span>{ROLE_LABEL[role]}</span>
      </div>

      {/* Three columns */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        height: '100%',
      }}>
        {/* LEFT: Joystick + Action */}
        <div style={{
          position: 'relative',
          display: 'grid',
          gridTemplateRows: '1fr auto',
          padding: 12,
          borderRight: '1px dashed rgba(255,255,255,0.15)',
          minHeight: 0,
        }}>
          <div style={{ position: 'relative', minHeight: 0 }}>
            <Joystick lockAxis={lockAxis} onMove={onMove} color={color} />
          </div>
          <button
            onClick={onAction}
            disabled={actionDisabled}
            style={{
              marginTop: 8,
              padding: '14px 0',
              fontSize: 18, fontWeight: 800, letterSpacing: 3,
              border: '1px solid rgba(255,255,255,0.25)',
              background: actionDisabled ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.06)',
              color: actionDisabled ? '#666' : color,
              borderRadius: 8,
              cursor: actionDisabled ? 'not-allowed' : 'pointer',
            }}
          >
            ⊙ {actionLabel}
          </button>
        </div>

        {/* MIDDLE: 2x2 selection */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gridTemplateRows: '1fr 1fr',
          gap: 10,
          padding: 12,
          borderRight: '1px dashed rgba(255,255,255,0.15)',
        }}>
          {[0, 1, 2, 3].map((i) => {
            const on = snap?.selected[i] ?? false;
            const borderCol = controlsDisabled
              ? 'rgba(255,255,255,0.08)'
              : on ? color : 'rgba(255,255,255,0.25)';
            const bg = controlsDisabled
              ? 'transparent'
              : on ? color : 'transparent';
            const fg = controlsDisabled
              ? '#444'
              : on ? '#0a0a12' : '#fff';
            return (
              <button
                key={i}
                onClick={() => onSelect(i)}
                disabled={controlsDisabled}
                style={{
                  border: `2px solid ${borderCol}`,
                  background: bg,
                  color: fg,
                  fontSize: 16, fontWeight: 800, letterSpacing: 2,
                  borderRadius: 8,
                  cursor: controlsDisabled ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexDirection: 'column',
                  gap: 4,
                  opacity: controlsDisabled ? 0.4 : 1,
                }}
              >
                <span style={{
                  width: 24, height: 24,
                  border: `2px solid ${controlsDisabled ? '#444' : on ? '#0a0a12' : 'rgba(255,255,255,0.6)'}`,
                  borderRadius: 4,
                }} />
                <span>OPT {i + 1}</span>
              </button>
            );
          })}
        </div>

        {/* RIGHT: 2x2 quadrant */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gridTemplateRows: '1fr 1fr',
          gap: 10,
          padding: 12,
        }}>
          {[0, 1, 2, 3].map((i) => {
            const on = snap?.quadrant === i;
            const borderCol = controlsDisabled
              ? 'rgba(255,255,255,0.08)'
              : on ? color : 'rgba(255,255,255,0.25)';
            const bg = controlsDisabled
              ? 'transparent'
              : on ? color : 'transparent';
            const fg = controlsDisabled
              ? '#444'
              : on ? '#0a0a12' : '#fff';
            return (
              <button
                key={i}
                onClick={() => onQuadrant(i)}
                disabled={controlsDisabled}
                style={{
                  border: `2px solid ${borderCol}`,
                  background: bg,
                  color: fg,
                  fontSize: 32, fontWeight: 800,
                  borderRadius: 8,
                  cursor: controlsDisabled ? 'not-allowed' : 'pointer',
                  opacity: controlsDisabled ? 0.4 : 1,
                }}
              >
                {QUADRANT_ARROW[i]}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
