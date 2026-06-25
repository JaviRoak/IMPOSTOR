// client/src/components/GameScreen.tsx
import { useEffect, useState, type FormEvent } from 'react';
import { useT } from '../i18n';
import { socket } from '../socket';
import type { PublicRoomState, WordAssignment } from '../types';
import Avatar from './Avatar';
import ClueBoard from './ClueBoard';
import PlayerTable from './PlayerTable';
import ResultsScreen from './ResultsScreen';
import Timer from './Timer';
import WordReveal from './WordReveal';
import AppHeader from './AppHeader';

// Mirrors SKIP in server/src/room.ts — a vote target meaning "skip / no one".
const SKIP = '__skip__';

export default function GameScreen({
  room,
  selfId,
  word,
  onLeave,
}: {
  room: PublicRoomState;
  selfId: string;
  word: WordAssignment | null;
  onLeave: () => void;
}) {
  const { t } = useT();
  const self = room.players.find((p) => p.id === selfId)!;
  const [peek, setPeek] = useState(false);

  if (room.phase === 'results' && room.result) {
    return <ResultsScreen room={room} selfId={selfId} onLeave={onLeave} />;
  }

  const peekText = word?.isImpostor
    ? word.clue
      ? `🤫 ${t('yourClue')}: ${word.clue}`
      : `🤫 ${t('youAreImpostor')}`
    : word?.word ?? '';

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-4 px-4 py-4 sm:py-5">
      <AppHeader code={room.code} onLeave={onLeave} />

      {/* Phase, timer and the word-peek button share one wrap-safe row, kept
          clear of both the header above and the table below — so nothing can
          land on top of a player avatar. */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        <PhaseBadge room={room} />
        <Timer endsAt={room.phaseEndsAt} />
        {word && room.phase !== 'reveal' && (
          <button
            className="chip select-none border border-white/10 bg-raised/80 text-sm hover:bg-raised"
            onPointerDown={() => setPeek(true)}
            onPointerUp={() => setPeek(false)}
            onPointerLeave={() => setPeek(false)}
            onContextMenu={(e) => e.preventDefault()}
            aria-label={t('holdToPeek')}
          >
            {peek ? <span className="font-display font-bold">{peekText}</span> : <>👁 {t('holdToPeek')}</>}
          </button>
        )}
      </div>

      <PlayerTable room={room} selfId={selfId} centerContent={<CenterStage room={room} selfId={selfId} word={word} />} />

      <ClueBoard room={room} />

      {room.phase === 'clue' && room.currentTurnId === selfId && self.alive && <ClueInput />}
      {room.phase === 'vote' && self.alive && <VotePanel room={room} selfId={selfId} />}
      {room.phase === 'finalGuess' && room.accusedId === selfId && <GuessInput />}
    </main>
  );
}

// ── Center of the table ───────────────────────────────────────────────────

function CenterStage({ room, selfId, word }: { room: PublicRoomState; selfId: string; word: WordAssignment | null }) {
  const { t } = useT();
  if (room.phase === 'reveal') {
    return word ? <WordReveal word={word} /> : <p className="text-muted">{t('dealing')}</p>;
  }
  if (room.phase === 'clue') {
    const turn = room.players.find((p) => p.id === room.currentTurnId);
    const mine = room.currentTurnId === selfId;
    return (
      <div className="animate-rise">
        <p className="text-xs uppercase tracking-widest text-muted">{t('clueRoundN', { n: room.clueRound })}</p>
        <p className={`mt-1 font-display text-xl font-bold sm:text-2xl ${mine ? 'text-brand' : ''}`}>
          {mine ? `✏️ ${t('yourClueTurn')}` : t('isThinking', { name: turn?.name ?? '…' })}
        </p>
        {mine && <p className="mt-1 text-xs text-muted">{t('clueTip')}</p>}
      </div>
    );
  }
  if (room.phase === 'vote') {
    return (
      <div className="animate-rise">
        <p className="text-xs uppercase tracking-widest text-muted">{t('theVote')}</p>
        <p className="mt-1 font-display text-xl font-bold sm:text-2xl">{t('whoIsImpostor')}</p>
        <p className="mt-1 text-xs text-muted">
          {room.votedIds.length}/{room.players.filter((p) => p.alive).length} {t('sealed')}
        </p>
      </div>
    );
  }
  if (room.phase === 'finalGuess') {
    const accused = room.players.find((p) => p.id === room.accusedId);
    const isMe = room.accusedId === selfId;
    return (
      <div className="animate-pop">
        <p className="text-xs uppercase tracking-widest text-danger">{t('impostorCaught')}</p>
        <p className="mt-1 font-display text-lg font-bold sm:text-xl">
          {isMe ? t('lastGuessMine') : t('lastGuessOther', { name: accused?.name ?? '…' })}
        </p>
        <p className="mx-auto mt-2 min-h-[2.2rem] max-w-[14rem] break-words font-mono text-xl text-amber">
          {room.liveGuess}
          <span className="animate-blink">▌</span>
        </p>
      </div>
    );
  }
  return null;
}

