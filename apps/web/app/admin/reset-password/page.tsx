'use client';

import { useSearchParams } from 'next/navigation';
import { useState, type FormEvent } from 'react';

export default function AdminResetPasswordPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);
    const formData = new FormData(event.currentTarget);
    const response = await fetch('/api/admin/auth/password-reset/reset', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token, password: formData.get('password') }),
    });
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    if (response.ok) {
      setMessage('Password updated. You can sign in now.');
    } else {
      setError(body?.error ?? 'Unable to reset password.');
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-slate-950 px-6 text-slate-100">
      <section
        aria-labelledby="reset-title"
        className="w-full max-w-md space-y-6 rounded-md border border-slate-800 bg-slate-900 p-8"
      >
        <div className="space-y-2">
          <p className="text-sm font-medium text-cyan-400">BodenseeGuide</p>
          <h1 id="reset-title" className="text-2xl font-semibold">
            Reset admin password
          </h1>
        </div>
        <form className="space-y-4" onSubmit={submit}>
          <label className="block space-y-2 text-sm" htmlFor="password">
            <span>New password</span>
            <input
              id="password"
              name="password"
              required
              minLength={12}
              type="password"
              autoComplete="new-password"
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2"
            />
          </label>
          {message ? (
            <p aria-live="polite" className="text-sm text-emerald-300">
              {message}
            </p>
          ) : null}
          {error ? (
            <p aria-live="polite" className="text-sm text-rose-300">
              {error}
            </p>
          ) : null}
          <button
            className="w-full rounded-md bg-cyan-500 px-4 py-2 font-medium text-slate-950"
            type="submit"
          >
            Update password
          </button>
        </form>
      </section>
    </main>
  );
}
