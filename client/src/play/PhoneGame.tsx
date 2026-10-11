import { useEffect, useRef, useState, type CSSProperties } from "react";
import {
  CORE_COLORS,
  type AttackKind,
  type CoreType,
  type PhoneSnapshot,
  type Role,
} from "@partyficrim/shared";
import type { AppSocket } from "../socket.js";
import { ROLE_COLOR } from "../ui/art.js";
import { StationIcon } from "../ui/StationIcon.js";
import { Robot } from "../display/Sprites.js";
import { MuteButton } from "../audio/MuteButton.js";
import { audio } from "../audio/engine.js";
import { Joystick } from "./Joystick.js";
import { useControllerInput } from "./useControllerInput.js";
import { useLandscape } from "./useLandscape.js";
const ARROWS = ["↖", "↗", "↙", "↘"],
  DIRECTIONS = ["NW", "NE", "SW", "SE"];
const ATTACKS: AttackKind[] = ["melee", "rotary", "laser", "bomb"];
interface Props {
  socket: AppSocket;
  role: Role;
  roomCode: string;
  onLeave: () => void;
  snap: PhoneSnapshot;
  ready: boolean;
}
function WeaponIcon({ kind }: { kind: AttackKind }) {
  return (
    <svg
      viewBox="0 0 24 24"
      stroke="currentColor"
      fill="none"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {kind === "melee" ? (
        <>
          <path d="m4 19 3-3m-1-3 5 5M8 14 18 4l2 2L10 16" />
        </>
      ) : kind === "rotary" ? (
        <>
          <circle cx="12" cy="12" r="7" />
          <path d="M12 4v5m7 3h-5m-2 7v-5m-7-2h5" />
        </>
      ) : kind === "laser" ? (
        <>
          <path d="m3 20 7-8-4-2L20 3l-7 8 4 2Z" />
        </>
      ) : (
        <>
          <circle cx="11" cy="15" r="7" />
          <path d="m14 9 2-4h4m-2-3 3 1-1 3" />
        </>
      )}
    </svg>
  );
}
function Cores({
  items,
  selected,
  disabled,
  onSelect,
}: {
  items: CoreType[];
  selected: (i: number, t: CoreType) => boolean;
  disabled: boolean;
  onSelect: (i: number, t: CoreType) => void;
}) {
  return (
    <div className="core-grid">
      {Array.from({ length: 4 }, (_, i) => {
        const t = items[i];
        return (
          <button
            key={i}
            className={`core-button ${t && selected(i, t) ? "selected" : ""}`}
            disabled={!t || disabled}
            style={
              { "--core": t ? CORE_COLORS[t] : "#5d526c" } as CSSProperties
            }
            aria-pressed={Boolean(t && selected(i, t))}
            aria-label={
              t
                ? `${t} core ${selected(i, t) ? "selected" : "available"}`
                : "Empty core slot"
            }
            onClick={() => {
              if (t) onSelect(i, t);
            }}
          >
            {t ? (
              <>
                <span className="core-gem" />
                <span>{t[0]!.toUpperCase() + t.slice(1)}</span>
              </>
            ) : (
              <span>Empty</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
export function PhoneGame({
  socket,
  role,
  roomCode,
  onLeave,
  snap,
  ready,
}: Props) {
  const { isLandscape, canFullscreen, enterFullscreenLandscape } =
    useLandscape();
  const enabled = ready && snap.phase === "playing" && isLandscape,
    onFoot = snap.mode === "on_foot";
  const move = useControllerInput(socket, enabled, snap.mode),
    [flash, setFlash] = useState<number | null>(null),
    timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  const action = () => {
    if (!enabled || !socket.connected) return;
    audio.play("ui.tap");
    socket.emit("phone:button");
  };
  const quadrant = (index: number) => {
    if (!enabled || !socket.connected || onFoot) return;
    audio.play("ui.tap");
    socket.emit("phone:quadrant", { index });
    if (role === "weapons" && snap.selectedAttackKind) {
      setFlash(index);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setFlash(null), 220);
    }
  };
  const selectCore = (index: number, type: CoreType) => {
    if (!enabled || !socket.connected || onFoot) return;
    audio.play("ui.tap");
    socket.emit("phone:select", {
      index,
      on:
        role === "weapons"
          ? !snap.weaponSelectedCores.includes(type)
          : !snap.selectedCores.includes(index),
    });
  };
  const header = (
    <header className="controller-topbar">
      <span className="station-name">
        <StationIcon role={role} size={18} />
        {role[0]!.toUpperCase() + role.slice(1)}
      </span>
      <span className="mode">
        {onFoot ? "On foot" : "In robot"} · {roomCode}
      </span>
      <MuteButton size={34} />
      <button className="quiet-button" onClick={onLeave}>
        Leave
      </button>
    </header>
  );
  if (!isLandscape)
    return (
      <main className="rotate-view">
        <div className="topbar">
          <span className="pill">Room {roomCode}</span>
          <button className="quiet-button" onClick={onLeave}>
            Leave
          </button>
        </div>
        <Robot size={145} />
        <h1>Turn your phone.</h1>
        <p>
          Your station works best in landscape.
          <br />
          The arena pauses if a pilot disconnects.
        </p>
        {canFullscreen && (
          <button
            className="primary-button"
            onClick={() => void enterFullscreenLandscape()}
          >
            ⛶ Enter fullscreen
          </button>
        )}
      </main>
    );
  if (snap.phase === "gameover")
    return (
      <main
        className="phone-game"
        style={{ "--station": ROLE_COLOR[role] } as CSSProperties}
      >
        {header}
        <section className="game-overlay">
          <Robot size={100} />
          <h1>A good run, crew.</h1>
          <p>The robot needs another go.</p>
          <button
            className="primary-button"
            disabled={!ready}
            onClick={() => {
              if (ready && socket.connected) socket.emit("client:restart_room");
            }}
          >
            Play again →
          </button>
        </section>
      </main>
    );
  return (
    <main
      className="phone-game"
      style={{ "--station": ROLE_COLOR[role] } as CSSProperties}
    >
      {header}
      <div className="controller-body">
        <section className="control-panel">
          <div className="control-heading">
            {role === "weapons" && !onFoot ? "Offered cores" : "Movement"}
            <span>
              {onFoot
                ? "8-way"
                : role === "defense"
                  ? "↔"
                  : role === "repair"
                    ? "↕"
                    : ""}
            </span>
          </div>
          {role === "weapons" && !onFoot ? (
            <Cores
              items={snap.offeredCores}
              selected={(_, t) => snap.weaponSelectedCores.includes(t)}
              disabled={!enabled}
              onSelect={selectCore}
            />
          ) : (
            <div className="joystick-wrap">
              <Joystick
                lockAxis={onFoot ? null : role === "defense" ? "x" : "y"}
                onMove={move}
                color={ROLE_COLOR[role]}
                disabled={!enabled}
              />
            </div>
          )}
          <button
            className="control-action"
            disabled={!enabled || (onFoot && !snap.nearRobot)}
            onClick={action}
          >
            {onFoot
              ? snap.nearRobot
                ? "Enter robot"
                : "Get closer to enter"
              : "Exit robot"}
          </button>
        </section>
        <section className="control-panel">
          <div className="control-heading">
            {role === "weapons" ? "Choose a weapon" : "Your cores"}
          </div>
          {role === "weapons" ? (
            <div className="weapon-list">
              {ATTACKS.map((kind) => (
                <button
                  key={kind}
                  className={`weapon-button ${snap.selectedAttackKind === kind ? "selected" : ""}`}
                  disabled={!enabled || onFoot}
                  aria-pressed={snap.selectedAttackKind === kind}
                  onClick={() => {
                    if (!socket.connected) return;
                    audio.play("ui.tap");
                    socket.emit("phone:select_attack", {
                      kind: snap.selectedAttackKind === kind ? null : kind,
                    });
                  }}
                >
                  <WeaponIcon kind={kind} />
                  <span>{kind[0]!.toUpperCase() + kind.slice(1)}</span>
                </button>
              ))}
            </div>
          ) : (
            <Cores
              items={snap.inventory}
              selected={(i) => snap.selectedCores.includes(i)}
              disabled={!enabled || onFoot}
              onSelect={selectCore}
            />
          )}
          <p className="control-help">
            {onFoot
              ? "Robot controls return when you enter."
              : role === "weapons"
                ? "Tap a direction to fire your selected weapon."
                : "Offer up to two cores to the weapons pilot."}
          </p>
        </section>
        <section className="control-panel">
          <div className="control-heading">
            {role === "defense"
              ? "Shield direction"
              : role === "repair"
                ? "Repair a quadrant"
                : "Fire direction"}
          </div>
          <div className="quadrant-grid">
            {([0, 1, 2, 3] as const).map((q) => (
              <button
                key={q}
                className={`quadrant-button ${snap.quadrant === q ? "selected" : ""} ${flash === q ? "fired" : ""}`}
                aria-label={`${role === "defense" ? "Shield" : role === "repair" ? "Repair" : "Fire"} ${DIRECTIONS[q]}, health ${snap.quadrantHp[q]} percent`}
                aria-pressed={
                  role === "defense" ? snap.quadrant === q : undefined
                }
                disabled={
                  !enabled ||
                  onFoot ||
                  (role === "weapons" && !snap.selectedAttackKind)
                }
                onClick={() => quadrant(q)}
              >
                <span className="direction">{ARROWS[q]}</span>
                <span className="quadrant-meta">
                  <span>{DIRECTIONS[q]}</span>
                  <span>{snap.quadrantHp[q]}%</span>
                </span>
                <div className="health-track">
                  <i
                    style={{
                      width: `${snap.quadrantHp[q]}%`,
                      background:
                        snap.quadrantHp[q] < 30
                          ? "var(--pink)"
                          : ROLE_COLOR[role],
                    }}
                  />
                </div>
              </button>
            ))}
          </div>
          <p className="control-help">
            {role === "defense"
              ? "Tap again to lower the shield."
              : role === "repair"
                ? "Tap a quadrant to restore 5 health."
                : "NW · NE · SW · SE match the arena."}
          </p>
        </section>
      </div>
      {(!ready || snap.phase === "paused") && (
        <div className="controller-blocker" role="status">
          <h2>{ready ? "Crew connection lost." : "Reconnecting…"}</h2>
          <p>
            {ready
              ? "The game resumes when every station is connected."
              : "Hold on. Your station will reconnect automatically."}
          </p>
        </div>
      )}
    </main>
  );
}
