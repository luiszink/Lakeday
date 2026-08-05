'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState, useSyncExternalStore } from 'react';

import {
  getFavoritesStore,
  parseFavoritesSnapshot,
} from '../../local-store/favorites';

const store = getFavoritesStore();

type FavoriteToggleProps = Readonly<{
  attractionId: string;
  name: string;
  className?: string;
}>;

export function FavoriteToggle({ attractionId, name, className }: FavoriteToggleProps) {
  const translate = useTranslations('favorites');
  const snapshot = useSyncExternalStore(
    (listener) => store.subscribe(listener),
    () => store.getSnapshot(),
    () => 'unknown|',
  );
  const { ids, mode } = parseFavoritesSnapshot(snapshot);
  const isFavorite = ids.has(attractionId);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    void store.hydrate();
  }, []);

  async function toggle() {
    if (pending) return;
    setPending(true);
    try {
      if (isFavorite) await store.remove(attractionId);
      else await store.add(attractionId);
    } finally {
      setPending(false);
    }
  }

  const label = translate(isFavorite ? 'remove' : 'add', { name });
  return (
    <div className={className}>
      <button
        aria-label={label}
        aria-pressed={isFavorite}
        className="flex size-11 shrink-0 items-center justify-center rounded-full border border-slate-700 text-xl text-slate-300 transition hover:border-cyan-300 hover:text-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-300 disabled:cursor-wait disabled:opacity-60"
        disabled={pending}
        onClick={() => void toggle()}
        title={label}
        type="button"
      >
        <span aria-hidden="true">{isFavorite ? '♥' : '♡'}</span>
      </button>
      {mode === 'session' ? (
        <p className="mt-2 max-w-48 text-right text-xs text-amber-200">{translate('sessionOnly')}</p>
      ) : null}
    </div>
  );
}