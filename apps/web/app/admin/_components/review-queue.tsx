'use client';

import Link from 'next/link';
import { useState } from 'react';

type Proposal = Readonly<{
  id: string;
  factKey: string;
  origin: string;
  confidence: string;
  status: string;
  currentValue: unknown;
  proposedValue: unknown;
  createdAt: string;
  attraction: {
    status: string;
    municipality: string;
    localizations: { locale: string; name: string }[];
  };
  sourceRecord: { sourceUrl: string; sourceType: string } | null;
}>;

export function ReviewQueue({ initialProposals }: Readonly<{ initialProposals: Proposal[] }>) {
  const [proposals, setProposals] = useState(initialProposals);
  const [origin, setOrigin] = useState('');
  const [factKey, setFactKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const query = new URLSearchParams();
    if (origin) query.set('origin', origin);
    if (factKey) query.set('factKey', factKey);
    const response = await fetch(`/api/admin/review-queue?${query.toString()}`);
    const body = (await response.json().catch(() => null)) as {
      proposals?: Proposal[];
      error?: { message?: string };
    } | null;
    if (response.ok && body?.proposals) setProposals(body.proposals);
    else setError(body?.error?.message ?? 'Unable to load the review queue.');
    setLoading(false);
  }

  return (
    <section aria-labelledby="review-title" className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm font-medium text-cyan-400">Content quality</p>
        <h1 id="review-title" className="text-3xl font-semibold tracking-tight">
          Review queue
        </h1>
        <p className="text-slate-400">
          Process uncertain changes with the evidence and current value in view.
        </p>
      </div>
      <form
        className="flex flex-wrap gap-3 rounded-md border border-slate-800 bg-slate-900 p-4"
        onSubmit={refresh}
      >
        <label className="text-sm">
          <span className="sr-only">Origin</span>
          <select
            className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2"
            value={origin}
            onChange={(event) => setOrigin(event.target.value)}
          >
            <option value="">All origins</option>
            <option value="SCHEDULED_REFRESH">Scheduled refresh</option>
            <option value="RESEARCH_IMPORT">Research import</option>
            <option value="USER_REPORT">User report</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="sr-only">Fact class</span>
          <select
            className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2"
            value={factKey}
            onChange={(event) => setFactKey(event.target.value)}
          >
            <option value="">All fact classes</option>
            <option value="OPENING_HOURS">Opening hours</option>
            <option value="PRICE">Price</option>
            <option value="CLOSURE">Closure</option>
            <option value="WHEELCHAIR_ACCESS">Accessibility</option>
            <option value="CONTACT">Text / contact</option>
          </select>
        </label>
        <button
          className="rounded-md border border-slate-700 px-4 py-2 text-sm disabled:opacity-50"
          disabled={loading}
          type="submit"
        >
          {loading ? 'Loading…' : 'Apply filters'}
        </button>
      </form>
      {error ? (
        <p
          aria-live="polite"
          className="rounded-md border border-rose-900 bg-rose-950/40 p-4 text-sm text-rose-200"
        >
          {error}
        </p>
      ) : null}
      {!loading && !error && proposals.length === 0 ? (
        <div className="rounded-md border border-dashed border-slate-700 p-10 text-center">
          <h2 className="text-lg font-medium">All caught up</h2>
          <p className="mt-2 text-sm text-slate-400">
            There are no pending proposals matching these filters.
          </p>
        </div>
      ) : null}
      <div className="space-y-3">
        {proposals.map((proposal) => (
          <ProposalRow key={proposal.id} proposal={proposal} />
        ))}
      </div>
    </section>
  );
}

function ProposalRow({ proposal }: Readonly<{ proposal: Proposal }>) {
  const name =
    proposal.attraction.localizations.find((localization) => localization.locale === 'de')?.name ??
    proposal.attraction.localizations[0]?.name ??
    'Untitled attraction';
  return (
    <Link
      className="block rounded-md border border-slate-800 bg-slate-900 p-5 hover:border-cyan-600"
      href={`/admin/review-queue/${proposal.id}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2 text-xs text-slate-400">
            <span className="rounded-full border border-slate-700 px-2 py-1">
              {proposal.attraction.status}
            </span>
            <span className="rounded-full border border-slate-700 px-2 py-1">
              {proposal.factKey}
            </span>
            <span className="rounded-full border border-slate-700 px-2 py-1">
              {proposal.confidence}
            </span>
          </div>
          <h2 className="text-lg font-medium">{name}</h2>
          <p className="text-sm text-slate-400">
            {proposal.attraction.municipality} · {proposal.origin}
          </p>
        </div>
        <time className="text-sm text-slate-500" dateTime={proposal.createdAt}>
          {new Date(proposal.createdAt).toLocaleString('en-GB')}
        </time>
      </div>
      <div className="mt-4 grid gap-3 text-sm md:grid-cols-2">
        <div className="border-l-2 border-rose-700 pl-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">− Current</p>
          <p className="mt-1 line-clamp-2 text-slate-300">{formatValue(proposal.currentValue)}</p>
        </div>
        <div className="border-l-2 border-emerald-700 pl-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">+ Proposed</p>
          <p className="mt-1 line-clamp-2 text-slate-300">{formatValue(proposal.proposedValue)}</p>
        </div>
      </div>
    </Link>
  );
}

export function formatValue(value: unknown) {
  if (value === null) return 'Unknown';
  if (typeof value === 'string') return value;
  return JSON.stringify(value, null, 2);
}
