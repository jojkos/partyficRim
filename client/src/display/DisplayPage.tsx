import { useMemo } from 'react';
import { createSocket } from '../socket.js';
import { DisplayLobby } from './DisplayLobby.js';
import { useDisplayState } from './useDisplayState.js';
import { PixiArena } from './PixiArena.js';

export function DisplayPage() {
  const socket = useMemo(() => createSocket(), []);
  const snap = useDisplayState(socket);

  if (!snap || snap.phase === 'lobby' || snap.phase === 'countdown') {
    return <DisplayLobby socket={socket} snap={snap} />;
  }
  return <PixiArena snap={snap} />;
}
