// client/src/components/Timer.tsx
import { useEffect, useState } from 'react';

/** Renders the seconds remaining until a server epoch timestamp. The server
 *  decides phase transitions (GDD §12.3); this is purely a display. */
export default function Timer({ endsAt }: { endsAt: number | null }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (endsAt === null) return;
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [endsAt]);

  if (endsAt === null) return null;
  const secs = Math.max(0, Math.ceil((endsAt - now) / 1000));
  const urgent = secs <= 5;

  return (
    <span
      className={`chip font-mono text-base tabular-nums ${
        urgent ? 'bg-danger/20 text-danger' : 'bg-white/[0.07] text-ink'
      }`}
      aria-live="polite"
      aria-label={`${secs} seconds remaining`}
    >
      ⏱ {secs}s
    </span>
  );
}
