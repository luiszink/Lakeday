'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';

type Enrollment = {
  enrollmentToken: string;
  qrDataUrl: string;
  secret: string;
};

export default function AdminLoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);

  async function submitLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const secondFactor = formData.get('secondFactor');
    const response = await fetch('/api/admin/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: formData.get('email'),
        password: formData.get('password'),
        totp: secondFactor,
        recoveryCode: secondFactor,
      }),
    });
    const body = (await response.json().catch(() => null)) as {
      authenticated?: boolean;
      error?: string;
      enrollmentToken?: string;
    } | null;

    if (response.status === 428 && body?.enrollmentToken) {
      const enrollmentResponse = await fetch('/api/admin/auth/totp/enroll', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ enrollmentToken: body.enrollmentToken }),
      });
      const enrollmentBody = (await enrollmentResponse.json()) as {
        qrDataUrl?: string;
        secret?: string;
      };
      if (enrollmentResponse.ok && enrollmentBody.qrDataUrl && enrollmentBody.secret) {
        setEnrollment({
          enrollmentToken: body.enrollmentToken,
          qrDataUrl: enrollmentBody.qrDataUrl,
          secret: enrollmentBody.secret,
        });
      } else {
        setError('Unable to start authenticator setup.');
      }
    } else if (response.ok && body?.authenticated) {
      window.location.assign('/admin');
    } else {
      setError(body?.error ?? 'Invalid credentials.');
    }

    setBusy(false);
  }

  async function confirmEnrollment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!enrollment) return;
    setBusy(true);
    setError(null);
    const formData = new FormData(event.currentTarget);
    const response = await fetch('/api/admin/auth/totp/confirm', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        enrollmentToken: enrollment.enrollmentToken,
        code: formData.get('code'),
      }),
    });
    const body = (await response.json().catch(() => null)) as {
      recoveryCodes?: string[];
      error?: string;
    } | null;
    if (response.ok && body?.recoveryCodes) {
      setRecoveryCodes(body.recoveryCodes);
    } else {
      setError(body?.error ?? 'Invalid authenticator code.');
    }
    setBusy(false);
  }

  return (
    <main className="grid min-h-screen place-items-center bg-slate-950 px-6 text-slate-100">
      <section
        aria-labelledby="login-title"
        className="w-full max-w-md space-y-6 rounded-md border border-slate-800 bg-slate-900 p-8"
      >
        <div className="space-y-2">
          <p className="text-sm font-medium text-cyan-400">BodenseeGuide</p>
          <h1 id="login-title" className="text-2xl font-semibold">
            Admin sign in
          </h1>
          <p className="text-sm text-slate-400">
            Use your staff credentials and authenticator code.
          </p>
        </div>

        {recoveryCodes ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <h2 className="text-lg font-medium">Save your recovery codes</h2>
              <p className="text-sm text-slate-400">
                Each code works once if your authenticator is unavailable.
              </p>
            </div>
            <ul className="grid grid-cols-2 gap-2 rounded-md bg-slate-950 p-4 font-mono text-sm text-slate-200">
              {recoveryCodes.map((code) => (
                <li key={code}>{code}</li>
              ))}
            </ul>
            <Link
              className="block w-full rounded-md bg-cyan-500 px-4 py-2 text-center font-medium text-slate-950"
              href="/admin"
            >
              Continue to admin
            </Link>
          </div>
        ) : enrollment ? (
          <form className="space-y-4" onSubmit={confirmEnrollment}>
            <div className="space-y-2">
              <p className="text-sm text-slate-300">Scan this code with your authenticator app.</p>
              <img
                alt="Authenticator enrollment QR code"
                className="h-48 w-48 bg-white p-2"
                src={enrollment.qrDataUrl}
              />
              <p className="break-all text-xs text-slate-500">Manual key: {enrollment.secret}</p>
            </div>
            <label className="block space-y-2 text-sm" htmlFor="enrollment-code">
              <span>Authenticator code</span>
              <input
                id="enrollment-code"
                name="code"
                required
                inputMode="numeric"
                autoComplete="one-time-code"
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2"
              />
            </label>
            {error ? (
              <p aria-live="polite" className="text-sm text-rose-300">
                {error}
              </p>
            ) : null}
            <button
              className="w-full rounded-md bg-cyan-500 px-4 py-2 font-medium text-slate-950 disabled:opacity-50"
              disabled={busy}
              type="submit"
            >
              Confirm authenticator
            </button>
            <Link
              className="block text-center text-sm text-cyan-300 hover:text-cyan-100"
              href="/admin/request-reset"
            >
              Forgot password?
            </Link>
          </form>
        ) : (
          <form className="space-y-4" onSubmit={submitLogin}>
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
            <label className="block space-y-2 text-sm" htmlFor="password">
              <span>Password</span>
              <input
                id="password"
                name="password"
                required
                type="password"
                autoComplete="current-password"
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2"
              />
            </label>
            <label className="block space-y-2 text-sm" htmlFor="totp">
              <span>Authenticator code or recovery code</span>
              <input
                id="totp"
                name="secondFactor"
                inputMode="numeric"
                autoComplete="one-time-code"
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2"
              />
            </label>
            {error ? (
              <p aria-live="polite" className="text-sm text-rose-300">
                {error}
              </p>
            ) : null}
            <button
              className="w-full rounded-md bg-cyan-500 px-4 py-2 font-medium text-slate-950 disabled:opacity-50"
              disabled={busy}
              type="submit"
            >
              Sign in
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
