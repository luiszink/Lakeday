'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

const MAX_PAYLOAD_BYTES = 5 * 1024 * 1024;
const MAX_RECORDS = 100;

type ImportStatus = 'created' | 'updated' | 'held' | 'rejected';
type ImportResult = Readonly<{
  candidateId: string | null;
  status: ImportStatus;
  attractionId: string | null;
  reasons: readonly string[];
  proposalIds?: readonly string[];
  errors?: readonly Readonly<{
    path: string;
    code: string;
    message: string;
    details?: { field: string; matchedQuote: string; similarity: number };
  }>[];
}>;
type ImportSummary = Readonly<{
  total: number;
  created: number;
  updated: number;
  held: number;
  rejected: number;
}>;
type ImportBatch = ImportSummary &
  Readonly<{
    id: string;
    dryRun: boolean;
    createdAt: string;
    adminUser: { email: string };
  }>;

function parseRecords(input: unknown): unknown[] | null {
  if (Array.isArray(input)) return input;
  if (
    typeof input === 'object' &&
    input !== null &&
    Array.isArray((input as { records?: unknown }).records)
  ) {
    return (input as { records: unknown[] }).records;
  }
  return null;
}

function statusLabel(status: ImportStatus) {
  return {
    created: 'Created draft',
    updated: 'Updated draft',
    held: 'Held for review',
    rejected: 'Rejected',
  }[status];
}

