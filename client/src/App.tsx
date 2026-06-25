// ── CHANGED FILE: client/src/App.tsx ────────────────────────────────────────
// Added: dev-only demo gate (?demo). Everything below the gate is unchanged —
// the real Socket.io multiplayer flow is untouched.
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { IS_DEMO } from './demoFlag';
import GameScreen from './components/GameScreen';
import HomeScreen from './components/HomeScreen';
import LobbyScreen from './components/LobbyScreen';
import { useRoomLanguage } from './i18n';
import { socket } from './socket';
import type { PublicRoomState, WordAssignment } from './types';

// Lazy + guarded by import.meta.env.DEV → the demo module is dead-code-
// eliminated from production builds entirely.
const DemoMode = import.meta.env.DEV ? lazy(() => import('./demo/DemoMode')) : null;

interface Toast {
  id: number;
  kind: 'error' | 'info';
  message: string;
}

export default function App() {
  // Dev-only UI preview: http://localhost:5173/?demo — mock data, no backend.
  if (IS_DEMO && DemoMode) {
    return (
      <Suspense fallback={null}>
        <DemoMode />
      </Suspense>
    );
  }
  return <MultiplayerApp />;
}

function MultiplayerApp() {
  const [room, setRoom] = useState<PublicRoomState | null>(null);
  const [selfId, setSelfId] = useState<string | null>(null);
  const [word, setWord] = useState<WordAssignment | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // While in a room, render the whole UI in the room's language so it always
  // matches the server's localized messages (fixes mixed EN/ES screens).
  useRoomLanguage(room ? room.settings.language : null);
  const toastId = useRef(0);

  useEffect(() => {
    const onState = (state: PublicRoomState) => {
      setRoom(state);
      if (state.phase === 'lobby') setWord(null);
    };
    const onWord = (w: WordAssignment) => setWord(w);
    const onToast = (t: { kind: 'error' | 'info'; message: string }) => {
      const id = ++toastId.current;
      setToasts((ts) => [...ts, { id, ...t }]);
      setTimeout(() => setToasts((ts) => ts.filter((x) => x.id !== id)), 3500);
    };
    const onClosed = () => {
      setRoom(null);
      setSelfId(null);
      setWord(null);
    };
    socket.on('room:state', onState);
    socket.on('word:assign', onWord);
    socket.on('toast', onToast);
    socket.on('room:closed', onClosed);
    socket.on('disconnect', onClosed);
    return () => {
      socket.off('room:state', onState);
      socket.off('word:assign', onWord);
      socket.off('toast', onToast);
      socket.off('room:closed', onClosed);
      socket.off('disconnect', onClosed);
    };
  }, []);

  const leave = () => {
    socket.emit('room:leave');
    setRoom(null);
    setSelfId(null);
    setWord(null);
  };

  const inGame = room && selfId && room.players.some((p) => p.id === selfId);

  return (
    <div className="min-h-full">
      {!inGame ? (
        <HomeScreen onJoined={(id) => setSelfId(id)} />
      ) : room.phase === 'lobby' ? (
        <LobbyScreen room={room} selfId={selfId} onLeave={leave} />
      ) : (
        <GameScreen room={room} selfId={selfId} word={word} onLeave={leave} />
      )}

      <div className="pointer-events-none fixed inset-x-0 top-4 z-50 flex flex-col items-center gap-2 px-4">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`animate-rise rounded-chip px-4 py-2 text-sm font-medium shadow-card backdrop-blur-md ${
              t.kind === 'error' ? 'bg-danger/20 text-danger border border-danger/40' : 'bg-sky/15 text-sky border border-sky/30'
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </div>
  );
}
