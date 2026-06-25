// server/src/index.ts
import express from 'express';
import { readdirSync } from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Server } from 'socket.io';
import { Room } from './room.js';
import type { ClientToServerEvents, Language, ServerToClientEvents } from './types.js';
import { ALL_LABEL, CATEGORIES, CUSTOM_LABEL } from './words.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT ?? 3001);

// Security limits ------------------------------------------------------------
const MAX_ROOMS = 5_000; // hard cap on live rooms (memory-exhaustion guard)
const MAX_CONNECTIONS = 20_000;
// Per-socket token bucket: refills 20 tokens/sec up to a 40 burst. Cheap events
// cost 1; expensive ones (room create/join) cost more — this throttles spam and
// the keystroke-driven `guess:typing` broadcast amplification without harming
// normal play.
const BUCKET_CAPACITY = 40;
const BUCKET_REFILL_PER_SEC = 20;

const app = express();
app.disable('x-powered-by');
const httpServer = createServer(app);

// CORS: lock to an allowlist in production via CORS_ORIGIN (comma-separated);
// reflect any origin only in dev. No cookies are used, so this is defense in depth.
const corsOrigin = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((s) => s.trim())
  : true;

const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: { origin: corsOrigin },
  maxHttpBufferSize: 1e5, // 100KB cap on any single message (anti-flood)
  connectTimeout: 10_000,
});

// ── Profile pictures ────────────────────────────────────────────────────────
// Drop your PNGs into server/avatars/ — the client's 🎲 button picks from here.
const avatarsDir = path.resolve(__dirname, '../avatars');
app.use('/avatars', express.static(avatarsDir, { maxAge: '1h', dotfiles: 'ignore' }));

// Cache the directory listing so we don't do a synchronous FS read on every
// request (that would let a flood of /api/avatars calls stall the event loop).
let avatarCache: { at: number; files: string[] } = { at: 0, files: [] };
function listAvatars(): string[] {
  const now = Date.now();
  if (now - avatarCache.at > 30_000) {
    try {
      avatarCache = {
        at: now,
        files: readdirSync(avatarsDir).filter((f) => /^[\w-]+\.(png|webp|jpg|jpeg)$/i.test(f)),
      };
    } catch {
      avatarCache = { at: now, files: [] };
    }
  }
  return avatarCache.files;
}
app.get('/api/avatars', (_req, res) => res.json({ avatars: listAvatars() }));

// Category list for the host's picker, localized.
app.get('/api/categories', (req, res) => {
  const lang: Language = req.query.lang === 'es' ? 'es' : 'en';
  res.json({
    categories: [
      { id: 'all', label: ALL_LABEL[lang] },
      ...CATEGORIES.map((c) => ({ id: c.id, label: c.label[lang] })),
      { id: 'custom', label: CUSTOM_LABEL[lang] },
    ],
  });
});

app.get('/health', (_req, res) => res.json({ ok: true, rooms: rooms.size }));

// Production: serve the built client.
const clientDist = path.resolve(__dirname, '../../client/dist');
app.use(express.static(clientDist));
app.get(/^\/(?!socket\.io|api|avatars).*/, (_req, res) =>
  res.sendFile(path.join(clientDist, 'index.html'), (err) => {
    if (err) res.status(200).send('Impostor server running. Build the client or run the Vite dev server.');
  }),
);

// ── Room registry ───────────────────────────────────────────────────────────

const rooms = new Map<string, Room>();
const socketRoom = new Map<string, string>();

const CODE_WORDS = [
  'TIGER', 'MOON', 'NEON', 'VELVET', 'MANGO', 'COMET', 'PIXEL', 'LUNA',
  'SALSA', 'NOVA', 'TANGO', 'CORAL', 'DISCO', 'FROST', 'OPAL', 'ZEBRA',
];
function newCode(): string {
  let code: string;
  do {
    const a = CODE_WORDS[Math.floor(Math.random() * CODE_WORDS.length)];
    const b = CODE_WORDS[Math.floor(Math.random() * CODE_WORDS.length)];
    code = `${a}-${b}-${Math.floor(Math.random() * 90 + 10)}`;
  } while (rooms.has(code));
  return code;
}

function makeRoom(language: Language): Room {
  const code = newCode();
  const room = new Room(
    code,
    language,
    (r) => io.to(r.code).emit('room:state', r.snapshot()),
    (socketId, assignment) => io.to(socketId).emit('word:assign', assignment),
    (socketId, kind, message) => io.to(socketId).emit('toast', { kind, message }),
  );
  rooms.set(code, room);
  return room;
}

setInterval(() => {
  const now = Date.now();
  for (const [code, room] of rooms) {
    if (room.emptySince !== null && now - room.emptySince > 60_000) {
      room.destroy();
      rooms.delete(code);
    }
  }
}, 30_000);

// ── Rate limiting ─────────────────────────────────────────────────────────
const buckets = new Map<string, { tokens: number; last: number }>();
function allow(socketId: string, cost: number): boolean {
  const now = Date.now();
  let b = buckets.get(socketId);
  if (!b) {
    b = { tokens: BUCKET_CAPACITY, last: now };
    buckets.set(socketId, b);
  }
  b.tokens = Math.min(BUCKET_CAPACITY, b.tokens + ((now - b.last) / 1000) * BUCKET_REFILL_PER_SEC);
  b.last = now;
  if (b.tokens < cost) return false;
  b.tokens -= cost;
  return true;
}

