'use client';

import { geocodeResponseSchema, roundWgs84Coordinate, type GeocodeResponse } from '@lake/domain';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import type { LocalLocation } from '../location/local-location';

type LocationPickerProps = Readonly<{
  locale: 'de' | 'en';
  location: LocalLocation | null;
  onChange: (location: LocalLocation) => void;
}>;

const regionPicks = [
  { key: 'konstanz', latitude: 47.66, longitude: 9.175 },
  { key: 'meersburg', latitude: 47.695, longitude: 9.271 },
  { key: 'friedrichshafen', latitude: 47.65, longitude: 9.48 },
  { key: 'lindau', latitude: 47.55, longitude: 9.69 },
  { key: 'bregenz', latitude: 47.5, longitude: 9.747 },
  { key: 'romanshorn', latitude: 47.565, longitude: 9.38 },
  { key: 'radolfzell', latitude: 47.74, longitude: 8.97 },
  { key: 'steinAmRhein', latitude: 47.66, longitude: 8.86 },
] as const;

export function LocationPicker({ locale, location, onChange }: LocationPickerProps) {
  const translate = useTranslations('discover');
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GeocodeResponse['results']>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [providerUnavailable, setProviderUnavailable] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function selectLocation(nextLocation: LocalLocation) {
    onChange({ ...nextLocation, coordinates: roundWgs84Coordinate(nextLocation.coordinates) });
    setIsOpen(false);
    setQuery('');
    setResults([]);
    setError(null);
  }

  async function searchPlaces(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedQuery = query.trim();
    if (normalizedQuery.length < 2) {
      setError(translate('location.minChars'));
      return;
    }

    setIsSearching(true);
    setError(null);
    setProviderUnavailable(false);
    try {
      const response = await fetch(
        `/api/geocode?locale=${locale}&q=${encodeURIComponent(normalizedQuery)}`,
      );
      const payload = geocodeResponseSchema.safeParse(await response.json());
      if (!response.ok || !payload.success) {
        setError(translate('location.error'));
        return;
      }
      setProviderUnavailable(payload.data.providerUnavailable);
      setResults(payload.data.results);
      if (payload.data.results.length === 0 && !payload.data.providerUnavailable) {
        setError(translate('location.noResults'));
      }
    } catch {
      setProviderUnavailable(true);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }

  function useCurrentLocation() {
    setError(null);
    if (!navigator.geolocation) {
      setError(translate('location.geolocationUnavailable'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        selectLocation({
          label: translate('location.current'),
          coordinates: roundWgs84Coordinate({
            latitude: coords.latitude,
            longitude: coords.longitude,
          }),
        });
      },
      () => setError(translate('location.geolocationDenied')),
      { enableHighAccuracy: false, maximumAge: 300_000, timeout: 5_000 },
    );
  }

  return (
    <div className="relative mb-6 max-w-2xl">
      <button
        aria-controls="location-picker-panel"
        aria-expanded={isOpen}
        className="inline-flex min-h-11 items-center gap-2 rounded-md border border-slate-700 bg-slate-900 px-4 text-sm font-medium text-slate-200 transition hover:border-cyan-300 hover:text-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-300"
        onClick={() => setIsOpen((open) => !open)}
        type="button"
      >
        <span aria-hidden="true" className="text-cyan-300">
          +
        </span>
        {translate('location.control', { label: location?.label ?? translate('location.choose') })}
      </button>

      {isOpen ? (
        <div
          className="mt-3 rounded-lg border border-slate-800 bg-slate-900 p-4 shadow-xl"
          id="location-picker-panel"
        >
          <form className="flex gap-2" onSubmit={searchPlaces}>
            <label className="sr-only" htmlFor="location-search">
              {translate('location.searchLabel')}
            </label>
            <input
              className="min-h-11 min-w-0 flex-1 rounded-md border border-slate-700 bg-slate-950 px-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/30"
              id="location-search"
              onChange={(event) => setQuery(event.target.value)}
              placeholder={translate('location.searchPlaceholder')}
              type="search"
              value={query}
            />
            <button
              className="min-h-11 rounded-md bg-cyan-400 px-4 text-sm font-semibold text-slate-950 focus:outline-none focus:ring-2 focus:ring-cyan-300"
              disabled={isSearching}
              type="submit"
            >
              {isSearching ? translate('location.searching') : translate('location.search')}
            </button>
          </form>

          <button
            className="mt-3 min-h-11 w-full rounded-md border border-slate-700 px-3 text-left text-sm text-slate-200 hover:border-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-300"
            onClick={useCurrentLocation}
            type="button"
          >
            {translate('location.useCurrent')}
          </button>

          {error ? (
            <p className="mt-3 text-sm text-amber-200" role="status">
              {error}
            </p>
          ) : null}
          {providerUnavailable ? (
            <p className="mt-3 text-sm text-slate-400" role="status">
              {translate('location.providerUnavailable')}
            </p>
          ) : null}

          {results.length > 0 ? (
            <ul className="mt-4 space-y-2" aria-label={translate('location.resultsLabel')}>
              {results.map((result) => (
                <li
                  key={`${result.label}-${result.coordinates.latitude}-${result.coordinates.longitude}`}
                >
                  <button
                    className="min-h-11 w-full rounded-md px-3 text-left text-sm text-slate-200 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-300"
                    onClick={() => selectLocation(result)}
                    type="button"
                  >
                    {result.label}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          <div className="mt-4 border-t border-slate-800 pt-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              {translate('location.quickPicks')}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {regionPicks.map((region) => (
                <button
                  className="rounded-md border border-slate-700 px-3 py-2 text-xs text-slate-300 hover:border-cyan-300 hover:text-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-300"
                  key={region.key}
                  onClick={() =>
                    selectLocation({
                      label: translate(`location.regions.${region.key}`),
                      coordinates: { latitude: region.latitude, longitude: region.longitude },
                    })
                  }
                  type="button"
                >
                  {translate(`location.regions.${region.key}`)}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
