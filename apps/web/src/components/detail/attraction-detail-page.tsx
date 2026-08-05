import type { AttractionDetailResponse } from '@lake/domain';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { ReportForm } from './report-form';
import { ImageGallery } from './image-gallery';

type AttractionDetailPageProps = Readonly<{
  detail: AttractionDetailResponse;
  locale: 'de' | 'en';
}>;

function dateLabel(value: string, locale: 'de' | 'en') {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeZone: 'Europe/Zurich',
  }).format(new Date(`${value}T12:00:00Z`));
}

function dateTimeLabel(value: string, locale: 'de' | 'en') {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeZone: 'Europe/Zurich',
  }).format(new Date(value));
}

function currencyLabel(amount: number, currency: string, locale: 'de' | 'en') {
  return new Intl.NumberFormat(locale, {
    currency,
    maximumFractionDigits: 2,
    style: 'currency',
  }).format(amount);
}

export function AttractionDetailPage({ detail, locale }: AttractionDetailPageProps) {
  const translate = useTranslations('detail');
  const valueLabel = (value: string | null | undefined) => {
    if (!value) return translate('unknown');
    const key = `values.${value}` as never;
    return translate.has(key) ? translate(key) : translate('unknown');
  };
  const booleanLabel = (value: boolean | null) =>
    value === null ? translate('unknown') : value ? translate('yes') : translate('no');
  const duration = detail.typicalDuration
    ? `${detail.typicalDuration.min ?? detail.typicalDuration.max ?? 0}-${detail.typicalDuration.max ?? detail.typicalDuration.min ?? 0} ${translate('minutes')}`
    : translate('unknown');

  return (
    <main className="min-h-[calc(100vh-73px)] bg-slate-950 px-5 py-8 text-slate-100 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-6xl">
        <a className="sr-only focus:not-sr-only" href="#practical-facts">
          {translate('skipToPractical')}
        </a>
        <nav aria-label={translate('breadcrumbLabel')} className="mb-6 text-sm text-slate-400">
          <Link className="hover:text-cyan-300" href={`/${locale}`}>
            {translate('discover')}
          </Link>
          <span aria-hidden="true" className="px-2">
            /
          </span>
          <span>{detail.region.name}</span>
        </nav>

        <section className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,30rem)] lg:items-start">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-cyan-300">
              {detail.categories[0]?.label ?? translate('uncategorized')}
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              {detail.localization.name}
            </h1>
            <p className="mt-3 text-base text-slate-300">
              {detail.municipality} · {detail.region.name}
            </p>
            {detail.localization.summary ? (
              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-200">
                {detail.localization.summary}
              </p>
            ) : null}
          </div>
          <ImageGallery
            categoryCode={detail.categories[0]?.code}
            images={detail.images}
            locale={locale}
            placeholderLabel={translate('imagePlaceholder')}
          />
        </section>

        <section
          aria-label={translate('decisionBlock')}
          className="mt-10 grid gap-px overflow-hidden rounded-lg border border-slate-800 bg-slate-800 sm:grid-cols-3"
          id="practical-facts"
        >
          <div className="bg-slate-900 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              {translate('openState.label')}
            </p>
            <p className="mt-2 text-lg font-semibold text-white">
              {translate(`openState.${detail.openState}` as never)}
            </p>
            <p className="mt-1 text-sm text-slate-400">{dateLabel(detail.openDate, locale)}</p>
          </div>
          <div className="bg-slate-900 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              {translate('priceLevel')}
            </p>
            <p className="mt-2 text-lg font-semibold text-white">{valueLabel(detail.priceLevel)}</p>
          </div>
          <div className="bg-slate-900 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              {translate('duration')}
            </p>
            <p className="mt-2 text-lg font-semibold text-white">{duration}</p>
          </div>
        </section>

        <div className="mt-12 grid gap-12 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="space-y-12">
            <section aria-labelledby="description-heading">
              <h2 className="text-2xl font-semibold text-white" id="description-heading">
                {translate('descriptionHeading')}
              </h2>
              <p className="mt-4 whitespace-pre-line text-base leading-8 text-slate-300">
                {detail.localization.description ?? translate('unknown')}
              </p>
              {detail.localization.practicalNotes ? (
                <p className="mt-4 whitespace-pre-line text-sm leading-7 text-slate-400">
                  {detail.localization.practicalNotes}
                </p>
              ) : null}
            </section>

            <section aria-labelledby="hours-heading">
              <h2 className="text-2xl font-semibold text-white" id="hours-heading">
                {translate('hoursHeading')}
              </h2>
              <p className="mt-2 text-sm text-slate-400">
                {translate('evaluatedFor', { date: dateLabel(detail.openDate, locale) })}
              </p>
              {detail.openingSchedule ? (
                <div className="mt-4 overflow-x-auto rounded-lg border border-slate-800">
                  <table className="w-full min-w-[32rem] text-left text-sm">
                    <thead className="bg-slate-900 text-slate-300">
                      <tr>
                        <th className="px-4 py-3 font-semibold" scope="col">
                          {translate('days')}
                        </th>
                        <th className="px-4 py-3 font-semibold" scope="col">
                          {translate('hours')}
                        </th>
                        <th className="px-4 py-3 font-semibold" scope="col">
                          {translate('holidayRule')}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.openingSchedule.rules.map((rule, index) => (
                        <tr
                          className="border-t border-slate-800"
                          key={`${rule.daysOfWeek.join('-')}-${index}`}
                        >
                          <td className="px-4 py-3 text-slate-200">
                            {rule.daysOfWeek
                              .map((day) => translate(`daysOfWeek.${day}` as never))
                              .join(', ')}
                          </td>
                          <td className="px-4 py-3 text-slate-300">
                            {rule.opens && rule.closes
                              ? `${rule.opens}–${rule.closes}`
                              : translate('unknown')}
                          </td>
                          <td className="px-4 py-3 text-slate-400">
                            {translate(`holidayRules.${rule.appliesOnPublicHolidays}` as never)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="mt-4 text-slate-400">{translate('unknown')}</p>
              )}
              {detail.exceptionalClosures.length > 0 ? (
                <p className="mt-4 text-sm text-amber-200">
                  {translate('closures', {
                    dates: detail.exceptionalClosures
                      .map(
                        (closure) =>
                          `${dateLabel(closure.dateFrom, locale)}–${dateLabel(closure.dateTo, locale)}`,
                      )
                      .join(', '),
                  })}
                </p>
              ) : null}
            </section>

            <section aria-labelledby="practical-heading">
              <h2 className="text-2xl font-semibold text-white" id="practical-heading">
                {translate('practicalHeading')}
              </h2>
              <dl className="mt-5 grid gap-x-8 gap-y-4 sm:grid-cols-2">
                <div>
                  <dt className="text-sm text-slate-500">{translate('bookingRequirement')}</dt>
                  <dd className="mt-1 text-slate-200">{valueLabel(detail.bookingRequirement)}</dd>
                </div>
                <div>
                  <dt className="text-sm text-slate-500">{translate('foodOnSite')}</dt>
                  <dd className="mt-1 text-slate-200">{booleanLabel(detail.foodOnSite)}</dd>
                </div>
                <div>
                  <dt className="text-sm text-slate-500">{translate('cafeOnSite')}</dt>
                  <dd className="mt-1 text-slate-200">{booleanLabel(detail.cafeOnSite)}</dd>
                </div>
                <div>
                  <dt className="text-sm text-slate-500">{translate('picnicAllowed')}</dt>
                  <dd className="mt-1 text-slate-200">{booleanLabel(detail.picnicAllowed)}</dd>
                </div>
              </dl>
              <div className="mt-6">
                <h3 className="text-base font-semibold text-white">{translate('prices')}</h3>
                {detail.prices.length > 0 ? (
                  <ul className="mt-3 space-y-2 text-sm text-slate-300">
                    {detail.prices.map((price) => (
                      <li key={`${price.audience}-${price.currency}-${price.amount}`}>
                        {valueLabel(price.audience)}:{' '}
                        {currencyLabel(price.amount, price.currency, locale)}
                        {price.note ? ` (${price.note})` : ''}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-sm text-slate-400">{translate('unknown')}</p>
                )}
              </div>
            </section>

            <section aria-labelledby="arrival-heading">
              <h2 className="text-2xl font-semibold text-white" id="arrival-heading">
                {translate('arrivalHeading')}
              </h2>
              <dl className="mt-5 grid gap-x-8 gap-y-4 sm:grid-cols-2">
                <div>
                  <dt className="text-sm text-slate-500">{translate('transport')}</dt>
                  <dd className="mt-1 text-slate-200">
                    {detail.transportModes.length > 0
                      ? detail.transportModes.map(valueLabel).join(', ')
                      : translate('unknown')}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-slate-500">{translate('parking')}</dt>
                  <dd className="mt-1 text-slate-200">
                    {valueLabel(detail.parkingAvailability)}
                    {detail.parkingNote ? `: ${detail.parkingNote}` : ''}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-slate-500">{translate('nearestStop')}</dt>
                  <dd className="mt-1 text-slate-200">
                    {detail.nearestStopName
                      ? `${detail.nearestStopName}${detail.nearestStopDistanceM === null ? '' : ` · ${detail.nearestStopDistanceM} m`}`
                      : translate('unknown')}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-slate-500">{translate('bicycle')}</dt>
                  <dd className="mt-1 text-slate-200">
                    {booleanLabel(detail.bicycleAccess)}
                    {detail.bicycleNote ? `: ${detail.bicycleNote}` : ''}
                  </dd>
                </div>
              </dl>
            </section>

            <section aria-labelledby="suitability-heading">
              <h2 className="text-2xl font-semibold text-white" id="suitability-heading">
                {translate('suitabilityHeading')}
              </h2>
              <dl className="mt-5 grid gap-x-8 gap-y-4 sm:grid-cols-2">
                <div>
                  <dt className="text-sm text-slate-500">{translate('indoorOutdoor')}</dt>
                  <dd className="mt-1 text-slate-200">{valueLabel(detail.indoorOutdoor)}</dd>
                </div>
                <div>
                  <dt className="text-sm text-slate-500">{translate('rain')}</dt>
                  <dd className="mt-1 text-slate-200">{valueLabel(detail.rainSuitability)}</dd>
                </div>
                <div>
                  <dt className="text-sm text-slate-500">{translate('heat')}</dt>
                  <dd className="mt-1 text-slate-200">{valueLabel(detail.heatSuitability)}</dd>
                </div>
                <div>
                  <dt className="text-sm text-slate-500">{translate('wheelchair')}</dt>
                  <dd className="mt-1 text-slate-200">{valueLabel(detail.wheelchairAccess)}</dd>
                </div>
                <div>
                  <dt className="text-sm text-slate-500">{translate('wheelchairToilet')}</dt>
                  <dd className="mt-1 text-slate-200">{booleanLabel(detail.wheelchairToilet)}</dd>
                </div>
                <div>
                  <dt className="text-sm text-slate-500">{translate('stroller')}</dt>
                  <dd className="mt-1 text-slate-200">{valueLabel(detail.strollerSuitable)}</dd>
                </div>
                <div>
                  <dt className="text-sm text-slate-500">{translate('dogs')}</dt>
                  <dd className="mt-1 text-slate-200">{valueLabel(detail.dogPolicy)}</dd>
                </div>
                <div>
                  <dt className="text-sm text-slate-500">{translate('toilets')}</dt>
                  <dd className="mt-1 text-slate-200">{booleanLabel(detail.toilets)}</dd>
                </div>
                <div>
                  <dt className="text-sm text-slate-500">{translate('languages')}</dt>
                  <dd className="mt-1 text-slate-200">
                    {detail.visitorLanguages.length > 0
                      ? detail.visitorLanguages.map(valueLabel).join(', ')
                      : translate('unknown')}
                  </dd>
                </div>
              </dl>
            </section>
          </div>

          <aside className="space-y-8">
            <section aria-labelledby="freshness-heading" className="border-t border-slate-800 pt-5">
              <h2 className="text-lg font-semibold text-white" id="freshness-heading">
                {translate('freshnessHeading')}
              </h2>
              <p className="mt-3 text-sm text-slate-400">
                {detail.lastVerifiedAt
                  ? translate('lastVerified', {
                      date: dateTimeLabel(detail.lastVerifiedAt, locale),
                    })
                  : translate('unknown')}
              </p>
              {detail.factFreshness.length > 0 ? (
                <ul className="mt-4 space-y-2 text-xs text-slate-500">
                  {detail.factFreshness.map((fact) => {
                    const warning = ['STALE', 'SOURCE_UNAVAILABLE'].includes(fact.status);
                    const date = fact.lastCheckedAt
                      ? dateTimeLabel(fact.lastCheckedAt, locale)
                      : translate('unknown');
                    return (
                      <li
                        className={warning ? 'text-amber-200' : undefined}
                        key={`${fact.factKey}-${fact.lastCheckedAt}`}
                      >
                        {valueLabel(fact.factKey)}:{' '}
                        {warning
                          ? translate('freshnessWarning', { date })
                          : translate('freshnessVerified', { date })}
                      </li>
                    );
                  })}
                </ul>
              ) : null}
              <ReportForm attractionId={detail.id} locale={locale} />
            </section>

            <section aria-labelledby="links-heading" className="border-t border-slate-800 pt-5">
              <h2 className="text-lg font-semibold text-white" id="links-heading">
                {translate('linksHeading')}
              </h2>
              <div className="mt-3 space-y-3 text-sm">
                {detail.officialWebsite ? (
                  <a
                    className="block text-cyan-300 underline hover:text-cyan-200"
                    href={detail.officialWebsite}
                    rel="noopener"
                    target="_blank"
                  >
                    {translate('officialWebsite')}
                  </a>
                ) : null}
                {detail.bookingUrl ? (
                  <a
                    className="block text-cyan-300 underline hover:text-cyan-200"
                    href={detail.bookingUrl}
                    rel="noopener"
                    target="_blank"
                  >
                    {translate('bookingUrl')}
                  </a>
                ) : null}
                {!detail.officialWebsite && !detail.bookingUrl ? (
                  <p className="text-slate-400">{translate('unknown')}</p>
                ) : null}
              </div>
            </section>

            <section aria-labelledby="nearby-heading" className="border-t border-slate-800 pt-5">
              <h2 className="text-lg font-semibold text-white" id="nearby-heading">
                {translate('nearbyHeading')}
              </h2>
              {detail.nearby.length > 0 ? (
                <ul className="mt-3 space-y-3">
                  {detail.nearby.map((nearby) => (
                    <li key={nearby.id}>
                      <Link
                        className="text-sm text-cyan-300 hover:text-cyan-200"
                        href={`/${locale}/${locale === 'de' ? 'orte' : 'places'}/${encodeURIComponent(nearby.slug)}`}
                      >
                        {nearby.name}
                      </Link>
                      <p className="text-xs text-slate-500">
                        {nearby.category ?? translate('uncategorized')}
                        {nearby.distanceM === null ? '' : ` · ${Math.round(nearby.distanceM)} m`}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-slate-400">{translate('unknown')}</p>
              )}
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
