import { useEffect, useRef, useState, type MutableRefObject } from "react";
import type { DisplaySnapshot } from "@partyficrim/shared";
import type { AppSocket } from "../socket.js";
export interface Frames {
  previous: DisplaySnapshot | null;
  current: DisplaySnapshot | null;
  receivedAt: number;
  interval: number;
}
export type FrameRef = MutableRefObject<Frames>;
export function useDisplayState(socket: AppSocket, roomCode: string | null) {
  const [snap, setSnap] = useState<DisplaySnapshot | null>(null);
  const frames = useRef<Frames>({
      previous: null,
      current: null,
      receivedAt: 0,
      interval: 33,
    }),
    published = useRef(0);
  useEffect(() => {
    frames.current = {
      previous: null,
      current: null,
      receivedAt: 0,
      interval: 33,
    };
    setSnap(null);
    const handler = (s: DisplaySnapshot) => {
      const f = frames.current;
      if (
        s.roomCode !== roomCode ||
        (f.current && s.sequence <= f.current.sequence)
      )
        return;
      const now = performance.now(),
        reset =
          !f.current ||
          s.phase !== f.current.phase ||
          s.elapsedMs < f.current.elapsedMs;
      frames.current = {
        previous: reset ? s : f.current,
        current: s,
        receivedAt: now,
        interval: Math.max(16, Math.min(100, now - f.receivedAt)),
      };
      // Canvas consumes every frame directly. React HUD only needs ten updates/second.
      if (reset || now - published.current >= 100) {
        published.current = now;
        setSnap(s);
      }
    };
    socket.on("display:state", handler);
    return () => {
      socket.off("display:state", handler);
    };
  }, [socket, roomCode]);
  return { snap, frames };
}
