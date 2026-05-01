import type { AttackKind, DisplaySnapshot, PhoneSnapshot, Role } from './state.js';

export interface ClientToServerEvents {
  'display:create_room': (cb: (res: { roomCode: string }) => void) => void;
  'display:join_room': (
    args: { roomCode: string },
    cb: (res: { ok: boolean; error?: string }) => void
  ) => void;
  'display:end_room': (cb: (res: { newRoomCode: string }) => void) => void;
  'client:restart_room': (cb?: (res: { ok: boolean; newRoomCode?: string; error?: string }) => void) => void;
  'phone:join': (
    args: { roomCode: string; sessionId?: string },
    cb: (res: { ok: true; role: Role | null; sessionId: string } | { ok: false; error: string }) => void
  ) => void;
  'phone:leave': (cb?: (res: { ok: boolean }) => void) => void;
  'phone:claim_role': (
    args: { role: Role | null },
    cb?: (res: { ok: boolean; role: Role | null; error?: string }) => void
  ) => void;
  'phone:input': (args: { dx: number; dy: number }) => void;
  'phone:button': () => void;
  'phone:select': (args: { index: number; on: boolean }) => void;
  'phone:quadrant': (args: { index: number }) => void;
  'phone:select_attack': (args: { kind: AttackKind | null }) => void;
  'phone:fire': (args: { kind: AttackKind }) => void;
  'phone:repair': (args: { quadrant: number }) => void;
  'client:request_start': () => void;
}

export interface ServerToClientEvents {
  'display:state': (snapshot: DisplaySnapshot) => void;
  'phone:state': (snapshot: PhoneSnapshot) => void;
  'room:ended': () => void;
  'display:room_restarted': (args: { newRoomCode: string }) => void;
}
