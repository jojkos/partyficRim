import { useEffect, useState, useCallback, type CSSProperties } from 'react';
import type { AttackKind, CoreType, PhoneSnapshot, Quadrant, Role } from '@partyficrim/shared';
import { CORE_COLORS, ROLE_LABEL } from '@partyficrim/shared';
import type { AppSocket } from '../socket.js';
import { Joystick } from './Joystick.js';
import { useLandscape } from './useLandscape.js';

const ROLE_COLOR: Record<Role, string> = { defense: '#ff5577', repair: '#55c2ff', weapons: '#ffe066' };
const ROLE_NUMBER: Record<Role, number> = { defense: 1, repair: 2, weapons: 3 };
const QUADRANT_ARROW = ['↖', '↗', '↙', '↘'] as const;
const QUADRANT_LABEL = ['NW', 'NE', 'SW', 'SE'] as const;
const ATTACKS: AttackKind[] = ['melee', 'rotary', 'laser', 'bomb'];

interface Props { socket: AppSocket; role: Role; roomCode: string; onLeave: () => void; }

export function PhoneGame({ socket, role, roomCode: _roomCode, onLeave }: Props) {
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
    const selected = role === 'weapons'
      ? Boolean(snap?.offeredCores[index] && snap.weaponSelectedCores.includes(snap.offeredCores[index]))
      : snap?.selectedCores.includes(index) ?? false;
    socket.emit('phone:select', { index, on: !selected });
  }, [role, socket, snap]);
  const onQuadrant = useCallback((index: number) => {
    if (role === 'repair') socket.emit('phone:repair', { quadrant: index });
    else socket.emit('phone:quadrant', { index });
  }, [role, socket]);
  const onSelectAttack = useCallback((kind: AttackKind) => {
    socket.emit('phone:select_attack', { kind: snap?.selectedAttackKind === kind ? null : kind });
  }, [socket, snap?.selectedAttackKind]);
  const onRestart = useCallback(() => {
    socket.emit('client:restart_room');
  }, [socket]);

  const onFoot = snap?.mode === 'on_foot';
  const lockAxis = onFoot || role === 'weapons' ? null : (role === 'defense' ? 'x' : 'y');
  const color = ROLE_COLOR[role];
  const actionLabel = onFoot ? 'ENTER' : 'EXIT';
  const actionDisabled = onFoot && !snap?.nearRobot;
  const controlsDisabled = onFoot || snap?.phase === 'gameover';

  if (!isLandscape) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        height: '100%', padding: 24, textAlign: 'center', gap: 16,
      }}>
        <div style={{ fontSize: 64 }}>↻</div>
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
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 16, paddingInline: 16, fontSize: 14, fontWeight: 800, letterSpacing: 2,
        color, borderBottom: '1px solid rgba(255,255,255,0.08)',
      }}>
        <span style={{ background: color, width: 12, height: 12, display: 'inline-block', borderRadius: 2 }} />
        <span>PLAYER {ROLE_NUMBER[role]}</span>
        <span style={{ opacity: 0.6 }}>·</span>
        <span>{ROLE_LABEL[role]}</span>
        {snap?.phase === 'gameover' && <span style={{ color: '#ff7788' }}>· GAME OVER</span>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', height: '100%' }}>
        <div style={{
          position: 'relative',
          display: 'grid',
          gridTemplateRows: '1fr auto',
          padding: 12,
          borderRight: '1px dashed rgba(255,255,255,0.15)',
          minHeight: 0,
        }}>
          {role === 'weapons' && !onFoot ? (
            <CoreGrid
              cores={snap?.offeredCores ?? []}
              selected={(type) => snap?.weaponSelectedCores.includes(type) ?? false}
              disabled={controlsDisabled}
              onSelect={onSelect}
            />
          ) : (
            <div style={{ position: 'relative', minHeight: 0 }}>
              <Joystick lockAxis={lockAxis} onMove={onMove} color={color} />
            </div>
          )}
          <button
            onClick={onAction}
            disabled={actionDisabled}
            style={actionButton(color, actionDisabled)}
          >
            ⊙ {actionLabel}
          </button>
        </div>

        <div style={{
          display: 'grid',
          gap: 10,
          padding: 12,
          borderRight: '1px dashed rgba(255,255,255,0.15)',
        }}>
          {role === 'weapons'
            ? <AttackGrid selected={snap?.selectedAttackKind ?? null} disabled={controlsDisabled} onSelect={onSelectAttack} />
            : <CoreGrid
                cores={snap?.inventory ?? []}
                selected={(_, index) => snap?.selectedCores.includes(index) ?? false}
                disabled={controlsDisabled}
                onSelect={onSelect}
              />}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: 10, padding: 12 }}>
          {[0, 1, 2, 3].map((i) => {
            const hp = snap?.quadrantHp[i as Quadrant] ?? 100;
            const on = snap?.quadrant === i;
            const repairView = role === 'repair';
            return (
              <button
                key={i}
                onClick={() => onQuadrant(i)}
                disabled={controlsDisabled}
                style={{
                  border: `2px solid ${on ? color : hp < 25 ? '#ff5577' : 'rgba(255,255,255,0.25)'}`,
                  background: repairView
                    ? `linear-gradient(to top, ${hp < 25 ? '#ff5577' : color} ${hp}%, transparent ${hp}%)`
                    : on ? color : 'transparent',
                  color: on && !repairView ? '#0a0a12' : '#fff',
                  fontSize: repairView ? 18 : 32,
                  fontWeight: 800,
                  borderRadius: 8,
                  cursor: controlsDisabled ? 'not-allowed' : 'pointer',
                  opacity: controlsDisabled ? 0.45 : 1,
                }}
              >
                {repairView ? `${QUADRANT_LABEL[i]}\n${hp}%` : QUADRANT_ARROW[i]}
              </button>
            );
          })}
        </div>
      </div>
      <button
        onClick={snap?.phase === 'gameover' ? onRestart : onLeave}
        style={{
          position: 'fixed',
          top: 42,
          right: 10,
          zIndex: 2,
          padding: '7px 10px',
          borderRadius: 8,
          border: '1px solid rgba(255,255,255,0.22)',
          background: 'rgba(0,0,0,0.45)',
          color: '#ddd',
          fontWeight: 800,
          letterSpacing: 1,
        }}
      >
        {snap?.phase === 'gameover' ? 'Restart' : 'Leave'}
      </button>
    </div>
  );
}

