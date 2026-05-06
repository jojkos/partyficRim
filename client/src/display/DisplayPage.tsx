import { useEffect, useMemo, useRef, useState } from 'react';
import { createSocket } from '../socket.js';
import { DisplayLobby } from './DisplayLobby.js';
import { useDisplayState } from './useDisplayState.js';
import { PixiArena } from './PixiArena.js';
import { HudOverlay } from './HudOverlay.js';
import { HudBar } from './HudBar.js';
import { SvgArena } from './SvgArena.js';
import { EventFeed } from './EventFeed.js';

const STORAGE_KEY = 'partyficrim.displayRoomCode';

export function DisplayPage() {
  const socket = useMemo(() => createSocket(), []);
  const snap = useDisplayState(socket);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const requestedRef = useRef(false);
  const [elapsed, setElapsed] = useState(0);
  const playingRef = useRef(false);

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
        localStorage.setItem(STORAGE_KEY, code);
        setRoomCode(code);
      });
    };

    const ensureRoom = () => {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && !forceNew) {
        socket.emit('display:join_room', { roomCode: stored }, (res) => {
          if (res.ok) { setRoomCode(stored); return; }
          createNew();
        });
      } else {
        createNew();
      }
    };

    if (socket.connected) ensureRoom();
    else socket.once('connect', ensureRoom);
  }, [socket]);

  useEffect(() => {
    const onRestarted = ({ newRoomCode }: { newRoomCode: string }) => {
      socket.emit('display:join_room', { roomCode: newRoomCode }, (res) => {
        if (!res.ok) return;
        localStorage.setItem(STORAGE_KEY, newRoomCode);
        setRoomCode(newRoomCode);
      });
    };
    socket.on('display:room_restarted', onRestarted);
    return () => { socket.off('display:room_restarted', onRestarted); };
  }, [socket]);

  // survival timer: counts up while phase === 'playing'
  useEffect(() => {
    const isPlaying = snap?.phase === 'playing';
    if (isPlaying && !playingRef.current) {
      playingRef.current = true;
      setElapsed(0);
    }
    if (!isPlaying) playingRef.current = false;
  }, [snap?.phase]);

  useEffect(() => {
    if (snap?.phase !== 'playing') return;
    const id = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [snap?.phase]);

  const onResetRoom = () => {
    socket.emit('display:end_room', ({ newRoomCode }) => {
      localStorage.setItem(STORAGE_KEY, newRoomCode);
      setRoomCode(newRoomCode);
    });
  };

  const events = snap?.eventFeed ?? [];

  if (!snap || snap.phase === 'lobby' || snap.phase === 'countdown') {
    return (
      <>
        <DisplayLobby socket={socket} roomCode={roomCode} snap={snap} onResetRoom={onResetRoom} />
        <EventFeed events={events} />
      </>
    );
  }

  return (
    <div style={{
      position: 'fixed', inset: 0,
      display: 'flex', flexDirection: 'column',
      background: '#0a0b14',
    }}>
      <HudBar snap={snap} elapsed={elapsed} />
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <SvgArena snap={snap} />
        <PixiArena snap={snap} />
        <EventFeed events={events} />
        <HudOverlay onResetRoom={onResetRoom} phase={snap.phase} />
      </div>
    </div>
  );
}
