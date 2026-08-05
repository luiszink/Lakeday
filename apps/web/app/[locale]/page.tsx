import { getTranslations } from 'next-intl/server';

import { Link } from '../../src/i18n/navigation';

export default async function LocaleHomePage() {
  const translate = await getTranslations('home');

  return (
    <main className="min-h-[calc(100vh-73px)] bg-slate-950 px-6 py-16 text-slate-100">
      <div className="mx-auto flex max-w-5xl flex-col gap-12">
        <section className="max-w-3xl space-y-6">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-400">
            {translate('eyebrow')}
          </p>
          <h1 className="text-5xl font-semibold tracking-tight sm:text-6xl">
            {translate('title')}
          </h1>
          <p className="max-w-2xl text-lg leading-8 text-slate-300">{translate('intro')}</p>
          <Link
            className="inline-flex rounded-md bg-cyan-400 px-5 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-300 focus:ring-offset-2 focus:ring-offset-slate-950"
            href="/licences"
          >
            {translate('licences')}
          </Link>
        </section>
      </div>
    </main>
  );
}