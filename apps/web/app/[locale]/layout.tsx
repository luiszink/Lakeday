import { notFound } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import type { ReactNode } from 'react';

import { LocalePersistence } from '../../src/components/locale-persistence';
import { LocaleSwitcher } from '../../src/components/locale-switcher';
import { Link } from '../../src/i18n/navigation';
import { routing } from '../../src/i18n/routing';

type LocaleLayoutProps = Readonly<{
  children: ReactNode;
  params: Promise<{ locale: string }>;
}>;

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const { locale } = await params;
  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) {
    notFound();
  }

  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <LocalePersistence locale={locale as 'de' | 'en'} />
      <header className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
        <Link className="font-semibold text-slate-900" href="/">
          BodenseeGuide
        </Link>
        <LocaleSwitcher />
      </header>
      {children}
    </NextIntlClientProvider>
  );
}
