import { useEffect, useState } from "react";
import type { PhoneSnapshot } from "@partyficrim/shared";
import { Link } from "react-router-dom";
import { useRoomSocket } from "../socket.js";
import { PhoneLobby } from "./PhoneLobby.js";
import { PhoneGame } from "./PhoneGame.js";
import { Robot } from "../display/Sprites.js";
import { usePhoneAudio } from "../audio/usePhoneAudio.js";
import { MuteButton } from "../audio/MuteButton.js";
import { useConnection } from "../net/useConnection.js";
const KEY = "partyficrim.session";
interface Session {
  roomCode: string;
  sessionId: string;
}
function session(): Session | null {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) ?? "null");
    return typeof s?.roomCode === "string" && typeof s?.sessionId === "string"
      ? s
      : null;
  } catch {
    return null;
  }
}
function save(s: Session | null) {
  try {
    s
      ? localStorage.setItem(KEY, JSON.stringify(s))
      : localStorage.removeItem(KEY);
  } catch {
    /* Storage may be unavailable in private mode. */
  }
}
const messages: Record<string, string> = {
  no_such_room: "That room has ended. Ask the host for the new code.",
  room_full: "This room already has three pilots.",
  timeout: "The arena did not respond. Please try again.",
  invalid_payload: "Enter the four letters shown on the arena.",
};
export function PlayPage() {
  const socket = useRoomSocket("phone"),
    online = useConnection(socket);
  const [roomCode, setRoomCode] = useState(
    () =>
      new URLSearchParams(location.search).get("room")?.toUpperCase() ||
      session()?.roomCode ||
      "",
  );
  const [code, setCode] = useState(roomCode),
    [attempt, setAttempt] = useState(0),
    [ready, setReady] = useState(false),
    [snap, setSnap] = useState<PhoneSnapshot | null>(null),
    [error, setError] = useState<string | null>(null),
    [notice, setNotice] = useState("");
  useEffect(() => {
    if (!/^[A-Z]{4}$/.test(roomCode)) return;
    let active = true,
      sequence = -1;
    const join = async () => {
      if (!socket.connected) return;
      setReady(false);
      setError(null);
      const saved = session();
      try {
        const res = await socket.timeout(4500).emitWithAck("phone:join", {
          roomCode,
          sessionId: saved?.roomCode === roomCode ? saved.sessionId : undefined,
        });
        if (!active) return;
        if (!res.ok) {
          save(null);
          setError(messages[res.error] ?? "Could not join this room.");
          return;
        }
        save({ roomCode, sessionId: res.sessionId });
        setReady(true);
      } catch {
        if (active) setError(messages.timeout!);
      }
    };
    const state = (s: PhoneSnapshot) => {
      if (s.roomCode !== roomCode || s.sequence < sequence) return;
      sequence = s.sequence;
      setSnap(s);
    };
    const disconnected = () => {
      sequence = -1;
      setReady(false);
    };
    const ended = () => {
      save(null);
      setSnap(null);
      setReady(false);
      setRoomCode("");
      setCode("");
      setNotice("The host ended this room. Enter a new code to join again.");
      history.replaceState({}, "", "/play");
    };
    const replaced = () => {
      setReady(false);
      setSnap(null);
      setRoomCode("");
      setCode("");
      setNotice(
        "Your station opened in another tab. Use that tab, or enter a different room code here.",
      );
      history.replaceState({}, "", "/play");
    };
    socket.on("phone:session_replaced", replaced);
    socket.on("phone:state", state);
    socket.on("connect", join);
    socket.on("disconnect", disconnected);
    socket.on("room:ended", ended);
    void join();
    return () => {
      active = false;
      socket.off("phone:session_replaced", replaced);
      socket.off("phone:state", state);
      socket.off("connect", join);
      socket.off("disconnect", disconnected);
      socket.off("room:ended", ended);
    };
  }, [socket, roomCode, attempt]);
  const leave = () => {
    if (socket.connected) {
      socket.volatile.emit("phone:input", { dx: 0, dy: 0 });
      socket.timeout(2500).emit("phone:leave", () => {});
    }
    save(null);
    setRoomCode("");
    setCode("");
    setSnap(null);
    setError(null);
    setReady(false);
    history.replaceState({}, "", "/play");
  };
  usePhoneAudio(snap);
  if (!/^[A-Z]{4}$/.test(roomCode) || error)
    return (
      <main className="page">
        <header className="topbar">
          <Link className="wordmark" to="/">
            partyfic<span>RIM</span>
          </Link>
          <MuteButton />
        </header>
        <section className="join-shell">
          <div className="join-intro">
            <Robot size={140} />
            <h1>Your crew is waiting.</h1>
            <p className="muted">Enter the code on the arena screen.</p>
          </div>
          <form
            className="panel join-form"
            onSubmit={(e) => {
              e.preventDefault();
              const next = code.toUpperCase().replace(/[^A-Z]/g, "");
              if (next.length !== 4) return;
              setRoomCode(next);
              setAttempt((a) => a + 1);
              setSnap(null);
              setError(null);
              setNotice("");
              history.replaceState({}, "", `/play?room=${next}`);
            }}
          >
            <label htmlFor="room-code">Room code</label>
            <input
              id="room-code"
              value={code}
              onChange={(e) =>
                setCode(
                  e.target.value
                    .toUpperCase()
                    .replace(/[^A-Z]/g, "")
                    .slice(0, 4),
                )
              }
              maxLength={4}
              placeholder="CHIP"
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              required
              minLength={4}
            />
            {error && (
              <p className="error-note" role="alert">
                {error}
              </p>
            )}
            {notice && <p className="muted">{notice}</p>}
            <button className="primary-button" disabled={code.length !== 4}>
              Join the crew →
            </button>
            <p className="muted" style={{ fontSize: 12, textAlign: "center" }}>
              Or scan the QR code on the arena.
            </p>
          </form>
        </section>
      </main>
    );
  if (
    !snap ||
    snap.phase === "lobby" ||
    snap.phase === "countdown" ||
    !snap.role
  )
    return (
      <PhoneLobby
        socket={socket}
        role={snap?.role ?? null}
        roomCode={roomCode}
        snap={snap}
        onLeave={leave}
        ready={online && ready}
      />
    );
  return (
    <PhoneGame
      socket={socket}
      role={snap.role}
      roomCode={roomCode}
      onLeave={leave}
      snap={snap}
      ready={online && ready}
    />
  );
}
