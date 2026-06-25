// client/src/components/ClueBoard.tsx
import { useT } from '../i18n';
import type { PublicRoomState } from '../types';
import Avatar from './Avatar';

/** Every clue, in order, always reviewable — deduction depends on clue
 *  history, so it never scrolls away. */
export default function ClueBoard({ room }: { room: PublicRoomState }) {
  const { t } = useT();
  if (room.clues.length === 0) return null;
  const byId = new Map(room.players.map((p) => [p.id, p]));
  const rounds = [...new Set(room.clues.map((c) => c.round))];

  return (
    <section className="glass w-full p-4" aria-label={t('cluesBoard')}>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted">{t('cluesBoard')}</h3>
      <div className="max-h-44 space-y-2 overflow-y-auto pr-1">
        {rounds.map((r) => (
          <div key={r}>
            {rounds.length > 1 && (
              <p className="mb-1 text-[11px] uppercase tracking-wider text-muted/60">
                {t('round')} {r}
              </p>
            )}
            <ul className="flex flex-wrap gap-1.5">
              {room.clues
                .filter((c) => c.round === r)
                .map((c, i) => {
                  const p = byId.get(c.playerId);
                  return (
                    <li key={`${r}-${i}`} className="chip animate-pop border border-white/10 bg-base/60">
                      {p ? <Avatar player={p} size="sm" ring={false} className="!h-5 !w-5 text-xs" /> : '👻'}
                      <span className="text-muted">{p?.name ?? '—'}:</span>
                      <span className="font-semibold">“{c.text}”</span>
                    </li>
                  );
                })}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
