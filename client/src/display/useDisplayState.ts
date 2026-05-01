import { useEffect, useRef, useState } from 'react';
import type { DisplaySnapshot } from '@polararena/shared';
import type { AppSocket } from '../socket.js';

export function useDisplayState(socket: AppSocket): DisplaySnapshot | null {
  const [snap, setSnap] = useState<DisplaySnapshot | null>(null);
  const lastKey = useRef<string>('');

  useEffect(() => {
    const handler = (s: DisplaySnapshot) => {
      const key = `${s.roomCode}:${s.phase}`;
      if (key !== lastKey.current) {
        console.log(`[display] snapshot ${lastKey.current || '(none)'} -> ${key}`);
        lastKey.current = key;
      }
      setSnap(s);
    };
    socket.on('display:state', handler);
    return () => { socket.off('display:state', handler); };
  }, [socket]);

  return snap;
}