// ── Clue input ────────────────────────────────────────────────────────────

function ClueInput() {
  const { t } = useT();
  const [text, setText] = useState('');
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    socket.emit('clue:submit', { text });
    setText('');
  };
  return (
    <form onSubmit={submit} className="glass animate-rise sticky bottom-4 flex gap-2 p-3">
      <input
        autoFocus
        className="input flex-1"
        placeholder={t('cluePlaceholder')}
        maxLength={40}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <button type="submit" className="btn-hero">
        {t('giveClue')}
      </button>
    </form>
  );
}

// ── Vote panel ────────────────────────────────────────────────────────────

function VotePanel({ room, selfId }: { room: PublicRoomState; selfId: string }) {
  const { t } = useT();
  const [choice, setChoice] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const candidates = room.players.filter((p) => p.alive && p.id !== selfId);
  const byId = new Map(room.players.map((p) => [p.id, p]));

  const seal = () => {
    if (!choice) return;
    socket.emit('vote:cast', { targetId: choice });
    setLocked(true);
  };

  const sealLabel = locked
    ? choice === SKIP
      ? t('skipSealed')
      : t('voteSealed')
    : choice === SKIP
      ? t('sealSkip')
      : choice
        ? t('sealVoteFor', { name: byId.get(choice)?.name ?? '' })
        : t('pickSuspect');

  return (
    <section className="glass animate-rise space-y-3 p-4" aria-label={t('theVote')}>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {candidates.map((p) => {
          const clues = room.clues.filter((c) => c.playerId === p.id);
          const selected = choice === p.id;
          return (
            <button
              key={p.id}
              disabled={locked}
              onClick={() => setChoice(p.id)}
              className={`rounded-2xl border p-3 text-left transition-all ${
                selected
                  ? 'border-candy bg-candy/15 -translate-y-1 shadow-glow'
                  : 'border-white/10 bg-base/50 hover:bg-base/80'
              }`}
            >
              <div className="flex items-center gap-2">
                <Avatar player={p} size="sm" ring={false} />
                <span className="truncate font-semibold">{p.name}</span>
                {selected && <span className="ml-auto">🪧</span>}
              </div>
              <p className="mt-1 truncate text-xs text-muted">
                {clues.length ? clues.map((c) => `“${c.text}”`).join(' · ') : t('noCluesYet')}
              </p>
            </button>
          );
        })}
      </div>

      {/* Skip option — if it wins the vote, no one is removed */}
      <button
        disabled={locked}
        onClick={() => setChoice(SKIP)}
        className={`w-full rounded-2xl border py-2.5 text-sm font-semibold transition-all ${
          choice === SKIP
            ? 'border-sky bg-sky/15 text-sky -translate-y-0.5 shadow-glow'
            : 'border-white/10 bg-base/50 text-muted hover:bg-base/80'
        }`}
      >
        ⏭ {t('skipVote')}
      </button>

      <button className="btn-hero w-full" onClick={seal} disabled={!choice || locked}>
        {sealLabel}
      </button>
    </section>
  );
}

// ── Final guess input (the Impostor's view) ───────────────────────────────

function GuessInput() {
  const { t } = useT();
  const [text, setText] = useState('');

  // Broadcast every keystroke — the room watches you type. No pressure.
  useEffect(() => {
    socket.emit('guess:typing', { text });
  }, [text]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    socket.emit('guess:submit', { text });
  };

  return (
    <form onSubmit={submit} className="glass animate-pop sticky bottom-4 space-y-2 p-4">
      <p className="text-center text-sm text-muted">{t('guessWarning')}</p>
      <div className="flex gap-2">
        <input
          autoFocus
          className="input flex-1 font-mono"
          placeholder={t('guessPlaceholder')}
          maxLength={30}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button type="submit" className="btn-hero">
          {t('guess')}
        </button>
      </div>
    </form>
  );
}

// ── Phase badge ───────────────────────────────────────────────────────────

function PhaseBadge({ room }: { room: PublicRoomState }) {
  const { t } = useT();
  const label =
    room.phase === 'reveal'
      ? t('phaseDeal')
      : room.phase === 'clue'
        ? t('phaseClues', { n: room.clueRound })
        : room.phase === 'vote'
          ? t('phaseVote')
          : room.phase === 'finalGuess'
            ? t('phaseGuess')
            : room.phase;
  return (
    <span className="chip border border-white/10 bg-raised/80 font-medium">
      {label}
      {room.categoryLabel && <span className="text-muted">· {room.categoryLabel}</span>}
    </span>
  );
}
