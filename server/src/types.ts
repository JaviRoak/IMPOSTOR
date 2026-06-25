// server/src/types.ts
// Wire protocol. The shared PublicRoomState snapshot NEVER contains the
// impostor's identity or the secret word — secrecy is enforced by payload
// design. Words/clues travel only via the private `word:assign` event.

export type Phase = 'lobby' | 'reveal' | 'clue' | 'vote' | 'finalGuess' | 'results';
export type Language = 'en' | 'es';

export interface PlayerState {
  id: string;
  name: string;
  emoji: string; // fallback when no image avatar is set
  avatar: string | null; // png filename served from /avatars/<file>
  color: string;
  isHost: boolean;
  ready: boolean;
  alive: boolean;
  connected: boolean;
  score: number;
}

export interface RoomSettings {
  language: Language;
  clueEnabled: boolean; // host toggle: does the impostor receive a clue word?
  category: string; // category id, 'all', or 'custom'
  customWordsCount: number; // size of the host's personalized word list
  clueSeconds: number; // host-set time to answer per clue turn
  lastChance: boolean; // host toggle: does a caught impostor get a final guess?
}

export interface Clue {
  playerId: string;
  text: string;
  round: number;
}

export interface RoundResult {
  winner: 'citizens' | 'impostor';
  impostorId: string;
  mainWord: string;
  impostorClue: string | null; // null when clue disabled or custom list
  ejectedId: string | null;
  finalGuess: string | null;
  guessCorrect: boolean | null;
  voteCounts: Record<string, number>;
  reason: string; // already localized to the room language
}

export interface PublicRoomState {
  code: string;
  phase: Phase;
  matchNumber: number;
  clueRound: number;
  categoryLabel: string | null; // localized display label for the current round
  settings: RoomSettings;
  players: PlayerState[];
  hostId: string;
  turnOrder: string[];
  currentTurnId: string | null;
  clues: Clue[];
  votedIds: string[]; // who has voted — never whom they voted for
  accusedId: string | null;
  liveGuess: string; // the impostor's keystrokes, broadcast live
  result: RoundResult | null;
  phaseEndsAt: number | null;
  minPlayers: number;
  maxPlayers: number;
}

export interface WordAssignment {
  isImpostor: boolean;
  word: string | null; // citizens: the secret word · impostor: null
  clue: string | null; // impostor only, when the host enabled clues
  category: string; // localized label
}

export interface ServerToClientEvents {
  'room:state': (state: PublicRoomState) => void;
  'word:assign': (assignment: WordAssignment) => void;
  toast: (t: { kind: 'error' | 'info'; message: string }) => void;
  'room:closed': () => void;
}

export interface ClientToServerEvents {
  'room:create': (
    p: { name: string; avatar: string | null; language: Language },
    ack: (res: JoinResult) => void,
  ) => void;
  'room:join': (p: { code: string; name: string; avatar: string | null }, ack: (res: JoinResult) => void) => void;
  'room:settings': (p: {
    clueEnabled?: boolean;
    category?: string;
    customWords?: string[];
    clueSeconds?: number;
    lastChance?: boolean;
  }) => void;
  'player:ready': (p: { ready: boolean }) => void;
  'game:start': () => void;
  'clue:submit': (p: { text: string }) => void;
  'vote:cast': (p: { targetId: string }) => void;
  'guess:typing': (p: { text: string }) => void;
  'guess:submit': (p: { text: string }) => void;
  'game:continue': () => void;
  'room:leave': () => void;
}

export type JoinResult =
  | { ok: true; code: string; selfId: string }
  | { ok: false; error: string };
