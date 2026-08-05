'use client';

import { useTranslations } from 'next-intl';
import { usePathname, useRouter } from '../../i18n/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';

import type { LocalLocation } from '../../location/local-location';
import {
  countActiveFilters,
  filterKeys,
  readFilterState,
  type FilterKey,
  type FilterState,
} from './filter-state';

const multiOptions = {
  region: [
    'OBERSEE_NORD',
    'OBERSEE_SUED',
    'UEBERLINGER_SEE',
    'KONSTANZ_SEERHEIN',
    'UNTERSEE_NORD',
    'UNTERSEE_SUED',
    'THURGAU_UFER',
    'BAYERN_UFER',
    'VORARLBERG_UFER',
  ],
  cat: [
    'NATURE',
    'lakeside_beach',
    'nature_reserve',
    'island',
    'viewpoint',
    'garden_park',
    'CULTURE_HISTORY',
    'castle_palace',
    'church_monastery',
    'museum',
    'old_town',
    'FAMILY_ACTIVITY',
    'zoo_wildlife',
    'playground',
    'adventure',
    'pool_lido',
    'WATER',
    'boat_trip',
    'ferry_experience',
    'swimming',
    'watersports',
    'ACTIVE',
    'hiking_trail',
    'cycling_route',
    'climbing',
    'EXPERIENCE',
    'cable_car',
    'scenic_railway',
    'thermal_spa',
    'market',
    'KNOWLEDGE',
    'science_center',
    'industry_heritage',
    'planetarium',
    'guided_tour',
  ],
  interest: [
    'history',
    'art',
    'technology',
    'nature',
    'animals',
    'water_fun',
    'adventure',
    'relaxation',
    'food_wine',
    'architecture',
    'science',
    'photography',
    'local_traditions',
  ],
  audience: ['families', 'couples', 'solo', 'groups', 'seniors'],
  age: ['0-2', '3-5', '6-9', '10-13', '14+'],
  io: ['indoor', 'outdoor', 'mixed'],
  season: ['SPRING', 'SUMMER', 'AUTUMN', 'WINTER', 'ALL_YEAR'],
  price: ['free', 'low', 'medium', 'high', 'premium'],
  dur: ['under_1h', '1_2h', '2_4h', 'half_day', 'full_day'],
  mode: ['walk', 'bike', 'pt', 'car'],
  lang: ['de', 'en', 'fr', 'it'],
} as const satisfies Partial<Record<FilterKey, readonly string[]>>;

const singleOptions = {
  rain: ['ok', 'good', 'excellent'],
  heat: ['ok', 'good', 'excellent'],
} as const satisfies Partial<Record<FilterKey, readonly string[]>>;

const booleanFilters = [
  'food',
  'cafe',
  'picnic',
  'noresv',
  'wheelchair',
  'stroller',
  'dogs',
] as const;

type FilterPanelProps = Readonly<{
  initialQuery: string;
  initialTotal: number;
  locale: 'de' | 'en';
  location: LocalLocation | null;
}>;

function roundedLocation(location: LocalLocation) {
  return `${Math.round(location.coordinates.latitude * 1_000) / 1_000},${Math.round(location.coordinates.longitude * 1_000) / 1_000}`;
}

