import type { AttractionListResponse } from '@lake/domain';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';

import { FavoriteToggle } from './favorite-toggle';
import { AddToPlan } from './add-to-plan';

type AttractionCardProps = Readonly<{
  attraction: AttractionListResponse['items'][number];
  distanceM?: number | null;
}>;

function priceLabel(
  priceLevel: string | null,
  translate: (key: 'unknown' | 'free' | 'low' | 'medium' | 'high' | 'premium') => string,
) {
  if (!priceLevel) return translate('unknown');
  const normalizedPriceLevel = priceLevel.toLowerCase();
  if (normalizedPriceLevel === 'free') return translate('free');
  if (normalizedPriceLevel === 'low') return translate('low');
  if (normalizedPriceLevel === 'medium') return translate('medium');
  if (normalizedPriceLevel === 'high') return translate('high');
  if (normalizedPriceLevel === 'premium') return translate('premium');
  return priceLevel;
}

export function AttractionCard({ attraction, distanceM }: AttractionCardProps) {
  const locale = useLocale();
  const translate = useTranslations('discover.card');
  const duration = attraction.typicalDuration
    ? translate('duration', {
        min: attraction.typicalDuration.min ?? attraction.typicalDuration.max ?? 0,
        max: attraction.typicalDuration.max ?? attraction.typicalDuration.min ?? 0,
      })
    : translate('unknown');
  const distance =
    distanceM === null || distanceM === undefined
      ? null
      : distanceM >= 1_000
        ? translate('distanceKm', {
            distance: new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(
              distanceM / 1_000,
            ),
          })
        : translate('distanceM', { distance: distanceM });
  const openingDate = attraction.openDate
    ? new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: 'Europe/Zurich' }).format(
        new Date(`${attraction.openDate}T12:00:00Z`),
      )
    : null;
  const openingUntil = attraction.openUntil
    ? attraction.openDate ===
      new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Zurich' }).format(new Date())
      ? translate('openUntilToday', { time: attraction.openUntil })
      : translate('openUntilDate', {
          date: openingDate ?? attraction.openDate ?? '',
          time: attraction.openUntil,
        })
    : null;

  return (
    <article className="group grid gap-4 border-b border-slate-800/80 py-5 first:pt-0 sm:grid-cols-[12rem_1fr] sm:gap-5">
      <div
        aria-label={
          attraction.thumbnail
            ? locale === 'de'
              ? attraction.thumbnail.altDe
              : attraction.thumbnail.altEn
            : translate('imagePlaceholder')
        }
        className="relative min-h-44 overflow-hidden rounded-lg border border-slate-800 bg-slate-900 sm:min-h-40"
        role="img"
        style={
          attraction.thumbnail
            ? {
                backgroundImage: `url(${JSON.stringify(attraction.thumbnail.storagePath)})`,
                backgroundPosition: 'center',
                backgroundSize: 'cover',
              }
            : undefined
        }
      >
        {!attraction.thumbnail ? (
          <span
            className="absolute inset-0 flex items-center justify-center text-3xl text-slate-700"
            aria-hidden="true"
          >
            +
          </span>
        ) : null}
        {attraction.thumbnail ? (
          <span className="absolute inset-x-2 bottom-2 rounded bg-slate-950/80 px-2 py-1 text-[10px] text-slate-300">
            {attraction.thumbnail.attributionText}
          </span>
        ) : null}
      </div>

      <div className="flex min-w-0 flex-col gap-3">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="mb-1 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.12em] text-cyan-300">
              <span aria-hidden="true">•</span>
              {attraction.category?.label ?? translate('uncategorized')}
            </p>
            <h2 className="text-xl font-semibold tracking-tight text-white">
              <Link
                className="rounded-sm focus:outline-none focus:ring-2 focus:ring-cyan-300"
                href={`/${locale}/${locale === 'de' ? 'orte' : 'places'}/${encodeURIComponent(attraction.slug)}`}
              >
                {attraction.name}
              </Link>
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              {attraction.municipality} · {attraction.region.name}
            </p>
          </div>
          <FavoriteToggle attractionId={attraction.id} name={attraction.name} />
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-300">
          <span className="inline-flex items-center gap-2">
            <span
              aria-hidden="true"
              className={`size-2 rounded-full ${attraction.openState === 'OPEN' ? 'bg-emerald-400' : attraction.openState === 'CLOSED' ? 'bg-rose-400' : 'bg-amber-300'}`}
            />
            {translate(`openState.${attraction.openState}`)}
          </span>
          {openingUntil ? <span>{openingUntil}</span> : null}
          <span>{priceLabel(attraction.priceLevel, translate)}</span>
          <span>{duration}</span>
          {distance ? <span>{distance}</span> : null}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
          <span className={attraction.freshness.level === 'STALE' ? 'text-amber-300' : undefined}>
            {translate(`freshness.${attraction.freshness.level}`)}
          </span>
          <span className="text-slate-600">{attraction.slug}</span>
        </div>
        <AddToPlan
          attractionId={attraction.id}
        />
      </div>
    </article>
  );
}
