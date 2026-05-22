import { useEffect, useState, useCallback, type CSSProperties } from 'react';
import type { AttackKind, CoreType, PhoneSnapshot, Quadrant, Role } from '@partyficrim/shared';
import { CORE_COLORS, ROLE_LABEL } from '@partyficrim/shared';
import type { AppSocket } from '../socket.js';
import { Joystick } from './Joystick.js';
import { useLandscape } from './useLandscape.js';
import { Robot } from '../display/Sprites.js';
import { PR } from '../ui/theme.js';
import { audio } from '../audio/engine.js';

const ROLE_NUMBER: Record<Role, number> = { defense: 1, repair: 2, weapons: 3 };
const QUADRANT_ARROW = ['↖', '↗', '↙', '↘'] as const;
const QUADRANT_LABEL = ['NW', 'NE', 'SW', 'SE'] as const;
const ATTACKS: AttackKind[] = ['melee', 'rotary', 'laser', 'bomb'];

interface Props { socket: AppSocket; role: Role; roomCode: string; onLeave: () => void; }

const FIRE_FLASH_MS = 220;

export function PhoneGame({ socket, role, onLeave }: Props) {
  const [snap, setSnap] = useState<PhoneSnapshot | null>(null);
  const [firedQuadrant, setFiredQuadrant] = useState<number | null>(null);
  const { isLandscape, enterFullscreenLandscape, canFullscreen, isStandalone } = useLandscape();

  useEffect(() => {
    const h = (s: PhoneSnapshot) => setSnap(s);
    socket.on('phone:state', h);
    return () => { socket.off('phone:state', h); };
  }, [socket]);

  const onMove = useCallback((dx: number, dy: number) => {
    socket.emit('phone:input', { dx, dy });
  }, [socket]);
  const onAction = useCallback(() => {
    audio.play('ui.tap');
    socket.emit('phone:button');
  }, [socket]);
  const onSelect = useCallback((index: number) => {
    audio.play('ui.tap');
    const offered = snap?.offeredCores[index];
    const selected = role === 'weapons'
      ? Boolean(offered && snap?.weaponSelectedCores.includes(offered))
      : (snap?.selectedCores.includes(index) ?? false);
    socket.emit('phone:select', { index, on: !selected });
  }, [role, socket, snap]);
  const onQuadrant = useCallback((index: number) => {
    if (role === 'repair') {
      audio.play('repair.tick');
      socket.emit('phone:repair', { quadrant: index });
    } else {
      audio.play('ui.tap');
      socket.emit('phone:quadrant', { index });
    }
    // weapons direction is one-shot on the server — flash the tapped button
    // briefly so the user still gets visual feedback of the press.
    if (role === 'weapons') {
      setFiredQuadrant(index);
      window.setTimeout(() => {
        setFiredQuadrant((cur) => (cur === index ? null : cur));
      }, FIRE_FLASH_MS);
    }
  }, [role, socket]);
  const onSelectAttack = useCallback((kind: AttackKind) => {
    audio.play('ui.tap');
    socket.emit('phone:select_attack', { kind: snap?.selectedAttackKind === kind ? null : kind });
  }, [socket, snap?.selectedAttackKind]);
  const onRestart = useCallback(() => {
    socket.emit('client:restart_room');
  }, [socket]);

  const onFoot = snap?.mode === 'on_foot';
  let lockAxis: 'x' | 'y' | null = null;
  if (!onFoot && role !== 'weapons') lockAxis = role === 'defense' ? 'x' : 'y';
  const lockHint = onFoot ? '8-WAY' : (role === 'defense' ? 'L↔R' : role === 'repair' ? 'U↕D' : 'FREE');
  const color = PR.role[role];
  const isWeapons = role === 'weapons';
  const isRepair = role === 'repair';
  const gameover = snap?.phase === 'gameover';
  const actionLabel = onFoot ? 'ENTER' : 'EXIT';
  const actionDisabled = (onFoot && !snap?.nearRobot) || gameover;
  const controlsDisabled = onFoot || gameover;

  // ── ROTATE HINT (portrait)
  if (!isLandscape) {
    return (
      <div style={{
        position: 'fixed', inset: 0,
        background: PR.color.bg, fontFamily: PR.font.sans, color: PR.color.paper,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 14, padding: 24, textAlign: 'center',
      }}>
        <div style={{
          font: `400 64px ${PR.font.display}`, color, lineHeight: 1,
          animation: 'pr-rotate-hint 1.6s ease-in-out infinite',
        }}>↻</div>
        <div style={{ font: `700 22px ${PR.font.sans}`, letterSpacing: 2, color }}>
          ROTATE YOUR PHONE
        </div>
        <div style={{ font: `500 12px ${PR.font.sans}`, opacity: 0.6, letterSpacing: 1 }}>
          partyficRim is played in landscape
        </div>
        {canFullscreen && !isStandalone && (
          <button
            onClick={enterFullscreenLandscape}
            className="pr-bevel-btn"
            style={{
              marginTop: 8, background: color, color: PR.color.ink,
              border: `3px solid ${PR.color.ink}`, borderRadius: PR.r.md,
              boxShadow: PR.shadow(3, 4, PR.color.ink),
              font: `400 18px ${PR.font.display}`, letterSpacing: 3,
              padding: '8px 22px', cursor: 'pointer',
            }}>
            ENTER FULLSCREEN
          </button>
        )}
      </div>
    );
  }

  // ── GAME OVER full-screen
  if (gameover) {
    return (
      <div style={{
        position: 'fixed', inset: 0,
        background: `linear-gradient(180deg, ${PR.color.cherry} 0%, ${PR.color.flameDk} 100%)`,
        fontFamily: PR.font.sans, color: PR.color.paper,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 24, padding: 24, overflow: 'hidden',
      }}>
        <button
          onClick={onLeave}
          style={{
            position: 'absolute', top: 8, right: 12,
            font: `700 10px ${PR.font.sans}`, letterSpacing: 1,
            color: PR.color.paper, opacity: 0.85,
            border: `1px solid ${PR.color.paper}55`, borderRadius: 6,
            padding: '5px 10px',
            background: 'rgba(0,0,0,0.30)', cursor: 'pointer',
          }}>Leave</button>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            font: `400 56px ${PR.font.display}`, color: PR.color.sun,
            textShadow: `3px 5px 0 ${PR.color.ink}`, letterSpacing: 4, lineHeight: 1,
          }}>GAME<br />OVER</div>
          <div style={{
            font: `700 11px ${PR.font.sans}`, letterSpacing: 3, marginTop: 8,
            color: PR.color.paper, opacity: 0.9,
          }}>THE RIM HAS FALLEN</div>
          <button
            onClick={onRestart}
            className="pr-bevel-btn"
            style={{
              marginTop: 14, display: 'inline-block',
              background: PR.color.sun, color: PR.color.ink,
              border: `3px solid ${PR.color.ink}`, borderRadius: PR.r.md,
              padding: '8px 28px', boxShadow: PR.shadow(3, 4, PR.color.ink),
              font: `400 22px ${PR.font.display}`, letterSpacing: 3, cursor: 'pointer',
            }}>RESTART</button>
        </div>
        <div style={{
          transform: 'rotate(-12deg)',
          animation: 'pr-shake 0.6s ease-in-out infinite',
        }}>
          <Robot size={130} glow={PR.color.cherry} />
        </div>
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, width: '100%', height: '100%',
      touchAction: 'none', userSelect: 'none', overflow: 'hidden',
      display: 'grid', gridTemplateRows: '30px 1fr',
      background: PR.color.bgDeep, fontFamily: PR.font.sans, color: PR.color.paper,
    }}>
      {/* TOP BAR */}
      <div style={{
        display: 'flex', alignItems: 'center',
        gap: 10, paddingInline: 10,
        background: PR.color.bg, borderBottom: `2px solid ${color}`,
      }}>
        <div style={{
          width: 12, height: 12, background: color,
          border: `2px solid ${PR.color.ink}`, borderRadius: 3,
        }} />
        <div style={{
          font: `700 12px ${PR.font.sans}`, letterSpacing: 2.5, color,
        }}>P{ROLE_NUMBER[role]} · {ROLE_LABEL[role]}</div>
        <div style={{ font: `500 10px ${PR.font.mono}`, opacity: 0.5, marginLeft: 6 }}>
          {onFoot ? 'ON FOOT' : 'IN ROBOT'}
        </div>
        <div style={{ flex: 1 }} />
        {canFullscreen && !isStandalone && (
          <button
            onClick={enterFullscreenLandscape}
            title="Enter fullscreen"
            style={{
              font: `700 10px ${PR.font.sans}`, letterSpacing: 1,
              color: PR.color.paper, opacity: 0.85,
              border: `1px solid ${PR.color.paper}33`, borderRadius: 6,
              padding: '4px 8px',
              background: 'rgba(0,0,0,0.45)', cursor: 'pointer',
              lineHeight: 1,
            }}>⛶</button>
        )}
        <button
          onClick={onLeave}
          style={{
            font: `700 10px ${PR.font.sans}`, letterSpacing: 1,
            color: PR.color.paper, opacity: 0.85,
            border: `1px solid ${PR.color.paper}33`, borderRadius: 6,
            padding: '4px 10px',
            background: 'rgba(0,0,0,0.45)', cursor: 'pointer',
          }}>Leave</button>
      </div>

      {/* 3-COLUMN GRID */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', height: '100%',
      }}>
        {/* LEFT: joystick (or OFFERED grid for weapons), then action */}
        <div style={{
          padding: 10, borderRight: `1px dashed ${color}55`,
          display: 'flex', flexDirection: 'column', gap: 8, minHeight: 0,
        }}>
          {isWeapons && !onFoot ? (
            <>
              <div style={{
                font: `700 9px ${PR.font.sans}`, letterSpacing: 2,
                color, opacity: 0.85, marginBottom: -2,
              }}>OFFERED CORES</div>
              <div style={{ flex: 1, minHeight: 0 }}>
                <CoreGrid
                  cores={snap?.offeredCores ?? []}
                  selected={(type) => Boolean(type && snap?.weaponSelectedCores.includes(type))}
                  disabled={controlsDisabled}
                  onSelect={onSelect}
                />
              </div>
            </>
          ) : (
            <JoystickWrap color={color} hint={lockHint} disabled={gameover}>
              <Joystick lockAxis={lockAxis} onMove={onMove} color={color} />
            </JoystickWrap>
          )}
          <ActionBtn color={color} label={actionLabel} disabled={actionDisabled} onClick={onAction} />
        </div>

        {/* MIDDLE: inventory cores (defense/repair) or attack list (weapons) */}
        <div style={{
          padding: 10, borderRight: `1px dashed ${color}55`, minHeight: 0,
          display: isWeapons ? 'grid' : 'block',
          gap: isWeapons ? 8 : 0,
          gridTemplateRows: isWeapons ? 'repeat(4, 1fr)' : undefined,
        }}>
          {isWeapons ? (
            ATTACKS.map((kind) => {
              const on = snap?.selectedAttackKind === kind;
              return (
                <button
                  key={kind}
                  onPointerDown={(e) => { if (!controlsDisabled) { e.preventDefault(); onSelectAttack(kind); } }}
                  disabled={controlsDisabled}
                  className={!controlsDisabled ? 'pr-bevel-btn' : undefined}
                  style={{
                    border: `3px solid ${on ? PR.color.sun : '#ffffff44'}`,
                    borderRadius: PR.r.md,
                    background: on ? PR.color.sun : 'rgba(255,224,102,0.10)',
                    color: on ? PR.color.ink : PR.color.sun,
                    boxShadow: on ? PR.shadow(2, 3, PR.color.ink) : 'none',
                    font: `700 14px ${PR.font.sans}`, letterSpacing: 3,
                    padding: 0, cursor: controlsDisabled ? 'not-allowed' : 'pointer',
                    opacity: controlsDisabled ? 0.45 : 1,
                  }}>
                  {kind.toUpperCase()}
                </button>
              );
            })
          ) : (
            <CoreGrid
              cores={snap?.inventory ?? []}
              selected={(_, index) => snap?.selectedCores.includes(index) ?? false}
              disabled={controlsDisabled}
              onSelect={onSelect}
            />
          )}
        </div>

        {/* RIGHT: 2x2 quadrants */}
        <div style={{
          padding: 10, position: 'relative',
          display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: 8,
        }}>
          <div style={{
            position: 'absolute', top: -1, right: 4,
            font: `700 9px ${PR.font.sans}`, letterSpacing: 2,
            color, opacity: 0.7,
          }}>{isRepair ? 'TAP TO REPAIR' : 'TAP TO TARGET'}</div>
          {[0, 1, 2, 3].map((i) => {
            const hp = snap?.quadrantHp[i as Quadrant] ?? 100;
            const selected = isWeapons ? firedQuadrant === i : snap?.quadrant === i;
            const low = hp < 30;
            const arrow = QUADRANT_ARROW[i];
            const label = QUADRANT_LABEL[i];
            let borderColor: string;
            if (selected) borderColor = color;
            else if (low) borderColor = PR.color.cherry;
            else borderColor = '#ffffff33';
            return (
              <button
                key={i}
                onPointerDown={(e) => { if (!controlsDisabled) { e.preventDefault(); onQuadrant(i); } }}
                disabled={controlsDisabled}
                style={{
                  position: 'relative', overflow: 'hidden',
                  border: `3px solid ${borderColor}`,
                  borderRadius: PR.r.md,
                  background: selected && !isRepair ? color : PR.color.panel,
                  color: selected && !isRepair ? PR.color.ink : PR.color.paper,
                  cursor: controlsDisabled ? 'not-allowed' : 'pointer',
                  opacity: controlsDisabled ? 0.45 : 1,
                  display: 'grid', placeItems: 'center', padding: 0,
                  fontFamily: PR.font.sans,
                }}>
                {isRepair && (
                  <div style={{
                    position: 'absolute', inset: 0,
                    background: `linear-gradient(to top, ${low ? PR.color.cherry : color} ${hp}%, transparent ${hp}%)`,
                    opacity: 0.55,
                  }} />
                )}
                <div style={{ position: 'relative', textAlign: 'center' }}>
                  {isRepair ? (
                    <>
                      <div style={{
                        font: `700 11px ${PR.font.sans}`, letterSpacing: 1, opacity: 0.9,
                      }}>{label}</div>
                      <div style={{
                        font: `400 22px ${PR.font.display}`, lineHeight: 1,
                        color: low ? PR.color.cherry : PR.color.paper,
                      }}>{hp}%</div>
                    </>
                  ) : (
                    <div style={{
                      font: `700 30px ${PR.font.sans}`, lineHeight: 1,
                    }}>{arrow}</div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function JoystickWrap({
  color, hint, disabled, children,
}: {
  color: string; hint: string; disabled: boolean; children: React.ReactNode;
}) {
  return (
    <div style={{
      flex: 1, position: 'relative',
      background: PR.color.panel, border: `2px dashed ${color}aa`, borderRadius: PR.r.md,
      minHeight: 0, opacity: disabled ? 0.4 : 1,
      pointerEvents: disabled ? 'none' : 'auto',
      overflow: 'hidden',
    }}>
      {hint === 'L↔R' && (
        <div style={{
          position: 'absolute', top: '50%', left: 8, right: 8,
          height: 0, borderTop: `1px dashed ${color}55`,
        }} />
      )}
      {hint === 'U↕D' && (
        <div style={{
          position: 'absolute', left: '50%', top: 8, bottom: 8,
          width: 0, borderLeft: `1px dashed ${color}55`,
        }} />
      )}
      {children}
      <div style={{
        position: 'absolute', top: 6, left: 8, pointerEvents: 'none',
        font: `700 9px ${PR.font.sans}`, letterSpacing: 1.5, color, opacity: 0.85,
      }}>MOVE</div>
      <div style={{
        position: 'absolute', bottom: 6, right: 8, pointerEvents: 'none',
        font: `700 8px ${PR.font.mono}`, letterSpacing: 1, color, opacity: 0.6,
      }}>{hint}</div>
    </div>
  );
}

function ActionBtn({
  color, label, disabled, onClick,
}: {
  color: string; label: string; disabled: boolean; onClick: () => void;
}) {
  return (
    <button
      onPointerDown={(e) => { if (!disabled) { e.preventDefault(); onClick(); } }}
      disabled={disabled}
      className={!disabled ? 'pr-bevel-btn' : undefined}
      style={actionStyle(color, disabled)}>
      ⊙ {label}
    </button>
  );
}

function actionStyle(color: string, disabled: boolean): CSSProperties {
  return {
    background: disabled ? 'rgba(255,255,255,0.05)' : PR.color.sun,
    color: disabled ? '#666' : PR.color.ink,
    border: `3px solid ${disabled ? '#444' : PR.color.ink}`,
    borderRadius: PR.r.md,
    font: `400 22px ${PR.font.display}`,
    letterSpacing: 3, padding: '6px 0',
    boxShadow: disabled ? 'none' : PR.shadow(3, 4, PR.color.ink),
    cursor: disabled ? 'not-allowed' : 'pointer',
    // role color is intentionally unused on the action button — the design
    // calls for the bright sun-yellow CTA against the role-colored frame.
    outlineColor: color,
  };
}

function CoreGrid({
  cores,
  selected,
  disabled,
  onSelect,
}: {
  cores: CoreType[];
  selected: (type: CoreType | undefined, index: number) => boolean;
  disabled: boolean | undefined;
  onSelect: (index: number) => void;
}) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr',
      gap: 6, width: '100%', height: '100%', minHeight: 0,
    }}>
      {[0, 1, 2, 3].map((i) => {
        const type = cores[i];
        const hex = type ? CORE_COLORS[type] : null;
        const on = type ? selected(type, i) : false;
        const isDisabled = disabled || !type;
        return (
          <button
            key={i}
            onPointerDown={(e) => { if (!isDisabled) { e.preventDefault(); onSelect(i); } }}
            disabled={isDisabled}
            className={!isDisabled ? 'pr-bevel-btn' : undefined}
            style={{
              position: 'relative',
              border: `3px solid ${type && hex ? hex : '#ffffff22'}`,
              borderRadius: PR.r.md,
              background: on && hex ? hex : 'transparent',
              color: on ? PR.color.ink : (hex ?? '#fff'),
              display: 'grid', placeItems: 'center',
              font: `700 12px ${PR.font.sans}`, letterSpacing: 1.5,
              cursor: isDisabled ? 'not-allowed' : 'pointer',
              opacity: isDisabled ? 0.45 : 1,
              minHeight: 0, padding: 0,
            }}>
            {type && hex ? (
              <>
                <div style={{
                  position: 'absolute', top: 4, right: 4,
                  width: 10, height: 10, borderRadius: '50%',
                  background: hex, border: `2px solid ${PR.color.ink}`,
                }} />
                <span>{type.toUpperCase()}</span>
              </>
            ) : (
              <span style={{ font: `700 9px ${PR.font.sans}`, opacity: 0.4 }}>EMPTY</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
