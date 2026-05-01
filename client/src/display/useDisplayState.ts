import { useEffect, useState } from 'react';
import type { DisplaySnapshot } from '@polararena/shared';
import type { AppSocket } from '../socket.js';

export function useDisplayState(socket: AppSocket): DisplaySnapshot | null {
  const [snap, setSnap] = useState<DisplaySnapshot | null>(null);
  useEffect(() => {
    const handler = (s: DisplaySnapshot) => setSnap(s);
    socket.on('display:state', handler);
    return () => { socket.off('display:state', handler); };
  }, [socket]);
  return snap;
}
