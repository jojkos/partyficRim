import { io, type Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '@partyficrim/shared';

export type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

// Singleton socket per browser tab. Returning the same socket across React
// StrictMode double-mounts (and across route changes) prevents two server-side
// player records from being created from one browser.
let cached: AppSocket | null = null;

export function createSocket(): AppSocket {
  if (cached && cached.connected) return cached;
  if (cached) return cached; // reconnecting — reuse instance
  cached = io({ autoConnect: true });
  return cached;
}
