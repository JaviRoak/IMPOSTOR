// client/src/components/ResultsScreen.tsx
import { useMemo } from 'react';
import { useT } from '../i18n';
import { socket } from '../socket';
import type { PublicRoomState } from '../types';
import Avatar from './Avatar';

export default function ResultsScreen({
  room,
  selfId,
  onLeave,
}: {
  room: PublicRoomState;
  selfId: string;
  onLeave: () => void;
}) {
  const { t } = useT();
  const r = room.result!;
  const byId = new Map(room.players.map((p) => [p.id, p]));
  const impostor = byId.get(r.impostorId);
  const isHost = room.hostId === selfId;
  const iWasImpostor = r.impostorId === selfId;
  const iWon = (r.winner === 'impostor') === iWasImpostor;
  const citizensWon = r.winner === 'citizens';
  const ranked = useMemo(() => [...room.players].sort((a, b) => b.score - a.score), [room.players]);

  return (
    <main className="relative mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-5 overflow-hidden px-5 py-8">
      <Confetti color={citizensWon ? '#3DDC97' : '#FF5CA8'} />

      <header className="animate-pop text-center">
        <p className={`text-sm font-semibold uppercase tracking-widest ${citizensWon ? 'text-mint' : 'text-candy'}`}>
          {citizensWon ? t('citizensWin') : t('impostorWins')}
        </p>
        <h2 className="mt-1 font-display text-4xl font-extrabold">{iWon ? t('victory') : t('soClose')}</h2>
        <p className="mt-2 text-muted">{r.reason}</p>
      </header>

      <section className="grid grid-cols-2 gap-3">
        <div className="glass animate-rise p-4 text-center">
          <p className="text-xs uppercase tracking-widest text-muted">{t('theWordWas')}</p>
          <p className="word-display mt-1 text-2xl sm:text-3xl">{r.mainWord}</p>
        </div>
        <div className="glass animate-rise p-4 text-center" style={{ animationDelay: '80ms' }}>
          <p className="text-xs uppercase tracking-widest text-muted">{t('impostorClueWas')}</p>
          <p className={`mt-1 font-display text-2xl font-extrabold sm:text-3xl ${r.impostorClue ? 'text-candy' : 'text-muted/60'}`}>
            {r.impostorClue ?? `(${t('noClueGiven')})`}
          </p>
        </div>
      </section>

      <section className="glass space-y-2 p-4 text-center">
        <p className="flex items-center justify-center gap-2">
          {t('theImpostorWas')}{' '}
          {impostor && <Avatar player={impostor} size="sm" ring={false} />}
          <span className="font-semibold">{impostor?.name ?? t('playerLeft')}</span>
          {iWasImpostor && <span> {t('thatWasYou')}</span>}
        </p>
        {r.finalGuess !== null && (
          <p className="text-sm text-muted">
            {t('finalGuessLabel')}:{' '}
            <span className={`font-mono font-semibold ${r.guessCorrect ? 'text-amber' : 'text-ink'}`}>“{r.finalGuess}”</span>{' '}
            {r.guessCorrect ? t('aSteal') : t('notIt')}
          </p>
        )}
      </section>

      <section className="glass p-4" aria-label={t('tableScores')}>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted">{t('tableScores')}</h3>
        <ol className="space-y-1.5">
          {ranked.map((p, i) => (
            <li key={p.id} className="flex items-center gap-2 text-sm">
              <span className="w-5 text-muted">{i + 1}.</span>
              <Avatar player={p} size="sm" ring={false} />
              <span className="truncate font-medium">
                {p.name}
                {p.id === selfId && <span className="text-muted"> ({t('you')})</span>}
                {p.id === r.impostorId && ' 🕵️'}
              </span>
              <span className="ml-auto font-mono tabular-nums text-amber">{p.score}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-auto space-y-2">
        {isHost ? (
          <button className="btn-hero w-full text-lg" onClick={() => socket.emit('game:continue')}>
            {t('playAgain')}
          </button>
        ) : (
          <p className="text-center text-sm text-muted">{t('waitingHost')}</p>
        )}
        <button className="btn-ghost w-full" onClick={onLeave}>
          {t('leaveTable')}
        </button>
      </section>
    </main>
  );
}

function Confetti({ color }: { color: string }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: 28 }, (_, i) => ({
        left: `${(i * 37) % 100}%`,
        delay: `${(i % 10) * 0.18}s`,
        duration: `${2.4 + (i % 5) * 0.4}s`,
        hue: i % 3,
      })),
    [],
  );
  const palette = [color, '#FFB85C', '#5CC8FF'];
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden>
      {pieces.map((p, i) => (
        <span
          key={i}
          className="absolute top-0 block h-2.5 w-1.5 rounded-sm"
          style={{
            left: p.left,
            backgroundColor: palette[p.hue],
            animation: `confetti ${p.duration} ${p.delay} ease-in forwards`,
          }}
        />
      ))}
    </div>
  );
}
