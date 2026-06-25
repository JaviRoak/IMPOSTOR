// ── NEW FILE: client/src/demo/DemoMode.tsx ─────────────────────────────────
// Dev-only UI preview: renders every major screen with mock data through the
// REAL components (HomeScreen / LobbyScreen / GameScreen — which itself
// routes to WordReveal, ClueBoard, vote panel, final guess, ResultsScreen).
// No backend required. Activated via http://localhost:5173/?demo in dev.

import { useState } from 'react';
import GameScreen from '../components/GameScreen';
import HomeScreen from '../components/HomeScreen';
import LobbyScreen from '../components/LobbyScreen';
import { useT } from '../i18n';
import {
  buildState,
  CITIZEN_WORD,
  IMPOSTOR_WORD,
  SELF_ID,
  type DemoScreen,
} from './mockData';

const SCREENS: { id: DemoScreen; label: string }[] = [
  { id: 'home', label: '🏠 Home' },
  { id: 'lobby', label: '🪑 Lobby' },
  { id: 'reveal', label: '✉️ Reveal' },
  { id: 'revealImpostor', label: '🤫 Reveal (Impostor)' },
  { id: 'clue', label: '💬 Clues' },
  { id: 'vote', label: '🪧 Voting' },
  { id: 'finalGuess', label: '🎯 Final guess' },
  { id: 'results', label: '🏆 Results' },
  { id: 'resultsImpostor', label: '🕵️ Results (steal)' },
];

const noop = () => undefined;

export default function DemoMode() {
  const [screen, setScreen] = useState<DemoScreen>('home');
  const [minimized, setMinimized] = useState(false);
  const { lang } = useT(); // re-render the mock screens when language flips on Home

  // Rebuilt on every render of a new selection → timers restart fresh.
  const room = buildState(screen);
  const word = screen === 'revealImpostor' ? IMPOSTOR_WORD : CITIZEN_WORD;

  return (
    <div className="min-h-full pb-24" key={`${screen}-${lang}`}>
      {screen === 'home' ? (
        <HomeScreen onJoined={noop} />
      ) : screen === 'lobby' ? (
        <LobbyScreen room={room} selfId={SELF_ID} onLeave={noop} />
      ) : (
        <GameScreen room={room} selfId={SELF_ID} word={word} onLeave={noop} />
      )}

      {/* Screen selector — fixed, above everything, collapsible */}
      <nav
        className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-base/90 px-3 py-2 backdrop-blur-md"
        aria-label="Demo screen selector"
      >
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-center gap-1.5">
          <button
            className="chip border border-amber/50 bg-amber/15 text-xs font-bold text-amber"
            onClick={() => setMinimized((m) => !m)}
            title="UI preview mode — no backend connected"
          >
            🧪 DEMO {minimized ? '▴' : '▾'}
          </button>
          {!minimized &&
            SCREENS.map((s) => (
              <button
                key={s.id}
                onClick={() => setScreen(s.id)}
                aria-pressed={screen === s.id}
                className={`chip border text-xs transition-colors ${
                  screen === s.id
                    ? 'border-violet bg-violet/25 text-ink'
                    : 'border-white/10 bg-white/[0.05] text-muted hover:bg-white/[0.12]'
                }`}
              >
                {s.label}
              </button>
            ))}
        </div>
      </nav>
    </div>
  );
}
