// client/src/components/HomeScreen.tsx
import { useEffect, useState, type FormEvent } from 'react';
import { setLanguage, useT } from '../i18n';
import { socket } from '../socket';
import type { JoinResult } from '../types';

export default function HomeScreen({ onJoined }: { onJoined: (selfId: string) => void }) {
  const { lang, t } = useT();
  const [name, setName] = useState(() => localStorage.getItem('impostor:name') ?? '');
  const [avatar, setAvatar] = useState<string | null>(() => localStorage.getItem('impostor:avatar') || null);
  const [pool, setPool] = useState<string[]>([]);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(0);

  // The pfp pool: every PNG you drop into server/avatars/ shows up here.
  useEffect(() => {
    fetch('/api/avatars')
      .then((r) => r.json())
      .then((d: { avatars: string[] }) => {
        setPool(d.avatars);
        setAvatar((cur) => {
          if (cur && d.avatars.includes(cur)) return cur;
          return d.avatars.length ? d.avatars[Math.floor(Math.random() * d.avatars.length)] : null;
        });
      })
      .catch(() => setPool([]));
  }, []);

  const randomize = () => {
    if (pool.length === 0) return;
    if (pool.length === 1) return setAvatar(pool[0]);
    let next = avatar;
    while (next === avatar) next = pool[Math.floor(Math.random() * pool.length)];
    setAvatar(next);
  };

  const fail = (message: string) => {
    setError(message);
    setShake((s) => s + 1);
    setBusy(false);
  };

  const handle = (res: JoinResult) => {
    if (res.ok) {
      localStorage.setItem('impostor:name', name.trim());
      if (avatar) localStorage.setItem('impostor:avatar', avatar);
      onJoined(res.selfId);
    } else fail(res.error);
  };

  const create = () => {
    if (!name.trim()) return fail(t('pickName'));
    setBusy(true);
    setError(null);
    socket.emit('room:create', { name: name.trim(), avatar, language: lang }, handle);
  };

  const join = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return fail(t('pickName'));
    if (!code.trim()) return fail(t('enterCode'));
    setBusy(true);
    setError(null);
    socket.emit('room:join', { code: code.trim(), name: name.trim(), avatar }, handle);
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-5 px-5 py-8">
      {/* Language — the first decision on the first screen */}
      <div className="flex justify-center gap-2" role="group" aria-label="Language / Idioma">
        <button
          className={`chip border transition-colors ${lang === 'en' ? 'border-violet bg-violet/20 text-ink' : 'border-white/10 bg-white/[0.05] text-muted hover:bg-white/[0.1]'}`}
          onClick={() => setLanguage('en')}
          aria-pressed={lang === 'en'}
        >
          🇬🇧 English
        </button>
        <button
          className={`chip border transition-colors ${lang === 'es' ? 'border-violet bg-violet/20 text-ink' : 'border-white/10 bg-white/[0.05] text-muted hover:bg-white/[0.1]'}`}
          onClick={() => setLanguage('es')}
          aria-pressed={lang === 'es'}
        >
          🇪🇸 Español
        </button>
      </div>

      <header className="text-center">
        <img
          src="/logo.png"
          alt="IMPOSTOR"
          className="mx-auto w-full max-w-[20rem] animate-float drop-shadow-[0_8px_24px_rgba(251,2,54,0.35)] sm:max-w-[24rem]"
        />
        <p className="mt-3 text-muted">{t('tagline')}</p>
      </header>

      <section key={shake} className={`glass space-y-4 p-6 ${error ? 'animate-shake' : 'animate-rise'}`}>
        {/* Name + pfp side by side */}
        <div className="flex items-end gap-3">
          <div className="flex flex-col items-center gap-1.5">
            <span className="text-xs font-bold uppercase tracking-wide text-muted">{t('yourPfp')}</span>
            <span className="grid h-20 w-20 place-items-center overflow-hidden rounded-full border-[3px] border-brand bg-base/60 shadow-[0_4px_0_0_rgba(120,0,20,0.8),0_0_30px_-8px_rgba(251,2,54,0.6)]">
              {avatar ? (
                <img src={`/avatars/${avatar}`} alt="" className="h-full w-full object-cover" draggable={false} />
              ) : (
                <span className="text-3xl" aria-hidden>
                  🎭
                </span>
              )}
            </span>
            <button
              type="button"
              className="btn-ghost px-3 py-1 text-xs"
              onClick={randomize}
              disabled={pool.length === 0}
              title={pool.length === 0 ? t('noAvatars') : t('randomize')}
            >
              🎲 {t('randomize')}
            </button>
          </div>
          <label className="block flex-1">
            <span className="mb-1.5 block text-sm font-medium text-muted">{t('yourName')}</span>
            <input
              className="input"
              value={name}
              maxLength={16}
              placeholder={t('namePlaceholder')}
              onChange={(e) => setName(e.target.value)}
              autoComplete="off"
            />
          </label>
        </div>
        {pool.length === 0 && <p className="text-center text-xs text-muted/60">{t('noAvatars')}</p>}

        <button className="btn-hero w-full text-lg" onClick={create} disabled={busy}>
          {t('openTable')}
        </button>

        <div className="flex items-center gap-3 text-xs uppercase tracking-widest text-muted/70">
          <span className="h-px flex-1 bg-white/10" /> {t('orJoin')} <span className="h-px flex-1 bg-white/10" />
        </div>

        <form onSubmit={join} className="flex gap-2">
          <input
            className="input flex-1 font-mono uppercase tracking-wider"
            value={code}
            placeholder="TIGER-MOON-42"
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            autoComplete="off"
          />
          <button type="submit" className="btn-ghost" disabled={busy}>
            {t('join')}
          </button>
        </form>

        {error && (
          <p role="alert" className="text-sm font-medium text-danger">
            {error}
          </p>
        )}
      </section>

      <footer className="text-center text-xs text-muted/60">{t('footerHome')}</footer>
    </main>
  );
}
