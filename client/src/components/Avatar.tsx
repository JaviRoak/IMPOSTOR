// client/src/components/Avatar.tsx
import type { PlayerState } from '../types';

/** Renders a player's PNG profile picture from /avatars/<file>, falling back
 *  to their assigned emoji when none is set. */
export default function Avatar({
  player,
  size = 'md',
  ring = true,
  className = '',
}: {
  player: Pick<PlayerState, 'emoji' | 'avatar' | 'color' | 'name'>;
  size?: 'sm' | 'md' | 'lg';
  ring?: boolean;
  className?: string;
}) {
  const px = { sm: 'h-9 w-9 text-lg', md: 'h-12 w-12 text-2xl sm:h-14 sm:w-14', lg: 'h-20 w-20 text-4xl' }[size];
  return (
    <span
      className={`grid place-items-center overflow-hidden rounded-full ${px} ${className}`}
      style={{
        backgroundColor: `${player.color}26`,
        boxShadow: ring ? `0 0 0 2px ${player.color}` : undefined,
      }}
    >
      {player.avatar ? (
        <img
          src={`/avatars/${player.avatar}`}
          alt={player.name}
          className="h-full w-full object-cover"
          draggable={false}
        />
      ) : (
        <span aria-hidden>{player.emoji}</span>
      )}
    </span>
  );
}
