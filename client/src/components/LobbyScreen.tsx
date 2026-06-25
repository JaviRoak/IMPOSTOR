// ── CHANGED FILE: client/src/components/LobbyScreen.tsx ────────────────────
// Added: offline fallback for the category dropdown (demo mode / backend
// down). Real flow unchanged — the fallback only runs when /api fails.
import { useEffect, useState } from 'react';
import { useT } from '../i18n';
import { socket } from '../socket';
import type { PublicRoomState } from '../types';
import Avatar from './Avatar';
import AppHeader from './AppHeader';

interface CategoryOption {
  id: string;
  label: string;
}

export default function LobbyScreen({
  room,
  selfId,
  onLeave,
}: {
  room: PublicRoomState;
  selfId: string;
  onLeave: () => void;
}) {
  const { t } = useT();
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [customText, setCustomText] = useState('');

  const self = room.players.find((p) => p.id === selfId)!;
  const isHost = room.hostId === selfId;
  const othersReady = room.players.filter((p) => p.id !== room.hostId).every((p) => p.ready);
  const enough = room.players.length >= room.minPlayers;
  const s = room.settings;
  const customOk = s.category !== 'custom' || s.customWordsCount >= 5;

  // Localized category list — the room language is fixed by the host.
  useEffect(() => {
    fetch(`/api/categories?lang=${s.language}`)
      .then((r) => r.json())
      .then((d: { categories: CategoryOption[] }) => setCategories(d.categories))
      .catch(() =>
        // Offline fallback (demo mode / backend down) — mirrors the server list.
        setCategories(
          s.language === 'es'
            ? [
                { id: 'all', label: 'Todas las categorías' },
                { id: 'animals', label: 'Animales' },
                { id: 'food', label: 'Comida' },
                { id: 'tech', label: 'Tecnología' },
                { id: 'custom', label: 'Lista personalizada' },
              ]
            : [
                { id: 'all', label: 'All categories' },
                { id: 'animals', label: 'Animals' },
                { id: 'food', label: 'Food' },
                { id: 'tech', label: 'Technology' },
                { id: 'custom', label: 'Custom list' },
              ],
        ),
      );
  }, [s.language]);

  const saveCustomWords = () => {
    const words = customText.split('\n').map((w) => w.trim()).filter(Boolean);
    socket.emit('room:settings', { customWords: words });
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-5 px-4 py-4 sm:px-5">
      <AppHeader code={room.code} onLeave={onLeave} />

      <section className="text-center">
        <h2 className="font-display text-2xl font-bold sm:text-3xl">{t('tableSet')}</h2>
        <p className="mt-1 text-muted">
          {room.players.length}/{room.maxPlayers} {t('seated')}
          {!enough && ` — ${t('needMore', { n: room.minPlayers - room.players.length })}`}
        </p>
      </section>

      {/* Host settings — clue toggle, category, custom word list */}
      <section className="glass space-y-4 p-5">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted">
          {isHost ? t('gameSettings') : t('hostSetsUp')}
        </h3>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="flex-1">
            <span className="mb-1 block text-sm font-medium text-muted">{t('category')}</span>
            <select
              className="input appearance-none"
              value={s.category}
              disabled={!isHost}
              onChange={(e) => socket.emit('room:settings', { category: e.target.value })}
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>

          <div className="flex-1">
            <span className="mb-1 block text-sm font-medium text-muted">{t('impostorClue')}</span>
            <button
              type="button"
              role="switch"
              aria-checked={s.clueEnabled}
              disabled={!isHost || s.category === 'custom'}
              onClick={() => socket.emit('room:settings', { clueEnabled: !s.clueEnabled })}
              className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 transition-colors disabled:opacity-50 ${
                s.clueEnabled ? 'border-mint/50 bg-mint/10 text-mint' : 'border-white/10 bg-base/60 text-muted'
              }`}
            >
              <span className="font-semibold">{s.clueEnabled ? t('clueOn') : t('clueOff')}</span>
              <span
                className={`relative h-6 w-11 rounded-full transition-colors ${s.clueEnabled ? 'bg-mint' : 'bg-white/15'}`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${s.clueEnabled ? 'left-[1.4rem]' : 'left-0.5'}`}
                />
              </span>
            </button>
          </div>
        </div>
        <p className="text-xs text-muted/80">
          {s.category === 'custom' ? t('customHint') : s.clueEnabled ? t('clueOnHint') : t('clueOffHint')}
        </p>

        {/* Answer time — seconds per clue turn */}
        <div>
          <span className="mb-1 block text-sm font-medium text-muted">{t('answerTime')}</span>
          <div className="grid grid-cols-4 gap-1.5" role="group" aria-label={t('answerTime')}>
            {[15, 25, 40, 60].map((sec) => {
              const active = s.clueSeconds === sec;
              return (
                <button
                  key={sec}
                  type="button"
                  disabled={!isHost}
                  aria-pressed={active}
                  onClick={() => socket.emit('room:settings', { clueSeconds: sec })}
                  className={`rounded-2xl border py-2.5 text-sm font-semibold transition-colors disabled:opacity-50 ${
                    active
                      ? 'border-violet bg-violet/20 text-ink'
                      : 'border-white/10 bg-base/60 text-muted hover:bg-base/80'
                  }`}
                >
                  {t('secondsShort', { n: sec })}
                </button>
              );
            })}
          </div>
          <p className="mt-1 text-xs text-muted/80">{t('answerTimeHint')}</p>
        </div>

        {/* Impostor last chance — final guess after being caught */}
        <div>
          <span className="mb-1 block text-sm font-medium text-muted">{t('lastChance')}</span>
          <button
            type="button"
            role="switch"
            aria-checked={s.lastChance}
            disabled={!isHost}
            onClick={() => socket.emit('room:settings', { lastChance: !s.lastChance })}
            className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 transition-colors disabled:opacity-50 ${
              s.lastChance ? 'border-mint/50 bg-mint/10 text-mint' : 'border-white/10 bg-base/60 text-muted'
            }`}
          >
            <span className="font-semibold">{s.lastChance ? t('lcOn') : t('lcOff')}</span>
            <span className={`relative h-6 w-11 rounded-full transition-colors ${s.lastChance ? 'bg-mint' : 'bg-white/15'}`}>
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${s.lastChance ? 'left-[1.4rem]' : 'left-0.5'}`}
              />
            </span>
          </button>
          <p className="mt-1 text-xs text-muted/80">{s.lastChance ? t('lastChanceOnHint') : t('lastChanceOffHint')}</p>
        </div>

        {/* Personalized word list */}
        {s.category === 'custom' && (
          <div className="animate-rise space-y-2">
            {isHost ? (
              <>
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-muted">{t('customWords')}</span>
                  <textarea
                    className="input min-h-28 resize-y font-mono text-sm"
                    placeholder={t('customPlaceholder')}
                    value={customText}
                    onChange={(e) => setCustomText(e.target.value)}
                  />
                </label>
                <div className="flex items-center gap-3">
                  <button className="btn-ghost px-4 py-2 text-sm" onClick={saveCustomWords}>
                    {t('saveList')}
                  </button>
                  <span className={`text-sm ${customOk ? 'text-mint' : 'text-muted'}`}>
                    {t('wordsSaved', { n: s.customWordsCount })}
                  </span>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted">
                📝 {t('customWords')}: <span className="font-semibold text-ink">{t('wordsSaved', { n: s.customWordsCount })}</span>
              </p>
            )}
          </div>
        )}
      </section>

      {/* Roster */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {room.players.map((p) => (
          <article
            key={p.id}
            className={`glass animate-pop flex flex-col items-center gap-1.5 p-4 transition-colors ${
              p.ready || p.isHost ? 'border-mint/40' : ''
            }`}
          >
            <Avatar player={p} size="lg" />
            <span className="max-w-full truncate font-semibold">
              {p.isHost && <span title={t('host')}>👑 </span>}
              {p.name}
              {p.id === selfId && <span className="text-muted"> ({t('you')})</span>}
            </span>
            <span className={`chip text-xs ${p.ready || p.isHost ? 'bg-mint/15 text-mint' : 'bg-white/5 text-muted'}`}>
              {p.isHost ? t('host') : p.ready ? t('ready') : t('notReady')}
            </span>
          </article>
        ))}
        {Array.from({ length: Math.max(0, room.minPlayers - room.players.length) }).map((_, i) => (
          <article
            key={`empty-${i}`}
            className="grid place-items-center rounded-card border-2 border-dashed border-white/10 p-4 text-muted/50"
          >
            {t('emptySeat')}
          </article>
        ))}
      </section>

      <section className="mt-auto space-y-3">
        {isHost ? (
          <>
            <button
              className="btn-hero w-full text-lg"
              onClick={() => socket.emit('game:start')}
              disabled={!enough || !othersReady || !customOk}
            >
              {t('dealWords')}
            </button>
            {!othersReady && enough && <p className="text-center text-sm text-muted">{t('waitingReady')}</p>}
          </>
        ) : (
          <button
            className={`btn w-full text-lg ${self.ready ? 'bg-mint/20 text-mint' : 'btn-hero'}`}
            onClick={() => socket.emit('player:ready', { ready: !self.ready })}
          >
            {self.ready ? t('readyUndo') : t('imReady')}
          </button>
        )}
        <p className="text-center text-xs text-muted/60">{t('shareCode')}</p>
      </section>
    </main>
  );
}
