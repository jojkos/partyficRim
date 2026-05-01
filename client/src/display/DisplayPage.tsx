import { useEffect, useMemo, useRef, useState } from 'react';
import { createSocket } from '../socket.js';
import { DisplayLobby } from './DisplayLobby.js';
import { useDisplayState } from './useDisplayState.js';
import { PixiArena } from './PixiArena.js';
import { HudOverlay } from './HudOverlay.js';

export function DisplayPage() {
  const socket = useMemo(() => createSocket(), []);
  const snap = useDisplayState(socket);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const requestedRef = useRef(false);

  useEffect(() => {
    if (requestedRef.current) return;
    requestedRef.current = true;

    const ensureRoom = () => {
      socket.emit('display:create_room', ({ roomCode: code }) => {
        setRoomCode(code);
      });
    };
    if (socket.connected) ensureRoom();
    else socket.once('connect', ensureRoom);
  }, [socket]);

  if (!snap || snap.phase === 'lobby' || snap.phase === 'countdown') {
    return <DisplayLobby socket={socket} roomCode={roomCode} snap={snap} />;
  }
  return (
    <>
      <PixiArena snap={snap} />
      <HudOverlay snap={snap} />
    </>
  );
}
