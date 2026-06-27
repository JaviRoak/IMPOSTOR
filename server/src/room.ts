// server/src/room.ts
// One Room = one authoritative in-memory state machine. Clients send intents;
// the room validates phase + actor, mutates, and broadcasts a snapshot.

import type {
  Clue, Language, Phase, PlayerState, PublicRoomState, RoomSettings, RoundResult,
} from './types.js';
import { CATEGORIES, categoryLabel, pickEntry } from './words.js';

export const MIN_PLAYERS = 3; // ruleset recommends 4–12; 3 allowed for easy testing
export const MAX_PLAYERS = 12;

const TIMERS = { reveal: 9_000, vote: 35_000, finalGuess: 25_000 } as const;
const CLUE_SECONDS_OPTIONS = [15, 25, 40, 60] as const;
const DEFAULT_CLUE_SECONDS = 25;
export const SKIP = '__skip__'; // sentinel vote target meaning "skip / no one"
const VALID_CATEGORIES = new Set<string>(['all', 'custom', ...CATEGORIES.map((c) => c.id)]);
const SCORE = { citizenWin: 100, sharpVoteBonus: 25, impostorSurvive: 250, impostorGuess: 150 } as const;

const EMOJIS = ['🦩', '🦊', '🐙', '🦉', '🐸', '🦄', '🐼', '🦖', '🐳', '🦜', '🐌', '🦔'];
const COLORS = [
  '#7C5CFF', '#FF5CA8', '#FFB85C', '#3DDC97', '#5CC8FF', '#FF8A5C',
  '#B05CFF', '#5CFFB8', '#FF5C7A', '#5C7AFF', '#E3FF5C', '#FF5CE1',
];

// Server-side strings, localized to the room language.
const MSG = {
  inProgress: { en: 'A round is in progress — try again in a minute.', es: 'Hay una ronda en curso. Intenta de nuevo en un minuto.' },
  full: { en: 'This table is full (12 players).', es: 'La mesa está llena (12 jugadores).' },
  noName: { en: 'Pick a name first.', es: 'Primero elige un nombre.' },
  nameTaken: { en: 'Someone at this table already has that name.', es: 'Alguien en esta mesa ya usa ese nombre.' },
  hostOnlyStart: { en: 'Only the host can start the round.', es: 'Solo el anfitrión puede iniciar la ronda.' },
  hostOnlySettings: { en: 'Only the host can change the settings.', es: 'Solo el anfitrión puede cambiar la configuración.' },
  hostOnlyContinue: { en: 'Only the host can continue.', es: 'Solo el anfitrión puede continuar.' },
  needPlayers: { en: `You need at least ${MIN_PLAYERS} players to start.`, es: `Se necesitan al menos ${MIN_PLAYERS} jugadores para empezar.` },
  waitingOn: { en: 'Waiting on: ', es: 'Esperando a: ' },
  needCustomWords: { en: 'Add at least 5 words to your custom list first.', es: 'Agrega al menos 5 palabras a tu lista personalizada primero.' },
  clueLen: { en: 'A clue is 1 to 3 words.', es: 'Una pista debe tener de 1 a 3 palabras.' },
  clueContainsWord: { en: "Careful — your clue can't contain your word.", es: 'Cuidado: tu pista no puede contener tu palabra.' },
  clueDuplicate: { en: 'That clue is already on the board.', es: 'Esa pista ya está en el tablero.' },
  noSelfVote: { en: "You can't vote for yourself.", es: 'No puedes votarte a ti mismo.' },
  tieOneMore: { en: 'It was a tie — one more round of clues.', es: 'Hubo empate: una ronda más de pistas.' },
  wrongPick: { en: 'Wrong pick — the impostor is still in the game.', es: 'Elección equivocada: el impostor sigue en la partida.' },
  impostorFled: { en: 'The impostor left the table.', es: 'El impostor abandonó la mesa.' },
  tooFewLeft: { en: 'Too few players remain — the impostor wins.', es: 'Quedan muy pocos jugadores: ¡gana el impostor!' },
  neverAgreed: { en: 'No agreement was reached — the impostor wins.', es: 'No hubo acuerdo: ¡gana el impostor!' },
  wrongTooFew: { en: 'Wrong pick — and too few players remain. The impostor wins!', es: 'Elección equivocada… y quedan muy pocos jugadores. ¡Gana el impostor!' },
  voteSkipped: { en: 'The vote was skipped — one more round of clues.', es: 'Se omitió la votación: una ronda más de pistas.' },
  skippedEscape: { en: 'The vote was skipped one too many times — the impostor wins.', es: 'Se omitió la votación demasiadas veces: ¡gana el impostor!' },
  stolen: { en: (w: string) => `Caught — but the impostor guessed "${w}" and wins!`, es: (w: string) => `Descubierto… ¡pero el impostor adivinó "${w}" y gana!` },
  caught: { en: 'The impostor was caught!', es: '¡El impostor fue descubierto!' },
  settingsUpdated: { en: 'Settings updated.', es: 'Configuración actualizada.' },
} as const;

