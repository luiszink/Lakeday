'use client';

import { summarizeDay } from '@lake/domain';
import type {
  ExceptionalClosure,
  OpeningSchedule,
  PlanConflict,
  PlanValidation,
} from '@lake/domain';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';

import { Link } from '../../i18n/navigation';
import { getPlansStore, PLAN_MAXIMUM_STOPS, type LocalPlan, type SharedPlanCopy } from '../../local-store/plan';
import type { MapProviderConfig } from '../../providers/map/types';
import { PrintButton } from './print-button';
import { PrintPlanSheet } from './print-plan-sheet';
import { SharedPlanMap } from './shared-plan-map';

const store = getPlansStore();

type SharedPlanStop = Readonly<{
  attractionId: string;
  available: boolean;
  coordinates: { latitude: number; longitude: number } | null;
  exceptionalClosures: readonly ExceptionalClosure[];
  hoursStale: boolean;
  municipality: string;
  name: string | null;
  openingSchedule: OpeningSchedule | null;
  officialWebsite: string | null;
  plannedDurationMin: number | null;
  sortIndex: number;
  typicalDuration: { max: number | null; min: number | null };
}>;

type SharedPlanData = Readonly<{
  date: string | null;
  lastAccessedAt: string;
  locale: 'de' | 'en';
  shareToken: string;
  startPoint: {
    coordinates: { latitude: number; longitude: number };
    label: string | null;
  } | null;
  stops: readonly SharedPlanStop[];
  validation: PlanValidation;
}>;

type SharedPlanExperienceProps = Readonly<{
  locale: 'de' | 'en';
  mapProviderConfig: MapProviderConfig;
  mapProviderKind: 'fake' | 'maplibre';
  shareToken: string;
}>;

type LoadState = 'loading' | 'ready' | 'not-found' | 'error';

type CopyState = 'idle' | 'copying' | 'success' | 'error';

function formatDate(date: string | null, locale: 'de' | 'en') {
  if (!date) return null;
  return new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeZone: 'Europe/Zurich' }).format(
    new Date(`${date}T12:00:00.000Z`),
  );
}

function conflictMessage(translate: ReturnType<typeof useTranslations<'sharedPlan'>>, conflict: PlanConflict) {
  const parameters = conflict.parameters;
  switch (conflict.code) {
    case 'ARRIVAL_TOO_CLOSE_TO_CLOSING':
      return translate('conflicts.arrival', { arrival: String(parameters.arrival), closes: String(parameters.closes) });
    case 'CLOSED_ON_DATE':
      return translate('conflicts.closed', { nextOpenDate: String(parameters.nextOpenDate) });
    case 'DAY_TOO_LONG':
      return translate('conflicts.dayLong');
    case 'HOURS_STALE':
      return translate('conflicts.stale');
    case 'HOURS_UNKNOWN':
      return translate('conflicts.unknown');
    case 'NO_DATE':
      return translate('conflicts.noDate');
    case 'VISIT_EXCEEDS_CLOSING':
      return translate('conflicts.visit', {
        closes: String(parameters.closes),
        departure: String(parameters.departure),
      });
  }
}

function severityLabel(translate: ReturnType<typeof useTranslations<'sharedPlan'>>, conflict: PlanConflict) {
  return translate(`conflicts.severity.${conflict.severity.toLowerCase()}` as never);
}

