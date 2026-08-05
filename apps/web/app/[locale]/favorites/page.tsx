import { getTranslations } from 'next-intl/server';

import { FavoritesExperience } from '../../../src/components/favorites-experience';

type FavoritesPageProps = Readonly<{
  params: Promise<{ locale: 'de' | 'en' }>;
}>;

export default async function FavoritesPage({ params }: FavoritesPageProps) {
  const { locale } = await params;
  const translate = await getTranslations('screens.favorites');

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
            {translate('description')}
          </p>
        </header>
        <FavoritesExperience locale={locale} />
      </div>
    </main>
  );
}
