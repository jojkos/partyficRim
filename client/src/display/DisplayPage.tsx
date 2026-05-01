import { useEffect, useMemo, useRef, useState } from 'react';
import { createSocket } from '../socket.js';
import { DisplayLobby } from './DisplayLobby.js';
import { useDisplayState } from './useDisplayState.js';
import { PixiArena } from './PixiArena.js';
import { HudOverlay } from './HudOverlay.js';

const STORAGE_KEY = 'partyficrim.displayRoomCode';

export function DisplayPage() {
  const socket = useMemo(() => createSocket(), []);
  const snap = useDisplayState(socket);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const requestedRef = useRef(false);

  // Disconnect socket on unmount. In StrictMode dev, this runs after the first
  // mount's cleanup, killing the orphan socket from the first useMemo factory
  // call so we don't accumulate connections.
  useEffect(() => {
    return () => {
      console.log('[display] disconnecting socket', socket.id);
      socket.disconnect();
    };
  }, [socket]);

  useEffect(() => {
    if (requestedRef.current) return;
    requestedRef.current = true;

    const params = new URLSearchParams(window.location.search);
    const forceNew = params.get('new') === '1';
    if (forceNew) {
      window.history.replaceState({}, '', '/display');
      localStorage.removeItem(STORAGE_KEY);
    }

    const createNew = () => {
      socket.emit('display:create_room', ({ roomCode: code }) => {
        console.log('[display] created new room', code);
        localStorage.setItem(STORAGE_KEY, code);
        setRoomCode(code);
      });
    };

    const ensureRoom = () => {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && !forceNew) {
        socket.emit('display:join_room', { roomCode: stored }, (res) => {
          if (res.ok) {
            console.log('[display] resumed stored room', stored);
            setRoomCode(stored);
            return;
          }
          console.log('[display] stored room gone, creating new');
          createNew();
        });
      } else {
        createNew();
      }
    };

    if (socket.connected) ensureRoom();
    else socket.once('connect', ensureRoom);
  }, [socket]);

  const onResetRoom = () => {
    console.log('[display] end_room requested');
    socket.emit('display:end_room', ({ newRoomCode }) => {
      console.log('[display] end_room replaced ->', newRoomCode);
      localStorage.setItem(STORAGE_KEY, newRoomCode);
      setRoomCode(newRoomCode);
    });
  };

  if (!snap || snap.phase === 'lobby' || snap.phase === 'countdown') {
    return <DisplayLobby socket={socket} roomCode={roomCode} snap={snap} onResetRoom={onResetRoom} />;
  }
  return (
    <>
      <PixiArena snap={snap} />
      <HudOverlay snap={snap} onResetRoom={onResetRoom} />
    </>
  );
}