interface Player extends PlayerState {
  socketId: string;
  votedFor: string | null;
}

export class Room {
  code: string;
  phase: Phase = 'lobby';
  matchNumber = 0;
  clueRound = 0;
  players: Player[] = [];
  hostId = '';

  settings: RoomSettings;
  private customWords: string[] = [];
  private currentWord: string | null = null;
  private currentClue: string | null = null; // the impostor's clue this round
  private currentCategoryId = 'all';
  private impostorId: string | null = null;
  private usedEntries = new Set<number>();
  private usedCustom = new Set<string>();

  turnOrder: string[] = [];
  private turnIndex = 0;
  clues: Clue[] = [];
  accusedId: string | null = null;
  liveGuess = '';
  result: RoundResult | null = null;
  phaseEndsAt: number | null = null;

  private timer: NodeJS.Timeout | null = null;
  emptySince: number | null = null;
  private lastVoteCounts: Record<string, number> = {};

  constructor(
    code: string,
    language: Language,
    private onChange: (room: Room) => void,
    private sendWord: (
      socketId: string,
      a: { isImpostor: boolean; word: string | null; clue: string | null; category: string },
    ) => void,
    private notifySocket: (socketId: string, kind: 'error' | 'info', message: string) => void,
  ) {
    this.code = code;
    this.settings = {
      language,
      clueEnabled: true,
      category: 'all',
      customWordsCount: 0,
      clueSeconds: DEFAULT_CLUE_SECONDS,
      lastChance: true,
    };
  }

  private t(key: Exclude<keyof typeof MSG, 'stolen'>): string {
    return (MSG[key] as Record<Language, string>)[this.settings.language];
  }
  private notify(socketId: string, kind: 'error' | 'info', message: string) {
    this.notifySocket(socketId, kind, message);
  }

  // ── Lobby ────────────────────────────────────────────────────────────────

  addPlayer(socketId: string, name: string, avatar: string | null) {
    if (this.phase !== 'lobby' && this.phase !== 'results')
      return { ok: false as const, error: this.t('inProgress') };
    if (this.players.length >= MAX_PLAYERS) return { ok: false as const, error: this.t('full') };
    const clean = name.trim().slice(0, 16);
    if (!clean) return { ok: false as const, error: this.t('noName') };
    if (this.players.some((p) => p.name.toLowerCase() === clean.toLowerCase()))
      return { ok: false as const, error: this.t('nameTaken') };

    const safeAvatar = avatar && /^[\w-]+\.(png|webp|jpg|jpeg)$/i.test(avatar) ? avatar : null;
    const taken = new Set(this.players.map((p) => p.emoji));
    const player: Player = {
      id: socketId,
      socketId,
      name: clean,
      emoji: EMOJIS.find((e) => !taken.has(e)) ?? '🎭',
      avatar: safeAvatar,
      color: COLORS[this.players.length % COLORS.length],
      isHost: this.players.length === 0,
      ready: false,
      alive: true,
      connected: true,
      score: 0,
      votedFor: null,
    };
    this.players.push(player);
    if (player.isHost) this.hostId = player.id;
    this.emptySince = null;
    this.onChange(this);
    return { ok: true as const, id: player.id };
  }

