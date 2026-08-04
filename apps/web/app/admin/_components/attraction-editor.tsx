'use client';

import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import Link from 'next/link';

import type { AttractionEditorPayload } from '@lake/domain';

import { createEmptyAttractionEditorPayload } from '../../../src/admin/attractions/defaults';

type EditorProps = Readonly<{
  initialPayload: AttractionEditorPayload;
  isNew: boolean;
}>;

type ScopeState = Readonly<{
  shorelineDistanceM: number;
  assignedRegionCode: string | null;
  regionCode: string;
  inScope: boolean;
}>;

const days = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'] as const;
const seasons = ['SPRING', 'SUMMER', 'AUTUMN', 'WINTER', 'ALL_YEAR'] as const;

function asNullableText(value: string) {
  return value.trim() === '' ? null : value;
}

function asList(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function fieldClass() {
  return 'w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm';
}

export function AttractionEditor({ initialPayload, isNew }: EditorProps) {
  const [payload, setPayload] = useState(initialPayload);
  const [scope, setScope] = useState<ScopeState | null>(null);
  const [scopeLoading, setScopeLoading] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const [violations, setViolations] = useState<string[]>([]);

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      setScopeLoading(true);
      const response = await fetch('/api/admin/attractions/scope', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = (await response.json().catch(() => null)) as { scope?: ScopeState } | null;
      if (response.ok && body?.scope) setScope(body.scope);
      setScopeLoading(false);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [
    payload.latitude,
    payload.longitude,
    payload.municipality,
    payload.editorialRelevance,
    payload.scopeException,
    payload.scopeExceptionReason,
  ]);

  useEffect(() => {
    function beforeUnload(event: BeforeUnloadEvent) {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = '';
    }
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [dirty]);

  function change<K extends keyof AttractionEditorPayload>(
    key: K,
    value: AttractionEditorPayload[K],
  ) {
    setPayload((current) => ({ ...current, [key]: value }));
    setDirty(true);
    setMessage(null);
  }

  function changeLocalization(
    locale: 'de' | 'en',
    key: 'name' | 'slug' | 'summary' | 'description' | 'practicalNotes',
    value: string,
  ) {
    change(
      'localizations',
      payload.localizations.map((localization) =>
        localization.locale === locale
          ? {
              ...localization,
              [key]: key === 'name' || key === 'slug' ? value : asNullableText(value),
            }
          : localization,
      ),
    );
  }

  function updateSchedule(patch: Partial<NonNullable<AttractionEditorPayload['openingSchedule']>>) {
    if (!payload.openingSchedule) return;
    change('openingSchedule', { ...payload.openingSchedule, ...patch });
  }

  function updateRule(
    index: number,
    patch: Partial<NonNullable<AttractionEditorPayload['openingSchedule']>['rules'][number]>,
  ) {
    if (!payload.openingSchedule) return;
    updateSchedule({
      rules: payload.openingSchedule.rules.map((rule, ruleIndex) =>
        ruleIndex === index ? { ...rule, ...patch } : rule,
      ),
    });
  }

  function addRule() {
    if (!payload.openingSchedule) return;
    updateSchedule({
      rules: [
        ...payload.openingSchedule.rules,
        {
          daysOfWeek: ['MON'],
          opens: '09:00',
          closes: '17:00',
          appliesOnPublicHolidays: 'AS_WEEKDAY',
          holidayCalendarCode: 'DE-BW',
        },
      ],
    });
  }

  function addClosure() {
    change('closures', [...payload.closures, { dateFrom: '2026-12-24', dateTo: '2026-12-26' }]);
  }

  function addPrice() {
    change('prices', [
      ...payload.prices,
      {
        audience: 'ADULT',
        amount: 0,
        currency: 'EUR',
        validFrom: null,
        validTo: null,
        note: null,
        confidence: 'MEDIUM',
      },
    ]);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const intent = new FormData(event.currentTarget).get('intent');
    const nextStatus =
      intent === 'publish'
        ? 'PUBLISHED'
        : intent === 'review'
          ? 'IN_REVIEW'
          : intent === 'unpublish'
            ? 'UNPUBLISHED'
            : 'DRAFT';
    const nextPayload = { ...payload, status: nextStatus } as AttractionEditorPayload;
    setSaving(true);
    setError(null);
    setMessage(null);
    setConflict(false);
    setViolations([]);
    const endpoint = isNew ? '/api/admin/attractions' : `/api/admin/attractions/${payload.id}`;
    const response = await fetch(endpoint, {
      method: isNew ? 'POST' : 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(nextPayload),
    });
    const body = (await response.json().catch(() => null)) as {
      attraction?: { id: string; updatedAt: string };
      error?: { code?: string; message?: string; violations?: { code: string }[] };
    } | null;
    if (response.ok && body?.attraction) {
      setDirty(false);
      if (isNew) window.location.assign(`/admin/attractions/${body.attraction.id}`);
      else {
        setPayload((current) => ({
          ...current,
          id: body.attraction!.id,
          status: nextStatus,
          expectedUpdatedAt: body.attraction!.updatedAt,
        }));
        setMessage('Attraction saved.');
      }
    } else if (response.status === 409) {
      setConflict(true);
      setError(body?.error?.message ?? 'This attraction changed elsewhere.');
    } else {
      setViolations(body?.error?.violations?.map((violation) => violation.code) ?? []);
      setError(body?.error?.message ?? 'Unable to save attraction.');
    }
    setSaving(false);
  }

  const schedule = payload.openingSchedule;

  return (
    <form className="space-y-8" onSubmit={submit}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <Link className="text-sm text-cyan-300 hover:text-cyan-100" href="/admin/attractions">
            ← Attractions
          </Link>
          <h1 className="text-3xl font-semibold tracking-tight">
            {isNew ? 'Create attraction' : 'Edit attraction'}
          </h1>
          <p className="text-sm text-slate-400">
            Draft fields may be incomplete; publishing runs the domain invariant gate.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className="rounded-md border border-slate-700 px-3 py-2 text-sm text-slate-200 disabled:opacity-50"
            disabled={saving}
            name="intent"
            value="save"
            type="submit"
          >
            Save draft
          </button>
          <button
            className="rounded-md border border-amber-700 px-3 py-2 text-sm text-amber-200 disabled:opacity-50"
            disabled={saving}
            name="intent"
            value="review"
            type="submit"
          >
            Submit for review
          </button>
          <button
            className="rounded-md bg-cyan-500 px-3 py-2 text-sm font-medium text-slate-950 disabled:opacity-50"
            disabled={saving}
            name="intent"
            value="publish"
            type="submit"
          >
            Publish
          </button>
        </div>
      </div>

      {message ? (
        <p
          aria-live="polite"
          className="rounded-md border border-emerald-900 bg-emerald-950/40 p-4 text-sm text-emerald-200"
        >
          {message}
        </p>
      ) : null}
      {error ? (
        <div
          aria-live="polite"
          className="rounded-md border border-rose-900 bg-rose-950/40 p-4 text-sm text-rose-200"
        >
          <p>{error}</p>
          {conflict ? (
            <button
              className="mt-3 underline"
              onClick={() => window.location.reload()}
              type="button"
            >
              Reload latest version
            </button>
          ) : null}
          {violations.length > 0 ? (
            <ul className="mt-3 list-disc pl-5">
              {violations.map((violation) => (
                <li key={violation}>{violation}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      <section
        aria-labelledby="identity-title"
        className="space-y-4 rounded-md border border-slate-800 bg-slate-900 p-6"
      >
        <h2 id="identity-title" className="text-xl font-semibold">
          Identity and location
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm">
            <span>Country</span>
            <select
              className={fieldClass()}
              value={payload.countryCode}
              onChange={(event) =>
                change('countryCode', event.target.value as AttractionEditorPayload['countryCode'])
              }
            >
              <option>DE</option>
              <option>CH</option>
              <option>AT</option>
            </select>
          </label>
          <label className="space-y-2 text-sm">
            <span>Municipality</span>
            <input
              className={fieldClass()}
              value={payload.municipality}
              onChange={(event) => change('municipality', event.target.value)}
            />
          </label>
          <label className="space-y-2 text-sm">
            <span>Region code</span>
            <input
              className={fieldClass()}
              value={payload.regionCode}
              onChange={(event) => change('regionCode', event.target.value)}
            />
          </label>
          <label className="space-y-2 text-sm">
            <span>Primary category code</span>
            <input
              className={fieldClass()}
              value={payload.categoryCodes.join(', ')}
              onChange={(event) => change('categoryCodes', asList(event.target.value))}
            />
          </label>
          <label className="space-y-2 text-sm">
            <span>Latitude</span>
            <input
              className={fieldClass()}
              inputMode="decimal"
              type="number"
              step="any"
              value={payload.latitude}
              onChange={(event) => change('latitude', Number(event.target.value))}
            />
          </label>
          <label className="space-y-2 text-sm">
            <span>Longitude</span>
            <input
              className={fieldClass()}
              inputMode="decimal"
              type="number"
              step="any"
              value={payload.longitude}
              onChange={(event) => change('longitude', Number(event.target.value))}
            />
          </label>
        </div>
        <label className="flex items-center gap-3 text-sm">
          <input
            checked={payload.scopeException}
            onChange={(event) => change('scopeException', event.target.checked)}
            type="checkbox"
          />{' '}
          Scope exception
        </label>
        {payload.scopeException ? (
          <label className="block space-y-2 text-sm">
            <span>Exception justification</span>
            <textarea
              className={fieldClass()}
              value={payload.scopeExceptionReason ?? ''}
              onChange={(event) =>
                change('scopeExceptionReason', asNullableText(event.target.value))
              }
            />
          </label>
        ) : null}
        <div className="rounded-md border border-slate-700 bg-slate-950 p-4 text-sm">
          <p className="font-medium">Scope verdict</p>
          {scopeLoading ? (
            <p className="mt-2 text-slate-400">Calculating shoreline distance…</p>
          ) : scope ? (
            <p className={scope.inScope ? 'mt-2 text-emerald-300' : 'mt-2 text-amber-300'}>
              {scope.inScope ? 'In scope' : 'Outside automatic scope'} · {scope.shorelineDistanceM}{' '}
              m · assigned region {scope.regionCode}
            </p>
          ) : (
            <p className="mt-2 text-slate-400">Enter coordinates to calculate scope.</p>
          )}
        </div>
      </section>

      <section
        aria-labelledby="localization-title"
        className="space-y-4 rounded-md border border-slate-800 bg-slate-900 p-6"
      >
        <h2 id="localization-title" className="text-xl font-semibold">
          Localizations
        </h2>
        <div className="grid gap-6 lg:grid-cols-2">
          {payload.localizations.map((localization) => (
            <fieldset
              className="space-y-3 rounded-md border border-slate-700 p-4"
              key={localization.locale}
            >
              <legend className="px-2 text-sm font-medium">
                {localization.locale.toUpperCase()}
              </legend>
              <label className="block space-y-2 text-sm">
                <span>Name</span>
                <input
                  className={fieldClass()}
                  value={localization.name}
                  onChange={(event) =>
                    changeLocalization(localization.locale, 'name', event.target.value)
                  }
                />
              </label>
              <label className="block space-y-2 text-sm">
                <span>Slug</span>
                <input
                  className={fieldClass()}
                  value={localization.slug}
                  onChange={(event) =>
                    changeLocalization(localization.locale, 'slug', event.target.value)
                  }
                />
              </label>
              <label className="block space-y-2 text-sm">
                <span>Summary</span>
                <textarea
                  className={fieldClass()}
                  value={localization.summary ?? ''}
                  onChange={(event) =>
                    changeLocalization(localization.locale, 'summary', event.target.value)
                  }
                />
              </label>
              <label className="block space-y-2 text-sm">
                <span>Description</span>
                <textarea
                  className={`${fieldClass()} min-h-32`}
                  value={localization.description ?? ''}
                  onChange={(event) =>
                    changeLocalization(localization.locale, 'description', event.target.value)
                  }
                />
              </label>
              <label className="block space-y-2 text-sm">
                <span>Practical notes</span>
                <textarea
                  className={fieldClass()}
                  value={localization.practicalNotes ?? ''}
                  onChange={(event) =>
                    changeLocalization(localization.locale, 'practicalNotes', event.target.value)
                  }
                />
              </label>
            </fieldset>
          ))}
        </div>
      </section>

      <section
        aria-labelledby="classification-title"
        className="space-y-4 rounded-md border border-slate-800 bg-slate-900 p-6"
      >
        <h2 id="classification-title" className="text-xl font-semibold">
          Classification and suitability
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          <label className="space-y-2 text-sm">
            <span>Indoor / outdoor</span>
            <select
              className={fieldClass()}
              value={payload.indoorOutdoor}
              onChange={(event) =>
                change(
                  'indoorOutdoor',
                  event.target.value as AttractionEditorPayload['indoorOutdoor'],
                )
              }
            >
              <option>INDOOR</option>
              <option>OUTDOOR</option>
              <option>MIXED</option>
            </select>
          </label>
          <label className="space-y-2 text-sm">
            <span>Editorial relevance</span>
            <select
              className={fieldClass()}
              value={payload.editorialRelevance}
              onChange={(event) =>
                change(
                  'editorialRelevance',
                  event.target.value as AttractionEditorPayload['editorialRelevance'],
                )
              }
            >
              <option>LOW</option>
              <option>MEDIUM</option>
              <option>HIGH</option>
            </select>
          </label>
          <label className="space-y-2 text-sm">
            <span>Verification state</span>
            <select
              className={fieldClass()}
              value={payload.verificationState}
              onChange={(event) =>
                change(
                  'verificationState',
                  event.target.value as AttractionEditorPayload['verificationState'],
                )
              }
            >
              <option>UNVERIFIED</option>
              <option>PARTIALLY_VERIFIED</option>
              <option>VERIFIED</option>
            </select>
          </label>
          <label className="space-y-2 text-sm">
            <span>Rain suitability</span>
            <select
              className={fieldClass()}
              value={payload.rainSuitability ?? ''}
              onChange={(event) =>
                change(
                  'rainSuitability',
                  (event.target.value || null) as AttractionEditorPayload['rainSuitability'],
                )
              }
            >
              <option value="">Unknown</option>
              <option>POOR</option>
              <option>OK</option>
              <option>GOOD</option>
              <option>EXCELLENT</option>
            </select>
          </label>
          <label className="space-y-2 text-sm">
            <span>Heat suitability</span>
            <select
              className={fieldClass()}
              value={payload.heatSuitability ?? ''}
              onChange={(event) =>
                change(
                  'heatSuitability',
                  (event.target.value || null) as AttractionEditorPayload['heatSuitability'],
                )
              }
            >
              <option value="">Unknown</option>
              <option>POOR</option>
              <option>OK</option>
              <option>GOOD</option>
              <option>EXCELLENT</option>
            </select>
          </label>
          <label className="space-y-2 text-sm">
            <span>Seasons</span>
            <input
              className={fieldClass()}
              value={payload.seasons.join(', ')}
              onChange={(event) =>
                change('seasons', asList(event.target.value) as AttractionEditorPayload['seasons'])
              }
              placeholder={seasons.join(', ')}
            />
          </label>
        </div>
      </section>

      <section
        aria-labelledby="practical-title"
        className="space-y-4 rounded-md border border-slate-800 bg-slate-900 p-6"
      >
        <h2 id="practical-title" className="text-xl font-semibold">
          Practical details
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          <label className="space-y-2 text-sm">
            <span>Typical duration min</span>
            <input
              className={fieldClass()}
              type="number"
              min="1"
              value={payload.typicalDurationMin ?? ''}
              onChange={(event) =>
                change('typicalDurationMin', event.target.value ? Number(event.target.value) : null)
              }
            />
          </label>
          <label className="space-y-2 text-sm">
            <span>Typical duration max</span>
            <input
              className={fieldClass()}
              type="number"
              min="1"
              value={payload.typicalDurationMax ?? ''}
              onChange={(event) =>
                change('typicalDurationMax', event.target.value ? Number(event.target.value) : null)
              }
            />
          </label>
          <label className="space-y-2 text-sm">
            <span>Price level</span>
            <select
              className={fieldClass()}
              value={payload.priceLevel ?? ''}
              onChange={(event) =>
                change(
                  'priceLevel',
                  (event.target.value || null) as AttractionEditorPayload['priceLevel'],
                )
              }
            >
              <option value="">Unknown</option>
              <option>FREE</option>
              <option>LOW</option>
              <option>MEDIUM</option>
              <option>HIGH</option>
              <option>PREMIUM</option>
            </select>
          </label>
          <label className="space-y-2 text-sm">
            <span>Booking requirement</span>
            <select
              className={fieldClass()}
              value={payload.bookingRequirement}
              onChange={(event) =>
                change(
                  'bookingRequirement',
                  event.target.value as AttractionEditorPayload['bookingRequirement'],
                )
              }
            >
              <option>NONE</option>
              <option>RECOMMENDED</option>
              <option>REQUIRED</option>
            </select>
          </label>
          <label className="space-y-2 text-sm">
            <span>Official website</span>
            <input
              className={fieldClass()}
              type="url"
              value={payload.officialWebsite ?? ''}
              onChange={(event) => change('officialWebsite', asNullableText(event.target.value))}
            />
          </label>
          <label className="space-y-2 text-sm">
            <span>Booking URL</span>
            <input
              className={fieldClass()}
              type="url"
              value={payload.bookingUrl ?? ''}
              onChange={(event) => change('bookingUrl', asNullableText(event.target.value))}
            />
          </label>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <label className="space-y-2 text-sm">
            <span>Child age bands</span>
            <input
              className={fieldClass()}
              value={payload.childAgeBands.join(', ')}
              onChange={(event) =>
                change(
                  'childAgeBands',
                  asList(event.target.value) as AttractionEditorPayload['childAgeBands'],
                )
              }
            />
          </label>
          <label className="space-y-2 text-sm">
            <span>Visitor languages</span>
            <input
              className={fieldClass()}
              value={payload.visitorLanguages.join(', ')}
              onChange={(event) =>
                change(
                  'visitorLanguages',
                  asList(event.target.value) as AttractionEditorPayload['visitorLanguages'],
                )
              }
            />
          </label>
          <label className="space-y-2 text-sm">
            <span>Transport modes</span>
            <input
              className={fieldClass()}
              value={payload.transportModes.join(', ')}
              onChange={(event) =>
                change(
                  'transportModes',
                  asList(event.target.value) as AttractionEditorPayload['transportModes'],
                )
              }
            />
          </label>
          <label className="space-y-2 text-sm">
            <span>Wheelchair access</span>
            <select
              className={fieldClass()}
              value={payload.wheelchairAccess ?? ''}
              onChange={(event) =>
                change(
                  'wheelchairAccess',
                  (event.target.value || null) as AttractionEditorPayload['wheelchairAccess'],
                )
              }
            >
              <option value="">Unknown</option>
              <option>FULL</option>
              <option>PARTIAL</option>
              <option>NONE</option>
              <option>UNKNOWN</option>
            </select>
          </label>
          <label className="space-y-2 text-sm">
            <span>Stroller suitability</span>
            <select
              className={fieldClass()}
              value={payload.strollerSuitable ?? ''}
              onChange={(event) =>
                change(
                  'strollerSuitable',
                  (event.target.value || null) as AttractionEditorPayload['strollerSuitable'],
                )
              }
            >
              <option value="">Unknown</option>
              <option>YES</option>
              <option>PARTIAL</option>
              <option>NO</option>
              <option>UNKNOWN</option>
            </select>
          </label>
          <label className="space-y-2 text-sm">
            <span>Dog policy</span>
            <select
              className={fieldClass()}
              value={payload.dogPolicy ?? ''}
              onChange={(event) =>
                change(
                  'dogPolicy',
                  (event.target.value || null) as AttractionEditorPayload['dogPolicy'],
                )
              }
            >
              <option value="">Unknown</option>
              <option>ALLOWED</option>
              <option>LEASHED</option>
              <option>NO</option>
              <option>UNKNOWN</option>
            </select>
          </label>
        </div>
      </section>

      <section
        aria-labelledby="hours-title"
        className="space-y-4 rounded-md border border-slate-800 bg-slate-900 p-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="hours-title" className="text-xl font-semibold">
            Opening rules
          </h2>
          {schedule ? (
            <button
              className="text-sm text-rose-300"
              onClick={() => change('openingSchedule', null)}
              type="button"
            >
              Remove schedule
            </button>
          ) : (
            <button
              className="text-sm text-cyan-300"
              onClick={() =>
                change('openingSchedule', createEmptyAttractionEditorPayload().openingSchedule)
              }
              type="button"
            >
              Add structured schedule
            </button>
          )}
        </div>
        {schedule ? (
          <>
            <div className="grid gap-4 md:grid-cols-3">
              <label className="space-y-2 text-sm">
                <span>Valid from</span>
                <input
                  className={fieldClass()}
                  type="date"
                  value={schedule.validFrom}
                  onChange={(event) => updateSchedule({ validFrom: event.target.value })}
                />
              </label>
              <label className="space-y-2 text-sm">
                <span>Valid to</span>
                <input
                  className={fieldClass()}
                  type="date"
                  value={schedule.validTo}
                  onChange={(event) => updateSchedule({ validTo: event.target.value })}
                />
              </label>
              <label className="flex items-center gap-3 text-sm">
                <input
                  checked={schedule.hoursUnknown}
                  onChange={(event) => updateSchedule({ hoursUnknown: event.target.checked })}
                  type="checkbox"
                />{' '}
                Hours unknown
              </label>
            </div>
            <div className="space-y-4">
              {schedule.rules.map((rule, index) => (
                <fieldset
                  className="space-y-3 rounded-md border border-slate-700 p-4"
                  key={`${index}-${rule.opens}`}
                >
                  <legend className="px-2 text-sm">Rule {index + 1}</legend>
                  <div className="flex flex-wrap gap-3 text-xs">
                    {days.map((day) => (
                      <label className="flex items-center gap-1" key={day}>
                        <input
                          checked={rule.daysOfWeek.includes(day)}
                          onChange={(event) =>
                            updateRule(index, {
                              daysOfWeek: event.target.checked
                                ? [...rule.daysOfWeek, day]
                                : rule.daysOfWeek.filter((currentDay) => currentDay !== day),
                            })
                          }
                          type="checkbox"
                        />
                        {day}
                      </label>
                    ))}
                  </div>
                  <div className="grid gap-3 md:grid-cols-4">
                    <label className="space-y-2 text-sm">
                      <span>Opens</span>
                      <input
                        className={fieldClass()}
                        type="time"
                        value={rule.opens ?? ''}
                        onChange={(event) =>
                          updateRule(index, { opens: event.target.value || null })
                        }
                      />
                    </label>
                    <label className="space-y-2 text-sm">
                      <span>Closes</span>
                      <input
                        className={fieldClass()}
                        type="time"
                        value={rule.closes ?? ''}
                        onChange={(event) =>
                          updateRule(index, { closes: event.target.value || null })
                        }
                      />
                    </label>
                    <label className="space-y-2 text-sm">
                      <span>Holiday rule</span>
                      <select
                        className={fieldClass()}
                        value={rule.appliesOnPublicHolidays}
                        onChange={(event) =>
                          updateRule(index, {
                            appliesOnPublicHolidays: event.target
                              .value as typeof rule.appliesOnPublicHolidays,
                          })
                        }
                      >
                        <option>AS_WEEKDAY</option>
                        <option>CLOSED</option>
                        <option>SPECIAL</option>
                      </select>
                    </label>
                    <label className="space-y-2 text-sm">
                      <span>Calendar code</span>
                      <input
                        className={fieldClass()}
                        value={rule.holidayCalendarCode ?? ''}
                        onChange={(event) =>
                          updateRule(index, {
                            holidayCalendarCode: asNullableText(event.target.value),
                          })
                        }
                      />
                    </label>
                  </div>
                  <button
                    className="text-sm text-rose-300"
                    onClick={() =>
                      updateSchedule({
                        rules: schedule.rules.filter((_, ruleIndex) => ruleIndex !== index),
                      })
                    }
                    type="button"
                  >
                    Remove rule
                  </button>
                </fieldset>
              ))}
            </div>
            <button
              className="rounded-md border border-slate-700 px-3 py-2 text-sm"
              onClick={addRule}
              type="button"
            >
              Add rule
            </button>
          </>
        ) : (
          <p className="text-sm text-slate-400">
            No structured opening schedule. Publish will report hours as unknown.
          </p>
        )}
      </section>

      <section aria-labelledby="closure-price-title" className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4 rounded-md border border-slate-800 bg-slate-900 p-6">
          <div className="flex items-center justify-between">
            <h2 id="closure-price-title" className="text-xl font-semibold">
              Exceptional closures
            </h2>
            <button className="text-sm text-cyan-300" onClick={addClosure} type="button">
              Add closure
            </button>
          </div>
          {payload.closures.length === 0 ? (
            <p className="text-sm text-slate-400">No closure overrides.</p>
          ) : (
            payload.closures.map((closure, index) => (
              <div
                className="grid gap-3 md:grid-cols-[1fr_1fr_auto]"
                key={`${index}-${closure.dateFrom}`}
              >
                <label className="space-y-2 text-sm">
                  <span>From</span>
                  <input
                    className={fieldClass()}
                    type="date"
                    value={closure.dateFrom}
                    onChange={(event) =>
                      change(
                        'closures',
                        payload.closures.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, dateFrom: event.target.value } : item,
                        ),
                      )
                    }
                  />
                </label>
                <label className="space-y-2 text-sm">
                  <span>To</span>
                  <input
                    className={fieldClass()}
                    type="date"
                    value={closure.dateTo}
                    onChange={(event) =>
                      change(
                        'closures',
                        payload.closures.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, dateTo: event.target.value } : item,
                        ),
                      )
                    }
                  />
                </label>
                <button
                  className="self-end pb-2 text-sm text-rose-300"
                  onClick={() =>
                    change(
                      'closures',
                      payload.closures.filter((_, itemIndex) => itemIndex !== index),
                    )
                  }
                  type="button"
                >
                  Remove
                </button>
              </div>
            ))
          )}
        </div>
        <div className="space-y-4 rounded-md border border-slate-800 bg-slate-900 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Prices</h2>
            <button className="text-sm text-cyan-300" onClick={addPrice} type="button">
              Add price
            </button>
          </div>
          {payload.prices.length === 0 ? (
            <p className="text-sm text-slate-400">No price rows.</p>
          ) : (
            payload.prices.map((price, index) => (
              <div
                className="space-y-3 rounded-md border border-slate-700 p-3"
                key={`${index}-${price.audience}`}
              >
                <div className="grid gap-3 md:grid-cols-3">
                  <label className="space-y-2 text-sm">
                    <span>Audience</span>
                    <select
                      className={fieldClass()}
                      value={price.audience}
                      onChange={(event) =>
                        change(
                          'prices',
                          payload.prices.map((item, itemIndex) =>
                            itemIndex === index
                              ? { ...item, audience: event.target.value as typeof price.audience }
                              : item,
                          ),
                        )
                      }
                    >
                      <option>ADULT</option>
                      <option>CHILD</option>
                      <option>FAMILY</option>
                      <option>SENIOR</option>
                      <option>GROUP</option>
                      <option>OTHER</option>
                    </select>
                  </label>
                  <label className="space-y-2 text-sm">
                    <span>Amount</span>
                    <input
                      className={fieldClass()}
                      type="number"
                      min="0"
                      step="0.01"
                      value={price.amount}
                      onChange={(event) =>
                        change(
                          'prices',
                          payload.prices.map((item, itemIndex) =>
                            itemIndex === index
                              ? { ...item, amount: Number(event.target.value) }
                              : item,
                          ),
                        )
                      }
                    />
                  </label>
                  <label className="space-y-2 text-sm">
                    <span>Currency</span>
                    <select
                      className={fieldClass()}
                      value={price.currency}
                      onChange={(event) =>
                        change(
                          'prices',
                          payload.prices.map((item, itemIndex) =>
                            itemIndex === index
                              ? { ...item, currency: event.target.value as typeof price.currency }
                              : item,
                          ),
                        )
                      }
                    >
                      <option>EUR</option>
                      <option>CHF</option>
                    </select>
                  </label>
                </div>
                <button
                  className="text-sm text-rose-300"
                  onClick={() =>
                    change(
                      'prices',
                      payload.prices.filter((_, itemIndex) => itemIndex !== index),
                    )
                  }
                  type="button"
                >
                  Remove price
                </button>
              </div>
            ))
          )}
        </div>
      </section>
    </form>
  );
}
