'use client';

import type { AttractionListResponse } from '@lake/domain';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';

import { createMapProvider } from '../../providers/map';
import { MapFailureBreaker } from '../../providers/map/failure-breaker';
import type {
  MapAttribution as MapAttributionData,
  MapBounds,
  MapCoordinate,
  MapProvider,
  MapProviderConfig,
  MapViewport,
} from '../../providers/map/types';
import { AttractionCard } from '../attraction-card';
import { MapAttribution } from './attribution';

const wholeLakeBounds: MapBounds = {
  east: 10.7,
  north: 48.1,
  south: 47.1,
  west: 8.3,
};

type MapExperienceProps = Readonly<{
  initialData: AttractionListResponse | null;
  initialError: boolean;
  locale: 'de' | 'en';
  providerConfig: MapProviderConfig;
  providerKind: 'fake' | 'maplibre';
  searchQuery?: string | undefined;
}>;

type LoadState = 'loading' | 'ready' | 'error';

function markerCoordinates(coordinates: MapCoordinate) {
  return { latitude: coordinates.latitude, longitude: coordinates.longitude };
}

export function MapExperience({
  initialData,
  initialError,
  locale,
  providerConfig,
  providerKind,
  searchQuery,
}: MapExperienceProps) {
  const translate = useTranslations('map');
  const mapContainer = useRef<HTMLDivElement>(null);
  const provider = useRef<MapProvider | null>(null);
  const [items, setItems] = useState(initialData?.items ?? []);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [areaLoading, setAreaLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [truncated, setTruncated] = useState(initialData?.truncated ?? false);
  const [viewport, setViewport] = useState<MapViewport | null>(null);
  const [attribution, setAttribution] = useState<MapAttributionData | null>(null);
  const [requestError, setRequestError] = useState(initialError);
  const [providerFailed, setProviderFailed] = useState(false);
  const [retryAttempts, setRetryAttempts] = useState(0);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    const container = mapContainer.current;
    if (!container) return;

    const mapProvider = createMapProvider(providerKind, providerConfig);
    const failureBreaker = new MapFailureBreaker();
    provider.current = mapProvider;
    setAttribution(mapProvider.getAttribution());
    setProviderFailed(false);

    function handleMarkerClick(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const marker = target.closest<HTMLElement>('[data-marker-id]');
      if (marker?.dataset.markerId) setSelectedId(marker.dataset.markerId);
    }

    container.addEventListener('click', handleMarkerClick);
    let disposed = false;
    const handleProviderError = () => {
      if (disposed || !failureBreaker.recordFailure()) return;
      setProviderFailed(true);
      setLoadState('error');
      mapProvider.destroy();
      window.dispatchEvent(
        new CustomEvent('map:provider-failure', {
          detail: { provider: providerConfig.providerName },
        }),
      );
    };
    const unsubscribeError = mapProvider.onError(handleProviderError);
    void mapProvider
      .init(container)
      .then(() => {
        if (disposed) return;
        mapProvider.fitBounds(wholeLakeBounds);
        mapProvider.setMarkers(
          (initialData?.items ?? []).map((item) => ({
            coordinates: markerCoordinates(item.coordinates),
            id: item.id,
            label: item.name,
          })),
          { enabled: (initialData?.items.length ?? 0) > 50, minPoints: 50 },
        );
        setLoadState('ready');
      })
      .catch(() => {
        if (!disposed) {
          setProviderFailed(true);
          setLoadState('error');
        }
      });

    const unsubscribe = mapProvider.onViewportChange((nextViewport) => {
      if (!disposed) setViewport(nextViewport);
    });

    return () => {
      disposed = true;
      unsubscribeError();
      unsubscribe();
      container.removeEventListener('click', handleMarkerClick);
      mapProvider.destroy();
      provider.current = null;
    };
  }, [initialData, providerConfig, providerKind, retryKey]);

  useEffect(() => {
    if (!providerFailed || retryAttempts >= 2) return;
    const retryDelay = 1_000 * 2 ** retryAttempts;
    const timeoutId = window.setTimeout(() => {
      setProviderFailed(false);
      setLoadState('loading');
      setRetryAttempts((current) => current + 1);
      setRetryKey((current) => current + 1);
    }, retryDelay);
    return () => window.clearTimeout(timeoutId);
  }, [providerFailed, retryAttempts]);

  async function searchArea() {
    const bounds = viewport?.bounds ?? wholeLakeBounds;
    setAreaLoading(true);
    setRequestError(false);
    try {
      const query = new URLSearchParams({
        bbox: [bounds.west, bounds.south, bounds.east, bounds.north].join(','),
        limit: '200',
        locale,
      });
      if (searchQuery) query.set('q', searchQuery);
      const response = await fetch(`/api/attractions?${query.toString()}`);
      if (!response.ok) throw new Error('Map query failed.');
      const data = (await response.json()) as AttractionListResponse;
      setItems(data.items);
      setTruncated(data.truncated ?? false);
      provider.current?.setMarkers(
        data.items.map((item) => ({
          coordinates: markerCoordinates(item.coordinates),
          id: item.id,
          label: item.name,
        })),
        { enabled: data.items.length > 50, minPoints: 50 },
      );
    } catch {
      setRequestError(true);
    } finally {
      setAreaLoading(false);
    }
  }

  function focusAttraction(id: string) {
    setSelectedId(id);
    provider.current?.focusMarker(id);
  }

  function retryProvider() {
    setProviderFailed(false);
    setLoadState('loading');
    setRetryAttempts(0);
    setRetryKey((current) => current + 1);
  }

  const selected = items.find((item) => item.id === selectedId) ?? null;

  return (
    <section aria-label={translate('title')} className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-400">
          {translate('markerCount', { count: items.length })}
        </p>
        <button
          className="rounded-md bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-300 disabled:cursor-wait disabled:opacity-60"
          disabled={areaLoading || loadState !== 'ready'}
          onClick={searchArea}
          type="button"
        >
          {areaLoading ? translate('searching') : translate('areaSearch')}
        </button>
      </div>

      <div className="relative overflow-hidden rounded-lg border border-slate-800 bg-slate-900">
        <div
          aria-busy={loadState === 'loading'}
          aria-label={translate('title')}
          className="min-h-[34rem] bg-[radial-gradient(circle_at_30%_20%,rgba(34,211,238,0.14),transparent_32%),linear-gradient(135deg,#0f172a,#172554)] p-4"
          ref={mapContainer}
          role="application"
          tabIndex={0}
        />
        {loadState === 'loading' ? (
          <p className="absolute inset-0 flex items-center justify-center bg-slate-950/60 text-sm text-slate-300">
            {translate('loading')}
          </p>
        ) : null}
        {loadState === 'error' ? (
          <p className="absolute inset-0 flex items-center justify-center bg-slate-950/80 px-6 text-center text-sm text-rose-200">
            {providerKind === 'maplibre' ? translate('providerUnavailable') : translate('error')}
          </p>
        ) : null}
        {loadState === 'ready' && items.length === 0 ? (
          <p className="absolute inset-x-4 top-4 rounded-md bg-slate-950/85 px-4 py-3 text-sm text-slate-300">
            {translate('empty')}
          </p>
        ) : null}
      </div>

      {providerFailed ? (
        <section
          aria-label={translate('fallback.resultsLabel')}
          aria-live="polite"
          className="rounded-lg border border-amber-900/70 bg-amber-950/20 p-5"
        >
          <h2 className="text-lg font-semibold text-white">{translate('fallback.title')}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            {translate('fallback.description')}
          </p>
          <button
            className="mt-4 rounded-md border border-amber-700 px-4 py-2 text-sm font-semibold text-amber-100 hover:border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-300"
            onClick={retryProvider}
            type="button"
          >
            {translate('retry')}
          </button>
          <div className="mt-6">
            {items.map((item) => (
              <AttractionCard attraction={item} key={item.id} />
            ))}
          </div>
        </section>
      ) : null}

      {truncated ? <p className="text-sm text-amber-300">{translate('truncated')}</p> : null}
      {requestError ? (
        <div className="flex items-center justify-between gap-4 rounded-md border border-rose-900/70 bg-rose-950/30 px-4 py-3 text-sm text-rose-200">
          <span>{translate('error')}</span>
          <button
            className="rounded-md border border-rose-700 px-3 py-2 font-semibold hover:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-300"
            onClick={searchArea}
            type="button"
          >
            {translate('retry')}
          </button>
        </div>
      ) : null}

      {items.length > 0 ? (
        <div
          aria-label={translate('carouselLabel')}
          className="flex gap-3 overflow-x-auto pb-2 lg:hidden"
          role="list"
        >
          {items.map((item) => (
            <div key={item.id} role="listitem">
              <button
                aria-label={translate('focusMarker', { name: item.name })}
                className="min-w-56 rounded-md border border-slate-700 bg-slate-900 px-4 py-3 text-left text-sm text-slate-200 hover:border-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-300"
                onClick={() => focusAttraction(item.id)}
                type="button"
              >
                <span className="block font-semibold text-white">{item.name}</span>
                <span className="mt-1 block text-slate-400">{item.municipality}</span>
              </button>
            </div>
          ))}
        </div>
      ) : null}
      {selected ? (
        <aside
          aria-label={selected.name}
          className="relative rounded-lg border border-cyan-900/80 bg-slate-900 px-5 py-2"
        >
          <button
            aria-label={translate('closeSelection')}
            className="absolute right-3 top-3 size-10 rounded-full border border-slate-700 text-xl text-slate-300 hover:border-cyan-300 hover:text-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-300"
            onClick={() => setSelectedId(null)}
            type="button"
          >
            ×
          </button>
          <AttractionCard attraction={selected} />
          <a
            className="mb-4 inline-flex rounded-md border border-cyan-700 px-3 py-2 text-sm font-semibold text-cyan-200 hover:border-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-300"
            href={`/${locale}?q=${encodeURIComponent(selected.name)}`}
          >
            {translate('openInList')}
          </a>
        </aside>
      ) : null}

      {attribution ? <MapAttribution attribution={attribution} /> : null}
    </section>
  );
}
