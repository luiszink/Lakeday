import type { AttractionListResponse } from '@lake/domain';
import { getTranslations } from 'next-intl/server';

import { MapExperience } from '../../../src/components/map/map-experience';
import type { MapProviderConfig } from '../../../src/providers/map/types';

const wholeLakeBbox = '8.3,47.1,10.7,48.1';

export const revalidate = 60;

async function fetchInitialMapData(locale: 'de' | 'en'): Promise<AttractionListResponse | null> {
  try {
    const baseUrl = process.env.PUBLIC_BASE_URL ?? 'http://localhost:3000';
    const endpoint = new URL('/api/attractions', baseUrl);
    endpoint.searchParams.set('bbox', wholeLakeBbox);
    endpoint.searchParams.set('limit', '200');
    endpoint.searchParams.set('locale', locale);
    const response = await fetch(endpoint, { next: { revalidate: 60 } });
    if (!response.ok) return null;
    return (await response.json()) as AttractionListResponse;
  } catch {
    return null;
  }
}

export default async function MapPage({
  params,
}: Readonly<{ params: Promise<{ locale: 'de' | 'en' }> }>) {
  const { locale } = await params;
  const translate = await getTranslations('map');
  const initialData = await fetchInitialMapData(locale);
  const providerConfig: MapProviderConfig = {
    ...(process.env.MAP_TILE_API_KEY ? { apiKey: process.env.MAP_TILE_API_KEY } : {}),
    providerAttribution: process.env.MAP_TILE_ATTRIBUTION ?? 'Map tiles',
    providerName: process.env.MAP_TILE_PROVIDER_NAME ?? 'Configured tile provider',
    ...(process.env.MAP_TILE_PROVIDER_URL
      ? { providerUrl: process.env.MAP_TILE_PROVIDER_URL }
      : {}),
    styleUrl: process.env.MAP_TILE_URL ?? 'https://example.invalid/style.json',
  };
  const providerKind =
    process.env.MAP_TILE_URL &&
    process.env.MAP_TILE_PROVIDER_NAME &&
    process.env.MAP_TILE_ATTRIBUTION
      ? 'maplibre'
      : 'fake';

  return (
    <main className="min-h-[calc(100vh-73px)] bg-slate-950 px-5 py-10 text-slate-100 sm:px-6 sm:py-14">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-400">
            {translate('eyebrow')}
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            {translate('title')}
          </h1>
          <p className="mt-4 text-base leading-7 text-slate-300">{translate('intro')}</p>
        </header>
        <MapExperience
          initialData={initialData}
          initialError={!initialData}
          locale={locale}
          providerConfig={providerConfig}
          providerKind={providerKind}
        />
      </div>
    </main>
  );
}
