'use client';

import { useState } from 'react';

export function LogoutButton() {
  const [busy, setBusy] = useState(false);

  async function logout() {
    setBusy(true);
    await fetch('/api/admin/auth/logout', { method: 'POST' });
    window.location.assign('/admin/login');
  }

  return (
    <button
      className="rounded-md border border-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:border-slate-500 hover:text-white disabled:opacity-50"
      disabled={busy}
      onClick={logout}
      type="button"
    >
      Sign out
    </button>
  );
}
