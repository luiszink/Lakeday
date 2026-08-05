'use client';

import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';

import { Link, usePathname } from '../i18n/navigation';
import { LocaleSwitcher } from './locale-switcher';

type AppShellProps = Readonly<{
  children: ReactNode;
}>;

const navigation = [
  { href: '/', key: 'discover' },
  { href: '/favorites', key: 'favorites' },
  { href: '/my-day', key: 'myDay' },
  { href: '/more', key: 'more' },
] as const;

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const translate = useTranslations('nav');

  function isActive(href: string) {
    if (href === '/') return pathname === '/';
    return pathname === href || pathname.startsWith(`${href}/`) || (href === '/more' && pathname === '/licences');
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800/80 bg-slate-950/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-5 py-4 sm:px-6">
          <Link className="font-semibold tracking-tight text-white" href="/">
            BodenseeGuide
          </Link>
          <nav aria-label={translate('label')} className="hidden items-center gap-1 md:flex">
            {navigation.map((item) => (
              <Link
                aria-current={isActive(item.href) ? 'page' : undefined}
                className={`rounded-md px-3 py-2 text-sm transition focus:outline-none focus:ring-2 focus:ring-cyan-300 ${
                  isActive(item.href)
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:bg-slate-900 hover:text-white'
                }`}
                href={item.href}
                key={item.key}
              >
                {translate(item.key)}
              </Link>
            ))}
          </nav>
          <LocaleSwitcher />
        </div>
      </header>

      <div className="pb-24 md:pb-0">{children}</div>

      <nav
        aria-label={translate('label')}
        className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-800 bg-slate-950/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur md:hidden"
      >
        <ul className="mx-auto grid max-w-md grid-cols-4 gap-1">
          {navigation.map((item) => (
            <li key={item.key}>
              <Link
                aria-current={isActive(item.href) ? 'page' : undefined}
                className={`flex min-h-11 items-center justify-center rounded-md px-2 text-center text-xs font-medium transition focus:outline-none focus:ring-2 focus:ring-cyan-300 ${
                  isActive(item.href)
                    ? 'bg-cyan-400 text-slate-950'
                    : 'text-slate-400 hover:bg-slate-900 hover:text-white'
                }`}
                href={item.href}
              >
                {translate(item.key)}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
