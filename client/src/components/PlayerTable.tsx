// client/src/components/PlayerTable.tsx
import { useT } from '../i18n';
import type { PublicRoomState } from '../types';
import Avatar from './Avatar';

/** Avatar cards orbiting the gradient table disc. Eliminated players fade;
 *  the active clue-giver gets the glowing turn ring. */
export default function PlayerTable({
  room,
  selfId,
  centerContent,
}: {
  room: PublicRoomState;
  selfId: string;
  centerContent?: React.ReactNode;
}) {
  const { t } = useT();
  const n = room.players.length;
  const R = 38; // orbit radius (% from centre). <50 keeps avatars inside the box
  //              so the 12-o'clock player never pokes out of the top edge.

  return (
    <div className="relative mx-auto mb-12 mt-7 aspect-square w-full max-w-[min(88vw,440px)]">
      <div className="table-disc absolute inset-[18%] rounded-full" />
      <div className="absolute inset-[18%] grid place-items-center rounded-full p-6 text-center">
        {centerContent}
      </div>

      {room.players.map((p, i) => {
        const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
        const x = 50 + R * Math.cos(angle);
        const y = 50 + R * Math.sin(angle);
        const isTurn = room.currentTurnId === p.id;
        const lastClue = [...room.clues].reverse().find((c) => c.playerId === p.id && c.round === room.clueRound);
        const voted = room.phase === 'vote' && room.votedIds.includes(p.id);

        return (
          <div
            key={p.id}
            className="absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-500"
            style={{ left: `${x}%`, top: `${y}%` }}
          >
            {/* The avatar is the anchor point. Name + clue are absolutely
                positioned beneath it, so they overflow downward and can never
                shove the avatar up toward the controls row. */}
            <div
              className={`relative transition-transform duration-300 ${isTurn ? 'scale-110' : ''} ${!p.alive ? 'opacity-30 grayscale' : ''}`}
            >
              {/* Unmistakable turn indicator: a labelled badge + bouncing arrow
                  above the pulsing ring (handled by .turn-ring). */}
              {isTurn && (
                <div className="pointer-events-none absolute -top-2 left-1/2 z-10 flex -translate-x-1/2 -translate-y-full flex-col items-center">
                  <span
                    className={`chip animate-bounce whitespace-nowrap border px-2 py-0.5 text-[10px] font-extrabold tracking-wider shadow-glow ${
                      p.id === selfId ? 'border-brand bg-brand text-white' : 'border-brand/60 bg-brand/20 text-brand'
                    }`}
                  >
                    {p.id === selfId ? `✏️ ${t('yourTurnBadge')}` : `✏️ ${t('turnBadge')}`}
                  </span>
                  <span className="-mt-0.5 text-brand">▾</span>
                </div>
              )}
              <Avatar player={p} size="md" ring={!isTurn} className={isTurn ? 'turn-ring' : ''} />
              {voted && (
                <span className="absolute -bottom-1 -right-1 grid h-5 w-5 place-items-center rounded-full bg-mint text-xs text-base">
                  ✓
                </span>
              )}
              {!p.alive && (
                <span className="absolute -bottom-1 -right-1 text-base" title={t('ejected')} aria-label={t('ejected')}>
                  💨
                </span>
              )}
            </div>
            <div className="absolute left-1/2 top-full mt-1 flex w-24 -translate-x-1/2 flex-col items-center gap-1">
              <span className="max-w-full truncate text-center text-xs font-semibold">
                {p.name}
                {p.id === selfId ? ` ·${t('you')}` : ''}
              </span>
              {lastClue && (
                <span
                  className="chip animate-pop max-w-full truncate border border-white/10 bg-raised/95 text-xs shadow-card"
                  title={lastClue.text}
                >
                  “{lastClue.text}”
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