/** Coerce an unknown socket payload to a plain object so destructuring a
 *  malformed/missing payload can never throw and crash a handler. */
function obj(p: unknown): Record<string, unknown> {
  return p && typeof p === 'object' ? (p as Record<string, unknown>) : {};
}

// ── Socket wiring ───────────────────────────────────────────────────────────

io.on('connection', (socket) => {
  if (io.engine.clientsCount > MAX_CONNECTIONS) {
    socket.disconnect(true);
    return;
  }

  const inRoom = (): Room | null => {
    const code = socketRoom.get(socket.id);
    return code ? rooms.get(code) ?? null : null;
  };

  /** Wrap a handler with rate limiting + payload safety. Over-budget events are
   *  silently dropped (a spammer simply gets throttled). */
  const on = (event: string, cost: number, handler: (p: Record<string, unknown>, ack?: unknown) => void) => {
    socket.on(event as keyof ClientToServerEvents, ((payload: unknown, ack: unknown) => {
      if (!allow(socket.id, cost)) return;
      try {
        handler(obj(payload), ack);
      } catch (err) {
        console.error(`handler error on ${event}:`, err);
      }
    }) as never);
  };

  on('room:create', 10, (p, ack) => {
    if (typeof ack !== 'function') return;
    if (inRoom()) return (ack as ((r: unknown) => void))({ ok: false, error: 'Already at a table. / Ya estás en una mesa.' });
    if (rooms.size >= MAX_ROOMS)
      return (ack as ((r: unknown) => void))({ ok: false, error: 'Server is at capacity, try again soon. / El servidor está lleno, intenta pronto.' });
    const room = makeRoom(p.language === 'es' ? 'es' : 'en');
    const res = room.addPlayer(socket.id, String(p.name ?? ''), typeof p.avatar === 'string' ? p.avatar : null);
    if (!res.ok) {
      rooms.delete(room.code);
      return (ack as ((r: unknown) => void))(res);
    }
    socket.join(room.code);
    socketRoom.set(socket.id, room.code);
    (ack as ((r: unknown) => void))({ ok: true, code: room.code, selfId: res.id });
    io.to(room.code).emit('room:state', room.snapshot());
  });

  on('room:join', 5, (p, ack) => {
    if (typeof ack !== 'function') return;
    if (inRoom()) return (ack as ((r: unknown) => void))({ ok: false, error: 'Already at a table. / Ya estás en una mesa.' });
    const room = rooms.get(String(p.code ?? '').trim().toUpperCase().slice(0, 24));
    if (!room) return (ack as ((r: unknown) => void))({ ok: false, error: 'No table found with that code. / No existe una mesa con ese código.' });
    const res = room.addPlayer(socket.id, String(p.name ?? ''), typeof p.avatar === 'string' ? p.avatar : null);
    if (!res.ok) return (ack as ((r: unknown) => void))(res);
    socket.join(room.code);
    socketRoom.set(socket.id, room.code);
    (ack as ((r: unknown) => void))({ ok: true, code: room.code, selfId: res.id });
    io.to(room.code).emit('room:state', room.snapshot());
  });

  on('room:settings', 2, (p) =>
    inRoom()?.updateSettings(socket.id, {
      clueEnabled: typeof p.clueEnabled === 'boolean' ? p.clueEnabled : undefined,
      category: typeof p.category === 'string' ? p.category.slice(0, 32) : undefined,
      customWords: Array.isArray(p.customWords) ? (p.customWords as unknown[]) : undefined,
      clueSeconds: typeof p.clueSeconds === 'number' ? p.clueSeconds : undefined,
      lastChance: typeof p.lastChance === 'boolean' ? p.lastChance : undefined,
    }),
  );
  on('player:ready', 1, (p) => inRoom()?.setReady(socket.id, !!p.ready));
  on('game:start', 3, () => inRoom()?.start(socket.id));
  on('clue:submit', 2, (p) => inRoom()?.submitClue(socket.id, String(p.text ?? '')));
  on('vote:cast', 2, (p) => inRoom()?.castVote(socket.id, String(p.targetId ?? '')));
  on('guess:typing', 1, (p) => inRoom()?.typeGuess(socket.id, String(p.text ?? '')));
  on('guess:submit', 2, (p) => inRoom()?.submitGuess(socket.id, String(p.text ?? '')));
  on('game:continue', 3, () => inRoom()?.continueToLobby(socket.id));

  const leave = () => {
    const room = inRoom();
    if (!room) return;
    socket.leave(room.code);
    socketRoom.delete(socket.id);
    room.removePlayer(socket.id);
  };
  socket.on('room:leave', () => {
    if (!allow(socket.id, 1)) return;
    leave();
  });
  socket.on('disconnect', () => {
    leave();
    buckets.delete(socket.id);
  });
});

httpServer.listen(PORT, () => {
  console.log(`🕵️ Impostor server listening on http://localhost:${PORT}`);
});
