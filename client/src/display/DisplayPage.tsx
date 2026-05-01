import { useEffect, useMemo, useRef, useState } from 'react';
import { createSocket } from '../socket.js';
import { DisplayLobby } from './DisplayLobby.js';
import { useDisplayState } from './useDisplayState.js';
import { PixiArena } from './PixiArena.js';
import { HudOverlay } from './HudOverlay.js';

const STORAGE_KEY = 'polararena.displayRoomCode';

export function DisplayPage() {
  const socket = useMemo(() => createSocket(), []);
  const snap = useDisplayState(socket);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const requestedRef = useRef(false);

  useEffect(() => {
    if (requestedRef.current) return;
    requestedRef.current = true;

    const ensureRoom = () => {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        socket.emit('display:join_room', { roomCode: stored }, (res) => {
          if (res.ok) {
            setRoomCode(stored);
            return;
          }
          // stored code is stale (server restart, etc.); create a new one
          createNew();
        });
      } else {
        createNew();
      }
    };

    const createNew = () => {
      socket.emit('display:create_room', ({ roomCode: code }) => {
        localStorage.setItem(STORAGE_KEY, code);
        setRoomCode(code);
      });
    };

    if (socket.connected) ensureRoom();
    else socket.once('connect', ensureRoom);
  }, [socket]);

  const onResetRoom = () => {
    localStorage.removeItem(STORAGE_KEY);
    window.location.reload();
  };

  if (!snap || snap.phase === 'lobby' || snap.phase === 'countdown') {
    return <DisplayLobby socket={socket} roomCode={roomCode} snap={snap} onResetRoom={onResetRoom} />;
  }
  return (
    <>
      <PixiArena snap={snap} />
      <HudOverlay snap={snap} />
    </>
  );
}