  removePlayer(playerId: string) {
    const idx = this.players.findIndex((p) => p.id === playerId);
    if (idx === -1) return;
    const wasImpostor = this.impostorId === playerId;
    this.players.splice(idx, 1);

    if (this.players.length === 0) {
      this.emptySince = Date.now();
      this.clearTimer();
      return;
    }
    if (this.hostId === playerId) {
      this.hostId = this.players[0].id;
      this.players[0].isHost = true;
    }

    if (this.phase !== 'lobby' && this.phase !== 'results') {
      if (wasImpostor) return this.finishRound('citizens', null, null, null, this.t('impostorFled'));
      this.turnOrder = this.turnOrder.filter((id) => id !== playerId);
      if (this.alive().length < MIN_PLAYERS)
        return this.finishRound('impostor', null, null, null, this.t('tooFewLeft'));
      if (this.phase === 'clue' && this.currentTurnId() === null) this.advanceTurn();
      if (this.phase === 'vote') this.maybeResolveVotes();
    }
    this.onChange(this);
  }

  updateSettings(
    playerId: string,
    patch: { clueEnabled?: boolean; category?: string; customWords?: unknown[]; clueSeconds?: number; lastChance?: boolean },
  ) {
    if (playerId !== this.hostId) return this.notify(playerId, 'error', this.t('hostOnlySettings'));
    if (this.phase !== 'lobby' && this.phase !== 'results') return;

    if (typeof patch.clueEnabled === 'boolean') this.settings.clueEnabled = patch.clueEnabled;
    if (typeof patch.lastChance === 'boolean') this.settings.lastChance = patch.lastChance;
    if (
      typeof patch.clueSeconds === 'number' &&
      (CLUE_SECONDS_OPTIONS as readonly number[]).includes(patch.clueSeconds)
    )
      this.settings.clueSeconds = patch.clueSeconds;
    // Only accept a category we actually know about (defends against arbitrary
    // values steering selection logic).
    if (typeof patch.category === 'string' && VALID_CATEGORIES.has(patch.category))
      this.settings.category = patch.category;
    if (Array.isArray(patch.customWords)) {
      // Slice BEFORE mapping so an enormous array can't burn CPU on the map/Set.
      this.customWords = [
        ...new Set(
          patch.customWords
            .slice(0, 400)
            .map((w) => String(w).trim().slice(0, 30))
            .filter((w) => w.length > 0),
        ),
      ].slice(0, 200);
      this.settings.customWordsCount = this.customWords.length;
      this.usedCustom.clear();
    }
    this.onChange(this);
  }

  setReady(playerId: string, ready: boolean) {
    const p = this.get(playerId);
    if (!p || this.phase !== 'lobby') return;
    p.ready = ready;
    this.onChange(this);
  }

  start(playerId: string) {
    if (playerId !== this.hostId) return this.notify(playerId, 'error', this.t('hostOnlyStart'));
    if (this.phase !== 'lobby' && this.phase !== 'results') return;
    if (this.players.length < MIN_PLAYERS)
      return this.notify(playerId, 'error', this.t('needPlayers'));
    if (this.settings.category === 'custom' && this.customWords.length < 5)
      return this.notify(playerId, 'error', this.t('needCustomWords'));
    const notReady = this.players.filter((p) => !p.ready && p.id !== this.hostId);
    if (this.phase === 'lobby' && notReady.length > 0)
      return this.notify(playerId, 'error', (this.t('waitingOn')) + notReady.map((p) => p.name).join(', '));
    this.beginRound();
  }

