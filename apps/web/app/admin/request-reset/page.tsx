'use client';

import { useState, type FormEvent } from 'react';

export default function AdminRequestResetPage() {
  const [message, setMessage] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    await fetch('/api/admin/auth/password-reset/request', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: formData.get('email') }),
    });
    setMessage('If an active account exists, a reset link has been sent.');
  }

  return (
    <main className="grid min-h-screen place-items-center bg-slate-950 px-6 text-slate-100">
      <section
        aria-labelledby="request-reset-title"
        className="w-full max-w-md space-y-6 rounded-md border border-slate-800 bg-slate-900 p-8"
      >
        <div className="space-y-2">
          <p className="text-sm font-medium text-cyan-400">BodenseeGuide</p>
          <h1 id="request-reset-title" className="text-2xl font-semibold">
            Reset admin password
          </h1>
          <p className="text-sm text-slate-400">Enter your staff email to request a reset link.</p>
        </div>
        <form className="space-y-4" onSubmit={submit}>
          <label className="block space-y-2 text-sm" htmlFor="email">
            <span>Email</span>
            <input
              id="email"
              name="email"
              required
              type="email"
              autoComplete="username"
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2"
            />
          </label>
          {message ? (
            <p aria-live="polite" className="text-sm text-emerald-300">
              {message}
            </p>
          ) : null}
          <button
            className="w-full rounded-md bg-cyan-500 px-4 py-2 font-medium text-slate-950"
            type="submit"
          >
            Send reset link
          </button>
        </form>
      </section>
    </main>
  );
}
