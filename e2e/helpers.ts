/**
 * Helpers for E2E tests: connect socket.io phone clients  
 * and interact with the game server programmatically.
 */
import { io, type Socket } from 'socket.io-client';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  Role,
} from '@partyficrim/shared';

type PhoneSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

const SERVER = 'http://localhost:3000';

/** Connect a raw socket.io client directly to the game server. */
export async function connectPhone(): Promise<PhoneSocket> {
  const socket = io(SERVER, { transports: ['websocket'], forceNew: true }) as PhoneSocket;
  await new Promise<void>((resolve, reject) => {
    socket.on('connect', resolve);
    socket.on('connect_error', reject);
  });
  return socket;
}

/** Join a room as a phone player. */
export async function phoneJoin(
  socket: PhoneSocket,
  roomCode: string,
): Promise<{ role: Role | null; sessionId: string }> {
  return new Promise((resolve, reject) => {
    socket.emit('phone:join', { roomCode }, (res) => {
      if (!res.ok) return reject(new Error(res.error));
      resolve({ role: res.role, sessionId: res.sessionId });
    });
  });
}

/** Claim a role for a phone player. */
export async function phoneClaim(socket: PhoneSocket, role: Role): Promise<void> {
  return new Promise((resolve, reject) => {
    socket.emit('phone:claim_role', { role }, (res) => {
      if (!res?.ok) return reject(new Error(res?.error ?? 'claim failed'));
      resolve();
    });
  });
}

/** Join a room and claim a role in one call. */
export async function phoneJoinAndClaim(
  socket: PhoneSocket,
  roomCode: string,
  role: Role,
): Promise<string> {
  const { sessionId } = await phoneJoin(socket, roomCode);
  await phoneClaim(socket, role);
  return sessionId;
}

/** Wait for a specific event once, with a timeout. */
export function waitForEvent<K extends keyof ServerToClientEvents>(
  socket: PhoneSocket,
  event: K,
  timeoutMs = 5000,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timed out waiting for ${String(event)}`)), timeoutMs);
    socket.once(event as string, () => {
      clearTimeout(timer);
      resolve();
    });
  });
}

/** Disconnect a phone socket. */
export function disconnectPhone(socket: PhoneSocket): void {
  socket.disconnect();
}
