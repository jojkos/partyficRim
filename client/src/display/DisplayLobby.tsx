import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import type { AppSocket } from '../socket.js';

interface Props {
  socket: AppSocket;
  onRoomCreated: (code: string) => void;
}

export function DisplayLobby({ socket, onRoomCreated }: Props) {
  const [code, setCode] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    const onConnect = () => {
      socket.emit('display:create_room', ({ roomCode }) => {
        setCode(roomCode);
        onRoomCreated(roomCode);
        const joinUrl = `${window.location.origin}/play?room=${roomCode}`;
        QRCode.toDataURL(joinUrl, { width: 320, margin: 1 }).then(setQrDataUrl);
      });
    };
    if (socket.connected) onConnect();
    else socket.once('connect', onConnect);
    return () => { socket.off('connect', onConnect); };
  }, [socket, onRoomCreated]);

  if (!code) return <div style={{ padding: 24 }}>Connecting…</div>;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      gap: 64, height: '100vh', flexDirection: 'column',
    }}>
      <h1 style={{ fontSize: 96, margin: 0, letterSpacing: 16 }}>{code}</h1>
      {qrDataUrl && <img src={qrDataUrl} alt="join QR" width={320} height={320} />}
      <div style={{ fontSize: 24, opacity: 0.7 }}>
        Or visit <code>{window.location.host}/play</code>
      </div>
    </div>
  );
}