  /** "Continue" from the results screen — return the table to the lobby/config
   *  page so the host can change settings and everyone re-readies. A new round
   *  only begins through start(), which enforces the player minimum and ready
   *  checks — so 1–2 leftover players can never keep a game running. */
  continueToLobby(playerId: string) {
    if (this.phase !== 'results') return;
    if (playerId !== this.hostId) return this.notify(playerId, 'error', this.t('hostOnlyContinue'));
    this.phase = 'lobby';
    this.result = null;
    this.accusedId = null;
    this.clues = [];
    this.liveGuess = '';
    this.clueRound = 0;
    for (const p of this.players) {
      p.ready = false;
      p.alive = true;
      p.votedFor = null;
    }
    this.onChange(this);
  }

  // ── Round lifecycle ──────────────────────────────────────────────────────

  private beginRound() {
    const lang = this.settings.language;
    this.matchNumber += 1;
    this.clueRound = 1;
    this.clues = [];
    this.result = null;
    this.accusedId = null;
    this.liveGuess = '';
    for (const p of this.players) {
      p.alive = true;
      p.ready = false;
      p.votedFor = null;
    }

    // Word selection: built-in categories carry an impostor clue;
    // the host's personalized list never does.
    if (this.settings.category === 'custom') {
      if (this.usedCustom.size >= this.customWords.length) this.usedCustom.clear();
      const pool = this.customWords.filter((w) => !this.usedCustom.has(w));
      const word = pool[Math.floor(Math.random() * pool.length)];
      this.usedCustom.add(word);
      this.currentWord = word;
      this.currentClue = null;
      this.currentCategoryId = 'custom';
    } else {
      const picked = pickEntry(this.usedEntries, this.settings.category);
      const entry = picked!.entry;
      this.currentWord = entry.word[lang];
      this.currentClue = this.settings.clueEnabled ? entry.clue[lang] : null;
      this.currentCategoryId = this.settings.category === 'all' ? entry.category : this.settings.category;
    }

    const ids = this.players.map((p) => p.id);
    this.impostorId = ids[Math.floor(Math.random() * ids.length)];
    this.turnOrder = shuffle(ids);
    this.turnIndex = 0;

    const label = categoryLabel(this.currentCategoryId, lang);
    for (const p of this.players) {
      const isImpostor = p.id === this.impostorId;
      this.sendWord(p.socketId, {
        isImpostor,
        word: isImpostor ? null : this.currentWord,
        clue: isImpostor ? this.currentClue : null,
        category: label,
      });
    }

    this.toPhase('reveal', TIMERS.reveal, () => this.startCluePhase());
  }

  private startCluePhase() {
    this.phase = 'clue';
    this.turnIndex = this.turnOrder.findIndex((id) => this.isAlive(id));
    this.armTurnTimer();
    this.onChange(this);
  }

  submitClue(playerId: string, raw: string) {
    if (this.phase !== 'clue' || playerId !== this.currentTurnId()) return;
    const text = raw.trim().replace(/\s+/g, ' ').slice(0, 40);
    const words = text.split(' ').filter(Boolean);
    if (words.length === 0 || words.length > 3)
      return this.notify(playerId, 'error', this.t('clueLen'));
    if (playerId !== this.impostorId && this.currentWord) {
      if (text.toLowerCase().includes(this.currentWord.toLowerCase()))
        return this.notify(playerId, 'error', this.t('clueContainsWord'));
    }
    if (this.clues.some((c) => c.text.toLowerCase() === text.toLowerCase()))
      return this.notify(playerId, 'error', this.t('clueDuplicate'));

    this.clues.push({ playerId, text, round: this.clueRound });
    this.advanceTurn();
  }

  private advanceTurn() {
    this.clearTimer();
    do {
      this.turnIndex += 1;
    } while (this.turnIndex < this.turnOrder.length && !this.isAlive(this.turnOrder[this.turnIndex]));

    if (this.turnIndex >= this.turnOrder.length) {
      this.toPhase('vote', TIMERS.vote, () => this.resolveVotes());
    } else {
      this.armTurnTimer();
      this.onChange(this);
    }
  }

