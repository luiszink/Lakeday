'use client';

import type { AttractionListResponse } from '@lake/domain';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';

import { distanceMeters, type LocalLocation } from '../location/local-location';
import { AttractionCard } from './attraction-card';

type DiscoverListProps = Readonly<{
  initialData: AttractionListResponse | null;
  initialError: boolean;
  locale: 'de' | 'en';
  location: LocalLocation | null;
  searchError: boolean;
  searchQuery?: string | undefined;
}>;

function LoadingSkeleton() {
  return (
    <div aria-hidden="true" className="space-y-5">
      {Array.from({ length: 3 }, (_, index) => (
        <div
          className="grid animate-pulse gap-4 border-b border-slate-800/80 py-5 sm:grid-cols-[12rem_1fr]"
          key={index}
        >
          <div className="min-h-44 rounded-lg bg-slate-900 sm:min-h-40" />
          <div className="space-y-4 py-2">
            <div className="h-3 w-28 rounded bg-slate-800" />
            <div className="h-7 w-3/4 rounded bg-slate-800" />
            <div className="h-4 w-1/2 rounded bg-slate-900" />
            <div className="h-4 w-2/3 rounded bg-slate-900" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function DiscoverList({
  initialData,
  initialError,
  locale,
  location,
  searchError,
  searchQuery,
}: DiscoverListProps) {
  const translate = useTranslations('discover');
  const [items, setItems] = useState(initialData?.items ?? []);
  const [nextCursor, setNextCursor] = useState(initialData?.nextCursor ?? null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(initialError);
  const sentinelReference = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setItems(initialData?.items ?? []);
    setNextCursor(initialData?.nextCursor ?? null);
    setError(initialError);
  }, [initialData, initialError, searchQuery]);

  async function loadNextPage() {
    if (!nextCursor || isLoading) return;
    setIsLoading(true);
    setError(false);
    try {
      const response = await fetch(
        `/api/attractions?locale=${locale}&limit=20${searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : ''}&cursor=${encodeURIComponent(nextCursor)}`,
      );
      if (!response.ok) throw new Error('Attractions request failed.');
      const page = (await response.json()) as AttractionListResponse;
      setItems((currentItems) => [...currentItems, ...page.items]);
      setNextCursor(page.nextCursor);
    } catch {
      setError(true);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    const sentinel = sentinelReference.current;
    if (!sentinel || !nextCursor) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void loadNextPage();
      },
      { rootMargin: '320px' },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [nextCursor, isLoading]);

  if (initialError && items.length === 0) {
    return (
      <section
        aria-live="polite"
        className="rounded-lg border border-rose-400/40 bg-rose-950/30 p-6"
      >
        <h2 className="text-lg font-semibold text-white">{translate('error.title')}</h2>
        <p className="mt-2 text-sm text-slate-300">{translate('error.description')}</p>
        <button
          className="mt-5 rounded-md bg-cyan-400 px-4 py-2 font-semibold text-slate-950 focus:outline-none focus:ring-2 focus:ring-cyan-300"
          onClick={() => window.location.reload()}
          type="button"
        >
          {translate('error.retry')}
        </button>
      </section>
    );
  }

  if (!initialData || items.length === 0) {
    return (
      <section
        aria-live="polite"
        className="rounded-lg border border-slate-800 bg-slate-900/60 p-6"
      >
        <h2 className="text-lg font-semibold text-white">
          {searchQuery ? translate('empty.searchTitle') : translate('empty.title')}
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          {searchQuery
            ? translate('empty.searchDescription', { query: searchQuery })
            : translate('empty.description')}
        </p>
      </section>
    );
  }

  return (
    <section aria-label={translate('resultsLabel')}>
      {searchError ? (
        <p
          aria-live="polite"
          className="mb-5 rounded-md border border-amber-300/30 bg-amber-950/20 p-4 text-sm text-amber-100"
        >
          {translate('search.fallback')}
        </p>
      ) : null}
      <div aria-live="polite" className="sr-only">
        {translate('resultCount', { count: initialData.total })}
      </div>
      <div>
        {items.map((attraction) => (
          <AttractionCard
            attraction={attraction}
            distanceM={
              location ? distanceMeters(location.coordinates, attraction.coordinates) : null
            }
            key={attraction.id}
          />
        ))}
      </div>
      {error ? (
        <div
          aria-live="polite"
          className="mt-5 rounded-md border border-rose-400/40 p-4 text-sm text-rose-200"
        >
          <p>{translate('error.description')}</p>
          <button
            className="mt-3 font-semibold underline"
            onClick={() => void loadNextPage()}
            type="button"
          >
            {translate('error.retry')}
          </button>
        </div>
      ) : null}
      {isLoading ? <LoadingSkeleton /> : null}
      {nextCursor && !isLoading ? (
        <button
          className="mt-5 w-full rounded-md border border-slate-700 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:border-cyan-300 hover:text-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-300"
          onClick={() => void loadNextPage()}
          type="button"
        >
          {translate('loadMore')}
        </button>
      ) : null}
      <div aria-hidden="true" className="h-px" ref={sentinelReference} />
    </section>
  );
}
