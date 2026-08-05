'use client';

import {
  attractionListResponseSchema,
  type AttractionListResponse,
  type FavoriteRecord,
} from '@lake/domain';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';

import { useRouter } from '../i18n/navigation';
import { distanceMeters, readLocalLocation, type LocalLocation } from '../location/local-location';
import { getFavoritesStore, parseFavoritesSnapshot } from '../local-store/favorites';
import { AttractionCard } from './attraction-card';
import { FilterPanel } from './filters/filter-panel';

const store = getFavoritesStore();
type SortMode = 'added' | 'distance' | 'relevance';

function cacheKey(locale: 'de' | 'en') {
  return `lake-favorites-cache-v1-${locale}`;
}

function readCache(locale: 'de' | 'en'): AttractionListResponse | null {
  try {
    const value = JSON.parse(localStorage.getItem(cacheKey(locale)) ?? 'null');
    const result = attractionListResponseSchema.safeParse(value);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

function writeCache(locale: 'de' | 'en', value: AttractionListResponse) {
  try {
    localStorage.setItem(cacheKey(locale), JSON.stringify(value));
  } catch {
    // A full or unavailable cache must not block the live request.
  }
}

type FavoritesExperienceProps = Readonly<{ locale: 'de' | 'en' }>;

export function FavoritesExperience({ locale }: FavoritesExperienceProps) {
  const translate = useTranslations('screens.favorites');
  const router = useRouter();
  const searchParams = useSearchParams();
  const filterQuery = searchParams.toString();
  const snapshot = useSyncExternalStore(
    (listener) => store.subscribe(listener),
    () => store.getSnapshot(),
    () => 'unknown|',
  );
  const [records, setRecords] = useState<readonly FavoriteRecord[]>([]);
  const [items, setItems] = useState<AttractionListResponse['items']>([]);
  const [location, setLocation] = useState<LocalLocation | null>(null);
  const [sort, setSort] = useState<SortMode>('added');
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isStale, setIsStale] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const { ids, mode } = parseFavoritesSnapshot(snapshot);

  useEffect(() => {
    void store.hydrate();
    setLocation(readLocalLocation());
    const updateConnection = () => setIsOffline(!navigator.onLine);
    updateConnection();
    window.addEventListener('online', updateConnection);
    window.addEventListener('offline', updateConnection);
    return () => {
      window.removeEventListener('online', updateConnection);
      window.removeEventListener('offline', updateConnection);
    };
  }, []);

  useEffect(() => {
    if (mode === 'unknown') return;
    let cancelled = false;
    const requestedIds = [...ids];
    void store.getAll().then((nextRecords) => {
      if (!cancelled) setRecords(nextRecords);
    });

    if (requestedIds.length === 0) {
      setItems([]);
      setHasError(false);
      setIsStale(false);
      setIsLoading(false);
      return () => {
        cancelled = true;
      };
    }

    const cached = readCache(locale);
    const cachedItems = cached?.items.filter((item) => ids.has(item.id)) ?? [];
    if (cachedItems.length > 0) {
      setItems(cachedItems);
      setIsStale(true);
    } else {
      setItems([]);
    }
    setIsLoading(true);
    setHasError(false);
    const parameters = new URLSearchParams(filterQuery);
    parameters.set('ids', requestedIds.join(','));
    parameters.set('limit', '100');
    parameters.set('locale', locale);

    void fetch(`/api/attractions?${parameters.toString()}`)
      .then(async (response) => {
        if (!response.ok) throw new Error('Favorites request failed.');
        const result = attractionListResponseSchema.safeParse(await response.json());
        if (!result.success) throw new Error('Favorites response was invalid.');
        if (cancelled) return;
        setItems(result.data.items);
        setIsStale(false);
        setHasError(false);
        writeCache(locale, result.data);
      })
      .catch(() => {
        if (cancelled) return;
        setHasError(cachedItems.length === 0);
        setIsStale(cachedItems.length > 0);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [filterQuery, locale, mode, snapshot]);

  const sortedItems = useMemo(() => {
    const addedAtById = new Map(records.map((record) => [record.attractionId, record.addedAt]));
    const originalOrder = new Map(items.map((item, index) => [item.id, index]));
    return [...items].sort((left, right) => {
      if (sort === 'added') {
        return (addedAtById.get(right.id) ?? '').localeCompare(addedAtById.get(left.id) ?? '');
      }
      if (sort === 'distance' && location) {
        return (
          distanceMeters(location.coordinates, left.coordinates) -
          distanceMeters(location.coordinates, right.coordinates)
        );
      }
      return (originalOrder.get(left.id) ?? 0) - (originalOrder.get(right.id) ?? 0);
    });
  }, [items, location, records, sort]);

  const unresolvedIds = [...ids].filter((id) => !items.some((item) => item.id === id));

  function changeSort(nextSort: SortMode) {
    if (nextSort === 'distance' && !location) return;
    setSort(nextSort);
  }

  if (mode === 'unknown' || isLoading && items.length === 0 && ids.size > 0) {
    return <p className="text-sm text-slate-400">{translate('loading')}</p>;
  }

  if (hasError && items.length === 0) {
    return (
      <section className="rounded-lg border border-rose-400/40 bg-rose-950/30 p-6" role="alert">
        <h2 className="text-lg font-semibold text-white">{translate('error.title')}</h2>
        <p className="mt-2 text-sm text-slate-300">{translate('error.description')}</p>
        <button
          className="mt-5 rounded-md bg-cyan-400 px-4 py-2 font-semibold text-slate-950 focus:outline-none focus:ring-2 focus:ring-cyan-300"
          onClick={() => router.refresh()}
          type="button"
        >
          {translate('error.retry')}
        </button>
      </section>
    );
  }

  if (items.length === 0 && unresolvedIds.length === 0) {
    return (
      <section className="rounded-lg border border-slate-800 bg-slate-900/60 p-6">
        <h2 className="text-lg font-semibold text-white">{translate('empty.title')}</h2>
        <p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">
          {translate('empty.description')}
        </p>
        <Link
          className="mt-5 inline-flex rounded-md bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 focus:outline-none focus:ring-2 focus:ring-cyan-300"
          href="/"
        >
          {translate('empty.cta')}
        </Link>
      </section>
    );
  }

  return (
    <section aria-label={translate('resultsLabel')}>
      {isOffline || isStale ? (
        <p className="mb-5 rounded-md border border-amber-300/30 bg-amber-950/20 p-4 text-sm text-amber-100">
          {isOffline ? translate('offline') : translate('stale')}
        </p>
      ) : null}
      <FilterPanel
        initialQuery={filterQuery}
        initialTotal={items.length}
        locale={locale}
        location={location}
        preservedQuery={`ids=${encodeURIComponent([...ids].join(','))}`}
      />
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <label className="text-sm font-semibold text-slate-300" htmlFor="favorites-sort">
          {translate('sort.label')}
        </label>
        <select
          className="min-h-10 rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-slate-200 outline-none focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/30"
          id="favorites-sort"
          onChange={(event) => changeSort(event.target.value as SortMode)}
          value={sort}
        >
          <option value="added">{translate('sort.added')}</option>
          <option disabled={!location} value="distance">
            {translate('sort.distance')}
          </option>
          <option value="relevance">{translate('sort.relevance')}</option>
        </select>
        {!location ? <span className="text-sm text-amber-200">{translate('sort.locationRequired')}</span> : null}
      </div>
      <div>
        {sortedItems.map((item) => (
          <AttractionCard
            attraction={item}
            distanceM={location ? distanceMeters(location.coordinates, item.coordinates) : null}
            key={item.id}
          />
        ))}
      </div>
      {unresolvedIds.length > 0 ? (
        <div className="mt-5 space-y-3">
          {unresolvedIds.map((id) => (
            <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4" key={id}>
              <p className="text-sm text-slate-300">{translate('unavailable')}</p>
              <button
                className="mt-3 text-sm font-semibold text-cyan-300 underline focus:outline-none focus:ring-2 focus:ring-cyan-300"
                onClick={() => void store.remove(id)}
                type="button"
              >
                {translate('remove')}
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}