  private armTurnTimer() {
    const ms = this.settings.clueSeconds * 1000;
    this.phaseEndsAt = Date.now() + ms;
    this.timer = setTimeout(() => {
      const id = this.currentTurnId();
      if (id) this.clues.push({ playerId: id, text: '…', round: this.clueRound });
      this.advanceTurn();
    }, ms);
  }

  currentTurnId(): string | null {
    if (this.phase !== 'clue') return null;
    return this.turnOrder[this.turnIndex] ?? null;
  }

  // ── Voting ───────────────────────────────────────────────────────────────

  castVote(playerId: string, targetId: string) {
    if (this.phase !== 'vote') return;
    const voter = this.get(playerId);
    if (!voter?.alive) return;
    if (targetId === SKIP) {
      voter.votedFor = SKIP;
      this.onChange(this);
      return this.maybeResolveVotes();
    }
    const target = this.get(targetId);
    if (!target?.alive) return;
    if (playerId === targetId) return this.notify(playerId, 'error', this.t('noSelfVote'));
    voter.votedFor = targetId;
    this.onChange(this);
    this.maybeResolveVotes();
  }

  private maybeResolveVotes() {
    if (this.phase !== 'vote') return;
    if (this.alive().every((p) => p.votedFor !== null)) {
      this.clearTimer();
      this.resolveVotes();
    }
  }

  private resolveVotes() {
    const counts: Record<string, number> = {};
    for (const p of this.alive()) if (p.votedFor) counts[p.votedFor] = (counts[p.votedFor] ?? 0) + 1;

    const max = Math.max(0, ...Object.values(counts));
    const top = Object.keys(counts).filter((id) => counts[id] === max);

    if (max === 0 || top.length !== 1) {
      if (this.clueRound >= 2) {
        this.finishRound('impostor', null, null, counts, this.t('neverAgreed'));
      } else {
        this.nextClueRound(counts, this.t('tieOneMore'));
      }
      return;
    }

    const ejectedId = top[0];

    // Skip won the vote → nobody is removed.
    if (ejectedId === SKIP) {
      this.nextClueRound(counts, this.t('voteSkipped'));
      return;
    }

    if (ejectedId === this.impostorId) {
      this.get(ejectedId)!.alive = false;
      this.lastVoteCounts = counts;
      if (!this.settings.lastChance) {
        // Last-chance disabled — catching the impostor ends it right there.
        this.finishRound('citizens', ejectedId, null, counts, this.t('caught'));
        return;
      }
      this.accusedId = ejectedId;
      this.liveGuess = '';
      this.toPhase('finalGuess', TIMERS.finalGuess, () => this.submitGuess(ejectedId, this.liveGuess));
    } else {
      this.get(ejectedId)!.alive = false;
      const remainingAlive = this.alive().length;
      if (remainingAlive <= 2) {
        this.finishRound('impostor', ejectedId, null, counts, this.t('wrongTooFew'));
      } else {
        this.nextClueRound(counts, this.t('wrongPick'));
      }
    }
  }

  private nextClueRound(counts: Record<string, number>, message: string) {
    this.lastVoteCounts = counts;
    this.clueRound += 1;
    for (const p of this.players) p.votedFor = null;
    for (const p of this.players) this.notify(p.socketId, 'info', message);
    this.startCluePhase();
  }

  // ── Final guess ──────────────────────────────────────────────────────────

  typeGuess(playerId: string, text: string) {
    if (this.phase !== 'finalGuess' || playerId !== this.accusedId) return;
    this.liveGuess = text.slice(0, 30);
    this.onChange(this);
  }

