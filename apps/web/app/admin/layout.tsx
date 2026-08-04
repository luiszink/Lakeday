import type { ReactNode } from 'react';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import Link from 'next/link';

import { LogoutButton } from './_components/logout-button';
import { hasAdminSession } from '../../src/auth/admin-guard';

const navigation = [
  ['Attractions', '/admin/attractions'],
  ['Review queue', '/admin/review-queue'],
  ['Import', '/admin/import'],
  ['Registries', '/admin/registries'],
  ['Reports', '/admin/reports'],
  ['Users', '/admin/users'],
] as const;

export default async function AdminLayout({ children }: Readonly<{ children: ReactNode }>) {
  const requestHeaders = await headers();
  const pathname = requestHeaders.get('x-admin-pathname');
  const isPublicAuthPage =
    pathname === '/admin/login' ||
    pathname === '/admin/request-reset' ||
    pathname === '/admin/reset-password';

  if (!isPublicAuthPage && !(await hasAdminSession())) {
    notFound();
  }

  if (isPublicAuthPage) {
    return children;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-5">
          <Link className="text-lg font-semibold tracking-tight" href="/admin">
            BodenseeGuide Admin
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-400">Content workspace</span>
            <LogoutButton />
          </div>
        </div>
      </header>
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-8 md:flex-row">
        <nav aria-label="Admin sections" className="w-full shrink-0 md:w-56">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-500">
            Workspace
          </p>
          <ul className="space-y-1">
            {navigation.map(([label, href]) => (
              <li key={href}>
                <Link
                  className="block rounded-md px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white"
                  href={href}
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
