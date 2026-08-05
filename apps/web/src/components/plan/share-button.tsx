'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';

import type { LocalPlan } from '../../local-store/plan';

type ShareButtonProps = Readonly<{
  plan: LocalPlan;
}>;

export function ShareButton({ plan }: ShareButtonProps) {
  const locale = useLocale() as 'de' | 'en';
  const translate = useTranslations('plan.share');
  const [state, setState] = useState<'idle' | 'loading' | 'created' | 'error'>('idle');
  const [url, setUrl] = useState<string | null>(null);

  async function share() {
    setState('loading');
    try {
      const response = await fetch('/api/plans', {
        body: JSON.stringify({
          date: plan.date,
          locale,
          startPoint: plan.startPoint,
          stops: plan.stops.map(({ attractionId, plannedDurationMin }) => ({
            attractionId,
            plannedDurationMin,
          })),
        }),
        headers: { 'content-type': 'application/json' },
        method: 'POST',
      });
      if (!response.ok) throw new Error('Plan share failed.');
      const data = (await response.json()) as { url: string };
      setUrl(data.url);
      setState('created');
      if (navigator.share) {
        await navigator.share({ text: translate('sharedText'), title: translate('title'), url: data.url }).catch(() => undefined);
      } else {
        await navigator.clipboard?.writeText(data.url).catch(() => undefined);
      }
    } catch {
      setState('error');
    }
  }

  async function copy() {
    if (!url) return;
    await navigator.clipboard?.writeText(url).catch(() => undefined);
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        className="min-h-10 rounded-md bg-cyan-400 px-3 text-sm font-semibold text-slate-950 hover:bg-cyan-300 disabled:opacity-60"
        disabled={state === 'loading' || plan.stops.length === 0}
        onClick={() => void share()}
        type="button"
      >
        {state === 'loading' ? translate('creating') : translate('button')}
      </button>
      {state === 'created' && url ? (
        <div aria-live="polite" className="flex flex-wrap items-center gap-2 text-sm text-emerald-200">
          <span>{translate('created')}</span>
          <button className="font-semibold underline" onClick={() => void copy()} type="button">
            {translate('copy')}
          </button>
        </div>
      ) : null}
      {state === 'error' ? (
        <p aria-live="polite" className="text-sm text-rose-200">
          {translate('error')}
        </p>
      ) : null}
    </div>
  );
}