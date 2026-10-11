import { useCallback, useEffect, useRef } from "react";
import type { AppSocket } from "../socket.js";
export function useControllerInput(
  socket: AppSocket,
  enabled: boolean,
  mode: string,
) {
  const vector = useRef({ dx: 0, dy: 0 });
  const lastSentAt = useRef(-Infinity);
  const send = useCallback(() => {
    if (enabled && socket.connected && !document.hidden) {
      socket.volatile.emit("phone:input", vector.current);
      lastSentAt.current = performance.now();
    }
  }, [enabled, socket]);
  const move = useCallback(
    (dx: number, dy: number) => {
      const wasStopped = !vector.current.dx && !vector.current.dy;
      vector.current = { dx, dy };
      if (
        wasStopped ||
        (!dx && !dy) ||
        performance.now() - lastSentAt.current >= 40
      )
        send();
    },
    [send],
  );
  useEffect(() => {
    vector.current = { dx: 0, dy: 0 };
    lastSentAt.current = -Infinity;
    const stop = () => {
      vector.current = { dx: 0, dy: 0 };
      if (socket.connected) socket.volatile.emit("phone:input", vector.current);
    };
    const hidden = () => {
      if (document.hidden) stop();
    };
    window.addEventListener("blur", stop);
    document.addEventListener("visibilitychange", hidden);
    socket.on("disconnect", stop);
    const timer = setInterval(() => {
      if (vector.current.dx || vector.current.dy) send();
    }, 50);
    return () => {
      stop();
      clearInterval(timer);
      window.removeEventListener("blur", stop);
      document.removeEventListener("visibilitychange", hidden);
      socket.off("disconnect", stop);
    };
  }, [socket, send, mode]);
  return move;
}
