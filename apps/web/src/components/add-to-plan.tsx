'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { getPlansStore } from '../local-store/plan';

const store = getPlansStore();

type AddToPlanProps = Readonly<{
  attractionId: string;
  className?: string;
  plannedDurationMin?: number | null | undefined;
}>;

export function AddToPlan({ attractionId, className, plannedDurationMin = null }: AddToPlanProps) {
  const translate = useTranslations('plan');
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<'added' | 'duplicate' | 'limit' | null>(null);

  async function add() {
    if (pending) return;
    setPending(true);
    setResult(null);
    try {
      const response = await store.add(attractionId, plannedDurationMin);
      setResult(response.status);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className={className}>
      <button
        className="min-h-10 rounded-md border border-cyan-700 px-3 text-sm font-semibold text-cyan-200 transition hover:border-cyan-300 hover:text-cyan-100 focus:outline-none focus:ring-2 focus:ring-cyan-300 disabled:cursor-wait disabled:opacity-60"
        disabled={pending}
        onClick={() => void add()}
        type="button"
      >
        {pending ? translate('adding') : translate('add')}
      </button>
      {result ? (
        <div aria-live="polite" className="mt-1 flex items-center gap-2 text-xs text-slate-400">
          <span>{translate(result)}</span>
          {result === 'added' ? (
            <button
              className="font-semibold text-cyan-300 underline underline-offset-2"
              onClick={() => {
                void store.remove(attractionId);
                setResult(null);
              }}
              type="button"
            >
              {translate('undo')}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}