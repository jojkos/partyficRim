import { useEffect, useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import type { DisplaySnapshot } from "@partyficrim/shared";
import type { AppSocket } from "../socket.js";
import { ROLE_COLOR } from "../ui/art.js";
import { StationIcon } from "../ui/StationIcon.js";
import { STATIONS, STATION_HELP } from "../ui/stations.js";
import { MuteButton } from "../audio/MuteButton.js";
interface Props {
  socket: AppSocket;
  roomCode: string | null;
  snap: DisplaySnapshot | null;
  onResetRoom: () => void;
  ready: boolean;
  notice: string;
}
export function DisplayLobby({
  socket,
  roomCode,
  snap,
  onResetRoom,
  ready,
  notice,
}: Props) {
  const [qr, setQr] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    setQr(null);
    if (roomCode)
      void import("qrcode")
        .then(({ default: q }) =>
          q.toDataURL(`${location.origin}/play?room=${roomCode}`, {
            width: 280,
            margin: 2,
            errorCorrectionLevel: "M",
          }),
        )
        .then((url) => {
          if (active) setQr(url);
        })
        .catch(() => {});
    return () => {
      active = false;
    };
  }, [roomCode]);
  const claimed = STATIONS.filter((r) => snap?.roleClaims[r]).length;
  return (
    <main className="page">
      <div className="shell">
        <header className="topbar">
          <Link className="wordmark" to="/">
            partyfic<span>RIM</span>
          </Link>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <span className="pill">
              <i />
              {ready ? "Arena online" : "Connecting…"}
            </span>
            <MuteButton />
            <button
              className="quiet-button"
              onClick={onResetRoom}
              disabled={!ready}
            >
              New room
            </button>
          </div>
        </header>
        <div className="lobby-grid">
          <section className="panel">
            <span className="eyebrow">Invite your crew</span>
            <h1 style={{ fontSize: 34, marginTop: 10 }}>
              Your robot needs three pilots.
            </h1>
            <div
              className="join-code"
              data-testid="room-code"
              aria-label="Room code"
            >
              {roomCode ?? "····"}
            </div>
            <div className="qr-row">
              {qr ? (
                <img src={qr} className="qr-image" alt="join QR" />
              ) : (
                <div className="qr-image" />
              )}
              <div>
                <p>
                  <b>Scan with each phone</b>
                </p>
                <p className="muted">
                  Or open <b>{location.host}/play</b>
                  <br />
                  and enter the room code.
                </p>
              </div>
            </div>
            <p className="lobby-note">
              Keep this screen open. The arena lives here.
            </p>
          </section>
          <section className="panel">
            <div className="crew-heading">
              <h2>The crew</h2>
              <span className="pill">{claimed}/3 ready</span>
            </div>
            {STATIONS.map((r) => (
              <div
                className="station-card"
                key={r}
                style={{ "--station": ROLE_COLOR[r] } as CSSProperties}
              >
                <span className="station-symbol">
                  <StationIcon role={r} />
                </span>
                <div className="station-copy">
                  <strong>{r[0]!.toUpperCase() + r.slice(1)}</strong>
                  <small>{STATION_HELP[r]}</small>
                </div>
                <span className="station-status">
                  {snap?.roleClaims[r] ? "✓ Connected" : "Open"}
                </span>
              </div>
            ))}
            <div className="lobby-start">
              <button
                className="primary-button"
                disabled={!ready || claimed !== 3}
                onClick={() => {
                  if (socket.connected) socket.emit("client:request_start");
                }}
              >
                Launch game →
              </button>
              <small>
                {claimed === 3
                  ? "Everyone is ready. Launch here or on any phone."
                  : `Waiting for ${3 - claimed} ${3 - claimed === 1 ? "station" : "stations"} to be claimed.`}
              </small>
            </div>
            {notice && (
              <p className="error-note" role="status" style={{ marginTop: 15 }}>
                {notice}
              </p>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
