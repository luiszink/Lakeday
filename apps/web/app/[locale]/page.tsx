import type { AttractionListResponse } from '@lake/domain';
import { getTranslations } from 'next-intl/server';

import { DiscoverList } from '../../src/components/discover-list';
import { SearchBox } from '../../src/components/search-box';

type LocaleHomePageProps = Readonly<{
  params: Promise<{ locale: 'de' | 'en' }>;
  searchParams: Promise<{ q?: string | string[] }>;
}>;

export const revalidate = 60;

async function fetchInitialAttractions(
  locale: 'de' | 'en',
  query?: string,
): Promise<AttractionListResponse | null> {
  try {
    const baseUrl = process.env.PUBLIC_BASE_URL ?? 'http://localhost:3000';
    const endpoint = new URL('/api/attractions', baseUrl);
    endpoint.searchParams.set('locale', locale);
    endpoint.searchParams.set('limit', '20');
    if (query) endpoint.searchParams.set('q', query);
    const response = await fetch(endpoint, { next: { revalidate: 60 } });
    if (!response.ok) return null;
    return (await response.json()) as AttractionListResponse;
  } catch {
    return null;
  }
}

async function loadInitialAttractions(
  locale: 'de' | 'en',
  query?: string,
): Promise<Readonly<{ data: AttractionListResponse | null; searchFailed: boolean }>> {
  const data = await fetchInitialAttractions(locale, query);
  if (data || !query) return { data, searchFailed: false };
  return { data: await fetchInitialAttractions(locale), searchFailed: true };
}

export default async function LocaleHomePage({ params, searchParams }: LocaleHomePageProps) {
  const { locale } = await params;
  const queryParameters = await searchParams;
  const searchQuery = typeof queryParameters.q === 'string' ? queryParameters.q.trim() : undefined;
  const translate = await getTranslations('discover');
  const initialLoad = await loadInitialAttractions(locale, searchQuery);

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
          <DiscoverList
            initialData={initialLoad.data}
            initialError={!initialLoad.data}
            locale={locale}
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
