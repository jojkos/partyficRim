import type { Role } from '@polararena/shared';

const ROLE_COLOR: Record<Role, string> = { X: '#ff5577', Y: '#55c2ff' };

export function PhoneLobby({ role, roomCode }: { role: Role; roomCode: string }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      height: '100vh', gap: 24, padding: 24, textAlign: 'center',
    }}>
      <div style={{ fontSize: 18, opacity: 0.7 }}>Room {roomCode}</div>
      <div style={{ fontSize: 36 }}>You are</div>
      <div style={{
        fontSize: 96, fontWeight: 800, color: ROLE_COLOR[role],
      }}>{role}-axis</div>
      <div style={{ fontSize: 18, opacity: 0.7 }}>Waiting for the other player…</div>
    </div>
  );
}
