import { useMemo, useState } from 'react';
import { createSocket } from '../socket.js';
import { DisplayLobby } from './DisplayLobby.js';

export function DisplayPage() {
  const socket = useMemo(() => createSocket(), []);
  const [, setRoomCode] = useState<string | null>(null);
  return <DisplayLobby socket={socket} onRoomCreated={setRoomCode} />;
}
