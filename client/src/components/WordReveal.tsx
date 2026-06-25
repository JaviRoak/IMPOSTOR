// client/src/components/WordReveal.tsx
import { useEffect, useRef, useState } from 'react';
import { useT } from '../i18n';
import type { WordAssignment } from '../types';

const HOLD_MS = 800;

/** The envelope: press and hold to tear it open. Citizens see the word;
 *  the Impostor sees their role — and a clue, if the host enabled it. */
export default function WordReveal({ word }: { word: WordAssignment }) {
  const { t } = useT();
  const [progress, setProgress] = useState(0);
  const [open, setOpen] = useState(false);
  const raf = useRef<number | null>(null);
  const start = useRef<number | null>(null);

  const stop = () => {
    if (raf.current) cancelAnimationFrame(raf.current);
    raf.current = null;
    start.current = null;
    setProgress((p) => (p >= 100 ? p : 0));
  };

  const hold = () => {
    if (open) return;
    start.current = performance.now();
    const tick = (now: number) => {
      const p = Math.min(100, ((now - (start.current ?? now)) / HOLD_MS) * 100);
      setProgress(p);
      if (p >= 100) {
        setOpen(true);
        stop();
      } else {
        raf.current = requestAnimationFrame(tick);
      }
    };
    raf.current = requestAnimationFrame(tick);
  };

  useEffect(() => stop, []);

  if (open) {
    if (word.isImpostor) {
      return (
        <div className="animate-pop text-center">
          <p className="text-sm font-bold uppercase tracking-widest text-danger">🤫 {t('youAreImpostor')}</p>
          {word.clue ? (
            <>
              <p className="mt-2 text-xs uppercase tracking-widest text-muted">{t('yourClue')}</p>
              <p className="my-1 font-display text-4xl font-extrabold text-candy sm:text-5xl">{word.clue}</p>
            </>
          ) : (
            <p className="mx-auto mt-2 max-w-[16rem] text-sm text-amber">{t('noClueThisGame')}</p>
          )}
          <span className="chip mt-2 bg-white/[0.07] text-muted">📂 {word.category}</span>
          <p className="mt-3 text-sm text-muted">{t('blendIn')}</p>
        </div>
      );
    }
    return (
      <div className="animate-pop text-center">
        <p className="text-sm font-medium uppercase tracking-widest text-muted">{t('yourSecretWord')}</p>
        <p className="word-display my-2 text-5xl sm:text-6xl">{word.word}</p>
        <span className="chip bg-white/[0.07] text-muted">📂 {word.category}</span>
        <p className="mt-4 text-sm text-muted">{t('dontSayIt')}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <button
        className="relative grid h-36 w-36 select-none place-items-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky"
        onPointerDown={hold}
        onPointerUp={stop}
        onPointerLeave={stop}
        onKeyDown={(e) => e.key === 'Enter' && hold()}
        onKeyUp={(e) => e.key === 'Enter' && stop()}
        aria-label={t('holdToOpen')}
      >
        <span className="hold-ring absolute inset-0 rounded-full" style={{ ['--p' as string]: progress }} />
        <span className="absolute inset-1.5 grid place-items-center rounded-full bg-raised text-6xl shadow-card">✉️</span>
      </button>
      <p className="text-sm text-muted">
        <span className="font-semibold text-ink">{t('hold')}</span> — {t('holdToOpen')}
      </p>
    </div>
  );
}
