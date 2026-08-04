'use client';

import Link from 'next/link';
import { useState } from 'react';

type AttractionListItem = {
  id: string;
  status: string;
  municipality: string;
  regionCode: string;
  updatedAt: string;
  localizations: { locale: 'de' | 'en'; name: string; slug: string }[];
};

export function AttractionList({ initialItems }: Readonly<{ initialItems: AttractionListItem[] }>) {
  const [items, setItems] = useState(initialItems);
  const [status, setStatus] = useState('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh(event?: React.FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (query) params.set('q', query);
    const response = await fetch(`/api/admin/attractions?${params.toString()}`);
    const body = (await response.json().catch(() => null)) as {
      items?: AttractionListItem[];
      error?: { message?: string };
    } | null;
    if (response.ok && body?.items) setItems(body.items);
    else setError(body?.error?.message ?? 'Unable to load attractions.');
    setLoading(false);
  }

  return (
    <section aria-labelledby="attractions-title" className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <p className="text-sm font-medium text-cyan-400">Content operations</p>
          <h1 id="attractions-title" className="text-3xl font-semibold tracking-tight">
            Attractions
          </h1>
          <p className="text-slate-400">Draft, review, and publish the shared attraction record.</p>
        </div>
        <Link
          className="rounded-md bg-cyan-500 px-4 py-2 font-medium text-slate-950"
          href="/admin/attractions/new"
        >
          Create attraction
        </Link>
      </div>

      <form
        className="flex flex-wrap gap-3 rounded-md border border-slate-800 bg-slate-900 p-4"
        onSubmit={refresh}
      >
        <label className="flex min-w-56 flex-1 items-center gap-2 text-sm">
          <span className="sr-only">Search attractions</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search name or slug"
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2"
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <span className="sr-only">Filter status</span>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2"
          >
            <option value="">All statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="IN_REVIEW">In review</option>
            <option value="PUBLISHED">Published</option>
            <option value="UNPUBLISHED">Unpublished</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </label>
        <button
          className="rounded-md border border-slate-700 px-4 py-2 text-sm text-slate-200 disabled:opacity-50"
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
      {!loading && !error && items.length === 0 ? (
        <div className="rounded-md border border-dashed border-slate-700 p-10 text-center">
          <h2 className="text-lg font-medium">No attractions yet</h2>
          <p className="mt-2 text-sm text-slate-400">
            Create your first attraction to start the editorial workflow.
          </p>
        </div>
      ) : null}
      {items.length > 0 ? (
        <div className="overflow-x-auto rounded-md border border-slate-800">
          <table className="w-full min-w-[48rem] text-left text-sm">
            <thead className="bg-slate-900 text-slate-400">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Municipality</th>
                <th className="px-4 py-3">Region</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Updated</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr className="border-t border-slate-800" key={item.id}>
                  <td className="px-4 py-3">
                    <Link
                      className="text-cyan-300 hover:text-cyan-100"
                      href={`/admin/attractions/${item.id}`}
                    >
                      {item.localizations.find((localization) => localization.locale === 'de')
                        ?.name ||
                        item.localizations[0]?.name ||
                        'Untitled'}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-300">{item.municipality}</td>
                  <td className="px-4 py-3 text-slate-400">{item.regionCode}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full border border-slate-700 px-2 py-1 text-xs">
                      {item.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    {new Date(item.updatedAt).toLocaleString('en-GB')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
