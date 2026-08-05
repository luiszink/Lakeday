'use client';

import { useTranslations } from 'next-intl';
import { usePathname, useRouter } from '../i18n/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';

type SearchBoxProps = Readonly<{
  initialQuery?: string | undefined;
}>;

export function SearchBox({ initialQuery = '' }: SearchBoxProps) {
  const translate = useTranslations('discover');
  const pathname = usePathname();
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [isPending, startTransition] = useTransition();
  const isFirstRender = useRef(true);

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    const timeoutId = window.setTimeout(() => {
      const parameters = new URLSearchParams(window.location.search);
      const normalizedQuery = query.trim();
      if (normalizedQuery.length >= 2) {
        parameters.set('q', normalizedQuery);
      } else {
        parameters.delete('q');
      }
      parameters.delete('cursor');
      const queryString = parameters.toString();
      const href = queryString ? `${pathname}?${queryString}` : pathname;
      startTransition(() => router.replace(href));
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [pathname, query, router]);

  return (
    <div className="relative max-w-2xl">
      <label className="sr-only" htmlFor="attraction-search">
        {translate('search.label')}
      </label>
      <input
        aria-busy={isPending}
        className="min-h-12 w-full rounded-md border border-slate-700 bg-slate-900 px-4 pr-24 text-base text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/30"
        id="attraction-search"
        onChange={(event) => setQuery(event.target.value)}
        placeholder={translate('search.placeholder')}
        type="search"
        value={query}
      />
      {query ? (
        <button
          aria-label={translate('search.clear')}
          className="absolute right-3 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-xl text-slate-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-cyan-300"
          onClick={() => setQuery('')}
          type="button"
        >
          <span aria-hidden="true">×</span>
        </button>
      ) : null}
      {isPending ? (
        <span
          className="absolute right-12 top-1/2 -translate-y-1/2 text-xs text-cyan-300"
          role="status"
        >
          {translate('search.searching')}
        </span>
      ) : null}
    </div>
  );
}
