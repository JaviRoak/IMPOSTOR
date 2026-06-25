// ── CHANGED FILE: client/src/socket.ts ──────────────────────────────────────
// Added: in demo mode the socket never connects (no backend needed, no
// reconnect noise in the console). Real multiplayer behavior is unchanged.
import { io, type Socket } from 'socket.io-client';
import { IS_DEMO } from './demoFlag';
import type { ClientToServerEvents, ServerToClientEvents } from './types';

// Same-origin in production; the Vite dev server proxies /socket.io to :3001.
export const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io({
  autoConnect: !IS_DEMO,
  transports: ['websocket', 'polling'],
});
