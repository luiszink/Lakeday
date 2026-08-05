'use client';

import {
  summarizeDay,
  type AttractionDetailResponse,
  type AttractionListResponse,
  type PlanConflict,
  type PlanValidation,
  validatePlan,
} from '@lake/domain';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useState, useSyncExternalStore } from 'react';

import { LocationPicker } from '../location-picker';
import { PrintButton } from './print-button';
import { PrintPlanSheet } from './print-plan-sheet';
import { ShareButton } from './share-button';
import { readLocalLocation, type LocalLocation } from '../../location/local-location';
import {
  getPlansStore,
  type LocalPlan,
  type PlanStartPoint,
} from '../../local-store/plan';

const store = getPlansStore();

function defaultDuration(item: AttractionListResponse['items'][number]) {
  const minimum = item.typicalDuration?.min;
  const maximum = item.typicalDuration?.max;
  if (minimum === null || minimum === undefined) return maximum ?? 60;
  if (maximum === null || maximum === undefined) return minimum;
  return Math.round((minimum + maximum) / 2 / 15) * 15;
}

function dateInputValue(date: string | null) {
  return date ?? '';
}

export function PlanExperience() {
  const locale = useLocale() as 'de' | 'en';
  const translate = useTranslations('plan');
  const snapshot = useSyncExternalStore(
    (listener) => store.subscribe(listener),
    () => store.getSnapshot(),
    () => 'unknown|0|',
  );
  const [plan, setPlan] = useState<LocalPlan | null>(null);
  const [snapshots, setSnapshots] = useState<readonly LocalPlan[]>([]);
  const [items, setItems] = useState<AttractionListResponse['items']>([]);
  const [details, setDetails] = useState<AttractionDetailResponse[]>([]);
  const [location, setLocation] = useState<LocalLocation | null>(null);
  const [requestState, setRequestState] = useState<'idle' | 'loading' | 'error'>('idle');
  const [draggedId, setDraggedId] = useState<string | null>(null);

  useEffect(() => {
    setLocation(readLocalLocation());
    void store.hydrate();
  }, []);

  useEffect(() => {
    let disposed = false;
    void store.getActive().then((active) => {
      if (!disposed) setPlan(active);
    });
    void store.getSnapshots().then((saved) => {
      if (!disposed) setSnapshots(saved);
    });
    return () => {
      disposed = true;
    };
  }, [snapshot]);

  useEffect(() => {
    if (!plan || plan.stops.length === 0) {
      setItems([]);
      setDetails([]);
      return;
    }
    let disposed = false;
    setRequestState('loading');
    const query = new URLSearchParams({ ids: plan.stops.map((stop) => stop.attractionId).join(','), locale });
    void fetch(`/api/attractions?${query.toString()}`)
      .then(async (response) => {
        if (!response.ok) throw new Error('Plan attractions request failed.');
        return (await response.json()) as AttractionListResponse;
      })
      .then((data) => {
        if (!disposed) {
          setItems(data.items);
        }
        return Promise.all(
          plan.stops.map(async (stop) => {
            const response = await fetch(
              `/api/attractions/${encodeURIComponent(stop.attractionId)}?locale=${locale}`,
            );
            if (!response.ok) return null;
            return (await response.json()) as AttractionDetailResponse;
          }),
        );
      })
      .then((loadedDetails) => {
        if (!disposed) {
          setDetails(loadedDetails.filter((detail): detail is AttractionDetailResponse => detail !== null));
          setRequestState('idle');
        }
      })
      .catch(() => {
        if (!disposed) setRequestState('error');
      });
    return () => {
      disposed = true;
    };
  }, [locale, plan]);

  function updateLocation(nextLocation: LocalLocation) {
    setLocation(nextLocation);
    const startPoint: PlanStartPoint = nextLocation;
    void store.setStartPoint(startPoint);
  }

  async function dropOn(targetId: string) {
    if (!draggedId || draggedId === targetId || !plan) return;
    const sourceIndex = plan.stops.findIndex((stop) => stop.attractionId === draggedId);
    const targetIndex = plan.stops.findIndex((stop) => stop.attractionId === targetId);
    if (sourceIndex < 0 || targetIndex < 0) return;
    const direction = sourceIndex < targetIndex ? 'down' : 'up';
    for (let index = sourceIndex; direction === 'down' ? index < targetIndex : index > targetIndex; index += direction === 'down' ? 1 : -1) {
      await store.move(draggedId, direction);
    }
    setDraggedId(null);
  }

  if (!plan) return <p>{translate('loading')}</p>;
  const activePlan = plan;
  const itemById = new Map(items.map((item) => [item.id, item]));
  const detailById = new Map(details.map((detail) => [detail.id, detail]));
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Zurich' }).format(new Date());
  const validation: PlanValidation | null =
    details.length > 0
      ? validatePlan(
          {
            date: plan.date,
            dayStart: plan.dayStart,
            startPoint: plan.startPoint?.coordinates,
            stops: plan.stops,
          },
          details.map((detail) => ({
            coordinates: detail.coordinates,
            exceptionalClosures: detail.exceptionalClosures,
            hoursStale: detail.factFreshness.some(
              (fact) => fact.factKey === 'opening_hours' && fact.status === 'STALE',
            ),
            id: detail.id,
            openingSchedule: detail.openingSchedule,
            typicalDurationMax: detail.typicalDuration?.max ?? null,
            typicalDurationMin: detail.typicalDuration?.min ?? null,
          })),
        )
      : null;

  const printStops = plan.stops.map((stop, index) => {
    const detail = detailById.get(stop.attractionId);
    const item = itemById.get(stop.attractionId);
    const timelineEntry = validation?.timeline.find((entry) => entry.stopIndex === index);
    const date = plan.date;
    const hours = !date
      ? translate('print.typicalHours')
      : detail
        ? (() => {
            const summary = summarizeDay(detail.openingSchedule, date, {
              closures: detail.exceptionalClosures,
              isPublicHoliday: () => false,
              timeZone: 'Europe/Zurich',
            });
            if (summary.state === 'UNKNOWN') return translate('print.unknownHours');
            if (summary.state === 'CLOSED') return translate('print.closed');
            return summary.intervals.map((interval) => `${interval.opens}–${interval.closes}`).join(', ');
          })()
        : translate('print.unknownHours');
    return {
      address: detail?.municipality ?? item?.municipality ?? translate('unavailable'),
      arrival: timelineEntry?.arrival ?? null,
      duration: stop.plannedDurationMin ?? (item ? defaultDuration(item) : null),
      hours,
      name: detail?.localization.name ?? item?.name ?? translate('unavailable'),
      url: detail?.officialWebsite ?? null,
    };
  });

  function conflictMessage(conflict: PlanConflict) {
    const parameters = conflict.parameters;
    switch (conflict.code) {
      case 'ARRIVAL_TOO_CLOSE_TO_CLOSING':
        return translate('conflicts.arrival', {
          arrival: String(parameters.arrival),
          closes: String(parameters.closes),
        });
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

  function severityLabel(conflict: PlanConflict) {
    return translate(`conflicts.severity.${conflict.severity.toLowerCase()}` as never);
  }

  function adjacentSuggestion(stopIndex: number) {
    if (!validation || details.length === 0) return null;
    const candidateIndex = stopIndex < activePlan.stops.length - 1 ? stopIndex + 1 : stopIndex - 1;
    if (candidateIndex < 0 || candidateIndex >= activePlan.stops.length) return null;
    const swappedStops = activePlan.stops.map((stop, index) =>
      index === stopIndex
        ? activePlan.stops[candidateIndex]!
        : index === candidateIndex
          ? activePlan.stops[stopIndex]!
          : stop,
    );
    const candidate = validatePlan(
      { date: activePlan.date, dayStart: activePlan.dayStart, startPoint: activePlan.startPoint?.coordinates, stops: swappedStops },
      details.map((detail) => ({
        coordinates: detail.coordinates,
        exceptionalClosures: detail.exceptionalClosures,
        hoursStale: detail.factFreshness.some((fact) => fact.factKey === 'opening_hours' && fact.status === 'STALE'),
        id: detail.id,
        openingSchedule: detail.openingSchedule,
        typicalDurationMax: detail.typicalDuration?.max ?? null,
        typicalDurationMin: detail.typicalDuration?.min ?? null,
      })),
    );
    const currentConflicts = validation.conflicts.filter((conflict) => conflict.stopIndex === stopIndex).length;
    const candidateConflicts = candidate.conflicts.filter((conflict) => conflict.stopIndex === candidateIndex).length;
    return candidateConflicts < currentConflicts ? candidateIndex : null;
  }

  function applySuggestion(stopIndex: number, candidateIndex: number) {
    const direction = stopIndex < candidateIndex ? 'down' : 'up';
    void store.move(activePlan.stops[stopIndex]!.attractionId, direction);
  }

  return (
    <div className="print-plan-wrapper">
      <div className="grid gap-8 print-screen-content">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <label className="block text-sm font-semibold text-slate-200" htmlFor="plan-date">
            {translate('date')}
          </label>
          <input
            className="mt-2 min-h-11 rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-white focus:border-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-300"
            id="plan-date"
            onChange={(event) => void store.setDate(event.target.value || null)}
            type="date"
            value={dateInputValue(plan.date)}
          />
          {plan.date && plan.date < today ? (
            <p className="mt-2 text-sm text-amber-200">{translate('pastDate')}</p>
          ) : null}
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-200" htmlFor="plan-day-start">
            {translate('dayStart')}
          </label>
          <input
            className="mt-2 min-h-11 rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-white focus:border-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-300"
            id="plan-day-start"
            onChange={(event) => void store.setDayStart(event.target.value)}
            type="time"
            value={plan.dayStart}
          />
        </div>
        <div className="flex flex-wrap items-end gap-4">
          <p aria-live="polite" className="text-sm text-slate-400">
            {translate('stopCount', { count: plan.stops.length })}
          </p>
          <PrintButton
            disabled={plan.stops.length === 0}
            hint={plan.stops.length === 0 ? translate('print.emptyHint') : ''}
            label={translate('print.button')}
          />
        </div>
      </div>

      <section aria-labelledby="start-point-heading">
        <h2 className="text-lg font-semibold text-white" id="start-point-heading">
          {translate('startPoint')}
        </h2>
        <div className="mt-3">
          <LocationPicker locale={locale} location={location} onChange={updateLocation} />
        </div>
      </section>

      {requestState === 'error' ? (
        <p aria-live="polite" className="rounded-md border border-rose-900/70 p-4 text-sm text-rose-200">
          {translate('error')}
        </p>
      ) : null}
      {requestState === 'loading' ? <p className="text-sm text-slate-400">{translate('loading')}</p> : null}
      {validation?.date === null && plan.stops.length > 0 ? (
        <p className="border border-amber-900/70 bg-amber-950/20 p-4 text-sm text-amber-100">
          {translate('noDateNotice')}
        </p>
      ) : null}
      {validation ? (
        <section aria-label={translate('totals.label')} className="border border-slate-800 bg-slate-900/70 p-4">
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-300">
            <span>{translate('totals.visit', { minutes: validation.totals.visitMinutes })}</span>
            <span>{translate('totals.travel', { minutes: validation.totals.travelMinutes })}</span>
            <strong className="text-white">{translate('totals.overall', { minutes: validation.totals.overallMinutes })}</strong>
          </div>
          <div aria-hidden="true" className="mt-3 flex h-2 overflow-hidden rounded bg-slate-800">
            <span className="bg-cyan-400" style={{ flexGrow: validation.totals.visitMinutes }} />
            <span className="bg-amber-300" style={{ flexGrow: validation.totals.travelMinutes }} />
          </div>
          <p className="mt-3 text-xs text-slate-500">{translate('totals.approximation')}</p>
          {validation.conflicts.filter((conflict) => conflict.stopIndex === null).length > 0 ? (
            <ul className="mt-3 grid gap-2">
              {validation.conflicts.filter((conflict) => conflict.stopIndex === null).map((conflict) => (
                <li className="border-l-4 border-amber-300 bg-amber-950/30 p-3 text-sm text-amber-100" key={conflict.code}>
                  <strong className="mr-2">{severityLabel(conflict)}:</strong>{conflictMessage(conflict)}
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}

      {plan.stops.length === 0 ? (
        <section className="border border-dashed border-slate-700 p-8 text-center">
          <h2 className="text-xl font-semibold text-white">{translate('empty.title')}</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-400">
            {translate('empty.description')}
          </p>
          <a className="mt-5 inline-flex rounded-md bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950" href={`/${locale}`}>
            {translate('empty.cta')}
          </a>
        </section>
      ) : (
        <ol aria-label={translate('stopsLabel')} className="grid gap-3">
          {plan.stops.map((stop, index) => {
            const item = itemById.get(stop.attractionId);
            const stopConflicts = validation?.conflicts.filter((conflict) => conflict.stopIndex === index) ?? [];
            const timelineEntry = validation?.timeline.find((entry) => entry.stopIndex === index);
            const suggestionIndex = stopConflicts.length > 0 ? adjacentSuggestion(index) : null;
            const conflictId = `plan-conflicts-${stop.attractionId}`;
            const duration = stop.plannedDurationMin ?? (item ? defaultDuration(item) : 60);
            return (
              <li
                className="grid gap-4 border border-slate-800 bg-slate-900/60 p-4 sm:grid-cols-[auto_1fr_auto] sm:items-center"
                draggable
                key={stop.attractionId}
                onDragEnd={() => setDraggedId(null)}
                onDragOver={(event) => event.preventDefault()}
                onDragStart={() => setDraggedId(stop.attractionId)}
                onDrop={() => void dropOn(stop.attractionId)}
              >
                <span aria-hidden="true" className="cursor-grab text-lg font-semibold text-cyan-300">{index + 1}</span>
                <div className="min-w-0">
                  <h2 aria-describedby={stopConflicts.length > 0 ? conflictId : undefined} className="font-semibold text-white">
                    {item?.name ?? translate('unavailable')}
                  </h2>
                  <p className="mt-1 text-sm text-slate-400">
                    {item ? item.municipality : translate('unavailableDescription')}
                  </p>
                  {timelineEntry ? (
                    <p className="mt-2 text-sm text-cyan-200">
                      {translate('timeline', { arrival: timelineEntry.arrival, departure: timelineEntry.departure })}
                    </p>
                  ) : null}
                  <label className="mt-3 flex items-center gap-2 text-sm text-slate-300" htmlFor={`duration-${stop.attractionId}`}>
                    {translate('duration')}
                    <input
                      className="min-h-9 w-20 rounded-md border border-slate-700 bg-slate-950 px-2 text-right text-white"
                      id={`duration-${stop.attractionId}`}
                      min="15"
                      onChange={(event) => void store.setDuration(stop.attractionId, Number(event.target.value))}
                      step="15"
                      type="number"
                      value={duration}
                    />
                    {translate('minutes')}
                  </label>
                  {stopConflicts.length > 0 ? (
                    <ul className="mt-3 grid gap-2" id={conflictId}>
                      {stopConflicts.map((conflict) => (
                        <li
                          className={`border-l-4 p-3 text-sm ${conflict.severity === 'ERROR' ? 'border-rose-400 bg-rose-950/30 text-rose-100' : conflict.severity === 'WARNING' ? 'border-amber-300 bg-amber-950/30 text-amber-100' : 'border-sky-300 bg-sky-950/30 text-sky-100'}`}
                          key={`${conflict.code}-${conflict.stopIndex}`}
                        >
                          <strong className="mr-2">{severityLabel(conflict)}:</strong>
                          {conflictMessage(conflict)}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {suggestionIndex !== null ? (
                    <button
                      className="mt-2 text-left text-sm font-semibold text-cyan-300 underline underline-offset-2"
                      onClick={() => applySuggestion(index, suggestionIndex)}
                      type="button"
                    >
                      {translate('suggestion', { position: suggestionIndex + 1 })}
                    </button>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2 sm:justify-end">
                  <button aria-label={translate('moveUp', { name: item?.name ?? translate('unavailable') })} className="min-h-10 rounded-md border border-slate-700 px-3 text-lg text-slate-200 disabled:opacity-40" disabled={index === 0} onClick={() => void store.move(stop.attractionId, 'up')} type="button">↑</button>
                  <button aria-label={translate('moveDown', { name: item?.name ?? translate('unavailable') })} className="min-h-10 rounded-md border border-slate-700 px-3 text-lg text-slate-200 disabled:opacity-40" disabled={index === plan.stops.length - 1} onClick={() => void store.move(stop.attractionId, 'down')} type="button">↓</button>
                  <button className="min-h-10 rounded-md border border-rose-900 px-3 text-sm text-rose-200" onClick={() => void store.remove(stop.attractionId)} type="button">{translate('remove')}</button>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <section aria-labelledby="saved-plans-heading" className="border-t border-slate-800 pt-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-white" id="saved-plans-heading">
            {translate('saved.title')}
          </h2>
          <button
            className="min-h-10 rounded-md border border-cyan-700 px-3 text-sm font-semibold text-cyan-200 hover:border-cyan-300"
            onClick={() => void store.saveSnapshot().then((saved) => setSnapshots((current) => [saved, ...current]))}
            type="button"
          >
            {translate('saved.save')}
          </button>
          <ShareButton plan={activePlan} />
        </div>
        {snapshots.length > 0 ? (
          <ul className="mt-3 grid gap-2 text-sm text-slate-400 sm:grid-cols-2">
            {snapshots.map((saved) => (
              <li className="border border-slate-800 px-3 py-2" key={saved.id}>
                <span>{saved.date ?? translate('saved.noDate')} · {translate('stopCount', { count: saved.stops.length })}</span>
                <span className="mt-2 flex flex-wrap gap-3">
                  <button className="font-semibold text-cyan-300 underline" onClick={() => void store.restoreSnapshot(saved.id)} type="button">{translate('saved.restore')}</button>
                  <button className="font-semibold text-slate-400 underline" onClick={() => void store.duplicateSnapshot(saved.id).then((duplicate) => duplicate && setSnapshots((current) => [duplicate, ...current]))} type="button">{translate('saved.duplicate')}</button>
                  <button className="font-semibold text-rose-300 underline" onClick={() => void store.deleteSnapshot(saved.id).then(() => setSnapshots((current) => current.filter((snapshot) => snapshot.id !== saved.id)))} type="button">{translate('saved.delete')}</button>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-slate-500">{translate('saved.empty')}</p>
        )}
      </section>
      </div>
      <PrintPlanSheet
        date={plan.date}
        locale={locale}
        startLabel={plan.startPoint?.label ?? null}
        stops={printStops}
        title={translate('print.title')}
        timestampLabel={translate('print.timestamp')}
        unknownHoursLabel={translate('print.noDate')}
        visitLabel={translate('duration')}
      />
    </div>
  );
}