'use client';

import { useState, type FormEvent } from 'react';

import {
  sourceApprovalStates,
  sourceHealthValues,
  sourceTypes,
  type RegistrySource,
} from '../../../src/registries/types';

type Licence = {
  id: string;
  spdxOrName: string;
  attributionRequired: boolean;
  commercialUseAllowed: boolean;
  shareAlike: boolean;
  termsUrl: string | null;
  attributionText: string | null;
  permissionEvidence: string | null;
  notes: string | null;
};

type Source = RegistrySource & { id: string };
type ResponseBody = { licence?: Licence; source?: Source; error?: { message?: string } };

async function request<T extends ResponseBody>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, options);
  const body = (await response.json().catch(() => null)) as T | null;
  if (!response.ok || !body) {
    throw new Error(body?.error?.message ?? 'The registry request failed.');
  }
  return body;
}

export function RegistryManager({
  initialLicences,
  initialSources,
  canApproveSources,
}: Readonly<{ initialLicences: Licence[]; initialSources: Source[]; canApproveSources: boolean }>) {
  const [licences, setLicences] = useState(initialLicences);
  const [sources, setSources] = useState(initialSources);
  const [editingLicence, setEditingLicence] = useState<Licence | null>(null);
  const [editingSource, setEditingSource] = useState<Source | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function clearStatus() {
    setMessage(null);
    setError(null);
  }

  async function createLicence(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearStatus();
    const form = new FormData(event.currentTarget);
    try {
      const body = await request<{ licence: Licence }>('/api/admin/licences', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          spdxOrName: form.get('spdxOrName'),
          termsUrl: form.get('termsUrl'),
          attributionText: form.get('attributionText'),
          permissionEvidence: form.get('permissionEvidence'),
          notes: form.get('notes'),
          attributionRequired: form.get('attributionRequired') === 'on',
          commercialUseAllowed: form.get('commercialUseAllowed') === 'on',
          shareAlike: form.get('shareAlike') === 'on',
        }),
      });
      setLicences((current) => [...current, body.licence].sort(byName));
      event.currentTarget.reset();
      setMessage('Licence created.');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to create licence.');
    }
  }

  async function updateLicence(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingLicence) return;
    clearStatus();
    const form = new FormData(event.currentTarget);
    try {
      const body = await request<{ licence: Licence }>(`/api/admin/licences/${editingLicence.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          spdxOrName: form.get('spdxOrName'),
          termsUrl: form.get('termsUrl'),
          attributionText: form.get('attributionText'),
          permissionEvidence: form.get('permissionEvidence'),
          notes: form.get('notes'),
          attributionRequired: form.get('attributionRequired') === 'on',
          commercialUseAllowed: form.get('commercialUseAllowed') === 'on',
          shareAlike: form.get('shareAlike') === 'on',
        }),
      });
      setLicences((current) =>
        current.map((item) => (item.id === body.licence.id ? body.licence : item)),
      );
      setEditingLicence(null);
      setMessage('Licence updated.');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to update licence.');
    }
  }

  async function removeLicence(id: string) {
    clearStatus();
    try {
      await request(`/api/admin/licences/${id}`, { method: 'DELETE' });
      setLicences((current) => current.filter((item) => item.id !== id));
      setMessage('Licence deleted.');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to delete licence.');
    }
  }

  async function createSource(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearStatus();
    const form = new FormData(event.currentTarget);
    try {
      const body = await request<{ source: Source }>('/api/admin/sources', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(sourceFormPayload(form)),
      });
      setSources((current) => [...current, body.source].sort(bySource));
      event.currentTarget.reset();
      setMessage('Source origin created and queued for approval.');
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : 'Unable to create source origin.',
      );
    }
  }

  async function updateSource(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingSource) return;
    clearStatus();
    const form = new FormData(event.currentTarget);
    try {
      const body = await request<{ source: Source }>(`/api/admin/sources/${editingSource.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(sourceFormPayload(form)),
      });
      setSources((current) =>
        current.map((item) => (item.id === body.source.id ? body.source : item)),
      );
      setEditingSource(null);
      setMessage('Source origin updated.');
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : 'Unable to update source origin.',
      );
    }
  }

  async function setApproval(id: string, approvalState: (typeof sourceApprovalStates)[number]) {
    clearStatus();
    try {
      const body = await request<{ source: Source }>(`/api/admin/sources/${id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ approvalState }),
      });
      setSources((current) =>
        current.map((item) => (item.id === body.source.id ? body.source : item)),
      );
      setMessage(`Source origin ${approvalState.toLowerCase()}.`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to change approval.');
    }
  }

  async function removeSource(id: string) {
    clearStatus();
    try {
      await request(`/api/admin/sources/${id}`, { method: 'DELETE' });
      setSources((current) => current.filter((item) => item.id !== id));
      setMessage('Source origin deleted.');
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : 'Unable to delete source origin.',
      );
    }
  }

  return (
    <section aria-labelledby="registry-title" className="space-y-10">
      <div className="space-y-2">
        <p className="text-sm font-medium text-cyan-400">Data governance</p>
        <h1 id="registry-title" className="text-3xl font-semibold tracking-tight">
          Source and licence registries
        </h1>
        <p className="text-slate-400">
          Keep provenance, permissions, attribution, and source approval machine-readable.
        </p>
      </div>
      {message ? (
        <p className="text-sm text-emerald-300" aria-live="polite">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="text-sm text-rose-300" aria-live="assertive">
          {error}
        </p>
      ) : null}

      <RegistryForm title="Add licence" onSubmit={createLicence} submitLabel="Create licence">
        <LicenceFields />
      </RegistryForm>
      {editingLicence ? (
        <RegistryForm
          title={`Edit ${editingLicence.spdxOrName}`}
          onSubmit={updateLicence}
          submitLabel="Save licence"
          onCancel={() => setEditingLicence(null)}
        >
          <LicenceFields licence={editingLicence} />
        </RegistryForm>
      ) : null}
      <div className="space-y-3">
        <h2 className="text-xl font-semibold">Licences</h2>
        {licences.length === 0 ? <EmptyState text="No licences registered yet." /> : null}
        {licences.map((licence) => (
          <article className="rounded-md border border-slate-800 bg-slate-900 p-5" key={licence.id}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h3 className="font-medium">{licence.spdxOrName}</h3>
                <p className="mt-1 text-sm text-slate-400">{permissionSummary(licence)}</p>
              </div>
              <div className="flex gap-3 text-sm">
                <button
                  className="text-cyan-300 hover:text-cyan-100"
                  type="button"
                  onClick={() => setEditingLicence(licence)}
                >
                  Edit
                </button>
                <button
                  className="text-rose-300 hover:text-rose-100"
                  type="button"
                  onClick={() => removeLicence(licence.id)}
                >
                  Delete
                </button>
              </div>
            </div>
            {licence.termsUrl ? (
              <a
                className="mt-3 block text-sm text-cyan-300 underline"
                href={licence.termsUrl}
                rel="noreferrer"
                target="_blank"
              >
                Terms
              </a>
            ) : null}
            {licence.permissionEvidence ? (
              <p className="mt-2 text-sm text-slate-500">Permission evidence recorded.</p>
            ) : null}
          </article>
        ))}
      </div>

      <RegistryForm title="Add source origin" onSubmit={createSource} submitLabel="Create source">
        <SourceFields licences={licences} />
      </RegistryForm>
      {editingSource ? (
        <RegistryForm
          title={`Edit ${editingSource.originUrl}`}
          onSubmit={updateSource}
          submitLabel="Save source"
          onCancel={() => setEditingSource(null)}
        >
          <SourceFields licences={licences} source={editingSource} />
        </RegistryForm>
      ) : null}
      <div className="space-y-3">
        <h2 className="text-xl font-semibold">Source origins</h2>
        {sources.length === 0 ? <EmptyState text="No source origins registered yet." /> : null}
        {sources.map((source) => (
          <article className="rounded-md border border-slate-800 bg-slate-900 p-5" key={source.id}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h3 className="font-medium break-all">{source.originUrl}</h3>
                <p className="mt-1 text-sm text-slate-400">
                  {source.sourceType} · {source.licence.spdxOrName}
                </p>
              </div>
              <div className="flex flex-wrap gap-3 text-sm">
                <span className="rounded-full border border-slate-700 px-2 py-1">
                  {source.approvalState}
                </span>
                <button
                  className="text-cyan-300 hover:text-cyan-100"
                  type="button"
                  onClick={() => setEditingSource(source)}
                >
                  Edit
                </button>
                <button
                  className="text-rose-300 hover:text-rose-100"
                  type="button"
                  onClick={() => removeSource(source.id)}
                >
                  Delete
                </button>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-slate-400">
              <span>Health: {source.health}</span>
              {source.refreshCadenceHours ? (
                <span>Cadence: every {source.refreshCadenceHours}h</span>
              ) : null}
              {source.notes ? <span>{source.notes}</span> : null}
            </div>
            {canApproveSources && source.approvalState !== 'APPROVED' ? (
              <button
                className="mt-4 rounded-md bg-emerald-500 px-3 py-2 text-sm font-medium text-slate-950"
                type="button"
                onClick={() => setApproval(source.id, 'APPROVED')}
              >
                Approve source
              </button>
            ) : null}
            {canApproveSources && source.approvalState === 'APPROVED' ? (
              <button
                className="mt-4 rounded-md border border-amber-700 px-3 py-2 text-sm text-amber-300"
                type="button"
                onClick={() => setApproval(source.id, 'REJECTED')}
              >
                Revoke approval
              </button>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}

function RegistryForm({
  title,
  onSubmit,
  submitLabel,
  onCancel,
  children,
}: Readonly<{
  title: string;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  submitLabel: string;
  onCancel?: () => void;
  children: React.ReactNode;
}>) {
  return (
    <form
      className="space-y-4 rounded-md border border-slate-800 bg-slate-900 p-5"
      onSubmit={onSubmit}
    >
      <h2 className="text-xl font-semibold">{title}</h2>
      {children}
      <div className="flex gap-3">
        <button
          className="rounded-md bg-cyan-500 px-4 py-2 font-medium text-slate-950"
          type="submit"
        >
          {submitLabel}
        </button>
        {onCancel ? (
          <button
            className="rounded-md border border-slate-700 px-4 py-2 text-sm"
            type="button"
            onClick={onCancel}
          >
            Cancel
          </button>
        ) : null}
      </div>
    </form>
  );
}

function LicenceFields({ licence }: Readonly<{ licence?: Licence }>) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <input
        className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2"
        name="spdxOrName"
        required
        placeholder="SPDX or licence name"
        defaultValue={licence?.spdxOrName}
      />
      <input
        className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2"
        name="termsUrl"
        type="url"
        placeholder="Terms URL"
        defaultValue={licence?.termsUrl ?? ''}
      />
      <input
        className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2"
        name="attributionText"
        placeholder="Public attribution"
        defaultValue={licence?.attributionText ?? ''}
      />
      <input
        className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2"
        name="permissionEvidence"
        placeholder="Permission evidence"
        defaultValue={licence?.permissionEvidence ?? ''}
      />
      <textarea
        className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 md:col-span-2"
        name="notes"
        placeholder="Internal notes"
        defaultValue={licence?.notes ?? ''}
      />
      <PermissionCheckbox
        checked={licence?.attributionRequired ?? true}
        name="attributionRequired"
        label="Attribution required"
      />
      <PermissionCheckbox
        checked={licence?.commercialUseAllowed ?? true}
        name="commercialUseAllowed"
        label="Commercial use allowed"
      />
      <PermissionCheckbox
        checked={licence?.shareAlike ?? false}
        name="shareAlike"
        label="Share alike"
      />
    </div>
  );
}

function SourceFields({ licences, source }: Readonly<{ licences: Licence[]; source?: Source }>) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <input
        className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 md:col-span-2"
        name="originUrl"
        required
        type="url"
        placeholder="Origin URL or domain"
        defaultValue={source?.originUrl}
      />
      <select
        className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2"
        name="sourceType"
        defaultValue={source?.sourceType ?? 'OFFICIAL_WEBSITE'}
      >
        {sourceTypes.map((sourceType) => (
          <option key={sourceType}>{sourceType}</option>
        ))}
      </select>
      <select
        className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2"
        name="licenceId"
        required
        defaultValue={source?.licenceId ?? ''}
      >
        <option value="">Select licence</option>
        {licences.map((licence) => (
          <option key={licence.id} value={licence.id}>
            {licence.spdxOrName}
          </option>
        ))}
      </select>
      <input
        className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2"
        name="refreshCadenceHours"
        min="1"
        type="number"
        placeholder="Refresh cadence (hours)"
        defaultValue={source?.refreshCadenceHours ?? ''}
      />
      <select
        className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2"
        name="health"
        defaultValue={source?.health ?? 'UNKNOWN'}
      >
        {sourceHealthValues.map((health) => (
          <option key={health}>{health}</option>
        ))}
      </select>
      <input
        className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 md:col-span-2"
        name="attributionText"
        placeholder="Public attribution"
        defaultValue={source?.attributionText ?? ''}
      />
      <textarea
        className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 md:col-span-2"
        name="notes"
        placeholder="Internal notes"
        defaultValue={source?.notes ?? ''}
      />
    </div>
  );
}

function PermissionCheckbox({
  checked,
  name,
  label,
}: Readonly<{ checked: boolean; name: string; label: string }>) {
  return (
    <label className="flex items-center gap-2 text-sm text-slate-300">
      <input defaultChecked={checked} name={name} type="checkbox" />
      {label}
    </label>
  );
}

function EmptyState({ text }: Readonly<{ text: string }>) {
  return (
    <p className="rounded-md border border-dashed border-slate-700 p-6 text-sm text-slate-400">
      {text}
    </p>
  );
}

function permissionSummary(licence: Licence) {
  return [
    licence.attributionRequired ? 'attribution' : 'no attribution',
    licence.commercialUseAllowed ? 'commercial use' : 'non-commercial only',
    licence.shareAlike ? 'share alike' : 'no share alike',
  ].join(' · ');
}

function sourceFormPayload(form: FormData) {
  const cadence = form.get('refreshCadenceHours');
  return {
    originUrl: form.get('originUrl'),
    sourceType: form.get('sourceType'),
    licenceId: form.get('licenceId'),
    refreshCadenceHours: cadence ? Number(cadence) : null,
    health: form.get('health'),
    attributionText: form.get('attributionText'),
    notes: form.get('notes'),
  };
}

function byName(left: Licence, right: Licence) {
  return left.spdxOrName.localeCompare(right.spdxOrName);
}

function bySource(left: Source, right: Source) {
  return left.originUrl.localeCompare(right.originUrl);
}
