'use client';

import { useLocale, useTranslations } from 'next-intl';

import { usePathname, useRouter } from '../i18n/navigation';

export function LocaleSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const translate = useTranslations('locale');

  return (
    <label className="flex items-center gap-2 text-sm" htmlFor="locale-switcher">
      <span>{translate('label')}</span>
      <select
        className="rounded border border-slate-300 bg-white px-2 py-1 text-slate-900"
        id="locale-switcher"
        onChange={(event) => {
          const nextLocale = event.target.value as 'de' | 'en';
          window.localStorage.setItem('bodensee-locale', nextLocale);
          router.replace(pathname, { locale: nextLocale });
        }}
        value={locale}
      >
        <option value="de">{translate('de')}</option>
        <option value="en">{translate('en')}</option>
      </select>
    </label>
  );
}
