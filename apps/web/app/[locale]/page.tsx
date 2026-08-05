import type { AttractionListResponse } from '@lake/domain';
import { getTranslations } from 'next-intl/server';

import { DiscoverExperience } from '../../src/components/discover-experience';
import { SearchBox } from '../../src/components/search-box';
import { getMapProviderSettings } from '../../src/providers/map/config';

type LocaleHomePageProps = Readonly<{
  params: Promise<{ locale: 'de' | 'en' }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>;

export const revalidate = 60;

async function fetchInitialAttractions(
  locale: 'de' | 'en',
  queryString: string,
): Promise<AttractionListResponse | null> {
  try {
    const baseUrl = process.env.PUBLIC_BASE_URL ?? 'http://localhost:3000';
    const endpoint = new URL('/api/attractions', baseUrl);
    const parameters = new URLSearchParams(queryString);
    parameters.set('locale', locale);
    parameters.set('limit', '20');
    endpoint.search = parameters.toString();
    const response = await fetch(endpoint, { next: { revalidate: 60 } });
    if (!response.ok) return null;
    return (await response.json()) as AttractionListResponse;
  } catch {
    return null;
  }
}

async function loadInitialAttractions(
  locale: 'de' | 'en',
  queryString: string,
  searchQuery?: string,
): Promise<Readonly<{ data: AttractionListResponse | null; searchFailed: boolean }>> {
  const data = await fetchInitialAttractions(locale, queryString);
  if (data || !searchQuery) return { data, searchFailed: false };
  const fallbackParameters = new URLSearchParams(queryString);
  fallbackParameters.delete('q');
  return {
    data: await fetchInitialAttractions(locale, fallbackParameters.toString()),
    searchFailed: true,
  };
}

export default async function LocaleHomePage({ params, searchParams }: LocaleHomePageProps) {
  const { locale } = await params;
  const queryParameters = await searchParams;
  const searchQuery = typeof queryParameters.q === 'string' ? queryParameters.q.trim() : undefined;
  const initialFilterParameters = new URLSearchParams();
  for (const [key, value] of Object.entries(queryParameters)) {
    if (key === 'view' || value === undefined) continue;
    for (const item of Array.isArray(value) ? value : [value])
      initialFilterParameters.append(key, item);
  }
  const initialFilterQuery = initialFilterParameters.toString();
  const initialView = queryParameters.view === 'map' ? 'map' : 'list';
  const translate = await getTranslations('discover');
  const initialLoad = await loadInitialAttractions(locale, initialFilterQuery, searchQuery);
  const providerSettings = getMapProviderSettings(process.env);

  return (
    <main className="min-h-[calc(100vh-73px)] bg-slate-950 px-5 py-10 text-slate-100 sm:px-6 sm:py-14">
      <div className="mx-auto max-w-6xl">
        <header className="mb-10 max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-400">
            {translate('eyebrow')}
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            {translate('title')}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
            {translate('intro')}
          </p>
          <SearchBox initialQuery={searchQuery} />
        </header>

        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <DiscoverExperience
            initialData={initialLoad.data}
            initialError={!initialLoad.data}
            initialView={initialView}
            initialFilterQuery={initialFilterQuery}
            locale={locale}
            mapProviderConfig={providerSettings.config}
            mapProviderKind={providerSettings.kind}
            searchError={initialLoad.searchFailed}
            searchQuery={searchQuery}
          />
          <aside className="hidden border-l border-slate-800 pl-6 lg:block">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              {translate('aside.eyebrow')}
            </p>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              {translate('aside.description')}
            </p>
          </aside>
        </div>
      </div>
    </main>
  );
}