export function ImportManager() {
  const [payload, setPayload] = useState('');
  const [dryRun, setDryRun] = useState(true);
  const [state, setState] = useState<'idle' | 'validating' | 'importing' | 'results'>('idle');
  const [results, setResults] = useState<ImportResult[]>([]);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [resultDryRun, setResultDryRun] = useState(false);
  const [batches, setBatches] = useState<ImportBatch[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void loadHistory();
  }, []);

  async function loadHistory() {
    const response = await fetch('/api/admin/import/research');
    const body = (await response.json().catch(() => null)) as { batches?: ImportBatch[] } | null;
    if (response.ok && body?.batches) setBatches(body.batches);
  }

  async function loadFiles(files: FileList | null) {
    if (!files?.length) return;
    setError(null);
    try {
      const values = await Promise.all(
        [...files].map(async (file) => JSON.parse(await file.text()) as unknown),
      );
      const records = values.flatMap((value) => parseRecords(value) ?? [value]);
      setPayload(JSON.stringify(records, null, 2));
    } catch {
      setError('One or more selected files are not valid JSON.');
    }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setState('validating');
    let records: unknown[] | null;
    try {
      records = parseRecords(JSON.parse(payload));
    } catch {
      setError('Paste a JSON array or an object with a records array.');
      setState('idle');
      return;
    }
    if (!records || records.length === 0 || records.length > MAX_RECORDS) {
      setError(`Provide between 1 and ${MAX_RECORDS} records.`);
      setState('idle');
      return;
    }
    const body = JSON.stringify({ records, dryRun });
    if (new TextEncoder().encode(body).byteLength > MAX_PAYLOAD_BYTES) {
      setError('The payload exceeds the 5 MB limit.');
      setState('idle');
      return;
    }
    setState('importing');
    try {
      const response = await fetch('/api/admin/import/research', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body,
      });
      const responseBody = (await response.json().catch(() => null)) as {
        results?: ImportResult[];
        summary?: ImportSummary;
        error?: { message?: string };
      } | null;
      if (!response.ok || !responseBody?.results || !responseBody.summary) {
        throw new Error(responseBody?.error?.message ?? 'The import could not be completed.');
      }
      setResults(responseBody.results);
      setSummary(responseBody.summary);
      setResultDryRun(dryRun);
      setState('results');
      await loadHistory();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'The import failed.');
      setState('idle');
    }
  }

  return (
    <section aria-labelledby="import-title" className="space-y-8">
      <div className="space-y-2">
        <p className="text-sm font-medium text-cyan-400">Research operations</p>
        <h1 id="import-title" className="text-3xl font-semibold tracking-tight">
          Research import
        </h1>
        <p className="max-w-3xl text-slate-400">
          Validate research records, preview their outcomes, and create reviewable drafts with provenance.
        </p>
      </div>

      <form className="space-y-5 rounded-md border border-slate-800 bg-slate-900 p-5" onSubmit={submit}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-medium">Research JSON</h2>
            <p className="mt-1 text-sm text-slate-400">Up to 100 records and 5 MB per batch.</p>
          </div>
          <label className="flex items-center gap-3 rounded-md border border-amber-700/60 bg-amber-950/30 px-3 py-2 text-sm text-amber-100">
            <input checked={dryRun} onChange={(event) => setDryRun(event.target.checked)} type="checkbox" />
            Dry run, no database writes
          </label>
        </div>
        <div className="grid gap-4 lg:grid-cols-[auto_1fr]">
          <label className="flex cursor-pointer items-center justify-center rounded-md border border-dashed border-slate-700 px-5 py-4 text-sm hover:border-cyan-500">
            <span>Select JSON files</span>
            <input
              accept=".json,application/json"
              className="sr-only"
              multiple
              onChange={(event) => void loadFiles(event.target.files)}
              type="file"
            />
          </label>
          <label>
            <span className="sr-only">Research JSON payload</span>
            <textarea
              className="min-h-64 w-full rounded-md border border-slate-700 bg-slate-950 p-3 font-mono text-xs text-slate-200 outline-none focus:border-cyan-500"
              onChange={(event) => setPayload(event.target.value)}
              placeholder='{"records": [...]}'
              value={payload}
            />
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            className="rounded-md bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!payload || state === 'validating' || state === 'importing'}
            type="submit"
          >
            {state === 'validating'
              ? 'Validating…'
              : state === 'importing'
                ? 'Importing…'
                : dryRun
                  ? 'Run dry run'
                  : 'Import records'}
          </button>
          {state === 'importing' ? (
            <span aria-live="polite" className="text-sm text-slate-400">
              Processing records…
            </span>
          ) : null}
        </div>
      </form>

      {error ? (
        <p
          aria-live="assertive"
          className="rounded-md border border-rose-900 bg-rose-950/40 p-4 text-sm text-rose-200"
        >
          {error}
        </p>
      ) : null}

      {summary ? (
        <section aria-labelledby="result-title" className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-emerald-400">
                {resultDryRun ? 'Dry-run results' : 'Import results'}
              </p>
              <h2 id="result-title" className="text-2xl font-semibold">
                {summary.total} records processed
              </h2>
            </div>
            <div className="flex flex-wrap gap-2 text-xs" aria-label="Import summary">
              <span className="rounded-full border border-emerald-800 px-2 py-1">
                Created {summary.created}
              </span>
              <span className="rounded-full border border-sky-800 px-2 py-1">
                Updated {summary.updated}
              </span>
              <span className="rounded-full border border-amber-800 px-2 py-1">
                Held {summary.held}
              </span>
              <span className="rounded-full border border-rose-800 px-2 py-1">
                Rejected {summary.rejected}
              </span>
            </div>
          </div>
          <div className="overflow-x-auto rounded-md border border-slate-800">
            <table className="w-full min-w-[760px] text-left text-sm">
              <caption className="sr-only">Per-record research import results</caption>
              <thead className="bg-slate-900 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3" scope="col">
                    Candidate
                  </th>
                  <th className="px-4 py-3" scope="col">
                    Status
                  </th>
                  <th className="px-4 py-3" scope="col">
                    Reasons
                  </th>
                  <th className="px-4 py-3" scope="col">
                    Links
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {results.map((result, index) => (
                  <ResultRow key={`${result.candidateId ?? 'record'}-${index}`} result={result} />
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <section aria-labelledby="history-title" className="space-y-4">
        <div>
          <p className="text-sm font-medium text-slate-500">Audit trail</p>
          <h2 id="history-title" className="text-2xl font-semibold">
            Recent import batches
          </h2>
        </div>
        {batches.length === 0 ? (
          <div className="rounded-md border border-dashed border-slate-700 p-8 text-sm text-slate-400">
            No import batches recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-md border border-slate-800">
            <table className="w-full min-w-[680px] text-left text-sm">
              <caption className="sr-only">Recent research import batches</caption>
              <thead className="bg-slate-900 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3" scope="col">
                    Date
                  </th>
                  <th className="px-4 py-3" scope="col">
                    Mode
                  </th>
                  <th className="px-4 py-3" scope="col">
                    Operator
                  </th>
                  <th className="px-4 py-3" scope="col">
                    Counts
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {batches.map((batch) => (
                  <tr key={batch.id}>
                    <th className="px-4 py-3 font-normal text-slate-300" scope="row">
                      {new Date(batch.createdAt).toLocaleString('en-GB')}
                    </th>
                    <td className="px-4 py-3">{batch.dryRun ? 'Dry run' : 'Import'}</td>
                    <td className="px-4 py-3 text-slate-400">{batch.adminUser.email}</td>
                    <td className="px-4 py-3 text-slate-400">
                      {batch.total} total · {batch.created} created · {batch.updated} updated ·{' '}
                      {batch.held} held · {batch.rejected} rejected
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </section>
  );
}

function ResultRow({ result }: Readonly<{ result: ImportResult }>) {
  const reasons = result.reasons.length
    ? result.reasons
    : (result.errors?.map((error) => `${error.path}: ${error.message}`) ?? []);
  return (
    <tr className="align-top">
      <th className="px-4 py-4 font-mono text-xs font-normal text-slate-400" scope="row">
        {result.candidateId ?? 'Invalid record'}
      </th>
      <td className="px-4 py-4">
        <span
          className={`inline-flex rounded-full border px-2 py-1 text-xs ${
            result.status === 'rejected'
              ? 'border-rose-800 text-rose-200'
              : result.status === 'held'
                ? 'border-amber-800 text-amber-200'
                : 'border-emerald-800 text-emerald-200'
          }`}
        >
          {statusLabel(result.status)}
        </span>
      </td>
      <td className="max-w-md px-4 py-4 text-slate-300">
        <ul className="list-disc space-y-1 pl-4">
          {reasons.map((reason, index) => (
            <li key={`${reason}-${index}`}>{reason}</li>
          ))}
        </ul>
      </td>
      <td className="space-y-1 px-4 py-4 text-sm">
        {result.attractionId ? (
          <Link
            className="block text-cyan-300 hover:text-cyan-100"
            href={`/admin/attractions/${result.attractionId}`}
          >
            Open attraction
          </Link>
        ) : null}
        {result.proposalIds?.map((proposalId) => (
          <Link
            className="block text-cyan-300 hover:text-cyan-100"
            href={`/admin/review-queue/${proposalId}`}
            key={proposalId}
          >
            Open proposal
          </Link>
        ))}
      </td>
    </tr>
  );
}
