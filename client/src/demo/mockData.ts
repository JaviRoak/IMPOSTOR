// ── NEW FILE: client/src/demo/mockData.ts ──────────────────────────────────
// Mock fixtures for the dev-only UI preview. Builds PublicRoomState objects
// shaped exactly like real server snapshots, so the production components
// render them unmodified. Never imported in production builds.

import type { PlayerState, PublicRoomState, RoundResult, WordAssignment } from '../types';

export const SELF_ID = 'p1';

const player = (
  id: string,
  name: string,
  emoji: string,
  color: string,
  extra: Partial<PlayerState> = {},
): PlayerState => ({
  id,
  name,
  emoji,
  avatar: null, // emoji fallback — no backend needed to serve /avatars
  color,
  isHost: id === 'p1',
  ready: false,
  alive: true,
  connected: true,
  score: 0,
  ...extra,
});

/** The mock table: 4 players, you are Maya (host). */
export const PLAYERS: PlayerState[] = [
  player('p1', 'Maya', '🦩', '#7C5CFF', { ready: true, score: 225 }),
  player('p2', 'Ravi', '🦊', '#FF5CA8', { ready: true, score: 400 }),
  player('p3', 'Zoe', '🐙', '#FFB85C', { ready: true, score: 100 }),
  player('p4', 'Kai', '🦉', '#3DDC97', { ready: false, score: 125 }),
];

const CLUES = [
  { playerId: 'p2', text: 'foam', round: 1 },
  { playerId: 'p3', text: 'morning', round: 1 },
  { playerId: 'p4', text: 'italian', round: 1 },
  { playerId: 'p1', text: 'breakfast', round: 1 },
];

const base = (): PublicRoomState => ({
  code: 'TIGER-MOON-42',
  phase: 'lobby',
  matchNumber: 1,
  clueRound: 1,
  categoryLabel: 'Food',
  settings: { language: 'en', clueEnabled: true, category: 'food', customWordsCount: 0, clueSeconds: 25, lastChance: true },
  players: PLAYERS.map((p) => ({ ...p })),
  hostId: 'p1',
  turnOrder: ['p2', 'p3', 'p4', 'p1'],
  currentTurnId: null,
  clues: [],
  votedIds: [],
  accusedId: null,
  liveGuess: '',
  result: null,
  phaseEndsAt: null,
  minPlayers: 3,
  maxPlayers: 12,
});

const RESULT_CITIZENS: RoundResult = {
  winner: 'citizens',
  impostorId: 'p2',
  mainWord: 'Cappuccino',
  impostorClue: 'Latte',
  ejectedId: 'p2',
  finalGuess: 'espresso',
  guessCorrect: false,
  voteCounts: { p2: 3, p3: 1 },
  reason: 'The impostor was caught!',
};

const RESULT_IMPOSTOR: RoundResult = {
  ...RESULT_CITIZENS,
  winner: 'impostor',
  finalGuess: 'cappuccino',
  guessCorrect: true,
  reason: 'Caught — but the impostor guessed "Cappuccino" and wins!',
};

export const CITIZEN_WORD: WordAssignment = {
  isImpostor: false,
  word: 'Cappuccino',
  clue: null,
  category: 'Food',
};

export const IMPOSTOR_WORD: WordAssignment = {
  isImpostor: true,
  word: null,
  clue: 'Latte',
  category: 'Food',
};

export type DemoScreen =
  | 'home'
  | 'lobby'
  | 'reveal'
  | 'revealImpostor'
  | 'clue'
  | 'vote'
  | 'finalGuess'
  | 'results'
  | 'resultsImpostor';

/** Fresh state per selection so phase timers restart on every switch. */
export function buildState(screen: DemoScreen): PublicRoomState {
  const s = base();
  const now = Date.now();
  switch (screen) {
    case 'lobby':
      return s;
    case 'reveal':
    case 'revealImpostor':
      s.phase = 'reveal';
      s.phaseEndsAt = now + 9_000;
      return s;
    case 'clue':
      s.phase = 'clue';
      s.currentTurnId = SELF_ID; // your turn — the clue input shows
      s.clues = CLUES.slice(0, 3);
      s.phaseEndsAt = now + 25_000;
      return s;
    case 'vote':
      s.phase = 'vote';
      s.clues = CLUES;
      s.votedIds = ['p3', 'p4'];
      s.phaseEndsAt = now + 35_000;
      return s;
    case 'finalGuess':
      s.phase = 'finalGuess';
      s.clues = CLUES;
      s.accusedId = 'p2';
      s.liveGuess = 'capp';
      s.players.find((p) => p.id === 'p2')!.alive = false;
      s.phaseEndsAt = now + 25_000;
      return s;
    case 'results':
      s.phase = 'results';
      s.result = RESULT_CITIZENS;
      s.players.find((p) => p.id === 'p2')!.alive = false;
      return s;
    case 'resultsImpostor':
      s.phase = 'results';
      s.result = RESULT_IMPOSTOR;
      s.players.find((p) => p.id === 'p2')!.alive = false;
      return s;
    default:
      return s;
  }
}