function CoreGrid({
  cores,
  selected,
  disabled,
  onSelect,
}: {
  cores: CoreType[];
  selected: (type: CoreType, index: number) => boolean;
  disabled: boolean | undefined;
  onSelect: (index: number) => void;
}) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: 10, minHeight: 0 }}>
      {[0, 1, 2, 3].map((i) => {
        const type = cores[i];
        const on = type ? selected(type, i) : false;
        return (
          <button
            key={i}
            onClick={() => onSelect(i)}
            disabled={disabled || !type}
            style={{
              border: `2px solid ${type ? CORE_COLORS[type] : 'rgba(255,255,255,0.12)'}`,
              background: on && type ? CORE_COLORS[type] : 'transparent',
              color: on ? '#0a0a12' : '#fff',
              fontSize: 13,
              fontWeight: 800,
              letterSpacing: 1,
              borderRadius: 8,
              cursor: disabled || !type ? 'not-allowed' : 'pointer',
              opacity: disabled || !type ? 0.4 : 1,
            }}
          >
            {type ? type.toUpperCase() : 'EMPTY'}
          </button>
        );
      })}
    </div>
  );
}

function AttackGrid({ selected, disabled, onSelect }: { selected: AttackKind | null; disabled: boolean | undefined; onSelect: (kind: AttackKind) => void }) {
  return (
    <div style={{ display: 'grid', gridTemplateRows: 'repeat(4, 1fr)', gap: 10 }}>
      {ATTACKS.map((kind) => (
        <button
          key={kind}
          onClick={() => onSelect(kind)}
          disabled={disabled}
          style={{
            border: `2px solid ${selected === kind ? '#ffe066' : 'rgba(255,255,255,0.25)'}`,
            background: disabled ? 'rgba(255,255,255,0.03)' : selected === kind ? '#ffe066' : 'rgba(255,224,102,0.14)',
            color: disabled ? '#666' : selected === kind ? '#0a0a12' : '#ffe066',
            fontSize: 18,
            fontWeight: 900,
            letterSpacing: 2,
            borderRadius: 8,
            cursor: disabled ? 'not-allowed' : 'pointer',
          }}
        >
          {kind.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

function actionButton(color: string, disabled: boolean): CSSProperties {
  return {
    marginTop: 8,
    padding: '14px 0',
    fontSize: 18,
    fontWeight: 800,
    letterSpacing: 3,
    border: '1px solid rgba(255,255,255,0.25)',
    background: disabled ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.06)',
    color: disabled ? '#666' : color,
    borderRadius: 8,
    cursor: disabled ? 'not-allowed' : 'pointer',
  };
}
