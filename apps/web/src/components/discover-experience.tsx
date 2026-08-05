'use client';

import type { AttractionListResponse } from '@lake/domain';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import type { MapProviderConfig } from '../providers/map/types';
import { DiscoverList } from './discover-list';
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
  initialView,
  locale,
  mapProviderConfig,
  mapProviderKind,
  searchError,
  searchQuery,
}: DiscoverExperienceProps) {
  const translate = useTranslations('map');
  const [location, setLocation] = useState<LocalLocation | null>(null);
  const [view, setView] = useState<'list' | 'map'>(initialView);

  useEffect(() => {
    setLocation(readLocalLocation());
  }, []);

  function handleLocationChange(nextLocation: LocalLocation) {
    setLocation(nextLocation);
    writeLocalLocation(nextLocation);
  }

  function changeView(nextView: 'list' | 'map') {
    setView(nextView);
    const url = new URL(window.location.href);
    if (nextView === 'list') url.searchParams.delete('view');
    else url.searchParams.set('view', nextView);
    window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
  }

  return (
    <>
      <LocationPicker locale={locale} location={location} onChange={handleLocationChange} />
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
            locale={locale}
            providerConfig={mapProviderConfig}
            providerKind={mapProviderKind}
            searchQuery={searchQuery}
          />
        </div>
      </div>
    </>
  );
}
