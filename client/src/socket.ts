import { io, type Socket } from "socket.io-client";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from "@partyficrim/shared";
import { useEffect, useMemo } from "react";
export type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;
// Each view owns its connection. Navigating away pauses/disconnects that view,
// while StrictMode's temporary unmount does not create extra sessions.
const connections = new Map<string, { socket: AppSocket; users: number }>();
export function useRoomSocket(view: "display" | "phone"): AppSocket {
  const entry = useMemo(() => {
    let existing = connections.get(view);
    if (!existing) {
      existing = { socket: io({ autoConnect: false }), users: 0 };
      connections.set(view, existing);
    }
    return existing;
  }, [view]);
  useEffect(() => {
    entry.users++;
    entry.socket.connect();
    return () => {
      entry.users--;
      queueMicrotask(() => {
        if (entry.users === 0) entry.socket.disconnect();
      });
    };
  }, [entry]);
  return entry.socket;
}
