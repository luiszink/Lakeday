'use client';

import Link from 'next/link';
import { useState } from 'react';

import { formatValue } from './review-queue';

type Detail = Readonly<{
  id: string;
  factKey: string;
  origin: string;
  confidence: string;
  status: string;
  currentValue: unknown;
  proposedValue: unknown;
  sourceRecord: { sourceUrl: string; sourceType: string; rawPayload: unknown } | null;
  attraction: {
    id: string;
    status: string;
    municipality: string;
    localizations: {
      locale: string;
      name: string;
      summary: string | null;
      description: string | null;
    }[];
    factProvenances: {
      factKey: string;
      confidence: string;
      updateStatus: string;
      lastCheckedAt: string;
      sourceRecordId: string;
    }[];
  };
}>;

export function ReviewDetail({ proposal }: Readonly<{ proposal: Detail }>) {
  const [decision, setDecision] = useState<'APPROVE' | 'REJECT' | null>(null);
  const [editedValue, setEditedValue] = useState(formatValue(proposal.proposedValue));
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit() {
    if (!decision) return;
    setBusy(true);
    setError(null);
    let finalValue: unknown;
    if (decision === 'APPROVE') {
      try {
        finalValue = JSON.parse(editedValue);
      } catch {
        finalValue = editedValue;
      }
    }
    const response = await fetch(`/api/admin/review-queue/${proposal.id}/decision`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        action: decision,
        ...(decision === 'APPROVE' ? { editedValue: finalValue } : {}),
        reviewNote: note || null,
      }),
    });
    const body = (await response.json().catch(() => null)) as {
      error?: { message?: string };
    } | null;
    if (response.ok) setDone(true);
    else setError(body?.error?.message ?? 'Unable to apply decision.');
    setBusy(false);
  }

  if (done)
    return (
      <section className="space-y-4">
        <p className="rounded-md border border-emerald-900 bg-emerald-950/40 p-4 text-emerald-200">
          Decision recorded.
        </p>
        <Link className="text-cyan-300" href="/admin/review-queue">
          Return to review queue
        </Link>
      </section>
    );

  return (
    <section aria-labelledby="proposal-title" className="space-y-6">
      <Link className="text-sm text-cyan-300 hover:text-cyan-100" href="/admin/review-queue">
        ← Review queue
      </Link>
      <div className="space-y-2">
        <p className="text-sm text-slate-400">
          {proposal.origin} · {proposal.confidence} confidence · {proposal.attraction.status}
        </p>
        <h1 id="proposal-title" className="text-3xl font-semibold tracking-tight">
          {proposal.factKey} proposal
        </h1>
        <p className="text-slate-400">{proposal.attraction.municipality}</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <DiffPanel label="− Current value" value={proposal.currentValue} tone="rose" />
        <DiffPanel label="+ Proposed value" value={proposal.proposedValue} tone="emerald" />
      </div>
      <section
        aria-labelledby="evidence-title"
        className="space-y-3 rounded-md border border-slate-800 bg-slate-900 p-5"
      >
        <h2 id="evidence-title" className="text-lg font-semibold">
          Evidence
        </h2>
        {proposal.sourceRecord ? (
          <>
            <p className="text-sm text-slate-400">
              Source type: {proposal.sourceRecord.sourceType}
            </p>
            <a
              className="break-all text-sm text-cyan-300 hover:text-cyan-100"
              href={proposal.sourceRecord.sourceUrl}
              rel="noreferrer"
              target="_blank"
            >
              {proposal.sourceRecord.sourceUrl}
            </a>
            {proposal.sourceRecord.rawPayload ? (
              <pre className="max-h-48 overflow-auto rounded-md bg-slate-950 p-3 text-xs text-slate-400">
                {formatValue(proposal.sourceRecord.rawPayload)}
              </pre>
            ) : null}
          </>
        ) : (
          <p className="text-sm text-amber-300">No source record attached.</p>
        )}
      </section>
      <section
        aria-labelledby="history-title"
        className="space-y-3 rounded-md border border-slate-800 bg-slate-900 p-5"
      >
        <h2 id="history-title" className="text-lg font-semibold">
          Fact history
        </h2>
        {proposal.attraction.factProvenances.length === 0 ? (
          <p className="text-sm text-slate-400">No previous provenance entries.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {proposal.attraction.factProvenances.map((item) => (
              <li
                className="border-l-2 border-slate-700 pl-3"
                key={`${item.sourceRecordId}-${item.factKey}`}
              >
                <span className="text-slate-300">{item.factKey}</span> · {item.updateStatus} ·{' '}
                {item.confidence} · {new Date(item.lastCheckedAt).toLocaleDateString('en-GB')}
              </li>
            ))}
          </ul>
        )}
      </section>
      <section
        aria-labelledby="decision-title"
        className="space-y-4 rounded-md border border-slate-800 bg-slate-900 p-5"
      >
        <h2 id="decision-title" className="text-lg font-semibold">
          Decision
        </h2>
        <div className="flex flex-wrap gap-2">
          <button
            className={`rounded-md px-4 py-2 text-sm ${decision === 'APPROVE' ? 'bg-emerald-500 text-slate-950' : 'border border-slate-700 text-slate-200'}`}
            onClick={() => setDecision('APPROVE')}
            type="button"
          >
            Approve / edit
          </button>
          <button
            className={`rounded-md px-4 py-2 text-sm ${decision === 'REJECT' ? 'bg-rose-500 text-slate-950' : 'border border-slate-700 text-slate-200'}`}
            onClick={() => setDecision('REJECT')}
            type="button"
          >
            Reject
          </button>
        </div>
        {decision === 'APPROVE' ? (
          <label className="block space-y-2 text-sm">
            <span>Final value (JSON for structured facts, plain text otherwise)</span>
            <textarea
              className="min-h-32 w-full rounded-md border border-slate-700 bg-slate-950 p-3 font-mono text-xs"
              value={editedValue}
              onChange={(event) => setEditedValue(event.target.value)}
            />
          </label>
        ) : null}
        <label className="block space-y-2 text-sm">
          <span>Review note</span>
          <textarea
            className="w-full rounded-md border border-slate-700 bg-slate-950 p-3 text-sm"
            maxLength={2000}
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </label>
        {error ? (
          <p aria-live="polite" className="text-sm text-rose-300">
            {error}
          </p>
        ) : null}
        <button
          className="rounded-md bg-cyan-500 px-4 py-2 font-medium text-slate-950 disabled:opacity-50"
          disabled={!decision || busy}
          onClick={submit}
          type="button"
        >
          {busy ? 'Saving…' : 'Record decision'}
        </button>
      </section>
    </section>
  );
}

function DiffPanel({
  label,
  value,
  tone,
}: Readonly<{ label: string; value: unknown; tone: 'rose' | 'emerald' }>) {
  return (
    <div
      className={`rounded-md border p-5 ${tone === 'rose' ? 'border-rose-900 bg-rose-950/20' : 'border-emerald-900 bg-emerald-950/20'}`}
    >
      <h2 className="text-sm font-medium">{label}</h2>
      <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap text-sm text-slate-300">
        {formatValue(value)}
      </pre>
    </div>
  );
}
