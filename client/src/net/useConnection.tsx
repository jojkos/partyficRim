import { useEffect, useState } from "react";
import type { AppSocket } from "../socket.js";
export function useConnection(socket: AppSocket) {
  const [online, setOnline] = useState(socket.connected);
  useEffect(() => {
    const connected = () => setOnline(true),
      disconnected = () => setOnline(false);
    socket.on("connect", connected);
    socket.on("disconnect", disconnected);
    socket.on("connect_error", disconnected);
    return () => {
      socket.off("connect", connected);
      socket.off("disconnect", disconnected);
      socket.off("connect_error", disconnected);
    };
  }, [socket]);
  return online;
}
export function ConnectionNote({
  online,
  ready,
}: {
  online: boolean;
  ready: boolean;
}) {
  return !online || !ready ? (
    <div className="connection-note" role="status">
      {online
        ? "Syncing with the arena…"
        : "Connection interrupted · reconnecting…"}
    </div>
  ) : null;
}
