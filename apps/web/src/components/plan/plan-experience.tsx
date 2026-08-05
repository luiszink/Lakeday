'use client';

import type { AttractionListResponse } from '@lake/domain';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useState, useSyncExternalStore } from 'react';

import { LocationPicker } from '../location-picker';
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
  const itemById = new Map(items.map((item) => [item.id, item]));
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Zurich' }).format(new Date());

  return (
    <div className="grid gap-8">
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
        <p aria-live="polite" className="text-sm text-slate-400">
          {translate('stopCount', { count: plan.stops.length })}
        </p>
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
                  <h2 className="font-semibold text-white">{item?.name ?? translate('unavailable')}</h2>
                  <p className="mt-1 text-sm text-slate-400">
                    {item ? item.municipality : translate('unavailableDescription')}
                  </p>
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
        </div>
        {snapshots.length > 0 ? (
          <ul className="mt-3 grid gap-2 text-sm text-slate-400 sm:grid-cols-2">
            {snapshots.map((saved) => (
              <li className="border border-slate-800 px-3 py-2" key={saved.id}>
                {saved.date ?? translate('saved.noDate')} · {translate('stopCount', { count: saved.stops.length })}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-slate-500">{translate('saved.empty')}</p>
        )}
      </section>
    </div>
  );
}