export function SharedPlanExperience({
  locale,
  mapProviderConfig,
  mapProviderKind,
  shareToken,
}: SharedPlanExperienceProps) {
  const translate = useTranslations('sharedPlan');
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [data, setData] = useState<SharedPlanData | null>(null);
  const [activePlan, setActivePlan] = useState<LocalPlan | null>(null);
  const [copyDialogOpen, setCopyDialogOpen] = useState(false);
  const [copyState, setCopyState] = useState<CopyState>('idle');
  const replaceButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let disposed = false;
    setLoadState('loading');
    void fetch(`/api/plans/${encodeURIComponent(shareToken)}?locale=${locale}`)
      .then(async (response) => {
        if (response.status === 404) {
          setLoadState('not-found');
          return null;
        }
        if (!response.ok) throw new Error('Shared plan request failed.');
        return (await response.json()) as SharedPlanData;
      })
      .then((nextData) => {
        if (disposed || !nextData) return;
        setData(nextData);
        setLoadState('ready');
      })
      .catch(() => {
        if (!disposed) setLoadState('error');
      });
    return () => {
      disposed = true;
    };
  }, [locale, shareToken]);

  useEffect(() => {
    let disposed = false;
    void store.getActive().then((active) => {
      if (!disposed) setActivePlan(active);
    });
    return () => {
      disposed = true;
    };
  }, []);

  useEffect(() => {
    if (!copyDialogOpen) return;
    replaceButton.current?.focus();
  }, [copyDialogOpen]);

  if (loadState === 'loading') {
    return <p aria-live="polite">{translate('loading')}</p>;
  }
  if (loadState === 'not-found') {
    return (
      <section className="border border-slate-800 bg-slate-900/60 p-8 text-center">
        <h1 className="text-2xl font-semibold text-white">{translate('notFound.title')}</h1>
        <p className="mx-auto mt-3 max-w-xl text-slate-400">{translate('notFound.description')}</p>
        <Link className="mt-6 inline-flex min-h-11 items-center rounded-md bg-cyan-400 px-4 font-semibold text-slate-950" href="/">
          {translate('notFound.cta')}
        </Link>
      </section>
    );
  }
  if (loadState === 'error' || !data) {
    return (
      <section aria-live="polite" className="border border-rose-900/70 bg-rose-950/20 p-8">
        <h1 className="text-2xl font-semibold text-white">{translate('error.title')}</h1>
        <p className="mt-3 text-rose-100">{translate('error.description')}</p>
      </section>
    );
  }

  const incomingStops = data.stops.map(({ attractionId, plannedDurationMin }) => ({ attractionId, plannedDurationMin }));
  const uniqueIncomingStops = incomingStops.filter(
    (stop, index) => incomingStops.findIndex((candidate) => candidate.attractionId === stop.attractionId) === index,
  );
  const mergeWouldExceedLimit = Boolean(
    activePlan &&
      activePlan.stops.length + uniqueIncomingStops.filter(
        (stop) => !activePlan.stops.some((existing) => existing.attractionId === stop.attractionId),
      ).length > PLAN_MAXIMUM_STOPS,
  );
  const formattedDate = formatDate(data.date, locale);
  const globalConflicts = data.validation.conflicts.filter((conflict) => conflict.stopIndex === null);
  const sharedPlanCopy: SharedPlanCopy = {
    date: data.date,
    locale,
    startPoint: data.startPoint
      ? { ...data.startPoint, label: data.startPoint.label ?? translate('start') }
      : null,
    stops: incomingStops,
  };
  const printStops = data.stops.map((stop, index) => {
    const timelineEntry = data.validation.timeline.find((entry) => entry.stopIndex === index);
    const hours = !data.date
      ? translate('print.typicalHours')
      : (() => {
          const summary = summarizeDay(stop.openingSchedule, data.date, {
            closures: stop.exceptionalClosures,
            isPublicHoliday: () => false,
            timeZone: 'Europe/Zurich',
          });
          if (summary.state === 'UNKNOWN') return translate('print.unknownHours');
          if (summary.state === 'CLOSED') return translate('print.closed');
          return summary.intervals.map((interval) => `${interval.opens}–${interval.closes}`).join(', ');
        })();
    return {
      address: stop.municipality,
      arrival: timelineEntry?.arrival ?? null,
      duration: stop.plannedDurationMin,
      hours,
      name: stop.name ?? translate('unavailable'),
      url: stop.officialWebsite,
    };
  });

  async function copy(mode: 'merge' | 'replace') {
    setCopyState('copying');
    try {
      await store.copySharedPlan(sharedPlanCopy, mode);
      setCopyDialogOpen(false);
      setCopyState('success');
    } catch {
      setCopyState('error');
    }
  }

  return (
    <div className="grid gap-8">
      <header className="border-b border-slate-800 pb-7">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-cyan-300">{translate('eyebrow')}</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white">{translate('title')}</h1>
            <p className="mt-3 max-w-2xl text-slate-400">{translate('description')}</p>
          </div>
          <nav aria-label={translate('locale.label')} className="flex gap-2 text-sm">
            {(['de', 'en'] as const).map((nextLocale) => (
              <a
                className={`rounded-md border px-3 py-2 ${nextLocale === locale ? 'border-cyan-300 text-cyan-200' : 'border-slate-700 text-slate-400 hover:border-slate-400'}`}
                href={`/${nextLocale}/plan/${encodeURIComponent(shareToken)}`}
                key={nextLocale}
              >
                {translate(`locale.${nextLocale}` as never)}
              </a>
            ))}
          </nav>
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-300">
          <span>{translate('date')}: {formattedDate ?? translate('noDate')}</span>
          {data.startPoint?.label ? <span>{translate('start')}: {data.startPoint.label}</span> : null}
          <span>{translate('stopCount', { count: data.stops.length })}</span>
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            className="min-h-11 rounded-md bg-cyan-400 px-4 text-sm font-semibold text-slate-950 hover:bg-cyan-300 disabled:opacity-60"
            disabled={!activePlan || copyState === 'copying'}
            onClick={() => {
              if (activePlan?.stops.length) setCopyDialogOpen(true);
              else void copy('replace');
            }}
            type="button"
          >
            {copyState === 'copying' ? translate('copying') : translate('copy')}
          </button>
          {copyState === 'success' ? (
            <span aria-live="polite" className="text-sm text-emerald-200">
              {translate('copied')} <Link className="font-semibold underline" href="/my-day">{translate('openMyDay')}</Link>
            </span>
          ) : null}
          {copyState === 'error' ? <span aria-live="polite" className="text-sm text-rose-200">{translate('copyError')}</span> : null}
          <PrintButton label={translate('print.button')} />
        </div>
      </header>

      {data.stops.some((stop) => stop.hoursStale) ? (
        <p className="border border-amber-900/70 bg-amber-950/20 p-4 text-sm text-amber-100">{translate('stale')}</p>
      ) : null}

      <section aria-labelledby="shared-plan-totals-heading" className="border border-slate-800 bg-slate-900/70 p-4">
        <h2 className="sr-only" id="shared-plan-totals-heading">{translate('totals.label')}</h2>
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-300">
          <span>{translate('totals.visit', { minutes: data.validation.totals.visitMinutes })}</span>
          <span>{translate('totals.travel', { minutes: data.validation.totals.travelMinutes })}</span>
          <strong className="text-white">{translate('totals.overall', { minutes: data.validation.totals.overallMinutes })}</strong>
        </div>
        {globalConflicts.length > 0 ? (
          <ul className="mt-4 grid gap-2">
            {globalConflicts.map((conflict) => (
              <li className="border-l-4 border-amber-300 bg-amber-950/30 p-3 text-sm text-amber-100" key={conflict.code}>
                <strong className="mr-2">{severityLabel(translate, conflict)}:</strong>{conflictMessage(translate, conflict)}
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <SharedPlanMap
        config={mapProviderConfig}
        fallback={translate('map.fallback')}
        kind={mapProviderKind}
        markers={data.stops
          .filter((stop): stop is SharedPlanStop & { coordinates: { latitude: number; longitude: number } } => stop.available && stop.coordinates !== null)
          .map((stop) => ({ coordinates: stop.coordinates, id: stop.attractionId, label: stop.name ?? translate('unavailable') }))}
        title={translate('map.title')}
      />

      <ol aria-label={translate('stopsLabel')} className="grid gap-3">
        {data.stops.map((stop, index) => {
          const conflicts = data.validation.conflicts.filter((conflict) => conflict.stopIndex === index);
          const timeline = data.validation.timeline.find((entry) => entry.stopIndex === index);
          const conflictId = `shared-plan-conflicts-${stop.attractionId}`;
          return (
            <li className="border border-slate-800 bg-slate-900/60 p-4 sm:p-5" key={`${stop.attractionId}-${stop.sortIndex}`}>
              <div className="flex gap-4">
                <span aria-hidden="true" className="text-lg font-semibold text-cyan-300">{index + 1}</span>
                <div className="min-w-0">
                  <h2 aria-describedby={conflicts.length > 0 ? conflictId : undefined} className="font-semibold text-white">
                    {stop.available ? stop.name : translate('unavailable')}
                  </h2>
                  <p className="mt-1 text-sm text-slate-400">
                    {stop.available ? stop.municipality : translate('unavailableDescription')}
                  </p>
                  {timeline ? <p className="mt-2 text-sm text-cyan-200">{translate('timeline', { arrival: timeline.arrival, departure: timeline.departure })}</p> : null}
                  {conflicts.length > 0 ? (
                    <ul className="mt-3 grid gap-2" id={conflictId}>
                      {conflicts.map((conflict) => (
                        <li className={`border-l-4 p-3 text-sm ${conflict.severity === 'ERROR' ? 'border-rose-400 bg-rose-950/30 text-rose-100' : conflict.severity === 'WARNING' ? 'border-amber-300 bg-amber-950/30 text-amber-100' : 'border-sky-300 bg-sky-950/30 text-sky-100'}`} key={`${conflict.code}-${conflict.stopIndex}`}>
                          <strong className="mr-2">{severityLabel(translate, conflict)}:</strong>{conflictMessage(translate, conflict)}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      {copyDialogOpen ? (
        <div aria-labelledby="copy-dialog-title" aria-modal="true" className="fixed inset-0 z-30 grid place-items-center bg-slate-950/80 p-5" role="dialog">
          <div className="w-full max-w-lg border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <h2 className="text-xl font-semibold text-white" id="copy-dialog-title">{translate('copyDialog.title')}</h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">{translate('copyDialog.description')}</p>
            {mergeWouldExceedLimit ? <p className="mt-3 text-sm text-amber-200">{translate('copyDialog.mergeLimit')}</p> : null}
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button className="min-h-11 rounded-md border border-slate-600 px-4 text-sm text-slate-200" onClick={() => setCopyDialogOpen(false)} type="button">
                {translate('copyDialog.cancel')}
              </button>
              <button className="min-h-11 rounded-md border border-cyan-700 px-4 text-sm font-semibold text-cyan-200 disabled:opacity-50" disabled={mergeWouldExceedLimit || copyState === 'copying'} onClick={() => void copy('merge')} type="button">
                {translate('copyDialog.merge')}
              </button>
              <button ref={replaceButton} className="min-h-11 rounded-md bg-cyan-400 px-4 text-sm font-semibold text-slate-950 disabled:opacity-50" disabled={copyState === 'copying'} onClick={() => void copy('replace')} type="button">
                {translate('copyDialog.replace')}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      <PrintPlanSheet
        date={data.date}
        locale={locale}
        startLabel={data.startPoint?.label ?? null}
        stops={printStops}
        title={translate('print.title')}
        timestampLabel={translate('print.timestamp')}
        unknownHoursLabel={translate('print.noDate')}
        visitLabel={translate('print.visit')}
      />
    </div>
  );
}
