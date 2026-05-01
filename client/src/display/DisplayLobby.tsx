import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import type { DisplaySnapshot } from '@polararena/shared';
import type { AppSocket } from '../socket.js';

interface Props {
  socket: AppSocket;
  roomCode: string | null;
  snap: DisplaySnapshot | null;
}

export function DisplayLobby({ socket, roomCode, snap }: Props) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!roomCode) return;
    const joinUrl = `${window.location.origin}/play?room=${roomCode}`;
    QRCode.toDataURL(joinUrl, { width: 320, margin: 1 }).then(setQrDataUrl);
  }, [roomCode]);

  const playerCount = snap?.players.length ?? 0;
  const countdown = snap?.phase === 'countdown'
    ? Math.ceil(snap.countdownMsRemaining / 1000) : null;
  const canStart = playerCount === 2 && snap?.phase === 'lobby';

  const onStart = () => socket.emit('client:request_start');

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      gap: 28, height: '100vh', flexDirection: 'column', padding: 24,
    }}>
      {countdown !== null ? (
        <div style={{ fontSize: 200, fontWeight: 800 }}>{countdown}</div>
      ) : (
        <>
          <h1 style={{ fontSize: 96, margin: 0, letterSpacing: 16 }}>{roomCode ?? '—'}</h1>
          {qrDataUrl && <img src={qrDataUrl} alt="join QR" width={320} height={320} />}
          <div style={{ fontSize: 22, opacity: 0.7 }}>
            Or visit <code>{window.location.host}/play</code>
          </div>
          <div style={{ fontSize: 26 }}>Players ({playerCount}/2)</div>
          <button
            onClick={onStart}
            disabled={!canStart}
            style={{
              marginTop: 12,
              padding: '20px 48px',
              fontSize: 36,
              fontWeight: 800,
              letterSpacing: 4,
              borderRadius: 16,
              border: 'none',
              background: canStart ? '#88ddaa' : '#333',
              color: canStart ? '#0a0a12' : '#666',
              cursor: canStart ? 'pointer' : 'not-allowed',
            }}
          >
            START
          </button>
          <div style={{ fontSize: 14, opacity: 0.5 }}>
            {canStart ? 'Anyone can press start (display or phone)' : 'Waiting for both players to join…'}
          </div>
        </>
      )}
    </div>
  );
}
