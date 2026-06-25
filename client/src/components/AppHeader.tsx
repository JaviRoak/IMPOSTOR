// ── NEW FILE: client/src/components/AppHeader.tsx ───────────────────────────
// One constant header shared by the Lobby and the Game screens, so the top of
// the app never shifts around. Layout: brand (left) · room-code pill (center,
// copyable) · Leave (right). The room pill no longer collides with anything —
// it has its own column and truncates gracefully on small screens.
import { useState } from 'react';
import { useT } from '../i18n';

export default function AppHeader({ code, onLeave }: { code: string; onLeave: () => void }) {
  const { t } = useT();
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      /* code is visible anyway */
    }
  };

  return (
    <header className="sticky top-0 z-30 -mx-4 mb-1 border-b border-white/[0.06] bg-base/80 px-4 py-2.5 backdrop-blur-md sm:-mx-5 sm:px-5">
      <div className="mx-auto grid w-full max-w-3xl grid-cols-[auto_1fr_auto] items-center gap-2">
        {/* Brand — the logo wordmark (compass icon alone on the narrowest screens) */}
        <div className="flex min-w-0 items-center">
          <img src="/logo.png" alt="IMPOSTOR" className="hidden h-7 w-auto xs:block sm:h-8" />
          <img src="/favicon-512.png" alt="IMPOSTOR" className="h-7 w-7 xs:hidden" />
        </div>

        {/* Room code — its own centered column, copyable, truncates safely */}
        <div className="flex min-w-0 justify-center">
          <button
            onClick={copy}
            className="chip min-w-0 max-w-full border border-brand/40 bg-brand/10 hover:bg-brand/20"
            title={code}
          >
            <span className="text-[10px] font-semibold uppercase tracking-widest text-muted">{t('roomLabel')}</span>
            <span
              className="truncate font-mono text-sm font-bold tracking-wider sm:text-base"
              style={{ color: '#FB0236' }}
            >
              {code}
            </span>
            <span aria-hidden className="text-xs" style={{ color: '#FB0236' }}>
              {copied ? '✓' : '⧉'}
            </span>
          </button>
        </div>

        {/* Leave */}
        <button className="btn-ghost px-3 py-1.5 text-sm" onClick={onLeave}>
          <span aria-hidden>←</span> <span className="hidden sm:inline">{t('leave')}</span>
        </button>
      </div>
    </header>
  );
}
