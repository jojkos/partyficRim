import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import type { DisplaySnapshot } from '@polararena/shared';
import type { AppSocket } from '../socket.js';

interface Props {
  socket: AppSocket;
  snap: DisplaySnapshot | null;
}

export function DisplayLobby({ socket, snap }: Props) {
  const [code, setCode] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    const ensureRoom = () => {
      if (code) return;
      socket.emit('display:create_room', ({ roomCode }) => {
        setCode(roomCode);
        const joinUrl = `${window.location.origin}/play?room=${roomCode}`;
        QRCode.toDataURL(joinUrl, { width: 320, margin: 1 }).then(setQrDataUrl);
      });
    };
    if (socket.connected) ensureRoom();
    else socket.once('connect', ensureRoom);
  }, [socket, code]);

  const playerCount = snap?.players.length ?? 0;
  const countdown = snap?.phase === 'countdown'
    ? Math.ceil(snap.countdownMsRemaining / 1000) : null;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      gap: 32, height: '100vh', flexDirection: 'column',
    }}>
      {countdown !== null ? (
        <div style={{ fontSize: 200, fontWeight: 800 }}>{countdown}</div>
      ) : (
        <>
          <h1 style={{ fontSize: 96, margin: 0, letterSpacing: 16 }}>{code ?? '—'}</h1>
          {qrDataUrl && <img src={qrDataUrl} alt="join QR" width={320} height={320} />}
          <div style={{ fontSize: 24, opacity: 0.7 }}>
            Or visit <code>{window.location.host}/play</code>
          </div>
          <div style={{ fontSize: 28 }}>Waiting for players ({playerCount}/2)</div>
        </>
      )}
    </div>
  );
}
