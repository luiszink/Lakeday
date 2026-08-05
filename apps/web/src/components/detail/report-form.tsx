'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

type ReportFormProps = Readonly<{
  attractionId: string;
  locale: 'de' | 'en';
}>;

const categories = [
  'WRONG_HOURS',
  'WRONG_PRICE',
  'CLOSED',
  'ACCESS_ISSUE',
  'INCORRECT_INFO',
  'OTHER',
] as const;

export function ReportForm({ attractionId, locale }: ReportFormProps) {
  const translate = useTranslations('detail');
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<(typeof categories)[number]>('INCORRECT_INFO');
  const [message, setMessage] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'failed' | 'limited'>('idle');

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  function close() {
    setOpen(false);
    setState('idle');
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState('sending');
    try {
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ attractionId, category, honeypot, locale, message }),
      });
      if (response.status === 429) {
        setState('limited');
      } else if (response.ok) {
        setState('sent');
      } else {
        setState('failed');
      }
    } catch {
      setState('failed');
    }
  }

  return (
    <div className="mt-5">
      <button
        className="text-sm text-cyan-300 underline hover:text-cyan-200"
        onClick={() => setOpen(true)}
        type="button"
      >
        {translate('report.open')}
      </button>
      {open ? (
        <div
          aria-labelledby="report-heading"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/80 p-4 sm:items-center"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) close();
          }}
          role="dialog"
        >
          <div className="w-full max-w-lg rounded-lg border border-slate-700 bg-slate-900 p-5 shadow-2xl sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-white" id="report-heading">
                  {translate('report.heading')}
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-400">{translate('report.note')}</p>
              </div>
              <button
                aria-label={translate('report.close')}
                autoFocus
                className="min-h-11 min-w-11 rounded-md border border-slate-700 text-xl text-slate-300 hover:border-slate-500 hover:text-white"
                onClick={close}
                type="button"
              >
                ×
              </button>
            </div>
            {state === 'sent' ? (
              <div aria-live="polite" className="mt-6 space-y-4">
                <p className="text-sm text-emerald-300">{translate('report.success')}</p>
                <button
                  className="rounded-md bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950"
                  onClick={close}
                  type="button"
                >
                  {translate('report.done')}
                </button>
              </div>
            ) : (
              <form className="mt-6 space-y-5" onSubmit={submit}>
                <div>
                  <label className="text-sm font-medium text-slate-200" htmlFor="report-category">
                    {translate('report.category')}
                  </label>
                  <select
                    className="mt-2 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-3 text-sm text-white"
                    id="report-category"
                    onChange={(event) =>
                      setCategory(event.target.value as (typeof categories)[number])
                    }
                    value={category}
                  >
                    {categories.map((value) => (
                      <option key={value} value={value}>
                        {translate(`report.categories.${value}` as never)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-200" htmlFor="report-message">
                    {translate('report.message')}
                  </label>
                  <textarea
                    className="mt-2 min-h-28 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-3 text-sm text-white"
                    id="report-message"
                    maxLength={1000}
                    onChange={(event) => setMessage(event.target.value)}
                    value={message}
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    {translate('report.noPersonalData')}
                  </p>
                </div>
                <input
                  aria-hidden="true"
                  autoComplete="off"
                  className="absolute -left-[9999px] h-px w-px opacity-0"
                  onChange={(event) => setHoneypot(event.target.value)}
                  tabIndex={-1}
                  type="text"
                  value={honeypot}
                />
                {state === 'failed' ? (
                  <p aria-live="polite" className="text-sm text-rose-300">
                    {translate('report.failed')}
                  </p>
                ) : null}
                {state === 'limited' ? (
                  <p aria-live="polite" className="text-sm text-amber-200">
                    {translate('report.limited')}
                  </p>
                ) : null}
                <div className="flex justify-end gap-3">
                  <button
                    className="rounded-md border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:border-slate-500"
                    onClick={close}
                    type="button"
                  >
                    {translate('report.cancel')}
                  </button>
                  <button
                    className="rounded-md bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950 disabled:cursor-wait disabled:opacity-60"
                    disabled={state === 'sending'}
                    type="submit"
                  >
                    {state === 'sending' ? translate('report.sending') : translate('report.submit')}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