function localDate(value: Date) {
  const parts = new Intl.DateTimeFormat('en', {
    day: '2-digit',
    month: '2-digit',
    timeZone: 'Europe/Zurich',
    year: 'numeric',
  }).formatToParts(value);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function FilterPanel({ initialQuery, initialTotal, locale, location }: FilterPanelProps) {
  const translate = useTranslations('discover');
  const pathname = usePathname();
  const router = useRouter();
  const dialogReference = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<FilterState>(() => readFilterState(initialQuery));
  const [isOpen, setIsOpen] = useState(false);
  const [previewCount, setPreviewCount] = useState(initialTotal);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [locationMessage, setLocationMessage] = useState(false);
  const [isPending, startTransition] = useTransition();
  const activeCount = countActiveFilters(state);
  const today = localDate(new Date());
  const selectedDate = state.open?.startsWith('date:') ? state.open.slice('date:'.length) : '';

  function filterTranslate(key: string, values?: Record<string, string | number>) {
    return translate(key as never, values as never);
  }

  useEffect(() => {
    setState(readFilterState(initialQuery));
  }, [initialQuery]);

  useEffect(() => {
    const controller = new AbortController();
    const parameters = new URLSearchParams(window.location.search);
    for (const key of filterKeys) parameters.delete(key);
    for (const [key, value] of Object.entries(state)) parameters.set(key, value);
    parameters.set('locale', locale);
    parameters.set('limit', '1');
    parameters.delete('cursor');
    setPreviewLoading(true);
    fetch(`/api/attractions?${parameters.toString()}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error('Preview request failed.');
        const data = (await response.json()) as { total?: number };
        setPreviewCount(typeof data.total === 'number' ? data.total : initialTotal);
      })
      .catch(() => {
        if (!controller.signal.aborted) setPreviewCount(initialTotal);
      })
      .finally(() => {
        if (!controller.signal.aborted) setPreviewLoading(false);
      });
    return () => controller.abort();
  }, [initialTotal, locale, state]);

  useEffect(() => {
    if (!isOpen) return;
    const dialog = dialogReference.current;
    if (!dialog) return;
    const focusable = dialog.querySelectorAll<HTMLElement>('button, select, input, summary');
    focusable[0]?.focus();
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
        return;
      }
      if (event.key !== 'Tab' || focusable.length === 0) return;
      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    dialog.addEventListener('keydown', handleKeyDown);
    return () => dialog.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  function updateState(nextState: FilterState) {
    setLocationMessage(false);
    setState(nextState);
  }

  function setOpenValue(value: string | undefined) {
    const nextState = { ...state };
    if (value) nextState.open = value;
    else delete nextState.open;
    updateState(nextState);
  }

  function toggleBoolean(key: (typeof booleanFilters)[number]) {
    const nextState = { ...state };
    if (nextState[key]) delete nextState[key];
    else nextState[key] = '1';
    updateState(nextState);
  }

  function setSingleValue(key: 'rain' | 'heat', value: string) {
    updateState({ ...state, ...(state[key] === value ? { [key]: undefined } : { [key]: value }) });
  }

  function setRadius(radius: string) {
    if (!location) {
      setLocationMessage(true);
      return;
    }
    updateState({ ...state, near: roundedLocation(location), r: radius });
  }

  function clearFilter(key: FilterKey) {
    const nextState = { ...state };
    delete nextState[key];
    if (key === 'r') delete nextState.near;
    updateState(nextState);
    applyState(nextState);
  }

  function applyState(nextState = state) {
    const parameters = new URLSearchParams(window.location.search);
    for (const key of filterKeys) parameters.delete(key);
    for (const [key, value] of Object.entries(nextState)) {
      if (value) parameters.set(key, value);
    }
    parameters.delete('cursor');
    const query = parameters.toString();
    startTransition(() => router.replace(query ? `${pathname}?${query}` : pathname));
    setIsOpen(false);
  }

  function clearAll() {
    updateState({});
    applyState({});
  }

  function applyQuickFilter(nextState: FilterState) {
    updateState(nextState);
    applyState(nextState);
  }

  function renderMultiSelect(key: keyof typeof multiOptions) {
    const options = multiOptions[key];
    const selected = state[key]?.split(',').filter(Boolean) ?? [];
    return (
      <details
        className="overflow-hidden rounded-md border border-slate-700 bg-slate-950/60 text-sm text-slate-200"
        key={key}
      >
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-3 font-semibold outline-none marker:hidden hover:bg-slate-900 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-300">
          <span>{filterTranslate(`filters.fields.${key}`)}</span>
          <span className="shrink-0 text-xs font-normal text-slate-400">
            {selected.length
              ? translate('filters.selectedCount', { count: selected.length })
              : translate('filters.any')}
          </span>
        </summary>
        <div
          aria-label={filterTranslate(`filters.fields.${key}`)}
          className="grid max-h-56 gap-1 overflow-y-auto border-t border-slate-800 p-2 sm:grid-cols-2"
        >
          {options.map((option) => (
            <label
              className="flex min-h-9 cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-slate-300 hover:bg-slate-900"
              key={option}
            >
              <input
                checked={selected.includes(option)}
                className="size-4 shrink-0 accent-cyan-400"
                onChange={(event) => {
                  const values = new Set(selected);
                  if (event.currentTarget.checked) values.add(option);
                  else values.delete(option);
                  const nextState = { ...state };
                  if (values.size) nextState[key] = [...values].join(',');
                  else delete nextState[key];
                  updateState(nextState);
                }}
                type="checkbox"
              />
              <span>{filterTranslate(`filters.options.${key}.${option}`)}</span>
            </label>
          ))}
        </div>
      </details>
    );
  }

  return (
    <section className="mb-6">
      <button
        aria-expanded={isOpen}
        className="flex w-full items-center justify-between rounded-md border border-slate-700 bg-slate-900 px-4 py-3 text-left text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-cyan-300 lg:hidden"
        onClick={() => setIsOpen(true)}
        type="button"
      >
        <span>{translate('filters.open')}</span>
        <span className="rounded-full bg-cyan-400 px-2 py-0.5 text-xs text-slate-950">
          {activeCount}
        </span>
      </button>

      <div
        aria-label={translate('filters.title')}
        aria-modal={isOpen ? true : undefined}
        className={`${isOpen ? 'fixed inset-0 z-40 overflow-y-auto bg-slate-950 p-5' : 'hidden'} lg:static lg:block lg:rounded-lg lg:border lg:border-slate-800 lg:bg-slate-900/70 lg:p-5`}
        ref={dialogReference}
        role={isOpen ? 'dialog' : undefined}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-white">{translate('filters.title')}</h2>
            <p className="mt-1 text-sm text-slate-400">{translate('filters.mustHint')}</p>
          </div>
          <button
            aria-label={translate('filters.close')}
            className="rounded-md px-2 py-1 text-2xl leading-none text-slate-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-cyan-300 lg:hidden"
            onClick={() => setIsOpen(false)}
            type="button"
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>

        <div className="mt-5 flex flex-wrap gap-2" aria-label={translate('filters.quickTitle')}>
          <button
            className="rounded-full border border-slate-700 px-3 py-1.5 text-sm text-slate-200 hover:border-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-300"
            onClick={() => applyQuickFilter({ ...state, price: 'free' })}
            type="button"
          >
            {translate('filters.quick.free')}
          </button>
          <button
            className="rounded-full border border-slate-700 px-3 py-1.5 text-sm text-slate-200 hover:border-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-300"
            onClick={() => applyQuickFilter({ ...state, rain: 'good' })}
            type="button"
          >
            {translate('filters.quick.rain')}
          </button>
          <button
            className="rounded-full border border-slate-700 px-3 py-1.5 text-sm text-slate-200 hover:border-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-300"
            onClick={() => applyQuickFilter({ ...state, age: '0-2,3-5' })}
            type="button"
          >
            {translate('filters.quick.kids')}
          </button>
          <button
            className="rounded-full border border-slate-700 px-3 py-1.5 text-sm text-slate-200 hover:border-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-300"
            onClick={() => applyQuickFilter({ ...state, wheelchair: '1' })}
            type="button"
          >
            {translate('filters.quick.accessible')}
          </button>
          <button
            aria-pressed={state.open === 'now'}
            className="rounded-full border border-slate-700 px-3 py-1.5 text-sm text-slate-200 hover:border-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-300"
            onClick={() => {
              const nextState = { ...state };
              if (state.open === 'now') delete nextState.open;
              else nextState.open = 'now';
              applyQuickFilter(nextState);
            }}
            type="button"
          >
            {translate('filters.quick.openNow')}
          </button>
        </div>

        {activeCount > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2" aria-label={translate('filters.activeTitle')}>
            {filterKeys
              .filter((key) => key !== 'near' && state[key])
              .map((key) => (
                <button
                  aria-label={translate('filters.remove', {
                    filter: filterTranslate(`filters.fields.${key}`),
                  })}
                  className="rounded-full border border-cyan-300/50 bg-cyan-950/40 px-3 py-1 text-xs text-cyan-100 hover:border-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-300"
                  key={key}
                  onClick={() => clearFilter(key)}
                  type="button"
                >
                  {filterTranslate(`filters.fields.${key}`)} ×
                </button>
              ))}
          </div>
        ) : null}

        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {renderMultiSelect('region')}
          {renderMultiSelect('cat')}
          {renderMultiSelect('interest')}
          {renderMultiSelect('audience')}
          {renderMultiSelect('age')}
          {renderMultiSelect('io')}
          {renderMultiSelect('season')}
          {renderMultiSelect('price')}
          {renderMultiSelect('dur')}
          {renderMultiSelect('mode')}
          {renderMultiSelect('lang')}
          {(['rain', 'heat'] as const).map((key) => (
            <label className="grid gap-2 text-sm text-slate-300" key={key}>
              <span className="font-semibold text-slate-200">
                {filterTranslate(`filters.fields.${key}`)}
              </span>
              <select
                className="min-h-10 rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 focus:border-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-300/30"
                onChange={(event) => setSingleValue(key, event.currentTarget.value)}
                value={state[key] ?? ''}
              >
                <option value="">{translate('filters.any')}</option>
                {singleOptions[key].map((option) => (
                  <option key={option} value={option}>
                    {filterTranslate(`filters.options.${key}.${option}`)}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>

        <fieldset className="mt-5 border-t border-slate-800 pt-4">
          <legend className="text-sm font-semibold text-slate-200">
            {translate('filters.fields.open')}
          </legend>
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <button
              aria-pressed={state.open === 'now'}
              className={`rounded-md border px-3 py-2 text-sm ${state.open === 'now' ? 'border-cyan-300 bg-cyan-400 text-slate-950' : 'border-slate-700 text-slate-200 hover:border-cyan-300'} focus:outline-none focus:ring-2 focus:ring-cyan-300`}
              onClick={() => setOpenValue(state.open === 'now' ? undefined : 'now')}
              type="button"
            >
              {translate('filters.quick.openNow')}
            </button>
            <label className="grid gap-1 text-sm text-slate-300">
              <span>{translate('filters.date')}</span>
              <input
                aria-label={translate('filters.date')}
                className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-slate-200 focus:border-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-300/30"
                onChange={(event) =>
                  setOpenValue(
                    event.currentTarget.value ? `date:${event.currentTarget.value}` : undefined,
                  )
                }
                type="date"
                value={selectedDate}
              />
            </label>
          </div>
          {selectedDate && selectedDate < today ? (
            <p className="mt-2 text-sm text-amber-200">{translate('filters.pastDate')}</p>
          ) : null}
        </fieldset>

        <fieldset className="mt-5 border-t border-slate-800 pt-4">
          <legend className="text-sm font-semibold text-slate-200">
            {translate('filters.fields.radius')}
          </legend>
          <div className="mt-3 flex flex-wrap gap-2">
            {['1', '2', '5', '10', '25', '50'].map((radius) => (
              <button
                aria-pressed={state.r === radius}
                className={`rounded-md border px-3 py-2 text-sm ${state.r === radius ? 'border-cyan-300 bg-cyan-400 text-slate-950' : 'border-slate-700 text-slate-200 hover:border-cyan-300'} focus:outline-none focus:ring-2 focus:ring-cyan-300`}
                key={radius}
                onClick={() => setRadius(radius)}
                type="button"
              >
                {translate('filters.radiusValue', { radius })}
              </button>
            ))}
          </div>
          {locationMessage ? (
            <p className="mt-2 text-sm text-amber-200">{translate('filters.locationRequired')}</p>
          ) : null}
        </fieldset>

        <fieldset className="mt-5 grid gap-3 border-t border-slate-800 pt-4 sm:grid-cols-2 lg:grid-cols-4">
          <legend className="sr-only">{translate('filters.practicalTitle')}</legend>
          {booleanFilters.map((key) => (
            <label className="flex items-center gap-2 text-sm text-slate-200" key={key}>
              <input
                checked={state[key] === '1'}
                className="size-4 accent-cyan-400"
                onChange={() => toggleBoolean(key)}
                type="checkbox"
              />
              <span>{filterTranslate(`filters.fields.${key}`)}</span>
            </label>
          ))}
        </fieldset>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-4">
          <p aria-live="polite" className="text-sm text-slate-300">
            {previewLoading
              ? translate('filters.previewLoading')
              : translate('filters.preview', { count: previewCount })}
          </p>
          <div className="flex gap-2">
            <button
              className="rounded-md px-3 py-2 text-sm text-slate-300 underline hover:text-white focus:outline-none focus:ring-2 focus:ring-cyan-300"
              onClick={clearAll}
              type="button"
            >
              {translate('filters.clearAll')}
            </button>
            <button
              className="rounded-md bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-300 disabled:opacity-60"
              disabled={isPending}
              onClick={() => applyState()}
              type="button"
            >
              {translate('filters.apply')}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
