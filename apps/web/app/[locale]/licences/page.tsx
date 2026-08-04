import { notFound } from 'next/navigation';

import { listPublicRegistry } from '../../../src/registries/repository';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type SupportedLocale = 'de' | 'en';
type PageContext = { params: Promise<{ locale: string }> };

const copy = {
  de: {
    title: 'Lizenzen und Quellen',
    intro: 'Die Attributionen und Lizenzbedingungen der Datenquellen von BodenseeGuide.',
    sources: 'Datenquellen',
    licences: 'Lizenzen',
    terms: 'Lizenzbedingungen',
    attribution: 'Attribution',
    commercial: 'Kommerzielle Nutzung erlaubt',
    nonCommercial: 'Keine kommerzielle Nutzung',
    shareAlike: 'Weitergabe unter gleichen Bedingungen',
    noSources: 'Noch keine freigegebenen Quellen registriert.',
    noLicences: 'Noch keine Lizenzen registriert.',
  },
  en: {
    title: 'Licences and sources',
    intro: 'Attribution and licence terms for BodenseeGuide data sources.',
    sources: 'Data sources',
    licences: 'Licences',
    terms: 'Licence terms',
    attribution: 'Attribution',
    commercial: 'Commercial use allowed',
    nonCommercial: 'No commercial use',
    shareAlike: 'Share alike applies',
    noSources: 'No approved sources are registered yet.',
    noLicences: 'No licences are registered yet.',
  },
} satisfies Record<SupportedLocale, Record<string, string>>;

export function generateStaticParams() {
  return [{ locale: 'de' }, { locale: 'en' }];
}

export default async function LicencesPage({ params }: PageContext) {
  const locale = (await params).locale;
  if (locale !== 'de' && locale !== 'en') notFound();
  const content = copy[locale];
  const { licences, sources } = await listPublicRegistry();

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-slate-100" lang={locale}>
      <div className="mx-auto max-w-4xl space-y-10">
        <header className="space-y-3">
          <p className="text-sm font-medium text-cyan-400">BodenseeGuide</p>
          <h1 className="text-4xl font-semibold tracking-tight">{content.title}</h1>
          <p className="max-w-2xl text-slate-400">{content.intro}</p>
        </header>

        <section aria-labelledby="sources-title" className="space-y-4">
          <h2 id="sources-title" className="text-2xl font-semibold">
            {content.sources}
          </h2>
          {sources.length === 0 ? <p className="text-slate-400">{content.noSources}</p> : null}
          <div className="grid gap-4 md:grid-cols-2">
            {sources.map((source) => (
              <article
                className="rounded-md border border-slate-800 bg-slate-900 p-5"
                key={source.originUrl}
              >
                <h3 className="break-all font-medium">{source.originUrl}</h3>
                <p className="mt-3 text-sm text-slate-300">
                  {content.attribution}: {source.attributionText ?? source.licence.spdxOrName}
                </p>
                <a
                  className="mt-3 inline-block text-sm text-cyan-300 underline"
                  href={source.originUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  {source.licence.spdxOrName}
                </a>
              </article>
            ))}
          </div>
        </section>

        <section aria-labelledby="licences-title" className="space-y-4">
          <h2 id="licences-title" className="text-2xl font-semibold">
            {content.licences}
          </h2>
          {licences.length === 0 ? <p className="text-slate-400">{content.noLicences}</p> : null}
          <div className="divide-y divide-slate-800 border-y border-slate-800">
            {licences.map((licence) => (
              <article className="grid gap-3 py-5 md:grid-cols-[1fr_auto]" key={licence.spdxOrName}>
                <div>
                  <h3 className="font-medium">{licence.spdxOrName}</h3>
                  {licence.attributionText ? (
                    <p className="mt-2 text-sm text-slate-300">{licence.attributionText}</p>
                  ) : null}
                  <p className="mt-2 text-sm text-slate-500">
                    {licence.commercialUseAllowed ? content.commercial : content.nonCommercial}
                    {licence.shareAlike ? ` · ${content.shareAlike}` : ''}
                  </p>
                </div>
                {licence.termsUrl ? (
                  <a
                    className="self-start text-sm text-cyan-300 underline"
                    href={licence.termsUrl}
                    rel="noreferrer"
                    target="_blank"
                  >
                    {content.terms}
                  </a>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