  submitGuess(playerId: string, raw: string) {
    if (this.phase !== 'finalGuess' || playerId !== this.accusedId) return;
    this.clearTimer();
    const guess = raw.trim();
    const correct = guess.length > 0 && isCloseEnough(guess, this.currentWord!);
    if (correct) {
      const fn = MSG.stolen[this.settings.language];
      this.finishRound('impostor', this.accusedId, guess, this.lastVoteCounts, fn(this.currentWord!));
    } else {
      this.finishRound(
        'citizens',
        this.accusedId,
        guess || '—',
        this.lastVoteCounts,
        this.t('caught'),
      );
    }
  }

  // ── Resolution ───────────────────────────────────────────────────────────

  private finishRound(
    winner: 'citizens' | 'impostor',
    ejectedId: string | null,
    finalGuess: string | null,
    voteCounts: Record<string, number> | null,
    reason: string,
  ) {
    this.clearTimer();
    const impostorId = this.impostorId!;
    const counts = voteCounts ?? this.lastVoteCounts;

    if (winner === 'citizens') {
      for (const p of this.players) {
        if (p.id === impostorId) continue;
        p.score += SCORE.citizenWin;
        if (p.votedFor === impostorId) p.score += SCORE.sharpVoteBonus;
      }
    } else {
      const impostor = this.get(impostorId);
      if (impostor)
        impostor.score +=
          finalGuess && isCloseEnough(finalGuess, this.currentWord!)
            ? SCORE.impostorSurvive + SCORE.impostorGuess
            : SCORE.impostorSurvive;
    }

    this.result = {
      winner,
      impostorId,
      mainWord: this.currentWord!,
      impostorClue: this.currentClue,
      ejectedId,
      finalGuess,
      guessCorrect: finalGuess !== null ? isCloseEnough(finalGuess, this.currentWord!) : null,
      voteCounts: counts,
      reason,
    };
    this.accusedId = null;
    this.phase = 'results';
    this.phaseEndsAt = null;
    this.lastVoteCounts = {};
    this.onChange(this);
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  private toPhase(phase: Phase, ms: number, onExpire: () => void) {
    this.clearTimer();
    this.phase = phase;
    this.phaseEndsAt = Date.now() + ms;
    this.timer = setTimeout(onExpire, ms);
    this.onChange(this);
  }

  private clearTimer() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.phaseEndsAt = null;
  }

  destroy() {
    this.clearTimer();
  }

  private get(id: string) {
    return this.players.find((p) => p.id === id);
  }
  private alive() {
    return this.players.filter((p) => p.alive);
  }
  private isAlive(id: string) {
    return this.get(id)?.alive ?? false;
  }

  snapshot(): PublicRoomState {
    return {
      code: this.code,
      phase: this.phase,
      matchNumber: this.matchNumber,
      clueRound: this.clueRound,
      categoryLabel:
        this.phase === 'lobby' ? null : categoryLabel(this.currentCategoryId, this.settings.language),
      settings: { ...this.settings },
      players: this.players.map(({ socketId: _s, votedFor: _v, ...pub }) => pub),
      hostId: this.hostId,
      turnOrder: this.turnOrder,
      currentTurnId: this.currentTurnId(),
      clues: this.clues,
      votedIds: this.players.filter((p) => p.votedFor !== null).map((p) => p.id),
      accusedId: this.accusedId,
      liveGuess: this.phase === 'finalGuess' ? this.liveGuess : '',
      result: this.result,
      phaseEndsAt: this.phaseEndsAt,
      minPlayers: MIN_PLAYERS,
      maxPlayers: MAX_PLAYERS,
    };
  }
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Fuzzy match for the Final Guess: exact (accent-insensitive) or edit distance ≤ 1. */
function isCloseEnough(guess: string, answer: string): boolean {
  const a = normalize(guess);
  const b = normalize(answer);
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 1) return false;
  return levenshtein(a, b) <= 1;
}

function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip accents: "café" ≈ "cafe"
    .replace(/[^a-z0-9ñ]/g, '');
}

function levenshtein(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
  return dp[a.length][b.length];
}
