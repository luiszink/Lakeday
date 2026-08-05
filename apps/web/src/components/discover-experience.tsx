'use client';

import type { AttractionListResponse } from '@lake/domain';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { usePathname, useRouter } from '../i18n/navigation';
import type { MapProviderConfig } from '../providers/map/types';
import { DiscoverList } from './discover-list';
import { FilterPanel } from './filters/filter-panel';
import { LocationPicker } from './location-picker';
import { MapExperience } from './map/map-experience';
import {
  readLocalLocation,
  writeLocalLocation,
  type LocalLocation,
} from '../location/local-location';

type DiscoverExperienceProps = Readonly<{
  initialData: AttractionListResponse | null;
  initialError: boolean;
  initialFilterQuery: string;
  initialView: 'list' | 'map';
  locale: 'de' | 'en';
  mapProviderConfig: MapProviderConfig;
  mapProviderKind: 'fake' | 'maplibre';
  searchError: boolean;
  searchQuery?: string | undefined;
}>;

export function DiscoverExperience({
  initialData,
  initialError,
  initialFilterQuery,
  initialView,
  locale,
  mapProviderConfig,
  mapProviderKind,
  searchError,
  searchQuery,
}: DiscoverExperienceProps) {
  const translate = useTranslations('map');
  const discoverTranslate = useTranslations('discover');
  const pathname = usePathname();
  const router = useRouter();
  const [location, setLocation] = useState<LocalLocation | null>(null);
  const [view, setView] = useState<'list' | 'map'>(initialView);
  const [sort, setSort] = useState<'distance' | 'relevance'>(() => {
    const querySort = new URLSearchParams(initialFilterQuery).get('sort');
    return querySort === 'distance' || querySort === 'relevance'
      ? querySort
      : initialFilterQuery.includes('near=')
        ? 'distance'
        : 'relevance';
  });
  const [sortLocationMessage, setSortLocationMessage] = useState(false);

  useEffect(() => {
    setLocation(readLocalLocation());
  }, []);

  function handleLocationChange(nextLocation: LocalLocation) {
    setLocation(nextLocation);
    writeLocalLocation(nextLocation);
    const parameters = new URLSearchParams(window.location.search);
    if (parameters.get('sort') === 'distance' || parameters.has('near')) {
      parameters.set(
        'near',
        `${Math.round(nextLocation.coordinates.latitude * 1_000) / 1_000},${Math.round(nextLocation.coordinates.longitude * 1_000) / 1_000}`,
      );
      if (!parameters.has('r')) parameters.set('r', '50');
      parameters.delete('cursor');
      router.replace(`${pathname}?${parameters.toString()}`);
    }
  }

  function changeView(nextView: 'list' | 'map') {
    setView(nextView);
    const url = new URL(window.location.href);
    if (nextView === 'list') url.searchParams.delete('view');
    else url.searchParams.set('view', nextView);
    window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
  }

  function changeSort(nextSort: 'distance' | 'relevance') {
    if (nextSort === 'distance' && !location) {
      setSortLocationMessage(true);
      return;
    }
    setSortLocationMessage(false);
    setSort(nextSort);
    const parameters = new URLSearchParams(window.location.search);
    parameters.set('sort', nextSort);
    parameters.delete('cursor');
    if (nextSort === 'distance' && location) {
      parameters.set(
        'near',
        `${Math.round(location.coordinates.latitude * 1_000) / 1_000},${Math.round(location.coordinates.longitude * 1_000) / 1_000}`,
      );
      if (!parameters.has('r')) parameters.set('r', '50');
    }
    router.replace(`${pathname}?${parameters.toString()}`);
  }

  return (
    <>
      <LocationPicker locale={locale} location={location} onChange={handleLocationChange} />
      <FilterPanel
        initialQuery={initialFilterQuery}
        initialTotal={initialData?.total ?? 0}
        locale={locale}
        location={location}
      />
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <label className="text-sm font-semibold text-slate-300" htmlFor="discover-sort">
          {discoverTranslate('sort.label')}
        </label>
        <select
          className="min-h-10 rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-slate-200 outline-none focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/30"
          id="discover-sort"
          onChange={(event) => changeSort(event.target.value as 'distance' | 'relevance')}
          value={sort}
        >
          <option value="relevance">{discoverTranslate('sort.relevance')}</option>
          <option value="distance">{discoverTranslate('sort.distance')}</option>
        </select>
        {sortLocationMessage ? (
          <p aria-live="polite" className="text-sm text-amber-200">
            {discoverTranslate('sort.locationRequired')}
          </p>
        ) : null}
      </div>
      <div className="mb-6 flex justify-end">
        <div
          aria-label={translate('view.label')}
          className="inline-flex rounded-md border border-slate-700 bg-slate-900 p-1"
          role="group"
        >
          {(['list', 'map'] as const).map((option) => (
            <button
              aria-pressed={view === option}
              className={`rounded px-4 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-cyan-300 ${view === option ? 'bg-cyan-400 text-slate-950' : 'text-slate-300 hover:text-white'}`}
              key={option}
              onClick={() => changeView(option)}
              type="button"
            >
              {translate(`view.${option}`)}
            </button>
          ))}
        </div>
      </div>
      <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
        <div className={view === 'list' ? undefined : 'hidden lg:block'}>
          <DiscoverList
            initialData={initialData}
            initialError={initialError}
            filterQuery={initialFilterQuery}
            locale={locale}
            location={location}
            searchError={searchError}
            searchQuery={searchQuery}
          />
        </div>
        <div className={view === 'map' ? undefined : 'hidden lg:block'}>
          <MapExperience
            initialData={initialData}
            initialError={initialError}
            filterQuery={initialFilterQuery}
            locale={locale}
            providerConfig={mapProviderConfig}
            providerKind={mapProviderKind}
          />
        </div>
      </div>
    </>
  );
}
