import type { AttractionListResponse } from '@lake/domain';
import { getTranslations } from 'next-intl/server';

import { DiscoverList } from '../../src/components/discover-list';

type LocaleHomePageProps = Readonly<{
  params: Promise<{ locale: 'de' | 'en' }>;
}>;

export const revalidate = 60;

async function loadInitialAttractions(locale: 'de' | 'en'): Promise<AttractionListResponse | null> {
  try {
    const baseUrl = process.env.PUBLIC_BASE_URL ?? 'http://localhost:3000';
    const endpoint = new URL('/api/attractions', baseUrl);
    endpoint.searchParams.set('locale', locale);
    endpoint.searchParams.set('limit', '20');
    const response = await fetch(endpoint, { next: { revalidate: 60 } });
    if (!response.ok) return null;
    return (await response.json()) as AttractionListResponse;
  } catch {
    return null;
  }
}

export default async function LocaleHomePage({ params }: LocaleHomePageProps) {
  const { locale } = await params;
  const translate = await getTranslations('discover');
  const initialData = await loadInitialAttractions(locale);

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
        </header>

        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <DiscoverList initialData={initialData} initialError={!initialData} locale={locale} />
          <aside className="hidden border-l border-slate-800 pl-6 lg:block">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              {translate('aside.eyebrow')}
            </p>
            <p className="mt-3 text-sm leading-6 text-slate-400">{translate('aside.description')}</p>
          </aside>
        </div>
      </div>
    </main>
  );
}