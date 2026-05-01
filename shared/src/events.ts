import type { DisplaySnapshot, PhoneSnapshot, Role } from './state.js';

export interface ClientToServerEvents {
  'display:create_room': (cb: (res: { roomCode: string }) => void) => void;
  'display:join_room': (
    args: { roomCode: string },
    cb: (res: { ok: boolean; error?: string }) => void
  ) => void;
  'phone:join': (
    args: { roomCode: string; sessionId?: string },
    cb: (res: { ok: true; role: Role; sessionId: string } | { ok: false; error: string }) => void
  ) => void;
  'phone:input': (args: { dx: number; dy: number }) => void;
  'phone:button': () => void;
}

export interface ServerToClientEvents {
  'display:state': (snapshot: DisplaySnapshot) => void;
  'phone:state': (snapshot: PhoneSnapshot) => void;
}
