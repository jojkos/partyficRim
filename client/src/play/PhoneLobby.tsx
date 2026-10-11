import { useState, type CSSProperties } from "react";
import type { PhoneSnapshot, Role } from "@partyficrim/shared";
import type { AppSocket } from "../socket.js";
import { ROLE_COLOR } from "../ui/art.js";
import { StationIcon } from "../ui/StationIcon.js";
import { MuteButton } from "../audio/MuteButton.js";
import { audio } from "../audio/engine.js";
import { useLandscape } from "./useLandscape.js";
import { STATIONS, STATION_HELP } from "../ui/stations.js";
interface Props {
  socket: AppSocket;
  role: Role | null;
  roomCode: string;
  snap: PhoneSnapshot | null;
  onLeave: () => void;
  ready: boolean;
}
export function PhoneLobby({
  socket,
  role,
  roomCode,
  snap,
  onLeave,
  ready,
}: Props) {
  const [pending, setPending] = useState<Role | "release" | null>(null),
    [error, setError] = useState("");
  const { canFullscreen, enterFullscreenLandscape, isIOS, isStandalone } =
    useLandscape();
  const claimed = STATIONS.filter((r) => snap?.roleClaims[r]).length,
    canStart = ready && claimed === 3 && snap?.phase === "lobby";
  const claim = async (r: Role) => {
    if (!ready || !socket.connected || pending) return;
    setPending(role === r ? "release" : r);
    setError("");
    audio.play("ui.tap");
    try {
      const res = await socket
        .timeout(3000)
        .emitWithAck("phone:claim_role", { role: role === r ? null : r });
      if (!res.ok)
        setError(
          res.error === "claimed"
            ? "Another pilot just took that station."
            : "Could not change station. Try again.",
        );
    } catch {
      setError("Connection interrupted. Try again after reconnecting.");
    } finally {
      setPending(null);
    }
  };
  if (snap?.phase === "countdown")
    return (
      <main className="rotate-view">
        <span className="eyebrow">Crew assembled</span>
        <h1>Ready for launch.</h1>
        <p>Your controls appear in a moment.</p>
      </main>
    );
  return (
    <main className="page phone-lobby">
      <header className="topbar">
        <span className="pill">
          Room <b>{roomCode}</b>
        </span>
        <div style={{ display: "flex", gap: 8 }}>
          <MuteButton />
          <button className="quiet-button" onClick={onLeave}>
            Leave
          </button>
        </div>
      </header>
      <div className="phone-lobby-intro">
        <h1>Pick your station.</h1>
        <p>Three pilots. Everyone has a part to play.</p>
      </div>
      <section className="phone-stations" aria-label="Crew stations">
        {STATIONS.map((r) => {
          const taken = Boolean(snap?.roleClaims[r]) && role !== r;
          return (
            <button
              key={r}
              className={`phone-station ${role === r ? "selected" : ""}`}
              style={{ "--station": ROLE_COLOR[r] } as CSSProperties}
              disabled={!ready || taken || Boolean(pending)}
              aria-pressed={role === r}
              onClick={() => void claim(r)}
            >
              <span className="station-symbol">
                <StationIcon role={r} />
              </span>
              <div>
                <strong>{r[0]!.toUpperCase() + r.slice(1)}</strong>
                <small>{STATION_HELP[r]}</small>
              </div>
              <span className="station-status">
                {pending === r
                  ? "Joining…"
                  : role === r
                    ? "✓ You"
                    : taken
                      ? "Taken"
                      : "Open"}
              </span>
            </button>
          );
        })}
      </section>
      {error && (
        <p className="error-note" role="alert">
          {error}
        </p>
      )}
      <footer className="phone-footer">
        <p role="status">
          {!ready
            ? "Connecting to the arena…"
            : canStart
              ? "Crew ready. Any pilot can launch."
              : claimed === 3
                ? "Waiting for the arena…"
                : `${3 - claimed} ${3 - claimed === 1 ? "station still needs a pilot." : "stations still need pilots."}`}
        </p>
        {canFullscreen && !isStandalone ? (
          <button
            className="phone-fullscreen"
            onClick={() => void enterFullscreenLandscape()}
          >
            ⛶ Fullscreen for more room
          </button>
        ) : isIOS && !isStandalone ? (
          <p>Tip: Add to Home Screen for more room.</p>
        ) : null}
        <button
          className="primary-button"
          disabled={!canStart}
          onClick={() => {
            audio.play("ui.start_press");
            if (socket.connected) socket.emit("client:request_start");
          }}
        >
          Launch game →
        </button>
      </footer>
    </main>
  );
}
