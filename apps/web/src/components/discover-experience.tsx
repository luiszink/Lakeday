'use client';

import type { AttractionListResponse } from '@lake/domain';
import { useEffect, useState } from 'react';

import { DiscoverList } from './discover-list';
import { LocationPicker } from './location-picker';
import {
  readLocalLocation,
  writeLocalLocation,
  type LocalLocation,
} from '../location/local-location';

type DiscoverExperienceProps = Readonly<{
  initialData: AttractionListResponse | null;
  initialError: boolean;
  locale: 'de' | 'en';
  searchError: boolean;
  searchQuery?: string | undefined;
}>;

export function DiscoverExperience({
  initialData,
  initialError,
  locale,
  searchError,
  searchQuery,
}: DiscoverExperienceProps) {
  const [location, setLocation] = useState<LocalLocation | null>(null);

  useEffect(() => {
    setLocation(readLocalLocation());
  }, []);

  function handleLocationChange(nextLocation: LocalLocation) {
    setLocation(nextLocation);
    writeLocalLocation(nextLocation);
  }

  return (
    <>
      <LocationPicker locale={locale} location={location} onChange={handleLocationChange} />
      <DiscoverList
        initialData={initialData}
        initialError={initialError}
        locale={locale}
        location={location}
        searchError={searchError}
        searchQuery={searchQuery}
      />
    </>
  );
}
