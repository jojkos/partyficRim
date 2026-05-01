import type { Role } from '@polararena/shared';
import { useLandscape } from './useLandscape.js';

const ROLE_COLOR: Record<Role, string> = { X: '#ff5577', Y: '#55c2ff' };

export function PhoneLobby({ role, roomCode }: { role: Role; roomCode: string }) {
  const { enterFullscreenLandscape } = useLandscape();
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      height: '100vh', gap: 24, padding: 24, textAlign: 'center',
    }}>
      <div style={{ fontSize: 18, opacity: 0.7 }}>Room {roomCode}</div>
      <div style={{ fontSize: 36 }}>You are</div>
      <div style={{ fontSize: 96, fontWeight: 800, color: ROLE_COLOR[role] }}>{role}-axis</div>
      <button onClick={enterFullscreenLandscape} style={{
        padding: '16px 32px', fontSize: 24, borderRadius: 12, border: 'none',
        background: ROLE_COLOR[role], color: '#fff', fontWeight: 700,
      }}>
        Tap to enter fullscreen
      </button>
      <div style={{ fontSize: 16, opacity: 0.6 }}>Hold phone in landscape · waiting for other player…</div>
    </div>
  );
}
