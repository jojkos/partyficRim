import { useEffect,  useState, lazy, Suspense } from "react";
import { useRoomSocket } from "../socket.js";
import { DisplayLobby } from "./DisplayLobby.js";
import { useDisplayState } from "./useDisplayState.js";
import { HudBar } from "./HudBar.js";
import { useGameAudio } from "../audio/useGameAudio.js";
import { MuteButton } from "../audio/MuteButton.js";
import { Robot } from "./Sprites.js";
import { ConnectionNote, useConnection } from "../net/useConnection.js";
const Arena = lazy(() => import("./GameArena.js"));
const KEY = "partyficrim.host";
interface Host {
  roomCode: string;
  hostToken: string;
}
function stored(): Host | null {
  try {
    const p = JSON.parse(localStorage.getItem(KEY) ?? "null");
    return typeof p?.hostToken === "string" && typeof p?.roomCode === "string"
      ? p
      : null;
  } catch {
    return null;
  }
}
function save(host: Host) {
  try {
    localStorage.setItem(KEY, JSON.stringify(host));
    localStorage.removeItem("partyficrim.displayRoomCode");
  } catch {
    /* Private-mode storage may be unavailable. */
  }
}
export function DisplayPage() {
  const socket = useRoomSocket("display"),
    online = useConnection(socket);
  const [host, setHost] = useState<Host | null>(() => {
    if (new URLSearchParams(location.search).get("new") === "1") {
      try {
        localStorage.removeItem(KEY);
      } catch {}
      history.replaceState({}, "", "/display");
      return null;
    }
    return stored();
  });
  const [ready, setReady] = useState(false),
    [notice, setNotice] = useState(""),
    [retry, setRetry] = useState(0);
  const { snap, frames } = useDisplayState(socket, host?.roomCode ?? null);
  useEffect(() => {
    let active = true;
    const ensure = async () => {
      if (!socket.connected) return;
      setReady(false);
      try {
        const saved = stored();
        if (saved) {
          const res = await socket
            .timeout(4500)
            .emitWithAck("display:join_room", saved);
          if (!active) return;
          if (res.ok) {
            setHost(saved);
            setReady(true);
            return;
          }
          setNotice(
            "The previous room has ended. A fresh room is ready for your crew.",
          );
        }
        const res = await socket
          .timeout(4500)
          .emitWithAck("display:create_room");
        if (!active) return;
        save(res);
        setHost(res);
        setReady(true);
      } catch {
        if (active)
          setNotice("The arena did not respond. Reconnect or try again.");
      }
    };
    const disconnect = () => setReady(false);
    socket.on("connect", ensure);
    socket.on("disconnect", disconnect);
    void ensure();
    return () => {
      active = false;
      socket.off("connect", ensure);
      socket.off("disconnect", disconnect);
    };
  }, [socket, retry]);
  const reset = async () => {
    if (!ready || !socket.connected) return;
    try {
      const res = await socket.timeout(4500).emitWithAck("display:end_room");
      const next = { roomCode: res.newRoomCode, hostToken: res.hostToken };
      save(next);
      setHost(next);
      setNotice("");
    } catch {
      setNotice("Could not create a new room. Try again after reconnecting.");
    }
  };
  useGameAudio(snap);
  if (!snap || snap.phase === "lobby")
    return (
      <>
        <DisplayLobby
          socket={socket}
          roomCode={host?.roomCode ?? null}
          snap={snap}
          onResetRoom={() => void reset()}
          ready={online && ready}
          notice={notice}
        />
        {(!online || !ready) && (
          <ConnectionNote online={online} ready={ready} />
        )}{" "}
        {notice && !ready && (
          <button
            className="quiet-button"
            onClick={() => setRetry((n) => n + 1)}
            style={{ position: "fixed", bottom: 20, left: 20 }}
          >
            Try again
          </button>
        )}
      </>
    );
  const disconnected = snap.players
    .filter((p) => !p.connected && p.role)
    .map((p) => p.role)
    .join(", ");
  return (
    <main className="game-page">
      <HudBar snap={snap} />
      <section className="arena-host">
        <Suspense
          fallback={<div className="game-overlay">Preparing the arena…</div>}
        >
          <Arena frames={frames} />
        </Suspense>
        <span className="arena-caption">
          Stay together. Keep the robot rolling.
        </span>
        <div className="arena-options">
          <MuteButton upward />
          <button
            className="quiet-button"
            onClick={() => void reset()}
            disabled={!ready}
          >
            End game
          </button>
        </div>
        {snap.phase === "countdown" && (
          <div className="game-overlay">
            <span className="eyebrow">All stations ready</span>
            <span className="countdown-number">
              {Math.max(1, Math.ceil(snap.countdownMsRemaining / 1000))}
            </span>
            <h1>Let’s roll, crew.</h1>
          </div>
        )}
        {snap.phase === "paused" && (
          <div className="game-overlay" role="status">
            <Robot size={120} />
            <h1>Waiting for the crew.</h1>
            <p>
              {disconnected
                ? `${disconnected[0]?.toUpperCase()}${disconnected.slice(1)} ${disconnected.includes(",") ? "are" : "is"} reconnecting.`
                : "A station needs a connected pilot."}
              <br />
              Your run is paused safely.
            </p>
          </div>
        )}
        {snap.phase === "gameover" && (
          <div className="game-overlay">
            <Robot size={140} />
            <h1>A good run, crew.</h1>
            <p>
              You kept the robot rolling for {Math.floor(snap.elapsedMs / 1000)}{" "}
              seconds. Ready for another adventure?
            </p>
            <button
              className="primary-button"
              disabled={!ready}
              onClick={() => {
                if (socket.connected) socket.emit("client:restart_room");
              }}
            >
              Play again →
            </button>
          </div>
        )}
      </section>
      <ConnectionNote online={online} ready={ready} />
    </main>
  );
}
